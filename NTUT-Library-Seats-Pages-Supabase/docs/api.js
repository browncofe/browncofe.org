import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const base = SUPABASE_URL.trim().replace(/\/+$/, '');
const key = SUPABASE_PUBLISHABLE_KEY.trim();
export const configured = /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base) && /^sb_publishable_[\w-]+$/.test(key);
const storageKey = 'reading-room:' + base + ':' + new URL('.', location.href).pathname;
let session = null;
try { session = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* 首次登入 */ }
export const email = () => session?.user?.email || '';

function remember(value) {
  session = value;
  try {
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
    else sessionStorage.removeItem(storageKey);
  } catch { /* 禁用儲存時，登入僅在目前頁面有效。 */ }
  dispatchEvent(new Event('readerchange'));
}

async function request(path, body, token, method = 'POST') {
  if (!configured) throw new Error('尚未連接 Supabase，請先完成 config.js。');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  let response;
  try {
    response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(18000) });
  } catch { throw new Error('未能連上伺服器。若剛送出預約，請先查閱「我的預約」。'); }
  const data = await response.text();
  let result;
  try { result = data ? JSON.parse(data) : null; } catch { result = null; }
  if (!response.ok) {
    const message = result?.message || result?.msg || result?.error_description || '請確認設定後重試';
    const translations = { 'Invalid login credentials': '信箱或密碼不正確', 'Email not confirmed': '請先至信箱完成驗證',
      'User already registered': '此信箱已註冊', 'Email rate limit exceeded': '寄信次數已達上限，請稍後再試' };
    const error = new Error(translations[message] || message);
    error.status = response.status;
    throw error;
  }
  return result;
}

function withExpiry(result) {
  return { access_token: result.access_token, refresh_token: result.refresh_token, user: result.user,
    expires_at: result.expires_at || Math.floor(Date.now() / 1000) + result.expires_in };
}
export async function authenticate(mode, address, password) {
  const path = mode === 'signup' ? '/signup?redirect_to=' + encodeURIComponent(new URL('.', location.href).href) : '/token?grant_type=password';
  const result = await request('/auth/v1' + path, { email: address, password });
  if (!result?.access_token) return false;
  remember(withExpiry(result));
  return true;
}

let pendingRefresh;
async function accessToken(force = false) {
  if (!session) return null;
  if (!force && session.expires_at * 1000 > Date.now() + 60000) return session.access_token;
  if (!pendingRefresh) {
    const previous = session;
    pendingRefresh = request('/auth/v1/token?grant_type=refresh_token', { refresh_token: previous.refresh_token })
      .then(result => {
        if (session !== previous) throw new Error('登入狀態已變更');
        session = withExpiry(result);
        try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch {}
        return session.access_token;
      }).catch(err => {
        if (session === previous && [400,401,403].includes(err.status)) remember(null);
        throw err;
      }).finally(() => { pendingRefresh = undefined; });
  }
  return pendingRefresh;
}

export async function logout() {
  try {
    const token = await accessToken();
    if (token) await request('/auth/v1/logout?scope=local', undefined, token);
  } finally { remember(null); }
}

export async function rpc(name, body) {
  const token = await accessToken();
  const path = '/rest/v1/rpc/' + name;
  try { return await request(path, body, token); }
  catch (err) {
    if (err.status !== 401 || !token || !session) throw err;
    return request(path, body, await accessToken(true));
  }
}

// 只訂閱公開的版本號，不將個人預約放進 Realtime publication。
export function subscribe(onChange, onStatus) {
  if (!configured) return;
  let retry = 1000;
  function connect() {
    const url = new URL(base + '/realtime/v1/websocket');
    url.protocol = 'wss:';
    url.search = new URLSearchParams({ apikey: key, vsn: '1.0.0' });
    const ws = new WebSocket(url);
    const topic = 'realtime:reading-room';
    let serial = 1, heartbeat, awaiting = null;
    const deadline = setTimeout(() => ws.close(), 12000);
    function send(topicName, event, payload, ref, joinRef) {
      ws.send(JSON.stringify({ topic: topicName, event, payload, ref, join_ref: joinRef }));
    }
    ws.onopen = () => {
      send(topic, 'phx_join', { config: { broadcast: { self:false, ack:false }, presence:{ enabled:false },
        private:false, postgres_changes:[{ event:'UPDATE', schema:'public', table:'rr_signal' }] } }, '1', '1');
      heartbeat = setInterval(() => {
        if (awaiting) { ws.close(); return; }
        awaiting = String(++serial);
        send('phoenix','heartbeat',{},awaiting,null);
      }, 25000);
    };
    ws.onmessage = event => {
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      if (packet.event === 'phx_reply' && packet.ref === awaiting) awaiting = null;
      if (packet.ref === '1' && packet.event === 'phx_reply') {
        if (packet.payload.status !== 'ok') { ws.close(); return; }
        clearTimeout(deadline);
        retry = 1000;
        onStatus(true);
        onChange();
      }
      if (packet.event === 'postgres_changes') onChange();
      if (packet.event === 'phx_error' || packet.event === 'phx_close' ||
          (packet.event === 'system' && packet.payload?.status === 'error')) ws.close();
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      clearTimeout(deadline); clearInterval(heartbeat);
      onStatus(false);
      setTimeout(connect, retry);
      retry = Math.min(60000, retry * 2);
    };
  }
  connect();
}


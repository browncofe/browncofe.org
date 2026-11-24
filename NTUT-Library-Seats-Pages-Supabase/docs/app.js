import * as api from './api.js';
import { esc, hour, taiDay, taiHour, todayOf, serverTime, dayReason, slotProblem, shiftDay, monthShift,
  selectionText, matches, navTitles, guide, dashboard, calendar, seatmap, bookings } from './views.js';

const $ = key => document.getElementById(key);
const dialog=$('dialog'), views={dashboard,calendar,seatmap,bookings};
let callbackNote='';
if (/(?:^#|&)(?:access_token|error|error_description)=/.test(location.hash)) {
  const params=new URLSearchParams(location.hash.slice(1));
  callbackNote=params.has('error')?'驗證連結已失效，請重新取得驗證信。':'信箱驗證已完成，請使用電子郵件與密碼登入。';
  history.replaceState(null,'',location.pathname+location.search+'#dashboard');
}
const route=()=>Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):'dashboard';
const s={page:route(),email:api.email(),data:null,items:null,stale:true,live:false,offsetMs:0,tab:'pending',
  pageIndex:0,zone:'A',selected:null,power:false,window:false,zoom:100,day:taiDay(Date.now()),start:8,end:10};
function defaultSlot() {
  const now=serverTime(s),today=taiDay(now),limit=shiftDay(monthShift(today,2),-1);
  let day=today;
  while(day<=limit && dayReason(s,day)) day=shiftDay(day,1);
  if(day>limit) day=today;
  const start=day===today?Math.min(21,Math.max(8,taiHour(now)+1)):8;
  Object.assign(s,{day,start,end:Math.min(22,start+2),month:day.slice(0,7)});
}
defaultSlot();

let generation=0,firstLoad=true,networkError='',retryKey=null,mutating=false,confirmAction=null;
let toastTimer,updateTimer;
function toast(text) {
  $('toast').textContent=text;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{$('toast').textContent='';},6000);
}
function show(title,html) {
  $('dialog-title').textContent=title; $('dialog-body').innerHTML=html; $('dialog-error').textContent='';
  if(!dialog.open) dialog.showModal();
}
function closeDialog() { dialog.close(); confirmAction=null; }
function render() {
  const el=document.activeElement, inView=$('view').contains(el), scroll=$('view').querySelector('.map-scroll')?.scrollLeft;
  const oldKey=inView?[el.id,...['do','seat','day','tab','zone','action','id','step'].map(k=>el.dataset[k]||'')].join('|'):null;
  document.title=navTitles[s.page]+'｜北科大圖書館座位預約';
  for(const a of document.querySelectorAll('nav a')){
    if(a.hash==='#'+s.page) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  }
  $('account').textContent=s.email||'登入／註冊';
  const active=(s.data?.counts.pending||0)+(s.data?.counts.active||0);
  $('count').textContent=active?' ('+active+')':'';
  const status=!api.configured?'尚未連接資料庫。請依 README 填寫 docs/config.js 並執行 setup.sql，座位與預約將從你的專案載入。':networkError;
  $('connection').className=status?'notice':'';
  $('connection').textContent=status;
  const html=views[s.page](s);
  if($('view').innerHTML!==html) {
    $('view').innerHTML=html;
    if(scroll && $('view').querySelector('.map-scroll')) $('view').querySelector('.map-scroll').scrollLeft=scroll;
    if(oldKey) {
      const target=[...$('view').querySelectorAll('button,a,input,select')].find(x=>
        [x.id,...['do','seat','day','tab','zone','action','id','step'].map(k=>x.dataset[k]||'')].join('|')===oldKey);
      target?.focus({preventScroll:true});
    }
  }
}
function clearSeat() { s.selected=null; retryKey=null; }
async function refresh() {
  if(!api.configured) { render(); return; }
  const seq=++generation;
  const args={p_day:s.day,p_start:s.start,p_end:s.end};
  try {
    const [data,items]=await Promise.all([
      api.rpc('rr_snapshot',args),
      s.page==='bookings'&&s.email?api.rpc('rr_my_bookings',{p_tab:s.tab,p_offset:s.pageIndex*10}):Promise.resolve(null)
    ]);
    if(seq!==generation) return;
    s.data=data; s.offsetMs=Date.parse(data.now)-Date.now(); s.stale=false; s.items=items; networkError='';
    if(firstLoad) {
      firstLoad=false;
      if(slotProblem(s)||s.day<data.today||s.day>data.last_day || s.autoDefault) {
        const before=selectionText(s); defaultSlot(); s.autoDefault=false;
        if(before!==selectionText(s)) { s.stale=true; render(); return refresh(); }
      }
    }
    if(s.selected) {
      const a=data.seats.find(x=>x.id===s.selected);
      if(!a||a.busy||a.maintenance||data.zones.find(z=>z.id===a.zone)?.maintenance||slotProblem(s)) {
        clearSeat(); toast('先前選擇的座位已無法預約，請重新選位。');
      }
    }
    if(items?.length===0 && s.pageIndex>0) { s.pageIndex--; return refresh(); }
  } catch(err) {
    if(seq!==generation) return;
    s.stale=true; s.data=null; s.items=null;
    networkError='無法取得最新資料。'+err.message+'　請確認網路與資料庫設定後重新整理。';
  }
  render();
}
s.autoDefault=true;
function soon() { clearTimeout(updateTimer); updateTimer=setTimeout(refresh,180); }
function navigate(page) { if(s.page===page) {render(); soon();} else location.hash=page; }
addEventListener('hashchange',()=>{
  if(location.hash==='#content') { history.replaceState(null,'','#'+s.page); $('content').focus(); return; }
  s.page=route(); s.items=null; if(dialog.open) closeDialog();
  render(); refresh(); window.scrollTo(0,0);
});
addEventListener('readerchange',()=>{
  generation++; s.email=api.email(); s.data=null; s.items=null; s.stale=true; retryKey=null; s.pageIndex=0;
  render(); soon();
});
function chooseTime(patch) {
  Object.assign(s,patch); s.autoDefault=false;
  retryKey=null; s.stale=true; render(); refresh();
}
function authForm() {
  if(!api.configured) { show('登入／註冊','<p>請先完成 Supabase 設定。部署步驟請見 ZIP 內的 README.md。</p>');return; }
  if(s.email) { show('我的帳號',`<p class="details">${esc(s.email)}</p><div class="dialog-actions"><button data-do="mine">我的預約</button><button data-do="logout">登出</button></div>`);return; }
  show('登入／註冊',`<form id="auth-form"><label>電子郵件<input name="email" type="email" autocomplete="email" required></label>
   <label>密碼<input name="password" type="password" autocomplete="current-password" required></label>
   <div class="dialog-actions"><button type="submit" value="signup">註冊新帳號</button><button class="primary" type="submit" value="login">登入</button></div></form>`);
}
function runConfirm(title,html,label,fn) {
  confirmAction=fn;
  show(title,html+`<div class="dialog-actions"><button data-do="close">返回</button><button class="primary" data-do="confirm">${esc(label)}</button></div>`);
}
function review() {
  if(!s.email) {authForm();return;}
  if(!s.selected||!s.data||s.stale||s.data.conflict||slotProblem(s)) {toast('請重新確認時段與座位。');return;}
  const a=s.data.seats.find(x=>x.id===s.selected);
  if(!a||a.busy) return;
  const z=s.data.zones.find(x=>x.id===a.zone);
  const key=[s.email,s.day,s.start,s.end,a.id].join('|');
  if(!retryKey||retryKey.key!==key) retryKey={key,id:crypto.randomUUID()};
  const args={p_request:retryKey.id,p_day:s.day,p_start:s.start,p_end:s.end,p_seat:a.id};
  runConfirm('確認預約摘要',`<p class="big-seat">${esc(a.id)}</p><p>${esc(z.floor)} · ${esc(z.title)}</p>
    <p>${a.power?'有插座':'無插座'} · ${a.window_seat?'靠窗':'內側'}</p><p class="subtle">${selectionText(s)} · 共 ${s.end-s.start} 小時</p>`,'送出預約',async()=>{
    await api.rpc('rr_reserve',args);
    clearSeat(); s.tab='pending'; s.pageIndex=0; confirmAction=null;
    show('座位預約完成',`<p><b>${esc(a.id)}</b>　${esc(args.p_day)}　${hour(args.p_start)}–${hour(args.p_end)}</p><p class="muted">請於預約開始後準時報到。</p><div class="dialog-actions"><button class="primary" data-do="mine">查看我的預約</button></div>`);
    await refresh();
  });
}
const labels={checkin:'報到',away:'暫時離座',return:'返回座位',cancel:'取消預約',end:'結束使用'};
async function perform(id,action) {
  await api.rpc('rr_act',{p_id:id,p_action:action});
  if(dialog.open) closeDialog();
  s.tab=['checkin','away','return'].includes(action)?'active':'history'; s.pageIndex=0;
  toast('已完成「'+labels[action]+'」'); await refresh();
}
async function busy(fn,trigger) {
  if(mutating) return;
  mutating=true;
  if(trigger) trigger.disabled=true;
  try {await fn();} catch(err) {
    if(dialog.open) $('dialog-error').textContent=err.message; else toast(err.message);
    soon();
  } finally {mutating=false; if(trigger?.isConnected) trigger.disabled=false;}
}
document.addEventListener('submit',event=>{
  if(event.target.id!=='auth-form') return;
  event.preventDefault();
  const form=event.target, mode=event.submitter?.value||'login';
  if(mode==='signup' && form.elements.password.value.length<6){$('dialog-error').textContent='註冊密碼至少需要 6 個字元。';return;}
  busy(async()=>{
    const ok=await api.authenticate(mode,form.elements.email.value.trim(),form.elements.password.value);
    if(!ok) { show('請查收驗證信','<p>若此信箱可供註冊，Supabase 會寄送確認信。請依信中連結完成驗證，再回來登入。</p><div class="dialog-actions"><button data-do="account">返回登入</button></div>');return;}
    closeDialog(); await refresh(); toast('已登入'); if(s.page==='seatmap'&&s.selected) review();
  },event.submitter);
});
document.addEventListener('change',event=>{
  if(event.target.id==='start') {const start=Number(event.target.value); chooseTime({start,end:Math.max(start+1,s.end)});}
  if(event.target.id==='end') chooseTime({end:Number(event.target.value)});
});
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-do]'); if(!b||b.disabled||mutating) return;
  const d=b.dataset;
  switch(d.do) {
    case 'account': authForm(); break;
    case 'logout': busy(async()=>{try {await api.logout();toast('已登出');} finally {closeDialog();await refresh();}},b);break;
    case 'guide': show('閱覽室座位預約使用說明',guide(s));break;
    case 'close': closeDialog();break;
    case 'refresh': refresh();break;
    case 'start': closeDialog();navigate('calendar');break;
    case 'map': navigate('seatmap');break;
    case 'mine': if(dialog.open) closeDialog();navigate('bookings');break;
    case 'latest': {
      const st=s.data?.latest?.status;
      s.tab=st==='pending'||!st?'pending':['in_use','temp_away'].includes(st)?'active':'history';
      s.pageIndex=0; navigate('bookings');break;
    }
    case 'inspect':
      if(d.current) { defaultSlot(); s.stale=true; }
      clearSeat(); s.zone=d.zone; navigate('seatmap');break;
    case 'zone': clearSeat();s.zone=d.zone;render();break;
    case 'month': s.month=monthShift(s.month+'-01',Number(d.step)).slice(0,7);render();break;
    case 'day': {
      const day=d.day;
      if(dayReason(s,day)) break;
      const start=day===todayOf(s)?Math.max(s.start,taiHour(serverTime(s))+1):s.start;
      chooseTime({day,start,end:Math.max(s.end,start+1)});break;
    }
    case 'seat': s.selected=d.seat;retryKey=null;render();break;
    case 'power': case 'window': case 'clear': {
      if(d.do==='clear') s.power=s.window=false; else s[d.do]=!s[d.do];
      const a=s.data?.seats.find(x=>x.id===s.selected);if(a&&!matches(s,a)) clearSeat();
      render();break;
    }
    case 'zoom': s.zoom=Number(d.step)?Math.max(85,Math.min(115,s.zoom+Number(d.step))):100;render();break;
    case 'review': review();break;
    case 'confirm': if(confirmAction) busy(confirmAction,b);break;
    case 'tab': s.tab=d.tab;s.pageIndex=0;s.items=null;render();refresh();break;
    case 'paging': s.pageIndex=Math.max(0,s.pageIndex+Number(d.step));s.items=null;render();refresh();break;
    case 'act': {
      if(['cancel','end'].includes(d.action)) {
        const booking=s.items?.find(x=>x.id===d.id);
        if(booking) runConfirm('確認'+labels[d.action],`<p>${esc(booking.seat)} · ${esc(booking.day)} · ${hour(booking.start_hour)}–${hour(booking.end_hour)}</p><p>確認後將釋出這個時段的座位。</p>`,labels[d.action],()=>perform(d.id,d.action));
      } else busy(()=>perform(d.id,d.action),b);
      break;
    }
  }
});
dialog.addEventListener('cancel',e=>{if(mutating)e.preventDefault();else confirmAction=null;});
document.addEventListener('visibilitychange',()=>{if(!document.hidden) soon();});
addEventListener('online',soon);
render(); refresh(); if(callbackNote) toast(callbackNote);
api.subscribe(soon,live=>{s.live=live;render();});
setInterval(()=>{if(!document.hidden) refresh();},25000);


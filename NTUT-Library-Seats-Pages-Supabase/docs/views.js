export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pad = n => String(n).padStart(2,'0');
export const hour = n => pad(n)+':00';
export const taiDay = ms => new Date(ms+8*3600000).toISOString().slice(0,10);
export const taiHour = ms => new Date(ms+8*3600000).getUTCHours();
export const shiftDay = (day,n) => new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export const monthShift = (day,n) => {
  const d=new Date(day.slice(0,7)+'-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth()+n); return d.toISOString().slice(0,10);
};
export const pretty = day => new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'long',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(day+'T00:00:00Z'));
export const clock = iso => new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
const statusNames={pending:'待報到',in_use:'使用中',temp_away:'暫離中',expired:'已逾時',cancelled:'已取消',completed:'已完成'};
export const tabs={pending:'待報到',active:'使用中',history:'歷史紀錄'};
export const navTitles={dashboard:'座位總覽',calendar:'日期與時段',seatmap:'座位圖',bookings:'我的預約'};
export const templateZones=[
 {id:'A',title:'安靜閱讀',floor:'B1 自習室西側',description:'北側採光，部分座位備有插座。'},
 {id:'B',title:'筆電使用',floor:'B1 自習室東側',description:'全席配備插座，北側與東側靠窗。'},
 {id:'C',title:'靠窗閱讀',floor:'2F 閱覽長廊',description:'自然採光的閱讀長桌。'}
];
export const selectionText = s => pretty(s.day)+' · '+hour(s.start)+'–'+hour(s.end);
export const serverTime = s => Date.now()+(s.offsetMs||0);
export const todayOf = s => taiDay(serverTime(s));
export function dayReason(s,day) {
  const now=serverTime(s), today=taiDay(now);
  if(day<today) return '日期已過';
  if(day>shiftDay(monthShift(today,2),-1)) return '超出開放日期';
  if(s.data?.closures[day]) return '休館 · '+s.data.closures[day];
  if(day===today && taiHour(now)>=21) return '今日整點時段已結束';
  return '';
}
export function slotProblem(s) {
  return dayReason(s,s.day) || (s.day===todayOf(s) && s.start<=taiHour(serverTime(s))?'開始時間已過':'');
}
const btn=(label,action,extra='',cls='')=>`<button data-do="${action}" class="${cls}" ${extra}>${label}</button>`;
const link=(label,to,cls='')=>`<a class="btn ${cls}" href="#${to}">${label}</a>`;
const badge=(label,kind='')=>`<span class="tag ${kind}">${esc(label)}</span>`;
const hero=(k,title,desc,action='')=>`<div class="hero"><div><p class="eyebrow">${k}</p><h1>${title}</h1><p class="intro">${desc}</p></div>${action}</div>`;
const notice=text=>`<p class="notice">${esc(text)}</p>`;
const steps=page=>`<div class="steps"><${page===1?'b':'span'}>1　日期與時段</${page===1?'b':'span'}> › <${page===2?'b':'span'}>2　選擇座位</${page===2?'b':'span'}> › <span>3　確認預約</span></div>`;
const zoneList=s=>s.data?.zones || templateZones;
const zoneSeats=(s,z)=>(s.data?.seats || []).filter(seat=>seat.zone===z.id);
export const matches=(s,seat)=>(!s.power||seat.power)&&(!s.window||seat.window_seat);
function availability(s,z,current=false) {
  if(!s.data || s.stale) return '尚未取得';
  const now=serverTime(s), h=taiHour(now);
  if(current && (h<8||h>=22||s.data.closures[taiDay(now)])) return '休館中';
  if(z.maintenance) return '維護中';
  if(!current && slotProblem(s)) return '時段未開放';
  const seats=zoneSeats(s,z);
  return seats.filter(a=>!a.maintenance && !(current?a.busy_now:a.busy)).length;
}
function zoneRows(s) {
  return zoneList(s).map(z=>{
    const count=availability(s,z);
    return `<div class="listline"><span><b>${esc(z.id)} 區</b>　${esc(z.title)}</span>
     ${btn(typeof count==='number'?count+' 席可約 →':esc(count),'inspect','data-zone="'+esc(z.id)+'"')}</div>`;
  }).join('');
}
function ruleList(s) {
  const rules=s.data?.rules;
  return `<ul class="rulelist"><li>開放時段為 08:00–22:00，以臺灣時間整點預約。</li><li>同一時段，每人可保留一個座位。</li>
  <li>${rules?'預約開始後 '+rules.grace+' 分鐘內報到。':'報到期限以預約明細為準。'}</li>
  <li>${rules?'暫離最多保留 '+rules.away+' 分鐘，以預約結束時間為上限。':'暫離時請留意返回期限。'}</li></ul>`;
}
export function guide(s) {
  return `<ol class="rulelist"><li>選擇日期與起訖時間，查看各區可預約席數。</li><li>在座位圖依插座、靠窗條件挑選座位，登入後核對並送出。</li>
  <li>到場後開啟「我的預約」，在寬限時間內按「報到」。</li><li>短暫離開可保留座位。回來時按「返回座位」，提早離館按「結束使用」。</li></ol>
  <h3>使用規則</h3>${ruleList(s)}<p class="muted">本課程作品使用獨立帳號與座位配置，未串接校方讀者證或門禁。</p>
  <div class="dialog-actions">${btn('開始預約','start','','primary')}</div>`;
}
export function dashboard(s) {
  const cards=zoneList(s).map(z=>{
    const n=availability(s,z,true), total=zoneSeats(s,z).length;
    const current=typeof n==='number';
    return `<article class="card"><div class="row"><h2>${esc(z.id)} 區 · ${esc(z.title)}</h2>${badge(current?'開放中':n,current?'':'grey')}</div>
    <small>${esc(z.floor)}</small><p class="details"><b class="number">${current?n:'—'}</b> ${s.data?'/ '+total+' 席':'席'} 即時空位</p>
    <div class="meter"><i style="width:${current&&total?100*n/total:0}%"></i></div><p class="muted">${esc(z.description)}</p>
    ${btn('查看座位圖 →','inspect','data-zone="'+esc(z.id)+'" data-current="true"')}</article>`;
  }).join('');
  const b=s.data?.latest;
  return hero('國立臺北科技大學圖書館 · 閱覽空間導覽','找到適合你的閱讀角落','先檢視各區即時空位與環境特色，再依你的研讀時程預約專屬座位。',link('預約座位　→','calendar','primary'))+
  `<section><div class="row"><h2>目前即時空位</h2><div class="flex"><span class="sync">${s.data?'更新於 '+clock(s.data.now)+' · '+(s.live?'即時連線':'定期更新'):'等待資料連線'}</span>${btn('重新整理','refresh')}</div></div><div class="cards">${cards}</div></section>
  <div class="twocol"><section class="card"><div class="row"><h2>指定時段可預約座位</h2>${link('修改時段','calendar')}</div><p class="muted">${selectionText(s)}</p>${zoneRows(s)}</section>
  <article class="card"><div class="row"><h2>最近一筆預約</h2>${btn('查看全部','latest')}</div>${b?receipt(s,b,false):`<p class="empty">${s.email?(s.data?'尚無預約紀錄。':'讀取預約中。'):'登入後可查看你的預約。'}</p>`}</article></div>
  <section class="card"><h2>使用提醒</h2>${ruleList(s)}</section>`;
}
export function calendar(s) {
  const first=s.month+'-01', cells=[], leading=(new Date(first+'T00:00:00Z').getUTCDay()+6)%7;
  for(let i=0;i<leading;i++) cells.push('<span></span>');
  for(let day=first;day.slice(0,7)===s.month;day=shiftDay(day,1)){
    const reason=dayReason(s,day);
    const label=Number(day.slice(-2))+(reason?'<small>'+ (reason.startsWith('休館')?'休館':'—')+'</small>':'');
    cells.push(btn(label,'day',`data-day="${day}" aria-label="${esc(pretty(day)+' '+reason)}" title="${esc(reason||pretty(day))}" aria-pressed="${s.day===day}" ${reason?'disabled':''}`,'day'));
  }
  const today=todayOf(s), minStart=s.day===today?Math.max(8,taiHour(serverTime(s))+1):8;
  const options=(min,max,picked)=>Array.from({length:Math.max(0,max-min+1)},(_,i)=>`<option value="${i+min}" ${i+min===picked?'selected':''}>${hour(i+min)}</option>`).join('');
  const issue=slotProblem(s) || (s.data?.conflict?'你在這段時間已有預約，請改選時段。':'');
  return hero('日期與時段','安排你的閱讀時間','選擇日期與起訖時間，再查看適合的座位。')+steps(1)+`<div class="columns"><div>
  <section class="card"><div class="row"><h2>選擇日期</h2><div class="flex">${btn('‹','month','aria-label="上個月" data-step="-1" '+(s.month<=today.slice(0,7)?'disabled':''))}
  <b>${s.month.replace('-',' 年 ')} 月</b>${btn('›','month','aria-label="下個月" data-step="1" '+(s.month>=monthShift(today,1).slice(0,7)?'disabled':''))}</div></div>
  <div class="calendar">${[...'一二三四五六日'].map(d=>'<b class="weekday">'+d+'</b>').join('')}${cells.join('')}</div>
  <small>灰色日期無法預約。可選本月及下月尚未開始的時段。</small>
  ${Object.entries(s.data?.closures||{}).filter(([day])=>day.startsWith(s.month)).map(([day,reason])=>notice(day+' 休館 · '+reason)).join('')}</section>
  <section class="card"><h2>選擇時段</h2><div class="timefields"><label>開始時間<select id="start">${options(minStart,21,s.start)}</select></label>
  <label>結束時間<select id="end">${options(s.start+1,22,s.end)}</select></label></div></section></div>
  <aside class="card"><h2 class="line">預約時間摘要</h2><p>${pretty(s.day)}</p><h3>${hour(s.start)}–${hour(s.end)}</h3><p class="muted">共 ${s.end-s.start} 小時 · 臺灣時間</p>
  <h3 class="line">此時段各區可預約座位</h3>${zoneRows(s)}${issue?notice(issue):''}
  ${btn('前往座位圖　→','map',issue?'disabled':'','primary')}</aside></div>`;
}
export function seatmap(s) {
  const zones=zoneList(s), z=zones.find(x=>x.id===s.zone)||zones[0];
  const seats=zoneSeats(s,z), picked=seats.find(x=>x.id===s.selected);
  const invalid=slotProblem(s);
  const blocked=s.stale||!s.data||!!invalid;
  const rows=[...new Set(seats.map(x=>x.row_no))];
  const desks=rows.map((row,idx)=>{
    const group=seats.filter(x=>x.row_no===row), pairs=[];
    for(let i=0;i<group.length;i+=2) {
      pairs.push('<div class="pair">'+group.slice(i,i+2).map(a=>{
        const match=matches(s,a), state=z.maintenance||a.maintenance?'維護':a.busy?'已預約':a.id===s.selected?'已選取':'可預約';
        return btn(esc(a.id)+'<small>'+state+'</small>','seat',`data-seat="${esc(a.id)}" aria-pressed="${a.id===s.selected}" ${blocked||state==='維護'||a.busy||!match?'disabled':''}`,'seat'+(match?'':' filtered'));
      }).join('')+'</div>');
    }
    return (idx===2?'<div class="corridor">中央走道</div>':'')+pairs.join('');
  }).join('');
  return hero('座位圖','選一個適合你的座位','查看位置與設備，點選可預約的座位。',link('修改日期與時段','calendar'))+steps(2)+
  `<p class="subtle">${selectionText(s)}</p>${invalid?notice(invalid):''}${s.data?.conflict?notice('你在此時段已有預約，請修改時間。'):''}
  <div class="columns"><section class="card"><div class="row"><h2>${esc(z.floor)} · ${esc(z.id)} 區</h2><div class="tabs">${zones.map(a=>btn(esc(a.id)+' 區','zone',`data-zone="${esc(a.id)}" aria-pressed="${a.id===z.id}"`)).join('')}</div></div>
  <p class="muted">${esc(z.description)}</p><div class="row line"><div class="flex">${btn('有插座','power','aria-pressed="'+s.power+'"')}${btn('靠窗','window','aria-pressed="'+s.window+'"')}
  ${s.power||s.window?btn('清除篩選','clear'):''}</div><div class="flex">${btn('−','zoom','aria-label="縮小" data-step="-15" '+(s.zoom<=85?'disabled':''))}${btn(s.zoom+'%','zoom','aria-label="還原比例" data-step="0"')}${btn('＋','zoom','aria-label="放大" data-step="15" '+(s.zoom>=115?'disabled':''))}</div></div>
  ${z.maintenance?notice('本區維護中，請改選其他區域。'):''}
  ${s.data?`<small>符合條件的可預約座位　${blocked?'—':seats.filter(a=>!a.busy&&!a.maintenance&&!z.maintenance&&matches(s,a)).length} 席</small>
  <div class="map-scroll"><div class="plan" style="width:${s.zoom}%;min-width:${5.3*s.zoom}px">${z.id==='B'?'<span class="east">東側窗戶</span>':''}<div class="desks">${desks}</div><div class="entrance">入口　↑</div></div></div>
  <div class="legend"><span>● 可預約</span><span>◌ 已預約</span><span>✓ 已選取</span><span>▧ 維護</span></div>`:'<p class="empty">連線後可查看座位平面圖。</p>'}
  </section><aside class="card"><h2 class="line">座位資訊</h2>${picked?`<b class="big-seat">${esc(picked.id)}</b><p>${esc(z.title)} · 第 ${picked.row_no} 排第 ${picked.col_no} 席</p>
  <p class="details">${picked.power?'有插座':'無插座'}　·　${picked.window_seat?'靠窗':'內側'}</p><p class="subtle">${selectionText(s)}</p>
  ${btn(s.email?'確認預約':'登入後預約','review',blocked||s.data.conflict?'disabled':'','primary')}`:'<p class="empty">點選平面圖中的可預約座位，即可查看設備與位置。</p>'}</aside></div>`;
}
function receipt(s,b,actions) {
  const buttons=[], action=(label,key,cls='',disabled=false)=>btn(label,'act',`data-id="${esc(b.id)}" data-action="${key}" ${disabled?'disabled':''}`,cls);
  if(actions && b.status==='pending') buttons.push(action('報到','checkin','primary',serverTime(s)<Date.parse(b.starts_at)),action('取消預約','cancel','danger'));
  if(actions && b.status==='in_use') buttons.push(action('暫時離座','away'),action('結束使用','end','danger'));
  if(actions && b.status==='temp_away') buttons.push(action('返回座位','return','primary'),action('結束使用','end','danger'));
  const st=b.status;
  const detail=st==='pending'?'報到時段 '+clock(b.starts_at)+'–'+clock(b.check_by)+'（截止前完成）':st==='temp_away'?'請於 '+clock(b.return_by)+' 前回到座位':b.ended_at?'結束於 '+clock(b.ended_at):st==='expired'?'已超過報到或返回期限，座位已釋出。':st==='in_use'?'已於 '+clock(b.checked_at)+' 報到':'預約時段已結束。';
  return `<article class="receipt"><div class="row"><h3>${esc(b.seat)} 座位</h3>${badge(statusNames[st],st==='pending'||st==='temp_away'?'gold':st==='in_use'?'':'grey')}</div>
  <p>${pretty(b.day)} · ${hour(b.start_hour)}–${hour(b.end_hour)}</p><small>${esc(detail)}</small>${buttons.length?'<div class="flex">'+buttons.join('')+'</div>':''}</article>`;
}
export function bookings(s) {
  const prefix=hero('個人預約管理','我的預約','查看報到期限、管理使用中的座位，或查閱歷史紀錄。',link('預約座位　→','calendar','primary'));
  if(!s.email) return prefix+'<section class="card"><h2>登入以查看個人預約</h2><p class="muted">使用你的電子郵件登入，從不同裝置查看同一組預約。</p>'+btn('登入／註冊','account','','primary')+'</section>';
  return prefix+`<div class="columns"><section class="card"><div class="tabs">${Object.entries(tabs).map(([key,title])=>btn(title+' ('+(s.data?.counts[key]??'—')+')','tab',`data-tab="${key}" aria-pressed="${s.tab===key}"`)).join('')}</div>
  ${s.items===null?'<p class="empty">等待預約資料。</p>':s.items.length?s.items.slice(0,10).map(b=>receipt(s,b,true)).join(''):'<p class="empty">這個分類目前沒有預約。</p>'}
  ${s.pageIndex||s.items?.length>10?`<div class="row">${btn('上一頁','paging','data-step="-1" '+(!s.pageIndex?'disabled':''))}<small>第 ${s.pageIndex+1} 頁</small>${btn('下一頁','paging','data-step="1" '+(!(s.items?.length>10)?'disabled':''))}</div>`:''}</section>
  <aside class="card"><h2>操作提醒</h2>${ruleList(s)}<p class="muted">每筆預約保留建立時的規則，實際期限請看預約明細。</p></aside></div>`;
}


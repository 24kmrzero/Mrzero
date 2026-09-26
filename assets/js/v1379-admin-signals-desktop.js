/* 24K MR ZERO — Admin Signals desktop Mentor parity v13.79 */
(()=>{
'use strict';
const A=window.App;
let state=window.AdminBase?.state||null;
let period='all';

const $=s=>document.querySelector(s);
const esc=v=>A?.escapeHtml?A.escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const signed=n=>{const x=Number(n||0);return (x>0?'+':'')+x.toLocaleString('en-US',{maximumFractionDigits:1})};
const finalSignal=s=>{
  const st=String(s?.status||'').trim().toLowerCase();
  return Boolean(s?.closed_at)||['tp4_hit','sl_hit','breakeven_hit','manually_closed','cancelled','closed'].includes(st)||(st==='tp3_hit'&&(s?.take_profit_4===null||s?.take_profit_4===undefined||s?.take_profit_4===''));
};
const signalPips=s=>{
  if(s?.result_pips!==null&&s?.result_pips!==undefined)return Number(s.result_pips);
  const u=(state?.signalUpdates||[]).find(x=>x.signal_id===s?.id&&x.result_pips!==null&&x.result_pips!==undefined);
  return u?Number(u.result_pips):null;
};
const entryText=s=>{
  const a=s?.entry_from,b=s?.entry_to;
  if(a===null||a===undefined)return '—';
  const fmt=v=>Number(v).toLocaleString('en-US',{maximumFractionDigits:5});
  return b!==null&&b!==undefined&&Number(b)!==Number(a)?fmt(a)+'–'+fmt(b):fmt(a);
};
const num=v=>v===null||v===undefined||v===''?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:5});
const typeText=s=>{
  const d=String(s?.direction||'').toUpperCase()||'—';
  const o=String(s?.order_type||'market').toUpperCase();
  return o==='MARKET'?d:`${d} ${o}`;
};
const dateParts=v=>{
  const d=v?new Date(v):null;
  if(!d||Number.isNaN(d.getTime()))return{date:'—',time:'—',key:''};
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',day:'2-digit',month:'short',year:'numeric'}).format(d);
  const time=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}).format(d);
  const kparts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const map=Object.fromEntries(kparts.map(x=>[x.type,x.value]));
  return{date:parts,time,key:`${map.year}-${map.month}-${map.day}`};
};
const todayKey=()=>dateParts(new Date()).key;

function refreshPairOptions(){
  const select=$('#adminSignalPairFilterDesktop');if(!select||!state)return;
  const current=select.value||'all';
  const pairs=[...new Set((state.signals||[]).map(s=>String(s.symbol||'').replace('/','').toUpperCase()).filter(Boolean))].sort();
  select.innerHTML='<option value="all">Pair</option>'+pairs.map(p=>`<option value="${esc(p)}">${esc(p.replace(/^([A-Z]{3})([A-Z]{3})$/,'$1/$2'))}</option>`).join('');
  select.value=pairs.includes(current)?current:'all';
}

function periodMatch(s){
  const d=new Date(s.published_at||s.created_at||0);
  if(Number.isNaN(d.getTime()))return false;
  if(period==='all')return true;
  if(period==='daily')return dateParts(d).key===todayKey();
  if(period==='weekly')return d.getTime()>=Date.now()-7*86400000;
  if(period==='monthly'){
    const now=new Date(),x=new Date(d);
    return x.getFullYear()===now.getFullYear()&&x.getMonth()===now.getMonth();
  }
  if(period==='custom'){
    const from=$('#adminSignalFromDesktop')?.value||'',to=$('#adminSignalToDesktop')?.value||'';
    const key=dateParts(d).key;
    return (!from||key>=from)&&(!to||key<=to);
  }
  return true;
}

function filteredSignals(){
  if(!state)return[];
  const view=$('#adminSignalView')?.value||'active';
  const q=String($('#adminSignalSearch')?.value||'').trim().toLowerCase();
  const pair=$('#adminSignalPairFilterDesktop')?.value||'all';
  const type=$('#adminSignalTypeFilterDesktop')?.value||'all';
  const status=$('#adminSignalStatusFilterDesktop')?.value||'all';

  return (state.signals||[]).filter(s=>{
    const isFinal=finalSignal(s);
    if(view==='active'&&isFinal)return false;
    if(view==='history'&&!isFinal)return false;
    if(view==='report')return false;
    const search=`${s.symbol||''} ${s.direction||''} ${s.order_type||''} ${s.status||''} ${s.notes||''}`.toLowerCase();
    if(q&&!search.includes(q))return false;
    if(pair!=='all'&&String(s.symbol||'').replace('/','').toUpperCase()!==pair)return false;
    if(type!=='all'&&typeText(s)!==type)return false;
    if(status!=='all'&&String(s.status||'').toLowerCase()!==status)return false;
    return periodMatch(s);
  });
}

function renderHeroStats(){
  if(!state)return;
  const all=state.signals||[],closed=all.filter(finalSignal),countable=closed.filter(s=>String(s.status)!=='cancelled'&&signalPips(s)!==null);
  const wins=countable.filter(s=>Number(signalPips(s))>0),net=countable.reduce((n,s)=>n+Number(signalPips(s)||0),0);
  const rate=countable.length?Math.round(wins.length/countable.length*100):0;
  const active=all.filter(s=>!finalSignal(s)).length;
  const box=$('#adminSignalStatsDesktop');
  if(box)box.innerHTML=[
    ['live','fa-bolt','ACTIVE',active,'Live / pending'],
    ['closed','fa-circle-check','HISTORY',closed.length,'Resolved records'],
    ['win','fa-bullseye','WIN RATE',rate+'%','Closed results'],
    ['net','fa-chart-line','NET PIPS',signed(net),'Recorded result']
  ].map(([tone,icon,label,val,note])=>`<article><span class="admin-signal-stat-icon-desktop ${tone}"><i class="fa-solid ${icon}"></i></span><div><small>${label}</small><b>${esc(val)}</b><em>${note}</em></div></article>`).join('');
  const a=$('#adminDesktopActiveSignalCount'),h=$('#adminDesktopHistorySignalCount');
  if(a)a.textContent=String(active);if(h)h.textContent=String(closed.length);
}

function statusMarkup(s){
  const st=String(s.status||'').toLowerCase();
  const good=['tp1_hit','tp2_hit','tp3_hit','tp4_hit'].includes(st);
  const bad=['sl_hit','cancelled'].includes(st);
  const cls=good?'good':bad?'bad':finalSignal(s)?'neutral':'live';
  const label=A?.statusLabel?A.statusLabel(st):st.replaceAll('_',' ');
  return `<span class="admin-signal-status-desktop ${cls}"><i></i>${esc(label)}</span>`;
}
function pipsMarkup(s){
  const p=signalPips(s);if(p===null)return '<span class="admin-signal-pips-desktop neutral">—</span>';
  const cls=p>0?'good':p<0?'bad':'neutral';
  return `<span class="admin-signal-pips-desktop ${cls}">${esc(signed(p))} pips</span>`;
}

function renderDesktopTable(){
  if(!state)return;
  refreshPairOptions();
  const view=$('#adminSignalView')?.value||'active';
  const panel=$('#p-signals'),wrap=$('#adminSignalDesktopTableWrap'),report=$('#adminSignalReportDesktop');
  const rows=filteredSignals();
  document.querySelectorAll('.admin-signal-tabs-desktop [data-admin-signal-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.adminSignalView===view));
  const meta=$('#adminSignalDesktopMeta');
  if(meta)meta.textContent=view==='active'? `${rows.length} active / pending signals shown` : view==='history'? `${rows.length} resolved signals shown` : 'Performance summary';
  panel?.classList.toggle('admin-signal-report-mode-desktop',view==='report');

  if(view==='report'){
    wrap?.classList.add('hidden');report?.classList.remove('hidden');renderDesktopReport();return;
  }
  wrap?.classList.remove('hidden');report?.classList.add('hidden');

  const body=$('#adminSignalsDesktopBody');if(!body)return;
  body.innerHTML=rows.length?rows.map(s=>{
    const when=dateParts(s.published_at||s.created_at);
    const dir=String(s.direction||'').toLowerCase();
    const note=s.notes?'<i class="fa-regular fa-note-sticky"></i> Note':'<i class="fa-regular fa-note-sticky"></i> Note';
    return `<tr class="admin-signal-desktop-row ${dir}">
      <td><b>${esc(when.date)}</b><small>${esc(when.time)}</small></td>
      <td><b class="admin-signal-pair-desktop">${esc(String(s.symbol||'').replace(/^([A-Z]{3})([A-Z]{3})$/,'$1/$2'))}</b></td>
      <td><span class="admin-signal-type-desktop ${dir}">${esc(typeText(s))}</span></td>
      <td><b>${esc(entryText(s))}</b></td>
      <td>${esc(num(s.stop_loss))}</td>
      <td>${esc(num(s.take_profit_1))}</td>
      <td>${esc(num(s.take_profit_2))}</td>
      <td>${esc(num(s.take_profit_3))}</td>
      <td>${esc(num(s.take_profit_4))}</td>
      <td>${statusMarkup(s)}</td>
      <td>${pipsMarkup(s)}</td>
      <td><button type="button" class="admin-signal-note-desktop" data-signal-history="${esc(s.id)}">${note}</button></td>
      <td><div class="admin-signal-manage-desktop"><button type="button" class="icon" data-edit="signal" data-id="${esc(s.id)}" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button><button type="button" class="manage" data-signal-update="${esc(s.id)}">${view==='history'?'Details':'Manage'}</button></div></td>
    </tr>`;
  }).join(''):`<tr><td colspan="13"><div class="admin-signal-empty-desktop"><span><i class="fa-solid fa-bolt"></i></span><b>No ${view==='history'?'history':'active signals'} found</b><small>Try changing the filters or search.</small></div></td></tr>`;
}

function renderDesktopReport(){
  if(!state)return;
  const closed=(state.signals||[]).filter(finalSignal),values=closed.map(s=>signalPips(s)).filter(v=>v!==null),wins=values.filter(v=>v>0),losses=values.filter(v=>v<0),net=values.reduce((a,b)=>a+b,0),rate=values.length?Math.round(wins.length/values.length*100):0;
  const root=$('#adminSignalReportDesktop');if(!root)return;
  root.innerHTML=[
    ['fa-circle-check','Closed Signals',closed.length,'Resolved records',''],
    ['fa-bullseye','Win Rate',rate+'%',wins.length+' wins','good'],
    ['fa-arrow-trend-up','Net Pips',signed(net),'Recorded performance',net>=0?'good':'bad'],
    ['fa-triangle-exclamation','Losses',losses.length,'Negative results',losses.length?'bad':'']
  ].map(([icon,label,val,note,tone])=>`<article class="${tone}"><span><i class="fa-solid ${icon}"></i></span><div><small>${label}</small><b>${esc(val)}</b><em>${esc(note)}</em></div></article>`).join('');
}

function renderDesktopSignals(){
  state=window.AdminBase?.state||state;
  if(!state)return;
  renderHeroStats();
  renderDesktopTable();
}

function bind(){
  const root=$('#p-signals');if(!root)return;
  root.addEventListener('click',e=>{
    const tab=e.target.closest('.admin-signal-tabs-desktop [data-admin-signal-view]');
    if(tab){
      const hidden=$('#adminSignalView');if(hidden)hidden.value=tab.dataset.adminSignalView;
      setTimeout(renderDesktopSignals,0);
      return;
    }
    const p=e.target.closest('[data-admin-signal-period]');
    if(p){
      period=p.dataset.adminSignalPeriod||'all';
      root.querySelectorAll('[data-admin-signal-period]').forEach(x=>x.classList.toggle('active',x===p));
      const custom=$('#adminSignalCustomDateDesktop');
      if(custom)custom.hidden=period!=='custom';
      if(period!=='custom')renderDesktopSignals();
    }
  });
  ['adminSignalPairFilterDesktop','adminSignalTypeFilterDesktop','adminSignalStatusFilterDesktop'].forEach(id=>$('#'+id)?.addEventListener('change',renderDesktopSignals));
  $('#adminSignalSearch')?.addEventListener('input',()=>requestAnimationFrame(renderDesktopSignals));
  $('#adminSignalApplyDateDesktop')?.addEventListener('click',()=>{period='custom';renderDesktopSignals()});
}

window.addEventListener('24k:admin-base-updated',e=>{state=e.detail||window.AdminBase?.state||state;requestAnimationFrame(renderDesktopSignals)});
document.addEventListener('DOMContentLoaded',()=>{bind();setTimeout(renderDesktopSignals,80)});
if(document.readyState!=='loading'){bind();setTimeout(renderDesktopSignals,80)}
})();
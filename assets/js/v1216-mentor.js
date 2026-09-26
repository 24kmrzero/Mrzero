(function(){
'use strict';
/* mentor build 13.32 */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(e=>console.warn('[24K Mentor PWA]',e?.message||e)));
}
let mentorInstallPrompt=null;
const mentorStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
function updateMentorInstall(){
  const b=document.getElementById('mentorInstallButton');
  if(!b)return;
  if(mentorStandalone()){
    b.innerHTML='<i class="fa-solid fa-circle-check"></i> Installed';
    b.disabled=true;
    b.dataset.installed='1';
  }else{
    b.disabled=false;
    b.dataset.installed='0';
  }
}
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  mentorInstallPrompt=e;
  document.getElementById('mentorInstallButton')?.classList.add('ready');
  updateMentorInstall();
});
window.addEventListener('appinstalled',()=>{
  mentorInstallPrompt=null;
  updateMentorInstall();
  try{toast('24K Mentor App installed successfully.','success')}catch(_){}
});
window.addEventListener('load',updateMentorInstall);
const cfg=window.APP_CONFIG||{},sb=(window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}}):null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const state={user:null,profile:null,perms:{signals:false,charts:false,articles:false,banners:false},signals:[],charts:[],articles:[],banners:[],courses:[],news:[],signalTab:'active',signalPeriod:'all',signalFilters:{q:'',pair:'all',type:'all',status:'all',from:'',to:''},performanceMonth:null,performanceMonthKeys:[]};
const CLOSED=new Set(['sl_hit','breakeven_hit','manually_closed','closed','cancelled','tp4_hit']);
function signalIsClosed(s){const st=String(s?.status||'');return Boolean(s?.closed_at)||CLOSED.has(st)||(st==='tp3_hit'&&(s?.take_profit_4===null||s?.take_profit_4===undefined||s?.take_profit_4===''))}
function applyMentorTheme(v){
  document.documentElement.dataset.theme=v;
  localStorage.setItem('mentor-theme',v);
  const i=$('#mentorTheme i');if(i)i.setAttribute('class',v==='dark'?'fa-solid fa-sun':'fa-solid fa-moon');
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',v==='dark'?'#0b0e11':'#f5f6f7');
}
function toast(m){const x=$('#mentorToast');if(!x)return;x.textContent=m;x.classList.add('show');clearTimeout(x._t);x._t=setTimeout(()=>x.classList.remove('show'),3200)}
function num(v){if(v===null||v===undefined||String(v).trim()==='')return null;const x=Number(v);return Number.isFinite(x)?x:null}function money(v){return Number(v||0).toLocaleString(undefined,{maximumFractionDigits:1})}function dt(v){if(!v)return'—';try{return new Date(v).toLocaleString()}catch{return'—'}}function slug(v){return String(v||'article').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}
function byDate(items,key='created_at'){return items.reduce((a,x)=>{const d=new Date(x[key]||x.published_at||Date.now()),k=d.toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});(a[k]||(a[k]=[])).push(x);return a},{})}
function contentAssetPath(url){if(!url)return null;try{const p=new URL(url,location.origin).pathname,marker='/storage/v1/object/public/content-assets/';const i=p.indexOf(marker);return i>=0?decodeURIComponent(p.slice(i+marker.length)):null}catch{return null}}
async function removeContentAsset(url){const path=contentAssetPath(url);if(!path)return;const r=await sb.storage.from('content-assets').remove([path]);if(r.error)console.warn('Mentor asset cleanup failed:',r.error)}
async function upload(file,folder){if(!file)return null;if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPG or WEBP images only.');if(file.size>8*1024*1024)throw new Error('Image must be 8 MB or smaller.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`mentor/${state.user.id}/${folder}/${crypto.randomUUID()}.${ext}`;const r=await sb.storage.from('content-assets').upload(path,file,{upsert:false,contentType:file.type||undefined});if(r.error)throw r.error;return sb.storage.from('content-assets').getPublicUrl(path).data.publicUrl}
function titleFor(k){return({performance:['Performance','Live overview and results'],signals:['Signals','Smart signal creation and management'],charts:['Charts','VIP chart research & analysis'],articles:['Articles','Professional research & insights'],banners:['Banners','Website campaign banners'],courses:['Courses','Current course catalogue'],news:['News','Latest platform updates'],settings:['Settings','Mentor account & permissions']})[k]||['Mentor Panel','']}
function openMentorMenu(){
  document.body.classList.add('mentor-menu-open');
  const b=$('#mentorMenuToggle');if(b)b.setAttribute('aria-expanded','true');
}
function closeMentorMenu(){
  document.body.classList.remove('mentor-menu-open');
  const b=$('#mentorMenuToggle');if(b)b.setAttribute('aria-expanded','false');
}
function showView(k){
  if(['signals','charts','articles','banners'].includes(k)&&!state.perms[k])return toast('Admin has not enabled this section.');
  $$('[data-mentor-panel]').forEach(x=>x.classList.toggle('active',x.dataset.mentorPanel===k));
  $$('[data-mentor-view]').forEach(x=>x.classList.toggle('active',x.dataset.mentorView===k));
  const [t,s]=titleFor(k);if($('#mentorPageTitle'))$('#mentorPageTitle').textContent=t;if($('#mentorPageSubtitle'))$('#mentorPageSubtitle').textContent=s;
  history.replaceState(null,'',`#${k}`);
  closeMentorMenu();
  if(window.innerWidth<=760)window.scrollTo({top:0,behavior:'smooth'});
}
function openModal(kind){const id=`#mentor${kind[0].toUpperCase()+kind.slice(1)}Modal`,modal=$(id);if(!modal)return;modal.classList.add('open');const body=modal.querySelector('.mentor-modal-body'),card=modal.querySelector('.mentor-modal-card');if(body)body.scrollTop=0;if(card)card.scrollTop=0;requestAnimationFrame(()=>{if(body)body.scrollTop=0;if(card)card.scrollTop=0})}function closeModals(){document.querySelectorAll('.mentor-modal').forEach(x=>x.classList.remove('open'))}function resetMentorEditor(kind){if(kind==='signal'){const f=$('#mentorSignalForm');f?.reset();if(f?.elements.id)f.elements.id.value='';$$('[data-note-preset]').forEach(x=>x.classList.remove('active'));const t=$('#mentorSignalModalTitle');if(t)t.textContent='New Signal';renderMentorPipPreview()}else if(kind==='chart'){const f=$('#mentorChartForm');f?.reset();if(f?.elements.id)f.elements.id.value='';if(f?.elements.existing_image)f.elements.existing_image.value='';const t=$('#mentorChartModalTitle');if(t)t.textContent='New Chart'}else if(kind==='article'){const f=$('#mentorArticleForm');f?.reset();if(f?.elements.id)f.elements.id.value='';if(f?.elements.existing_cover)f.elements.existing_cover.value='';if(f?.elements.is_published)f.elements.is_published.checked=true;const t=$('#mentorArticleModalTitle');if(t)t.textContent='New Article'}else if(kind==='banner'){const f=$('#mentorBannerForm');f?.reset();if(f?.elements.id)f.elements.id.value='';if(f?.elements.existing_image)f.elements.existing_image.value='';if(f?.elements.is_published)f.elements.is_published.checked=true;const t=$('#mentorBannerModalTitle');if(t)t.textContent='New Banner'}}
async function requireMentor(){
  if(!sb)throw new Error('Supabase configuration is missing.');
  let user=null;
  const local=await sb.auth.getSession();
  if(local.error)throw local.error;
  user=local.data?.session?.user||null;
  if(!user){
    const remote=await sb.auth.getUser();
    if(remote.error||!remote.data?.user){location.href='/mentor-login.html';return false}
    user=remote.data.user;
  }
  state.user=user;

  const profileQuery=sb.from('profiles').select('id,full_name,email,role,status').eq('id',user.id).maybeSingle();
  const permissionQuery=sb.from('mentor_permissions').select('feature_key,enabled').eq('mentor_id',user.id);
  const signalQuery=sb.from('signals').select('*').eq('created_by',user.id).order('created_at',{ascending:false}).limit(500);
  const [p,pm,signals]=await Promise.all([profileQuery,permissionQuery,signalQuery]);

  if(p.error||!p.data||p.data.role!=='mentor'||String(p.data.status||'active')!=='active'){
    await sb.auth.signOut();location.href='/mentor-login.html';return false
  }
  state.profile=p.data;
  if(pm.error)throw pm.error;
  for(const k of Object.keys(state.perms))state.perms[k]=Boolean((pm.data||[]).find(x=>x.feature_key===k)?.enabled);
  if(state.perms.signals){
    if(signals.error){
      console.warn('mentor signals load',signals.error);
      state.signals=[];
    }else state.signals=signals.data||[];
  }else state.signals=[];
  return true
}
async function safeLoad(table,query){try{const r=await query;if(r.error)throw r.error;return r.data||[]}catch(e){console.warn('mentor optional load',table,e);return[]}}
function revealMentorApp(){
  $('#mentorLoading')?.classList.add('hidden');
  $('#mentorApp')?.classList.remove('hidden');
  document.body.classList.remove('mentor-booting');
}
async function loadSecondaryMentorData(){
  const tasks=[];
  for(const key of ['charts','articles','banners']){
    if(!state.perms[key]){state[key]=[];continue}
    const table=key==='banners'?'mentor_banners':key;
    tasks.push(
      safeLoad(table,sb.from(table).select('*').eq('created_by',state.user.id).order('created_at',{ascending:false}).limit(500))
        .then(data=>{state[key]=data;if(key==='charts')renderCharts();else if(key==='articles')renderArticles();else renderBanners()})
    );
  }
  tasks.push(
    safeLoad('courses',sb.from('courses').select('id,title,slug,short_description,description,instructor_name,price,discount_price,currency,status,thumbnail_url,is_published,enrollment_open,start_date').eq('is_published',true).order('display_order',{ascending:true}).limit(100))
      .then(data=>{state.courses=data;renderCourses()})
  );
  tasks.push(
    safeLoad('announcements',sb.from('announcements').select('id,title,message,priority,published_at,created_at').eq('is_published',true).order('published_at',{ascending:false}).limit(50))
      .then(data=>{state.news=data;renderNews()})
  );
  await Promise.allSettled(tasks);
}
function safeMentorRender(name,fn){
  try{fn()}
  catch(e){
    console.error('[24K Mentor render]',name,e);
    if(name==='signals'){
      const box=$('#mentorSignals');
      if(box)box.innerHTML='<div class="mentor-signal-empty"><span><i class="fa-solid fa-rotate"></i></span><b>Signals are refreshing</b><small>Please tap refresh once.</small></div>'
    }
  }
}
async function load(){
  if(!await requireMentor())return;
  revealMentorApp();
  render();
  void loadSecondaryMentorData();
}
function render(){
  const name=state.profile?.full_name||'Mentor';
  const mentorName=$('#mentorName');if(mentorName)mentorName.textContent=name;
  const enabled=Object.entries(state.perms).filter(x=>x[1]).map(x=>x[0][0].toUpperCase()+x[0].slice(1));
  const access=$('#mentorAccessSummary');if(access)access.textContent=enabled.length?enabled.join(' · '):'Read-only content';
  $$('[data-perm]').forEach(x=>x.classList.toggle('hidden',!state.perms[x.dataset.perm]));
  safeMentorRender('performance',renderPerformance);
  safeMentorRender('signals',renderSignals);
  safeMentorRender('charts',renderCharts);
  safeMentorRender('articles',renderArticles);
  safeMentorRender('banners',renderBanners);
  safeMentorRender('courses',renderCourses);
  safeMentorRender('news',renderNews);
  safeMentorRender('settings',renderSettings)
}
function mentorOutcomePips(signal,price,outcome='manual'){
  const p=Number(price),a=Number(signal?.entry_from),b=signal?.entry_to==null||signal?.entry_to===''?a:Number(signal.entry_to);
  if(!Number.isFinite(p)||!Number.isFinite(a)||!Number.isFinite(b))return null;
  const entry=(a+b)/2,pip=mentorPipSize(signal?.symbol),distance=Math.abs(p-entry)/pip;
  if(outcome==='be')return 0;
  if(outcome==='sl')return Math.round(-distance*10)/10;
  if(outcome==='tp')return Math.round(distance*10)/10;
  const dir=String(signal?.direction||'BUY').toUpperCase();
  const result=(dir==='SELL'?entry-p:p-entry)/pip;
  return Math.round(result*10)/10
}
function signalPips(s){
  const st=String(s?.status||'');
  let derived=null;
  if(st==='tp1_hit')derived=mentorOutcomePips(s,s.take_profit_1,'tp');
  else if(st==='tp2_hit')derived=mentorOutcomePips(s,s.take_profit_2,'tp');
  else if(st==='tp3_hit')derived=mentorOutcomePips(s,s.take_profit_3,'tp');
  else if(st==='tp4_hit')derived=mentorOutcomePips(s,s.take_profit_4,'tp');
  else if(st==='sl_hit')derived=mentorOutcomePips(s,s.stop_loss,'sl');
  else if(st==='breakeven_hit')derived=0;
  else if(st==='manually_closed'&&s.close_price!=null)derived=mentorOutcomePips(s,s.close_price,'manual');
  if(derived!==null&&Number.isFinite(Number(derived)))return Number(derived);
  const x=Number(s.result_pips);return Number.isFinite(x)?x:0
}
function mentorSignalPerformanceDate(s){
  const raw=s?.closed_at||s?.last_status_at||s?.updated_at||s?.created_at;
  const d=new Date(raw||0);
  return Number.isNaN(d.getTime())?new Date(0):d
}
function performanceMonthKey(d){
  const x=d instanceof Date?d:new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`
}
function performanceMonthDate(key){
  const [y,m]=String(key||'').split('-').map(Number);
  return new Date(y||new Date().getFullYear(),Math.max(0,(m||1)-1),1)
}
function performanceMonthLabel(key){
  return performanceMonthDate(key).toLocaleDateString(undefined,{month:'long',year:'numeric'})
}
function setPerformanceMonth(key){
  if(!key)return;
  state.performanceMonth=key;
  renderPerformance()
}
function shiftPerformanceMonth(delta){
  const keys=state.performanceMonthKeys||[];
  if(!keys.length)return;
  const current=state.performanceMonth||keys[keys.length-1];
  const index=Math.max(0,keys.indexOf(current));
  const next=Math.min(keys.length-1,Math.max(0,index+delta));
  if(keys[next]!==current)setPerformanceMonth(keys[next])
}
function mentorHasRecordedPerformance(s){
  const st=String(s?.status||'').toLowerCase();
  if(st==='cancelled')return false;
  if(s?.result_pips!==null&&s?.result_pips!==undefined&&s?.result_pips!=='')return true;
  return /^tp[1-4]_hit$/.test(st)||st==='sl_hit'||st==='breakeven_hit'||(st==='manually_closed'&&s?.close_price!=null)
}
function mentorResolvedForPerformance(s){
  return signalIsClosed(s)&&mentorHasRecordedPerformance(s)
}
function renderPerformance(){
  const all=state.signals||[],now=new Date(),currentKey=performanceMonthKey(now);

  // Build a continuous month range from the earliest Mentor signal through the current month.
  const validDates=all.map(mentorSignalPerformanceDate).filter(d=>d.getTime()>0&&d<=now);
  let earliest=validDates.length?new Date(Math.min(...validDates.map(d=>d.getTime()))):new Date(now.getFullYear(),now.getMonth(),1);
  earliest=new Date(earliest.getFullYear(),earliest.getMonth(),1);
  const currentStart=new Date(now.getFullYear(),now.getMonth(),1);
  const keys=[];
  let cursor=new Date(earliest);
  let guard=0;
  while(cursor<=currentStart&&guard<120){
    keys.push(performanceMonthKey(cursor));
    cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
    guard++
  }
  if(!keys.includes(currentKey))keys.push(currentKey);
  state.performanceMonthKeys=keys;
  if(!state.performanceMonth||!keys.includes(state.performanceMonth))state.performanceMonth=currentKey;
  const selectedKey=state.performanceMonth;
  const start=performanceMonthDate(selectedKey),end=new Date(start.getFullYear(),start.getMonth()+1,1);
  const previousStart=new Date(start.getFullYear(),start.getMonth()-1,1),previousEnd=start;
  const monthLabel=performanceMonthLabel(selectedKey);
  const previousLabel=previousStart.toLocaleDateString(undefined,{month:'short'});
  const monthAll=all.filter(s=>{const d=mentorSignalPerformanceDate(s);return d>=start&&d<end});
  const previousAll=all.filter(s=>{const d=mentorSignalPerformanceDate(s);return d>=previousStart&&d<previousEnd});

  // Month selector + navigation state.
  const select=$('#mentorMonthSelect');
  if(select){
    const options=[...keys].reverse().map(k=>`<option value="${k}" ${k===selectedKey?'selected':''}>${esc(performanceMonthLabel(k))}</option>`).join('');
    if(select.innerHTML!==options)select.innerHTML=options;
    select.value=selectedKey;
  }
  const index=keys.indexOf(selectedKey),prevBtn=$('#mentorMonthPrev'),nextBtn=$('#mentorMonthNext'),thisBtn=$('#mentorThisMonth');
  if(prevBtn)prevBtn.disabled=index<=0;
  if(nextBtn)nextBtn.disabled=index>=keys.length-1;
  if(thisBtn)thisBtn.classList.toggle('active',selectedKey===currentKey);
  const range=$('#mentorPeriodRange');
  if(range){
    const lastDay=new Date(end.getTime()-1);
    range.textContent=`${start.toLocaleDateString(undefined,{day:'2-digit',month:'short'})} — ${lastDay.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}`
  }
  const periodTitle=$('#mentorPerformancePeriodTitle');if(periodTitle)periodTitle.textContent=monthLabel;
  const periodSubtitle=$('#mentorPerformancePeriodSubtitle');if(periodSubtitle)periodSubtitle.textContent='Selected month execution, results and market activity.';
  const momentumLabel=$('#mentorMomentumLabel');if(momentumLabel)momentumLabel.textContent=`${monthLabel} · Daily P/L`;
  const executionLabel=$('#mentorExecutionLabel');if(executionLabel)executionLabel.textContent=`${monthLabel} · Closed signals`;
  const marketLabel=$('#mentorMarketFocusLabel');if(marketLabel)marketLabel.textContent=monthLabel;
  const feedLabel=$('#mentorExecutionFeedLabel');if(feedLabel)feedLabel.textContent=`${monthLabel} activity`;

  const recorded=monthAll.filter(mentorHasRecordedPerformance),
    resolved=monthAll.filter(mentorResolvedForPerformance),
    net=recorded.reduce((a,s)=>a+signalPips(s),0),
    green=recorded.reduce((a,s)=>a+Math.max(0,signalPips(s)),0),
    red=recorded.reduce((a,s)=>a+Math.min(0,signalPips(s)),0),
    wins=resolved.filter(s=>signalPips(s)>0).length,
    losses=resolved.filter(s=>signalPips(s)<0).length,
    be=resolved.filter(s=>signalPips(s)===0).length,
    wr=resolved.length?wins/resolved.length*100:0,
    previousRecorded=previousAll.filter(mentorHasRecordedPerformance),
    previousNet=previousRecorded.reduce((a,s)=>a+signalPips(s),0),
    monthDelta=net-previousNet;

  const hero=$('#mentorHeroNetPips');if(hero)hero.textContent=`${net>=0?'+':''}${money(net)} pips`;
  const note=$('#mentorPerformancePeriodNote');if(note)note.textContent=`${monthLabel} net performance`;
  const compare=$('#mentorMonthComparison');
  if(compare){
    compare.textContent=previousRecorded.length?`${monthDelta>=0?'+':''}${money(monthDelta)} pips vs ${previousLabel}`:`No recorded performance in ${previousLabel}`;
    compare.className=monthDelta>0?'good':monthDelta<0?'bad':'neutral'
  }
  const updated=$('#mentorPerformanceUpdated');if(updated)updated.textContent=`Updated ${now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}`;

  const metrics=[
    {label:'MONTHLY NET PIPS',display:`${net>=0?'+':''}${money(net)}`,icon:'fa-chart-line',tone:'primary',hint:monthLabel},
    {label:'WINNING PIPS',display:`+${money(green)}`,icon:'fa-arrow-trend-up',tone:'good',hint:'Positive closed results'},
    {label:'LOSING PIPS',display:money(red),icon:'fa-arrow-trend-down',tone:'bad',hint:'Negative closed results'},
    {label:'WIN RATE',display:`${wr.toFixed(0)}%`,icon:'fa-bullseye',tone:wr>=50?'good':'gold',hint:`${wins} wins · ${losses} losses`},
    {label:'CLOSED SIGNALS',display:String(resolved.length),icon:'fa-circle-check',tone:'gold',hint:`${be} breakeven`}
  ];
  const kpis=$('#mentorPerformanceKpis');
  if(kpis){
    kpis.innerHTML=metrics.map(m=>`<article class="mrzero-metric ${m.tone}"><div class="mrzero-metric-head"><span>${m.label}</span><i class="fa-solid ${m.icon}"></i></div><b>${m.display}</b><small>${esc(m.hint)}</small></article>`).join('');
    kpis.scrollLeft=0;
  }

  const quality=resolved.map(signalPips),
    avg=quality.length?quality.reduce((a,b)=>a+b,0)/quality.length:0,
    best=quality.length?Math.max(...quality):0,
    worst=quality.length?Math.min(...quality):0,
    activeCount=monthAll.filter(s=>!signalIsClosed(s)).length;
  const avgEl=$('#mentorAvgPips'),bestEl=$('#mentorBestPips'),worstEl=$('#mentorWorstPips'),activeEl=$('#mentorActivePerformance');
  if(avgEl)avgEl.textContent=`${avg>=0?'+':''}${money(avg)} pips`;
  if(bestEl)bestEl.textContent=`${best>=0?'+':''}${money(best)} pips`;
  if(worstEl)worstEl.textContent=`${worst>=0?'+':''}${money(worst)} pips`;
  if(activeEl)activeEl.textContent=activeCount;

  // Full selected-month daily P/L momentum.
  const daysInMonth=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();
  const days=[...Array(daysInMonth)].map((_,i)=>{
    const d=new Date(start.getFullYear(),start.getMonth(),i+1),dayEnd=new Date(start.getFullYear(),start.getMonth(),i+2);
    const daySignals=recorded.filter(s=>{const x=mentorSignalPerformanceDate(s);return x>=d&&x<dayEnd});
    const pips=daySignals.reduce((sum,s)=>sum+signalPips(s),0);
    return{d,count:daySignals.length,pips}
  }),maxAbs=Math.max(1,...days.map(x=>Math.abs(x.pips)));
  const momentum=$('#mentorSignalBars');
  if(momentum){
    momentum.style.setProperty('--days',String(daysInMonth));
    momentum.innerHTML=days.map((x,index)=>{
      const tone=x.pips>0?'positive':x.pips<0?'negative':'zero';
      const height=Math.max(3,Math.abs(x.pips)/maxAbs*43);
      const signed=`${x.pips>=0?'+':''}${money(x.pips)} pips`;
      const latest=selectedKey===currentKey&&x.d.getDate()===now.getDate();
      return `<div class="mrzero-momentum-col ${tone} ${latest?'is-latest':''}" style="--i:${index}" title="${esc(signed)} · ${x.count} closed signal${x.count===1?'':'s'}"><i style="height:${height}%"></i><small>${x.d.getDate()}</small></div>`
    }).join('');
    momentum.scrollLeft=0;
  }

  $('#mentorWinRate').innerHTML=`<div class="mrzero-score-ring" style="--pct:${wr.toFixed(1)}"><div><b>${wr.toFixed(0)}%</b><small>WIN RATE</small></div></div><div class="mrzero-win-stats"><div class="mrzero-win-stat"><span>Wins</span><b>${wins}</b></div><div class="mrzero-win-stat"><span>Losses</span><b>${losses}</b></div><div class="mrzero-win-stat"><span>Breakeven</span><b>${be}</b></div><div class="mrzero-win-stat"><span>Resolved</span><b>${resolved.length}</b></div></div>`;

  const pairs={};monthAll.forEach(s=>{const k=mentorDisplaySymbol(s.symbol);pairs[k]=(pairs[k]||0)+1});
  const ps=Object.entries(pairs).sort((a,b)=>b[1]-a[1]).slice(0,3),pmax=Math.max(1,...ps.map(x=>x[1]));
  const totalPairSignals=ps.reduce((sum,[,count])=>sum+count,0)||1;
  $('#mentorTopPairs').innerHTML=ps.length?ps.map(([pair,count],rank)=>{
    const pct=Math.round(count/totalPairSignals*100);
    return `<div class="mrzero-market-row"><b><span class="mrzero-market-rank">0${rank+1}</span>${esc(pair)}</b><div class="mrzero-market-track"><i style="width:${Math.max(8,count/pmax*100)}%"></i></div><small>${pct}% · ${count} signal${count===1?'':'s'}</small></div>`
  }).join(''):`<div class="mentor-empty">No market activity in ${esc(monthLabel)}.</div>`;

  const recent=[...monthAll].sort((a,b)=>mentorSignalPerformanceDate(b)-mentorSignalPerformanceDate(a)).slice(0,3);
  $('#mentorRecentActivity').innerHTML=recent.length?recent.map(s=>{
    const status=signalStatusLabel(s.status),p=signalPips(s),stamp=mentorSignalStamp(s.last_status_at||s.closed_at||s.updated_at||s.created_at);
    const statusKey=String(s.status||'').toLowerCase(),statusTone=/tp\d*_hit|closed|manually_closed/.test(statusKey)?'good':statusKey==='sl_hit'?'bad':/cancelled|breakeven/.test(statusKey)?'neutral':'gold';
    const pipTone=p>0?'good':p<0?'bad':'neutral';
    return `<div class="mrzero-activity-item"><div class="mrzero-activity-icon"><i class="fa-solid ${signalIsClosed(s)?'fa-circle-check':'fa-bolt'}"></i></div><div class="mrzero-activity-copy"><b>${esc(mentorDisplaySymbol(s.symbol))} · ${esc(signalTypeLabel(s))}</b><div class="mrzero-activity-meta"><small>${esc(stamp.date)} · ${esc(stamp.time)}</small>${mentorHasRecordedPerformance(s)?`<span class="mrzero-pips-badge ${pipTone}">${pipText(p)}</span>`:''}</div></div><span class="mrzero-activity-status ${statusTone}">${esc(status)}</span></div>`
  }).join()+`<button type="button" class="mrzero-feed-all" data-mentor-view="signals"><span>View full ${esc(monthLabel)} activity</span><i class="fa-solid fa-arrow-right"></i></button>`:`<div class="mentor-empty">No signal activity in ${esc(monthLabel)}.</div>`
}
function statusChip(v){
  const key=String(v||'active').toLowerCase(),label=signalStatusLabel(key);
  const tone=/^tp[1-4]_hit$|manually_closed|closed/.test(key)?'good':key==='sl_hit'?'bad':key==='breakeven_hit'?'neutral':key==='cancelled'?'muted':key==='pending'?'pending':'live';
  return `<span class="mentor-status-badge ${tone}"><i></i>${esc(label)}</span>`
}
function signalTypeLabel(s){const d=String(s?.direction||'BUY').toUpperCase(),o=String(s?.order_type||'market').toLowerCase();return o==='market'?d:`${d} ${o.toUpperCase()}`}
function signalStatusLabel(v){return String(v||'active').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}
function signalDateOnly(v){const d=new Date(v||0);if(Number.isNaN(d.getTime()))return'';return d.toISOString().slice(0,10)}function mentorDisplaySymbol(v){const s=String(v||'').replace('/','').toUpperCase();return s.length===6?s.slice(0,3)+'/'+s.slice(3):s}function mentorSignalStamp(v){const d=new Date(v||0);if(Number.isNaN(d.getTime()))return{date:'—',time:'—'};return{date:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),time:d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}}
function syncSignalFilterOptions(){const pairs=[...new Set((state.signals||[]).map(x=>String(x.symbol||'').toUpperCase()).filter(Boolean))].sort();for(const id of ['mentorSignalPairFilter','mentorMobileSignalPair']){const el=$('#'+id);if(!el)continue;const current=el.value||'all',allLabel=id==='mentorSignalPairFilter'?'Pair':'All Pairs';el.innerHTML=`<option value="all">${allLabel}</option>`+pairs.map(x=>`<option value="${esc(x)}">${esc(mentorDisplaySymbol(x))}</option>`).join('');el.value=pairs.includes(current)?current:'all'}}
function readSignalFilters(){state.signalFilters.q=String($('#mentorSignalSearch')?.value||'').trim().toLowerCase();state.signalFilters.pair=$('#mentorSignalPairFilter')?.value||'all';state.signalFilters.type=$('#mentorSignalTypeFilter')?.value||'all';state.signalFilters.status=$('#mentorSignalStatusFilter')?.value||'all';state.signalFilters.from=$('#mentorSignalFrom')?.value||'';state.signalFilters.to=$('#mentorSignalTo')?.value||''}
function applySignalFilters(items){const f=state.signalFilters;return items.filter(s=>{const hay=`${s.symbol||''} ${signalTypeLabel(s)} ${s.status||''} ${s.notes||''}`.toLowerCase();if(f.q&&!hay.includes(f.q))return false;if(f.pair!=='all'&&String(s.symbol||'').toUpperCase()!==f.pair)return false;if(f.type!=='all'&&signalTypeLabel(s)!==f.type)return false;if(f.status!=='all'&&String(s.status||'')!==f.status)return false;const d=signalDateOnly(s.created_at||s.published_at);if(f.from&&d&&d<f.from)return false;if(f.to&&d&&d>f.to)return false;return true})}
function signalFilterDateValue(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function syncSignalPeriodButtons(){
  const pair=$('#mentorSignalPairFilter')?.value||'all',
    type=$('#mentorSignalTypeFilter')?.value||'all',
    status=$('#mentorSignalStatusFilter')?.value||'all';
  const extraActive=pair!=='all'||type!=='all'||status!=='all';
  $$('[data-signal-period]').forEach(x=>{
    const key=x.dataset.signalPeriod;
    const active=key==='all'?(state.signalPeriod==='all'&&!extraActive):(key===state.signalPeriod);
    x.classList.toggle('active',active)
  });
  for(const id of ['mentorSignalPairFilter','mentorSignalTypeFilter','mentorSignalStatusFilter']){
    const el=$('#'+id);
    if(el)el.closest('.mentor-signal-quick-select')?.classList.toggle('is-active',el.value!=='all')
  }
}
function focusFilteredSignalResults(){
  requestAnimationFrame(()=>$('#mentorSignals')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function toggleSignalCustomDate(force){
  const panel=$('#mentorSignalCustomDate');if(!panel)return;
  const show=force===undefined?panel.hidden:!!force;
  panel.hidden=!show;
}
function setSignalPeriod(period){
  const now=new Date(),from=$('#mentorSignalFrom'),to=$('#mentorSignalTo');
  state.signalPeriod=period;
  if(period==='custom'){
    syncSignalPeriodButtons();
    toggleSignalCustomDate(true);
    return
  }
  toggleSignalCustomDate(false);
  let start='',end='';
  if(period==='all'){
    for(const id of ['mentorSignalSearch','mentorSignalFrom','mentorSignalTo','mentorMobileSignalFrom','mentorMobileSignalTo']){const el=$('#'+id);if(el)el.value=''}
    for(const id of ['mentorSignalPairFilter','mentorSignalTypeFilter','mentorSignalStatusFilter','mentorMobileSignalPair','mentorMobileSignalType','mentorMobileSignalStatus']){const el=$('#'+id);if(el)el.value='all'}
    state.signalFilters={q:'',pair:'all',type:'all',status:'all',from:'',to:''}
  }
  if(period==='daily'){start=signalFilterDateValue(now);end=start}
  if(period==='weekly'){const d=new Date(now);d.setDate(d.getDate()-6);start=signalFilterDateValue(d);end=signalFilterDateValue(now)}
  if(period==='monthly'){start=signalFilterDateValue(new Date(now.getFullYear(),now.getMonth(),1));end=signalFilterDateValue(now)}
  if(period!=='all'){
    if(from)from.value=start;if(to)to.value=end;
    const mf=$('#mentorMobileSignalFrom'),mt=$('#mentorMobileSignalTo');if(mf)mf.value=start;if(mt)mt.value=end
  }
  syncSignalPeriodButtons();renderSignals();focusFilteredSignalResults()
}

function mentorSafeSignalPips(s){
  try{const v=signalPips(s);return Number.isFinite(Number(v))?Number(v):0}
  catch(e){console.warn('[24K Signal pips]',e);const v=Number(s?.result_pips);return Number.isFinite(v)?v:0}
}
function mentorSafeHasPerformance(s){
  try{return mentorHasRecordedPerformance(s)}
  catch(e){console.warn('[24K Signal performance]',e);return s?.result_pips!==null&&s?.result_pips!==undefined&&s?.result_pips!==''}
}
function signalActionButtons(s){
  if(signalIsClosed(s))return '';
  const hit=Number(s.tp_hit||0),parts=[];
  if(s.take_profit_1!=null&&hit<1)parts.push(`<button class="mentor-btn small" data-signal-action="tp1_hit" data-id="${s.id}">TP1</button>`);
  if(s.take_profit_2!=null&&hit<2)parts.push(`<button class="mentor-btn small" data-signal-action="tp2_hit" data-id="${s.id}">TP2</button>`);
  if(s.take_profit_3!=null&&hit<3)parts.push(`<button class="mentor-btn small" data-signal-action="tp3_hit" data-id="${s.id}">TP3</button>`);
  if(s.take_profit_4!=null&&hit<4)parts.push(`<button class="mentor-btn small" data-signal-action="tp4_hit" data-id="${s.id}">TP4</button>`);
  if(!s.be_moved)parts.push(`<button class="mentor-btn small" data-signal-action="move_to_be" data-id="${s.id}">Move BE</button>`);
  parts.push(`<button class="mentor-btn small" data-signal-action="breakeven_hit" data-id="${s.id}">BE</button>`,`<button class="mentor-btn small danger" data-signal-action="sl_hit" data-id="${s.id}">SL</button>`,`<button class="mentor-btn small" data-signal-action="manually_closed" data-id="${s.id}">Close</button>`,`<button class="mentor-btn small danger" data-signal-action="cancelled" data-id="${s.id}">Cancel</button>`);
  return parts.join('')
}
function renderSignalDetail(id){
  const s=(state.signals||[]).find(x=>String(x.id)===String(id)),box=$('#mentorSignalDetailContent');if(!s||!box)return;
  const p=mentorSafeSignalPips(s),hasPips=mentorSafeHasPerformance(s),current=hasPips?pipText(p):'—';
  const pTone=p>0?'good':p<0?'bad':'neutral';
  const dir=String(s.direction||'BUY').toLowerCase(),isClosed=signalIsClosed(s);
  const created=mentorSignalStamp(s.created_at||s.published_at),updated=mentorSignalStamp(s.last_status_at||s.closed_at||s.updated_at||s.created_at);
  const level=(label,value,tone='',icon='')=>`<div class="mentor-manage-level ${tone}"><span>${icon?`<i class="fa-solid ${icon}"></i>`:''}<small>${label}</small></span><b>${esc(value??'—')}</b></div>`;

  const tpActions=[
    s.take_profit_1!=null&&Number(s.tp_hit||0)<1?`<button class="mentor-manage-action tp" data-signal-action="tp1_hit" data-id="${s.id}"><i class="fa-solid fa-check"></i><span>TP1 Hit</span></button>`:'',
    s.take_profit_2!=null&&Number(s.tp_hit||0)<2?`<button class="mentor-manage-action tp" data-signal-action="tp2_hit" data-id="${s.id}"><i class="fa-solid fa-check"></i><span>TP2 Hit</span></button>`:'',
    s.take_profit_3!=null&&Number(s.tp_hit||0)<3?`<button class="mentor-manage-action tp" data-signal-action="tp3_hit" data-id="${s.id}"><i class="fa-solid fa-check"></i><span>TP3 Hit</span></button>`:'',
    s.take_profit_4!=null&&Number(s.tp_hit||0)<4?`<button class="mentor-manage-action tp" data-signal-action="tp4_hit" data-id="${s.id}"><i class="fa-solid fa-check"></i><span>TP4 Hit</span></button>`:''
  ].filter(Boolean).join('');

  const protectionActions=!isClosed?[
    !s.be_moved?`<button class="mentor-manage-action be" data-signal-action="move_to_be" data-id="${s.id}"><i class="fa-solid fa-shield-halved"></i><span>SL → BE</span></button>`:'',
    `<button class="mentor-manage-action be-hit" data-signal-action="breakeven_hit" data-id="${s.id}"><i class="fa-solid fa-scale-balanced"></i><span>BE Hit</span></button>`,
    `<button class="mentor-manage-action edit" data-edit-signal="${s.id}"><i class="fa-solid fa-pen"></i><span>Edit</span></button>`
  ].filter(Boolean).join(''):`<button class="mentor-manage-action edit wide" data-edit-signal="${s.id}"><i class="fa-solid fa-pen"></i><span>Edit Signal</span></button>`;

  const closeActions=!isClosed?[
    `<button class="mentor-manage-action close" data-signal-action="manually_closed" data-id="${s.id}"><i class="fa-solid fa-flag-checkered"></i><span>Close</span></button>`,
    `<button class="mentor-manage-action sl" data-signal-action="sl_hit" data-id="${s.id}"><i class="fa-solid fa-shield"></i><span>SL Hit</span></button>`,
    `<button class="mentor-manage-action cancel" data-signal-action="cancelled" data-id="${s.id}"><i class="fa-solid fa-ban"></i><span>Cancel</span></button>`
  ].join(''):'';

  box.innerHTML=`<section class="mentor-manage-signal premium">
    <div class="mentor-manage-hero ${dir}">
      <div class="mentor-manage-hero-main">
        <span class="mentor-manage-pair-icon ${dir}"><i class="fa-solid ${dir==='sell'?'fa-arrow-trend-down':'fa-arrow-trend-up'}"></i></span>
        <div>
          <small>TRADE SIGNAL</small>
          <h3>${esc(mentorDisplaySymbol(s.symbol))}</h3>
          <div class="mentor-manage-badges"><span class="mentor-type-badge ${dir}">${esc(signalTypeLabel(s))}</span>${statusChip(s.status)}</div>
        </div>
      </div>
      <div class="mentor-manage-hero-result ${pTone}">
        <small>${isClosed?'OFFICIAL RESULT':'RUNNING / RECORDED'}</small>
        <b>${current}</b>
        <span>${isClosed?'Final signal outcome':'Current recorded performance'}</span>
      </div>
      <div class="mentor-manage-timeline">
        <span><i class="fa-regular fa-clock"></i><small>Created</small><b>${esc(created.date)} · ${esc(created.time)}</b></span>
        <span><i class="fa-solid fa-rotate"></i><small>Last update</small><b>${esc(updated.date)} · ${esc(updated.time)}</b></span>
      </div>
    </div>

    <div class="mentor-manage-section">
      <div class="mentor-manage-section-head"><div><span class="num">01</span><div><small>TRADE LEVELS</small><b>Entry & Targets</b></div></div><span>Execution map</span></div>
      <div class="mentor-manage-levels premium-levels">
        ${level('Entry',s.entry_from,'entry','fa-location-crosshairs')}
        ${level('Stop Loss',s.stop_loss,'sl','fa-shield-halved')}
        ${level('TP1',s.take_profit_1,'tp','fa-bullseye')}
        ${level('TP2',s.take_profit_2,'tp','fa-bullseye')}
        ${level('TP3',s.take_profit_3,'tp','fa-bullseye')}
        ${level('TP4',s.take_profit_4,'tp','fa-bullseye')}
      </div>
    </div>

    ${!isClosed&&tpActions?`<div class="mentor-manage-action-group">
      <div class="mentor-manage-section-head compact"><div><span class="num">02</span><div><small>PROFIT MANAGEMENT</small><b>Take Profit Actions</b></div></div></div>
      <div class="mentor-manage-actions tp-group">${tpActions}</div>
    </div>`:''}

    <div class="mentor-manage-action-group">
      <div class="mentor-manage-section-head compact"><div><span class="num">${!isClosed&&tpActions?'03':'02'}</span><div><small>RISK CONTROL</small><b>${isClosed?'Signal Controls':'Protection & Adjustment'}</b></div></div></div>
      <div class="mentor-manage-actions protection-group">${protectionActions}</div>
    </div>

    ${closeActions?`<div class="mentor-manage-action-group danger-zone">
      <div class="mentor-manage-section-head compact"><div><span class="num">04</span><div><small>FINAL OUTCOME</small><b>Close Signal</b></div></div><span>Use carefully</span></div>
      <div class="mentor-manage-actions close-group">${closeActions}</div>
    </div>`:''}

    <div class="mentor-manage-note-result">
      <div class="mentor-signal-note premium-note">
        <div class="mentor-note-head"><span><i class="fa-regular fa-note-sticky"></i></span><div><small>SIGNAL NOTE</small><b>Trade Guidance</b></div></div>
        <p>${s.notes?esc(s.notes):'No note added for this signal.'}</p>
      </div>
      <div class="mentor-running-pips premium-result ${pTone}">
        <div class="mentor-result-head"><span><i class="fa-solid fa-chart-line"></i></span><div><small>RUNNING / RESULT PIPS</small><b>${current}</b></div></div>
        <p>${isClosed?'Official result recorded for this signal.':'Use the management actions above to record the official result.'}</p>
      </div>
    </div>
  </section>`;
  openModal('signalDetail')
}
function renderSignals(){
  const box=$('#mentorSignals');if(!box)return;
  syncSignalFilterOptions();readSignalFilters();
  const all=state.signals||[],filteredAll=applySignalFilters(all),active=filteredAll.filter(s=>!signalIsClosed(s)),hist=filteredAll.filter(signalIsClosed);
  const ac=$('#mentorActiveSignalCount'),hc=$('#mentorHistorySignalCount');
  if(ac)ac.textContent=String(active.length);if(hc)hc.textContent=String(hist.length);
  syncSignalPeriodButtons();

  const scored=hist.filter(s=>String(s.status||'')!=='cancelled'&&mentorSafeHasPerformance(s)),
    wins=scored.filter(s=>mentorSafeSignalPips(s)>0).length,
    losses=scored.filter(s=>mentorSafeSignalPips(s)<0).length,
    winRate=scored.length?wins/scored.length*100:0,
    net=filteredAll.filter(mentorSafeHasPerformance).reduce((a,s)=>a+mentorSafeSignalPips(s),0);
  const statActive=$('#mentorSignalStatActive'),statClosed=$('#mentorSignalStatClosed'),statWin=$('#mentorSignalStatWinRate'),statNet=$('#mentorSignalStatNet');
  if(statActive)statActive.textContent=String(active.length);
  if(statClosed)statClosed.textContent=String(hist.length);
  if(statWin)statWin.textContent=`${winRate.toFixed(0)}%`;
  if(statNet){statNet.textContent=`${net>=0?'+':''}${money(net)}`;statNet.className=net>0?'good':net<0?'bad':''}

  let items=state.signalTab==='history'?hist:active;
  const meta=$('#mentorSignalViewMeta');
  if(meta)meta.textContent=state.signalTab==='history'?`${items.length} history record${items.length===1?'':'s'} shown`:state.signalTab==='report'?'Performance summary':`${items.length} active / pending signal${items.length===1?'':'s'} shown`;

  $('#mentorSignalReport')?.classList.toggle('hidden',state.signalTab!=='report');
  box.classList.toggle('hidden',state.signalTab==='report');

  if(state.signalTab==='report'){
    const be=scored.filter(s=>mentorSafeSignalPips(s)===0).length;
    const avg=scored.length?scored.reduce((a,s)=>a+mentorSafeSignalPips(s),0)/scored.length:0;
    const report=[
      {label:'FILTERED SIGNALS',value:filteredAll.length,icon:'fa-layer-group',tone:'gold',hint:state.signalPeriod==='all'?'All published records':state.signalPeriod+' period'},
      {label:'RESOLVED',value:scored.length,icon:'fa-circle-check',tone:'neutral',hint:`${wins} wins - ${losses} losses - ${be} BE`},
      {label:'WIN RATE',value:`${winRate.toFixed(0)}%`,icon:'fa-bullseye',tone:'good',hint:'Resolved outcomes'},
      {label:'NET PIPS',value:`${net>=0?'+':''}${money(net)}`,icon:'fa-chart-line',tone:net>=0?'good':'bad',hint:`Avg ${avg>=0?'+':''}${money(avg)} pips`}
    ];
    $('#mentorSignalReport').innerHTML=report.map(r=>`<article class="mentor-signal-report-card ${r.tone}"><span><i class="fa-solid ${r.icon}"></i></span><div><small>${r.label}</small><b>${r.value}</b><em>${esc(r.hint)}</em></div></article>`).join('');
    return
  }

  if(!items.length){
    box.innerHTML=`<div class="mentor-signal-empty"><span><i class="fa-solid fa-wave-square"></i></span><b>No signals found</b><small>No records match the current filters.</small>${state.signalTab==='active'?'<button class="mentor-btn gold" data-open-mentor-modal="signal"><i class="fa-solid fa-plus"></i> Create Signal</button>':''}</div>`;
    return
  }

  const desktop=`<div class="mentor-signal-table-wrap"><table class="mentor-signal-table mentor-official-table"><thead><tr><th>Date</th><th>Pair</th><th>Type</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>TP4</th><th>Status</th><th>Pips</th><th>Note</th><th>Manage</th></tr></thead><tbody>${items.map(s=>{
    const p=mentorSafeSignalPips(s),hasPips=mentorSafeHasPerformance(s),dir=String(s.direction||'BUY').toLowerCase(),stamp=mentorSignalStamp(s.created_at||s.published_at);
    return `<tr class="mentor-signal-row ${dir}">
      <td><b>${esc(stamp.date)}</b><small class="mentor-table-time">${esc(stamp.time)}</small></td>
      <td><b class="mentor-signal-pair">${esc(mentorDisplaySymbol(s.symbol))}</b></td>
      <td><span class="mentor-type-badge ${dir}">${esc(signalTypeLabel(s))}</span></td>
      <td><b class="mentor-entry-value">${esc(s.entry_from??'-')}${s.entry_to!=null?`-${esc(s.entry_to)}`:''}</b></td>
      <td class="signal-sl">${esc(s.stop_loss??'-')}</td>
      <td class="signal-tp">${esc(s.take_profit_1??'-')}</td><td class="signal-tp">${esc(s.take_profit_2??'-')}</td><td class="signal-tp">${esc(s.take_profit_3??'-')}</td><td class="signal-tp">${esc(s.take_profit_4??'-')}</td>
      <td>${statusChip(s.status)}</td>
      <td><span class="mentor-pips-chip ${p>0?'good':p<0?'bad':'neutral'}">${hasPips?pipText(p):'-'}</span></td>
      <td><button type="button" class="mentor-note-btn" data-note-signal="${s.id}" title="${esc(s.notes||'No note')}"><i class="fa-regular fa-note-sticky"></i><span>Note</span></button></td>
      <td><div class="mentor-manage-buttons"><button type="button" data-copy-signal="${s.id}" title="Copy signal"><i class="fa-regular fa-copy"></i></button><button type="button" class="gold" data-view-signal="${s.id}">${signalIsClosed(s)?'View':'Manage'}</button></div></td>
    </tr>`
  }).join('')}</tbody></table></div>`;

  const mobile=`<div class="mentor-signal-mobile-list">${items.map(s=>{
    const p=mentorSafeSignalPips(s),hasPips=mentorSafeHasPerformance(s),dir=String(s.direction||'BUY').toLowerCase(),stamp=mentorSignalStamp(s.created_at||s.published_at);
    const resultText=hasPips?pipText(p):(signalIsClosed(s)?'-':'LIVE');
    return `<article class="mentor-signal-mobile-card ${dir}" data-signal-row="${s.id}">
      <div class="mentor-signal-row-line">
        <button type="button" class="mentor-signal-row-toggle" data-toggle-signal-row="${s.id}" aria-expanded="false">
          <span class="mentor-signal-icon mini ${dir}"><i class="fa-solid ${dir==='sell'?'fa-arrow-trend-down':'fa-arrow-trend-up'}"></i></span>
          <span class="mentor-signal-row-main"><b>${esc(mentorDisplaySymbol(s.symbol))}</b><small>${esc(stamp.date)} · ${esc(stamp.time)}</small></span>
          <span class="mentor-signal-row-type"><span class="mentor-type-badge ${dir}">${esc(signalTypeLabel(s))}</span></span>
          <span class="mentor-signal-row-entry"><small>ENTRY</small><b>${esc(s.entry_from??'-')}</b></span>
          <span class="mentor-signal-row-pips"><small>PIPS</small><b class="${p>0?'green':p<0?'red':''}">${resultText}</b></span>
          <i class="fa-solid fa-chevron-down mentor-signal-row-chevron"></i>
        </button>
        <button type="button" class="mentor-signal-inline-manage" data-view-signal="${s.id}">${signalIsClosed(s)?'View':'Manage'}</button>
      </div>
      <div class="mentor-signal-row-dropdown" aria-hidden="true">
        <div class="mentor-signal-row-meta">
          <span>${statusChip(s.status)}</span>
          <span><small>SL</small><b class="red">${esc(s.stop_loss??'-')}</b></span>
        </div>
        <div class="mentor-signal-row-levels">
          <span><small>TP1</small><b class="green">${esc(s.take_profit_1??'-')}</b></span>
          <span><small>TP2</small><b class="green">${esc(s.take_profit_2??'-')}</b></span>
          <span><small>TP3</small><b class="green">${esc(s.take_profit_3??'-')}</b></span>
          <span><small>TP4</small><b class="green">${esc(s.take_profit_4??'-')}</b></span>
        </div>
        <div class="mentor-signal-row-bottom">
          <span>${s.notes?'<i class="fa-regular fa-note-sticky"></i> Note added':'<i class="fa-solid fa-shield-halved"></i> 24K signal'}</span>
          <button type="button" class="mentor-row-copy" data-copy-signal="${s.id}"><i class="fa-regular fa-copy"></i> Copy</button>
        </div>
      </div>
    </article>`
  }).join('')}</div>`;

  box.innerHTML=desktop+mobile
}

function renderCharts(){const box=$('#mentorCharts');if(!box)return;let items=[...state.charts],q=String($('#mentorChartSearch')?.value||'').toLowerCase(),pair=$('#mentorChartPair')?.value||'all';if(q)items=items.filter(x=>`${x.title} ${x.symbol} ${x.summary}`.toLowerCase().includes(q));if(pair!=='all')items=items.filter(x=>x.symbol===pair);items.sort((a,b)=>(new Date(a.created_at)-new Date(b.created_at))*($('#mentorChartSort')?.value==='old'?1:-1));const pairs=[...new Set(state.charts.map(x=>x.symbol).filter(Boolean))].sort(),sel=$('#mentorChartPair');if(sel&&sel.options.length<=1)sel.insertAdjacentHTML('beforeend',pairs.map(x=>`<option>${esc(x)}</option>`).join(''));box.innerHTML=renderHistoryGroups(items,'chart')}
function renderArticles(){
  const box=$('#mentorArticles');if(!box)return;
  let items=[...state.articles],q=String($('#mentorArticleSearch')?.value||'').toLowerCase(),st=$('#mentorArticleStatus')?.value||'all',cat=$('#mentorArticleCategory')?.value||'all';
  const cats=[...new Set(state.articles.map(x=>String(x.category||'General')).filter(Boolean))].sort(),sel=$('#mentorArticleCategory');
  if(sel){const current=sel.value||'all';sel.innerHTML='<option value="all">All Categories</option>'+cats.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');sel.value=cats.includes(current)?current:'all'}
  if(q)items=items.filter(x=>`${x.title} ${x.excerpt} ${x.content}`.toLowerCase().includes(q));
  if(cat!=='all')items=items.filter(x=>String(x.category||'General')===cat);
  if(st==='published')items=items.filter(x=>x.is_published);if(st==='draft')items=items.filter(x=>!x.is_published);
  items.sort((a,b)=>(new Date(a.created_at)-new Date(b.created_at))*($('#mentorArticleSort')?.value==='old'?1:-1));
  box.innerHTML=renderHistoryGroups(items,'article')
}
function renderHistoryGroups(items,type){if(!items.length)return'<div class="mentor-empty">Nothing published yet.</div>';return Object.entries(byDate(items)).map(([d,rows])=>`<section class="mentor-date-group"><h3>${esc(d)}</h3><div class="mentor-history-cards">${rows.map(x=>type==='chart'?`<article class="mentor-history-card">${x.image_url?`<img src="${esc(x.image_url)}" alt="Chart">`:''}<div class="body"><div class="mentor-meta"><span class="mentor-chip gold">${esc(x.symbol||'CHART')}</span><span class="mentor-chip">${esc(x.timeframe||'')}</span><small>${esc(dt(x.published_at||x.created_at))}</small></div><h3>${esc(x.title)}</h3><p>${esc(x.summary||'')}</p><div class="mentor-actions"><a class="mentor-btn small" href="${esc(x.image_url||'#')}" target="_blank" rel="noopener">View</a><button class="mentor-btn small" data-edit-chart="${x.id}">Edit</button><button class="mentor-btn small danger" data-delete-chart="${x.id}">Delete</button></div></div></article>`:`<article class="mentor-history-card">${x.cover_url?`<img src="${esc(x.cover_url)}" alt="Article">`:'<div style="aspect-ratio:16/9;background:#0c1b36"></div>'}<div class="body"><div class="mentor-meta"><span class="mentor-chip gold">${x.is_published?'PUBLISHED':'DRAFT'}</span><span class="mentor-chip">${esc(x.category||'General')}</span><small>${esc(dt(x.published_at||x.created_at))}</small></div><h3>${esc(x.title)}</h3><p>${esc(x.excerpt||String(x.content||'').slice(0,160))}</p><div class="mentor-actions"><button class="mentor-btn small" data-view-article="${x.id}">View</button><button class="mentor-btn small" data-edit-article="${x.id}">Edit</button><button class="mentor-btn small danger" data-delete-article="${x.id}">Delete</button></div></div></article>`).join('')}</div></section>`).join('')}
function renderBanners(){const box=$('#mentorBanners');if(!box)return;const items=state.banners||[];box.innerHTML=items.length?Object.entries(byDate(items)).map(([d,rows])=>`<section class="mentor-date-group"><h3>${esc(d)}</h3><div class="mentor-history-cards">${rows.map(x=>`<article class="mentor-history-card"><img src="${esc(x.image_url)}" alt="Banner"><div class="body"><div class="mentor-meta"><span class="mentor-chip gold">${x.is_published?'PUBLISHED':'DRAFT'}</span></div><h3>${esc(x.title)}</h3><p>${esc(x.target_url||'No target URL')}</p><div class="mentor-actions"><a class="mentor-btn small" href="${esc(x.image_url)}" target="_blank" rel="noopener">View</a><button class="mentor-btn small" data-edit-banner="${x.id}">Edit</button><button class="mentor-btn small danger" data-delete-banner="${x.id}">Delete</button></div></div></article>`).join('')}</div></section>`).join(''):'<div class="mentor-empty">No banners yet.</div>'}
function editBanner(id){const x=state.banners.find(v=>v.id===id);if(!x)return;const f=$('#mentorBannerForm');f.elements.id.value=x.id;f.elements.existing_image.value=x.image_url||'';f.elements.title.value=x.title||'';f.elements.target_url.value=x.target_url||'';f.elements.is_published.checked=Boolean(x.is_published);$('#mentorBannerModalTitle').textContent='Edit Banner';openModal('banner')}
async function saveBanner(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),published=f.elements.is_published.checked,oldImage=String(d.existing_image||'');let image=null,saved=false;b.disabled=true;try{image=await upload(f.elements.image.files[0],'banners');const row={title:String(d.title||'').trim(),image_url:image||oldImage||null,target_url:String(d.target_url||'').trim()||null,is_published:published,updated_at:new Date().toISOString()};if(!row.title)throw new Error('Banner title is required.');if(!row.image_url)throw new Error('Banner image is required.');let r;if(d.id)r=await sb.from('mentor_banners').update(row).eq('id',d.id).eq('created_by',state.user.id);else r=await sb.from('mentor_banners').insert({...row,created_by:state.user.id});if(r.error)throw r.error;saved=true;if(image&&oldImage&&image!==oldImage)await removeContentAsset(oldImage);f.reset();f.elements.id.value='';f.elements.existing_image.value='';f.elements.is_published.checked=true;$('#mentorBannerModalTitle').textContent='New Banner';closeModals();toast(d.id?'Banner updated.':'Banner saved.');await load()}catch(err){if(image&&!saved)await removeContentAsset(image);toast(err.message||'Could not save banner.')}finally{b.disabled=false}}
function renderCourses(){const b=$('#mentorCourses');if(!b)return;b.innerHTML=state.courses.length?state.courses.map(c=>`<article class="mentor-card">${c.thumbnail_url?`<img src="${esc(c.thumbnail_url)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px">`:''}<div class="mentor-meta"><span class="mentor-chip gold">${Number((c.discount_price ?? c.price) || 0)<=0?'FREE':esc(c.currency||'USD')+' '+esc(c.discount_price??c.price)}</span><span class="mentor-chip">${esc(c.status||'active')}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.short_description||c.description||'')}</p><small>${esc(c.instructor_name||'24K MR ZERO')}</small></article>`).join(''):'<div class="mentor-empty">No published courses.</div>'}
function renderNews(){const b=$('#mentorNews');if(!b)return;b.innerHTML=state.news.length?state.news.map(n=>`<article class="mentor-card"><span class="mentor-chip gold">${esc(String(n.priority||'normal').toUpperCase())}</span><h3>${esc(n.title)}</h3><p>${esc(n.message)}</p><small>${dt(n.published_at||n.created_at)}</small></article>`).join(''):'<div class="mentor-empty">No announcements.</div>'}
function renderSettings(){const name=state.profile?.full_name||'Mentor',enabled=Object.entries(state.perms).filter(x=>x[1]).map(x=>x[0]);const html=`<article class="mentor-card"><span class="eyebrow">ACTIVE MENTOR</span><h3>${esc(name)}</h3><p>${esc(state.profile?.email||'')}</p><div class="mentor-meta">${enabled.map(x=>`<span class="mentor-chip gold">${esc(x.toUpperCase())}</span>`).join('')||'<span class="mentor-chip">No creation permissions</span>'}</div><p>Permissions are controlled by Admin.</p></article>`;$('#mentorSettings').innerHTML=html;$('#mentorProfileContent').innerHTML=html}
function mentorPipSize(symbol){const s=String(symbol||'').replace('/','').toUpperCase();if(s.startsWith('BTC'))return 10;if(s==='XAUUSD')return .1;if(s==='XAGUSD')return .001;if(s.endsWith('JPY'))return .01;return .0001}
function projectedSignalPips(signal,price){
  const p=Number(price),a=Number(signal?.entry_from),b=signal?.entry_to==null||signal?.entry_to===''?a:Number(signal.entry_to);
  if(!Number.isFinite(p)||!Number.isFinite(a)||!Number.isFinite(b))return null;
  const entry=(a+b)/2,pip=mentorPipSize(signal?.symbol),dir=String(signal?.direction||'BUY').toUpperCase();
  const result=(dir==='SELL'?entry-p:p-entry)/pip;
  return Math.round(result*10)/10
}
function pipText(v){return v==null?'—':`${v>0?'+':''}${Number.isInteger(v)?v:Number(v).toFixed(1)} pips`}
function renderMentorPipPreview(){
  const f=$('#mentorSignalForm'),box=$('#mentorPipPreview');if(!f||!box)return;
  const d=Object.fromEntries(new FormData(f)),kind=String(d.signal_type||'BUY').toUpperCase(),signal={symbol:d.symbol,direction:kind.startsWith('SELL')?'SELL':'BUY',entry_from:num(d.entry_from),entry_to:num(d.entry_to)};
  if(signal.entry_from==null){box.innerHTML='<span>Automatic Pip Preview</span><small>Enter Entry, SL and TP levels to calculate projected pips.</small>';return}
  const levels=[['SL',d.stop_loss],['TP1',d.take_profit_1],['TP2',d.take_profit_2],['TP3',d.take_profit_3],['TP4',d.take_profit_4]].filter(([,v])=>v!==''&&v!=null);
  box.innerHTML='<span>Automatic Pip Preview</span><div>'+levels.map(([k,v])=>{const bad=k==='SL',p=mentorOutcomePips(signal,v,bad?'sl':'tp');return `<b class="${bad?'bad':'good'}">${k} <em>${pipText(p)}</em></b>`}).join('')+'</div>'
}
function mentorSignalResult(signal,row){const status=String(signal.status||'');if(status==='cancelled')return{result_pips:null,close_price:null};const entry=(Number(row.entry_from||0)+Number(row.entry_to??row.entry_from??0))/2;let price=null,outcome='manual';if(status==='breakeven_hit'){price=entry;outcome='be'}else if(status==='tp1_hit'){price=row.take_profit_1;outcome='tp'}else if(status==='tp2_hit'){price=row.take_profit_2;outcome='tp'}else if(status==='tp3_hit'){price=row.take_profit_3;outcome='tp'}else if(status==='tp4_hit'){price=row.take_profit_4;outcome='tp'}else if(status==='sl_hit'){price=row.stop_loss;outcome='sl'}else if(status==='manually_closed')price=signal.close_price;if(price===null||price===undefined||!Number.isFinite(Number(price)))return{result_pips:signal.result_pips??null,close_price:signal.close_price??null};const result=mentorOutcomePips({...signal,...row},price,outcome);return{result_pips:result,close_price:signalIsClosed({...signal,...row,status})?Number(price):(signal.close_price??null)}}
function editSignal(id){const x=state.signals.find(v=>v.id===id);if(!x)return;closeModals();const f=$('#mentorSignalForm');f.elements.id.value=x.id;f.elements.symbol.value=x.symbol||'XAUUSD';f.elements.signal_type.value=signalTypeLabel(x);f.elements.entry_from.value=x.entry_from??'';f.elements.entry_to.value=x.entry_to??'';f.elements.stop_loss.value=x.stop_loss??'';f.elements.take_profit_1.value=x.take_profit_1??'';f.elements.take_profit_2.value=x.take_profit_2??'';f.elements.take_profit_3.value=x.take_profit_3??'';f.elements.take_profit_4.value=x.take_profit_4??'';f.elements.notes.value=x.notes||'';const t=$('#mentorSignalModalTitle');if(t)t.textContent=signalIsClosed(x)?'Edit Signal History':'Edit Signal';openModal('signal');renderMentorPipPreview()}
async function saveSignal(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),kind=String(d.signal_type||'BUY').trim().toUpperCase(),direction=kind.startsWith('SELL')?'SELL':'BUY',orderType=kind.includes('STOP')?'stop':kind.includes('LIMIT')?'limit':'market',original=b.innerHTML;b.disabled=true;b.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';try{const row={symbol:String(d.symbol||'').trim().toUpperCase(),direction,order_type:orderType,entry_from:num(d.entry_from),entry_to:num(d.entry_to),stop_loss:num(d.stop_loss),take_profit_1:num(d.take_profit_1),take_profit_2:num(d.take_profit_2),take_profit_3:num(d.take_profit_3),take_profit_4:num(d.take_profit_4),notes:String(d.notes||'').trim()||null};if(!row.symbol||row.entry_from===null||row.stop_loss===null||row.take_profit_1===null){const name=row.entry_from===null?'entry_from':row.stop_loss===null?'stop_loss':row.take_profit_1===null?'take_profit_1':'symbol';f.elements[name]?.focus();throw new Error('Entry From, Stop Loss and TP1 are required.');}let r;if(d.id){const existing=state.signals.find(x=>x.id===d.id);if(!existing)throw new Error('Signal not found.');const calc=mentorSignalResult(existing,row);r=await sb.from('signals').update({...row,...calc,updated_at:new Date().toISOString()}).eq('id',d.id).eq('created_by',state.user.id);if(r.error)throw r.error;toast('Signal updated.')}else{r=await sb.from('signals').insert({...row,status:row.order_type==='market'?'active':'pending',audience_access:'all_students',is_published:true,published_at:new Date().toISOString(),created_by:state.user.id});if(r.error)throw r.error;toast('Signal published.')}f.reset();f.elements.id.value='';const t=$('#mentorSignalModalTitle');if(t)t.textContent='New Signal';closeModals();await load()}catch(err){toast(err.message||'Could not save signal.')}finally{b.disabled=false;b.innerHTML=original}}
async function signalAction(id,action){let close=null;if(action==='manually_closed'){const v=prompt('Enter close price:');if(v===null)return;close=Number(v);if(!Number.isFinite(close))return toast('Enter a valid close price.')}const r=await sb.rpc('mentor_update_signal_status_v12_16',{p_signal_id:id,p_action:action,p_close_price:close,p_note:null,p_notify_users:true});if(r.error)throw r.error;const p=r.data?.result_pips;toast(p==null?'Signal updated.':`Signal updated · ${pipText(Number(p))}`);closeModals();await load()}
function editChart(id){const x=state.charts.find(v=>v.id===id);if(!x)return;const f=$('#mentorChartForm');f.elements.id.value=x.id;f.elements.existing_image.value=x.image_url||'';f.elements.title.value=x.title||'';f.elements.symbol.value=x.symbol||'';f.elements.timeframe.value=x.timeframe||'';f.elements.summary.value=x.summary||'';f.elements.details.value=x.details||'';$('#mentorChartModalTitle').textContent='Edit Chart';openModal('chart')}
async function saveChart(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),oldImage=String(d.existing_image||'');let image=null,saved=false;b.disabled=true;try{image=await upload(f.elements.image.files[0],'charts');const row={title:String(d.title||'').trim(),symbol:String(d.symbol||'').trim().toUpperCase(),timeframe:String(d.timeframe||'').trim()||null,summary:String(d.summary||'').trim(),details:String(d.details||'').trim()||null,image_url:image||oldImage||null,is_published:true};if(!row.title||!row.symbol||!row.summary)throw new Error('Title, symbol and summary are required.');let r;if(d.id)r=await sb.from('charts').update(row).eq('id',d.id).eq('created_by',state.user.id);else r=await sb.from('charts').insert({...row,published_at:new Date().toISOString(),created_by:state.user.id});if(r.error)throw r.error;saved=true;if(image&&oldImage&&image!==oldImage)await removeContentAsset(oldImage);f.reset();f.elements.id.value='';f.elements.existing_image.value='';$('#mentorChartModalTitle').textContent='New Chart';closeModals();toast(d.id?'Chart updated.':'Chart published.');await load()}catch(err){if(image&&!saved)await removeContentAsset(image);toast(err.message||'Could not save chart.')}finally{b.disabled=false}}
function editArticle(id){const x=state.articles.find(v=>v.id===id);if(!x)return;const f=$('#mentorArticleForm');f.elements.id.value=x.id;f.elements.existing_cover.value=x.cover_url||'';f.elements.title.value=x.title||'';if(f.elements.category)f.elements.category.value=x.category||'';f.elements.excerpt.value=x.excerpt||'';f.elements.content.value=x.content||'';f.elements.is_published.checked=Boolean(x.is_published);$('#mentorArticleModalTitle').textContent='Edit Article';openModal('article')}
async function saveArticle(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),published=f.elements.is_published.checked,oldCover=String(d.existing_cover||'');let cover=null,saved=false;b.disabled=true;try{cover=await upload(f.elements.cover.files[0],'articles');const title=String(d.title||'').trim(),content=String(d.content||'').trim(),row={title,category:String(d.category||'').trim()||'General',excerpt:String(d.excerpt||'').trim()||null,content,cover_url:cover||oldCover||null,is_published:published,published_at:published?new Date().toISOString():null};if(!title||!content)throw new Error('Title and article content are required.');let r;if(d.id)r=await sb.from('articles').update(row).eq('id',d.id).eq('created_by',state.user.id);else r=await sb.from('articles').insert({...row,slug:`${slug(title)}-${Date.now().toString(36)}`,created_by:state.user.id});if(r.error)throw r.error;saved=true;if(cover&&oldCover&&cover!==oldCover)await removeContentAsset(oldCover);f.reset();f.elements.id.value='';f.elements.existing_cover.value='';f.elements.is_published.checked=true;$('#mentorArticleModalTitle').textContent='New Article';closeModals();toast(d.id?'Article updated.':'Article saved.');await load()}catch(err){if(cover&&!saved)await removeContentAsset(cover);toast(err.message||'Could not save article.')}finally{b.disabled=false}}
async function del(table,id,label){if(!confirm(`Delete this ${label}?`))return;const source=table==='charts'?state.charts:table==='articles'?state.articles:table==='mentor_banners'?state.banners:[],item=source.find(x=>String(x.id)===String(id)),media=item?.image_url||item?.cover_url||null;const r=await sb.from(table).delete().eq('id',id).eq('created_by',state.user.id);if(r.error)throw r.error;if(media)await removeContentAsset(media);toast(`${label} deleted.`);await load()}
async function logout(){await sb?.auth.signOut();location.href='/mentor-login.html'}
document.addEventListener('click',e=>{const install=e.target.closest('#mentorInstallButton');if(install){e.preventDefault();(async()=>{if(mentorStandalone())return toast('Mentor App is already installed.','success');if(mentorInstallPrompt){mentorInstallPrompt.prompt();const choice=await mentorInstallPrompt.userChoice;if(choice?.outcome==='accepted')toast('Installing 24K Mentor App…','success');mentorInstallPrompt=null;updateMentorInstall();return}const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);toast(ios?'Use Share → Add to Home Screen to install the app.':'Use your browser menu → Install app / Add to Home screen.','info')})().catch(()=>{});return}const preset=e.target.closest('[data-note-preset]');if(preset){const f=$('#mentorSignalForm'),ta=f?.elements.notes;if(!ta)return;$$('[data-note-preset]').forEach(x=>x.classList.toggle('active',x===preset));if(preset.dataset.notePreset==='custom'){ta.value='';ta.focus()}else{ta.value=preset.dataset.notePreset}return}const copySignal=e.target.closest('[data-copy-signal]');if(copySignal){const s=(state.signals||[]).find(x=>String(x.id)===String(copySignal.dataset.copySignal));if(s){const text=[`${s.symbol} — ${signalTypeLabel(s)}`,`Entry: ${s.entry_from}${s.entry_to!=null?' - '+s.entry_to:''}`,`SL: ${s.stop_loss}`,`TP1: ${s.take_profit_1??'—'}`,`TP2: ${s.take_profit_2??'—'}`,`TP3: ${s.take_profit_3??'—'}`,`TP4: ${s.take_profit_4??'—'}`,s.notes?`Note: ${s.notes}`:''].filter(Boolean).join('\n');navigator.clipboard?.writeText(text).then(()=>toast('Signal copied.')).catch(()=>toast('Could not copy signal.'))}return}const noteSignal=e.target.closest('[data-note-signal]');if(noteSignal){const s=(state.signals||[]).find(x=>String(x.id)===String(noteSignal.dataset.noteSignal));toast(s?.notes||'No note added.');return}const toggleSignalRow=e.target.closest('[data-toggle-signal-row]');if(toggleSignalRow){const card=toggleSignalRow.closest('.mentor-signal-mobile-card');if(!card)return;const wasOpen=card.classList.contains('is-open');document.querySelectorAll('.mentor-signal-mobile-card.is-open').forEach(x=>{x.classList.remove('is-open');x.querySelector('[data-toggle-signal-row]')?.setAttribute('aria-expanded','false');x.querySelector('.mentor-signal-row-dropdown')?.setAttribute('aria-hidden','true')});if(!wasOpen){card.classList.add('is-open');toggleSignalRow.setAttribute('aria-expanded','true');card.querySelector('.mentor-signal-row-dropdown')?.setAttribute('aria-hidden','false')}return}const viewSignal=e.target.closest('[data-view-signal]');if(viewSignal){renderSignalDetail(viewSignal.dataset.viewSignal);return}const openFilters=e.target.closest('[data-open-signal-filters]');if(openFilters){const ids=[['mentorMobileSignalPair','mentorSignalPairFilter'],['mentorMobileSignalType','mentorSignalTypeFilter'],['mentorMobileSignalStatus','mentorSignalStatusFilter'],['mentorMobileSignalFrom','mentorSignalFrom'],['mentorMobileSignalTo','mentorSignalTo']];ids.forEach(([a,b])=>{const A=$('#'+a),B=$('#'+b);if(A&&B)A.value=B.value});openModal('signalFilter');return}const applyFilters=e.target.closest('[data-apply-signal-filters]');if(applyFilters){state.signalPeriod='custom';const ids=[['mentorSignalPairFilter','mentorMobileSignalPair'],['mentorSignalTypeFilter','mentorMobileSignalType'],['mentorSignalStatusFilter','mentorMobileSignalStatus'],['mentorSignalFrom','mentorMobileSignalFrom'],['mentorSignalTo','mentorMobileSignalTo']];ids.forEach(([a,b])=>{const A=$('#'+a),B=$('#'+b);if(A&&B)A.value=B.value});closeModals();renderSignals();syncSignalPeriodButtons();focusFilteredSignalResults();return}const resetFilters=e.target.closest('[data-reset-signal-filters]');if(resetFilters){for(const id of ['mentorSignalSearch','mentorSignalFrom','mentorSignalTo','mentorMobileSignalFrom','mentorMobileSignalTo']){const el=$('#'+id);if(el)el.value=''}for(const id of ['mentorSignalPairFilter','mentorSignalTypeFilter','mentorSignalStatusFilter','mentorMobileSignalPair','mentorMobileSignalType','mentorMobileSignalStatus']){const el=$('#'+id);if(el)el.value='all'}state.signalFilters={q:'',pair:'all',type:'all',status:'all',from:'',to:''};state.signalPeriod='all';renderSignals();syncSignalPeriodButtons();focusFilteredSignalResults();return}const quickDate=e.target.closest('[data-apply-quick-date]');if(quickDate){state.signalPeriod='custom';syncSignalPeriodButtons();toggleSignalCustomDate(false);renderSignals();focusFilteredSignalResults();return}const period=e.target.closest('[data-signal-period]');if(period){setSignalPeriod(period.dataset.signalPeriod);return}const v=e.target.closest('[data-mentor-view]');if(v){e.preventDefault();closeModals();showView(v.dataset.mentorView);return}const o=e.target.closest('[data-open-mentor-modal]');if(o){resetMentorEditor(o.dataset.openMentorModal);openModal(o.dataset.openMentorModal);return}if(e.target.closest('[data-close-mentor-modal]'))return closeModals();const sa=e.target.closest('[data-signal-action]');if(sa)signalAction(sa.dataset.id,sa.dataset.signalAction).catch(x=>toast(x.message));const es=e.target.closest('[data-edit-signal]');if(es)editSignal(es.dataset.editSignal);const st=e.target.closest('[data-signal-tab]');if(st){state.signalTab=st.dataset.signalTab;$$('[data-signal-tab]').forEach(x=>x.classList.toggle('active',x===st));renderSignals()}const ec=e.target.closest('[data-edit-chart]');if(ec)editChart(ec.dataset.editChart);const dc=e.target.closest('[data-delete-chart]');if(dc)del('charts',dc.dataset.deleteChart,'chart').catch(x=>toast(x.message));const ea=e.target.closest('[data-edit-article]');if(ea)editArticle(ea.dataset.editArticle);const da=e.target.closest('[data-delete-article]');if(da)del('articles',da.dataset.deleteArticle,'article').catch(x=>toast(x.message));const eb=e.target.closest('[data-edit-banner]');if(eb)editBanner(eb.dataset.editBanner);const db=e.target.closest('[data-delete-banner]');if(db)del('mentor_banners',db.dataset.deleteBanner,'banner').catch(x=>toast(x.message));const va=e.target.closest('[data-view-article]');if(va){const a=state.articles.find(x=>x.id===va.dataset.viewArticle);if(a)alert(`${a.title}\n\n${a.content||a.excerpt||''}`)}if(e.target.closest('[data-mentor-mobile-profile]'))openModal('profile')});
$('#mentorSignalForm')?.addEventListener('submit',saveSignal);$('#mentorSignalForm')?.addEventListener('input',renderMentorPipPreview);$('#mentorSignalForm')?.addEventListener('change',renderMentorPipPreview);$('#mentorChartForm')?.addEventListener('submit',saveChart);$('#mentorArticleForm')?.addEventListener('submit',saveArticle);$('#mentorBannerForm')?.addEventListener('submit',saveBanner);$('#mentorLogout')?.addEventListener('click',logout);$('#mentorProfileLogout')?.addEventListener('click',logout);function mentorRefresh(btn){if(btn?.classList.contains('is-loading'))return;btn?.classList.add('is-loading');document.body.classList.add('mentor-refreshing');load().then(()=>toast('Updated')).catch(e=>toast(e.message)).finally(()=>{btn?.classList.remove('is-loading');document.body.classList.remove('mentor-refreshing')})}
$('#mentorMenuToggle')?.addEventListener('click',openMentorMenu);$('#mentorMenuClose')?.addEventListener('click',closeMentorMenu);$('#mentorSidebarOverlay')?.addEventListener('click',closeMentorMenu);
$('#mentorRefresh')?.addEventListener('click',e=>mentorRefresh(e.currentTarget));$('#mentorTopRefresh')?.addEventListener('click',e=>mentorRefresh(e.currentTarget));$('#mentorMonthSelect')?.addEventListener('change',e=>setPerformanceMonth(e.currentTarget.value));$('#mentorMonthPrev')?.addEventListener('click',()=>shiftPerformanceMonth(-1));$('#mentorMonthNext')?.addEventListener('click',()=>shiftPerformanceMonth(1));$('#mentorThisMonth')?.addEventListener('click',()=>setPerformanceMonth(performanceMonthKey(new Date())));$('#mentorTheme')?.addEventListener('click',()=>applyMentorTheme(document.documentElement.dataset.theme==='light'?'dark':'light'));['#mentorSignalSearch','#mentorSignalPairFilter','#mentorSignalTypeFilter','#mentorSignalStatusFilter','#mentorSignalFrom','#mentorSignalTo'].forEach(s=>$(s)?.addEventListener('input',()=>{if(s==='#mentorSignalFrom'||s==='#mentorSignalTo'){state.signalPeriod='custom'}renderSignals();syncSignalPeriodButtons()}));['#mentorSignalPairFilter','#mentorSignalTypeFilter','#mentorSignalStatusFilter'].forEach(s=>$(s)?.addEventListener('change',()=>{renderSignals();syncSignalPeriodButtons();focusFilteredSignalResults()}));['#mentorSignalFrom','#mentorSignalTo'].forEach(s=>$(s)?.addEventListener('change',()=>{state.signalPeriod='custom';renderSignals();syncSignalPeriodButtons()}));['#mentorChartSearch','#mentorChartPair','#mentorChartSort'].forEach(s=>$(s)?.addEventListener('input',renderCharts));['#mentorArticleSearch','#mentorArticleCategory','#mentorArticleStatus','#mentorArticleSort'].forEach(s=>$(s)?.addEventListener('input',renderArticles));$$('.mentor-modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModals()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMentorMenu()});
window.addEventListener('resize',()=>{if(window.innerWidth>760)closeMentorMenu()});
if(localStorage.getItem('mentor-theme-v1220')!=='1'){localStorage.setItem('mentor-theme','light');localStorage.setItem('mentor-theme-v1220','1')}
const theme=localStorage.getItem('mentor-theme');applyMentorTheme(theme||'light');
load().then(()=>{let h=(location.hash||'#performance').slice(1);if(!document.querySelector(`[data-mentor-panel="${CSS.escape(h)}"]`))h='performance';showView(h)}).catch(err=>{console.error(err);toast(err.message||'Could not load Mentor Panel.');$('#mentorLoading').innerHTML='<div class="mentor-login-card"><h2>Could not load Mentor Panel</h2><p>Please refresh or sign in again.</p><a class="mentor-btn gold" href="/mentor-login.html" style="display:grid;place-items:center;text-decoration:none">Mentor Login</a></div>'});
})();

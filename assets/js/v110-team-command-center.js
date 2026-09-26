(function(){'use strict';if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(e=>console.warn('[24K PWA]',e?.message||e)))};
'use strict';
const cfg=window.APP_CONFIG||{};
const supa=(window.supabase&&window.supabase.createClient&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const TOKEN_KEY='24k_team_token',THEME_KEY='24k_team_theme';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>'$'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const num=(n,d=0)=>Number(n||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const dt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})};
const date=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'})};
function relativeAgo(v){
  if(!v)return'';
  const d=new Date(v);if(Number.isNaN(d.getTime()))return'';
  const sec=Math.round((Date.now()-d.getTime())/1000),abs=Math.abs(sec);
  if(abs<60)return sec>=0?'just now':'soon';
  const min=Math.round(abs/60);if(min<60)return sec>=0?`${min}m ago`:`in ${min}m`;
  const hr=Math.round(min/60);if(hr<24)return sec>=0?`${hr}h ago`:`in ${hr}h`;
  const day=Math.round(hr/24);if(day<7)return sec>=0?`${day}d ago`:`in ${day}d`;
  return date(v)
}
const monthNow=()=>new Date().toISOString().slice(0,7);
const today=()=>new Date().toISOString().slice(0,10);
let payload=null,rangeData=null,chatFilter='all',chatSearch='',activeThread=null,chatList=[],installPrompt=null,homeRank=null,homeChatAttention=0,lastSyncedAt=null;
function token(){return localStorage.getItem(TOKEN_KEY)||sessionStorage.getItem('24k_team_session')||''}
async function rpc(name,args={}){const {data,error}=await supa.rpc(name,args);if(error)throw error;return data}
function initials(v){return String(v||'TM').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'TM'}
function monthLabel(v){const d=new Date((v||monthNow())+'-01T00:00:00');return d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
function monthOptions(){const s=$('#teamMonth');if(!s)return;const now=new Date();s.innerHTML='';for(let i=0;i<24;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1),v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;s.insertAdjacentHTML('beforeend',`<option value="${v}">${monthLabel(v)}</option>`)}s.value=monthNow()}
function toast(m,type='info'){const x=$('#teamToast');if(!x)return;x.textContent=m;x.className=`team-toast show ${type}`;clearTimeout(x._t);x._t=setTimeout(()=>x.className='team-toast',3200)}
function applyTheme(v){document.documentElement.dataset.theme=v;localStorage.setItem(THEME_KEY,v);const icon=v==='light'?'fa-moon':'fa-sun';$('#teamTheme i')?.setAttribute('class',`fa-solid ${icon}`);$('#teamThemeTop i')?.setAttribute('class',`fa-solid ${icon}`)}
function currentTheme(){return localStorage.getItem(THEME_KEY)||'light'}
if(localStorage.getItem('24k_team_theme_v1220')!=='1'){localStorage.setItem(THEME_KEY,'light');localStorage.setItem('24k_team_theme_v1220','1')}
const viewMeta={overview:['Team Overview','Your clients, follow-ups and earnings at a glance.'],clients:['My Clients','Your complete work list — old clients and new Ad/Auto leads together.'],search:['Search Client','Check the assigned manager before dealing with a client.'],daily:['Daily Report','Enter only the work you did manually.'],chat:['Live Chat','AI + human support conversations in one Live Desk.'],earnings:['Earnings','Course, VIP and Broker Lot earnings calculated automatically.'],performance:['Performance','See how assigned leads move from contact to conversion.'],history:['History','Previous months and old tracking records.'],links:['My Tracking Links','Read-only link attribution and conversion performance.'],more:['Account Hub','Workspace shortcuts, app controls and Team account settings.']};
function setView(name){if(!viewMeta[name])name='overview';$$('.view').forEach(x=>{const active=x.dataset.viewPanel===name;x.classList.toggle('active',active);if(active){x.classList.remove('view-enter');requestAnimationFrame(()=>x.classList.add('view-enter'))}});$$('.nav-btn[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===name));$$('[data-team-mobile-view]').forEach(x=>x.classList.toggle('active',x.dataset.teamMobileView===name));if($('#teamPageTitle'))$('#teamPageTitle').textContent=viewMeta[name][0];if($('#teamPageSubtitle'))$('#teamPageSubtitle').textContent=viewMeta[name][1];history.replaceState(null,'',`#${name}`);if(name==='chat')loadChat().catch(e=>toast(e.message||'Could not load Live Desk.','error'));if(name==='performance'&&!rangeData)loadRange('today')}
function loginView(msg=''){
  const login=$('#teamLogin'),app=$('#teamApp');
  login?.classList.remove('hidden');app?.classList.add('hidden');
  login?.style.removeProperty('display');
  app?.style.setProperty('display','none','important');
  document.body.classList.remove('team-authenticated');
  document.body.classList.add('team-login-visible');
  if($('#teamLoginError'))$('#teamLoginError').textContent=msg
}
function appView(){
  const login=$('#teamLogin'),app=$('#teamApp');
  login?.classList.add('hidden');app?.classList.remove('hidden');
  login?.style.setProperty('display','none','important');
  app?.style.removeProperty('display');
  document.body.classList.remove('team-login-visible');
  document.body.classList.add('team-authenticated');
  window.scrollTo({top:0,left:0,behavior:'auto'})
}
function tierCourse(v){v=Number(v||0);if(v<=100)return{rate:3,next:100,nextRate:4,prev:0};if(v<=200)return{rate:4,next:200,nextRate:5,prev:100};if(v<=300)return{rate:5,next:300,nextRate:7,prev:200};return{rate:7,next:null,nextRate:null,prev:300}}
function tierVip(v){v=Number(v||0);if(v<=20)return{rate:3,next:20,nextRate:4,prev:0};if(v<=40)return{rate:4,next:40,nextRate:5,prev:20};if(v<=60)return{rate:5,next:60,nextRate:7,prev:40};if(v<=80)return{rate:7,next:80,nextRate:10,prev:60};return{rate:10,next:null,nextRate:null,prev:80}}
function tierLots(v){v=Number(v||0);if(v<200)return{std:.3,ex:.3,next:200,nextStd:.5,nextEx:.5,prev:0};if(v<400)return{std:.5,ex:.5,next:400,nextStd:.7,nextEx:.7,prev:200};if(v<600)return{std:.7,ex:.7,next:600,nextStd:1,nextEx:1,prev:400};return{std:1,ex:1,next:null,nextStd:null,nextEx:null,prev:600}}
function progressPct(v,next,prev=0){if(!next)return 100;return Math.max(0,Math.min(100,((Number(v||0)-prev)/(next-prev))*100))}
function waLink(v,text='Hello'){const d=String(v||'').replace(/\D/g,'');return d?`https://wa.me/${d}?text=${encodeURIComponent(text)}`:'#'}
async function login(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]');b.disabled=true;$('#teamLoginError').textContent='';try{const v=Object.fromEntries(new FormData(f));const d=await rpc('team_login',{p_username:String(v.username||'').trim(),p_password:String(v.password||'')});if(!d?.token)throw new Error('Invalid username or password.');localStorage.setItem(TOKEN_KEY,d.token);await load()}catch(err){$('#teamLoginError').textContent=err.message||'Could not sign in.'}finally{b.disabled=false}}
async function logout(){try{if(token())await rpc('team_logout',{p_token:token()})}catch(_){}localStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem('24k_team_session');payload=null;loginView()}
async function commandCenter(month){try{return await rpc('team_get_command_center_v12_18',{p_token:token(),p_month:month+'-01'})}catch(e){if(/function|schema cache|does not exist/i.test(e.message||''))return await rpc('team_get_command_center',{p_token:token(),p_month:month+'-01'});throw e}}
async function load(){if(!token())return loginView();const alreadyOpen=document.body.classList.contains('team-authenticated');if(alreadyOpen)setHomeLoading(true);try{const month=$('#teamMonth')?.value||monthNow();const [center,rank]=await Promise.all([commandCenter(month),rpc('team_home_rank_v13_55',{p_token:token(),p_month:month+'-01'}).catch(()=>null)]);payload=center;homeRank=rank;lastSyncedAt=new Date();appView();renderAll();updateSyncStatus();await loadRange('today')}catch(err){console.error(err);if(/session|expired|invalid/i.test(err.message||'')){localStorage.removeItem(TOKEN_KEY);loginView('Your Team session expired. Please sign in again.')}else loginView('Could not load Team Panel: '+(err.message||'Unknown error'))}finally{setHomeLoading(false)}}
function renderAll(){const a=payload.account||{},p=payload.performance||{};const name=a.display_name||a.username||'Team Member';$('#teamMemberName').textContent=name;$('#heroName').textContent=name;$('#teamAvatar').textContent=initials(name);if($('#teamHomeAvatar'))$('#teamHomeAvatar').textContent=initials(name);if($('#teamMoreAvatar'))$('#teamMoreAvatar').textContent=initials(name);if($('#teamMoreName'))$('#teamMoreName').textContent=name;if($('#teamMoreUser'))$('#teamMoreUser').textContent='@'+(a.username||'team');if($('#teamGreeting')){const hr=new Date().getHours();$('#teamGreeting').textContent=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'}$('#teamUsername').textContent='@'+(a.username||'team');$('#teamMonthLabel').textContent=monthLabel($('#teamMonth').value);renderOverview();renderClients();renderDaily();renderEarnings(p);renderHistory(payload.history||[]);renderLinks(payload.links||[]);refreshHomeChatState().catch(()=>{})}
function clientDate(c){return c.assigned_at||c.signup_date||null}
function sameDay(v,d=today()){return v&&String(v).slice(0,10)===d}
function clientStatus(c){return String(c.client_status||'new').toLowerCase()}
function animateHomeMetric(el,target,type='number'){
  if(!el)return;
  const final=Number(target||0);
  if(!Number.isFinite(final)){el.textContent=target;return}
  const start=performance.now(),duration=420;
  const tick=now=>{
    const p=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-p,3),v=final*ease;
    el.textContent=type==='money'?money(v):Math.round(v).toLocaleString();
    if(p<1)requestAnimationFrame(tick)
  };
  requestAnimationFrame(tick)
}
function setHomeLoading(on){
  const home=$('[data-view-panel="overview"]');
  if(home)home.classList.toggle('home-loading',Boolean(on))
}
function dayKey(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return d.toISOString().slice(0,10)}
function lastNDays(n=7){
  const out=[],now=new Date();
  for(let i=n-1;i>=0;i--){const d=new Date(now);d.setHours(12,0,0,0);d.setDate(d.getDate()-i);out.push(d.toISOString().slice(0,10))}
  return out
}
function tinySpark(values,tone='gold'){
  const vals=values.map(v=>Number(v||0)),max=Math.max(1,...vals);
  return `<span class="home-spark ${tone}" aria-hidden="true">${vals.map(v=>`<i style="height:${Math.max(14,Math.round(v/max*100))}%"></i>`).join('')}</span>`
}
function homeHealthScore({clients,follow,converted,report,newToday}){
  if(!clients)return report?55:35;
  const followPenalty=Math.min(35,(follow/Math.max(1,clients))*35);
  const conversionBonus=Math.min(25,(converted/Math.max(1,clients))*45);
  const activityBonus=Math.min(15,newToday*4);
  return Math.max(20,Math.min(100,Math.round(60-followPenalty+conversionBonus+activityBonus+(report?15:0))))
}
function renderPriorityCenter({newToday,follow,report,convertedToday}){
  const box=$('#teamPriorityCards');if(!box)return;
  const cards=[
    {label:'Follow-ups due',value:follow,icon:'fa-bell',tone:follow?'amber':'green',view:'clients',copy:follow?'Open follow-ups':'All clear'},
    {label:'New leads',value:newToday,icon:'fa-user-plus',tone:newToday?'blue':'neutral',view:'clients',copy:newToday?'Review today':'No new leads'},
    {label:'Daily report',value:report?'Done':'Pending',icon:'fa-clipboard-check',tone:report?'green':'amber',view:'daily',copy:report?'Submitted':'Submit report'},
    {label:'Live chat',value:'—',icon:'fa-message',tone:'neutral',view:'chat',copy:'Checking',id:'teamHomeChatPriority'}
  ];
  box.innerHTML=cards.map(x=>`<button type="button" class="team-priority-card ${x.tone}" data-view-jump="${x.view}" ${x.id?`id="${x.id}"`:''}><span><i class="fa-solid ${x.icon}"></i></span><div><small>${x.label}</small><b>${x.value}</b><em>${x.copy}</em></div><i class="fa-solid fa-chevron-right"></i></button>`).join('');
  const summary=$('#teamPrioritySummary');
  if(summary)summary.textContent=follow||newToday||!report?`${follow+newToday+(!report?1:0)} items`:'All clear'
}
function renderHomeActivity(clients,reports,converted,totalEarnings){
  const box=$('#teamRecentActivity');if(!box)return;
  const items=[];
  clients.slice().sort((a,b)=>new Date(clientDate(b)||0)-new Date(clientDate(a)||0)).slice(0,3).forEach(c=>{
    const stamp=clientDate(c);
    items.push({time:new Date(stamp||0).getTime(),icon:'fa-user-plus',tone:'blue',title:'Client assigned',copy:`${c.full_name||'Student'} · ${(c.enrollments||[])[0]?.course_title||'No course'}`,stamp:relativeAgo(stamp)})
  });
  const latestReport=reports.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
  if(latestReport)items.push({time:new Date((latestReport.date||'')+'T12:00:00').getTime(),icon:'fa-clipboard-check',tone:'green',title:'Daily report submitted',copy:`${num(latestReport.leads_contacted)} contacted · ${num(latestReport.follow_ups)} follow-ups`,stamp:relativeAgo((latestReport.date||'')+'T12:00:00')});
  const convertedClient=clients.filter(c=>clientStatus(c)==='converted').sort((a,b)=>new Date(clientDate(b)||0)-new Date(clientDate(a)||0))[0];
  if(convertedClient)items.push({time:new Date(clientDate(convertedClient)||0).getTime(),icon:'fa-circle-check',tone:'green',title:'Converted client',copy:convertedClient.full_name||'Client converted',stamp:relativeAgo(clientDate(convertedClient))});
  if(totalEarnings>0)items.push({time:Date.now()-1,icon:'fa-sack-dollar',tone:'gold',title:'Earnings active',copy:`${money(totalEarnings)} total recorded earnings`,stamp:monthLabel($('#teamMonth')?.value||monthNow())});
  items.sort((a,b)=>b.time-a.time);
  box.innerHTML=items.length?items.slice(0,4).map(x=>`<div class="team-activity-item"><span class="${x.tone}"><i class="fa-solid ${x.icon}"></i></span><div><b>${esc(x.title)}</b><small>${esc(x.copy)}</small></div><em>${esc(x.stamp||'')}</em></div>`).join(''):`<div class="team-home-empty activity-empty"><span><i class="fa-solid fa-wave-square"></i></span><div><b>Activity will appear here</b><small>New leads, reports and conversions will build your live feed.</small></div></div>`
}
function setMobileBadge(id,value){
  const el=$(id);if(!el)return;
  const n=Number(value||0);el.hidden=!n;el.textContent=n>99?'99+':String(n)
}
async function refreshHomeChatState(){
  if(!token()||!supa)return;
  try{
    const summary=await rpc('team_live_desk_summary_v12_18',{p_token:token()});
    const attention=Number(summary?.human_requests||0)+Number(summary?.waiting||0);
    homeChatAttention=attention;setMobileBadge('#teamMobileChatBadge',attention);
    const card=$('#teamHomeChatPriority');
    if(card){
      card.classList.remove('neutral','green','amber','red');
      card.classList.add(attention?'red':'green');
      const b=card.querySelector('b'),em=card.querySelector('em');
      if(b)b.textContent=attention;
      if(em)em.textContent=attention?'Needs reply':'All clear'
    }
    if(payload){const clients=payload.clients||[],reports=payload.daily_reports||[],td=today(),newToday=clients.filter(c=>sameDay(clientDate(c),td)).length,follow=clients.filter(c=>['new','follow_up','interested'].includes(clientStatus(c))||c.next_follow_up&&String(c.next_follow_up).slice(0,10)<=td).length,report=reports.find(r=>r.date===td);renderSmartSummary({newToday,follow,report})}
  }catch{}
}
function updateSyncStatus(){
  const online=navigator.onLine!==false;
  let copy='Offline';
  if(online&&lastSyncedAt){
    const mins=Math.max(0,Math.floor((Date.now()-lastSyncedAt.getTime())/60000));
    copy=mins<1?'Synced now':mins===1?'Synced 1 min ago':`Synced ${mins} min ago`
  }else if(online)copy='Ready to sync';
  const main=$('#teamSyncStatus'),more=$('#teamMoreSync');
  if(main){main.classList.toggle('offline',!online);main.innerHTML=`<i class="fa-solid ${online?'fa-cloud-arrow-down':'fa-cloud'}"></i> ${copy}`}
  if(more)more.textContent=copy
}
function selectedMonthProjection(total){
  const selected=$('#teamMonth')?.value||monthNow(),now=new Date(),current=monthNow();
  if(selected!==current)return Number(total||0);
  const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),elapsed=Math.max(1,now.getDate());
  return Number(total||0)/elapsed*days
}
function renderSmartSummary({newToday,follow,report}){
  const el=$('#teamSmartSummary');if(!el)return;
  const bits=[];
  if(newToday)bits.push(`${newToday} new lead${newToday===1?'':'s'}`);
  if(follow)bits.push(`${follow} follow-up${follow===1?'':'s'} due`);
  if(homeChatAttention)bits.push(`${homeChatAttention} chat${homeChatAttention===1?'':'s'} waiting`);
  if(!report)bits.push('daily report pending');
  el.textContent=bits.length?bits.join(' · '):'All caught up — no urgent follow-ups or chats right now.'
}
function renderGoals(p){
  const box=$('#teamGoalProgress');if(!box)return;
  const c=tierCourse(Number(p.course_sales||0)),v=tierVip(Number(p.vip_count||0)),l=tierLots(Number(p.total_lots||0));
  const rows=[
    {label:'Course level',value:Number(p.course_sales||0),target:c.next,unit:'',rate:`${c.rate}%`,pct:progressPct(Number(p.course_sales||0),c.next,c.prev)},
    {label:'VIP level',value:Number(p.vip_count||0),target:v.next,unit:' clients',rate:`${v.rate}%`,pct:progressPct(Number(p.vip_count||0),v.next,v.prev)},
    {label:'Broker lots',value:Number(p.total_lots||0),target:l.next,unit:' lots',rate:`$${num(l.std,1)}/lot`,pct:progressPct(Number(p.total_lots||0),l.next,l.prev)}
  ];
  box.innerHTML=rows.map(x=>`<div class="team-goal-row"><div><span>${x.label}</span><b>${x.target?`${num(x.value,x.label==='Broker lots'?1:0)} / ${num(x.target,x.label==='Broker lots'?1:0)}${x.unit}`:`Top level · ${num(x.value,x.label==='Broker lots'?1:0)}${x.unit}`}</b></div><em>${x.rate}</em><span class="team-goal-bar"><i style="width:${Math.max(x.pct?5:0,Math.min(100,x.pct))}%"></i></span></div>`).join('');
  const proj=$('#teamEarningsProjection');if(proj)proj.textContent=money(selectedMonthProjection(Number(p.total_earnings||0)));
}
function renderPipeline(clients){
  const box=$('#teamPipeline');if(!box)return;
  const stages=[
    ['New','new'],['Contacted','contacted'],['Interested','interested'],['Follow-up','follow_up'],['Converted','converted']
  ];
  const counts=stages.map(([label,key])=>({label,key,value:clients.filter(c=>clientStatus(c)===key).length}));
  const max=Math.max(1,...counts.map(x=>x.value));
  box.innerHTML=counts.map((x,i)=>`<div class="team-pipeline-step ${x.key}"><div><span>${x.label}</span><b>${x.value}</b></div><span class="team-pipeline-bar"><i style="width:${Math.max(x.value?8:0,Math.round(x.value/max*100))}%"></i></span>${i<counts.length-1?'<i class="fa-solid fa-chevron-right"></i>':''}</div>`).join('')
}
function lineSvg(values){
  const vals=values.map(v=>Number(v||0)),w=260,h=74,p=8,max=Math.max(1,...vals),min=Math.min(0,...vals);
  const points=vals.map((v,i)=>{const x=p+(w-p*2)*(i/Math.max(1,vals.length-1)),y=h-p-(h-p*2)*((v-min)/Math.max(1,max-min));return [x,y]});
  const path=points.map((pt,i)=>(i?'L':'M')+pt[0].toFixed(1)+' '+pt[1].toFixed(1)).join(' ');
  const circles=points.map((pt,i)=>`<circle cx="${pt[0]}" cy="${pt[1]}" r="${i===points.length-1?2.8:1.8}"></circle>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="trend-grid" d="M8 20H252 M8 42H252 M8 64H252"></path><path class="trend-line" d="${path}"></path>${circles}</svg>`
}
function renderTrend(reports,clients){
  const days=lastNDays(7);
  const vals=days.map(d=>{const r=reports.find(x=>x.date===d);const assigned=clients.filter(c=>dayKey(clientDate(c))===d).length;return assigned+Number(r?.leads_contacted||0)+Number(r?.follow_ups||0)+Number(r?.calls_made||0)});
  const box=$('#teamTrendChart'),total=vals.reduce((a,b)=>a+b,0);
  if(box)box.innerHTML=`${lineSvg(vals)}<div class="team-trend-labels"><span>-6d</span><span>-3d</span><span>Today</span></div>`;
  if($('#teamTrendTotal'))$('#teamTrendTotal').textContent=`${total} action${total===1?'':'s'}`
}
function opportunityScore(c){
  const status=clientStatus(c),follow=c.next_follow_up?new Date(c.next_follow_up).getTime():Infinity,now=Date.now();
  if(follow<=now)return 100;
  if(status==='interested')return 80;
  if(status==='follow_up')return 70;
  if(status==='new')return 60;
  if(status==='contacted')return 45;
  return 10
}
function renderTopOpportunity(clients){
  const box=$('#teamTopOpportunity');if(!box)return;
  const candidates=clients.filter(c=>clientStatus(c)!=='converted'&&clientStatus(c)!=='inactive').sort((a,b)=>opportunityScore(b)-opportunityScore(a)||new Date(clientDate(b)||0)-new Date(clientDate(a)||0));
  const c=candidates[0];
  if(!c){box.innerHTML='<div class="team-home-empty opportunity-empty"><span><i class="fa-solid fa-check"></i></span><div><b>No urgent opportunity</b><small>Your active client queue is clear.</small></div></div>';return}
  const course=(c.enrollments||[])[0]?.course_title||'No course',due=c.next_follow_up?dt(c.next_follow_up):clientStatus(c).replaceAll('_',' ');
  box.innerHTML=`<div class="team-opportunity"><div class="team-opportunity-main"><span class="team-opportunity-avatar">${esc(initials(c.full_name))}</span><div><b>${esc(c.full_name||'Student')}</b><small>${esc(course)}</small><em>${esc(due)}</em></div></div><div class="team-opportunity-actions">${c.whatsapp?`<a href="${waLink(c.whatsapp,`Hello ${c.full_name||''}, following up with you.`)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:''}<button type="button" data-home-client="${c.id}">Open</button></div></div>`
}
function renderRank(){
  const chip=$('#teamRankChip');if(!chip)return;
  if(!homeRank||!Number(homeRank.team_count)){chip.innerHTML='<i class="fa-solid fa-ranking-star"></i> Rank —';return}
  chip.innerHTML=`<i class="fa-solid fa-ranking-star"></i> #${num(homeRank.rank)} of ${num(homeRank.team_count)}`
}
function renderHomeSearch(q=''){
  const box=$('#teamHomeSearchResults');if(!box)return;
  const query=String(q||'').trim().toLowerCase();
  if(query.length<2){box.classList.add('hidden');box.innerHTML='';return}
  const rows=(payload?.clients||[]).filter(c=>`${c.full_name||''} ${c.whatsapp||''} ${c.email||''} ${c.client_id||''}`.toLowerCase().includes(query)).slice(0,5);
  box.classList.remove('hidden');
  box.innerHTML=rows.length?rows.map(c=>`<button type="button" data-home-client="${c.id}"><span>${esc(initials(c.full_name))}</span><div><b>${esc(c.full_name||'Student')}</b><small>${esc(c.client_id||'')} · ${esc(c.whatsapp||c.email||'')}</small></div><i class="fa-solid fa-chevron-right"></i></button>`).join(''):`<button type="button" class="search-all" data-home-search-all><span><i class="fa-solid fa-magnifying-glass"></i></span><div><b>Search all clients</b><small>Check ownership for “${esc(q)}”</small></div><i class="fa-solid fa-arrow-right"></i></button>`
}
function renderOverview(){
  const clients=payload.clients||[],p=payload.performance||{},reports=payload.daily_reports||[],links=payload.links||[];
  const td=today(),days=lastNDays(7),
    newToday=clients.filter(c=>sameDay(clientDate(c),td)).length,
    follow=clients.filter(c=>['new','follow_up','interested'].includes(clientStatus(c))||c.next_follow_up&&String(c.next_follow_up).slice(0,10)<=td).length,
    converted=clients.filter(c=>clientStatus(c)==='converted').length,
    report=reports.find(r=>r.date===td),
    convertedToday=clients.filter(c=>sameDay(clientDate(c),td)&&clientStatus(c)==='converted').length,
    totalEarnings=Number(p.total_earnings||0),
    base=Math.max(1,clients.length);

  renderSmartSummary({newToday,follow,report});
  renderGoals(p);
  renderPipeline(clients);
  renderTrend(reports,clients);
  renderTopOpportunity(clients);
  renderRank();

  const assigned7=days.map(d=>clients.filter(c=>dayKey(clientDate(c))===d).length);
  const follow7=days.map(d=>{const r=reports.find(x=>x.date===d);return Number(r?.follow_ups||0)});
  const converted7=days.map(d=>clients.filter(c=>clientStatus(c)==='converted'&&dayKey(clientDate(c))===d).length);
  const work7=days.map(d=>{const r=reports.find(x=>x.date===d);return Number(r?.leads_contacted||0)+Number(r?.messages_sent||0)+Number(r?.calls_made||0)});

  $('#todayAttention').textContent=follow;
  $('#overviewMiniText').textContent=`${clients.length} total clients · ${converted} converted · ${money(totalEarnings)} earnings`;
  const priorityDot=$('#teamPriorityDot');
  if(priorityDot)priorityDot.className='team-priority-dot '+(follow>0?'attention':'clear');

  const health=homeHealthScore({clients:clients.length,follow,converted,report,newToday});
  const healthRing=$('#teamHealthRing'),healthScore=$('#teamHealthScore'),healthLabel=$('#teamHealthLabel'),healthMeta=$('#teamHealthMeta');
  if(healthRing)healthRing.style.setProperty('--health',health);
  if(healthScore)healthScore.textContent=health;
  if(healthLabel)healthLabel.textContent=health>=80?'Excellent':health>=65?'Strong':health>=50?'Building':'Needs focus';
  if(healthMeta)healthMeta.textContent=report?'Report submitted · live score':'Submit today’s report to improve score';

  renderPriorityCenter({newToday,follow,report,convertedToday});
  setMobileBadge('#teamClientsBadge',follow);

  const k=[
    {label:'My Total Clients',value:clients.length,sub:'All assigned clients',icon:'fa-user-group',chip:clients.length?'Live':'Waiting',tone:'blue',progress:clients.length?100:0,type:'number',spark:assigned7,sparkTone:'blue'},
    {label:'New Leads Today',value:newToday,sub:'Received today',icon:'fa-user-plus',chip:newToday?`+${newToday} today`:'No new leads',tone:newToday?'green':'neutral',progress:Math.min(100,newToday/base*100),type:'number',spark:assigned7,sparkTone:'green'},
    {label:'Need Follow-up',value:follow,sub:'Needs your attention',icon:'fa-bell',chip:follow?'Action needed':'All clear',tone:follow?'amber':'green',progress:Math.min(100,follow/base*100),type:'number',spark:follow7,sparkTone:'amber'},
    {label:'Converted This Month',value:converted,sub:'Completed conversions',icon:'fa-circle-check',chip:converted?`${converted} converted`:'No conversions',tone:converted?'green':'neutral',progress:Math.min(100,converted/base*100),type:'number',spark:converted7,sparkTone:'green'},
    {label:'Total Earnings',value:totalEarnings,sub:'Since Sep 2026',icon:'fa-sack-dollar',chip:totalEarnings>0?'Earnings live':'No earnings yet',tone:totalEarnings>0?'gold':'neutral',progress:totalEarnings>0?100:0,type:'money',spark:work7,sparkTone:'gold'}
  ];
  $('#overviewKpis').innerHTML=k.map((x,i)=>`<article class="overview-kpi ${i===4?'gold':''}">
    <div class="overview-kpi-head"><span>${x.label}</span><i class="fa-solid ${x.icon}"></i></div>
    <div class="overview-kpi-value-row"><b data-home-metric="${i}" data-type="${x.type}">${x.type==='money'?money(x.value):Number(x.value).toLocaleString()}</b><em class="overview-kpi-chip ${x.tone}">${esc(x.chip)}</em></div>
    <div class="overview-kpi-foot"><small>${x.sub}</small>${tinySpark(x.spark,x.sparkTone)}</div>
    <span class="overview-kpi-progress"><i style="width:${Math.max(x.progress?6:0,x.progress)}%"></i></span>
  </article>`).join('');
  k.forEach((x,i)=>animateHomeMetric($(`[data-home-metric="${i}"]`),x.value,x.type));

  const recent=clients.slice().sort((a,b)=>new Date(clientDate(b)||0)-new Date(clientDate(a)||0)).slice(0,5);
  $('#recentClients').innerHTML=recent.length?recent.map((c,i)=>`<div class="recent-client"><div><b>${i+1}. ${esc(c.full_name||'Student')}</b><small>${esc(c.client_id||'')} · ${esc((c.enrollments||[])[0]?.course_title||'No course')}</small></div><div><div class="client-source-tag">${sameDay(clientDate(c),td)?'Ad / Auto':'Old'}</div>${c.whatsapp?`<a class="wa-mini" target="_blank" rel="noopener" href="${waLink(c.whatsapp,`Hello ${c.full_name||''}`)}"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:''}</div></div>`).join(''):`<div class="team-home-empty"><span><i class="fa-solid fa-user-clock"></i></span><div><b>No assigned clients yet</b><small>New assigned leads will appear here automatically.</small></div></div>`;

  const work=[
    ['New leads today',newToday,'clients','Open','fa-user-plus'],
    ['Need follow-up',follow,'clients','Follow up','fa-bell'],
    ['Leads contacted',report?.leads_contacted||0,'daily','Update','fa-phone'],
    ['Converted today',convertedToday,'clients','View','fa-circle-check'],
    ['Daily report',report?'Submitted':'Pending','daily',report?'View':'Submit','fa-clipboard-check']
  ];
  $('#todayWork').innerHTML=work.map(x=>`<div class="today-work-item"><span class="today-work-label"><i class="fa-solid ${x[4]}"></i><span>${x[0]}</span></span><div class="today-work-value"><b>${x[1]}</b><button type="button" class="today-work-action" data-view-jump="${x[2]}">${x[3]}</button></div></div>`).join('');

  renderHomeActivity(clients,reports,converted,totalEarnings);

  $('#overviewLinks').innerHTML=links.length?links.slice(0,6).map(l=>`<div class="overview-link-chip"><b>${esc(l.name||'Tracked Link')}</b><small>${esc(l.source||'Direct')} · ${esc(l.ref_code||'')}</small></div>`).join(''):`<div class="team-home-empty links-empty"><span><i class="fa-solid fa-link"></i></span><div><b>No tracking links</b><small>Assigned links will appear here.</small></div></div>`;

  const home=$('[data-view-panel="overview"]');
  if(home){home.classList.remove('home-loading','home-ready');requestAnimationFrame(()=>home.classList.add('home-ready'))}
}

function clientMatches(c){
  const q=($('#clientSearch')?.value||'').trim().toLowerCase(),
    course=$('#clientCourseFilter')?.value||'all',
    status=$('#clientStatusFilter')?.value||'all';
  const text=`${c.full_name||''} ${c.email||''} ${c.whatsapp||''} ${c.client_id||''}`.toLowerCase();
  if(q&&!text.includes(q))return false;
  const courses=(c.enrollments||[]).map(e=>String(e.course_title||'').toLowerCase()).join(' ');
  if(course==='level1'&&!/basic|level 1/.test(courses))return false;
  if(course==='level2'&&!/level 2|advanced/.test(courses))return false;
  if(course==='vip'&&String(c.vip_status||'')!=='approved')return false;
  if(status!=='all'&&clientStatus(c)!==status)return false;
  return true
}
function statusLabel(v){
  const s=String(v||'new').toLowerCase();
  return s==='inactive'?'Not Interested':s==='follow_up'?'Follow-up':s.charAt(0).toUpperCase()+s.slice(1).replaceAll('_',' ')
}
function statusOptions(v){return['new','contacted','interested','follow_up','converted','inactive'].map(x=>`<option value="${x}" ${x===v?'selected':''}>${statusLabel(x)}</option>`).join('')}
function localInput(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)}
function clientFollowState(c){
  if(!c.next_follow_up)return {label:'No follow-up set',tone:'neutral',when:'—'};
  const d=new Date(c.next_follow_up),now=Date.now(),ms=d.getTime()-now;
  if(Number.isNaN(d.getTime()))return {label:'No follow-up set',tone:'neutral',when:'—'};
  if(ms<=0)return {label:'Follow-up overdue',tone:'danger',when:relativeAgo(c.next_follow_up)};
  if(ms<=86400000)return {label:'Due within 24h',tone:'warning',when:relativeAgo(c.next_follow_up)};
  return {label:'Follow-up scheduled',tone:'ok',when:relativeAgo(c.next_follow_up)}
}
function sortClientRows(rows){
  const mode=$('#clientSort')?.value||'priority';
  return rows.slice().sort((a,b)=>{
    if(mode==='newest')return new Date(clientDate(b)||0)-new Date(clientDate(a)||0);
    if(mode==='oldest')return new Date(clientDate(a)||0)-new Date(clientDate(b)||0);
    if(mode==='name')return String(a.full_name||'').localeCompare(String(b.full_name||''));
    return opportunityScore(b)-opportunityScore(a)||new Date(clientDate(b)||0)-new Date(clientDate(a)||0)
  })
}
function renderClientSummary(all){
  const now=Date.now(),
    total=all.length,
    fresh=all.filter(c=>clientStatus(c)==='new').length,
    due=all.filter(c=>c.next_follow_up&&new Date(c.next_follow_up).getTime()<=now||clientStatus(c)==='follow_up').length,
    converted=all.filter(c=>clientStatus(c)==='converted').length;
  const box=$('#clientSummary');
  if(box)box.innerHTML=[
    ['Total',total,'fa-user-group','blue'],
    ['New',fresh,'fa-user-plus','gold'],
    ['Follow-up',due,'fa-bell','amber'],
    ['Converted',converted,'fa-circle-check','green']
  ].map(x=>`<div class="team-client-summary-card ${x[3]}"><span><i class="fa-solid ${x[2]}"></i></span><div><small>${x[0]}</small><b>${x[1]}</b></div></div>`).join('');
}
function updateClientFilterUi(rows){
  const status=$('#clientStatusFilter')?.value||'all',
    course=$('#clientCourseFilter')?.value||'all',
    sort=$('#clientSort')?.value||'priority',
    q=String($('#clientSearch')?.value||'').trim();
  $$('#clientStatusTabs [data-client-status-chip]').forEach(b=>b.classList.toggle('active',b.dataset.clientStatusChip===status));
  const filterCount=(course!=='all'?1:0)+(status!=='all'?1:0)+(sort!=='priority'?1:0);
  const fc=$('#clientFilterCount');
  if(fc){fc.hidden=!filterCount;fc.textContent=filterCount}
  if($('#clientSearchClear'))$('#clientSearchClear').hidden=!q;
  const title=status==='all'?'All Clients':statusLabel(status);
  if($('#clientResultsTitle'))$('#clientResultsTitle').textContent=title;
  if($('#clientResultsMeta'))$('#clientResultsMeta').textContent=`${rows.length} result${rows.length===1?'':'s'}`;
}
function renderClients(){
  const all=payload?.clients||[];
  renderClientSummary(all);
  const rows=sortClientRows(all.filter(clientMatches));
  if($('#clientCountBadge'))$('#clientCountBadge').textContent=all.length.toLocaleString();
  updateClientFilterUi(rows);

  const box=$('#clientsCards');if(!box)return;
  if(!rows.length){
    const hasAny=all.length>0;
    box.innerHTML=`<article class="team-client-empty">
      <span><i class="fa-solid ${hasAny?'fa-magnifying-glass':'fa-user-clock'}"></i></span>
      <div><b>${hasAny?'No clients match these filters':'No clients assigned yet'}</b><small>${hasAny?'Try clearing search or filters to see more clients.':'New assigned leads will appear here automatically.'}</small></div>
      ${hasAny?'<button type="button" data-client-reset-empty>Reset Filters</button>':''}
    </article>`;
    return
  }

  box.innerHTML=rows.map(c=>{
    const courses=(c.enrollments||[]).map(e=>e.course_title).filter(Boolean),
      status=clientStatus(c),
      follow=clientFollowState(c),
      assigned=clientDate(c),
      source=c.link_name||c.link_source||'Direct',
      vip=String(c.vip_status||'')==='approved';
    return `<article class="client-work-card premium-client-card status-${status}" data-client-card="${c.id}">
      <div class="premium-client-head">
        <div class="premium-client-identity">
          <span class="avatar">${esc(initials(c.full_name))}</span>
          <div><b>${esc(c.full_name||'Student')}</b><small>${esc(c.client_id||'No Client ID')}</small></div>
        </div>
        <div class="premium-client-head-actions">
          ${vip?'<span class="client-vip-badge"><i class="fa-solid fa-crown"></i> VIP</span>':''}
          <span class="client-status-pill ${status}">${esc(statusLabel(status))}</span>
          ${c.whatsapp?`<a class="client-wa-icon" target="_blank" rel="noopener" href="${waLink(c.whatsapp,`Hello ${c.full_name||''},`)}" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>`:''}
        </div>
      </div>

      <div class="premium-client-contact">
        <span><i class="fa-regular fa-envelope"></i>${esc(c.email||'No email')}</span>
        <span><i class="fa-solid fa-phone"></i>${esc(c.whatsapp||'No WhatsApp')}</span>
      </div>

      <div class="premium-client-info-grid">
        <div><span>COURSE</span><b>${esc(courses.join(', ')||'No course')}</b><small>${esc(source)}</small></div>
        <div><span>ASSIGNED</span><b>${esc(assigned?relativeAgo(assigned):'—')}</b><small>${esc(assigned?dt(assigned):'No date')}</small></div>
        <div class="follow-state ${follow.tone}"><span>FOLLOW-UP</span><b>${esc(follow.label)}</b><small>${esc(follow.when)}</small></div>
      </div>

      <div class="premium-client-controls">
        <label><span>Status</span><select class="status-select" data-client-status="${c.id}">${statusOptions(status)}</select></label>
        <label><span>Next Follow-up</span><input class="follow-input" data-client-follow="${c.id}" type="datetime-local" value="${esc(localInput(c.next_follow_up))}"></label>
      </div>

      <div class="premium-client-footer">
        <span class="client-note-preview">${c.note?`<i class="fa-regular fa-note-sticky"></i> ${esc(c.note)}`:'No note added'}</span>
        <div class="client-actions">
          <button type="button" class="note" data-note-client="${c.id}"><i class="fa-regular fa-note-sticky"></i> Note</button>
          <button type="button" class="save" data-save-client="${c.id}"><i class="fa-solid fa-check"></i> Save</button>
        </div>
      </div>
    </article>`
  }).join('')
}

async function saveClient(id,withNote=false){const c=(payload.clients||[]).find(x=>String(x.id)===String(id));if(!c)return;const status=$(`[data-client-status="${id}"]`)?.value||clientStatus(c),follow=$(`[data-client-follow="${id}"]`)?.value||null;let note=c.note||null;if(withNote){const v=prompt('Client note:',note||'');if(v===null)return;note=v.trim()||null}try{await rpc('team_update_client_status',{p_token:token(),p_student_id:id,p_status:status,p_next_follow_up:follow?new Date(follow).toISOString():null,p_note:note});toast('Client updated.');await load()}catch(e){toast(e.message||'Could not update client.','error')}}
async function searchOwnership(){
  const q=String($('#ownershipSearch')?.value||'').trim(),box=$('#ownershipResult'),btn=$('#ownershipSearchBtn');
  if(q.length<2){toast('Enter at least 2 characters.','error');return}
  btn.disabled=true;
  box.innerHTML='<div class="team-tool-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Searching client ownership…</span></div>';
  try{
    const d=await rpc('team_search_client_v12_18',{p_token:token(),p_query:q});
    if(!d?.found){
      box.innerHTML='<div class="team-tool-empty"><span><i class="fa-solid fa-magnifying-glass"></i></span><div><b>No matching client found</b><small>Try another Name, WhatsApp, Email or Client ID.</small></div></div>';
      return
    }
    const c=d.client||{},m=d.manager||{},own=d.ownership||'unassigned';
    box.innerHTML=`<article class="ownership-card premium-ownership-card ${own}">
      <div class="premium-ownership-main">
        <span class="premium-ownership-avatar">${esc(initials(c.name||'Student'))}</span>
        <div><small>CLIENT</small><h3>${esc(c.name||'Student')}</h3><p>${esc(c.client_id||'No Client ID')}</p></div>
      </div>
      <span class="ownership-state ${own}">${own==='mine'?'YOUR CLIENT':own==='other'?'OTHER MANAGER':'UNASSIGNED'}</span>
      <div class="premium-ownership-details">
        <div><span>Contact</span><b>${own==='mine'?esc(c.whatsapp||c.email||'—'):own==='other'?esc(m.name||'Assigned Manager'):'Admin assignment required'}</b></div>
        <div><span>Status</span><b>${own==='mine'?esc(statusLabel(c.status||'new')):own==='other'?'Coordinate first':'Do not work yet'}</b></div>
        <div><span>Assigned</span><b>${own==='mine'?esc(relativeAgo(c.assigned_at)||dt(c.assigned_at)):own==='other'?esc(m.name||'Another manager'):'Unassigned'}</b></div>
      </div>
      ${own==='other'&&m.whatsapp?`<a class="premium-manager-wa" target="_blank" rel="noopener" href="${waLink(m.whatsapp,`Hello ${m.name||''}, I searched client ${c.name||''} ${c.client_id||''}.`)}"><i class="fa-brands fa-whatsapp"></i> Message Manager</a>`:''}
    </article>`
  }catch(e){
    box.innerHTML=`<div class="team-tool-empty error"><span><i class="fa-solid fa-triangle-exclamation"></i></span><div><b>Search failed</b><small>${esc(e.message||'Could not search client.')}</small></div></div>`
  }finally{btn.disabled=false}
}

async function saveDaily(e){e.preventDefault();$('#dailyStatus').textContent='Saving…';const args={p_token:token(),p_report_date:$('#reportDate').value,p_leads_contacted:Number($('#leadsContacted').value||0),p_messages_sent:Number($('#messagesSent').value||0),p_calls_made:Number($('#callsMade').value||0),p_follow_ups:Number($('#followUps').value||0),p_new_broker_accounts:Number($('#newBrokerAccounts').value||0),p_ib_partner_shifts:Number($('#ibPartnerShifts').value||0),p_xm_weekly_lots:Number($('#xmWeeklyLots').value||0),p_dprime_weekly_lots:Number($('#dprimeWeeklyLots').value||0),p_exness_weekly_lots:Number($('#exnessWeeklyLots').value||0),p_notes:$('#reportNotes').value.trim()||null};try{try{await rpc('team_submit_daily_report_v12_18',args)}catch(x){if(!/function|schema cache|does not exist/i.test(x.message||''))throw x;await rpc('team_submit_daily_report',{p_token:args.p_token,p_report_date:args.p_report_date,p_new_broker_accounts:args.p_new_broker_accounts,p_ib_partner_shifts:args.p_ib_partner_shifts,p_xm_weekly_lots:args.p_xm_weekly_lots,p_dprime_weekly_lots:args.p_dprime_weekly_lots,p_exness_weekly_lots:args.p_exness_weekly_lots,p_notes:args.p_notes})}toast('Daily report submitted.');await load()}catch(x){$('#dailyStatus').textContent=x.message||'Could not save report.';toast(x.message||'Could not save report.','error')}}
function renderDaily(){
  const reports=payload?.daily_reports||[], td=today(), r=reports.find(x=>x.date===td)||{};
  const dailySummary=$('#teamDailySummary');
  if(dailySummary){
    const manualTotal=Number(r.leads_contacted||0)+Number(r.messages_sent||0)+Number(r.calls_made||0)+Number(r.follow_ups||0);
    dailySummary.innerHTML=[
      ['Manual Actions',manualTotal,'fa-bolt','gold'],
      ['Leads Contacted',Number(r.leads_contacted||0),'fa-user-check','blue'],
      ['Follow-ups',Number(r.follow_ups||0),'fa-bell','amber'],
      ['Report',r.id?'Submitted':'Pending',r.id?'fa-circle-check':'fa-clock',r.id?'green':'neutral']
    ].map(x=>`<div class="team-daily-summary-card ${x[3]}"><span><i class="fa-solid ${x[2]}"></i></span><div><small>${x[0]}</small><b>${x[1]}</b></div></div>`).join('')
  }
  if($('#reportDate')) $('#reportDate').value=td;
  const set=(id,v)=>{const el=$(id);if(el)el.value=v??0};
  set('#leadsContacted',r.leads_contacted);set('#messagesSent',r.messages_sent);set('#callsMade',r.calls_made);set('#followUps',r.follow_ups);
  set('#newBrokerAccounts',r.new_broker_accounts);set('#ibPartnerShifts',r.ib_partner_shifts);
  set('#xmWeeklyLots',r.xm_lots);set('#dprimeWeeklyLots',r.dprime_lots);set('#exnessWeeklyLots',r.exness_lots);
  if($('#reportNotes')) $('#reportNotes').value=r.notes||'';
  if($('#dailyStatus')) $('#dailyStatus').textContent=r.id?'Submitted':'Not submitted';
  const p=payload?.performance||{}, clients=payload?.clients||[];
  const newToday=clients.filter(x=>sameDay(clientDate(x),td)).length;
  const auto=[['New assigned leads',newToday],['Course enrollments',Number(payload?.metrics?.enrollments||0)],['Approved course sales',money(p.course_sales||0)],['VIP conversions',Number(p.vip_count||0)]];
  if($('#autoActivity')) $('#autoActivity').innerHTML='<div class="auto-activity-grid">'+auto.map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')+'</div>';
  if($('#manualVip')) $('#manualVip').value=Number(p.vip_count||0);
  if($('#dailyReportsList')) $('#dailyReportsList').innerHTML=`<table><thead><tr><th>Date</th><th>Leads</th><th>Messages</th><th>Calls</th><th>Follow-ups</th><th>New Accounts</th><th>IB Shifts</th><th>XM</th><th>DPrime</th><th>Exness</th><th>Status</th></tr></thead><tbody>${reports.length?reports.map(x=>`<tr><td>${esc(x.date||'')}</td><td>${num(x.leads_contacted)}</td><td>${num(x.messages_sent)}</td><td>${num(x.calls_made)}</td><td>${num(x.follow_ups)}</td><td>${num(x.new_broker_accounts)}</td><td>${num(x.ib_partner_shifts)}</td><td>${num(x.xm_lots,1)}</td><td>${num(x.dprime_lots,1)}</td><td>${num(x.exness_lots,1)}</td><td>${esc(x.status||'submitted')}</td></tr>`).join(''):'<tr><td colspan="11">No daily reports yet.</td></tr>'}</tbody></table>`;
}
function progressCard(title,value,tier,nextText,pct,icon='fa-chart-line',tone='gold'){
  const safePct=Math.max(0,Math.min(100,Number(pct||0)));
  return `<article class="progress-card premium-progress-card ${tone}">
    <div class="premium-progress-head">
      <span class="premium-progress-icon"><i class="fa-solid ${icon}"></i></span>
      <div><small>COMMISSION LEVEL</small><h3>${title}</h3></div>
      <span class="rate-big">${tier}</span>
    </div>
    <div class="progress-meta"><span>Current progress</span><b>${esc(String(value))}</b></div>
    <div class="bar premium-progress-bar"><i style="width:${safePct}%"></i></div>
    <div class="next-copy"><i class="fa-solid ${safePct>=100?'fa-circle-check':'fa-arrow-trend-up'}"></i><span>${esc(nextText)}</span></div>
  </article>`
}
function renderEarnings(p){
  p=p||{};
  const total=Number(p.total_earnings||0),
    courseE=Number(p.course_earnings||0),
    vipE=Number(p.vip_earnings||0),
    lotE=Number(p.lot_earnings||0),
    selected=$('#teamMonth')?.value||monthNow(),
    projected=selectedMonthProjection(total);

  if($('#earningsHeroTotal'))$('#earningsHeroTotal').textContent=money(total);
  if($('#earningsProjected'))$('#earningsProjected').textContent=money(projected);
  if($('#earningsHeroMonth'))$('#earningsHeroMonth').textContent=monthLabel(selected);
  if($('#earningsRank')){
    $('#earningsRank').textContent=homeRank&&Number(homeRank.team_count)?`#${num(homeRank.rank)}`:'—';
    if($('#earningsRankMeta'))$('#earningsRankMeta').textContent=homeRank&&Number(homeRank.team_count)?`of ${num(homeRank.team_count)} team members`:'Live team position'
  }

  const totalSafe=Math.max(1,total),
    cards=[
      {label:'Course Earnings',value:courseE,sub:`${p.course_rate||0}% current rate`,icon:'fa-graduation-cap',tone:'blue',share:courseE/totalSafe*100},
      {label:'VIP Earnings',value:vipE,sub:`${p.vip_rate||0}% current rate`,icon:'fa-crown',tone:'purple',share:vipE/totalSafe*100},
      {label:'Lot Earnings',value:lotE,sub:`${num(p.total_lots,1)} monthly lots`,icon:'fa-chart-column',tone:'gold',share:lotE/totalSafe*100}
    ];
  $('#earningsCards').innerHTML=cards.map(x=>`<article class="earning-card premium-earning-card ${x.tone}">
    <div class="premium-earning-card-top"><span class="premium-earning-icon"><i class="fa-solid ${x.icon}"></i></span><em>${Math.round(Math.max(0,x.share))}%</em></div>
    <small>${x.label}</small>
    <b>${money(x.value)}</b>
    <span>${x.sub}</span>
    <i class="earning-share"><u style="width:${Math.max(x.value?6:0,Math.min(100,x.share))}%"></u></i>
  </article>`).join('');

  const c=tierCourse(Number(p.course_sales||0)),
    v=tierVip(Number(p.vip_count||0)),
    l=tierLots(Number(p.total_lots||0));

  $('#earningsProgress').innerHTML=
    progressCard(
      'Course Commission',
      `${num(p.course_sales,2)} paid value`,
      `${c.rate}%`,
      c.next?`Need ${num(Math.max(0,c.next-p.course_sales),2)} more value for ${c.nextRate}%`:'Top course level active',
      progressPct(p.course_sales,c.next,c.prev),
      'fa-graduation-cap','blue'
    )+
    progressCard(
      'VIP Commission',
      `${num(p.vip_count)} clients`,
      `${v.rate}%`,
      v.next?`Need ${num(Math.max(0,v.next-p.vip_count))} more VIP for ${v.nextRate}%`:'Top VIP level active',
      progressPct(p.vip_count,v.next,v.prev),
      'fa-crown','purple'
    )+
    progressCard(
      'Broker Lots',
      `${num(p.total_lots,1)} lots`,
      `$${num(l.std,1)}/lot`,
      l.next?`Need ${num(Math.max(0,l.next-p.total_lots),1)} lots for next level`:'Top lot level active',
      progressPct(p.total_lots,l.next,l.prev),
      'fa-chart-column','gold'
    );

  const brokers=[
    {name:'XM',lots:Number(p.xm_lots||0),rate:Number(p.xm_rate||0),earn:Number(p.xm_earnings||0),icon:'XM'},
    {name:'DPrime',lots:Number(p.dprime_lots||0),rate:Number(p.dprime_rate||0),earn:Number(p.dprime_earnings||0),icon:'DP'},
    {name:'Exness',lots:Number(p.exness_lots||0),rate:Number(p.exness_rate||0),earn:Number(p.exness_earnings||0),icon:'EX'}
  ];
  const maxLots=Math.max(1,...brokers.map(b=>b.lots));
  if($('#earningsLotsTotal'))$('#earningsLotsTotal').textContent=`${num(p.total_lots,1)} lots`;
  $('#brokerGrid').innerHTML=brokers.map(b=>`<article class="broker-card premium-broker-card">
    <div class="premium-broker-head">
      <span class="premium-broker-logo">${b.icon}</span>
      <div><small>BROKER</small><b>${b.name}</b></div>
      <span class="rate">$${num(b.rate,1)}/lot</span>
    </div>
    <div class="broker-stats">
      <div><span>Lots</span><b>${num(b.lots,1)}</b></div>
      <div><span>Earnings</span><b>${money(b.earn)}</b></div>
    </div>
    <span class="premium-broker-progress"><i style="width:${Math.max(b.lots?7:0,Math.round(b.lots/maxLots*100))}%"></i></span>
  </article>`).join('');
  requestAnimationFrame(()=>{
    ['#earningsCards','#earningsProgress','#brokerGrid'].forEach(sel=>{const el=$(sel);if(el)el.scrollLeft=0})
  })
}

function datesForPreset(preset){const now=new Date(),iso=d=>d.toISOString().slice(0,10);if(preset==='today')return[iso(now),iso(now)];if(preset==='yesterday'){const d=new Date(now);d.setDate(d.getDate()-1);return[iso(d),iso(d)]}if(preset==='7'){const d=new Date(now);d.setDate(d.getDate()-6);return[iso(d),iso(now)]}if(preset==='lastmonth'){const s=new Date(now.getFullYear(),now.getMonth()-1,1),e=new Date(now.getFullYear(),now.getMonth(),0);return[iso(s),iso(e)]}return[iso(now),iso(now)]}
async function loadRange(preset,start,end){try{if(preset!=='custom')[start,end]=datesForPreset(preset);rangeData=await rpc('team_get_range_metrics',{p_token:token(),p_start:start,p_end:end});rangeData._start=start;rangeData._end=end;renderRange();renderLinks(payload?.links||[]);$$('[data-range]').forEach(b=>b.classList.toggle('active',b.dataset.range===preset))}catch(e){console.warn(e);toast('Performance range could not load.','error')}}
function inRange(v){if(!rangeData?._start||!v)return false;const s=String(v).slice(0,10);return s>=rangeData._start&&s<=rangeData._end}
function renderRange(){const m=rangeData?.metrics||{},clients=payload.clients||[],assigned=clients.filter(c=>inRange(clientDate(c))),contacted=assigned.filter(c=>clientStatus(c)!=='new').length,converted=assigned.filter(c=>clientStatus(c)==='converted').length,follow=clients.filter(c=>clientStatus(c)==='follow_up').length;const cards=[['Leads Assigned',assigned.length],['Contacted',contacted],['Course Enrollments',m.enrollments||0],['Converted',converted],['Conversion',assigned.length?num(100*converted/assigned.length,1)+'%':'0.0%'],['Follow-ups',follow]];$('#rangeKpis').innerHTML=cards.map(x=>`<article class="kpi-card"><span>${x[0]}</span><b>${x[1]}</b></article>`).join('');const vals=[['Assigned',assigned.length],['Contacted',contacted],['Interested',assigned.filter(c=>clientStatus(c)==='interested').length],['Follow-up',assigned.filter(c=>clientStatus(c)==='follow_up').length],['Converted',converted]];$('#funnel').innerHTML=vals.map((x,i)=>`<div class="reference-funnel-row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');const course={};clients.forEach(c=>(c.enrollments||[]).forEach(e=>{const n=e.course_title||'Course';course[n]=(course[n]||0)+1}));$('#coursePerformance').innerHTML=Object.entries(course).slice(0,6).map(([k,v])=>`<div><span>${esc(k)}</span><b>${v}</b></div>`).join('')||'<div><span>No Course Activity</span><b>0</b></div>';const p=payload.performance||{},r=(payload.daily_reports||[]).find(x=>x.date===today())||{};$('#brokerActivity').innerHTML=[['New Broker Accounts',r.new_broker_accounts||0],['IB Shifts',r.ib_partner_shifts||0],['XM / DPrime / Exness',`${num(p.xm_lots,1)} / ${num(p.dprime_lots,1)} / ${num(p.exness_lots,1)}`],['Lots',num(p.total_lots,1)]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');$('#needsAttention').innerHTML=[['New / Untouched',clients.filter(c=>clientStatus(c)==='new').length],['Follow-up Due',clients.filter(c=>clientStatus(c)==='follow_up'||c.next_follow_up&&String(c.next_follow_up).slice(0,10)<=today()).length],['Interested',clients.filter(c=>clientStatus(c)==='interested').length],['Not Interested',clients.filter(c=>clientStatus(c)==='inactive').length]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');const l=rangeData?.links||[];$('#rangeLinks').innerHTML=`<table><thead><tr><th>Source / Link</th><th>Clicks</th><th>Unique</th><th>Signups</th><th>Enrollments</th><th>Conversion</th></tr></thead><tbody>${l.length?l.map(x=>`<tr><td><b>${esc(x.name||'')}</b><small>${esc(x.ref_code||'')}</small></td><td>${num(x.clicks)}</td><td>${num(x.unique)}</td><td>${num(x.signups)}</td><td>${num(x.enrollments)}</td><td>${num(x.conversion,2)}%</td></tr>`).join(''):'<tr><td colspan="6">No activity for this date range.</td></tr>'}</tbody></table>`}
function renderHistory(h){const clients=payload.clients||[],p=payload.performance||{};$('#historyKpis').innerHTML=[['Historical Clients',clients.length],['Converted Clients',clients.filter(c=>clientStatus(c)==='converted').length],['Broker Lots',num(p.total_lots,1)],['Earnings Since Sep 2026',money(p.total_earnings)]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');const rows=(h||[]).slice().reverse();$('#historyGrid').innerHTML=`<table><thead><tr><th>Month</th><th>Course Sales</th><th>VIP</th><th>Broker Lots</th><th>Total Earnings</th></tr></thead><tbody>${rows.length?rows.map(x=>{const before=String(x.month).slice(0,7)<'2026-09';return `<tr><td>${esc(monthLabel(String(x.month).slice(0,7)))}</td><td>${money(x.course_sales)}</td><td>${num(x.vip_count)}</td><td>${num(x.lots,1)}</td><td>${before?'<span class="status">Settled</span>':`<b>${money(x.earnings)}</b>`}</td></tr>`}).join(''):'<tr><td colspan="5">No monthly history yet.</td></tr>'}</tbody></table>`;$('#historyLinks').innerHTML=(payload.links||[]).length?(payload.links||[]).map(l=>`<div class="overview-link-chip"><b>${esc(l.name||'Tracked Link')}</b><small>${esc(l.ref_code||'')} · ${esc(l.source||'Direct')}</small></div>`).join(''):'<span class="muted">No legacy links.</span>'}
function siteRoot(){return(location.origin+(cfg.SITE_BASE_PATH||'/')).replace(/\/$/,'')}
function trackedUrl(l){const dest=l.destination_path==='/'?'':String(l.destination_path||'').replace(/\/$/,'');const q=new URLSearchParams();if(l.ref_code)q.set('ref',l.ref_code);if(l.source)q.set('source',l.source);if(l.campaign)q.set('campaign',l.campaign);return `${siteRoot()}${dest}/?${q}`}
function renderLinks(links){
  const metrics=rangeData?.links||[];
  const totalClicks=metrics.reduce((s,x)=>s+Number(x.clicks||0),0),
    totalUnique=metrics.reduce((s,x)=>s+Number(x.unique||0),0),
    totalSignups=metrics.reduce((s,x)=>s+Number(x.signups||0),0),
    totalEnrollments=metrics.reduce((s,x)=>s+Number(x.enrollments||0),0);
  if($('#teamLinksSummary'))$('#teamLinksSummary').innerHTML=[
    ['Links',links.length,'fa-link','gold'],
    ['Clicks',totalClicks,'fa-arrow-pointer','blue'],
    ['Signups',totalSignups,'fa-user-plus','green'],
    ['Enrollments',totalEnrollments,'fa-graduation-cap','purple']
  ].map(x=>`<div class="team-links-summary-card ${x[3]}"><span><i class="fa-solid ${x[2]}"></i></span><div><small>${x[0]}</small><b>${x[1]}</b></div></div>`).join('');
  if($('#teamLinksMeta'))$('#teamLinksMeta').textContent=`${links.length} link${links.length===1?'':'s'}`;
  $('#linksGrid').innerHTML=links.length?links.map(l=>{
    const lm=metrics.find(x=>x.link_id===l.id)||{},url=trackedUrl(l);
    return `<article class="link-card premium-link-card">
      <div class="link-head">
        <div class="premium-link-title"><span><i class="fa-solid fa-link"></i></span><div><b>${esc(l.name||'Tracked Link')}</b><small>${esc(l.source||'Direct')} · ${esc(l.ref_code||'')}</small></div></div>
        <span class="status">${l.is_active===false?'Disabled':'Active'}</span>
      </div>
      <div class="tracked-url premium-tracked-url"><input readonly value="${esc(url)}"><button class="icon-btn" data-copy="${esc(url)}" aria-label="Copy link"><i class="fa-solid fa-copy"></i></button></div>
      <div class="mini-metrics premium-link-metrics">
        <div><b>${num(lm.clicks)}</b><span>Clicks</span></div>
        <div><b>${num(lm.unique)}</b><span>Unique</span></div>
        <div><b>${num(lm.signups)}</b><span>Signups</span></div>
        <div><b>${num(lm.enrollments)}</b><span>Enrollments</span></div>
      </div>
    </article>`
  }).join(''):`<article class="team-tool-empty"><span><i class="fa-solid fa-link"></i></span><div><b>No assigned tracking links</b><small>Links assigned by Admin will appear here automatically.</small></div></article>`;
  $$('[data-copy]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.copy||'').then(()=>toast('Link copied.')))
}

function renderChatSummary(summary={}){
  const cards=[
    {label:'AI Active',value:Number(summary.ai_active||0),icon:'fa-robot',tone:'blue',sub:'Handled by AI'},
    {label:'Human Requests',value:Number(summary.human_requests||0),icon:'fa-hand',tone:'amber',sub:'Needs takeover'},
    {label:'Waiting',value:Number(summary.waiting||0),icon:'fa-clock',tone:'red',sub:'Needs reply'},
    {label:'My Chats',value:Number(summary.my_chats||0),icon:'fa-comments',tone:'green',sub:'Assigned to you'}
  ];
  const box=$('#chatKpis');
  if(box)box.innerHTML=cards.map(x=>`<article class="chat-kpi premium-chat-kpi ${x.tone}"><span class="chat-kpi-icon"><i class="fa-solid ${x.icon}"></i></span><div><small>${x.label}</small><b>${x.value}</b><em>${x.sub}</em></div></article>`).join('');
  const attention=Number(summary.human_requests||0)+Number(summary.waiting||0);
  const label=$('#chatAttentionLabel');
  if(label)label.textContent=attention?`${attention} need attention`:'All clear';
  if($('#chatFilterMine'))$('#chatFilterMine').textContent=Number(summary.my_chats||0);
  if($('#chatFilterWaiting'))$('#chatFilterWaiting').textContent=Number(summary.human_requests||0)+Number(summary.waiting||0)
}
function setChatShellState(state='list'){
  const shell=$('#teamChatShell');if(!shell)return;
  shell.classList.toggle('chat-open',state==='chat');
  shell.classList.toggle('profile-open',state==='profile');
  shell.classList.toggle('no-active',!activeThread)
}
async function loadChat(){
  if(!token())return;
  try{
    const [summary,list]=await Promise.all([
      rpc('team_live_desk_summary_v12_18',{p_token:token()}),
      rpc('team_live_desk_list_v12_18',{p_token:token(),p_filter:chatFilter,p_search:chatSearch||null})
    ]);
    chatList=list||[];
    renderChatSummary(summary||{});
    const attention=Number(summary?.human_requests||0)+Number(summary?.waiting||0);
    homeChatAttention=attention;
    $('#teamChatBadge').hidden=!attention;$('#teamChatBadge').textContent=attention;
    setMobileBadge('#teamMobileChatBadge',attention);
    if($('#chatInboxMeta'))$('#chatInboxMeta').textContent=`${chatList.length} conversation${chatList.length===1?'':'s'}`;
    if($('#chatFilterAll')&&chatFilter==='all')$('#chatFilterAll').textContent=chatList.length;
    if($('#chatSearchClear'))$('#chatSearchClear').hidden=!String(chatSearch||'').trim();
    renderChatList();

    const mobile=window.matchMedia?.('(max-width:900px)').matches;
    if(activeThread&&chatList.some(x=>String(x.id)===String(activeThread))){
      await openChat(activeThread,false);
      if(mobile)setChatShellState('chat')
    }else if(chatList[0]&&!mobile){
      await openChat(chatList[0].id,false)
    }else{
      clearChat()
    }
  }catch(e){
    if(/function|does not exist|schema cache/i.test(e.message||'')){
      if($('#chatKpis'))$('#chatKpis').innerHTML='<div class="team-chat-service-error"><i class="fa-solid fa-triangle-exclamation"></i><div><b>Live Desk unavailable</b><small>Chat service needs the latest database update.</small></div></div>';
      return
    }
    throw e
  }
}
function renderChatList(){
  const box=$('#chatThreads');if(!box)return;
  if(!chatList.length){
    box.innerHTML=`<div class="team-chat-list-empty"><span><i class="fa-regular fa-comments"></i></span><div><b>No conversations here</b><small>${chatSearch?'Try another search or clear filters.':'New support conversations will appear automatically.'}</small></div></div>`;
    return
  }
  box.innerHTML=chatList.map(t=>{
    const waiting=String(t.status||'').toLowerCase()==='waiting',
      closed=['closed','resolved'].includes(String(t.status||'').toLowerCase()),
      priority=String(t.priority||'normal').toLowerCase(),
      mode=t.mode==='human'?'HUMAN':'AI';
    return `<button type="button" class="chat-thread premium-chat-thread ${String(t.id)===String(activeThread)?'active':''} ${waiting?'waiting':''}" data-thread="${t.id}">
      <span class="chat-avatar">${esc(initials(t.name))}<i class="${t.mode==='human'?'human':'ai'}"></i></span>
      <span class="chat-thread-copy">
        <span class="chat-thread-title"><b>${esc(t.name||'Visitor')}</b><em class="chat-mode ${t.mode==='human'?'human':''}">${mode}</em></span>
        <p>${esc(t.last_message||'No message yet')}</p>
        <span class="chat-thread-meta">${esc(t.whatsapp||t.email||'Website visitor')}${priority!=='normal'?` · ${esc(priority)} priority`:''}</span>
      </span>
      <span class="chat-thread-side"><small>${esc(relativeAgo(t.last_message_at)||'—')}</small>${waiting?'<em class="waiting-dot">WAITING</em>':closed?'<em class="closed-dot">CLOSED</em>':''}</span>
    </button>`
  }).join('')
}
function clearChat(){
  activeThread=null;
  setChatShellState('list');
  const head=$('#chatConversationHead');
  if(head)head.innerHTML=`<button type="button" class="chat-mobile-back" data-chat-mobile-back aria-label="Back to inbox"><i class="fa-solid fa-arrow-left"></i></button><div class="chat-conversation-placeholder-title"><b>Select a conversation</b><small>Live Desk</small></div>`;
  const messages=$('#chatMessages');
  if(messages)messages.innerHTML=`<div class="team-chat-empty-state"><span><i class="fa-regular fa-comments"></i></span><div><b>No conversation selected</b><small>Choose a conversation from your inbox to start working.</small></div></div>`;
  const profile=$('#chatProfile');
  if(profile)profile.innerHTML=`<button type="button" class="team-chat-profile-close" data-chat-profile-close aria-label="Close lead profile"><i class="fa-solid fa-xmark"></i></button><div class="team-chat-empty-state profile-empty"><span><i class="fa-regular fa-address-card"></i></span><div><b>Lead profile</b><small>Select a conversation to see contact and sales-stage details.</small></div></div>`;
  if($('#chatReply')){$('#chatReply').value='';$('#chatReply').disabled=true}
  const send=$('#chatReplyForm button[type=submit]');if(send)send.disabled=true
}
async function openChat(id,rerender=true){
  activeThread=id;
  const d=await rpc('team_live_desk_get_v12_18',{p_token:token(),p_thread_id:id}),t=d.thread||{},msgs=d.messages||[];
  if(rerender)renderChatList();
  setChatShellState('chat');
  if($('#chatReply'))$('#chatReply').disabled=false;
  const send=$('#chatReplyForm button[type=submit]');if(send)send.disabled=false;

  $('#chatConversationHead').innerHTML=`
    <button type="button" class="chat-mobile-back" data-chat-mobile-back aria-label="Back to inbox"><i class="fa-solid fa-arrow-left"></i></button>
    <div class="team-chat-person">
      <span class="team-chat-person-avatar">${esc(initials(t.name))}</span>
      <div><b>${esc(t.name||'Visitor')}</b><small>${esc(t.whatsapp||t.email||'Website visitor')} · ${t.assigned_team_id?'Human handling':'AI / Unassigned'}</small></div>
    </div>
    <div class="conversation-actions">
      <button type="button" class="profile" data-chat-profile-toggle><i class="fa-regular fa-address-card"></i></button>
      ${!t.assigned_team_id?'<button class="primary" data-chat-action="takeover">Take Over</button>':'<button data-chat-action="waiting">Waiting</button><button data-chat-action="release">Release</button>'}
      <button class="danger" data-chat-action="close"><i class="fa-solid fa-xmark"></i><span>Close</span></button>
    </div>`;

  $('#chatMessages').innerHTML=msgs.length?msgs.map(m=>{
    const sender=String(m.sender_type||'visitor').toLowerCase(),
      mine=['team','admin'].includes(sender),
      ai=sender==='ai';
    return `<div class="desk-msg premium-desk-msg ${esc(sender)}">
      <div>${esc(m.message||'')}</div>
      <small><span>${mine?'You':ai?'24K AI':'Visitor'}</span><em>${esc(relativeAgo(m.created_at)||dt(m.created_at))}</em></small>
    </div>`
  }).join(''):`<div class="team-chat-empty-state messages-empty"><span><i class="fa-regular fa-message"></i></span><div><b>No messages yet</b><small>This conversation has no message history yet.</small></div></div>`;
  $('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;

  const stage=String(t.sales_stage||'new'),priority=String(t.priority||'normal');
  $('#chatProfile').innerHTML=`
    <button type="button" class="team-chat-profile-close" data-chat-profile-close aria-label="Close lead profile"><i class="fa-solid fa-xmark"></i></button>
    <div class="team-chat-profile-hero">
      <span class="profile-avatar">${esc(initials(t.name))}</span>
      <div class="profile-name"><b>${esc(t.name||'Visitor')}</b><small>${t.user_id?'Existing 24K User':'Website Lead'}</small></div>
      <span class="team-chat-profile-status"><i></i>${esc(t.status||'open')}</span>
    </div>
    <div class="profile-section team-chat-contact-section">
      <h4>Lead Profile</h4>
      <div class="profile-line"><span><i class="fa-brands fa-whatsapp"></i> WhatsApp</span><b>${esc(t.whatsapp||'—')}</b></div>
      <div class="profile-line"><span><i class="fa-regular fa-envelope"></i> Email</span><b>${esc(t.email||'—')}</b></div>
      <div class="profile-line"><span><i class="fa-regular fa-clock"></i> Started</span><b>${esc(relativeAgo(t.created_at)||dt(t.created_at))}</b></div>
    </div>
    <div class="profile-section team-chat-stage-section">
      <h4>Sales / Support Stage</h4>
      <label><span>Stage</span><select id="chatStage"><option ${stage==='new'?'selected':''}>new</option><option ${stage==='contacted'?'selected':''}>contacted</option><option ${stage==='interested'?'selected':''}>interested</option><option ${stage==='follow_up'?'selected':''}>follow_up</option><option ${stage==='converted'?'selected':''}>converted</option><option ${stage==='support'?'selected':''}>support</option></select></label>
      <label><span>Priority</span><select id="chatPriority"><option ${priority==='normal'?'selected':''}>normal</option><option ${priority==='high'?'selected':''}>high</option><option ${priority==='urgent'?'selected':''}>urgent</option></select></label>
      <label><span>Tags</span><input id="chatTags" value="${esc(t.tags||'')}" placeholder="course, broker, VIP"></label>
      <button type="button" class="team-chat-save-meta" id="saveChatMeta"><i class="fa-solid fa-check"></i> Save Stage</button>
    </div>`;
  $('#saveChatMeta')?.addEventListener('click',saveChatMeta)
}
async function chatAction(action){
  if(!activeThread)return;
  try{
    await rpc('team_live_desk_action_v12_18',{p_token:token(),p_thread_id:activeThread,p_action:action,p_stage:null,p_priority:null,p_tags:null});
    toast('Conversation updated.');
    await loadChat()
  }catch(e){toast(e.message||'Could not update conversation.','error')}
}
async function saveChatMeta(){
  if(!activeThread)return;
  try{
    await rpc('team_live_desk_action_v12_18',{p_token:token(),p_thread_id:activeThread,p_action:'meta',p_stage:$('#chatStage')?.value||'new',p_priority:$('#chatPriority')?.value||'normal',p_tags:$('#chatTags')?.value||''});
    toast('Chat stage saved.');
    await openChat(activeThread,false)
  }catch(e){toast(e.message||'Could not save chat stage.','error')}
}
async function sendChat(e){
  e.preventDefault();
  if(!activeThread)return toast('Select a conversation.','error');
  const input=$('#chatReply'),msg=input.value.trim();if(!msg)return;
  const btn=e.currentTarget.querySelector('button[type=submit]');if(btn)btn.disabled=true;
  try{
    await rpc('team_live_desk_send_v12_18',{p_token:token(),p_thread_id:activeThread,p_message:msg});
    input.value='';
    await openChat(activeThread,false);
    await loadChat()
  }catch(e){toast(e.message||'Take over the chat before replying.','error')}
  finally{if(btn)btn.disabled=false}
}

function bind(){monthOptions();applyTheme(currentTheme());
const homeSearch=$('#teamHomeSearch');
if(homeSearch){
  homeSearch.addEventListener('input',()=>renderHomeSearch(homeSearch.value));
  homeSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const first=$('#teamHomeSearchResults [data-home-client]');if(first)first.click();else $('#teamHomeSearchAll')?.click()}})
}
$('#teamHomeSearchAll')?.addEventListener('click',()=>{const q=String($('#teamHomeSearch')?.value||'').trim();if(!q)return;setView('search');if($('#ownershipSearch'))$('#ownershipSearch').value=q;searchOwnership()});
$('#teamMoreInstall')?.addEventListener('click',()=>$('#teamInstallButton')?.click());
$('#teamMoreRefresh')?.addEventListener('click',()=>$('#teamRefresh')?.click());
$('#teamMoreTheme')?.addEventListener('click',()=>$('#teamTheme')?.click());
$('#teamMoreLogout')?.addEventListener('click',()=>$('#teamLogout')?.click());
window.addEventListener('online',updateSyncStatus);window.addEventListener('offline',updateSyncStatus);
setInterval(updateSyncStatus,30000);$('#teamLoginForm')?.addEventListener('submit',login);$('#teamLogout').onclick=logout;$('#teamTheme').onclick=()=>applyTheme(currentTheme()==='dark'?'light':'dark');$('#teamThemeTop').onclick=()=>$('#teamTheme').click();$('#teamRefresh').onclick=load;$('#teamMonth').onchange=load;$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.addEventListener('click',e=>{const jump=e.target.closest('[data-view-jump]');if(jump)setView(jump.dataset.viewJump);const hc=e.target.closest('[data-home-client]');if(hc){const c=(payload?.clients||[]).find(x=>String(x.id)===String(hc.dataset.homeClient));if(c){setView('clients');if($('#clientSearch'))$('#clientSearch').value=c.full_name||c.client_id||'';renderClients()}return}const hs=e.target.closest('[data-home-search-all]');if(hs){$('#teamHomeSearchAll')?.click();return}const cre=e.target.closest('[data-client-reset-empty]');if(cre){$('#clientResetFilters')?.click();return}const col=e.target.closest('[data-home-collapse]');if(col){const target=$('#'+col.dataset.homeCollapse);if(target){const collapsed=target.classList.toggle('home-collapsed');col.classList.toggle('open',!collapsed);col.setAttribute('aria-expanded',String(!collapsed))}return}const s=e.target.closest('[data-save-client]');if(s)saveClient(s.dataset.saveClient);const n=e.target.closest('[data-note-client]');if(n)saveClient(n.dataset.noteClient,true);const th=e.target.closest('[data-thread]');if(th)openChat(th.dataset.thread).catch(x=>toast(x.message,'error'));const ac=e.target.closest('[data-chat-action]');if(ac)chatAction(ac.dataset.chatAction);
const cb=e.target.closest('[data-chat-mobile-back]');if(cb){setChatShellState('list');return}
const pt=e.target.closest('[data-chat-profile-toggle]');if(pt){setChatShellState('profile');return}
const pc=e.target.closest('[data-chat-profile-close]');if(pc){setChatShellState(activeThread?'chat':'list');return}const qr=e.target.closest('[data-quick-reply]');if(qr&&$('#chatReply'))$('#chatReply').value=qr.dataset.quickReply});$('#clientSearch').oninput=renderClients;
$('#clientCourseFilter').onchange=renderClients;
$('#clientStatusFilter').onchange=renderClients;
$('#clientSort').onchange=renderClients;
$('#clientSearchClear')?.addEventListener('click',()=>{if($('#clientSearch'))$('#clientSearch').value='';renderClients();$('#clientSearch')?.focus()});
$('#clientFilterToggle')?.addEventListener('click',()=>{const p=$('#clientFilterPanel'),b=$('#clientFilterToggle');if(!p)return;const open=p.hidden;p.hidden=!open;b?.setAttribute('aria-expanded',String(open))});
$('#clientResetFilters')?.addEventListener('click',()=>{if($('#clientSearch'))$('#clientSearch').value='';if($('#clientCourseFilter'))$('#clientCourseFilter').value='all';if($('#clientStatusFilter'))$('#clientStatusFilter').value='all';if($('#clientSort'))$('#clientSort').value='priority';renderClients()});
$('#clientStatusTabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-client-status-chip]');if(!b)return;if($('#clientStatusFilter'))$('#clientStatusFilter').value=b.dataset.clientStatusChip;renderClients()});$('#ownershipSearchBtn').onclick=searchOwnership;$('#ownershipSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchOwnership()}});$('#dailyReportForm').onsubmit=saveDaily;$$('[data-range]').forEach(b=>b.onclick=()=>{if(b.dataset.range==='custom')$('#customRange').classList.remove('hidden');else{$('#customRange').classList.add('hidden');loadRange(b.dataset.range)}});$('#applyRange').onclick=()=>loadRange('custom',$('#rangeStart').value,$('#rangeEnd').value);$$('[data-chat-filter]').forEach(b=>b.onclick=()=>{chatFilter=b.dataset.chatFilter;$$('[data-chat-filter]').forEach(x=>x.classList.toggle('active',x===b));loadChat().catch(x=>toast(x.message,'error'))});let chatTimer;$('#chatSearch').oninput=()=>{if($('#chatSearchClear'))$('#chatSearchClear').hidden=!$('#chatSearch').value.trim();clearTimeout(chatTimer);chatTimer=setTimeout(()=>{chatSearch=$('#chatSearch').value.trim();loadChat().catch(()=>{})},250)};$('#chatReplyForm').onsubmit=sendChat;
$('#chatInboxRefresh')?.addEventListener('click',()=>loadChat().catch(e=>toast(e.message||'Could not refresh chat.','error')));
$('#chatSearchClear')?.addEventListener('click',()=>{chatSearch='';if($('#chatSearch'))$('#chatSearch').value='';loadChat().catch(()=>{})});window.addEventListener('hashchange',()=>setView(location.hash.replace('#','')||'overview'));window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#teamInstallButton')?.classList.add('ready');$('#teamMobileInstall')?.classList.add('ready')});window.addEventListener('appinstalled',()=>{installPrompt=null;$('#teamInstallButton')?.classList.add('installed');$('#teamMobileInstall')?.classList.add('installed');toast('24K Team Panel installed successfully.','success')});$('#teamInstallButton').onclick=async()=>{if(window.matchMedia?.('(display-mode: standalone)').matches)return toast('Team Panel is already installed.','success');if(installPrompt){installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice?.outcome==='accepted')toast('Installing Team Panel…','success');installPrompt=null}else toast('Install is not offered yet. Use your browser menu → Add to Home screen / Install app.')}}
bind();if(!supa)return loginView('Website connection is unavailable. Please contact support.');setView(location.hash.replace('#','')||'overview');if(token())load();
})();

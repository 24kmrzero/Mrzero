(function(){
'use strict';
const cfg=window.APP_CONFIG||{};
const supa=(window.supabase&&window.supabase.createClient&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const TOKEN_KEY='24k_team_token';
const THEME_KEY='24k_team_theme';
const $=(s,r=document)=>r.querySelector(s);
const money=n=>'$'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const num=(n,d=0)=>Number(n||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const monthValue=()=>new Date().toISOString().slice(0,7);
function monthDate(v){return (v||monthValue())+'-01'}

function readTheme(){
  const saved=localStorage.getItem(THEME_KEY);
  if(saved==='light'||saved==='dark')return saved;
  return window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
}
function applyTheme(theme){
  const value=theme==='light'?'light':'dark';
  document.documentElement.dataset.theme=value;
  localStorage.setItem(THEME_KEY,value);
  const btn=$('#tpTheme');
  if(btn){btn.innerHTML=value==='light'?'☾':'☀';btn.title=value==='light'?'Switch to dark theme':'Switch to light theme';btn.setAttribute('aria-label',btn.title)}
}
function toggleTheme(){applyTheme(readTheme()==='light'?'dark':'light')}
applyTheme(readTheme());

// Commission brackets reflect the board rules. `next` is the next milestone,
// not the upper bound after it, so the UI never skips a level.
function courseTier(v){v=Number(v||0);if(v<=100)return{rate:3,next:100,nextRate:4};if(v<=200)return{rate:4,next:200,nextRate:5};if(v<=300)return{rate:5,next:300,nextRate:7};return{rate:7,next:null,nextRate:null}}
function vipTier(v){v=Number(v||0);if(v<=20)return{rate:3,next:20,nextRate:4};if(v<=40)return{rate:4,next:40,nextRate:5};if(v<=60)return{rate:5,next:60,nextRate:7};if(v<=80)return{rate:7,next:80,nextRate:10};return{rate:10,next:null,nextRate:null}}
function lotTier(v,ex){v=Number(v||0);const rates=ex?[.3,.5,.7,1]:[1,1.3,1.5,2];if(v<=200)return{rate:rates[0],next:200,nextRate:rates[1]};if(v<=400)return{rate:rates[1],next:400,nextRate:rates[2]};if(v<=600)return{rate:rates[2],next:600,nextRate:rates[3]};return{rate:rates[3],next:null,nextRate:null}}
function progress(current,next,previous){if(!next)return 100;const start=Number(previous||0),span=Math.max(next-start,1);return Math.max(0,Math.min(100,((Number(current||0)-start)/span)*100))}
function prevThreshold(kind,current){
  const v=Number(current||0);
  if(kind==='course'){if(v<=100)return 0;if(v<=200)return 100;if(v<=300)return 200;return 300}
  if(kind==='vip'){if(v<=20)return 0;if(v<=40)return 20;if(v<=60)return 40;if(v<=80)return 60;return 80}
  if(v<=200)return 0;if(v<=400)return 200;if(v<=600)return 400;return 600;
}
function remainingText(current,tier,unit,nextRate){
  if(!tier.next)return '<b>Top level unlocked</b> · highest commission rate active';
  const remain=Math.max(0,Number(tier.next)-Number(current||0));
  if(remain<=0)return `<b>Milestone reached</b> · next activity moves you to ${esc(nextRate)}`;
  return `Need <b>${num(remain,unit==='lots'?1:0)} more ${esc(unit)}</b> to reach ${esc(nextRate)}`;
}
function renderProgressCard(title,current,tier,unit,earn,kind){
  const prev=prevThreshold(kind,current),pct=progress(current,tier.next,prev);
  const nextRate=tier.nextRate!=null?(kind==='lots'?tier.nextRate+' / lot':tier.nextRate+'%'):'Top tier';
  return `<article class="tp-card tp-progress-card"><div class="tp-progress-head"><div><h3>${esc(title)}</h3><span class="tp-mini">${num(current,unit==='lots'?1:0)} ${esc(unit)}</span></div><div class="tp-rate">${tier.rate}${kind==='lots'?' / lot':'%'}</div></div><div class="tp-progress-values"><span>Current level earnings</span><b>${money(earn)}</b></div><div class="tp-track"><div class="tp-fill" style="width:${pct.toFixed(1)}%"></div></div><div class="tp-next">${remainingText(current,tier,unit,nextRate)}</div></article>`;
}
function renderOverallLotsCard(p,stdTier,exTier){
  const total=Number(p.total_lots||0),prev=prevThreshold('lots',total),pct=progress(total,stdTier.next,prev);
  const remain=stdTier.next?Math.max(0,stdTier.next-total):0;
  const nextLine=stdTier.next
    ? (remain<=0
      ? `<b>Milestone reached</b> · next activity unlocks XM/DPrime ${stdTier.nextRate}/lot and Exness ${exTier.nextRate}/lot`
      : `Need <b>${num(remain,1)} more overall lots</b> to unlock XM/DPrime ${stdTier.nextRate}/lot · Exness ${exTier.nextRate}/lot`)
    : '<b>Top lot level unlocked</b> · highest broker rates active';
  return `<article class="tp-card tp-progress-card tp-lots-level"><div class="tp-progress-head"><div><h3>Overall Lots Level</h3><span class="tp-mini">${num(total,1)} combined lots · XM + DPrime + Exness</span></div><div class="tp-dual-rate"><span>XM / DPrime <b>${stdTier.rate}/lot</b></span><span>Exness <b>${exTier.rate}/lot</b></span></div></div><div class="tp-progress-values"><span>Shared level progress</span><b>${money(p.lot_earnings)}</b></div><div class="tp-track tp-track-lg"><div class="tp-fill" style="width:${pct.toFixed(1)}%"></div><i class="tp-progress-light"></i></div><div class="tp-next">${nextLine}</div></article>`;
}
async function rpc(name,args){if(!supa)throw new Error('Supabase is not available.');const {data,error}=await supa.rpc(name,args||{});if(error)throw error;return data}

function loginView(msg){
  document.body.innerHTML=`<main class="tp-login"><button class="tp-floating-theme" id="tpTheme" type="button" title="Toggle theme">☀</button><section class="tp-card tp-login-card"><img class="tp-login-logo" src="/assets/img/logo.png" onerror="this.src='/logo.png'" alt="24K"><h1>Team Performance</h1><p>Secure access to your assigned performance dashboard.</p><form id="teamLogin"><div class="tp-field"><label>USERNAME</label><input class="tp-input" id="teamUser" autocomplete="username" required></div><div class="tp-field"><label>PASSWORD</label><input class="tp-input" id="teamPass" type="password" autocomplete="current-password" required></div><div class="tp-error" id="teamErr"></div><button class="tp-btn gold" type="submit">Sign In to Team Panel</button></form></section></main>`;
  applyTheme(readTheme());
  $('#tpTheme').onclick=toggleTheme;
  if(msg){const e=$('#teamErr');e.style.display='block';e.textContent=msg}
  $('#teamLogin').addEventListener('submit',async e=>{
    e.preventDefault();const btn=e.submitter,err=$('#teamErr');err.style.display='none';btn.disabled=true;btn.textContent='Signing in...';
    try{const d=await rpc('team_login',{p_username:$('#teamUser').value.trim(),p_password:$('#teamPass').value});localStorage.setItem(TOKEN_KEY,d.token);await loadDashboard()}
    catch(x){err.style.display='block';err.textContent=x.message||'Login failed.';btn.disabled=false;btn.textContent='Sign In to Team Panel'}
  });
}
function loadingView(){document.body.innerHTML='<div class="tp-loading"><div><div class="tp-spinner"></div><div>Loading Team Performance...</div></div></div>'}

function brokerCard(name,lots,rate,earn,totalLots,stdTier,exTier){
  const isEx=name==='Exness';
  const tier=isEx?exTier:stdTier;
  const prev=prevThreshold('lots',totalLots),pct=progress(totalLots,tier.next,prev);
  const next=tier.next?Math.max(0,tier.next-Number(totalLots||0)):0;
  const nextMsg=tier.next
    ? (next<=0?'<b>Shared milestone reached</b> · next activity upgrades this rate':`Need <b>${num(next,1)} more overall lots</b> for ${tier.nextRate}/lot`)
    : '<b>Top shared lot level unlocked</b>';
  return `<div class="tp-broker"><div class="tp-broker-top"><h4>${esc(name)}</h4><span class="tp-badge">${rate}/lot</span></div><div class="earn">${money(earn)}</div><div class="tp-mini">${num(lots,1)} contributed lots · shared level ${num(totalLots,1)}</div><div class="tp-track" style="margin-top:12px"><div class="tp-fill" style="width:${pct.toFixed(1)}%"></div></div><div class="tp-next">${nextMsg}</div></div>`;
}
function impactText(p,ct,vt,stdTier,exTier){
  const a=[];
  if(ct.next){const remain=Math.max(0,ct.next-Number(p.course_sales||0));a.push(`Course: ${num(remain)} more sales value → ${ct.nextRate}%`)}
  if(vt.next){const remain=Math.max(0,vt.next-Number(p.vip_count||0));a.push(`VIP: ${num(remain)} more → ${vt.nextRate}%`)}
  if(stdTier.next){const remain=Math.max(0,stdTier.next-Number(p.total_lots||0));a.push(`Lots: ${num(remain,1)} more overall → XM/DPrime ${stdTier.nextRate}/lot · Exness ${exTier.nextRate}/lot`)}
  return a.length?a.join(' · '):'You are currently at the highest configured commission levels.';
}

function renderDashboard(d){
  const p=d.performance||{},m=d.metrics||{},l=d.link||{},a=d.account||{};
  const clients=Array.isArray(d.clients)?d.clients:[];
  const history=Array.isArray(d.history)?d.history:[];
  const ct=courseTier(p.course_sales),vt=vipTier(p.vip_count);
  const totalLots=Number(p.total_lots||0),stdTier=lotTier(totalLots,false),exTier=lotTier(totalLots,true);
  const max=Math.max(...history.map(x=>Number(x.earnings||0)),1);
  document.body.innerHTML=`<div class="tp-shell"><header class="tp-top"><div class="tp-brand"><img src="/assets/img/logo.png" onerror="this.src='/logo.png'" alt="24K"><div><strong>Team Performance</strong><span>24K Excellence · Earnings Command Center</span></div></div><div class="tp-actions"><span class="tp-chip hide-mobile">${esc(a.display_name||a.username||'Team')}</span><input id="tpMonth" class="tp-select" type="month" style="width:150px" value="${String(d.month||'').slice(0,7)}"><button id="tpTheme" class="tp-btn tp-theme-btn" type="button" title="Toggle theme" aria-label="Toggle theme">☀</button><button id="tpLogout" class="tp-btn">Logout</button></div></header><main class="tp-main"><section class="tp-hero"><article class="tp-card tp-welcome"><div class="tp-eyebrow">Monthly Performance</div><h1>${esc(a.display_name||'Team Member')}</h1><p>Your earnings, conversions and next commission targets in one place. Progress updates automatically after performance data is saved by Admin.</p><div class="tp-hero-progress"><div><span>Overall lot level</span><b>${num(totalLots,1)} / ${stdTier.next?num(stdTier.next,0):'TOP'} lots</b></div><div class="tp-track tp-track-lg"><div class="tp-fill" style="width:${progress(totalLots,stdTier.next,prevThreshold('lots',totalLots)).toFixed(1)}%"></div><i class="tp-progress-light"></i></div><small>${stdTier.next?`Need ${num(Math.max(0,stdTier.next-totalLots),1)} more combined lots for next rate level`:'Highest lot commission level active'}</small></div></article><article class="tp-card tp-link-card"><h3>Assigned Link</h3><div class="tp-meta"><div><small>Source</small><b>${esc(l.source||'Direct')}</b></div><div><small>Campaign</small><b>${esc(l.campaign||'—')}</b></div><div><small>Reference</small><b>${esc(l.ref_code||'—')}</b></div><div><small>Status</small><b>${l.is_active?'Active':'Inactive'}</b></div></div></article></section><section class="tp-kpis"><article class="tp-card tp-kpi"><div class="tp-kpi-top"><small>Total Earnings</small><span class="tp-icon">$</span></div><strong>${money(p.total_earnings)}</strong><em>Course + VIP + broker lots</em></article><article class="tp-card tp-kpi"><div class="tp-kpi-top"><small>Course Earnings</small><span class="tp-icon">🎓</span></div><strong>${money(p.course_earnings)}</strong><em>${p.course_rate||0}% current commission</em></article><article class="tp-card tp-kpi"><div class="tp-kpi-top"><small>VIP Earnings</small><span class="tp-icon">♛</span></div><strong>${money(p.vip_earnings)}</strong><em>${p.vip_rate||0}% current commission</em></article><article class="tp-card tp-kpi"><div class="tp-kpi-top"><small>Lot Earnings</small><span class="tp-icon">↗</span></div><strong>${money(p.lot_earnings)}</strong><em>${num(totalLots,1)} combined monthly lots</em></article><article class="tp-card tp-kpi"><div class="tp-kpi-top"><small>Registrations</small><span class="tp-icon">◎</span></div><strong>${num(m.signups)}</strong><em>${num(m.clicks)} tracked clicks</em></article><article class="tp-card tp-kpi"><div class="tp-kpi-top"><small>Clients</small><span class="tp-icon">👥</span></div><strong>${num(clients.length)}</strong><em>Attributed to your assigned link</em></article><article class="tp-card tp-kpi"><div class="tp-kpi-top"><small>Total Lots</small><span class="tp-icon">◫</span></div><strong>${num(totalLots,1)}</strong><em>XM + DPrime + Exness</em></article><article class="tp-card tp-kpi"><div class="tp-kpi-top"><small>Conversion</small><span class="tp-icon">%</span></div><strong>${num(m.conversion_rate,2)}%</strong><em>Unique visitors → registrations</em></article></section><section class="tp-grid3">${renderProgressCard('Course Commission',p.course_sales,ct,'sales value',p.course_earnings,'course')}${renderProgressCard('VIP Commission',p.vip_count,vt,'VIP',p.vip_earnings,'vip')}${renderOverallLotsCard(p,stdTier,exTier)}</section><section class="tp-split"><article class="tp-card tp-section"><div class="tp-section-head"><h2>Broker Lots Performance</h2><span>One shared level · broker-specific rates</span></div><div class="tp-brokers">${brokerCard('XM',p.xm_lots,p.xm_rate||stdTier.rate,p.xm_earnings,totalLots,stdTier,exTier)}${brokerCard('DPrime',p.dprime_lots,p.dprime_rate||stdTier.rate,p.dprime_earnings,totalLots,stdTier,exTier)}${brokerCard('Exness',p.exness_lots,p.exness_rate||exTier.rate,p.exness_earnings,totalLots,stdTier,exTier)}</div><div class="tp-note"><b style="color:var(--t-gold)">How lots work:</b> XM + DPrime + Exness lots are added together to determine one overall level. The unlocked level applies the XM/DPrime rate to XM & DPrime lots, and the separate Exness rate to Exness lots.</div></article><article class="tp-card tp-section"><div class="tp-section-head"><h2>6-Month Earnings</h2><span>Monthly trend</span></div><div class="tp-bars">${history.map(h=>`<div class="tp-bar-col"><b>${money(h.earnings)}</b><div class="tp-bar" style="height:${Math.max(4,(Number(h.earnings||0)/max)*130)}px"></div><span>${new Date(h.month+'T00:00:00').toLocaleDateString(undefined,{month:'short'})}</span></div>`).join('')}</div></article></section><section class="tp-split"><article class="tp-card tp-section"><div class="tp-section-head"><h2>Conversion Funnel</h2><span>Assigned link journey</span></div><div class="tp-funnel"><div class="tp-funnel-step"><b>${num(m.clicks)}</b><span>Clicks</span></div><div class="tp-funnel-step"><b>${num(m.unique_visitors)}</b><span>Unique</span></div><div class="tp-funnel-step"><b>${num(m.signups)}</b><span>Registrations</span></div><div class="tp-funnel-step"><b>${num(m.enrollments)}</b><span>Enrollments</span></div></div><div class="tp-note"><b style="color:var(--t-gold)">Next Level Impact:</b> ${impactText(p,ct,vt,stdTier,exTier)}</div></article><article class="tp-card tp-section"><div class="tp-section-head"><h2>Earnings Breakdown</h2><span>This month</span></div><div class="tp-table-wrap"><table class="tp-table" style="min-width:0"><tbody><tr><td>Course commission</td><td>${p.course_rate||0}%</td><td><b>${money(p.course_earnings)}</b></td></tr><tr><td>VIP commission</td><td>${p.vip_rate||0}%</td><td><b>${money(p.vip_earnings)}</b></td></tr><tr><td>XM lots</td><td>${p.xm_rate||stdTier.rate}/lot</td><td><b>${money(p.xm_earnings)}</b></td></tr><tr><td>DPrime lots</td><td>${p.dprime_rate||stdTier.rate}/lot</td><td><b>${money(p.dprime_earnings)}</b></td></tr><tr><td>Exness lots</td><td>${p.exness_rate||exTier.rate}/lot</td><td><b>${money(p.exness_earnings)}</b></td></tr></tbody></table></div></article></section><section class="tp-card tp-section"><div class="tp-section-head"><h2>Attributed Clients</h2><span>${clients.length} total clients on this link</span></div>${clients.length?`<div class="tp-table-wrap"><table class="tp-table"><thead><tr><th>Client</th><th>Email</th><th>WhatsApp</th><th>Signup</th><th>Verified</th><th>Course / Enrollment</th></tr></thead><tbody>${clients.map(c=>`<tr><td><b>${esc(c.full_name||'Student')}</b></td><td>${esc(c.email||'—')}</td><td>${esc(c.whatsapp||'—')}</td><td>${c.signup_date?new Date(c.signup_date).toLocaleDateString():'—'}</td><td><span class="tp-badge">${c.email_verified?'Verified':'Pending'}</span></td><td>${(c.enrollments||[]).length?(c.enrollments||[]).map(e=>esc(e.course_title)+' · '+esc(e.status)).join('<br>'):'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="tp-empty">No attributed clients yet.</div>'}</section></main></div>`;
  applyTheme(readTheme());
  $('#tpLogout').onclick=logout;
  $('#tpMonth').onchange=()=>loadDashboard($('#tpMonth').value);
  $('#tpTheme').onclick=toggleTheme;
}

async function loadDashboard(month){
  const token=localStorage.getItem(TOKEN_KEY);if(!token)return loginView();loadingView();
  try{const d=await rpc('team_get_performance_dashboard',{p_token:token,p_month:monthDate(month)});renderDashboard(d)}
  catch(e){console.error(e);if(/expired|invalid|session/i.test(e.message||'')){localStorage.removeItem(TOKEN_KEY);loginView('Your Team session expired. Please sign in again.')}else loginView('Could not load Team Performance: '+(e.message||'Unknown error'))}
}
async function logout(){const token=localStorage.getItem(TOKEN_KEY);try{if(token)await rpc('team_logout',{p_token:token})}catch(_){}localStorage.removeItem(TOKEN_KEY);loginView()}
if(!supa){loginView('Supabase configuration is missing.');return}
loadDashboard();
})();

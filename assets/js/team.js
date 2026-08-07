(async function(){
  'use strict';
  const cfg=window.APP_CONFIG||{};
  if(!window.supabase?.createClient||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;
  const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const key='24k_team_session';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});};
  let token=sessionStorage.getItem(key)||'';
  let payload=null;

  $('teamLoginForm').addEventListener('submit',login);
  $('teamLogout').addEventListener('click',logout);
  $('teamRefresh').addEventListener('click',loadDashboard);
  $('teamCopyLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('teamTrackedUrl').value);$('teamCopyLink').innerHTML='<i class="fa-solid fa-check"></i> Copied';setTimeout(()=>$('teamCopyLink').innerHTML='<i class="fa-solid fa-copy"></i> Copy',1200);}catch{}});
  if(token) await loadDashboard();

  async function login(event){
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),errorBox=$('teamLoginError');errorBox.classList.remove('show');button.disabled=true;button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
    try{const v=Object.fromEntries(new FormData(form));const {data,error}=await sb.rpc('team_login',{p_username:String(v.username||'').trim(),p_password:String(v.password||'')});if(error)throw error;if(!data?.token)throw new Error('Invalid username or password.');token=data.token;sessionStorage.setItem(key,token);await loadDashboard();}
    catch(error){errorBox.textContent=error.message||'Could not sign in.';errorBox.classList.add('show');}
    finally{button.disabled=false;button.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Sign In';}
  }
  async function loadDashboard(){
    if(!token)return showLogin();
    try{const {data,error}=await sb.rpc('team_get_dashboard',{p_token:token});if(error)throw error;if(!data?.account)throw new Error('Team session expired.');payload=data;render();}
    catch(error){console.warn(error);sessionStorage.removeItem(key);token='';showLogin();$('teamLoginError').textContent='Session expired. Please sign in again.';$('teamLoginError').classList.add('show');}
  }
  function render(){
    $('teamLogin').classList.add('hidden');$('teamDashboard').classList.remove('hidden');const a=payload.account,l=payload.link||{},m=payload.metrics||{},clients=payload.clients||[];
    $('teamIdentity').textContent=a.display_name||a.username;$('teamWelcome').textContent=`${a.display_name||'Team'} Performance`;
    $('teamKpis').innerHTML=[['Clicks',m.clicks||0],['Unique',m.unique_visitors||0],['Signups',m.signups||0],['Enrollments',m.enrollments||0],['Conversion',`${Number(m.conversion_rate||0).toFixed(1)}%`]].map(([n,v])=>`<div class="team-kpi"><small>${n}</small><b>${v}</b></div>`).join('');
    const root=(location.origin+(cfg.SITE_BASE_PATH||'/')).replace(/\/$/,'');const dest=l.destination_path==='/'?'':String(l.destination_path||'').replace(/\/$/,'');const q=new URLSearchParams({ref:l.ref_code||''});if(l.source)q.set('source',l.source);if(l.campaign)q.set('campaign',l.campaign);$('teamTrackedUrl').value=`${root}${dest}/?${q}`;$('teamLinkMeta').textContent=`${l.name||'Tracked Link'} · ${l.ref_code||''} · ${l.source||'Direct'}`;
    $('teamClientsBody').innerHTML=clients.length?clients.map(c=>`<tr><td><b>${esc(c.full_name||'Student')}</b></td><td>${esc(c.email||'—')}</td><td>${esc(c.whatsapp||'—')}</td><td>${fmt(c.signup_date)}</td><td><span class="team-status">${c.email_verified?'Verified':'Unverified'}</span></td><td>${(c.enrollments||[]).length?(c.enrollments||[]).map(e=>`<div><b>${esc(e.course_title||'Course')}</b> · ${esc(e.status||'')}</div>`).join(''):'—'}</td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;padding:28px">No attributed clients yet.</td></tr>';
  }
  async function logout(){if(token)await sb.rpc('team_logout',{p_token:token}).catch(()=>{});sessionStorage.removeItem(key);token='';payload=null;showLogin();}
  function showLogin(){$('teamDashboard').classList.add('hidden');$('teamLogin').classList.remove('hidden');}
})();

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

  $('teamLoginForm')?.addEventListener('submit',login);
  $('teamLogout')?.addEventListener('click',logout);
  $('teamRefresh')?.addEventListener('click',loadDashboard);
  $('teamClientSearch')?.addEventListener('input',renderClients);
  $('teamVerificationFilter')?.addEventListener('change',renderClients);
  $('teamEnrollmentFilter')?.addEventListener('change',renderClients);
  $('teamThemeToggle')?.addEventListener('click',toggleTheme);
  $('teamCopyLink')?.addEventListener('click',copyLink);
  updateThemeIcon();
  if(token) await loadDashboard();

  async function login(event){
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),errorBox=$('teamLoginError');errorBox.classList.remove('show');button.disabled=true;button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
    try{const v=Object.fromEntries(new FormData(form));const {data,error}=await sb.rpc('team_login',{p_username:String(v.username||'').trim(),p_password:String(v.password||'')});if(error)throw error;if(!data?.token)throw new Error('Invalid username or password.');token=data.token;sessionStorage.setItem(key,token);form.reset();await loadDashboard();}
    catch(error){errorBox.textContent=error.message||'Could not sign in.';errorBox.classList.add('show');}
    finally{button.disabled=false;button.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Sign In';}
  }

  async function loadDashboard(){
    if(!token)return showLogin();
    const refresh=$('teamRefresh');if(refresh){refresh.disabled=true;refresh.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Refreshing';}
    try{const {data,error}=await sb.rpc('team_get_dashboard',{p_token:token});if(error)throw error;if(!data?.account)throw new Error('Team session expired.');payload=data;render();}
    catch(error){console.warn(error);sessionStorage.removeItem(key);token='';payload=null;showLogin();const e=$('teamLoginError');if(e){e.textContent='Session expired. Please sign in again.';e.classList.add('show');}}
    finally{if(refresh){refresh.disabled=false;refresh.innerHTML='<i class="fa-solid fa-rotate"></i> Refresh';}}
  }

  function render(){
    $('teamLogin').classList.add('hidden');$('teamDashboard').classList.remove('hidden');const a=payload.account,l=payload.link||{},m=payload.metrics||{};
    $('teamIdentity').textContent=a.display_name||a.username;$('teamWelcome').textContent=`${a.display_name||'Team'} Performance`;
    const kpis=[['fa-arrow-pointer','Clicks',m.clicks||0,'All tracked visits'],['fa-users-viewfinder','Unique Visitors',m.unique_visitors||0,'Unique first-touch visitors'],['fa-user-plus','Signups',m.signups||0,'Registered clients'],['fa-graduation-cap','Enrollments',m.enrollments||0,'Clients enrolled'],['fa-chart-line','Conversion',`${Number(m.conversion_rate||0).toFixed(1)}%`,'Visitor to signup rate']];
    $('teamKpis').innerHTML=kpis.map(([i,n,v,d])=>`<article class="team-kpi"><div class="team-kpi-icon"><i class="fa-solid ${i}"></i></div><div><small>${n}</small><b>${v}</b><span>${d}</span></div></article>`).join('');
    const root=(location.origin+(cfg.SITE_BASE_PATH||'/')).replace(/\/$/,'');const dest=l.destination_path==='/'?'':String(l.destination_path||'').replace(/\/$/,'');const q=new URLSearchParams({ref:l.ref_code||''});if(l.source)q.set('source',l.source);if(l.campaign)q.set('campaign',l.campaign);$('teamTrackedUrl').value=`${root}${dest}/?${q}`;$('teamLinkMeta').textContent=`${l.name||'Tracked Link'} · ${l.ref_code||''} · ${l.source||'Direct'}${l.campaign?` · ${l.campaign}`:''}`;
    renderClients();
  }

  function filteredClients(){
    const clients=payload?.clients||[];const q=($('teamClientSearch')?.value||'').trim().toLowerCase();const vf=$('teamVerificationFilter')?.value||'all';const ef=$('teamEnrollmentFilter')?.value||'all';
    return clients.filter(c=>{const hay=`${c.full_name||''} ${c.email||''} ${c.whatsapp||''}`.toLowerCase();if(q&&!hay.includes(q))return false;if(vf==='verified'&&!c.email_verified)return false;if(vf==='unverified'&&c.email_verified)return false;const enrolled=(c.enrollments||[]).length>0;if(ef==='enrolled'&&!enrolled)return false;if(ef==='not-enrolled'&&enrolled)return false;return true;});
  }

  function renderClients(){
    const clients=filteredClients();if($('teamClientCount'))$('teamClientCount').textContent=String(clients.length);
    $('teamClientsBody').innerHTML=clients.length?clients.map(c=>`<tr><td><div class="team-client-main"><div class="team-client-avatar">${esc(initials(c.full_name||c.email||'ST'))}</div><div><b>${esc(c.full_name||'Student')}</b><small>${esc(c.email||'—')}</small></div></div></td><td>${esc(c.whatsapp||'—')}</td><td>${fmt(c.signup_date)}</td><td><span class="status-pill ${c.email_verified?'ok':'warn'}">${c.email_verified?'Verified':'Unverified'}</span></td><td>${(c.enrollments||[]).length?(c.enrollments||[]).map(e=>`<div class="team-course-line"><b>${esc(e.course_title||'Course')}</b><span class="status-pill ${String(e.status).toLowerCase()==='active'?'ok':'neutral'}">${esc(e.status||'')}</span></div>`).join(''):'<span class="muted">Not enrolled</span>'}</td></tr>`).join(''):'<tr><td colspan="5"><div class="team-empty"><i class="fa-solid fa-users-slash"></i><b>No matching clients</b><span>Clients attributed to your assigned link will appear here.</span></div></td></tr>';
  }

  function initials(value){return String(value||'ST').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'ST';}
  async function copyLink(){try{await navigator.clipboard.writeText($('teamTrackedUrl').value);$('teamCopyLink').innerHTML='<i class="fa-solid fa-check"></i> Copied';setTimeout(()=>$('teamCopyLink').innerHTML='<i class="fa-solid fa-copy"></i> Copy Link',1200);}catch{}}
  async function logout(){if(token)try{await sb.rpc('team_logout',{p_token:token});}catch{}sessionStorage.removeItem(key);token='';payload=null;showLogin();}
  function showLogin(){$('teamDashboard').classList.add('hidden');$('teamLogin').classList.remove('hidden');}
  function toggleTheme(){const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;localStorage.setItem('24k-excellence-theme',next);updateThemeIcon();}
  function updateThemeIcon(){const b=$('teamThemeToggle');if(!b)return;const light=document.documentElement.dataset.theme==='light';b.innerHTML=`<i class="fa-solid ${light?'fa-moon':'fa-sun'}"></i>`;b.title=light?'Switch to dark theme':'Switch to light theme';}
})();

(function(){
'use strict';
const A=window.App;
if(!A?.supabase)return;
const $=s=>document.querySelector(s);
const esc=v=>A.escapeHtml(v??'');
const state={rows:[]};

function pretty(v){return String(v||'').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}
function entity(v){return ({signals:'Signal',charts:'Chart',articles:'Article',mentor_banners:'Banner',announcements:'Announcement',courses:'Course',course_sessions:'Course Session',course_resources:'Course Resource',course_session_links:'Private Session Link',payments:'Payment',premium_payments:'Premium Payment',ib_verifications:'IB Verification',profiles:'User Profile',team_accounts:'Team Account',tracking_links:'Tracking Link',enrollments:'Enrollment',mentor_permissions:'Mentor Permission',student:'Student',chat_thread:'Live Chat',team_daily_report:'Daily Report',profile:'Profile',session:'Session'})[String(v||'')]||pretty(v)||'—'}
function family(r){const a=String(r.action||'').toLowerCase(),e=String(r.entity_type||'').toLowerCase(),s=a+' '+e;if(/login|logout|session/.test(a))return'login';if(/signal|chart|article|banner|announcement|course/.test(s))return'content';if(/client|lead|enrollment|tracking_link/.test(s))return'client';if(/chat|desk|thread|message/.test(s))return'chat';if(/payment|premium|ib_|access/.test(s))return'payment';if(/profile|team_account|mentor_permission|password|setting/.test(s))return'account';return'other'}
function actionLabel(r){
  const a=String(r.action||'').toLowerCase(),en=entity(r.entity_type);
  const map={admin_login:'Admin signed in',admin_logout:'Admin signed out',mentor_login:'Mentor signed in',mentor_logout:'Mentor signed out',mentor_refresh:'Mentor refreshed panel',student_login:'Student signed in',team_login:'Team signed in',team_logout:'Team signed out',team_refresh:'Team refreshed panel',login_failed:'Login failed',password_changed:'Password changed',signup_attempt:'Sign-up attempt',team_update_client:'Updated client',team_search_client:'Searched client ownership',team_submit_daily_report:'Submitted daily report',team_chat_action:'Updated chat',team_chat_meta:'Updated chat stage',team_chat_reply:'Sent chat reply'};
  if(map[a])return map[a];
  if(a.startsWith('insert_'))return 'Created '+en;
  if(a.startsWith('update_'))return 'Updated '+en;
  if(a.startsWith('delete_'))return 'Deleted '+en;
  return pretty(a)||'Activity';
}
function summary(r){
  const d=r.details||{},a=String(r.action||'').toLowerCase();
  if(a==='team_update_client')return [`${pretty(d.status_before||'')} → ${pretty(d.status_after||'')}`,d.follow_up_after?'Follow-up set':null,d.note_changed?'Note changed':null].filter(Boolean).join(' · ')||'Client updated';
  if(a==='team_search_client')return d.result_found?`Found ${d.client_id||'client'} · ${pretty(d.ownership||'')}`:'No matching client';
  if(a==='team_submit_daily_report')return `Leads ${d.leads_contacted||0} · Messages ${d.messages_sent||0} · Calls ${d.calls_made||0} · Follow-ups ${d.follow_ups||0}`;
  if(a==='team_chat_action')return `Chat action: ${pretty(d.action||'updated')}`;
  if(a==='team_chat_meta')return `Stage ${pretty(d.stage||'')} · Priority ${pretty(d.priority||'')}`;
  if(a==='team_chat_reply')return `Reply sent · ${d.message_length||0} characters`;
  if(a==='login_failed')return d.identity||d.username?`Account: ${d.identity||d.username}`:'Authentication failed';
  const changed=Array.isArray(d.changed_fields)?d.changed_fields:[];
  if(changed.length)return 'Changed: '+changed.slice(0,6).map(pretty).join(', ')+(changed.length>6?` +${changed.length-6} more`:'');
  if(d.operation)return pretty(d.operation)+' '+entity(r.entity_type);
  if(d.view)return 'View: '+pretty(d.view);
  return entity(r.entity_type);
}
function inRange(r,range,date){
  if(range==='all')return true;
  const x=new Date(r.created_at);if(Number.isNaN(x.getTime()))return false;
  const now=new Date(),start=new Date(now);start.setHours(0,0,0,0);
  if(range==='today')return x>=start;
  if(range==='yesterday'){const a=new Date(start);a.setDate(a.getDate()-1);return x>=a&&x<start}
  if(range==='custom')return !date||String(r.created_at||'').slice(0,10)===date;
  const days=Number(range||0);if(days){const a=new Date(start);a.setDate(a.getDate()-(days-1));return x>=a}
  return true;
}
function filtered(){
  const q=($('#auditFinalSearch')?.value||'').toLowerCase().trim(),role=$('#auditFinalRole')?.value||'all',fam=$('#auditFinalType')?.value||'all',status=$('#auditFinalStatus')?.value||'all',range=$('#auditFinalRange')?.value||'all',date=$('#auditFinalDate')?.value||'';
  return state.rows.filter(r=>{
    const hay=`${r.actor_name||''} ${r.actor_email||''} ${r.action||''} ${r.entity_type||''} ${r.entity_id||''} ${r.ip_address||''} ${r.city||''} ${r.country||''} ${JSON.stringify(r.details||{})}`.toLowerCase();
    return(!q||hay.includes(q))&&(role==='all'||r.actor_role===role)&&(fam==='all'||family(r)===fam)&&(status==='all'||r.status===status)&&inRange(r,range,date);
  });
}
function shell(){
  const p=$('#p-audit');if(!p)return false;
  p.innerHTML=`
    <div class="panel-heading audit-v1430-hero">
      <div><span class="audit-v1430-kicker"><i class="fa-solid fa-shield-halved"></i> FULL ACTIVITY TRACKING</span><h2>Activity Logs</h2><p>Admin, Mentor, Team aur Student — sab ki important activity ek jagah.</p><small>LIVE AUDIT TRAIL</small></div>
      <div class="audit-v1430-head-actions"><button class="app-btn outline" id="auditFinalExport"><i class="fa-solid fa-file-csv"></i> Export CSV</button><button class="app-btn gold" id="auditFinalRefresh"><i class="fa-solid fa-rotate"></i> Refresh</button></div>
    </div>
    <div id="auditFinalKpis" class="audit-v1430-kpis"></div>
    <div class="audit-filter-grid audit-v1430-filters">
      <div class="audit-v1430-search"><i class="fa-solid fa-magnifying-glass"></i><input id="auditFinalSearch" type="search" placeholder="Search person, action, target, IP or location..."></div>
      <select id="auditFinalRole"><option value="all">All Roles</option><option value="admin">Admin</option><option value="mentor">Mentor</option><option value="team">Team</option><option value="student">Student</option><option value="system">System</option><option value="public">Public</option></select>
      <select id="auditFinalType"><option value="all">All Activity</option><option value="login">Login / Logout</option><option value="content">Content</option><option value="client">Clients / Leads</option><option value="chat">Live Chat</option><option value="payment">Payments / Access</option><option value="account">Accounts / Settings</option></select>
      <select id="auditFinalStatus"><option value="all">All Status</option><option value="success">Success</option><option value="failed">Failed</option></select>
      <select id="auditFinalRange"><option value="all">All Time</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="custom">Custom Date</option></select>
      <input id="auditFinalDate" type="date" hidden>
    </div>
    <div class="table-scroll audit-v1430-table-shell"><table class="admin-table audit-v962-table audit-v1430-table"><thead><tr><th>Actor</th><th>Role</th><th>Activity</th><th>Details</th><th>Target</th><th>Date & Time</th><th>Device / IP</th><th>Location</th><th>Status</th></tr></thead><tbody id="auditFinalBody"></tbody></table></div>`;
  if(!$('#auditFinalModal'))document.body.insertAdjacentHTML('beforeend',`<div class="app-modal audit-v1430-modal" id="auditFinalModal"><div class="app-modal-card large"><div class="app-modal-head"><div><span class="audit-v1430-kicker"><i class="fa-solid fa-clock-rotate-left"></i> ACTIVITY DETAIL</span><h3 id="auditFinalTitle">Activity Detail</h3></div><button class="modal-close" id="auditFinalClose"><i class="fa-solid fa-xmark"></i></button></div><div class="app-modal-body" id="auditFinalDetail"></div><div class="app-modal-foot"><button type="button" class="app-btn outline" id="auditFinalClose2">Close</button></div></div></div>`);
  bind();return true;
}
function render(){
  const b=$('#auditFinalBody');if(!b)return;
  const rows=filtered(),today=new Date();today.setHours(0,0,0,0),k=$('#auditFinalKpis');
  if(k){const all=state.rows;k.innerHTML=[
    ['fa-wave-square','Today',all.filter(r=>new Date(r.created_at)>=today).length],
    ['fa-user-shield','Admin',all.filter(r=>r.actor_role==='admin').length],
    ['fa-user-graduate','Mentor',all.filter(r=>r.actor_role==='mentor').length],
    ['fa-people-group','Team',all.filter(r=>r.actor_role==='team').length],
    ['fa-triangle-exclamation','Failed',all.filter(r=>r.status==='failed').length]
  ].map(([i,n,v])=>`<div class="audit-v1430-kpi"><span><i class="fa-solid ${i}"></i></span><div><b>${v}</b><small>${n}</small></div></div>`).join('')}
  b.innerHTML=rows.length?rows.map(r=>`<tr>
    <td><div class="audit-v1430-actor"><span>${esc(String(r.actor_name||r.actor_email||'System').trim().slice(0,1).toUpperCase()||'S')}</span><div><b>${esc(r.actor_name||r.actor_email||'System')}</b><small>${esc(r.actor_email||'')}</small></div></div></td>
    <td><span class="audit-role role-${esc(r.actor_role||'system')}">${esc(pretty(r.actor_role||'system'))}</span></td>
    <td><b class="audit-action">${esc(actionLabel(r))}</b></td>
    <td><div class="audit-detail-cell"><span>${esc(summary(r))}</span><button type="button" class="audit-detail-btn" data-audit-final-detail="${r.id}">View</button></div></td>
    <td><b>${esc(entity(r.entity_type))}</b>${r.entity_id?`<small>${esc(String(r.entity_id).slice(0,24))}</small>`:''}</td>
    <td><b>${A.formatDateTime(r.created_at)}</b></td>
    <td><b>${esc([r.device,r.browser].filter(Boolean).join(' · ')||'—')}</b><small>${esc(r.ip_address||'No IP')}</small></td>
    <td>${esc([r.city,r.country].filter(Boolean).join(', ')||'—')}</td>
    <td><span class="status-pill ${r.status==='failed'?'bad':'ok'}">${esc(pretty(r.status))}</span></td>
  </tr>`).join(''):'<tr><td colspan="9"><div class="empty-state compact">No activity matches these filters.</div></td></tr>';
}
async function load(){
  const btn=$('#auditFinalRefresh');if(btn)A.setLoading?.(btn,true,'Loading...');
  try{
    const {data,error}=await A.supabase.from('activity_audit_log').select('*').order('created_at',{ascending:false}).limit(2000);
    if(error)throw error;
    state.rows=data||[];render();
  }catch(e){
    console.error('[Activity Logs]',e);
    const b=$('#auditFinalBody');if(b)b.innerHTML='<tr><td colspan="9"><div class="empty-state compact">Activity Logs could not load. Please refresh once.</div></td></tr>';
    A.toast?.(A.friendlyError?A.friendlyError(e):(e.message||'Could not load Activity Logs'),'error');
  }finally{if(btn)A.setLoading?.(btn,false)}
}
function detail(id){
  const r=state.rows.find(x=>String(x.id)===String(id));if(!r)return;
  $('#auditFinalTitle').textContent=actionLabel(r);
  $('#auditFinalDetail').innerHTML=`<div class="audit-v1430-detail-grid">
    <div><small>Actor</small><b>${esc(r.actor_name||r.actor_email||'System')}</b><span>${esc(r.actor_email||'')}</span></div>
    <div><small>Role</small><b>${esc(pretty(r.actor_role||'system'))}</b></div>
    <div><small>Target</small><b>${esc(entity(r.entity_type))}</b><span>${esc(r.entity_id||'—')}</span></div>
    <div><small>Status</small><b>${esc(pretty(r.status))}</b></div>
    <div><small>Date & Time</small><b>${A.formatDateTime(r.created_at)}</b></div>
    <div><small>Device</small><b>${esc([r.device,r.browser].filter(Boolean).join(' · ')||'—')}</b><span>${esc(r.ip_address||'No IP')}</span></div>
    <div class="full"><small>Location</small><b>${esc([r.city,r.country].filter(Boolean).join(', ')||'—')}</b></div>
    <div class="full"><small>Summary</small><b>${esc(summary(r))}</b></div>
  </div><div class="audit-v1430-json"><div><b>Recorded Details</b><small>Passwords, reset tokens and private proof files are excluded.</small></div><pre>${esc(JSON.stringify(r.details||{},null,2))}</pre></div>`;
  $('#auditFinalModal').classList.add('open');
}
function closeModal(){$('#auditFinalModal')?.classList.remove('open')}
function csv(){
  const rows=filtered(),cols=['Actor','Email','Role','Activity','Target','Target ID','Status','Date','Device','Browser','IP','Location','Details'],q=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const out=[cols.map(q).join(','),...rows.map(r=>[r.actor_name,r.actor_email,r.actor_role,actionLabel(r),entity(r.entity_type),r.entity_id,r.status,r.created_at,r.device,r.browser,r.ip_address,[r.city,r.country].filter(Boolean).join(', '),JSON.stringify(r.details||{})].map(q).join(','))].join('\n');
  const u=URL.createObjectURL(new Blob([out],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='24k-activity-logs.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function bind(){
  ['auditFinalSearch','auditFinalRole','auditFinalType','auditFinalStatus','auditFinalRange','auditFinalDate'].forEach(id=>{
    $('#'+id)?.addEventListener('input',render);
    $('#'+id)?.addEventListener('change',()=>{const range=$('#auditFinalRange'),date=$('#auditFinalDate');if(range&&date)date.hidden=range.value!=='custom';render()});
  });
  $('#auditFinalRefresh')?.addEventListener('click',load);
  $('#auditFinalExport')?.addEventListener('click',csv);
  $('#auditFinalBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-audit-final-detail]');if(b)detail(b.dataset.auditFinalDetail)});
  $('#auditFinalClose')?.addEventListener('click',closeModal);$('#auditFinalClose2')?.addEventListener('click',closeModal);
  $('#auditFinalModal')?.addEventListener('click',e=>{if(e.target.id==='auditFinalModal')closeModal()});
}
async function init(){
  for(let i=0;i<80&&!$('#p-audit');i++)await new Promise(r=>setTimeout(r,50));
  if(!shell())return;
  await load();
  A.supabase.channel('admin-activity-final-v1431').on('postgres_changes',{event:'INSERT',schema:'public',table:'activity_audit_log'},()=>load()).subscribe();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
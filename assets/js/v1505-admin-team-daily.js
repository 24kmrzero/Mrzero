(function(){
'use strict';
/* 24K Admin — Team Daily Reports. Approval uses the existing admin-only RPC. */
const A=window.App,sb=A&&A.supabase;
if(!sb)return;
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const state={rows:[],teams:[],page:0,pageSize:50,busy:false,loaded:false,review:null,request:0};
const number=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
function statusOf(v){return String(v||'submitted').toLowerCase()}
function pending(v){return ['submitted','pending','under_review'].includes(statusOf(v))}
function prettyStatus(v){const s=statusOf(v);return s==='submitted'?'Submitted':s==='approved'?'Approved':s==='rejected'?'Rejected':s==='under_review'?'Under Review':s==='pending'?'Pending':s.replaceAll('_',' ')}
function dateLabel(s){if(!s)return '—';const d=new Date(String(s).slice(0,10)+'T12:00:00');return Number.isNaN(d.getTime())?String(s):d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
function toast(s,type){if(A.toast)A.toast(s,type||'info')}
function install(){
  const root=$('.app-content');
  if(!root||$('#p-team-daily-reports'))return;
  const panel=document.createElement('section');
  panel.className='panel';
  panel.id='p-team-daily-reports';
  panel.innerHTML=[
   '<div class="tdr-heading"><div><span class="tdr-eyebrow">TEAM OPERATIONS · DAILY WORK</span><h2>Team Daily Reports</h2><p>Review each team member’s submitted work and approve or reject it without changing monthly performance.</p></div>',
   '<button type="button" class="tdr-btn refresh" id="tdrRefresh"><i class="fa-solid fa-rotate"></i> Refresh Reports</button></div>',
   '<div class="tdr-kpis" id="tdrKpis" aria-live="polite"></div>',
   '<div class="tdr-controls">',
   '<div class="tdr-filter"><label for="tdrManager">Team Member</label><select id="tdrManager"><option value="all">All Managers</option></select></div>',
   '<div class="tdr-filter"><label for="tdrMonth">Month</label><select id="tdrMonth"><option value="all">All Months</option></select></div>',
   '<div class="tdr-filter"><label for="tdrStatus">Review Status</label><select id="tdrStatus"><option value="all">All Statuses</option><option value="submitted">Awaiting Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>',
   '<div class="tdr-filter search"><label for="tdrSearch">Search</label><input id="tdrSearch" type="search" placeholder="Manager, date or notes…"></div>',
   '<button type="button" class="tdr-btn" id="tdrReset"><i class="fa-solid fa-rotate-left"></i> Reset</button>',
   '</div>',
   '<div class="tdr-table-box"><div class="tdr-sub"><span id="tdrCount">Loading reports…</span><span>All submitted manual activity · admin review only</span></div>',
   '<div class="tdr-table-scroll"><table class="tdr-table"><thead><tr><th>Date</th><th>Team Member</th><th>Leads</th><th>Messages</th><th>Calls</th><th>Follow-ups</th><th>New Accounts</th><th>IB Shifts</th><th>Broker Lots</th><th>Notes</th><th>Status</th><th>Review</th></tr></thead>',
   '<tbody id="tdrRows"><tr><td colspan="12" class="tdr-empty">Loading reports…</td></tr></tbody></table></div>',
   '<div class="tdr-sub"><span id="tdrPageInfo"></span><span class="tdr-actions"><button type="button" class="tdr-btn" id="tdrPrev">Previous</button><button type="button" class="tdr-btn" id="tdrNext">Next</button></span></div></div>',
   '<div class="tdr-review-backdrop" id="tdrReviewBackdrop" hidden><div class="tdr-review-dialog" role="dialog" aria-modal="true" aria-labelledby="tdrDialogTitle">',
   '<h3 id="tdrDialogTitle">Review Daily Report</h3><p id="tdrDialogDescription"></p>',
   '<form id="tdrReviewForm"><label for="tdrReviewNote">Admin note (optional)<textarea id="tdrReviewNote" placeholder="Feedback for the team member…"></textarea></label>',
   '<p id="tdrReviewError" role="alert"></p><div class="tdr-dialog-actions"><button type="button" class="tdr-btn" id="tdrCancelReview">Cancel</button><button class="tdr-btn approve" type="submit" id="tdrConfirmReview">Confirm</button></div>',
   '</form></div></div>'
  ].join('');
  root.appendChild(panel);
}
function ensureNav(){
  const nav=$('.app-nav');
  if(!nav||nav.querySelector('[data-panel="team-daily-reports"]'))return;
  const reference=nav.querySelector('[data-panel="team-access-ref"],[data-panel="links"],[data-admin-team-manager],a[href="/admin/team-manager/"]');
  const a=document.createElement('a');
  a.href='/admin/team-daily-reports/';
  a.dataset.panel='team-daily-reports';
  a.innerHTML='<i class="fa-solid fa-clipboard-check"></i> Team Daily Reports <span class="nav-count" id="tdrPendingBadge">0</span>';
  if(reference)reference.insertAdjacentElement('afterend',a);
  else nav.appendChild(a);
}
function memberMap(){return new Map(state.teams.map(t=>[String(t.id),t.display_name||t.username||'Team Member']))}
function filtered(){
  const month=$('#tdrMonth')?.value||'all',team=$('#tdrManager')?.value||'all',status=$('#tdrStatus')?.value||'all',q=String($('#tdrSearch')?.value||'').trim().toLowerCase(),names=memberMap();
  return state.rows.filter(r=>{
    const s=statusOf(r.status);
    return (team==='all'||String(r.team_id)===team)
      &&(month==='all'||String(r.report_date||'').startsWith(month))
      &&(status==='all'||(status==='submitted'?pending(s):s===status))
      &&(!q||[names.get(String(r.team_id))||'',r.report_date,r.notes,r.admin_note].join(' ').toLowerCase().includes(q));
  });
}
function kpis(rows){
  const counts=[['TOTAL REPORTS',rows.length,''],['AWAITING REVIEW',rows.filter(r=>pending(r.status)).length,'pending'],['APPROVED',rows.filter(r=>statusOf(r.status)==='approved').length,'approved'],['REJECTED',rows.filter(r=>statusOf(r.status)==='rejected').length,'rejected']];
  $('#tdrKpis').innerHTML=counts.map(([name,value,tone])=>'<article class="tdr-kpi '+tone+'"><small>'+name+'</small><strong>'+number(value)+'</strong></article>').join('');
  const badge=$('#tdrPendingBadge');if(badge)badge.textContent=String(state.rows.filter(r=>pending(r.status)).length);
}
function updateSelect(id,base,options){
  const el=$(id);if(!el)return;
  const selected=el.value||'all';
  el.innerHTML='<option value="all">'+base+'</option>'+options.map(o=>'<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>').join('');
  el.value=options.some(o=>String(o[0])===selected)?selected:'all';
}
function render(){
  if(!$('#tdrRows'))return;
  updateSelect('#tdrManager','All Managers',state.teams.map(t=>[t.id,t.display_name||t.username||'Team Member']));
  const months=[...new Set(state.rows.map(r=>String(r.report_date||'').slice(0,7)).filter(Boolean))].sort().reverse();
  updateSelect('#tdrMonth','All Months',months.map(m=>[m,new Date(m+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})]));
  const matches=filtered(),names=memberMap();
  kpis(matches);
  const pageCount=Math.max(1,Math.ceil(matches.length/state.pageSize));state.page=Math.max(0,Math.min(state.page,pageCount-1));
  const visible=matches.slice(state.page*state.pageSize,(state.page+1)*state.pageSize);
  $('#tdrCount').textContent='Showing '+matches.length+' of '+state.rows.length+' reports';
  $('#tdrPageInfo').textContent=matches.length?'Page '+(state.page+1)+' of '+pageCount:'No matching reports';
  $('#tdrPrev').disabled=state.page===0;
  $('#tdrNext').disabled=state.page>=pageCount-1;
  $('#tdrRows').innerHTML=visible.length?visible.map(r=>{
    const status=statusOf(r.status),open=pending(status),teamName=names.get(String(r.team_id))||'Team Member';
    const notes=r.notes?'<div class="tdr-notes">'+esc(r.notes)+'</div>':'<small>No note</small>';
    const adminNote=r.admin_note?'<small>Admin: '+esc(r.admin_note)+'</small>':'';
    const actions=open?'<div class="tdr-actions"><button type="button" class="tdr-btn approve" data-tdr-review="approved" data-tdr-id="'+esc(r.id)+'">Approve</button><button type="button" class="tdr-btn reject" data-tdr-review="rejected" data-tdr-id="'+esc(r.id)+'">Reject</button></div>':'<span class="tdr-pill '+esc(status)+'">'+esc(prettyStatus(status))+'</span>';
    return '<tr><td><b>'+esc(dateLabel(r.report_date))+'</b><small>'+esc(String(r.report_date||''))+'</small></td><td><b>'+esc(teamName)+'</b></td>'+
      '<td>'+number(r.leads_contacted)+'</td><td>'+number(r.messages_sent)+'</td><td>'+number(r.calls_made)+'</td><td>'+number(r.follow_ups)+'</td>'+
      '<td>'+number(r.new_broker_accounts)+'</td><td>'+number(r.ib_partner_shifts)+'</td>'+
      '<td><b>XM '+number(r.xm_lots)+'</b><small>DPrime '+number(r.dprime_lots)+' · Exness '+number(r.exness_lots)+'</small></td>'+
      '<td>'+notes+adminNote+'</td><td><span class="tdr-pill '+esc(status)+'">'+esc(prettyStatus(status))+'</span></td><td>'+actions+'</td></tr>';
  }).join(''):'<tr><td colspan="12" class="tdr-empty">No daily reports match these filters.</td></tr>';
}
async function getReports(){
  const all=[],batch=500;
  for(let offset=0;offset<5000;offset+=batch){
    const {data,error}=await sb.from('team_daily_reports').select('id,team_id,report_date,leads_contacted,messages_sent,calls_made,follow_ups,new_broker_accounts,ib_partner_shifts,xm_lots,dprime_lots,exness_lots,notes,status,admin_note,created_at').order('report_date',{ascending:false}).order('created_at',{ascending:false}).range(offset,offset+batch-1);
    if(error)throw error;
    all.push(...(data||[]));if((data||[]).length<batch)break;
  }
  return all;
}
async function load(){
  if(state.busy)return;
  state.busy=true;const request=++state.request;
  const refresh=$('#tdrRefresh');if(refresh)refresh.disabled=true;
  try{
    const [rows,teamsResponse]=await Promise.all([getReports(),sb.from('team_accounts').select('id,display_name,username').order('display_name')]);
    if(teamsResponse.error)throw teamsResponse.error;
    if(request!==state.request)return;
    state.rows=rows;
    state.teams=teamsResponse.data||[];
    state.loaded=true;
    render();
  }catch(err){
    console.error('[24K Team Daily Reports]',err);
    toast('Could not load Team Daily Reports. Please refresh.','error');
    if(!state.loaded&&$('#tdrRows'))$('#tdrRows').innerHTML='<tr><td colspan="12" class="tdr-empty">Could not load reports. Check Admin access and try Refresh.</td></tr>';
  }finally{state.busy=false;if(refresh)refresh.disabled=false}
}
function showReview(id,status){
  const report=state.rows.find(r=>String(r.id)===String(id));
  if(!report||!pending(report.status))return;
  state.review={id:report.id,status};
  $('#tdrDialogTitle').textContent=status==='approved'?'Approve Daily Report':'Reject Daily Report';
  const name=memberMap().get(String(report.team_id))||'Team Member';
  $('#tdrDialogDescription').textContent=dateLabel(report.report_date)+' · '+name+'. Review this report before confirming.';
  $('#tdrReviewNote').value='';
  $('#tdrReviewError').textContent='';
  const confirm=$('#tdrConfirmReview');confirm.textContent=status==='approved'?'Confirm Approval':'Confirm Rejection';
  confirm.className='tdr-btn '+(status==='approved'?'approve':'reject');
  $('#tdrReviewBackdrop').hidden=false;
  $('#tdrReviewNote').focus();
}
function closeReview(){if(state.busy)return;$('#tdrReviewBackdrop').hidden=true;state.review=null}
async function submitReview(e){
  e.preventDefault();if(state.busy||!state.review)return;
  const {id,status}=state.review,btn=$('#tdrConfirmReview');
  state.busy=true;btn.disabled=true;$('#tdrReviewError').textContent='';
  try{
    const {data,error}=await sb.rpc('admin_review_team_daily_report',{p_report_id:id,p_status:status,p_note:$('#tdrReviewNote').value.trim()||null});
    if(error)throw error;
    if(data!==true)throw new Error('Report was not found. Please refresh.');
    $('#tdrReviewBackdrop').hidden=true;state.review=null;
    toast(status==='approved'?'Daily report approved.':'Daily report rejected.','success');
  }catch(err){$('#tdrReviewError').textContent=err.message||'Could not review this report.';toast('Review could not be saved.','error');return}
  finally{state.busy=false;btn.disabled=false}
  await load();
}
install();
ensureNav();
const nav=$('.app-nav');
if(nav){new MutationObserver(()=>ensureNav()).observe(nav,{childList:true})}
document.addEventListener('panel:open',e=>{if(e.detail?.key==='team-daily-reports')void load();else if(!$('#tdrReviewBackdrop')?.hidden)closeReview()});
document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-tdr-review]');
  if(trigger){e.preventDefault();showReview(trigger.dataset.tdrId,trigger.dataset.tdrReview);return}
  const page=e.target.closest('#tdrPrev,#tdrNext');
  if(page){state.page+=page.id==='tdrNext'?1:-1;render();return}
  if(e.target.closest('#tdrRefresh')){void load();return}
  if(e.target.closest('#tdrReset')){['#tdrManager','#tdrMonth','#tdrStatus'].forEach(id=>{const node=$(id);if(node)node.value='all'});$('#tdrSearch').value='';state.page=0;render();return}
  if(e.target.closest('#tdrCancelReview')){closeReview();return}
  if(e.target.id==='tdrReviewBackdrop'){closeReview()}
});
document.addEventListener('change',e=>{if(e.target.matches('#tdrManager,#tdrMonth,#tdrStatus')){state.page=0;render()}});
$('#tdrSearch')?.addEventListener('input',()=>{state.page=0;render()});
$('#tdrReviewForm')?.addEventListener('submit',submitReview);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#tdrReviewBackdrop')?.hidden)closeReview()});
if($('#p-team-daily-reports')?.classList.contains('on'))void load();
})();
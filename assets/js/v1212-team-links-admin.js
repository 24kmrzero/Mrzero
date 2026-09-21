(function(){
'use strict';
const A=window.App,supa=A?.supabase,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let state={accounts:[],links:[],reports:[],vip_conversions:[],courses:[]};

async function rpc(n,a={}){const r=await supa.rpc(n,a);if(r.error)throw r.error;return r.data}
async function one(q){const r=await q;if(r.error)throw r.error;return r.data}
async function ensureAdmin(){const u=await A.getCurrentUser();if(!u)throw new Error('Admin session required.');const p=await A.getProfile(u.id);if(!['admin','super_admin'].includes(p.role))throw new Error('Admin access required.');return u}
function tab(name){$$('.tm-panel').forEach(x=>x.classList.toggle('active',x.dataset.panel===name));$$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));history.replaceState({},'',`#${name}`)}
function hashTab(){const h=location.hash.replace('#','');return ['team','links','ads','reviews'].includes(h)?h:'team'}

async function load(){
  try{
    await ensureAdmin();
    const [team,links,courses]=await Promise.all([
      rpc('admin_get_team_manager'),
      rpc('admin_get_link_performance'),
      one(supa.from('courses').select('id,title,slug,course_type,is_published,enrollment_open').order('created_at',{ascending:false}))
    ]);
    state={...team,links:links||[],courses:courses||[]};
    renderAll();
    tab(hashTab());
  }catch(e){
    document.body.insertAdjacentHTML('afterbegin',`<div style="padding:12px;background:#500;color:#fff">${esc(e.message||'Could not load Team & Links.')}</div>`);
  }
}
function renderAll(){renderTeam();renderLinks('normal');renderLinks('ad');renderReports();renderVip();populateCourses()}

function selectedAccount(){return(state.accounts||[]).find(a=>a.id===$('#teamSelect')?.value)||state.accounts?.[0]}
function renderTeam(){
  const sel=$('#teamSelect');
  sel.innerHTML=(state.accounts||[]).map(a=>`<option value="${a.id}">${esc(a.display_name||a.username)} · ${esc(a.username)}</option>`).join('');
  renderAssignments();fillAccount();
}
function fillAccount(blank=false){
  const f=$('#teamAccountForm');if(!f)return;
  const a=blank?null:selectedAccount();f.reset();
  f.elements.team_id.value=a?.id||'';f.elements.display_name.value=a?.display_name||'';f.elements.username.value=a?.username||'';
  f.elements.email.value=a?.email||'';f.elements.whatsapp.value=a?.whatsapp||'';
  f.elements.is_active.checked=a?!!a.is_active:true;f.elements.receive_leads.checked=a?!!a.receive_leads:true;f.elements.password.required=!a;
  $('#teamAccountStatus').textContent=a?'Editing selected Team account.':'Creating new Team account.';
}
function renderAssignments(){
  const a=selectedAccount(),box=$('#linkChecklist');if(!a){box.innerHTML='No Team accounts yet.';return}
  const ids=(a.link_ids||[]).map(String);
  $('#teamMeta').textContent=`${a.display_name||a.username} · ${a.is_active===false?'Disabled':'Active'} · ${a.receive_leads===false?'Leads OFF':'Leads ON'} · ${ids.length} assigned link(s)`;
  box.innerHTML=(state.links||[]).map(l=>`<label class="link-check"><input type="checkbox" value="${l.id}" ${ids.includes(String(l.id))?'checked':''}><span><b>${esc(l.name)}</b><small>${l.is_ad_link?'Ad Link':'Tracking'} · ${esc(l.ref_code)} ${l.course_title?'· '+esc(l.course_title):''}</small></span></label>`).join('')||'No links yet.';
}
async function saveAssignments(){
  const a=selectedAccount();if(!a)return;
  const ids=$$('#linkChecklist input:checked').map(x=>x.value);$('#assignStatus').textContent='Saving…';
  try{await rpc('admin_set_team_link_assignments',{p_team_id:a.id,p_link_ids:ids});$('#assignStatus').textContent='Assignments saved.';await reload(a.id)}
  catch(e){$('#assignStatus').textContent=e.message||'Could not save assignments.'}
}
async function saveAccount(e){
  e.preventDefault();const f=e.currentTarget,o=Object.fromEntries(new FormData(f)),id=o.team_id||null;$('#teamAccountStatus').textContent='Saving...';
  try{
    const tid=await rpc('admin_upsert_team_account_v12',{
      p_team_id:id,p_display_name:String(o.display_name||'').trim(),p_username:String(o.username||'').trim(),
      p_email:String(o.email||'').trim(),p_whatsapp:String(o.whatsapp||'').trim(),p_password:String(o.password||''),
      p_is_active:f.elements.is_active.checked,p_receive_leads:f.elements.receive_leads.checked
    });
    $('#teamAccountStatus').textContent='Team account saved.';await reload(tid);
  }catch(x){$('#teamAccountStatus').textContent=x.message||'Could not save Team account.'}
}
async function reload(keepTeam=''){
  const [team,links]=await Promise.all([rpc('admin_get_team_manager'),rpc('admin_get_link_performance')]);
  state={...state,...team,links:links||[]};renderAll();
  if(keepTeam){$('#teamSelect').value=keepTeam;renderAssignments();fillAccount()}
}

function populateCourses(){
  const s=$('#linkCourse');if(!s)return;
  s.innerHTML='<option value="">No specific course</option>'+(state.courses||[]).map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('');
}
function kpis(rows,id){
  const vals=[
    ['Links',rows.length],
    ['Clicks',rows.reduce((s,x)=>s+Number(x.total_clicks||0),0)],
    ['Unique',rows.reduce((s,x)=>s+Number(x.unique_visitors||0),0)],
    ['Signups',rows.reduce((s,x)=>s+Number(x.signups||0),0)],
    ['Enrollments',rows.reduce((s,x)=>s+Number(x.enrollments||0),0)]
  ];
  $(id).innerHTML=vals.map(([a,b])=>`<div class="tl-kpi"><b>${b}</b><span>${a}</span></div>`).join('');
}
function urlFor(l){
  const raw=String(l.destination_path||'/').trim()||'/';const path=raw==='/'?'/':`/${raw.replace(/^\/+|\/+$/g,'')}/`;const u=new URL(path,location.origin);
  u.searchParams.set('ref',l.ref_code);if(l.source)u.searchParams.set('source',l.source);if(l.campaign)u.searchParams.set('campaign',l.campaign);if(l.course_slug)u.searchParams.set('course',l.course_slug);return u.toString();
}
function renderLinks(kind){
  const isAd=kind==='ad',search=String($(isAd?'#adSearch':'#normalSearch')?.value||'').toLowerCase();
  const rows=(state.links||[]).filter(l=>!!l.is_ad_link===isAd).filter(l=>!search||`${l.name} ${l.ref_code} ${l.campaign||''} ${l.course_title||''}`.toLowerCase().includes(search));
  kpis(rows,isAd?'#adKpis':'#normalKpis');
  const body=$(isAd?'#adLinksBody':'#normalLinksBody');
  body.innerHTML=rows.length?rows.map(l=>{
    const teams=Array.isArray(l.assigned_teams)?l.assigned_teams:[],teamText=teams.length?teams.map(t=>t.display_name).join(', '):'Unassigned';
    const routing=l.round_robin?'Round Robin':'Fixed';
    return `<tr>
      <td><b>${esc(l.name)}</b><small>${esc(l.ref_code)}</small></td>
      <td>${isAd?esc(l.course_title||'No course'):esc(l.destination_path||'/')}<small>${isAd?esc(l.destination_path||'/free-course/'):esc(l.course_title||'')}</small></td>
      <td>${esc(l.source||'Direct')}<small>${esc(l.campaign||'')}</small></td>
      <td>${esc(teamText)}<small>${esc(routing)}</small></td>
      <td>${Number(l.total_clicks||0)}</td><td>${Number(l.unique_visitors||0)}</td><td>${Number(l.signups||0)}</td><td>${Number(l.enrollments||0)}</td><td>${Number(l.conversion_rate||0).toFixed(1)}%</td>
      <td>${l.is_active?'<span class="tl-chip gold">Active</span>':'<span class="tl-chip">Off</span>'}</td>
      <td><div class="tl-actions"><button class="gold-btn" style="padding:6px 9px" data-copy="${esc(urlFor(l))}">Copy</button><button class="gold-btn" style="padding:6px 9px;background:#222;color:#fff" data-edit-link="${l.id}">Edit</button></div></td>
    </tr>`;
  }).join(''):`<tr><td colspan="11"><div class="tl-empty">No ${isAd?'Ad Links':'Tracking Links'} yet.</div></td></tr>`;
}
function openLink(type='normal',link=null){
  const f=$('#linkForm');f.reset();const isAd=type==='ad'||!!link?.is_ad_link;
  f.elements.id.value=link?.id||'';f.elements.is_ad_link.value=isAd?'true':'false';
  f.elements.name.value=link?.name||'';f.elements.ref_code.value=link?.ref_code||'';f.elements.source.value=link?.source||'';
  f.elements.campaign.value=link?.campaign||'';f.elements.destination_path.value=link?.destination_path||(isAd?'/free-course/':'/sign-up/');
  f.elements.course_id.value=link?.course_id||'';f.elements.referral_whatsapp.value=link?.referral_whatsapp||'';
  f.elements.round_robin.checked=link?!!link.round_robin:isAd;f.elements.is_active.checked=link?!!link.is_active:true;
  $('#linkModalTitle').textContent=link?`Edit ${isAd?'Ad':'Tracking'} Link`:`New ${isAd?'Ad':'Tracking'} Link`;
  $('#linkModalNote').textContent=isAd?'Course + Team + Round Robin are managed here.':'Create a normal tracked referral/campaign link.';
  $('#courseField').style.display=isAd?'flex':'flex';
  $('#linkTeamPicks').innerHTML=(state.accounts||[]).map(a=>`<label><input type="checkbox" value="${a.id}"><span>${esc(a.display_name||a.username)}<small>${a.receive_leads===false?' · Leads OFF':''}</small></span></label>`).join('')||'<div class="tl-empty">Create a Team member first.</div>';
  const assigned=(link?.assigned_teams||[]).map(x=>String(x.team_id));
  $$('#linkTeamPicks input').forEach(x=>x.checked=assigned.includes(String(x.value)));
  $('#linkModal').classList.add('open');
}
function closeLink(){$('#linkModal').classList.remove('open')}
async function saveLink(e){
  e.preventDefault();const f=e.currentTarget,o=Object.fromEntries(new FormData(f)),id=o.id||null,isAd=String(o.is_ad_link)==='true';
  const payload={
    name:String(o.name||'').trim(),
    ref_code:String(o.ref_code||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,''),
    source:String(o.source||'').trim()||'Direct',
    campaign:String(o.campaign||'').trim()||null,
    destination_path:(()=>{const raw=String(o.destination_path||'/').trim()||'/';return raw==='/'?'/':`/${raw.replace(/^\/+|\/+$/g,'')}/`})(),
    course_id:o.course_id||null,
    is_ad_link:isAd,
    round_robin:f.elements.round_robin.checked,
    referral_whatsapp:String(o.referral_whatsapp||'').trim()||null,
    is_active:f.elements.is_active.checked,
    updated_at:new Date().toISOString()
  };
  if(isAd && !payload.course_id)return alert('Ad Link ke liye Course select karna required hai.');
  if(!payload.ref_code)return alert('Ref Code required hai.');
  try{
    let linkId=id;
    if(id){await one(supa.from('tracking_links').update(payload).eq('id',id))}
    else{
      const u=await A.getCurrentUser();payload.created_by=u.id;
      const row=await one(supa.from('tracking_links').insert(payload).select('id').single());linkId=row.id;
    }
    const teamIds=$$('#linkTeamPicks input:checked').map(x=>x.value);
    await rpc('admin_set_link_team_assignments',{p_link_id:linkId,p_team_ids:teamIds});
    closeLink();await reload();tab(isAd?'ads':'links');
  }catch(e){alert(e.message||'Could not save link.')}
}

function reportVisible(r){const f=$('#reportStatusFilter').value;return f==='all'||r.status===f}
function vipVisible(r){const f=$('#vipStatusFilter').value;return f==='all'||r.status===f}
function renderReports(){const rows=(state.reports||[]).filter(reportVisible);$('#reportsList').innerHTML=rows.length?rows.map(r=>`<article class="review-item"><div class="review-main"><b>${esc(r.team_name)} · ${esc(r.date)}</b><small>${esc(r.notes||'No note')}</small><div class="review-meta"><span>New Brokers ${r.new_broker_accounts||0}</span><span>IB Shifts ${r.ib_partner_shifts||0}</span><span>XM ${r.xm_lots||0}</span><span>DPrime ${r.dprime_lots||0}</span><span>Exness ${r.exness_lots||0}</span><span>Status ${esc(r.status)}</span></div></div><div class="review-actions"><button class="approve" data-report="${r.id}" data-status="approved">Approve</button><button class="reject" data-report="${r.id}" data-status="rejected">Reject</button></div></article>`).join(''):'<article class="review-item">No matching reports.</article>';$$('[data-report]').forEach(b=>b.onclick=()=>reviewReport(b.dataset.report,b.dataset.status))}
function renderVip(){const rows=(state.vip_conversions||[]).filter(vipVisible);$('#vipList').innerHTML=rows.length?rows.map(v=>`<article class="review-item"><div class="review-main"><b>${esc(v.student_name)} · ${esc(v.team_name)}</b><small>${esc(v.date)} · $${Number(v.amount||0).toFixed(2)}</small><div class="review-meta"><span>Status ${esc(v.status)}</span></div></div><div class="review-actions"><button class="approve" data-vip="${v.id}" data-status="approved">Approve</button><button class="reject" data-vip="${v.id}" data-status="rejected">Reject</button></div></article>`).join(''):'<article class="review-item">No matching VIP conversions.</article>';$$('[data-vip]').forEach(b=>b.onclick=()=>reviewVip(b.dataset.vip,b.dataset.status))}
async function reviewReport(id,status){const note=prompt(status==='rejected'?'Reason for rejection (optional)':'Admin note (optional)')||null;try{await rpc('admin_review_team_daily_report',{p_report_id:id,p_status:status,p_note:note});await load()}catch(e){alert(e.message)}}
async function reviewVip(id,status){const note=prompt(status==='rejected'?'Reason for rejection (optional)':'Admin note (optional)')||null;try{await rpc('admin_review_team_vip_conversion',{p_conversion_id:id,p_status:status,p_note:note});await load()}catch(e){alert(e.message)}}

$$('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('#teamSelect').onchange=()=>{renderAssignments();fillAccount()};
$('#saveAssignments').onclick=saveAssignments;$('#newTeamAccount').onclick=()=>fillAccount(true);$('#teamAccountForm').onsubmit=saveAccount;
$('#normalSearch').oninput=()=>renderLinks('normal');$('#adSearch').oninput=()=>renderLinks('ad');
$$('[data-new-link]').forEach(b=>b.onclick=()=>openLink(b.dataset.newLink));$$('[data-close-link]').forEach(b=>b.onclick=closeLink);$('#linkForm').onsubmit=saveLink;
$('#reportStatusFilter').onchange=renderReports;$('#vipStatusFilter').onchange=renderVip;
document.addEventListener('click',e=>{const c=e.target.closest('[data-copy]');if(c){navigator.clipboard.writeText(c.dataset.copy).then(()=>{c.textContent='Copied';setTimeout(()=>c.textContent='Copy',1000)})}const ed=e.target.closest('[data-edit-link]');if(ed){const l=(state.links||[]).find(x=>x.id===ed.dataset.editLink);if(l)openLink(l.is_ad_link?'ad':'normal',l)}});
window.addEventListener('hashchange',()=>tab(hashTab()));
if(supa)load();else document.body.textContent='Website connection is unavailable.';
})();
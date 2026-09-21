
(function(){
'use strict';
const A=window.App,sb=A?.supabase,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let state={accounts:[],links:[],courses:[]},linkType='normal';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg,bad=false){const t=$('#ufToast');t.textContent=msg;t.className='uf-toast show '+(bad?'bad':'ok');setTimeout(()=>t.className='uf-toast',2400)}
async function rpc(n,a={}){const r=await sb.rpc(n,a);if(r.error)throw r.error;return r.data}
async function one(q){const r=await q;if(r.error)throw r.error;return r.data}
function openModal(id){$('#'+id).classList.add('open')}
function closeModal(id){$('#'+id).classList.remove('open')}
function initials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()}
function slug(s){return String(s||'link').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,28)||'link'}
function refFor(name){return `${slug(name)}-${Date.now().toString(36).slice(-5)}`}
function normalizePath(p){const raw=String(p||'/').trim()||'/';return raw==='/'?'/':`/${raw.replace(/^\/+|\/+$/g,'')}/`}
function linkUrl(l){const u=new URL(normalizePath(l.destination_path||'/'),location.origin);u.searchParams.set('ref',l.ref_code);if(l.source)u.searchParams.set('source',l.source);if(l.campaign)u.searchParams.set('campaign',l.campaign);if(l.course_slug)u.searchParams.set('course',l.course_slug);return u.toString()}
function courseFree(c){return String(c?.course_type||'').toLowerCase()==='free'||Number(c?.discount_price??c?.price??0)===0}
function leadLabel(l){const teams=Array.isArray(l.assigned_teams)?l.assigned_teams:[];if(l.round_robin)return 'Auto Distribute';if(teams[0])return teams[0].display_name;return 'Auto Distribute'}
function activeTeam(){return(state.accounts||[]).filter(a=>a.is_active!==false&&a.receive_leads!==false)}
async function load(){
  try{
    const [team,links,courses]=await Promise.all([
      rpc('admin_get_team_manager'),
      rpc('admin_get_link_performance'),
      one(sb.from('courses').select('id,title,slug,course_type,price,discount_price,is_published,enrollment_open').order('created_at',{ascending:false}))
    ]);
    state.accounts=team?.accounts||[];state.links=links||[];state.courses=courses||[];
    render();
  }catch(e){toast(e.message||'Could not load Team & Links.',true)}
}
function render(){
  const active=state.accounts.filter(x=>x.is_active!==false).length;
  const leads=state.accounts.filter(x=>x.is_active!==false&&x.receive_leads!==false).length;
  $('#teamKpis').innerHTML=[['Team Members',state.accounts.length],['Active',active],['Accepting Leads',leads],['Links',state.links.length]].map(([a,b])=>`<div class="uf-kpi"><b>${b}</b><span>${a}</span></div>`).join('');
  renderTeam();renderLinks();fillSelects();
}
function renderTeam(){
  const q=String($('#teamSearch')?.value||'').toLowerCase();
  const rows=state.accounts.filter(a=>!q||`${a.display_name} ${a.username} ${a.email||''} ${a.whatsapp||''}`.toLowerCase().includes(q));
  $('#teamList').innerHTML=rows.length?rows.map(a=>{
    const n=Array.isArray(a.link_ids)?a.link_ids.length:0;
    return `<div class="uf-person"><div class="uf-avatar">${esc(initials(a.display_name||a.username))}</div><div class="uf-person-main"><b>${esc(a.display_name||a.username)}</b><small>@${esc(a.username)} · ${esc(a.whatsapp||'No WhatsApp')}</small><div class="uf-person-meta"><span class="uf-badge ${a.is_active!==false?'green':'red'}">${a.is_active!==false?'Active':'Disabled'}</span><span class="uf-badge">${a.receive_leads!==false?'Accepting Leads':'Leads Off'}</span><span class="uf-badge">${n} Link${n===1?'':'s'}</span></div></div><button class="uf-btn" data-edit-team="${a.id}"><i class="fa-solid fa-pen"></i> Edit</button></div>`;
  }).join(''):'<div class="uf-card uf-empty">No Team members yet. Click “Add Team Member”.</div>';
}
function renderLinks(){
  const q=String($('#linkSearch')?.value||'').toLowerCase(),f=$('#linkFilter')?.value||'all';
  const rows=state.links.filter(l=>(f==='all'||(f==='ad'&&l.is_ad_link)||(f==='normal'&&!l.is_ad_link))).filter(l=>!q||`${l.name} ${l.campaign||''} ${l.course_title||''} ${l.source||''}`.toLowerCase().includes(q));
  $('#linksBody').innerHTML=rows.length?rows.map(l=>{
    const target=l.is_ad_link?(l.course_title||'Course'):(l.destination_path==='/'?'Home':String(l.destination_path||'/').replaceAll('/',' ')||'Page');
    return `<tr><td><b>${esc(l.name)}</b><small>${esc(l.source||'Direct')}</small></td><td><span class="uf-badge ${l.is_ad_link?'gold':''}">${l.is_ad_link?'Ad Link':'Normal'}</span></td><td>${esc(target)}</td><td>${esc(leadLabel(l))}</td><td>${Number(l.signups||0)}</td><td><span class="uf-badge ${l.is_active?'green':'red'}">${l.is_active?'Active':'Off'}</span></td><td><div class="uf-actions"><button class="uf-btn" data-copy-link="${l.id}"><i class="fa-solid fa-copy"></i> Copy</button><button class="uf-btn" data-link-details="${l.id}">Details</button><button class="uf-btn" data-edit-link="${l.id}"><i class="fa-solid fa-pen"></i></button></div></td></tr>`;
  }).join(''):'<tr><td colspan="7"><div class="uf-empty">No links match this filter.</div></td></tr>';
}
function fillSelects(){
  $('#linkCourse').innerHTML='<option value="">Select Course</option>'+state.courses.filter(c=>c.is_published!==false).map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('');
  $('#leadTo').innerHTML='<option value="auto">Auto Distribute Between Active Team</option>'+activeTeam().map(a=>`<option value="${a.id}">${esc(a.display_name||a.username)}</option>`).join('');
}
function setTab(k){$$('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===k));$$('.uf-panel').forEach(p=>p.classList.toggle('on',p.dataset.panel===k));history.replaceState({},'',`#${k}`)}
function setLinkType(t){linkType=t;$('#linkForm').elements.link_type.value=t;$$('[data-link-type]').forEach(b=>b.classList.toggle('on',b.dataset.linkType===t));$('[data-normal-fields]').style.display=t==='normal'?'block':'none';$('[data-ad-fields]').style.display=t==='ad'?'block':'none';$('#linkModalTitle').textContent=$('#linkForm').elements.id.value?(t==='ad'?'Edit Ad Link':'Edit Normal Link'):(t==='ad'?'Create Ad Link':'Create Normal Link')}
function newTeam(){const f=$('#teamForm');f.reset();f.elements.team_id.value='';f.elements.is_active.checked=true;f.elements.receive_leads.checked=true;f.elements.password.required=true;$('#teamModalTitle').textContent='Add Team Member';openModal('teamModal')}
function editTeam(id){const a=state.accounts.find(x=>x.id===id);if(!a)return;const f=$('#teamForm');f.reset();f.elements.team_id.value=a.id;f.elements.display_name.value=a.display_name||'';f.elements.username.value=a.username||'';f.elements.whatsapp.value=a.whatsapp||'';f.elements.email.value=a.email||'';f.elements.password.required=false;f.elements.is_active.checked=a.is_active!==false;f.elements.receive_leads.checked=a.receive_leads!==false;$('#teamModalTitle').textContent='Edit Team Member';openModal('teamModal')}
async function saveTeam(e){e.preventDefault();const f=e.currentTarget,fd=new FormData(f),id=fd.get('team_id')||null;try{await rpc('admin_upsert_team_account_v12',{p_team_id:id,p_display_name:String(fd.get('display_name')||'').trim(),p_username:String(fd.get('username')||'').trim(),p_email:String(fd.get('email')||'').trim(),p_whatsapp:String(fd.get('whatsapp')||'').trim(),p_password:String(fd.get('password')||''),p_is_active:f.elements.is_active.checked,p_receive_leads:f.elements.receive_leads.checked});closeModal('teamModal');toast('Team member saved.');await load()}catch(e){toast(e.message||'Could not save Team member.',true)}}
function newLink(){const f=$('#linkForm');f.reset();f.elements.id.value='';f.elements.ref_code.value='';f.elements.is_active.checked=true;setLinkType('normal');fillSelects();f.elements.lead_to.value='auto';openModal('linkModal')}
function editLink(id){const l=state.links.find(x=>x.id===id);if(!l)return;const f=$('#linkForm');f.reset();f.elements.id.value=l.id;f.elements.ref_code.value=l.ref_code||'';f.elements.name.value=l.name||'';f.elements.is_active.checked=!!l.is_active;setLinkType(l.is_ad_link?'ad':'normal');if(l.is_ad_link){f.elements.course_id.value=l.course_id||'';f.elements.ad_source.value=l.source||'Meta Ads';f.elements.campaign.value=l.campaign||''}else{f.elements.normal_destination.value=normalizePath(l.destination_path||'/sign-up/');f.elements.normal_source.value=l.source||'WhatsApp'}const teams=Array.isArray(l.assigned_teams)?l.assigned_teams:[];f.elements.lead_to.value=l.round_robin?'auto':(teams[0]?.team_id||'auto');openModal('linkModal')}
async function saveLink(e){
 e.preventDefault();const f=e.currentTarget,fd=new FormData(f),id=String(fd.get('id')||''),name=String(fd.get('name')||'').trim();
 const type=String(fd.get('link_type')||'normal'),lead=String(fd.get('lead_to')||'auto');if(!name)return toast('Link name is required.',true);
 let course=null,source='',campaign=null,destination='';
 if(type==='ad'){course=state.courses.find(c=>c.id===String(fd.get('course_id')||''));if(!course)return toast('Please select a course.',true);source=String(fd.get('ad_source')||'Meta Ads');campaign=String(fd.get('campaign')||'').trim()||name;destination=courseFree(course)?'/free-course/':'/sign-up/'}
 else{source=String(fd.get('normal_source')||'WhatsApp');campaign=name;destination=normalizePath(fd.get('normal_destination')||'/sign-up/')}
 const payload={name,ref_code:String(fd.get('ref_code')||'').trim()||refFor(name),source,campaign,destination_path:destination,course_id:type==='ad'?course.id:null,is_ad_link:type==='ad',round_robin:lead==='auto',referral_whatsapp:null,is_active:f.elements.is_active.checked,updated_at:new Date().toISOString()};
 try{
   let linkId=id;
   if(id){await one(sb.from('tracking_links').update(payload).eq('id',id))}
   else{const u=await A.getCurrentUser();payload.created_by=u.id;const row=await one(sb.from('tracking_links').insert(payload).select('id').single());linkId=row.id}
   const ids=lead==='auto'?activeTeam().map(a=>a.id):[lead];
   await rpc('admin_set_link_team_assignments',{p_link_id:linkId,p_team_ids:ids});
   closeModal('linkModal');toast('Link saved.');await load();setTab('links');
 }catch(e){toast(e.message||'Could not save link.',true)}
}
function details(id){const l=state.links.find(x=>x.id===id);if(!l)return;$('#detailsTitle').textContent=l.name;$('#detailsKpis').innerHTML=[['Clicks',l.total_clicks||0],['Unique',l.unique_visitors||0],['Signups',l.signups||0],['Enrollments',l.enrollments||0]].map(([a,b])=>`<div class="uf-kpi"><b>${b}</b><span>${a}</span></div>`).join('');$('#detailsInfo').innerHTML=`<b>Conversion:</b> ${Number(l.conversion_rate||0).toFixed(1)}%<br><b>Lead Assignment:</b> ${esc(leadLabel(l))}<br><b>URL:</b> ${esc(linkUrl(l))}`;openModal('detailsModal')}
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-tab]');if(tab)setTab(tab.dataset.tab);
 const c=e.target.closest('[data-close-modal]');if(c)closeModal(c.dataset.closeModal);
 const t=e.target.closest('[data-link-type]');if(t)setLinkType(t.dataset.linkType);
 const et=e.target.closest('[data-edit-team]');if(et)editTeam(et.dataset.editTeam);
 const el=e.target.closest('[data-edit-link]');if(el)editLink(el.dataset.editLink);
 const dl=e.target.closest('[data-link-details]');if(dl)details(dl.dataset.linkDetails);
 const cp=e.target.closest('[data-copy-link]');if(cp){const l=state.links.find(x=>x.id===cp.dataset.copyLink);if(l)navigator.clipboard.writeText(linkUrl(l)).then(()=>toast('Link copied.'))}
});
$('#addTeam').onclick=newTeam;$('#addLink').onclick=newLink;$('#teamForm').onsubmit=saveTeam;$('#linkForm').onsubmit=saveLink;$('#teamSearch').oninput=renderTeam;$('#linkSearch').oninput=renderLinks;$('#linkFilter').onchange=renderLinks;
window.addEventListener('DOMContentLoaded',()=>{setTab(location.hash==='#links'?'links':'team');load()});
})();

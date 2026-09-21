
(function(){
'use strict';
const A=window.App,sb=A?.supabase,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let state={profiles:[],payments:[],ib:[],settings:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg,bad=false){const t=$('#ufToast');t.textContent=msg;t.className='uf-toast show '+(bad?'bad':'ok');setTimeout(()=>t.className='uf-toast',2500)}
function open(id){$('#'+id).classList.add('open')}function close(id){$('#'+id).classList.remove('open')}
function name(id){return state.profiles.find(p=>p.id===id)?.full_name||state.profiles.find(p=>p.id===id)?.email||'Student'}
function fmt(d){if(!d)return'—';return new Date(d).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric'})}
function money(r){return r.currency==='PKR'?`PKR ${Number(r.amount||0).toLocaleString()}`:`${Number(r.amount||0).toLocaleString()} ${r.currency||'USDT'}`}
function access(p){
 const s=state.settings||{},now=Date.now();
 if(s.package_mode==='free')return{active:true,source:'Free',expiry:null,days:null};
 if(p.premium_access_expires_at&&new Date(p.premium_access_expires_at).getTime()>now){const exp=new Date(p.premium_access_expires_at);return{active:true,source:String(p.premium_access_source||'Premium').replaceAll('_',' '),expiry:exp,days:Math.max(0,Math.ceil((exp-now)/86400000))}}
 if(s.trial_enabled&&p.trial_started_at&&Number(s.trial_days||0)>0){const exp=new Date(new Date(p.trial_started_at).getTime()+Number(s.trial_days)*86400000);if(exp.getTime()>now)return{active:true,source:'Free Trial',expiry:exp,days:Math.max(0,Math.ceil((exp-now)/86400000))}}
 return{active:false,source:'No Access',expiry:null,days:0}
}
async function load(){
 try{
  const [profiles,payments,ib,settings]=await Promise.all([
   sb.from('profiles').select('id,full_name,email,whatsapp,role,premium_access_expires_at,premium_access_source,trial_started_at,created_at').eq('role','student').order('created_at',{ascending:false}).limit(2000),
   sb.from('premium_payments').select('*').order('created_at',{ascending:false}).limit(500),
   sb.from('ib_verifications').select('*').order('created_at',{ascending:false}).limit(500),
   sb.from('premium_package_settings').select('*').eq('id',1).maybeSingle()
  ]);
  [profiles,payments,ib,settings].forEach(r=>{if(r.error)throw r.error});
  state.profiles=profiles.data||[];state.payments=payments.data||[];state.ib=ib.data||[];state.settings=settings.data||{};
  render();
 }catch(e){toast(e.message||'Could not load Premium.',true)}
}
function render(){
 const active=state.profiles.filter(p=>access(p).active).length;
 const pending=state.payments.filter(x=>['received','initiated','under_review'].includes(x.status)).length;
 const pendingIb=state.ib.filter(x=>x.status==='pending').length;
 const soon=state.profiles.filter(p=>{const a=access(p);return a.active&&a.days!=null&&a.days<=7}).length;
 $('#premiumKpis').innerHTML=[['Active Premium',active],['Pending Payments',pending],['Pending IB',pendingIb],['Expiring Soon',soon]].map(([a,b])=>`<div class="uf-kpi"><b>${b}</b><span>${a}</span></div>`).join('');
 renderUsers();renderRequests();fillForms();
}
function renderUsers(){
 const q=String($('#premiumSearch')?.value||'').toLowerCase(),f=$('#premiumFilter')?.value||'all';
 const rows=state.profiles.filter(p=>{const a=access(p);return(f==='all'||(f==='active'&&a.active)||(f==='expired'&&!a.active))&&(!q||`${p.full_name||''} ${p.email||''}`.toLowerCase().includes(q))});
 $('#premiumUsersBody').innerHTML=rows.length?rows.map(p=>{const a=access(p);return `<tr><td><b>${esc(p.full_name||'Student')}</b><small>${esc(p.email||'')}</small></td><td><span class="uf-badge ${a.active?'gold':''}">${esc(a.source)}</span></td><td>${a.expiry?fmt(a.expiry):a.active?'No Expiry':'—'}</td><td>${a.days==null?'—':a.days}</td><td><div class="uf-actions"><button class="uf-btn" data-grant-user="${p.id}">${a.active?'Extend':'Grant'}</button>${a.active&&a.source!=='Free'?`<button class="uf-btn danger" data-revoke-user="${p.id}">End Access</button>`:''}</div></td></tr>`}).join(''):'<tr><td colspan="5"><div class="uf-empty">No students match this filter.</div></td></tr>';
}
function rowCard(title,sub,status,actions){return `<div class="uf-person"><div class="uf-person-main"><b>${esc(title)}</b><small>${esc(sub)}</small><div class="uf-person-meta"><span class="uf-badge">${esc(status)}</span></div></div><div class="uf-actions">${actions}</div></div>`}
function renderRequests(){
 const p=state.payments.filter(x=>!['approved','declined'].includes(x.status));
 $('#premiumPaymentsList').innerHTML=p.length?p.map(r=>rowCard(name(r.student_id),`${money(r)} · ${r.payment_method_name||''}`,r.status,`<button class="uf-btn gold" data-pay-review="${r.id}" data-status="approved">Approve</button><button class="uf-btn danger" data-pay-review="${r.id}" data-status="declined">Decline</button>`)).join(''):'<div class="uf-empty">No pending premium payments.</div>';
 const ib=state.ib.filter(x=>x.status==='pending');
 $('#premiumIbList').innerHTML=ib.length?ib.map(r=>rowCard(name(r.student_id),`${r.broker||''} · ${r.trading_account_id||''}`,r.status,`${(r.deposit_proof_path||r.proof_path||r.broker_confirmation_proof_path)?`<button class="uf-btn" data-proof="${r.id}">Proof</button>`:''}<button class="uf-btn gold" data-ib-review="${r.id}" data-status="approved">Approve</button><button class="uf-btn danger" data-ib-review="${r.id}" data-status="declined">Decline</button>`)).join(''):'<div class="uf-empty">No pending IB requests.</div>';
}
function fillForms(){
 $('#grantStudent').innerHTML=state.profiles.map(p=>`<option value="${p.id}">${esc(p.full_name||p.email)} · ${esc(p.email||'')}</option>`).join('');
 const s=state.settings||{},f=$('#settingsForm');if(!f)return;f.elements.package_mode.value=s.package_mode||'paid';f.elements.trial_enabled.checked=!!s.trial_enabled;f.elements.trial_days.value=s.trial_days??0;f.elements.price_pkr.value=s.price_pkr??0;f.elements.price_usdt.value=s.price_usdt??0;f.elements.ib_enabled.checked=!!s.ib_enabled;f.elements.ib_access_days.value=s.ib_access_days??30;
}
function setTab(t){$$('[data-prem-tab]').forEach(b=>b.classList.toggle('on',b.dataset.premTab===t));$$('[data-prem-panel]').forEach(p=>p.classList.toggle('on',p.dataset.premPanel===t))}
async function grant(e){e.preventDefault();const f=e.currentTarget,fd=new FormData(f);try{await sb.rpc('admin_manage_premium_access_v12_13',{p_user_id:fd.get('user_id'),p_action:'extend',p_days:Number(fd.get('days')||30),p_note:String(fd.get('note')||'').trim()||null}).then(r=>{if(r.error)throw r.error});close('grantModal');toast('Premium access updated.');await load()}catch(e){toast(e.message||'Could not update access.',true)}}
async function revoke(id){if(!confirm('End Premium access for this student now?'))return;try{const r=await sb.rpc('admin_manage_premium_access_v12_13',{p_user_id:id,p_action:'revoke',p_days:null,p_note:'Ended by Admin'});if(r.error)throw r.error;toast('Premium access ended.');await load()}catch(e){toast(e.message,true)}}
async function saveSettings(e){e.preventDefault();const f=e.currentTarget;try{const r=await sb.rpc('admin_update_premium_settings',{p_package_mode:f.elements.package_mode.value,p_trial_enabled:f.elements.trial_enabled.checked,p_trial_days:Number(f.elements.trial_days.value||0),p_monthly_days:30,p_price_pkr:Number(f.elements.price_pkr.value||0),p_price_usdt:Number(f.elements.price_usdt.value||0),p_ib_enabled:f.elements.ib_enabled.checked,p_ib_access_days:Number(f.elements.ib_access_days.value||30)});if(r.error)throw r.error;close('settingsModal');toast('Premium settings saved.');await load()}catch(e){toast(e.message,true)}}
async function flush(){try{await sb.functions.invoke('process-email-queue',{body:{limit:50,retry_failed:true}})}catch(_){}}
async function reviewPay(id,status){let note=null;if(status==='declined'){note=prompt('Decline reason:')||'';if(!note.trim())return}try{const r=await sb.rpc('admin_review_premium_payment',{p_payment_id:id,p_status:status,p_admin_note:note});if(r.error)throw r.error;await flush();toast(status==='approved'?'Premium payment approved.':'Premium payment declined.');await load()}catch(e){toast(e.message,true)}}
async function reviewIb(id,status){let note=null;if(status==='declined'){note=prompt('Decline reason:')||'';if(!note.trim())return}try{const r=await sb.rpc('admin_review_ib_verification',{p_id:id,p_status:status,p_admin_note:note});if(r.error)throw r.error;await flush();toast(status==='approved'?'IB access approved.':'IB request declined.');await load()}catch(e){toast(e.message,true)}}
async function proof(id){const r=state.ib.find(x=>x.id===id);if(!r)return;const path=r.deposit_proof_path||r.broker_confirmation_proof_path||r.proof_path;if(!path)return toast('Proof unavailable.',true);const q=await sb.storage.from('ib-proofs').createSignedUrl(path,120);if(q.error)return toast(q.error.message,true);window.open(q.data.signedUrl,'_blank','noopener')}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-prem-tab]');if(t)setTab(t.dataset.premTab);
 const c=e.target.closest('[data-close-modal]');if(c)close(c.dataset.closeModal);
 const g=e.target.closest('[data-grant-user]');if(g){$('#grantStudent').value=g.dataset.grantUser;open('grantModal')}
 const r=e.target.closest('[data-revoke-user]');if(r)revoke(r.dataset.revokeUser);
 const pr=e.target.closest('[data-pay-review]');if(pr)reviewPay(pr.dataset.payReview,pr.dataset.status);
 const ir=e.target.closest('[data-ib-review]');if(ir)reviewIb(ir.dataset.ibReview,ir.dataset.status);
 const pf=e.target.closest('[data-proof]');if(pf)proof(pf.dataset.proof);
});
$('#grantPremium').onclick=()=>open('grantModal');$('#premiumSettings').onclick=()=>open('settingsModal');$('#grantForm').onsubmit=grant;$('#settingsForm').onsubmit=saveSettings;$('#premiumSearch').oninput=renderUsers;$('#premiumFilter').onchange=renderUsers;
window.addEventListener('DOMContentLoaded',load);
})();

(function(){
'use strict';
const A=window.App;if(!A?.supabase)return;
const sb=A.supabase,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
let access=null,payments=[],verifications=[],methods=[],selectedBroker='',accountMode='new',user=null;
const esc=v=>A.escapeHtml?A.escapeHtml(v??''):String(v??'');
const money=(v,c)=>A.formatMoney?A.formatMoney(Number(v||0),c):`${c} ${Number(v||0).toFixed(2)}`;
function err(e,f='Something went wrong.'){console.error('[V12.24 Student Access]',e);A.toast?.(A.friendlyError?.(e,f)||e?.message||f,'error')}
function step(name){$$('[data-access-step]').forEach(x=>x.classList.toggle('access-hidden',x.dataset.accessStep!==name))}
function statusHtml(){
 if(!access)return '<b>Checking your access…</b>';
 if(access.has_access){
   const until=access.expires_at?new Date(access.expires_at).toLocaleDateString():'No expiry';
   return `<b>Premium access is active.</b><br><small>Source: ${esc(access.source||'active')} · ${esc(until)}${access.days_left!=null?` · ${access.days_left} day(s) left`:''}</small>`;
 }
 const pending=payments.find(x=>['received','under_review'].includes(String(x.status).toLowerCase()));
 const ib=verifications.find(x=>String(x.status).toLowerCase()==='pending');
 if(pending)return '<b>Premium payment is under review.</b><br><small>You do not need to submit another payment.</small>';
 if(ib)return '<b>Broker verification is under review.</b><br><small>Admin will update your access after verification.</small>';
 return '<b>Premium access is not active.</b><br><small>Choose Paid Access or Free Access via Broker below.</small>';
}
function render(){
 const compact=$('#premiumCompactStatus'),box=$('#allAccessCurrentStatus'),price=$('#premiumPriceBox'),ib=$('#premiumIbStatus');
 if(compact){
   const on=Boolean(access?.has_access);compact.classList.toggle('locked',!on);compact.classList.toggle('active',on);
   compact.innerHTML=`<i class="fa-solid fa-circle"></i> ${on?'Active':payments.some(x=>['received','under_review'].includes(String(x.status).toLowerCase()))||verifications.some(x=>x.status==='pending')?'Pending':'Locked'}`;
 }
 if(box)box.innerHTML=statusHtml();
 if(price&&access){
   const pkr=Number(access.price_pkr||0),usd=Number(access.price_usdt||0),paidAvailable=pkr>0||usd>0;
   if(paidAvailable){
     price.innerHTML='<div class="profile-access-choice-grid"><div class="access-link-box"><small>Local Bank</small><b>'+ (pkr>0?money(pkr,"PKR"):"Not configured") +'</b></div><div class="access-link-box"><small>USDT TRC20</small><b>'+ (usd>0?'$'+usd.toLocaleString():"Not configured") +'</b></div></div><p class="muted" style="margin:8px 0 0">'+Number(access.monthly_days||30)+' days access after approval.</p>';
   }else{
     price.innerHTML='<div class="notice warn">Paid Access pricing is not configured yet. Please use Free Access via Broker or contact support.</div>';
   }
   const paidChoice=$('[data-access-step-target="paid"]');if(paidChoice){paidChoice.disabled=!paidAvailable;paidChoice.classList.toggle('is-disabled',!paidAvailable)}
   const bank=$('#premiumPayLocal'),usdButton=$('#premiumPayUsdt');if(bank)bank.disabled=pkr<=0;if(usdButton)usdButton.disabled=usd<=0;
 }
 if(ib&&access)ib.innerHTML=access.ib_enabled?'<div class="notice info">Broker verification is available. Access activates after Admin approval.</div>':'<div class="notice warn">Broker verification is currently disabled.</div>';
 renderHistory();
}
function renderHistory(){
 const body=$('#premiumPaymentsBody');if(!body)return;
 const rows=payments.map(x=>({created_at:x.created_at,method:x.payment_method_name,amount:x.amount,currency:x.currency,status:x.status,expires:x.access_expires_at,note:x.admin_note||x.provider_rejection_reason||''}));
 body.innerHTML=rows.length?rows.map(x=>`<tr><td>${A.formatDateTime?.(x.created_at)||''}</td><td>${esc(x.method||'—')}</td><td>${esc(x.currency||'')}&nbsp;${Number(x.amount||0).toLocaleString()}</td><td><span class="status-pill ${A.statusClass?.(x.status)||''}">${esc(A.statusLabel?.(x.status)||x.status||'—')}</span></td><td>${x.expires?esc(new Date(x.expires).toLocaleDateString()):'—'}</td><td>${esc(x.note||'—')}</td></tr>`).join(''):'<tr><td colspan="6">No premium payment history yet.</td></tr>';
}
async function load(){
 try{
   user=await A.getCurrentUser();if(!user)return;
   const [a,p,v,m]=await Promise.all([
     sb.rpc('get_my_premium_access'),
     sb.from('premium_payments').select('*').eq('student_id',user.id).order('created_at',{ascending:false}).limit(50),
     sb.from('ib_verifications').select('*').eq('student_id',user.id).order('created_at',{ascending:false}).limit(20),
     sb.from('payment_methods').select('*').eq('is_active',true).order('sort_order')
   ]);
   if(a.error)throw a.error;access=a.data||{};payments=p.data||[];verifications=v.data||[];methods=m.data||[];
   render();
 }catch(e){err(e,'Could not load Premium Access.')}
}
function openAccess(){step('home');A.openModal('premiumAccessModal');load()}
window.__24K_OPEN_PREMIUM_ACCESS__=openAccess;
function methodMatch(type){
 const rx=type==='bank'?/bank|local/i:/usdt|trc20|crypto/i;return methods.find(x=>rx.test(`${x.name} ${x.instructions}`))||null
}
function renderMethodInfo(type){
 const m=methodMatch(type);
 if(type==='bank'){
   const el=$('#premiumBankMethodInfo');if(el)el.innerHTML=m?`<div class="notice info"><b>${esc(m.name)}</b><br>Account title: ${esc(m.account_title||'—')}<br>Account / Number: ${esc(m.account_number||'—')}<br>${esc(m.instructions||'')}</div>`:'<div class="notice warn">Local Bank details are not configured. Contact support before paying.</div>';
   const s=$('#premiumBankSummary');if(s&&access)s.innerHTML=`Premium Market Access · <b>${money(access.price_pkr,'PKR')}</b> · ${Number(access.monthly_days||30)} days`;
 }else{
   const s=$('#premiumUsdtSummary');if(s&&access)s.innerHTML=`Premium Market Access · <b>$${Number(access.price_usdt||0).toLocaleString()}</b> USDT · ${Number(access.monthly_days||30)} days`;
 }
}
async function upload(bucket,file,folder){
 if(!file?.size)throw new Error('Please select the required proof file.');
 if(file.size>5*1024*1024)throw new Error('Proof file must be 5 MB or smaller.');
 const path=`${user.id}/${folder}/${A.uid()}-${A.fileSafeName(file.name)}`;
 const r=await sb.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||undefined});if(r.error)throw r.error;return path;
}
async function submitPremium(e,type){
 e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]'),fd=new FormData(f),file=fd.get('receipt');
 A.setLoading(b,true,'Submitting...');
 try{
   if(!user)user=await A.getCurrentUser();
   const path=await upload('payment-receipts',file,`premium-${type}`);
   const name=type==='bank'?'submit_premium_bank_payment':'submit_premium_usdt_payment';
   const r=await sb.rpc(name,{p_reference:String(fd.get('transaction_reference')||'').trim(),p_receipt_path:path,p_note:String(fd.get('student_note')||'').trim()||null});
   if(r.error)throw r.error;f.reset();A.closeModal(type==='bank'?'premiumBankModal':'premiumUsdtModal');A.toast?.('Premium payment submitted for Admin review.','success');await load();
 }catch(e2){err(e2,'Could not submit Premium payment.')}finally{A.setLoading(b,false)}
}
function brokerGuide(){
 const guide=$('#allAccessModeGuide'),details=$('#allAccessBrokerDetails'),linkWrap=$('#allAccessBrokerLinkWrap'),link=$('#allAccessBrokerLink');
 if(details)details.classList.toggle('access-hidden',!selectedBroker);
 if(!selectedBroker){if(guide)guide.textContent='Choose a broker to continue.';return}
 const shift=accountMode==='existing';
 const text=shift
  ? (selectedBroker==='Exness'
     ? 'Existing Account / IB Shift: Open Exness Live Chat → ask for “Change Partner” → choose Education as the reason → use the official 24K partner link provided by Support → complete the partner-change request.'
     : `Existing ${selectedBroker} account: choose Partner / IB Shift and follow the official transfer instructions provided by 24K Support.`)
  : `New Account: create a new ${selectedBroker} account using the official 24K partner link, make the required deposit, then submit your account ID and deposit proof.`;
 if(guide)guide.innerHTML=`<b>${esc(selectedBroker)} — ${shift?'Partner / IB Shift':'New Account'}</b><br>${esc(text)}`;
 const cfg=window.APP_CONFIG?.BROKER_PARTNER_LINKS?.[selectedBroker]||'';
 if(linkWrap)linkWrap.classList.toggle('access-hidden',!cfg);
 if(link&&cfg){link.href=cfg;link.textContent=cfg}
}
async function submitIb(e){
 e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]'),fd=new FormData(f);
 A.setLoading(b,true,'Uploading proofs...');
 try{
   if(!user)user=await A.getCurrentUser();
   const deposit=fd.get('deposit_proof'),confirm=fd.get('confirmation_proof');
   const depPath=await upload('ib-proofs',deposit,'deposit');
   let confPath=null;if(confirm?.size)confPath=await upload('ib-proofs',confirm,'confirmation');
   const r=await sb.rpc('submit_ib_verification_v969',{
     p_broker:String(fd.get('broker')||'').trim(),
     p_account_id:String(fd.get('trading_account_id')||'').trim(),
     p_account_type:String(fd.get('account_type')||'new').trim(),
     p_deposit_amount:Number(fd.get('deposit_amount')||0),
     p_deposit_proof_path:depPath,
     p_confirmation_proof_path:confPath,
     p_note:String(fd.get('note')||'').trim()||null
   });
   if(r.error)throw r.error;f.reset();A.closeModal('ibVerificationModal');A.toast?.('Broker verification submitted for Admin review.','success');await load();
 }catch(e2){err(e2,'Could not submit Broker verification.')}finally{A.setLoading(b,false)}
}
document.addEventListener('click',e=>{
 const manage=e.target.closest('#managePremiumAccess,#premiumAccessRow');if(manage){e.preventDefault();openAccess();return}
 const st=e.target.closest('[data-access-step-target]');if(st){e.preventDefault();step(st.dataset.accessStepTarget);return}
 const broker=e.target.closest('[data-broker-select]');if(broker){selectedBroker=broker.dataset.brokerSelect;$$('[data-broker-select]').forEach(x=>x.classList.toggle('active',x===broker));brokerGuide();return}
 const mode=e.target.closest('[data-access-account-mode]');if(mode){accountMode=mode.dataset.accessAccountMode||'new';$$('[data-access-account-mode]').forEach(x=>x.classList.toggle('active',x===mode));brokerGuide();return}
 if(e.target.closest('#premiumPayLocal')){renderMethodInfo('bank');A.openModal('premiumBankModal');return}
 if(e.target.closest('#premiumPayUsdt')){renderMethodInfo('usdt');A.openModal('premiumUsdtModal');return}
 if(e.target.closest('#openIbVerification')){
   if(!selectedBroker)return A.toast?.('Choose Exness, XM or DPrime first.','warning');
   const f=$('#ibVerificationForm');if(f){f.elements.broker.value=selectedBroker;f.elements.account_type.value=accountMode;$('#ibPartnerLinkWrap')?.classList.toggle('hidden',accountMode!=='existing');$('#ibBrokerInstructions').innerHTML=$('#allAccessModeGuide')?.innerHTML||''}
   A.closeModal('premiumAccessModal');A.openModal('ibVerificationModal');return
 }
 if(e.target.closest('#ibCopyPartnerLink,#copyAllAccessBrokerLink')){
   const href=$('#allAccessBrokerLink')?.href||$('#ibSelectedPartnerLink')?.href||'';if(href)navigator.clipboard.writeText(href).then(()=>A.toast?.('Partner link copied.','success'));else A.toast?.('Partner link is not configured yet.','warning');
 }
});
$('#ibBrokerSelect')?.addEventListener('change',e=>{selectedBroker=e.target.value;brokerGuide()});
$('#ibAccountAction')?.addEventListener('change',e=>{accountMode=e.target.value;brokerGuide()});
$('#premiumBankForm')?.addEventListener('submit',e=>submitPremium(e,'bank'));
$('#premiumUsdtForm')?.addEventListener('submit',e=>submitPremium(e,'usdt'));
$('#ibVerificationForm')?.addEventListener('submit',submitIb);
window.addEventListener('24k:student-base-updated',load);
load();
})();
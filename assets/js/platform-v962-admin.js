(async function(){
  'use strict';
  const A=window.App;if(!A?.supabase)return;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  for(let i=0;i<120&&!window.AdminOps;i++)await sleep(100);
  if(!window.AdminOps)return;
  const esc=v=>A.escapeHtml(v??'');
  const state={settings:null,payments:[],ib:[],audit:[]};
  install();bind();await refresh();subscribe();

  function install(){
    // Remove two retired Admin areas from navigation and content.
    ['leads','settings'].forEach(key=>{document.querySelectorAll(`[data-panel="${key}"],[data-goto="${key}"]`).forEach(el=>el.remove());document.getElementById(`p-${key}`)?.remove();});
    const nav=document.querySelector('.app-nav');
    if(nav&&!nav.querySelector('[data-panel="premium-access"]')){
      const link=document.createElement('a');link.href='#';link.dataset.panel='premium-access';link.innerHTML='<i class="fa-solid fa-crown"></i> Premium Access';
      const links=nav.querySelector('[data-panel="links"]');(links||nav.lastElementChild)?.after(link);
    }
    const content=document.querySelector('.app-content');
    if(content&&!document.getElementById('p-premium-access')) content.insertAdjacentHTML('beforeend',premiumPanel());
    upgradeAuditPanel();
  }
  function premiumPanel(){return `<section class="panel" id="p-premium-access">
    <div class="panel-heading"><div><h2>Premium Market Access</h2><p>Manage the Signals + Charts + Articles package, free trial, monthly renewals and IB verification.</p></div></div>
    <div class="app-grid cols-2 premium-admin-grid"><div class="app-card"><form id="premiumSettingsForm"><div class="app-card-head"><div><h3>Package & Trial Settings</h3><p>These settings control premium content only. Courses stay separate.</p></div></div><div class="form-grid">
      <div class="form-field"><label>Package Mode</label><select name="package_mode"><option value="paid">Paid</option><option value="free">Free</option></select></div>
      <label class="check-row"><input type="checkbox" name="trial_enabled"> Free trial enabled</label>
      <div class="form-field"><label>Free Trial Days</label><input type="number" min="0" max="365" name="trial_days"></div>
      <div class="form-field"><label>Renewal Cycle</label><input type="number" name="monthly_days" value="30" readonly><small class="muted">Fixed monthly subscription: 30 days.</small></div>
      <div class="form-field"><label>Price — PKR</label><input type="number" min="0" step="0.01" name="price_pkr"></div>
      <div class="form-field"><label>Price — USDT</label><input type="number" min="0" step="0.01" name="price_usdt"></div>
      <label class="check-row"><input type="checkbox" name="ib_enabled"> IB/Broker verification enabled</label>
      <div class="form-field"><label>IB Access Days</label><input type="number" min="1" max="3650" name="ib_access_days" value="30"></div>
    </div><div class="inline-actions"><button class="app-btn gold" type="submit">Save Premium Settings</button></div></form></div>
    <div class="app-card premium-package-explainer"><i class="fa-solid fa-crown"></i><h3>One Premium Package</h3><p>Signals, Charts and Articles unlock together.</p><div class="premium-admin-points"><span><b>Free Trial</b> Admin-defined days for new students</span><span><b>Paid Renewal</b> 30 days by default after approval</span><span><b>IB Access</b> Unlock after broker/account verification</span><span><b>Auto Lock</b> Content locks when access expires</span></div></div></div>
    <div class="app-card"><div class="app-card-head"><div><h3>Premium Payments</h3><p>Local Bank and USDT monthly renewals.</p></div></div><div class="table-scroll"><table class="admin-table"><thead><tr><th>Student</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th><th>Access Until</th><th>Actions</th></tr></thead><tbody id="premiumAdminPayments"></tbody></table></div></div>
    <div class="app-card"><div class="app-card-head"><div><h3>IB / Broker Verifications</h3><p>Approve accounts opened or linked under your IB relationship.</p></div></div><div class="table-scroll"><table class="admin-table"><thead><tr><th>Student</th><th>Broker</th><th>Account</th><th>Submitted</th><th>Status</th><th>Proof</th><th>Actions</th></tr></thead><tbody id="premiumIbBody"></tbody></table></div></div>
  </section>`;}
  function upgradeAuditPanel(){const p=document.getElementById('p-audit');if(!p)return;p.innerHTML=`<div class="panel-heading"><div><h2>Activity Logs</h2><p>Append-only audit trail for Admin, Student and Team actions.</p></div><button class="app-btn outline" id="auditV962Refresh"><i class="fa-solid fa-rotate"></i> Refresh</button></div><div class="audit-filter-grid"><input id="auditV962Search" type="search" placeholder="Search user, action, IP or location..."><select id="auditV962Role"><option value="all">All Roles</option><option value="admin">Admin</option><option value="student">Student</option><option value="team">Team</option><option value="system">System</option></select><input id="auditV962Action" placeholder="Action contains..."><select id="auditV962Status"><option value="all">All Status</option><option value="success">Success</option><option value="failed">Failed</option></select><input id="auditV962Date" type="date"></div><div class="table-scroll"><table class="admin-table audit-v962-table"><thead><tr><th>Actor</th><th>Role</th><th>Action</th><th>Target</th><th>Status</th><th>Date & Time</th><th>Device / Browser</th><th>IP</th><th>Location</th></tr></thead><tbody id="auditV962Body"></tbody></table></div>`;}
  function profileName(id){return window.AdminBase?.state?.profiles?.find(p=>p.id===id)?.full_name||'Student';}
  async function refresh(){
    const [settings,payments,ib,audit]=await Promise.all([
      A.supabase.from('premium_package_settings').select('*').eq('id',1).maybeSingle(),
      A.supabase.from('premium_payments').select('*').order('created_at',{ascending:false}).limit(500),
      A.supabase.from('ib_verifications').select('*').order('created_at',{ascending:false}).limit(500),
      A.supabase.from('activity_audit_log').select('*').order('created_at',{ascending:false}).limit(1500)
    ]);
    [settings,payments,ib,audit].forEach(r=>{if(r.error)console.warn('[V9.62]',r.error.message)});
    state.settings=settings.data||null;state.payments=payments.data||[];state.ib=ib.data||[];state.audit=audit.data||[];
    renderSettings();renderPayments();renderIb();renderAudit();
  }
  function renderSettings(){const f=document.getElementById('premiumSettingsForm'),s=state.settings;if(!f||!s)return;['package_mode','trial_days','monthly_days','price_pkr','price_usdt','ib_access_days'].forEach(k=>{if(f.elements[k])f.elements[k].value=s[k]??''});f.elements.trial_enabled.checked=!!s.trial_enabled;f.elements.ib_enabled.checked=!!s.ib_enabled;}
  function renderPayments(){const b=document.getElementById('premiumAdminPayments');if(!b)return;b.innerHTML=state.payments.length?state.payments.map(r=>`<tr><td><b>${esc(profileName(r.student_id))}</b></td><td>${A.formatDateTime(r.created_at)}</td><td>${esc(r.payment_method_name)}</td><td>${esc(r.currency==='PKR'?`PKR ${Number(r.amount||0).toLocaleString()}`:`${Number(r.amount||0).toLocaleString()} USDT`)}</td><td><span class="status-pill ${A.statusClass(r.status)}">${A.statusLabel(r.status)}</span></td><td>${r.access_expires_at?A.formatDateTime(r.access_expires_at):'—'}</td><td><div class="table-actions">${['received','initiated'].includes(r.status)?`<button class="app-btn small outline" data-premium-review="${r.id}" data-premium-status="under_review">Review</button>`:''}${r.status!=='approved'?`<button class="app-btn small gold" data-premium-review="${r.id}" data-premium-status="approved">Approve</button>`:''}${!['declined','approved'].includes(r.status)?`<button class="app-btn small danger" data-premium-review="${r.id}" data-premium-status="declined">Decline</button>`:''}</div></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty-state compact">No premium payments yet.</div></td></tr>';}
  function renderIb(){const b=document.getElementById('premiumIbBody');if(!b)return;b.innerHTML=state.ib.length?state.ib.map(r=>`<tr><td><b>${esc(profileName(r.student_id))}</b></td><td>${esc(r.broker)}</td><td>${esc(r.trading_account_id)}</td><td>${A.formatDateTime(r.created_at)}</td><td><span class="status-pill ${A.statusClass(r.status)}">${A.statusLabel(r.status)}</span></td><td>${r.proof_path?`<button class="app-btn small outline" data-ib-proof="${r.id}">View Proof</button>`:'—'}</td><td><div class="table-actions">${r.status==='pending'?`<button class="app-btn small gold" data-ib-review="${r.id}" data-ib-status="approved">Approve</button><button class="app-btn small danger" data-ib-review="${r.id}" data-ib-status="declined">Decline</button>`:'—'}</div></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty-state compact">No IB verification requests.</div></td></tr>';}
  function renderAudit(){const b=document.getElementById('auditV962Body');if(!b)return;const q=(document.getElementById('auditV962Search')?.value||'').toLowerCase().trim(),role=document.getElementById('auditV962Role')?.value||'all',act=(document.getElementById('auditV962Action')?.value||'').toLowerCase().trim(),status=document.getElementById('auditV962Status')?.value||'all',date=document.getElementById('auditV962Date')?.value||'';const rows=state.audit.filter(r=>{const hay=`${r.actor_name||''} ${r.actor_email||''} ${r.action||''} ${r.entity_type||''} ${r.ip_address||''} ${r.city||''} ${r.country||''}`.toLowerCase();return(!q||hay.includes(q))&&(role==='all'||r.actor_role===role)&&(!act||String(r.action||'').toLowerCase().includes(act))&&(status==='all'||r.status===status)&&(!date||String(r.created_at||'').slice(0,10)===date)});b.innerHTML=rows.length?rows.map(r=>`<tr><td><b>${esc(r.actor_name||r.actor_email||'System')}</b><small>${esc(r.actor_email||'')}</small></td><td><span class="status-pill neutral">${esc(r.actor_role)}</span></td><td><b>${esc(String(r.action||'').replaceAll('_',' '))}</b></td><td>${esc(r.entity_type||'—')}${r.entity_id?`<small>${esc(r.entity_id)}</small>`:''}</td><td><span class="status-pill ${r.status==='failed'?'bad':'ok'}">${esc(r.status)}</span></td><td>${A.formatDateTime(r.created_at)}</td><td>${esc([r.device,r.browser].filter(Boolean).join(' · ')||'—')}</td><td>${esc(r.ip_address||'—')}</td><td>${esc([r.city,r.country].filter(Boolean).join(', ')||'—')}</td></tr>`).join(''):'<tr><td colspan="9"><div class="empty-state compact">No activity matches these filters.</div></td></tr>';}
  function bind(){
    document.getElementById('premiumSettingsForm')?.addEventListener('submit',saveSettings);
    ['auditV962Search','auditV962Role','auditV962Action','auditV962Status','auditV962Date'].forEach(id=>{document.getElementById(id)?.addEventListener('input',renderAudit);document.getElementById(id)?.addEventListener('change',renderAudit)});
    document.getElementById('auditV962Refresh')?.addEventListener('click',refresh);
    document.body.addEventListener('click',async e=>{
      const review=e.target.closest('[data-premium-review]');if(review)await reviewPayment(review.dataset.premiumReview,review.dataset.premiumStatus);
      const ib=e.target.closest('[data-ib-review]');if(ib)await reviewIb(ib.dataset.ibReview,ib.dataset.ibStatus);
      const proof=e.target.closest('[data-ib-proof]');if(proof)await openProof(proof.dataset.ibProof);
    });
  }
  async function saveSettings(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]');A.setLoading(b,true,'Saving...');try{const {error}=await A.supabase.rpc('admin_update_premium_settings',{p_package_mode:f.elements.package_mode.value,p_trial_enabled:f.elements.trial_enabled.checked,p_trial_days:Number(f.elements.trial_days.value||0),p_monthly_days:30,p_price_pkr:Number(f.elements.price_pkr.value||0),p_price_usdt:Number(f.elements.price_usdt.value||0),p_ib_enabled:f.elements.ib_enabled.checked,p_ib_access_days:Number(f.elements.ib_access_days.value||30)});if(error)throw error;await refresh();A.toast('Premium settings saved.','success');}catch(err){A.toast(A.friendlyError(err),'error')}finally{A.setLoading(b,false)}}
  async function reviewPayment(id,status){let note='';if(status==='declined'){note=prompt('Decline reason:')||'';if(!note.trim())return;}const {error}=await A.supabase.rpc('admin_review_premium_payment',{p_payment_id:id,p_status:status,p_admin_note:note||null});if(error)return A.toast(A.friendlyError(error),'error');await refresh();A.toast(status==='approved'?'Premium access activated / renewed.':'Premium payment updated.','success');}
  async function reviewIb(id,status){let note='';if(status==='declined'){note=prompt('Decline reason:')||'';if(!note.trim())return;}const {error}=await A.supabase.rpc('admin_review_ib_verification',{p_id:id,p_status:status,p_admin_note:note||null});if(error)return A.toast(A.friendlyError(error),'error');await refresh();A.toast(status==='approved'?'IB access approved.':'IB request declined.','success');}
  async function openProof(id){const row=state.ib.find(r=>r.id===id);if(!row?.proof_path)return;const {data,error}=await A.supabase.storage.from('ib-proofs').createSignedUrl(row.proof_path,120);if(error)return A.toast(A.friendlyError(error),'error');window.open(data.signedUrl,'_blank','noopener');}
  function subscribe(){A.supabase.channel('v962-admin').on('postgres_changes',{event:'*',schema:'public',table:'premium_payments'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'ib_verifications'},refresh).on('postgres_changes',{event:'INSERT',schema:'public',table:'activity_audit_log'},refresh).subscribe();}
})();

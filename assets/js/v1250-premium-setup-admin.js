(function(){
  const A=window.App;
  if(!A?.supabase)return;
  const sb=A.supabase;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let brokerRows=[],methodRows=[];

  function ensureStyle(){
    if($('#v1250PremiumSetupStyle'))return;
    const style=document.createElement('style');
    style.id='v1250PremiumSetupStyle';
    style.textContent=`
      .v1250-setup{margin:0 0 18px;padding:18px;border:1px solid rgba(213,164,8,.18);border-radius:18px;background:linear-gradient(145deg,rgba(252,213,53,.055),transparent),var(--card-bg,#fff)}
      .v1250-setup-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
      .v1250-setup-head h3{margin:0 0 4px}.v1250-setup-head p{margin:0;color:var(--muted,#7b7f87);font-size:12px}
      .v1250-setup-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:12px}
      .v1250-setup-box{padding:14px;border:1px solid var(--line,rgba(18,22,28,.08));border-radius:14px;background:var(--soft,#f7f7f8)}
      .v1250-setup-box h4{margin:0 0 10px;font-size:14px}.v1250-method,.v1250-broker{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line,rgba(18,22,28,.07))}
      .v1250-method:first-of-type,.v1250-broker:first-of-type{border-top:0;padding-top:0}.v1250-method:last-child,.v1250-broker:last-child{padding-bottom:0}
      .v1250-method b,.v1250-broker b{display:block;font-size:12px}.v1250-method small,.v1250-broker small{display:block;margin-top:3px;color:var(--muted,#7b7f87);font-size:10px;word-break:break-all}
      .v1250-test{display:inline-flex;margin-left:6px;padding:2px 6px;border-radius:999px;background:rgba(246,70,93,.09);color:#d64d62;font-size:8px;font-weight:900}
      .v1250-live{display:inline-flex;margin-left:6px;padding:2px 6px;border-radius:999px;background:rgba(14,203,129,.09);color:#078a58;font-size:8px;font-weight:900}
      #v1250BrokerModal textarea{min-height:100px}
      @media(max-width:760px){.v1250-setup{padding:12px}.v1250-setup-grid{grid-template-columns:1fr}.v1250-setup-head{display:grid}.v1250-method,.v1250-broker{grid-template-columns:1fr auto}.v1250-setup-head p{font-size:10px}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal(){
    if($('#v1250BrokerModal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div class="app-modal" id="v1250BrokerModal" aria-hidden="true">
        <div class="app-modal-card">
          <div class="app-modal-head"><div><h3>Edit Broker Access</h3><small class="muted">Change partner link and Student instructions.</small></div><button class="modal-close" type="button" data-v1250-close><i class="fa-solid fa-xmark"></i></button></div>
          <form id="v1250BrokerForm">
            <div class="app-modal-body">
              <div class="form-grid">
                <div class="form-field"><label>Broker</label><input name="broker" readonly></div>
                <div class="form-field"><label>Sort Order</label><input name="sort_order" type="number" min="0"></div>
                <div class="form-field full"><label>Official Partner Link</label><input name="partner_url" type="url" required placeholder="https://..."></div>
                <div class="form-field full"><label>New Account Instructions</label><textarea name="new_guide" required></textarea></div>
                <div class="form-field full"><label>Existing Account / IB Shift Instructions</label><textarea name="existing_guide" required></textarea></div>
                <label class="check-row"><input name="is_active" type="checkbox" checked> Active in Student Premium tab</label>
              </div>
            </div>
            <div class="app-modal-foot"><button type="button" class="app-btn outline" data-v1250-close>Cancel</button><button type="submit" class="app-btn gold">Save Broker Setup</button></div>
          </form>
        </div>
      </div>`);
    document.querySelectorAll('[data-v1250-close]').forEach(b=>b.addEventListener('click',closeModal));
    $('#v1250BrokerForm')?.addEventListener('submit',saveBroker);
  }

  function openModal(){const m=$('#v1250BrokerModal');if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}
  function closeModal(){const m=$('#v1250BrokerModal');if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true');if(!document.querySelector('.app-modal.open'))document.body.classList.remove('modal-open')}

  async function load(){
    try{
      const [brokers,methods]=await Promise.all([
        sb.rpc('get_premium_broker_settings'),
        sb.from('payment_methods').select('*').order('sort_order')
      ]);
      if(brokers.error)throw brokers.error;
      if(methods.error)throw methods.error;
      brokerRows=brokers.data||[];
      methodRows=methods.data||[];
      render();
    }catch(e){console.warn('[Premium Setup Admin]',e)}
  }

  function render(){
    const panel=$('#p-premium-access');
    if(!panel)return;
    let host=$('#v1250PremiumSetup');
    if(!host){
      host=document.createElement('section');
      host.id='v1250PremiumSetup';
      host.className='v1250-setup';
      const heading=panel.querySelector('.panel-heading');
      if(heading)heading.insertAdjacentElement('afterend',host);else panel.prepend(host);
    }
    const methods=methodRows.filter(x=>/local bank|usdt|trc/i.test(String(x.name||'')));
    host.innerHTML=`
      <div class="v1250-setup-head">
        <div><h3>Premium Payment & Broker Setup</h3><p>Demo payment details and broker partner links can be edited here from Admin before going live.</p></div>
        <button type="button" class="app-btn outline" data-v1250-methods><i class="fa-solid fa-credit-card"></i> Payment Methods</button>
      </div>
      <div class="v1250-setup-grid">
        <div class="v1250-setup-box"><h4>Payment Destinations</h4>
          ${methods.map(m=>{const test=/^TEST/i.test(String(m.account_number||''))||/^TEST/i.test(String(m.account_title||''));return `<div class="v1250-method"><div><b>${esc(m.name)} <span class="${test?'v1250-test':'v1250-live'}">${test?'TEST':'LIVE'}</span></b><small>${esc(m.account_title||'')} · ${esc(m.account_number||'')}</small></div><button type="button" class="app-btn small outline" data-v1250-methods>Edit</button></div>`}).join('')||'<small>No Premium payment destinations configured.</small>'}
        </div>
        <div class="v1250-setup-box"><h4>Broker Partner Links & Instructions</h4>
          ${brokerRows.map(r=>`<div class="v1250-broker"><div><b>${esc(r.broker)} <span class="${r.is_active?'v1250-live':'v1250-test'}">${r.is_active?'ACTIVE':'OFF'}</span></b><small>${esc(r.partner_url||'No link')}</small></div><button type="button" class="app-btn small outline" data-v1250-edit-broker="${esc(r.broker)}"><i class="fa-solid fa-pen"></i> Edit</button></div>`).join('')}
        </div>
      </div>`;
    host.querySelectorAll('[data-v1250-methods]').forEach(b=>b.addEventListener('click',()=>{location.href='/admin/payment-methods/'}));
    host.querySelectorAll('[data-v1250-edit-broker]').forEach(b=>b.addEventListener('click',()=>editBroker(b.dataset.v1250EditBroker)));
  }

  function editBroker(name){
    const row=brokerRows.find(x=>x.broker===name);if(!row)return;
    ensureModal();
    const f=$('#v1250BrokerForm');f.reset();
    f.elements.broker.value=row.broker||'';
    f.elements.partner_url.value=row.partner_url||'';
    f.elements.new_guide.value=row.new_guide||'';
    f.elements.existing_guide.value=row.existing_guide||'';
    f.elements.is_active.checked=row.is_active!==false;
    f.elements.sort_order.value=row.sort_order??0;
    openModal();
  }

  async function saveBroker(e){
    e.preventDefault();
    const f=e.currentTarget,b=f.querySelector('button[type=submit]');
    A.setLoading?.(b,true,'Saving...');
    try{
      const r=await sb.rpc('admin_upsert_premium_broker_setting',{
        p_broker:f.elements.broker.value,
        p_partner_url:f.elements.partner_url.value.trim(),
        p_new_guide:f.elements.new_guide.value.trim(),
        p_existing_guide:f.elements.existing_guide.value.trim(),
        p_is_active:f.elements.is_active.checked,
        p_sort_order:Number(f.elements.sort_order.value||0)
      });
      if(r.error)throw r.error;
      closeModal();
      A.toast?.('Broker access setup saved.','success');
      await load();
    }catch(err){A.toast?.(A.friendlyError?.(err,'Could not save broker setup.')||err.message,'error')}
    finally{A.setLoading?.(b,false)}
  }

  function boot(){ensureStyle();ensureModal();load()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('24k:admin-base-updated',()=>setTimeout(load,50));
  new MutationObserver(()=>{if($('#p-premium-access')&&!$('#v1250PremiumSetup'))load()}).observe(document.body,{childList:true,subtree:true});
})();
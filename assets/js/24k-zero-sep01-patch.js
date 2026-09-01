(function(){
  'use strict';

  const isStudent = /(^|\/)student(\/|$)/i.test(location.pathname) || document.body?.dataset?.panel === 'student';
  const isAdmin = /(^|\/)admin(\/|$)/i.test(location.pathname) || document.body?.dataset?.panel === 'admin';
  const homeTarget = '/';
  const dashboardTarget = isStudent ? '/student/' : isAdmin ? '/admin/' : homeTarget;

  function qsa(sel, root=document){ try { return Array.from(root.querySelectorAll(sel)); } catch(_) { return []; } }
  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function visible(el){ if(!el) return false; const s=getComputedStyle(el); return s.display!=='none' && s.visibility!=='hidden' && el.getClientRects().length>0; }

  // 1) Context-aware logo routing + broken /index cleanup.
  function patchLogoLinks(){
    qsa('a[href]').forEach(a=>{
      const href=(a.getAttribute('href')||'').trim();
      if(/^\/?index(?:\.html)?(?:[#?].*)?$/i.test(href) || /\/index(?:\.html)?(?:[#?].*)?$/i.test(href)) a.setAttribute('href','/');
    });
    const logoSelectors = [
      'a.logo','a.brand','a.site-logo','a.sidebar-logo','a.navbar-brand','a[class*="logo"]',
      '.logo a','.brand a','.site-logo a','.sidebar-logo a','header a:has(img[alt*="logo" i])','aside a:has(img[alt*="logo" i])'
    ];
    qsa(logoSelectors.join(',')).forEach(a=>{
      if(a.tagName!=='A') a=a.closest('a');
      if(!a) return;
      a.setAttribute('href', dashboardTarget);
      a.dataset.k24LogoRoute='1';
    });
    qsa('a').forEach(a=>{
      const txt=norm(a.textContent);
      const hasLogoImg=!!a.querySelector('img[src*="logo" i],img[alt*="24k" i],img[alt*="zero" i]');
      if(hasLogoImg || txt==='24k mr zero' || txt==='24k zero') {
        a.setAttribute('href',dashboardTarget); a.dataset.k24LogoRoute='1';
      }
    });
  }

  // 2) Modal shell used to move existing inline access content without rewriting business logic.
  let accessModal=null, movedNode=null, movedPlaceholder=null;
  function ensureAccessModal(){
    if(accessModal) return accessModal;
    const wrap=document.createElement('div');
    wrap.className='k24-access-modal';
    wrap.setAttribute('aria-hidden','true');
    wrap.innerHTML=`<div class="k24-access-backdrop" data-k24-close></div>
      <section class="k24-access-sheet" role="dialog" aria-modal="true" aria-labelledby="k24AccessTitle">
        <header class="k24-access-head">
          <button type="button" class="k24-icon-btn" data-k24-back aria-label="Back">←</button>
          <div><div class="k24-eyebrow">PREMIUM MARKET ACCESS</div><h2 id="k24AccessTitle">Access</h2></div>
          <button type="button" class="k24-icon-btn" data-k24-close aria-label="Close">×</button>
        </header>
        <div class="k24-access-body"></div>
      </section>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{
      if(e.target.closest('[data-k24-close]')) closeAccessModal();
      if(e.target.closest('[data-k24-back]')) {
        const back=wrap.querySelector('.k24-access-body [data-back], .k24-access-body .back-btn, .k24-access-body button');
        if(back && /back|previous/i.test(back.textContent||'')) back.click(); else closeAccessModal();
      }
    });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape' && wrap.classList.contains('open')) closeAccessModal(); });
    accessModal=wrap; return wrap;
  }
  function closeAccessModal(){
    if(!accessModal) return;
    if(movedNode && movedPlaceholder?.parentNode) movedPlaceholder.parentNode.insertBefore(movedNode,movedPlaceholder), movedPlaceholder.remove();
    movedNode=null; movedPlaceholder=null;
    accessModal.classList.remove('open'); accessModal.setAttribute('aria-hidden','true'); document.documentElement.classList.remove('k24-modal-open');
  }
  function findLikelyExpanded(trigger, type){
    const p=trigger.parentElement;
    const candidates=[];
    if(p) candidates.push(...Array.from(p.children).filter(x=>x!==trigger));
    if(p?.parentElement) candidates.push(...Array.from(p.parentElement.children).filter(x=>x!==p && x!==trigger));
    let sib=trigger.nextElementSibling; for(let i=0;sib&&i<4;i++,sib=sib.nextElementSibling) candidates.push(sib);
    const keys= type==='paid' ? ['pkr','usdt','payment','renewal','bank transfer','trc20'] : ['exness','xm','dprime','broker','partner shift','deposit proof','trading account'];
    return candidates.find(el=>{
      const t=norm(el.textContent); return el.children.length && keys.some(k=>t.includes(k));
    }) || null;
  }
  function openExistingAccessFlow(trigger, type){
    const modal=ensureAccessModal();
    const title=modal.querySelector('#k24AccessTitle');
    title.textContent=type==='paid'?'Paid Access':'Free Access via IB / Broker';
    // Let the original handler expand first, then move its real content into the modal.
    setTimeout(()=>{
      let node=findLikelyExpanded(trigger,type);
      if(!node){
        // Search visible blocks globally as a fallback.
        const keys=type==='paid'?['payment method','usdt trc20','local bank transfer']:['exness','dprime','partner shift'];
        node=qsa('main div,main section,.content div,.content section').find(el=>visible(el)&&el!==trigger&&keys.filter(k=>norm(el.textContent).includes(k)).length>=2);
      }
      const body=modal.querySelector('.k24-access-body'); body.innerHTML='';
      if(node){
        movedPlaceholder=document.createComment('24k-access-return');
        node.parentNode.insertBefore(movedPlaceholder,node);
        movedNode=node; body.appendChild(node); node.classList.add('k24-modalized-content');
      } else {
        body.innerHTML=`<div class="k24-modal-fallback"><h3>${type==='paid'?'Paid Access':'Free Access via IB / Broker'}</h3><p>The access flow is loading. Please try the card again.</p></div>`;
      }
      modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.documentElement.classList.add('k24-modal-open');
    },30);
  }
  function patchAccessCards(){
    if(!isStudent) return;
    const all=qsa('button,a,[role="button"],div');
    const triggers=[];
    all.forEach(el=>{
      const t=norm(el.textContent);
      if(t==='paid access' || (t.startsWith('paid access') && t.length<120)) triggers.push([el,'paid']);
      if(t==='free access via ib / broker' || (t.startsWith('free access via ib / broker') && t.length<180)) triggers.push([el,'free']);
    });
    const used=new Set();
    triggers.forEach(([raw,type])=>{
      let el=raw.closest('button,a,[role="button"]') || raw;
      if(used.has(el) || el.dataset.k24AccessTrigger) return; used.add(el);
      el.dataset.k24AccessTrigger=type; el.classList.add('k24-access-trigger');
      el.style.pointerEvents='auto'; el.removeAttribute('disabled'); el.setAttribute('aria-disabled','false');
      // Bubble listener runs after most existing inline toggle handlers.
      el.addEventListener('click',()=>openExistingAccessFlow(el,type));
    });
  }

  // 3) History tab repair.
  function isHistoryButton(el){ const t=norm(el.textContent); return t==='history' || t==='signal history' || t.includes('view history'); }
  function statusIsFinal(text){ const t=norm(text); return /tp3|sl hit|\bsl\b|breakeven|\bbe\b|closed|cancelled|canceled|manual close/.test(t); }
  function historyFallback(){
    const tables=qsa('table');
    tables.forEach(table=>{
      const rows=qsa('tbody tr',table); if(!rows.length) return;
      rows.forEach(r=>r.style.display=statusIsFinal(r.textContent)?'':'none');
    });
    qsa('[data-signal-card],.signal-card,.signal-row').forEach(r=>r.style.display=statusIsFinal(r.textContent)?'':'none');
  }
  function activateHistory(){
    const calls=[
      ['setSignalView','history'],['setSignalsView','history'],['setSignalTab','history'],['setSignalsTab','history'],
      ['signalSetView','history'],['aSigSetView','history'],['renderSignals','history'],['loadSignals','history'],['loadStudentSignals','history']
    ];
    let called=false;
    calls.forEach(([name,arg])=>{ if(typeof window[name]==='function'){ try{ window[name](arg); called=true; }catch(_){} } });
    if(!called) historyFallback();
  }
  function patchHistory(){
    if(!isStudent) return;
    qsa('button,a,[role="button"]').filter(isHistoryButton).forEach(b=>{
      if(b.dataset.k24HistoryFix) return; b.dataset.k24HistoryFix='1';
      b.addEventListener('click',()=>setTimeout(activateHistory,0));
    });
  }

  // 4) Reliable Supabase realtime signal refresh.
  let rtChannel=null, rtTimer=null;
  function refreshSignalUI(){
    clearTimeout(rtTimer); rtTimer=setTimeout(()=>{
      const names=['loadSignals','loadStudentSignals','loadSignalsPage','loadLatestSignal','loadDashboard','loadDashboardData','refreshSignals','renderSignals'];
      names.forEach(n=>{ if(typeof window[n]==='function'){ try{ window[n](); }catch(_){} } });
      window.dispatchEvent(new CustomEvent('24k:signals-updated'));
      document.dispatchEvent(new CustomEvent('24k:signals-updated'));
    },80);
  }
  function getSB(){ return window.sb || window.supabaseClient || window._supabase || window.supabase?.client || null; }
  function initRealtime(){
    if(!isStudent || rtChannel) return;
    const sb=getSB(); if(!sb || typeof sb.channel!=='function') return;
    try{
      rtChannel=sb.channel('24k-student-signals-live-'+Math.random().toString(36).slice(2,7))
        .on('postgres_changes',{event:'*',schema:'public',table:'signals'},refreshSignalUI)
        .on('postgres_changes',{event:'*',schema:'public',table:'signal_updates'},refreshSignalUI)
        .subscribe(status=>{ if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){ rtChannel=null; setTimeout(initRealtime,1500); } });
      window.addEventListener('online',()=>{ if(!rtChannel) initRealtime(); });
    }catch(_){ rtChannel=null; setTimeout(initRealtime,1800); }
  }

  // 5) Defensive brokerAccessMeta initialization fix support.
  if(typeof window.brokerAccessMeta==='undefined') window.brokerAccessMeta={};

  function boot(){ patchLogoLinks(); patchAccessCards(); patchHistory(); initRealtime(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  // SPA/re-render safety.
  const mo=new MutationObserver(()=>{ clearTimeout(mo._t); mo._t=setTimeout(()=>{patchLogoLinks();patchAccessCards();patchHistory();initRealtime();},120); });
  if(document.documentElement) mo.observe(document.documentElement,{childList:true,subtree:true});
})();

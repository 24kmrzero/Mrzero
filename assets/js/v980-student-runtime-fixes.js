(function(){
  'use strict';
  if(window.__24K_V980_STUDENT_FIXES__)return;
  window.__24K_V980_STUDENT_FIXES__=true;
  const text=el=>String(el&&el.textContent||'').replace(/\s+/g,' ').trim();
  const lower=el=>text(el).toLowerCase();
  const qsa=(s,r=document)=>{try{return Array.from(r.querySelectorAll(s));}catch(_){return[];}};
  const qs=(s,r=document)=>{try{return r.querySelector(s);}catch(_){return null;}};
  const visible=el=>!!(el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden');

  function injectStyle(){
    if(document.getElementById('v980-student-style'))return;
    const s=document.createElement('style');s.id='v980-student-style';s.textContent=`
      body.v980-student-modal-open{overflow:hidden!important}
      .v980-student-access-overlay{position:fixed!important;inset:0!important;z-index:2147483000!important;background:rgba(0,0,0,.76)!important;backdrop-filter:blur(7px)!important;display:flex!important;justify-content:center!important;align-items:flex-start!important;padding:54px 16px 24px!important;overflow:auto!important}
      .v980-student-access-overlay[hidden]{display:none!important}
      .v980-student-access-dialog{width:min(920px,calc(100vw - 28px))!important;max-height:calc(100vh - 78px)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;border:1px solid rgba(246,191,38,.34)!important;border-radius:16px!important;background:#11110f!important;color:#f4f4f4!important;box-shadow:0 24px 85px rgba(0,0,0,.65)!important}
      html[data-theme="light"] .v980-student-access-dialog{background:#fffaf0!important;color:#151515!important}
      .v980-student-access-head{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:14px 17px!important;border-bottom:1px solid rgba(246,191,38,.2)!important}
      .v980-student-access-head h3{margin:0!important;font-size:18px!important}
      .v980-student-access-close{width:34px!important;height:34px!important;border-radius:9px!important;border:1px solid rgba(246,191,38,.3)!important;background:#171713!important;color:#f6bf26!important;font-size:19px!important;display:grid!important;place-items:center!important;cursor:pointer!important}
      .v980-student-access-body{padding:16px 17px 18px!important;overflow:auto!important;min-height:0!important}
      .v980-student-access-body>[data-v980-access-flow]{display:block!important;visibility:visible!important;opacity:1!important;position:static!important;transform:none!important;width:100%!important;max-width:none!important;margin:0!important}
      @media(max-width:800px){.v980-student-access-overlay{padding:16px 9px!important}.v980-student-access-dialog{width:100%!important;max-height:calc(100vh - 32px)!important}}
    `;document.head.appendChild(s);
  }

  function accessUiVisible(){
    return qsa('[role="dialog"],dialog,[class*="modal"],[class*="drawer"],[class*="overlay"]').some(el=>{
      if(!visible(el))return false;const t=lower(el);return t.includes('premium')&&(t.includes('trial')||t.includes('broker')||t.includes('payment')||t.includes('access'));
    });
  }

  function callKnownOpeners(){
    const names=['openPremiumAccess','openPremiumAccessModal','showPremiumAccess','showPremiumAccessModal','managePremiumAccess','openAccessModal','openAccessManager'];
    const owners=[window,window.StudentBase,window.StudentApp,window.PremiumAccess,window.StudentPremium,window.StudentCourses].filter(Boolean);
    for(const owner of owners){
      for(const name of names){
        if(typeof owner[name]==='function'){
          try{owner[name]();return true;}catch(_){/* try next */}
        }
      }
    }
    return false;
  }

  function clickHiddenTrigger(button){
    const candidates=qsa('button,a,[role="button"],[data-action],[data-open]').filter(el=>el!==button && (el.matches('button,a,[role="button"]') || el.hasAttribute('data-action') || el.hasAttribute('data-open')));
    const trigger=candidates.find(el=>{
      const attrs=[el.getAttribute('data-action'),el.getAttribute('data-open'),el.id,el.getAttribute('href')].filter(Boolean).join(' ').toLowerCase();
      const t=lower(el);return (attrs.includes('premium')&&attrs.includes('access')) || attrs.includes('manage-access') || (t==='premium access'&&el.closest('nav'));
    });
    if(trigger){try{trigger.click();return true;}catch(_){} }
    return false;
  }

  function flowScore(el){
    const t=lower(el);let s=0;
    ['free trial','paid renewal','broker','ib access','usdt','local bank','payment'].forEach(k=>{if(t.includes(k))s++;});
    return s;
  }

  function findExistingAccessFlow(button){
    const all=qsa('[id*="premium" i],[id*="access" i],[class*="premium" i],[class*="access" i],section,article');
    const candidates=all.filter(el=>el!==button&&!el.contains(button)&&qsa('button,a,input,select',el).length>=1&&flowScore(el)>=2);
    candidates.sort((a,b)=>flowScore(b)-flowScore(a)||text(a).length-text(b).length);
    return candidates[0]||null;
  }

  function showFlow(flow){
    injectStyle();
    let overlay=qs('.v980-student-access-overlay');
    if(!overlay){
      overlay=document.createElement('div');overlay.className='v980-student-access-overlay';overlay.hidden=true;
      overlay.innerHTML='<div class="v980-student-access-dialog" role="dialog" aria-modal="true"><div class="v980-student-access-head"><h3>Manage Premium Access</h3><button class="v980-student-access-close" type="button" aria-label="Close">×</button></div><div class="v980-student-access-body"></div></div>';
      document.body.appendChild(overlay);
      qs('.v980-student-access-close',overlay)?.addEventListener('click',()=>{overlay.hidden=true;document.body.classList.remove('v980-student-modal-open');});
      overlay.addEventListener('mousedown',e=>{if(e.target===overlay){overlay.hidden=true;document.body.classList.remove('v980-student-modal-open');}});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden){overlay.hidden=true;document.body.classList.remove('v980-student-modal-open');}});
    }
    if(!flow.dataset.v980AccessFlow){
      flow.dataset.v980AccessFlow='1';
      const ph=document.createComment('v980-access-flow-placeholder');
      flow.parentNode?.insertBefore(ph,flow);
      qs('.v980-student-access-body',overlay).appendChild(flow);
    }
    flow.hidden=false;flow.style.display='';flow.style.visibility='visible';
    overlay.hidden=false;document.body.classList.add('v980-student-modal-open');
    return true;
  }

  function fallbackManage(button){
    if(accessUiVisible())return true;
    if(callKnownOpeners())return true;
    const flow=findExistingAccessFlow(button);if(flow)return showFlow(flow);
    if(clickHiddenTrigger(button))return true;
    const hashBefore=location.hash;
    try{location.hash='access';window.dispatchEvent(new HashChangeEvent('hashchange'));}catch(_){}
    setTimeout(()=>{
      if(accessUiVisible())return;
      const f=findExistingAccessFlow(button);if(f)showFlow(f);
      else if(location.hash==='#access'&&hashBefore!==location.hash){
        // Keep user on Profile if this build has no standalone access panel.
        try{location.hash='profile';}catch(_){}
        if(window.App&&typeof window.App.toast==='function')window.App.toast('Premium Access options could not load. Please refresh once and try again.','error',5200);
      }
    },180);
    return true;
  }

  function wireManageAccess(){
    const buttons=qsa('button,a,[role="button"]').filter(b=>lower(b).replace(/\s+/g,' ')==='manage access');
    buttons.forEach(btn=>{
      if(btn.dataset.v980ManageAccess)return;btn.dataset.v980ManageAccess='1';
      btn.addEventListener('click',()=>{
        const before=accessUiVisible();
        setTimeout(()=>{if(!before&&!accessUiVisible())fallbackManage(btn);},240);
      });
    });
  }

  function init(){injectStyle();wireManageAccess();}
  let tm=0;const schedule=()=>{clearTimeout(tm);tm=setTimeout(init,50);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('load',schedule,{once:true});window.addEventListener('hashchange',schedule);window.addEventListener('24k:student-base-updated',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(schedule,600);setTimeout(schedule,1600);
})();

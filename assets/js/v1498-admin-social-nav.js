/* 24K MR ZERO — Admin Social & Contact nav hard-fix v14.99 */
(function(){
  'use strict';
  function ensure(){
    const nav=document.querySelector('.app-nav');
    if(!nav)return;
    if(nav.querySelector('[data-panel="social-settings"]'))return;
    const activity=nav.querySelector('[data-panel="audit"],[data-v1218-nav="audit"],a[href*="/admin/activity-logs"]');
    const link=document.createElement('a');
    link.href='/admin/social-links/';
    link.dataset.panel='social-settings';
    link.dataset.v1218Nav='social-settings';
    link.innerHTML='<i class="fa-solid fa-share-nodes"></i> Social & Contact';
    if(activity)activity.insertAdjacentElement('afterend',link);
    else nav.appendChild(link);
  }
  function schedule(){
    ensure();
    setTimeout(ensure,120);
    setTimeout(ensure,500);
    setTimeout(ensure,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  window.addEventListener('load',schedule,{once:true});
  window.addEventListener('24k:admin-base-updated',schedule);
  document.addEventListener('panel:open',schedule);
  const nav=document.querySelector('.app-nav');
  if(nav){
    new MutationObserver(()=>ensure()).observe(nav,{childList:true,subtree:false});
  }else{
    new MutationObserver((_,obs)=>{
      const n=document.querySelector('.app-nav');
      if(!n)return;
      ensure();
      new MutationObserver(()=>ensure()).observe(n,{childList:true,subtree:false});
      obs.disconnect();
    }).observe(document.documentElement,{childList:true,subtree:true});
  }
})();
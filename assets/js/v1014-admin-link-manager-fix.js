(function(){
  'use strict';
  if(window.__24K_V1014_LINK_MANAGER__) return;
  window.__24K_V1014_LINK_MANAGER__='10.14';

  function ensure(){
    var nav=document.querySelector('.app-nav');
    if(!nav) return;
    var existing=nav.querySelector('[data-panel="links"]');
    if(!existing){
      var a=document.createElement('a');
      a.href='/admin/link-manager/';
      a.setAttribute('data-panel','links');
      a.innerHTML='<i class="fa-solid fa-link"></i> Link Manager';
      var premium=nav.querySelector('[data-panel="premium-access"]');
      var anchor=premium || nav.querySelector('[data-panel="support"]') || nav.querySelector('[data-panel="methods"]');
      if(anchor && anchor.parentNode===nav) anchor.insertAdjacentElement('afterend',a);
      else nav.appendChild(a);
      existing=a;
    }
    existing.setAttribute('href','/admin/link-manager/');
    // Trigger the V9.90 ordering pass again if present.
    try{window.dispatchEvent(new CustomEvent('24k:admin-base-updated'));}catch(_){ }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensure,{once:true}); else ensure();
  window.addEventListener('load',ensure,{once:true});
  document.addEventListener('panel:open',function(){setTimeout(ensure,0);});
  [100,350,800,1600,3200,6000].forEach(function(ms){setTimeout(ensure,ms);});
  try{new MutationObserver(function(){ensure();}).observe(document.documentElement,{childList:true,subtree:true});}catch(_){ }
})();

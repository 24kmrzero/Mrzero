(function(){
  'use strict';
  if(window.__24K_V1014_LINK_MANAGER__) return;
  window.__24K_V1014_LINK_MANAGER__='10.20';

  function ensure(){
    var nav=document.querySelector('.app-nav');
    if(!nav) return;

    var linkManager=nav.querySelector('[data-panel="links"]');
    if(!linkManager){
      linkManager=document.createElement('a');
      linkManager.href='/admin/link-manager/';
      linkManager.setAttribute('data-panel','links');
      linkManager.innerHTML='<i class="fa-solid fa-link"></i> Link Manager';
      nav.appendChild(linkManager);
    }
    linkManager.setAttribute('href','/admin/link-manager/');

    var teamManager=nav.querySelector('[data-admin-team-manager]');
    if(!teamManager){
      teamManager=document.createElement('a');
      teamManager.href='/admin/team-performance/';
      teamManager.setAttribute('data-admin-team-manager','true');
      teamManager.setAttribute('data-nav-key','team-manager');
      teamManager.innerHTML='<i class="fa-solid fa-people-group"></i> Team Manager';
      var premium=nav.querySelector('[data-panel="premium-access"]');
      if(premium&&premium.parentNode===nav) premium.insertAdjacentElement('afterend',teamManager); else nav.appendChild(teamManager);
    }
    teamManager.setAttribute('href','/admin/team-performance/');

    try{window.dispatchEvent(new CustomEvent('24k:admin-nav-ready'));}catch(_){ }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensure,{once:true}); else ensure();
  window.addEventListener('load',ensure,{once:true});
  document.addEventListener('panel:open',function(){setTimeout(ensure,0);});
  [100,350,800,1600,3200,6000].forEach(function(ms){setTimeout(ensure,ms);});
  try{new MutationObserver(function(){ensure();}).observe(document.documentElement,{childList:true,subtree:true});}catch(_){ }
})();

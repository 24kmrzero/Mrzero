(function(){
  'use strict';
  // V10.14 compatibility shim. Older config versions may still request this file.
  // Never intercept/cancel the native Student handler; only provide a post-click fallback.
  window.__24K_V998_MANAGE_ACCESS__='superseded-v10.14';
  function modalIsOpen(modal){
    if(!modal) return false;
    return modal.classList.contains('open') || modal.getAttribute('aria-hidden')==='false';
  }
  document.addEventListener('click',function(event){
    var button=event.target&&event.target.closest?event.target.closest('#managePremiumAccess'):null;
    if(!button) return;
    setTimeout(function(){
      var modal=document.getElementById('premiumAccessModal');
      if(modal && !modalIsOpen(modal) && window.App && typeof window.App.openModal==='function'){
        window.App.openModal('premiumAccessModal');
      }
    },0);
  },false);
})();

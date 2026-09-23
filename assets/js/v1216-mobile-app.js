(function(){
  'use strict';
  const premium=()=>{const button=document.getElementById('managePremiumAccess');if(button){button.click();return true}return Boolean(window.__24K_OPEN_PREMIUM_ACCESS__?.())};
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-mobile-premium]');
    if(b){e.preventDefault();premium();document.querySelectorAll('.student-mobile-nav button').forEach(x=>x.classList.toggle('is-active',x===b));}
  });
  document.addEventListener('panel:open',e=>{
    const key=e.detail?.key||'dashboard';
    document.querySelectorAll('.student-mobile-nav [data-goto]').forEach(b=>b.classList.toggle('is-active',b.dataset.goto===key));
    if(key!=='profile') document.querySelector('[data-mobile-premium]')?.classList.remove('is-active');
  });
  const modal=document.getElementById('premiumAccessModal');
  if(modal){
    new MutationObserver(()=>{if(modal.classList.contains('open')){document.querySelectorAll('.student-mobile-nav button').forEach(x=>x.classList.remove('is-active'));document.querySelector('[data-mobile-premium]')?.classList.add('is-active')}}).observe(modal,{attributes:true,attributeFilter:['class']});
  }
})();

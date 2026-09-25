(function(){
  'use strict';
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(e=>console.warn('[24K Student PWA]',e?.message||e)))}
  let installPrompt=null;
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const installButton=()=>document.getElementById('studentInstallButton');
  const updateInstallButton=()=>{const b=installButton();if(!b)return;if(isStandalone()){b.innerHTML='<i class="fa-solid fa-circle-check"></i> Installed';b.disabled=true;b.dataset.installed='1'}else{b.disabled=false;b.dataset.installed='0'}};
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;updateInstallButton();installButton()?.classList.add('ready')});
  window.addEventListener('appinstalled',()=>{installPrompt=null;updateInstallButton();window.App?.toast?.('24K Student App installed successfully.','success')});
  document.addEventListener('click',async e=>{const b=e.target.closest('#studentInstallButton');if(!b)return;e.preventDefault();if(isStandalone())return window.App?.toast?.('Student App is already installed.','success');if(installPrompt){installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice?.outcome==='accepted')window.App?.toast?.('Installing 24K Student App…','success');installPrompt=null;updateInstallButton();return}const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);window.App?.toast?.(ios?'Use Share → Add to Home Screen to install the app.':'Use your browser menu → Install app / Add to Home screen.','info')});
  window.addEventListener('load',updateInstallButton);
  const premium=()=>{
    const modal=document.getElementById('premiumAccessModal');
    if(!modal){
      window.App?.toast?.('Premium Access is unavailable on this page.','error');
      return false;
    }

    // Open the Premium sheet immediately. Do not depend on Profile or the
    // secondary Premium script being ready first.
    modal.querySelectorAll('[data-access-step]').forEach(section=>{
      const active=section.dataset.accessStep==='home';
      section.hidden=false;
      section.classList.toggle('access-hidden',!active);
      section.classList.toggle('is-active',active);
      section.setAttribute('aria-hidden',active?'false':'true');
      section.style.setProperty('display',active?'block':'none','important');
    });
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');

    // Let the full Premium controller refresh status/pricing when available,
    // but never allow an error there to stop the sheet from opening.
    try{
      if(typeof window.__24K_OPEN_PREMIUM_ACCESS__==='function'){
        Promise.resolve(window.__24K_OPEN_PREMIUM_ACCESS__()).catch(err=>console.error('[Premium access refresh]',err));
      }
    }catch(err){console.error('[Premium access refresh]',err)}
    return true;
  };
  document.addEventListener('click',e=>{
    const stepTarget=e.target.closest('#premiumAccessModal [data-access-step-target]');
    if(stepTarget){
      e.preventDefault();
      const target=stepTarget.dataset.accessStepTarget || 'home';
      document.querySelectorAll('#premiumAccessModal [data-access-step]').forEach(section=>{
        const active=section.dataset.accessStep===target;
        section.hidden=false;
        section.classList.toggle('access-hidden',!active);
        section.classList.toggle('is-active',active);
        section.setAttribute('aria-hidden',active?'false':'true');
        section.style.setProperty('display',active?'block':'none','important');
      });
      return;
    }
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

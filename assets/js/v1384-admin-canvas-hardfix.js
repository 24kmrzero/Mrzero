/* Admin desktop light canvas hard-fix v13.84
   Runtime inline-important override so legacy CSS cannot repaint the canvas.
   Desktop only; mobile and dark mode untouched. */
(()=>{
  'use strict';
  const mq=window.matchMedia('(min-width: 901px)');
  const selectors=['body.app-page','#adminApp.app-shell','.app-shell','.app-main','.app-content'];
  const apply=()=>{
    const root=document.documentElement;
    const on=mq.matches && root.dataset.authScope==='admin' && root.dataset.theme==='light';
    if(!on)return;
    root.style.setProperty('background','#F5F4F1','important');
    root.style.setProperty('background-image','none','important');
    for(const sel of selectors){
      document.querySelectorAll(sel).forEach(el=>{
        el.style.setProperty('background','#F5F4F1','important');
        el.style.setProperty('background-image','none','important');
      });
    }
    ['p-dashboard','p-signals'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){
        el.style.setProperty('background','transparent','important');
        el.style.setProperty('background-image','none','important');
      }
    });
  };
  const clear=()=>{
    const root=document.documentElement;
    root.style.removeProperty('background');
    root.style.removeProperty('background-image');
    for(const sel of selectors){
      document.querySelectorAll(sel).forEach(el=>{
        el.style.removeProperty('background');
        el.style.removeProperty('background-image');
      });
    }
  };
  const sync=()=>{
    clear();
    requestAnimationFrame(apply);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
  window.addEventListener('load',sync,{once:true});
  mq.addEventListener?.('change',sync);
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  setTimeout(sync,250);
  setTimeout(sync,1000);
})();
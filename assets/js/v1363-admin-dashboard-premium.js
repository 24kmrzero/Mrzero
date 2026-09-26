(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let drawerHistory=false;
  let touchStartX=null,touchStartY=null;

  function side(){return $('#side')}
  function backdrop(){return $('#adminSideBackdrop')}
  function isMobile(){return window.matchMedia('(max-width:900px)').matches}
  function isOpen(){return !!side()?.classList.contains('open')}

  function syncDrawer(){
    const open=isOpen()&&isMobile();
    document.body.classList.toggle('admin-drawer-open',open);
    const bg=backdrop();
    if(bg){bg.classList.toggle('show',open);bg.setAttribute('aria-hidden',String(!open))}
    const close=$('#adminSideClose');
    if(close)close.hidden=!open;
  }

  function closeDrawer(fromHistory=false){
    if(!isOpen()){syncDrawer();return}
    side()?.classList.remove('open');
    syncDrawer();
    if(drawerHistory&&!fromHistory){
      drawerHistory=false;
      if(history.state?.adminDrawer) history.back();
    }else if(fromHistory){
      drawerHistory=false;
    }
  }

  function onDrawerOpened(){
    if(!isMobile())return;
    syncDrawer();
    if(!drawerHistory&&!history.state?.adminDrawer){
      try{
        history.pushState({...history.state,adminDrawer:true},'',location.href);
        drawerHistory=true;
      }catch{}
    }
  }

  function installCloseButton(){
    const s=side();if(!s||$('#adminSideClose'))return;
    const b=document.createElement('button');
    b.type='button';b.id='adminSideClose';b.className='admin-side-close';
    b.setAttribute('aria-label','Close navigation');
    b.innerHTML='<i class="fa-solid fa-xmark"></i>';
    s.prepend(b);
    b.addEventListener('click',()=>closeDrawer());
  }

  function bindDrawer(){
    installCloseButton();
    const s=side();if(!s)return;
    const mo=new MutationObserver(()=>{
      if(isOpen())onDrawerOpened(); else syncDrawer();
    });
    mo.observe(s,{attributes:true,attributeFilter:['class']});
    backdrop()?.addEventListener('click',()=>closeDrawer());
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen())closeDrawer()});
    document.addEventListener('click',e=>{
      if(!isMobile())return;
      if(e.target.closest('#side [data-panel],#side [data-nav-key],#side a[href],#side button:not(#adminSideClose)')){
        requestAnimationFrame(()=>closeDrawer());
      }
    });
    window.addEventListener('popstate',()=>{
      if(isOpen()){closeDrawer(true);return}
      drawerHistory=false;
    });
    s.addEventListener('touchstart',e=>{
      if(!isMobile()||!isOpen())return;
      const t=e.touches?.[0];if(!t)return;
      touchStartX=t.clientX;touchStartY=t.clientY;
    },{passive:true});
    s.addEventListener('touchend',e=>{
      if(touchStartX==null||touchStartY==null)return;
      const t=e.changedTouches?.[0];
      if(t){
        const dx=t.clientX-touchStartX,dy=Math.abs(t.clientY-touchStartY);
        if(dx<-65&&dy<70)closeDrawer();
      }
      touchStartX=touchStartY=null;
    },{passive:true});
    window.addEventListener('resize',()=>{if(!isMobile()&&isOpen())side()?.classList.remove('open');syncDrawer()});
    syncDrawer();
  }

  function upgradeDashboardLabels(){
    const dash=$('#p-dashboard');if(!dash)return;
    const snapshot=$('#v18PlatformSnapshot');
    if(snapshot){
      snapshot.querySelectorAll('.v1218-mini').forEach((card,i)=>{
        const icons=['fa-graduation-cap','fa-link','fa-door-open','fa-receipt'];
        if(!card.querySelector('.admin-snapshot-icon')){
          card.insertAdjacentHTML('afterbegin',`<span class="admin-snapshot-icon"><i class="fa-solid ${icons[i]||'fa-chart-line'}"></i></span>`);
        }
      });
    }
    const kpis=$('#adminKpis');
    if(kpis){
      kpis.querySelectorAll('.business-summary-card,.app-kpi').forEach(card=>{
        card.classList.add('admin-premium-kpi');
      });
    }
  }

  function observeDashboard(){
    const roots=[$('#adminKpis'),$('#v18PlatformSnapshot'),$('#dashboardPayments'),$('#dashboardSessions'),$('#dashboardAnalytics')].filter(Boolean);
    roots.forEach(root=>new MutationObserver(upgradeDashboardLabels).observe(root,{childList:true,subtree:true}));
    upgradeDashboardLabels();
  }

  function boot(){
    bindDrawer();
    observeDashboard();
    document.addEventListener('panel:open',e=>{
      if(isMobile())closeDrawer();
      if(e.detail?.key==='dashboard')requestAnimationFrame(upgradeDashboardLabels);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
(function(){
  'use strict';
  if(window.__24K_V998_MANAGE_ACCESS__) return;
  window.__24K_V998_MANAGE_ACCESS__='9.98.2';

  var BTN_ATTR='data-v998-manage-access';
  var OVERLAY_ID='v998-access-overlay';
  var STYLE_ID='v998-access-style';

  function cleanText(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim();}
  function isManageButton(el){return !!(el && /manage\s+access/i.test(cleanText(el)));}
  function qsa(sel,root){try{return Array.prototype.slice.call((root||document).querySelectorAll(sel));}catch(_){return [];}}
  function safeClick(el){try{el.click();return true;}catch(_){return false;}}

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='\
#'+OVERLAY_ID+'{position:fixed!important;inset:0!important;z-index:2147483646!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:18px!important;background:rgba(0,0,0,.72)!important;backdrop-filter:blur(6px)!important}\
#'+OVERLAY_ID+'[hidden]{display:none!important}\
#'+OVERLAY_ID+' .v998-box{width:min(720px,calc(100vw - 28px))!important;max-height:88vh!important;overflow:auto!important;border:1px solid rgba(237,183,22,.35)!important;border-radius:18px!important;background:#11110f!important;color:#f5f5f5!important;box-shadow:0 26px 90px rgba(0,0,0,.58)!important}\
html[data-theme="light"] #'+OVERLAY_ID+' .v998-box{background:#fffaf0!important;color:#171717!important}\
#'+OVERLAY_ID+' .v998-head{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:16px 18px!important;border-bottom:1px solid rgba(237,183,22,.2)!important}\
#'+OVERLAY_ID+' h3{margin:0!important;font-size:19px!important}\
#'+OVERLAY_ID+' .v998-close{width:36px!important;height:36px!important;border-radius:10px!important;border:1px solid rgba(237,183,22,.35)!important;background:transparent!important;color:#e9b516!important;font-size:22px!important;cursor:pointer!important}\
#'+OVERLAY_ID+' .v998-body{padding:16px 18px 18px!important}\
#'+OVERLAY_ID+' .v998-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}\
#'+OVERLAY_ID+' .v998-card{border:1px solid rgba(237,183,22,.22)!important;border-radius:14px!important;padding:15px!important;background:rgba(237,183,22,.055)!important}\
#'+OVERLAY_ID+' .v998-card b{display:block!important;margin-bottom:7px!important;font-size:15px!important}\
#'+OVERLAY_ID+' .v998-card p{margin:0 0 12px!important;font-size:12px!important;line-height:1.5!important;opacity:.75!important}\
#'+OVERLAY_ID+' .v998-action{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:40px!important;padding:0 14px!important;border:1px solid rgba(237,183,22,.45)!important;border-radius:10px!important;background:#f0bd24!important;color:#111!important;font-weight:800!important;text-decoration:none!important;cursor:pointer!important}\
#'+OVERLAY_ID+' .v998-action.alt{background:transparent!important;color:#e8b51c!important}\
['+BTN_ATTR+']{pointer-events:auto!important;position:relative!important;z-index:5!important;cursor:pointer!important}\
@media(max-width:680px){#'+OVERLAY_ID+' .v998-grid{grid-template-columns:1fr!important}}';
    (document.head||document.documentElement).appendChild(s);
  }

  function nativeAccessTarget(){
    var selectors=[
      '[data-panel="access"]','[data-page="access"]','[data-route="access"]','[data-view="access"]',
      '[data-target="access"]','[href="#access"]','[href$="#access"]','[onclick*="access" i]'
    ];
    for(var i=0;i<selectors.length;i++){
      var list=qsa(selectors[i]);
      for(var j=0;j<list.length;j++){
        var el=list[j];
        if(!isManageButton(el) && cleanText(el).toLowerCase()!=='manage access') return el;
      }
    }
    return null;
  }

  function callRouter(){
    var names=['showPanel','openPanel','setPanel','showPage','openPage','navigate','navigateTo','goTo','goToPage','switchPanel','selectPanel'];
    var owners=[window,window.App,window.StudentApp,window.StudentBase].filter(Boolean);
    for(var i=0;i<owners.length;i++){
      for(var j=0;j<names.length;j++){
        var fn=owners[i][names[j]];
        if(typeof fn==='function'){
          try{fn.call(owners[i],'access');return true;}catch(_){ }
        }
      }
    }
    return false;
  }

  function accessPanelVisible(){
    var nodes=qsa('[data-panel="access"],[data-page="access"],[data-view="access"],#access,[id*="access" i],[class*="access" i]');
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i],t=cleanText(el).toLowerCase();
      if(!t) continue;
      if(t.indexOf('broker')<0 && t.indexOf('premium')<0 && t.indexOf('trial')<0 && t.indexOf('payment')<0) continue;
      try{var st=getComputedStyle(el);if(!el.hidden&&st.display!=='none'&&st.visibility!=='hidden')return true;}catch(_){return true;}
    }
    return false;
  }

  function tryNativeAccess(){
    var target=nativeAccessTarget();
    if(target && safeClick(target)) return true;
    if(callRouter()) return true;
    try{
      if(location.hash!=='#access') location.hash='access';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      window.dispatchEvent(new CustomEvent('24k:navigate',{detail:{panel:'access'}}));
      return true;
    }catch(_){return false;}
  }

  function overlay(){
    ensureStyle();
    var o=document.getElementById(OVERLAY_ID);
    if(o) return o;
    o=document.createElement('div');o.id=OVERLAY_ID;o.hidden=true;
    o.innerHTML='<div class="v998-box" role="dialog" aria-modal="true" aria-labelledby="v998-title"><div class="v998-head"><h3 id="v998-title">Manage Premium Access</h3><button type="button" class="v998-close" aria-label="Close">×</button></div><div class="v998-body"><div class="v998-grid"><div class="v998-card"><b>Free Access via IB / Broker</b><p>Open your Premium Access verification options and choose the available broker/account flow.</p><button type="button" class="v998-action" data-v998-action="access">Open Access Options</button></div><div class="v998-card"><b>Paid Access / Renewal</b><p>Open Payments to manage a paid Premium Market Access renewal.</p><button type="button" class="v998-action alt" data-v998-action="payments">Open Payments</button></div></div></div></div>';
    document.body.appendChild(o);
    function close(){o.hidden=true;document.documentElement.style.removeProperty('overflow');document.body.style.removeProperty('overflow');}
    o.querySelector('.v998-close').addEventListener('click',close);
    o.addEventListener('mousedown',function(e){if(e.target===o)close();});
    o.addEventListener('click',function(e){
      var b=e.target.closest('[data-v998-action]');if(!b)return;
      var a=b.getAttribute('data-v998-action');
      close();
      if(a==='access'){
        tryNativeAccess();
        setTimeout(function(){if(!accessPanelVisible())location.href='/student-dashboard.html#access';},220);
      }else if(a==='payments'){
        try{location.hash='payments';window.dispatchEvent(new HashChangeEvent('hashchange'));}catch(_){location.href='/student-dashboard.html#payments';}
      }
    });
    return o;
  }

  function showGuaranteedModal(){
    var o=overlay();o.hidden=false;
    document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  }

  function openManage(){
    // Try the application's real Access panel first. If no visible result appears,
    // show our guaranteed modal so the button can never remain dead.
    tryNativeAccess();
    setTimeout(function(){if(!accessPanelVisible())showGuaranteedModal();},180);
  }

  function bind(btn){
    if(!btn||btn.getAttribute(BTN_ATTR)==='1') return;
    btn.setAttribute(BTN_ATTR,'1');
    try{btn.disabled=false;btn.removeAttribute('disabled');btn.removeAttribute('aria-disabled');}catch(_){ }
    btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();openManage();},true);
    btn.onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}openManage();return false;};
  }

  function scan(){
    qsa('button,a,[role="button"]').forEach(function(el){if(isManageButton(el))bind(el);});
  }

  // Window capture survives dynamic document/profile re-renders better than a one-off button listener.
  window.addEventListener('click',function(e){
    var t=e.target&&e.target.closest?e.target.closest('button,a,[role="button"]'):null;
    if(!isManageButton(t)) return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    openManage();
  },true);

  ensureStyle();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
  window.addEventListener('load',scan,{once:true});
  window.addEventListener('hashchange',function(){setTimeout(scan,20);});
  try{new MutationObserver(function(){scan();}).observe(document.documentElement,{subtree:true,childList:true});}catch(_){ }
  [200,600,1200,2500,5000].forEach(function(ms){setTimeout(scan,ms);});
})();

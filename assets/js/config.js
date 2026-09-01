window.APP_CONFIG = {
  SUPABASE_URL: 'https://jsmthmmkafgvzzcjjihp.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_4NT_9rswuHlVNBXaoyBtaQ_Uk11zqu5',
  SITE_URL: 'https://www.24kmrzero.com',
  DEFAULT_FREE_COURSE_SLUG: 'free-course',
  DEFAULT_TIMEZONE: 'Asia/Karachi',
  SUPPORT_WHATSAPP: '601113019068',
  SUPPORT_EMAIL: '24kmrzero@gmail.com',
  RISK_VERSION: '1.0',
  TERMS_VERSION: '1.0'
};

/*
 * 24K Student auth lock recovery — v9.96
 *
 * Chromium's Web Locks can leave Supabase Auth waiting forever. This is a
 * silent failure: getSession/signIn can simply never resolve. The Student
 * portal is especially sensitive because it performs several auth/data calls
 * while booting and can create more than one client during route transitions.
 *
 * Student/Login only:
 *   1. force a function-scoped (no navigator.locks) auth lock;
 *   2. reuse one Supabase client per page so duplicate clients cannot compete;
 *   3. defer onAuthStateChange application work out of the auth notification;
 *   4. preserve every existing auth option/storage key supplied by the app.
 *
 * Admin is deliberately untouched.
 */
(function install24KStudentAuthLockRecovery() {
  'use strict';

  var path = String((window.location && window.location.pathname) || '').toLowerCase();
  var isAdmin = path.indexOf('/admin') !== -1 || path.indexOf('admin-login') !== -1;
  var isStudent = !isAdmin && (
    path.indexOf('/student') !== -1 ||
    path.endsWith('/student-dashboard.html') ||
    path.endsWith('/login.html') ||
    path.endsWith('/sign-in/') ||
    path.endsWith('/sign-up/')
  );

  if (!isStudent) return;

  var root = window.supabase;
  if (!root || typeof root.createClient !== 'function') return;
  if (root.createClient.__24kV996) return;

  var nativeCreateClient = root.createClient;
  var singleton = null;
  var singletonUrl = '';
  var singletonKey = '';

  // Supabase Auth accepts a custom LockFunc. Running fn directly avoids a
  // zombie/orphaned navigator.locks entry blocking getSession/signIn forever.
  function noNavigatorLock(_name, _acquireTimeout, fn) {
    return Promise.resolve().then(fn);
  }

  function deferAuthCallbacks(client) {
    try {
      var auth = client && client.auth;
      if (!auth || typeof auth.onAuthStateChange !== 'function' || auth.__24kV996Deferred) return;

      var nativeOnAuthStateChange = auth.onAuthStateChange.bind(auth);
      auth.onAuthStateChange = function (callback) {
        if (typeof callback !== 'function') return nativeOnAuthStateChange(callback);

        return nativeOnAuthStateChange(function (event, session) {
          // Do not await application Supabase calls inside the auth notification.
          window.setTimeout(function () {
            try {
              var result = callback(event, session);
              if (result && typeof result.catch === 'function') {
                result.catch(function (error) {
                  console.error('[24K Student auth callback]', error);
                });
              }
            } catch (error) {
              console.error('[24K Student auth callback]', error);
            }
          }, 0);
        });
      };
      auth.__24kV996Deferred = true;
    } catch (error) {
      console.error('[24K Student auth callback guard]', error);
    }
  }

  function guardedCreateClient(url, key, options) {
    var urlText = String(url || '');
    var keyText = String(key || '');

    // Reuse the same client in this page context. Multiple GoTrueClient
    // instances against the same persisted session can race during init.
    if (singleton && urlText === singletonUrl && keyText === singletonKey) {
      return singleton;
    }

    var source = options && typeof options === 'object' ? options : {};
    var next = {};
    Object.keys(source).forEach(function (k) { next[k] = source[k]; });

    var authSource = source.auth && typeof source.auth === 'object' ? source.auth : {};
    var auth = {};
    Object.keys(authSource).forEach(function (k) { auth[k] = authSource[k]; });

    // Preserve current storageKey/storage/persistSession/autoRefreshToken/etc.
    // Only replace the lock implementation.
    auth.lock = noNavigatorLock;
    next.auth = auth;

    var client = nativeCreateClient.call(root, url, key, next);
    deferAuthCallbacks(client);

    singleton = client;
    singletonUrl = urlText;
    singletonKey = keyText;
    window.__24K_STUDENT_SUPABASE_CLIENT__ = client;
    return client;
  }

  try {
    Object.defineProperty(guardedCreateClient, '__24kV996', { value: true });
  } catch (_) {
    guardedCreateClient.__24kV996 = true;
  }

  root.createClient = guardedCreateClient;
  window.__24K_STUDENT_AUTH_HOTFIX__ = '9.96';
})();


/* 24K Student Manage Access fix — v9.97 */
(function install24KManageAccessFix(){
  'use strict';
  if (window.__24K_MANAGE_ACCESS_FIX__) return;
  window.__24K_MANAGE_ACCESS_FIX__ = '9.97';

  var path=String((window.location&&window.location.pathname)||'').toLowerCase();
  if (path.indexOf('/student')===-1 && !path.endsWith('/student-dashboard.html')) return;

  function txt(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim();}
  function low(el){return txt(el).toLowerCase();}
  function all(sel,root){try{return Array.prototype.slice.call((root||document).querySelectorAll(sel));}catch(_){return [];}}
  function visible(el){
    if(!el||!el.isConnected||el.hidden)return false;
    try{var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';}catch(_){return true;}
  }
  function isManageButton(el){return !!(el&&/^(manage\s+access)$/i.test(txt(el)));}

  function nativeDialogVisible(){
    return all('dialog,[role="dialog"],[class*="modal" i],[class*="drawer" i],[class*="overlay" i]').some(function(el){
      var t=low(el);return visible(el)&&t.indexOf('access')>=0&&(t.indexOf('premium')>=0||t.indexOf('broker')>=0||t.indexOf('trial')>=0||t.indexOf('payment')>=0);
    });
  }

  function callNativeOpener(){
    var names=['openPremiumAccess','openPremiumAccessModal','showPremiumAccess','showPremiumAccessModal','managePremiumAccess','openAccessModal','openAccessManager','showAccessModal'];
    var owners=[window,window.StudentBase,window.StudentApp,window.PremiumAccess,window.StudentPremium,window.StudentCourses].filter(Boolean);
    for(var i=0;i<owners.length;i++) for(var j=0;j<names.length;j++){
      try{if(typeof owners[i][names[j]]==='function'){owners[i][names[j]]();return true;}}catch(e){console.warn('[24K Manage Access] opener failed',e);}
    }
    return false;
  }

  function flowScore(el){
    var t=low(el),score=0;
    ['free trial','paid renewal','ib access','broker','verification','local bank','usdt','renewal','premium payment'].forEach(function(k){if(t.indexOf(k)>=0)score++;});
    return score;
  }
  function findExistingFlow(button){
    var nodes=all('section,article,div,[id*="premium" i],[id*="access" i],[class*="premium" i],[class*="access" i]');
    var c=nodes.filter(function(el){
      if(el===button||el.contains(button))return false;
      if(all('button,a,input,select',el).length<1)return false;
      return flowScore(el)>=2;
    });
    c.sort(function(a,b){return flowScore(b)-flowScore(a)||txt(a).length-txt(b).length;});
    return c[0]||null;
  }

  function style(){
    if(document.getElementById('v997-manage-access-style'))return;
    var s=document.createElement('style');s.id='v997-manage-access-style';
    s.textContent='\n.v997-access-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:18px}.v997-access-overlay[hidden]{display:none!important}.v997-access-dialog{width:min(760px,calc(100vw - 28px));max-height:88vh;overflow:auto;border:1px solid rgba(230,174,15,.35);border-radius:18px;background:#11110f;color:#f5f5f5;box-shadow:0 28px 90px rgba(0,0,0,.55)}html[data-theme="light"] .v997-access-dialog{background:#fffaf0;color:#161616}.v997-access-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(230,174,15,.2)}.v997-access-head h3{margin:0;font-size:19px}.v997-access-close{width:36px;height:36px;border-radius:10px;border:1px solid rgba(230,174,15,.32);background:transparent;color:#e4aa0a;font-size:22px;cursor:pointer}.v997-access-body{padding:16px 18px 18px}.v997-access-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.v997-access-card{border:1px solid rgba(230,174,15,.22);border-radius:14px;padding:14px;background:rgba(230,174,15,.05)}.v997-access-card b{display:block;margin-bottom:7px}.v997-access-card p{font-size:12px;line-height:1.45;opacity:.72;min-height:36px}.v997-access-action{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 13px;border:1px solid rgba(230,174,15,.42);border-radius:10px;background:#f4bf24;color:#111;font-weight:800;text-decoration:none;cursor:pointer}.v997-access-action.secondary{background:transparent;color:#e4aa0a}.v997-existing-flow{display:block!important;visibility:visible!important;opacity:1!important;position:static!important;transform:none!important;width:100%!important;max-width:none!important;margin:0!important}@media(max-width:720px){.v997-access-grid{grid-template-columns:1fr}.v997-access-card p{min-height:0}}';
    document.head.appendChild(s);
  }

  function getOverlay(){
    style();
    var o=document.getElementById('v997-access-overlay');
    if(o)return o;
    o=document.createElement('div');o.id='v997-access-overlay';o.className='v997-access-overlay';o.hidden=true;
    o.innerHTML='<div class="v997-access-dialog" role="dialog" aria-modal="true" aria-labelledby="v997-access-title"><div class="v997-access-head"><h3 id="v997-access-title">Manage Premium Access</h3><button type="button" class="v997-access-close" aria-label="Close">×</button></div><div class="v997-access-body"></div></div>';
    document.body.appendChild(o);
    function close(){o.hidden=true;document.body.style.removeProperty('overflow');}
    o.querySelector('.v997-access-close').addEventListener('click',close);
    o.addEventListener('mousedown',function(e){if(e.target===o)close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!o.hidden)close();});
    return o;
  }

  function openExisting(flow){
    var o=getOverlay(),body=o.querySelector('.v997-access-body');
    if(!flow.__v997_placeholder){
      flow.__v997_placeholder=document.createComment('24k-premium-access-placeholder');
      if(flow.parentNode)flow.parentNode.insertBefore(flow.__v997_placeholder,flow);
    }
    flow.classList.add('v997-existing-flow');flow.hidden=false;
    body.innerHTML='';body.appendChild(flow);
    o.hidden=false;document.body.style.overflow='hidden';
  }

  function route(hash){
    try{
      var base='/student-dashboard.html'+hash;
      if(location.pathname.toLowerCase().endsWith('/student-dashboard.html')) location.hash=hash;
      else location.href=base;
    }catch(_){location.href='/student-dashboard.html'+hash;}
  }

  function trialStatus(){
    var badges=all('span,div,p,strong').map(txt).filter(function(t){return /free trial/i.test(t)&&/left|active|day/i.test(t);});
    return badges[0]||'Free trial access is managed automatically from your current account status.';
  }

  function openFallback(){
    var o=getOverlay(),body=o.querySelector('.v997-access-body');
    body.innerHTML='<div class="v997-access-grid">'+
      '<div class="v997-access-card"><b>Free Trial</b><p></p><button type="button" class="v997-access-action secondary" data-v997="trial">Current Status</button></div>'+
      '<div class="v997-access-card"><b>Paid Renewal</b><p>Open the Payments section to renew Premium Market Access using the available payment method.</p><button type="button" class="v997-access-action" data-v997="payments">Open Payments</button></div>'+
      '<div class="v997-access-card"><b>IB / Broker Access</b><p>Open the broker verification/access flow for Premium Market Access.</p><button type="button" class="v997-access-action" data-v997="broker">Open Access</button></div>'+
      '</div>';
    body.querySelector('.v997-access-card p').textContent=trialStatus();
    body.addEventListener('click',function handler(e){
      var b=e.target.closest('[data-v997]');if(!b)return;
      var a=b.getAttribute('data-v997');
      if(a==='payments')route('#payments');
      if(a==='broker')route('#access');
      if(a==='trial'&&window.App&&typeof window.App.toast==='function')window.App.toast(trialStatus(),'info',3500);
    },{once:false});
    o.hidden=false;document.body.style.overflow='hidden';
  }

  function openManage(button){
    if(nativeDialogVisible())return;
    var used=callNativeOpener();
    if(used){setTimeout(function(){if(!nativeDialogVisible()){var f=findExistingFlow(button);if(f)openExisting(f);else openFallback();}},100);return;}
    var f=findExistingFlow(button);if(f){openExisting(f);return;}
    openFallback();
  }

  document.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest?e.target.closest('button,a,[role="button"]'):null;
    if(!isManageButton(btn))return;
    e.preventDefault();e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    openManage(btn);
  },true);

  // Explicitly wire currently rendered buttons as well. Capture delegation above
  // keeps future profile renders working without a MutationObserver.
  function mark(){all('button,a,[role="button"]').forEach(function(b){if(isManageButton(b))b.setAttribute('data-24k-manage-access','1');});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mark,{once:true});else mark();
  window.addEventListener('hashchange',function(){setTimeout(mark,0);});
})();

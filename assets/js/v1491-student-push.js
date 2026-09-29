/* 24K MR ZERO — Student OneSignal Web Push v14.94 */
(function(){
  'use strict';
  if(window.__24K_ONESIGNAL_PUSH_V1493__) return;
  window.__24K_ONESIGNAL_PUSH_V1493__=true;

  const APP_ID='0b8b06bd-dd33-4b90-9365-04127990bcbf';
  const SAFARI_WEB_ID='web.onesignal.auto.10485988-1822-4e96-b399-29edb7cde282';

  let sdk=null;
  let ready=false;
  let lastExternalId='';
  let actionBusy=false;
  let pushIntentHandled=false;

  const $=id=>document.getElementById(id);

  function getStudentId(detail){
    return String(
      detail?.user?.id ||
      detail?.profile?.id ||
      window.StudentBase?.state?.user?.id ||
      window.StudentBase?.state?.profile?.id ||
      ''
    ).trim();
  }

  function toast(message,type='info'){
    try{
      if(window.App?.toast) window.App.toast(message,type);
    }catch(_){}
  }

  function supported(){
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  function permissionState(){
    if(!supported()) return 'unsupported';
    if(Notification.permission==='denied') return 'denied';
    return Notification.permission;
  }

  function pushSubscription(){
    return sdk?.User?.PushSubscription||null;
  }

  function isSubscribed(){
    const sub=pushSubscription();
    return Boolean(
      ready &&
      sdk?.Notifications?.permission &&
      sub &&
      sub.optedIn===true &&
      sub.id
    );
  }

  function setBusy(busy){
    actionBusy=Boolean(busy);
    const primary=$('studentPushPrimary');
    const secondary=$('studentPushSecondary');
    if(primary) primary.disabled=actionBusy;
    if(secondary) secondary.disabled=actionBusy;
  }

  function renderPushUI(){
    const nav=$('studentPushNavButton');
    const navStatus=$('studentPushNavStatus');
    const navState=$('studentPushNavState');
    const statusCard=$('studentPushStatusCard');
    const statusTitle=$('studentPushStatusTitle');
    const statusText=$('studentPushStatusText');
    const primary=$('studentPushPrimary');
    const primaryText=primary?.querySelector('span');
    const primaryIcon=primary?.querySelector('i');
    const secondary=$('studentPushSecondary');
    const footnote=$('studentPushFootnote');

    if(!nav) return;

    const perm=permissionState();
    const subscribed=isSubscribed();

    nav.classList.toggle('is-on',subscribed);
    nav.classList.toggle('is-blocked',perm==='denied');
    navState?.classList.toggle('is-on',subscribed);
    navState?.classList.toggle('is-blocked',perm==='denied');

    if(subscribed){
      if(navStatus) navStatus.textContent='Notifications On';
      nav.querySelector('.student-push-nav-copy b').textContent='Subscribe for Notifications';
      statusCard?.classList.add('is-on');
      statusCard?.classList.remove('is-blocked');
      if(statusTitle) statusTitle.textContent='Notifications are on';
      if(statusText) statusText.textContent='This device will receive signals, chart analysis and important updates.';
      if(primaryText) primaryText.textContent='Notifications Active';
      if(primaryIcon) primaryIcon.className='fa-solid fa-circle-check';
      if(primary){primary.classList.add('is-active');primary.disabled=true;}
      if(secondary) secondary.hidden=false;
      if(footnote) footnote.textContent='You can turn notifications off anytime from this menu.';
      return;
    }

    statusCard?.classList.remove('is-on');
    if(primary){primary.classList.remove('is-active');primary.disabled=actionBusy;}
    if(secondary) secondary.hidden=true;

    if(perm==='denied'){
      if(navStatus) navStatus.textContent='Notifications Blocked';
      statusCard?.classList.add('is-blocked');
      if(statusTitle) statusTitle.textContent='Notifications are blocked';
      if(statusText) statusText.textContent='Allow notifications for 24kmrzero.com from your browser site settings, then return here.';
      if(primaryText) primaryText.textContent='Notifications Blocked';
      if(primaryIcon) primaryIcon.className='fa-solid fa-bell-slash';
      if(primary) primary.disabled=true;
      if(footnote) footnote.textContent='Chrome: Site settings → Notifications → Allow.';
      return;
    }

    statusCard?.classList.remove('is-blocked');
    if(navStatus) navStatus.textContent=ready?'Get signal & update alerts':'Loading notification service…';
    if(statusTitle) statusTitle.textContent='Notifications are off';
    if(statusText) statusText.textContent='Tap subscribe to enable browser notifications on this device.';
    if(primaryText) primaryText.textContent=ready?'Subscribe for Notifications':'Loading…';
    if(primaryIcon) primaryIcon.className='fa-solid fa-bell';
    if(primary) primary.disabled=!ready||actionBusy;
    if(footnote) footnote.textContent='You can change this anytime from the Student sidebar.';
  }

  function openSheet(){
    const sheet=$('studentPushSheet');
    if(!sheet) return;
    renderPushUI();
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden','false');
    document.body.classList.add('student-push-open');
  }

  function closeSheet(){
    const sheet=$('studentPushSheet');
    if(!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden','true');
    document.body.classList.remove('student-push-open');
  }

  async function identify(detail){
    if(!ready||!sdk) return;
    const id=getStudentId(detail);
    if(!id) return;
    if(id!==lastExternalId){
      try{
        await sdk.login(id);
        lastExternalId=id;
        if(sdk.User?.addTags){
          await sdk.User.addTags({role:'student',portal:'24k_student'});
        }
      }catch(error){
        console.warn('[24K Push] OneSignal user identification failed',error?.message||error);
      }
    }
  }

  async function waitForSubscription(timeout=7000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      if(isSubscribed()) return true;
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    return isSubscribed();
  }

  function currentExternalId(){
    try{return String(sdk?.User?.externalId||'').trim();}catch(_){return '';}
  }

  async function waitForIdentity(expectedId,timeout=7000){
    const expected=String(expectedId||'').trim();
    if(!expected||!sdk) return false;

    // Re-assert the OneSignal login after the browser subscription exists.
    // This prevents a first-subscribe race where the PushSubscription is ready
    // before the external_id alias has propagated to OneSignal.
    try{
      await sdk.login(expected);
      lastExternalId=expected;
      if(sdk.User?.addTags){
        await sdk.User.addTags({role:'student',portal:'24k_student'});
      }
    }catch(error){
      console.warn('[24K Push] Identity resync failed',error?.message||error);
      return false;
    }

    const started=Date.now();
    let externalIdSeen=false;
    while(Date.now()-started<timeout){
      if(!isSubscribed()){
        await new Promise(resolve=>setTimeout(resolve,250));
        continue;
      }
      const externalId=currentExternalId();
      if(externalId){
        externalIdSeen=true;
        if(externalId===expected){
          // Allow a short server-side settle window after the SDK reports the alias.
          await new Promise(resolve=>setTimeout(resolve,900));
          return true;
        }
      }
      await new Promise(resolve=>setTimeout(resolve,250));
    }

    // Older/limited SDK builds may not expose User.externalId even though login()
    // completed. In that case, use a conservative settle delay instead of
    // firing the self-test immediately.
    if(!externalIdSeen&&isSubscribed()){
      await new Promise(resolve=>setTimeout(resolve,1600));
      return true;
    }
    return currentExternalId()===expected&&isSubscribed();
  }

  async function sendSelfTest(options={}){
    const retries=Math.max(1,Number(options.retries||1));
    const retryDelay=Math.max(700,Number(options.retryDelay||1400));
    for(let attempt=1;attempt<=retries;attempt++){
      try{
        if(!window.App?.supabase?.functions) return null;
        const {data,error}=await window.App.supabase.functions.invoke('send-student-push',{
          body:{type:'subscription_test'}
        });
        if(error) throw error;
        if(data?.ok) return data;
        if(attempt===retries) return data||null;
      }catch(error){
        console.warn(`[24K Push] Self-test push attempt ${attempt} failed`,error?.message||error);
        if(attempt===retries) return null;
      }
      await new Promise(resolve=>setTimeout(resolve,retryDelay*attempt));
    }
    return null;
  }

  async function subscribe(){
    if(actionBusy||!ready||!sdk) return;
    if(permissionState()==='denied'){
      renderPushUI();
      return;
    }

    setBusy(true);
    try{
      await identify(window.StudentBase?.state||null);

      if(!sdk.Notifications.permission){
        await sdk.Notifications.requestPermission();
      }

      if(!sdk.Notifications.permission){
        toast('Notification permission was not allowed.','warning');
        renderPushUI();
        return;
      }

      const sub=pushSubscription();
      if(sub?.optIn) await sub.optIn();

      const ok=await waitForSubscription();
      renderPushUI();

      if(!ok){
        toast('Browser permission is on, but subscription is still connecting. Please try once more.','warning');
        return;
      }

      toast('Notifications enabled on this device.','success');

      // Only send the individual delivery test after OneSignal has the logged-in
      // student's external_id attached to the live browser subscription.
      const studentId=getStudentId(window.StudentBase?.state||null);
      const identityReady=await waitForIdentity(studentId);
      if(identityReady){
        void sendSelfTest({retries:3,retryDelay:1400});
      }else{
        console.warn('[24K Push] Self-test skipped until OneSignal identity is synced');
      }
      setTimeout(closeSheet,650);
    }catch(error){
      console.error('[24K Push] Subscribe failed',error);
      toast('Could not enable notifications. Please try again.','error');
    }finally{
      setBusy(false);
      renderPushUI();
    }
  }

  async function unsubscribe(){
    if(actionBusy||!ready||!sdk) return;
    setBusy(true);
    try{
      const sub=pushSubscription();
      if(sub?.optOut) await sub.optOut();
      toast('Notifications turned off on this device.','info');
      renderPushUI();
      setTimeout(closeSheet,650);
    }catch(error){
      console.error('[24K Push] Unsubscribe failed',error);
      toast('Could not update notification settings.','error');
    }finally{
      setBusy(false);
      renderPushUI();
    }
  }

  function bindUI(){
    $('studentPushNavButton')?.addEventListener('click',event=>{
      event.preventDefault();
      openSheet();
    });
    document.querySelectorAll('[data-close-student-push]').forEach(el=>el.addEventListener('click',closeSheet));
    $('studentPushPrimary')?.addEventListener('click',subscribe);
    $('studentPushSecondary')?.addEventListener('click',unsubscribe);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&$('studentPushSheet')?.classList.contains('open')) closeSheet();
    });
    renderPushUI();
  }

  function getPushIntent(){
    try{
      const params=new URLSearchParams(location.search);
      const id=String(params.get('push')||'').trim();
      if(!id)return null;
      const hash=String(location.hash||'').replace(/^#/,'').toLowerCase();
      const type=String(params.get('type')||(
        hash==='signals'?'signal':
        hash==='charts'?'chart':
        hash==='articles'?'article':
        hash==='announcements'?'announcement':''
      )).toLowerCase();
      return type?{type,id}:null;
    }catch(_){return null}
  }

  function openPushIntent(){
    if(pushIntentHandled)return;
    const intent=getPushIntent();
    if(!intent)return;
    if(typeof window.__24K_OPEN_PUSH_CONTENT__!=='function')return;
    const opened=window.__24K_OPEN_PUSH_CONTENT__(intent.type,intent.id);
    if(opened){
      pushIntentHandled=true;
      try{
        const url=new URL(location.href);
        url.searchParams.delete('push');
        url.searchParams.delete('type');
        history.replaceState(history.state,'',url.pathname+(url.search||'')+(url.hash||''));
      }catch(_){}
    }
  }

  window.Push24KStudent={
    get ready(){return ready;},
    get permission(){return Boolean(sdk?.Notifications?.permission);},
    get subscribed(){return isSubscribed();},
    requestPermission:subscribe,
    identify,
    openSettings:openSheet
  };

  bindUI();

  window.OneSignalDeferred=window.OneSignalDeferred||[];
  window.OneSignalDeferred.push(async function(OneSignal){
    try{
      sdk=OneSignal;
      await OneSignal.init({
        appId:APP_ID,
        safari_web_id:SAFARI_WEB_ID,
        serviceWorkerPath:'onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam:{scope:'/onesignal/'},
        notifyButton:{enable:false}
      });

      ready=true;
      await identify(window.StudentBase?.state||null);
      renderPushUI();

      // Existing subscribers get one delivery check only after the external_id
      // identity is confirmed. This avoids invalid_aliases during page startup.
      if(isSubscribed()&&!localStorage.getItem('24k_push_delivery_test_v1494')){
        localStorage.setItem('24k_push_delivery_test_v1494','pending');
        setTimeout(async()=>{
          const studentId=getStudentId(window.StudentBase?.state||null);
          const identityReady=await waitForIdentity(studentId);
          const result=identityReady
            ? await sendSelfTest({retries:3,retryDelay:1400})
            : null;
          if(result?.ok)localStorage.setItem('24k_push_delivery_test_v1494','sent');
          else localStorage.removeItem('24k_push_delivery_test_v1494');
        },1200);
      }

      try{
        OneSignal.Notifications.addEventListener('permissionChange',function(){
          renderPushUI();
          window.dispatchEvent(new CustomEvent('24k:push-permission',{detail:{permission:Boolean(OneSignal.Notifications.permission)}}));
        });
      }catch(_){}

      try{
        OneSignal.User.PushSubscription.addEventListener('change',function(){
          renderPushUI();
        });
      }catch(_){}

      setTimeout(openPushIntent,350);
    }catch(error){
      console.error('[24K Push] OneSignal initialization failed',error);
      ready=false;
      renderPushUI();
    }
  });

  window.addEventListener('24k:student-base-updated',event=>{
    void identify(event.detail);
    setTimeout(openPushIntent,120);
  });
  window.addEventListener('24k:student-market-updated',()=>setTimeout(openPushIntent,80));
  window.addEventListener('24k:push-permission',renderPushUI);
  window.addEventListener('load',()=>{
    renderPushUI();
    setTimeout(openPushIntent,500);
  });
})();

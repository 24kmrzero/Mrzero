/* 24K MR ZERO — Student OneSignal Web Push v14.91 */
(function(){
  'use strict';
  if(window.__24K_ONESIGNAL_PUSH_V1491__) return;
  window.__24K_ONESIGNAL_PUSH_V1491__=true;

  const APP_ID='0b8b06bd-dd33-4b90-9365-04127990bcbf';
  const SAFARI_WEB_ID='web.onesignal.auto.10485988-1822-4e96-b399-29edb7cde282';
  let sdk=null,ready=false,lastExternalId='';

  function getStudentId(detail){
    return String(
      detail?.user?.id ||
      detail?.profile?.id ||
      window.StudentBase?.state?.user?.id ||
      window.StudentBase?.state?.profile?.id ||
      ''
    ).trim();
  }

  async function identify(detail){
    if(!ready||!sdk) return;
    const id=getStudentId(detail);
    if(!id||id===lastExternalId) return;
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

  async function requestPermission(){
    if(!ready||!sdk) return false;
    try{
      await sdk.Notifications.requestPermission();
      return Boolean(sdk.Notifications.permission);
    }catch(error){
      console.warn('[24K Push] Permission request failed',error?.message||error);
      return false;
    }
  }

  window.Push24KStudent={
    get ready(){return ready;},
    get permission(){return Boolean(sdk?.Notifications?.permission);},
    requestPermission,
    identify
  };

  window.OneSignalDeferred=window.OneSignalDeferred||[];
  window.OneSignalDeferred.push(async function(OneSignal){
    try{
      sdk=OneSignal;
      await OneSignal.init({
        appId:APP_ID,
        safari_web_id:SAFARI_WEB_ID,
        serviceWorkerPath:'onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam:{scope:'/onesignal/'},
        notifyButton:{enable:true}
      });
      ready=true;
      await identify(window.StudentBase?.state||null);

      try{
        OneSignal.Notifications.addEventListener('permissionChange',function(permission){
          window.dispatchEvent(new CustomEvent('24k:push-permission',{detail:{permission:Boolean(permission)}}));
        });
      }catch(_){}
    }catch(error){
      console.error('[24K Push] OneSignal initialization failed',error);
    }
  });

  window.addEventListener('24k:student-base-updated',event=>{void identify(event.detail);});
})();

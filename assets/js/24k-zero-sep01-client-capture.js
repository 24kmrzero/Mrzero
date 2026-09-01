(function(){
  "use strict";
  if(window.__z24ClientCaptureInstalled) return;
  window.__z24ClientCaptureInstalled=true;
  window.__z24SupabaseClients=window.__z24SupabaseClients||[];

  function hook(){
    const lib=window.supabase;
    if(!lib || typeof lib.createClient!=="function" || lib.createClient.__z24Wrapped) return false;
    const original=lib.createClient.bind(lib);
    function wrapped(){
      const client=original.apply(null,arguments);
      try{
        window.__z24SupabaseClients.push(client);
        window.__z24LastSupabaseClient=client;
      }catch(_){}
      return client;
    }
    wrapped.__z24Wrapped=true;
    wrapped.__z24Original=original;
    lib.createClient=wrapped;
    return true;
  }
  if(!hook()){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(hook() || tries>160) clearInterval(timer);
    },25);
  }
})();
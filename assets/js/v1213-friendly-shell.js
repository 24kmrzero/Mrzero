
(function(){
'use strict';
const A=window.App;
function open(){document.body.classList.add('side-open')}
function close(){document.body.classList.remove('side-open')}
document.addEventListener('click',async e=>{
  if(e.target.closest('[data-open-side]'))open();
  if(e.target.closest('[data-close-side]'))close();
  if(e.target.closest('[data-friendly-logout]')){
    try{await A?.supabase?.auth?.signOut()}catch(_){}
    location.href='/admin-login.html';
  }
});
(async()=>{
  try{
    if(!A?.supabase) return;
    const u=await A.getCurrentUser();
    if(!u){location.replace('/admin-login.html');return}
    const p=await A.getProfile(u.id);
    if(!p||!['admin','super_admin'].includes(String(p.role||''))){location.replace('/');return}
  }catch(e){console.warn('[V12.13 shell]',e?.message||e)}
})();
})();

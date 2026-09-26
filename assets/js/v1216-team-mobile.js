(function(){
'use strict';
const cfg=window.APP_CONFIG||{};
const sb=(window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let teamSheetHistoryPop=false;
function teamSheetOpen(){
  const sheet=$('#teamProfileSheet');if(!sheet)return;
  const n=$('#teamMemberName')?.textContent||'Team Member';
  if($('#teamProfileName'))$('#teamProfileName').textContent=n;
  if(!sheet.classList.contains('open')){
    try{
      const current=history.state||{};
      const marker={...current,__24kTeamSheet:true};
      if(current.__24kTeamSheet)history.replaceState(marker,'',location.href);
      else history.pushState(marker,'',location.href)
    }catch{}
  }
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden','false');
  $$('.team-mobile-nav button').forEach(x=>x.classList.remove('active'));
  $('[data-team-mobile-profile]')?.classList.add('active')
}
function teamSheetClose(fromPop=false){
  const sheet=$('#teamProfileSheet');if(!sheet||!sheet.classList.contains('open'))return;
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden','true');
  const k=(location.hash||'#overview').slice(1);
  $$('[data-team-mobile-view]').forEach(x=>x.classList.toggle('active',x.dataset.teamMobileView===k));
  if(!fromPop&&!teamSheetHistoryPop&&history.state?.__24kTeamSheet){
    setTimeout(()=>{try{history.back()}catch{}},0)
  }
}
function clearTeamSheetHistory(){
  if(!history.state?.__24kTeamSheet)return;
  try{
    const next={...history.state};
    delete next.__24kTeamSheet;
    history.replaceState(next,'',location.href)
  }catch{}
}
function openView(k){
  clearTeamSheetHistory();
  const b=$(`.team-side [data-view="${k}"]`);
  if(b)b.click();else location.hash=k;
  $$('[data-team-mobile-view]').forEach(x=>x.classList.toggle('active',x.dataset.teamMobileView===k));
  const sheet=$('#teamProfileSheet');if(sheet){sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true')}
}
$$('[data-team-mobile-view]').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.teamMobileView)));
$$('[data-team-sheet-view]').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.teamSheetView)));
$('[data-team-mobile-profile]')?.addEventListener('click',teamSheetOpen);
$('#teamProfileClose')?.addEventListener('click',()=>teamSheetClose(false));
$('#teamProfileSheet')?.addEventListener('click',e=>{if(e.target.id==='teamProfileSheet')teamSheetClose(false)});
window.addEventListener('popstate',()=>{
  const sheet=$('#teamProfileSheet');
  if(!sheet?.classList.contains('open'))return;
  teamSheetHistoryPop=true;
  teamSheetClose(true);
  teamSheetHistoryPop=false
});
$('#teamMobileInstall')?.addEventListener('click',()=>$('#teamInstallButton')?.click());
$('#teamMobileRefresh')?.addEventListener('click',()=>$('#teamRefresh')?.click());
$('#teamMobileTheme')?.addEventListener('click',()=>$('#teamTheme')?.click());
$('#teamMobileLogout')?.addEventListener('click',()=>$('#teamLogout')?.click());
window.addEventListener('hashchange',()=>{const k=(location.hash||'#overview').slice(1);$$('[data-team-mobile-view]').forEach(x=>x.classList.toggle('active',x.dataset.teamMobileView===k))});
$('#teamForgotOpen')?.addEventListener('click',()=>$('#teamForgotBox')?.classList.toggle('hidden'));
$('#teamForgotSubmit')?.addEventListener('click',async()=>{const identity=String($('#teamForgotIdentity')?.value||'').trim(),status=$('#teamForgotStatus'),btn=$('#teamForgotSubmit');if(!identity){if(status)status.textContent='Enter your username or email.';return}if(!sb){if(status)status.textContent='Reset service is unavailable.';return}btn.disabled=true;if(status)status.textContent='Sending secure reset link…';try{const {error}=await sb.rpc('request_team_password_reset',{p_identity:identity});if(error)throw error;if(status)status.textContent='If an email is linked to this Team account, a reset link has been sent.'}catch(e){if(status)status.textContent='Could not request reset. Please try again.'}finally{btn.disabled=false}});
})();

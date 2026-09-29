(function(){
'use strict';
/* mentor build 14.52 */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(e=>console.warn('[24K Mentor PWA]',e?.message||e)));
}
let mentorInstallPrompt=null;
const mentorStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
function updateMentorInstall(){
  const b=document.getElementById('mentorInstallButton');
  if(!b)return;
  const icon=b.querySelector('.mentor-profile-install-icon i'),
    title=b.querySelector('span:nth-child(2) b'),
    sub=b.querySelector('span:nth-child(2) small'),
    arrow=b.querySelector(':scope > i:last-child');
  if(mentorStandalone()){
    if(icon)icon.className='fa-solid fa-circle-check';
    if(title)title.textContent='Mentor App Installed';
    if(sub)sub.textContent='24K Mentor is ready on this device';
    if(arrow)arrow.className='fa-solid fa-check';
    b.disabled=true;
    b.dataset.installed='1';
    b.classList.add('installed');
  }else{
    if(icon)icon.className='fa-solid fa-download';
    if(title)title.textContent='Install Mentor App';
    if(sub)sub.textContent='Add 24K Mentor to your home screen';
    if(arrow)arrow.className='fa-solid fa-chevron-right';
    b.disabled=false;
    b.dataset.installed='0';
    b.classList.remove('installed');
  }
}
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  mentorInstallPrompt=e;
  document.getElementById('mentorInstallButton')?.classList.add('ready');
  updateMentorInstall();
});
window.addEventListener('appinstalled',()=>{
  mentorInstallPrompt=null;
  updateMentorInstall();
  try{toast('24K Mentor App installed successfully.','success')}catch(_){}
});
window.addEventListener('load',updateMentorInstall);
const cfg=window.APP_CONFIG||{},mentorProjectRef=(()=>{try{return new URL(cfg.SUPABASE_URL).hostname.split('.')[0]}catch{return'24k'}})(),mentorAuthKey=`sb-${mentorProjectRef}-mentor-auth-token`,sb=(window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY)?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{storageKey:mentorAuthKey,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}):null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const state={user:null,profile:null,perms:{signals:false,charts:false,articles:false,announcements:false},signals:[],charts:[],articles:[],banners:[],courses:[],courseSessions:[],news:[],signalTab:'active',signalPeriod:'all',signalFilters:{q:'',pair:'all',type:'all',status:'all',from:'',to:''},chartPeriod:'all',articlePeriod:'all',performanceMonth:null,performanceMonthKeys:[]};
const CLOSED=new Set(['sl_hit','breakeven_hit','manually_closed','closed','cancelled','tp4_hit']);
function signalIsClosed(s){const st=String(s?.status||'');return Boolean(s?.closed_at)||CLOSED.has(st)||(st==='tp3_hit'&&(s?.take_profit_4===null||s?.take_profit_4===undefined||s?.take_profit_4===''))}
function applyMentorTheme(v){
  document.documentElement.dataset.theme=v;
  localStorage.setItem('mentor-theme',v);
  const i=$('#mentorTheme i');if(i)i.setAttribute('class',v==='dark'?'fa-solid fa-sun':'fa-solid fa-moon');
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',v==='dark'?'#0b0e11':'#f5f6f7');
}
function toast(m){const x=$('#mentorToast');if(!x)return;x.textContent=m;x.classList.add('show');clearTimeout(x._t);x._t=setTimeout(()=>x.classList.remove('show'),3200)}
async function auditMentor(action,status='success',details={},entityType=null,entityId=null){
  try{
    if(!sb)return;
    await sb.functions.invoke('audit-event',{body:{action,status,entity_type:entityType,entity_id:entityId,details:{scope:'mentor',...details}}});
  }catch(_){}
}
async function sendStudentPush24K(payload){
  try{
    if(!sb)return null;
    const {data,error}=await sb.functions.invoke('send-student-push',{body:payload});
    if(error)throw error;
    return data||{ok:true}
  }catch(error){
    console.warn('[24K Push] Mentor push failed',error);
    return null
  }
}
async function sendLatestMentorSignalUpdatePush24K(signalId){
  try{
    const {data:update,error}=await sb.from('signal_updates')
      .select('id,event_type,notify_users,notification_title,notification_message,note,created_at')
      .eq('signal_id',signalId)
      .eq('notify_users',true)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error||!update)return null;
    return await sendStudentPush24K({
      type:'signal_update',
      content_id:String(signalId),
      event_key:`signal:update:${update.id}`,
      title:update.notification_title||'24K Signal Update',
      message:update.notification_message||update.note||'A signal has been updated.',
      url:`/student/signals/?push=${encodeURIComponent(signalId)}`
    })
  }catch(error){
    console.warn('[24K Push] Mentor signal update lookup failed',error);
    return null
  }
}
function num(v){if(v===null||v===undefined||String(v).trim()==='')return null;const x=Number(v);return Number.isFinite(x)?x:null}function money(v){return Number(v||0).toLocaleString(undefined,{maximumFractionDigits:1})}function dt(v){if(!v)return'—';try{return new Date(v).toLocaleString()}catch{return'—'}}function slug(v){return String(v||'article').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}
function byDate(items,key='created_at'){return items.reduce((a,x)=>{const d=new Date(x[key]||x.published_at||Date.now()),k=d.toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});(a[k]||(a[k]=[])).push(x);return a},{})}
function contentAssetPath(url){if(!url)return null;try{const p=new URL(url,location.origin).pathname,marker='/storage/v1/object/public/content-assets/';const i=p.indexOf(marker);return i>=0?decodeURIComponent(p.slice(i+marker.length)):null}catch{return null}}
async function removeContentAsset(url){const path=contentAssetPath(url);if(!path)return;const r=await sb.storage.from('content-assets').remove([path]);if(r.error)console.warn('Mentor asset cleanup failed:',r.error)}
async function upload(file,folder){if(!file)return null;if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPG or WEBP images only.');if(file.size>8*1024*1024)throw new Error('Image must be 8 MB or smaller.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`mentor/${state.user.id}/${folder}/${crypto.randomUUID()}.${ext}`;const r=await sb.storage.from('content-assets').upload(path,file,{upsert:false,contentType:file.type||undefined});if(r.error)throw r.error;return sb.storage.from('content-assets').getPublicUrl(path).data.publicUrl}
function titleFor(k){return({performance:['Performance','Live overview and results'],signals:['Signals','Smart signal creation and management'],charts:['Charts','VIP chart research & analysis'],articles:['Articles','Professional research & insights'],courses:['Courses','Current course catalogue'],news:['News','Latest platform updates'],settings:['Settings','Mentor account & permissions']})[k]||['Mentor Panel','']}
function openMentorMenu(){
  document.body.classList.add('mentor-menu-open');
  const b=$('#mentorMenuToggle');if(b)b.setAttribute('aria-expanded','true');
}
function closeMentorMenu(){
  document.body.classList.remove('mentor-menu-open');
  const b=$('#mentorMenuToggle');if(b)b.setAttribute('aria-expanded','false');
}
function showView(k){
  if(k==='more')k='settings';
  if(k==='banners')k='performance';
  if(['signals','charts','articles'].includes(k)&&!state.perms[k])return toast('Admin has not enabled this section.');
  $$('[data-mentor-panel]').forEach(x=>x.classList.toggle('active',x.dataset.mentorPanel===k));
  $$('[data-mentor-view]').forEach(x=>x.classList.toggle('active',x.dataset.mentorView===k));
  let [t,s]=titleFor(k);
  if(k==='settings'&&window.innerWidth<=760){t='More';s='Account, access & workspace'}
  if($('#mentorPageTitle'))$('#mentorPageTitle').textContent=t;if($('#mentorPageSubtitle'))$('#mentorPageSubtitle').textContent=s;
  history.replaceState(null,'',`#${k}`);
  closeMentorMenu();
  if(window.innerWidth<=760)window.scrollTo({top:0,behavior:'smooth'});
}
let mentorModalHistoryPop=false;
function openModal(kind){
  const id=`#mentor${kind[0].toUpperCase()+kind.slice(1)}Modal`,modal=$(id);
  if(!modal)return;
  const wasOpen=modal.classList.contains('open');
  if(!wasOpen){
    try{
      const current=history.state||{};
      const marker={...current,__24kMentorModal:true,__24kMentorModalId:modal.id};
      if(current.__24kMentorModal)history.replaceState(marker,'',location.href);
      else history.pushState(marker,'',location.href)
    }catch{}
  }
  modal.classList.add('open');
  const body=modal.querySelector('.mentor-modal-body'),card=modal.querySelector('.mentor-modal-card');
  if(body)body.scrollTop=0;if(card)card.scrollTop=0;
  requestAnimationFrame(()=>{if(body)body.scrollTop=0;if(card)card.scrollTop=0})
}
function closeModals(fromPop=false){
  const open=[...document.querySelectorAll('.mentor-modal.open')];
  open.forEach(x=>x.classList.remove('open'));
  if(fromPop||mentorModalHistoryPop||!open.length)return;
  if(history.state?.__24kMentorModal){
    setTimeout(()=>{if(!document.querySelector('.mentor-modal.open')&&history.state?.__24kMentorModal){try{history.back()}catch{}}},0)
  }
}
window.addEventListener('popstate',()=>{
  if(!document.querySelector('.mentor-modal.open'))return;
  mentorModalHistoryPop=true;
  if($('#mentorActionModal')?.classList.contains('open'))settleMentorAction(null,true);
  else closeModals(true);
  mentorModalHistoryPop=false
});
let mentorActionResolver=null;
function mentorAskAction(options={}){
  const modal=$('#mentorActionModal');if(!modal)return Promise.resolve(null);
  if(mentorActionResolver){mentorActionResolver(null);mentorActionResolver=null}
  const title=$('#mentorActionTitle'),eyebrow=$('#mentorActionEyebrow'),message=$('#mentorActionMessage'),hint=$('#mentorActionHint'),
    inputWrap=$('#mentorActionInputWrap'),input=$('#mentorActionInput'),inputLabel=$('#mentorActionInputLabel'),confirmButton=$('#mentorActionConfirm'),icon=$('#mentorActionIcon');
  if(title)title.textContent=options.title||'Confirm Action';
  if(eyebrow)eyebrow.textContent=options.eyebrow||'24K MENTOR';
  if(message)message.textContent=options.message||'Are you sure?';
  if(hint)hint.textContent=options.hint||'';
  if(inputWrap)inputWrap.hidden=!options.input;
  if(inputLabel)inputLabel.textContent=options.inputLabel||'Value';
  if(input){input.value=options.inputValue||'';input.placeholder=options.inputPlaceholder||''}
  if(confirmButton){
    confirmButton.innerHTML=`<i class="fa-solid ${options.danger?'fa-trash-can':'fa-check'}"></i><span>${esc(options.confirmText||'Confirm')}</span>`;
    confirmButton.classList.toggle('danger',Boolean(options.danger));
    confirmButton.classList.toggle('gold',!options.danger)
  }
  if(icon){
    icon.classList.toggle('danger',Boolean(options.danger));
    icon.innerHTML=`<i class="fa-solid ${options.icon||(options.danger?'fa-triangle-exclamation':'fa-circle-question')}"></i>`
  }
  openModal('action');
  return new Promise(resolve=>{
    mentorActionResolver=resolve;
    if(options.input)setTimeout(()=>input?.focus(),80)
  })
}
function settleMentorAction(value,fromPop=false){
  const resolve=mentorActionResolver;mentorActionResolver=null;
  const modal=$('#mentorActionModal');
  if(modal)modal.classList.remove('open');
  if(!fromPop&&history.state?.__24kMentorModal){
    setTimeout(()=>{try{history.back()}catch{}},0)
  }
  if(resolve)resolve(value)
}

function resetMentorEditor(kind){if(kind==='signal'){const f=$('#mentorSignalForm');f?.reset();if(f?.elements.id)f.elements.id.value='';$$('[data-note-preset]').forEach(x=>x.classList.remove('active'));const t=$('#mentorSignalModalTitle');if(t)t.textContent='New Signal';renderMentorPipPreview()}else if(kind==='chart'){
  const mobile=$('#mentorChartForm'),desktop=$('#mentorChartDesktopForm');
  mobile?.reset();desktop?.reset();
  if(mobile?.elements.id)mobile.elements.id.value='';
  if(mobile?.elements.existing_image)mobile.elements.existing_image.value='';
  if(desktop?.elements.id)desktop.elements.id.value='';
  if(desktop?.elements.existing_image)desktop.elements.existing_image.value='';
  if(desktop?.elements.symbol)desktop.elements.symbol.value='';
  if(desktop?.elements.category)desktop.elements.category.value='';
  if(desktop?.elements.is_published)desktop.elements.is_published.checked=true;
  const search=$('#mentorChartInstrumentSearch');if(search)search.value='';
  $('#mentorChartInstrumentPicker')?.classList.remove('open','invalid');
  clearMentorChartPreview();
  syncEditorFileLabel('chart',null);
  const mt=$('#mentorChartModalTitle');if(mt)mt.textContent='New Chart';
  const dt=$('#mentorChartDesktopModalTitle');if(dt)dt.textContent='Add Chart'
}else if(kind==='article'){
  const mobile=$('#mentorArticleForm'),desktop=$('#mentorArticleDesktopForm');
  mobile?.reset();desktop?.reset();
  if(mobile?.elements.id)mobile.elements.id.value='';
  if(mobile?.elements.existing_cover)mobile.elements.existing_cover.value='';
  if(mobile?.elements.is_published)mobile.elements.is_published.checked=true;
  if(desktop?.elements.id)desktop.elements.id.value='';
  if(desktop?.elements.existing_cover)desktop.elements.existing_cover.value='';
  if(desktop?.elements.is_published)desktop.elements.is_published.checked=true;
  syncArticleEditorUI();syncEditorFileLabel('article',null);
  const mt=$('#mentorArticleModalTitle');if(mt)mt.textContent='New Article';
  const dt=$('#mentorArticleDesktopModalTitle');if(dt)dt.textContent='Add Article'
}else if(kind==='announcement'){
  const f=$('#mentorAnnouncementForm');f?.reset();
  if(f?.elements.id)f.elements.id.value='';
  if(f?.elements.priority)f.elements.priority.value='normal';
  if(f?.elements.is_published)f.elements.is_published.checked=true;
  const t=$('#mentorAnnouncementModalTitle');if(t)t.textContent='New Announcement'
}}
async function requireMentor(){
  if(!sb)throw new Error('Supabase configuration is missing.');
  let user=null;
  const local=await sb.auth.getSession();
  if(local.error)throw local.error;
  user=local.data?.session?.user||null;
  if(!user){
    const remote=await sb.auth.getUser();
    if(remote.error||!remote.data?.user){location.href='/mentor-login.html';return false}
    user=remote.data.user;
  }
  state.user=user;

  const profileQuery=sb.from('profiles').select('id,full_name,email,role,status').eq('id',user.id).maybeSingle();
  const permissionQuery=sb.from('mentor_permissions').select('feature_key,enabled').eq('mentor_id',user.id);
  const signalQuery=sb.from('signals').select('*').order('created_at',{ascending:false}).limit(500);
  const [p,pm,signals]=await Promise.all([profileQuery,permissionQuery,signalQuery]);

  if(p.error||!p.data||p.data.role!=='mentor'||String(p.data.status||'active')!=='active'){
    await sb.auth.signOut();location.href='/mentor-login.html';return false
  }
  state.profile=p.data;
  if(pm.error)throw pm.error;
  for(const k of Object.keys(state.perms))state.perms[k]=Boolean((pm.data||[]).find(x=>x.feature_key===k)?.enabled);
  if(state.perms.signals){
    if(signals.error){
      console.warn('mentor signals load',signals.error);
      state.signals=[];
    }else state.signals=signals.data||[];
  }else state.signals=[];
  return true
}
async function safeLoad(table,query){try{const r=await query;if(r.error)throw r.error;return r.data||[]}catch(e){console.warn('mentor optional load',table,e);return[]}}
function revealMentorApp(){
  $('#mentorLoading')?.classList.add('hidden');
  $('#mentorApp')?.classList.remove('hidden');
  document.body.classList.remove('mentor-booting');
}
async function loadSecondaryMentorData(){
  const tasks=[];
  for(const key of ['charts','articles']){
    if(!state.perms[key]){state[key]=[];continue}
    const table=key;
    const base=sb.from(table).select('*').order('created_at',{ascending:false}).limit(500);
    const query=base;
    tasks.push(
      safeLoad(table,query)
        .then(data=>{state[key]=data;if(key==='charts')renderCharts();else renderArticles()})
    );
  }
  tasks.push(
    safeLoad('courses',sb.from('courses').select('id,title,slug,short_description,description,instructor_name,course_type,price,discount_price,currency,status,access_days,thumbnail_url,is_published,enrollment_open,start_date,end_date,display_order').order('display_order',{ascending:true}).limit(100))
      .then(data=>{state.courses=data;renderCourses()})
  );
  tasks.push(
    safeLoad('course_sessions',sb.from('course_sessions').select('id,course_id,session_number,title,starts_at,duration_minutes,status').order('starts_at',{ascending:true}).limit(500))
      .then(data=>{state.courseSessions=data;renderCourses()})
  );
  tasks.push(
    safeLoad('announcements',sb.from('announcements').select('id,title,message,priority,is_published,published_at,created_at,updated_at,audience,course_id,send_email,send_browser,publish_at,expires_at').order('published_at',{ascending:false}).limit(200))
      .then(data=>{state.news=data;renderNews()})
  );
  await Promise.allSettled(tasks);
}
function safeMentorRender(name,fn){
  try{fn()}
  catch(e){
    console.error('[24K Mentor render]',name,e);
    if(name==='signals'){
      const box=$('#mentorSignals');
      if(box)box.innerHTML='<div class="mentor-signal-empty"><span><i class="fa-solid fa-rotate"></i></span><b>Signals are refreshing</b><small>Please tap refresh once.</small></div>'
    }
  }
}
let mentorRealtimeBound=false;
function subscribeMentorRealtime(){
  if(mentorRealtimeBound||!sb)return;
  mentorRealtimeBound=true;
  const timers={};
  const debounce=(key,fn)=>{clearTimeout(timers[key]);timers[key]=setTimeout(()=>void fn(),220)};
  const refreshSignals=()=>debounce('signals',async()=>{
    if(!state.perms.signals)return;
    state.signals=await safeLoad('signals',sb.from('signals').select('*').order('created_at',{ascending:false}).limit(500));
    safeMentorRender('signals',renderSignals);
    safeMentorRender('performance',renderPerformance)
  });
  const refreshCharts=()=>debounce('charts',async()=>{
    if(!state.perms.charts)return;
    state.charts=await safeLoad('charts',sb.from('charts').select('*').order('created_at',{ascending:false}).limit(500));
    safeMentorRender('charts',renderCharts)
  });
  const refreshArticles=()=>debounce('articles',async()=>{
    if(!state.perms.articles)return;
    state.articles=await safeLoad('articles',sb.from('articles').select('*').order('created_at',{ascending:false}).limit(500));
    safeMentorRender('articles',renderArticles)
  });
  const refreshCourses=()=>debounce('courses',async()=>{
    const pair=await Promise.all([
      safeLoad('courses',sb.from('courses').select('id,title,slug,short_description,description,instructor_name,course_type,price,discount_price,currency,status,access_days,thumbnail_url,is_published,enrollment_open,start_date,end_date,display_order').order('display_order',{ascending:true}).limit(100)),
      safeLoad('course_sessions',sb.from('course_sessions').select('id,course_id,session_number,title,starts_at,duration_minutes,status').order('starts_at',{ascending:true}).limit(500))
    ]);
    state.courses=pair[0];
    state.courseSessions=pair[1];
    safeMentorRender('courses',renderCourses)
  });
  const refreshAnnouncements=()=>debounce('announcements',async()=>{
    state.news=await safeLoad('announcements',sb.from('announcements').select('id,title,message,priority,is_published,published_at,created_at,updated_at,audience,course_id,send_email,send_browser,publish_at,expires_at').order('published_at',{ascending:false}).limit(200));
    safeMentorRender('news',renderNews)
  });
  sb.channel('mentor-live-content')
    .on('postgres_changes',{event:'*',schema:'public',table:'signals'},refreshSignals)
    .on('postgres_changes',{event:'*',schema:'public',table:'signal_updates'},refreshSignals)
    .on('postgres_changes',{event:'*',schema:'public',table:'charts'},refreshCharts)
    .on('postgres_changes',{event:'*',schema:'public',table:'articles'},refreshArticles)
    .on('postgres_changes',{event:'*',schema:'public',table:'courses'},refreshCourses)
    .on('postgres_changes',{event:'*',schema:'public',table:'course_sessions'},refreshCourses)
    .on('postgres_changes',{event:'*',schema:'public',table:'announcements'},refreshAnnouncements)
    .subscribe()
}
async function load(){
  if(!await requireMentor())return;
  revealMentorApp();
  render();
  void loadSecondaryMentorData();
}
function render(){
  const name=state.profile?.full_name||'Mentor';
  const mentorName=$('#mentorName');if(mentorName)mentorName.textContent=name;
  const enabled=Object.entries(state.perms).filter(x=>x[1]&&x[0]!=='banners').map(x=>x[0]==='announcements'?'News':x[0][0].toUpperCase()+x[0].slice(1));
  const access=$('#mentorAccessSummary');if(access)access.textContent=enabled.length?enabled.join(' · '):'Read-only content';
  $$('[data-perm]').forEach(x=>x.classList.toggle('hidden',!state.perms[x.dataset.perm]));
  safeMentorRender('performance',renderPerformance);
  safeMentorRender('signals',renderSignals);
  safeMentorRender('charts',renderCharts);
  safeMentorRender('articles',renderArticles);
  safeMentorRender('courses',renderCourses);
  safeMentorRender('news',renderNews);
  safeMentorRender('settings',renderSettings)
}
function mentorOutcomePips(signal,price,outcome='manual'){
  const p=Number(price),a=Number(signal?.entry_from),b=signal?.entry_to==null||signal?.entry_to===''?a:Number(signal.entry_to);
  if(!Number.isFinite(p)||!Number.isFinite(a)||!Number.isFinite(b))return null;
  const entry=(a+b)/2,pip=mentorPipSize(signal?.symbol),distance=Math.abs(p-entry)/pip;
  if(outcome==='be')return 0;
  if(outcome==='sl')return Math.round(-distance*10)/10;
  if(outcome==='tp')return Math.round(distance*10)/10;
  const dir=String(signal?.direction||'BUY').toUpperCase();
  const result=(dir==='SELL'?entry-p:p-entry)/pip;
  return Math.round(result*10)/10
}
function signalPips(s){
  const st=String(s?.status||'');
  let derived=null;
  if(st==='tp1_hit')derived=mentorOutcomePips(s,s.take_profit_1,'tp');
  else if(st==='tp2_hit')derived=mentorOutcomePips(s,s.take_profit_2,'tp');
  else if(st==='tp3_hit')derived=mentorOutcomePips(s,s.take_profit_3,'tp');
  else if(st==='tp4_hit')derived=mentorOutcomePips(s,s.take_profit_4,'tp');
  else if(st==='sl_hit')derived=mentorOutcomePips(s,s.stop_loss,'sl');
  else if(st==='breakeven_hit')derived=0;
  else if(st==='manually_closed'&&s.close_price!=null)derived=mentorOutcomePips(s,s.close_price,'manual');
  if(derived!==null&&Number.isFinite(Number(derived)))return Number(derived);
  const x=Number(s.result_pips);return Number.isFinite(x)?x:0
}
function mentorSignalPerformanceDate(s){
  const raw=s?.closed_at||s?.last_status_at||s?.updated_at||s?.created_at;
  const d=new Date(raw||0);
  return Number.isNaN(d.getTime())?new Date(0):d
}
function performanceMonthKey(d){
  const x=d instanceof Date?d:new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`
}
function performanceMonthDate(key){
  const [y,m]=String(key||'').split('-').map(Number);
  return new Date(y||new Date().getFullYear(),Math.max(0,(m||1)-1),1)
}
function performanceMonthLabel(key){
  return performanceMonthDate(key).toLocaleDateString(undefined,{month:'long',year:'numeric'})
}
function setPerformanceMonth(key){
  if(!key)return;
  state.performanceMonth=key;
  renderPerformance()
}
function shiftPerformanceMonth(delta){
  const keys=state.performanceMonthKeys||[];
  if(!keys.length)return;
  const current=state.performanceMonth||keys[keys.length-1];
  const index=Math.max(0,keys.indexOf(current));
  const next=Math.min(keys.length-1,Math.max(0,index+delta));
  if(keys[next]!==current)setPerformanceMonth(keys[next])
}
function mentorHasRecordedPerformance(s){
  const st=String(s?.status||'').toLowerCase();
  if(st==='cancelled')return false;
  if(s?.result_pips!==null&&s?.result_pips!==undefined&&s?.result_pips!=='')return true;
  return /^tp[1-4]_hit$/.test(st)||st==='sl_hit'||st==='breakeven_hit'||(st==='manually_closed'&&s?.close_price!=null)
}
function mentorResolvedForPerformance(s){
  return signalIsClosed(s)&&mentorHasRecordedPerformance(s)
}
function renderPerformance(){
  const all=state.signals||[],now=new Date(),currentKey=performanceMonthKey(now);

  // Build a continuous month range from the earliest Mentor signal through the current month.
  const validDates=all.map(mentorSignalPerformanceDate).filter(d=>d.getTime()>0&&d<=now);
  let earliest=validDates.length?new Date(Math.min(...validDates.map(d=>d.getTime()))):new Date(now.getFullYear(),now.getMonth(),1);
  earliest=new Date(earliest.getFullYear(),earliest.getMonth(),1);
  const currentStart=new Date(now.getFullYear(),now.getMonth(),1);
  const keys=[];
  let cursor=new Date(earliest);
  let guard=0;
  while(cursor<=currentStart&&guard<120){
    keys.push(performanceMonthKey(cursor));
    cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
    guard++
  }
  if(!keys.includes(currentKey))keys.push(currentKey);
  state.performanceMonthKeys=keys;
  if(!state.performanceMonth||!keys.includes(state.performanceMonth))state.performanceMonth=currentKey;
  const selectedKey=state.performanceMonth;
  const start=performanceMonthDate(selectedKey),end=new Date(start.getFullYear(),start.getMonth()+1,1);
  const previousStart=new Date(start.getFullYear(),start.getMonth()-1,1),previousEnd=start;
  const monthLabel=performanceMonthLabel(selectedKey);
  const previousLabel=previousStart.toLocaleDateString(undefined,{month:'short'});
  const monthAll=all.filter(s=>{const d=mentorSignalPerformanceDate(s);return d>=start&&d<end});
  const previousAll=all.filter(s=>{const d=mentorSignalPerformanceDate(s);return d>=previousStart&&d<previousEnd});

  // Month selector + navigation state.
  const select=$('#mentorMonthSelect');
  if(select){
    const options=[...keys].reverse().map(k=>`<option value="${k}" ${k===selectedKey?'selected':''}>${esc(performanceMonthLabel(k))}</option>`).join('');
    if(select.innerHTML!==options)select.innerHTML=options;
    select.value=selectedKey;
  }
  const index=keys.indexOf(selectedKey),prevBtn=$('#mentorMonthPrev'),nextBtn=$('#mentorMonthNext'),thisBtn=$('#mentorThisMonth');
  if(prevBtn)prevBtn.disabled=index<=0;
  if(nextBtn)nextBtn.disabled=index>=keys.length-1;
  if(thisBtn)thisBtn.classList.toggle('active',selectedKey===currentKey);
  const range=$('#mentorPeriodRange');
  if(range){
    const lastDay=new Date(end.getTime()-1);
    range.textContent=`${start.toLocaleDateString(undefined,{day:'2-digit',month:'short'})} — ${lastDay.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}`
  }
  const periodTitle=$('#mentorPerformancePeriodTitle');if(periodTitle)periodTitle.textContent=monthLabel;
  const periodSubtitle=$('#mentorPerformancePeriodSubtitle');if(periodSubtitle)periodSubtitle.textContent='Selected month execution, results and market activity.';
  const momentumLabel=$('#mentorMomentumLabel');if(momentumLabel)momentumLabel.textContent=`${monthLabel} · Daily P/L`;
  const executionLabel=$('#mentorExecutionLabel');if(executionLabel)executionLabel.textContent=`${monthLabel} · Closed signals`;
  const marketLabel=$('#mentorMarketFocusLabel');if(marketLabel)marketLabel.textContent=monthLabel;
  const feedLabel=$('#mentorExecutionFeedLabel');if(feedLabel)feedLabel.textContent=`${monthLabel} activity`;

  const recorded=monthAll.filter(mentorHasRecordedPerformance),
    resolved=monthAll.filter(mentorResolvedForPerformance),
    net=recorded.reduce((a,s)=>a+signalPips(s),0),
    green=recorded.reduce((a,s)=>a+Math.max(0,signalPips(s)),0),
    red=recorded.reduce((a,s)=>a+Math.min(0,signalPips(s)),0),
    wins=resolved.filter(s=>signalPips(s)>0).length,
    losses=resolved.filter(s=>signalPips(s)<0).length,
    be=resolved.filter(s=>signalPips(s)===0).length,
    wr=resolved.length?wins/resolved.length*100:0,
    previousRecorded=previousAll.filter(mentorHasRecordedPerformance),
    previousNet=previousRecorded.reduce((a,s)=>a+signalPips(s),0),
    monthDelta=net-previousNet;

  const hero=$('#mentorHeroNetPips');if(hero)hero.textContent=`${net>=0?'+':''}${money(net)} pips`;
  const note=$('#mentorPerformancePeriodNote');if(note)note.textContent=`${monthLabel} net performance`;
  const compare=$('#mentorMonthComparison');
  if(compare){
    compare.textContent=previousRecorded.length?`${monthDelta>=0?'+':''}${money(monthDelta)} pips vs ${previousLabel}`:`No recorded performance in ${previousLabel}`;
    compare.className=monthDelta>0?'good':monthDelta<0?'bad':'neutral'
  }
  const updated=$('#mentorPerformanceUpdated');if(updated)updated.textContent=`Updated ${now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}`;

  const metrics=[
    {label:'MONTHLY NET PIPS',display:`${net>=0?'+':''}${money(net)}`,icon:'fa-chart-line',tone:'primary',hint:monthLabel},
    {label:'WINNING PIPS',display:`+${money(green)}`,icon:'fa-arrow-trend-up',tone:'good',hint:'Positive closed results'},
    {label:'LOSING PIPS',display:money(red),icon:'fa-arrow-trend-down',tone:'bad',hint:'Negative closed results'},
    {label:'WIN RATE',display:`${wr.toFixed(0)}%`,icon:'fa-bullseye',tone:wr>=50?'good':'gold',hint:`${wins} wins · ${losses} losses`},
    {label:'CLOSED SIGNALS',display:String(resolved.length),icon:'fa-circle-check',tone:'gold',hint:`${be} breakeven`}
  ];
  const kpis=$('#mentorPerformanceKpis');
  if(kpis){
    kpis.innerHTML=metrics.map(m=>`<article class="mrzero-metric ${m.tone}"><div class="mrzero-metric-head"><span>${m.label}</span><i class="fa-solid ${m.icon}"></i></div><b>${m.display}</b><small>${esc(m.hint)}</small></article>`).join('');
    kpis.scrollLeft=0;
  }

  const quality=resolved.map(signalPips),
    avg=quality.length?quality.reduce((a,b)=>a+b,0)/quality.length:0,
    best=quality.length?Math.max(...quality):0,
    worst=quality.length?Math.min(...quality):0,
    activeCount=monthAll.filter(s=>!signalIsClosed(s)).length;
  const avgEl=$('#mentorAvgPips'),bestEl=$('#mentorBestPips'),worstEl=$('#mentorWorstPips'),activeEl=$('#mentorActivePerformance');
  if(avgEl)avgEl.textContent=`${avg>=0?'+':''}${money(avg)} pips`;
  if(bestEl)bestEl.textContent=`${best>=0?'+':''}${money(best)} pips`;
  if(worstEl)worstEl.textContent=`${worst>=0?'+':''}${money(worst)} pips`;
  if(activeEl)activeEl.textContent=activeCount;

  // Full selected-month daily P/L momentum.
  const daysInMonth=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();
  const days=[...Array(daysInMonth)].map((_,i)=>{
    const d=new Date(start.getFullYear(),start.getMonth(),i+1),dayEnd=new Date(start.getFullYear(),start.getMonth(),i+2);
    const daySignals=recorded.filter(s=>{const x=mentorSignalPerformanceDate(s);return x>=d&&x<dayEnd});
    const pips=daySignals.reduce((sum,s)=>sum+signalPips(s),0);
    return{d,count:daySignals.length,pips}
  }),maxAbs=Math.max(1,...days.map(x=>Math.abs(x.pips)));
  const momentum=$('#mentorSignalBars');
  if(momentum){
    momentum.style.setProperty('--days',String(daysInMonth));
    momentum.innerHTML=days.map((x,index)=>{
      const tone=x.pips>0?'positive':x.pips<0?'negative':'zero';
      const height=Math.max(3,Math.abs(x.pips)/maxAbs*43);
      const signed=`${x.pips>=0?'+':''}${money(x.pips)} pips`;
      const latest=selectedKey===currentKey&&x.d.getDate()===now.getDate();
      return `<div class="mrzero-momentum-col ${tone} ${latest?'is-latest':''}" style="--i:${index}" title="${esc(signed)} · ${x.count} closed signal${x.count===1?'':'s'}"><i style="height:${height}%"></i><small>${x.d.getDate()}</small></div>`
    }).join('');
    momentum.scrollLeft=0;
  }

  $('#mentorWinRate').innerHTML=`<div class="mrzero-score-ring" style="--pct:${wr.toFixed(1)}"><div><b>${wr.toFixed(0)}%</b><small>WIN RATE</small></div></div><div class="mrzero-win-stats"><div class="mrzero-win-stat"><span>Wins</span><b>${wins}</b></div><div class="mrzero-win-stat"><span>Losses</span><b>${losses}</b></div><div class="mrzero-win-stat"><span>Breakeven</span><b>${be}</b></div><div class="mrzero-win-stat"><span>Resolved</span><b>${resolved.length}</b></div></div>`;

  const pairs={};monthAll.forEach(s=>{const k=mentorDisplaySymbol(s.symbol);pairs[k]=(pairs[k]||0)+1});
  const ps=Object.entries(pairs).sort((a,b)=>b[1]-a[1]).slice(0,3),pmax=Math.max(1,...ps.map(x=>x[1]));
  const totalPairSignals=ps.reduce((sum,[,count])=>sum+count,0)||1;
  $('#mentorTopPairs').innerHTML=ps.length?ps.map(([pair,count],rank)=>{
    const pct=Math.round(count/totalPairSignals*100);
    return `<div class="mrzero-market-row"><b><span class="mrzero-market-rank">0${rank+1}</span>${esc(pair)}</b><div class="mrzero-market-track"><i style="width:${Math.max(8,count/pmax*100)}%"></i></div><small>${pct}% · ${count} signal${count===1?'':'s'}</small></div>`
  }).join(''):`<div class="mentor-empty">No market activity in ${esc(monthLabel)}.</div>`;

  const recent=[...monthAll].sort((a,b)=>mentorSignalPerformanceDate(b)-mentorSignalPerformanceDate(a)).slice(0,3);
  $('#mentorRecentActivity').innerHTML=recent.length?recent.map(s=>{
    const status=signalStatusLabel(s.status),p=signalPips(s),stamp=mentorSignalStamp(s.last_status_at||s.closed_at||s.updated_at||s.created_at);
    const statusKey=String(s.status||'').toLowerCase(),statusTone=/tp\d*_hit|closed|manually_closed/.test(statusKey)?'good':statusKey==='sl_hit'?'bad':/cancelled|breakeven/.test(statusKey)?'neutral':'gold';
    const pipTone=p>0?'good':p<0?'bad':'neutral';
    return `<div class="mrzero-activity-item"><div class="mrzero-activity-icon"><i class="fa-solid ${signalIsClosed(s)?'fa-circle-check':'fa-bolt'}"></i></div><div class="mrzero-activity-copy"><b>${esc(mentorDisplaySymbol(s.symbol))} · ${esc(signalTypeLabel(s))}</b><div class="mrzero-activity-meta"><small>${esc(stamp.date)} · ${esc(stamp.time)}</small>${mentorHasRecordedPerformance(s)?`<span class="mrzero-pips-badge ${pipTone}">${pipText(p)}</span>`:''}</div></div><span class="mrzero-activity-status ${statusTone}">${esc(status)}</span></div>`
  }).join()+`<button type="button" class="mrzero-feed-all" data-mentor-view="signals"><span>View full ${esc(monthLabel)} activity</span><i class="fa-solid fa-arrow-right"></i></button>`:`<div class="mentor-empty">No signal activity in ${esc(monthLabel)}.</div>`
}
function statusChip(v){
  const key=String(v||'active').toLowerCase(),label=signalStatusLabel(key);
  const tone=/^tp[1-4]_hit$|manually_closed|closed/.test(key)?'good':key==='sl_hit'?'bad':key==='breakeven_hit'?'neutral':key==='cancelled'?'muted':key==='pending'?'pending':'live';
  return `<span class="mentor-status-badge ${tone}"><i></i>${esc(label)}</span>`
}
function signalTypeLabel(s){const d=String(s?.direction||'BUY').toUpperCase(),o=String(s?.order_type||'market').toLowerCase();return o==='market'?d:`${d} ${o.toUpperCase()}`}
function signalStatusLabel(v){return String(v||'active').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}
function signalDateOnly(v){const d=new Date(v||0);if(Number.isNaN(d.getTime()))return'';return d.toISOString().slice(0,10)}function mentorDisplaySymbol(v){const s=String(v||'').replace('/','').toUpperCase();return s.length===6?s.slice(0,3)+'/'+s.slice(3):s}function mentorSignalStamp(v){const d=new Date(v||0);if(Number.isNaN(d.getTime()))return{date:'—',time:'—'};return{date:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),time:d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}}
function syncSignalFilterOptions(){const pairs=[...new Set((state.signals||[]).map(x=>String(x.symbol||'').toUpperCase()).filter(Boolean))].sort();for(const id of ['mentorSignalPairFilter','mentorMobileSignalPair']){const el=$('#'+id);if(!el)continue;const current=el.value||'all',allLabel=id==='mentorSignalPairFilter'?'Pair':'All Pairs';el.innerHTML=`<option value="all">${allLabel}</option>`+pairs.map(x=>`<option value="${esc(x)}">${esc(mentorDisplaySymbol(x))}</option>`).join('');el.value=pairs.includes(current)?current:'all'}}
function readSignalFilters(){state.signalFilters.q=String($('#mentorSignalSearch')?.value||'').trim().toLowerCase();state.signalFilters.pair=$('#mentorSignalPairFilter')?.value||'all';state.signalFilters.type=$('#mentorSignalTypeFilter')?.value||'all';state.signalFilters.status=$('#mentorSignalStatusFilter')?.value||'all';state.signalFilters.from=$('#mentorSignalFrom')?.value||'';state.signalFilters.to=$('#mentorSignalTo')?.value||''}
function applySignalFilters(items){const f=state.signalFilters;return items.filter(s=>{const hay=`${s.symbol||''} ${signalTypeLabel(s)} ${s.status||''} ${s.notes||''}`.toLowerCase();if(f.q&&!hay.includes(f.q))return false;if(f.pair!=='all'&&String(s.symbol||'').toUpperCase()!==f.pair)return false;if(f.type!=='all'&&signalTypeLabel(s)!==f.type)return false;if(f.status!=='all'&&String(s.status||'')!==f.status)return false;const d=signalDateOnly(s.created_at||s.published_at);if(f.from&&d&&d<f.from)return false;if(f.to&&d&&d>f.to)return false;return true})}
function signalFilterDateValue(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function syncSignalPeriodButtons(){
  const pair=$('#mentorSignalPairFilter')?.value||'all',
    type=$('#mentorSignalTypeFilter')?.value||'all',
    status=$('#mentorSignalStatusFilter')?.value||'all';
  const extraActive=pair!=='all'||type!=='all'||status!=='all';
  $$('[data-signal-period]').forEach(x=>{
    const key=x.dataset.signalPeriod;
    const active=key==='all'?(state.signalPeriod==='all'&&!extraActive):(key===state.signalPeriod);
    x.classList.toggle('active',active)
  });
  for(const id of ['mentorSignalPairFilter','mentorSignalTypeFilter','mentorSignalStatusFilter']){
    const el=$('#'+id);
    if(el)el.closest('.mentor-signal-quick-select')?.classList.toggle('is-active',el.value!=='all')
  }
}
function focusFilteredSignalResults(){
  requestAnimationFrame(()=>$('#mentorSignals')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function toggleSignalCustomDate(force){
  const panel=$('#mentorSignalCustomDate');if(!panel)return;
  const show=force===undefined?panel.hidden:!!force;
  panel.hidden=!show;
}
function setSignalPeriod(period){
  const now=new Date(),from=$('#mentorSignalFrom'),to=$('#mentorSignalTo');
  state.signalPeriod=period;
  if(period==='custom'){
    syncSignalPeriodButtons();
    toggleSignalCustomDate(true);
    return
  }
  toggleSignalCustomDate(false);
  let start='',end='';
  if(period==='all'){
    for(const id of ['mentorSignalSearch','mentorSignalFrom','mentorSignalTo','mentorMobileSignalFrom','mentorMobileSignalTo']){const el=$('#'+id);if(el)el.value=''}
    for(const id of ['mentorSignalPairFilter','mentorSignalTypeFilter','mentorSignalStatusFilter','mentorMobileSignalPair','mentorMobileSignalType','mentorMobileSignalStatus']){const el=$('#'+id);if(el)el.value='all'}
    state.signalFilters={q:'',pair:'all',type:'all',status:'all',from:'',to:''}
  }
  if(period==='daily'){start=signalFilterDateValue(now);end=start}
  if(period==='weekly'){const d=new Date(now);d.setDate(d.getDate()-6);start=signalFilterDateValue(d);end=signalFilterDateValue(now)}
  if(period==='monthly'){start=signalFilterDateValue(new Date(now.getFullYear(),now.getMonth(),1));end=signalFilterDateValue(now)}
  if(period!=='all'){
    if(from)from.value=start;if(to)to.value=end;
    const mf=$('#mentorMobileSignalFrom'),mt=$('#mentorMobileSignalTo');if(mf)mf.value=start;if(mt)mt.value=end
  }
  syncSignalPeriodButtons();renderSignals();focusFilteredSignalResults()
}

function mentorSafeSignalPips(s){
  try{const v=signalPips(s);return Number.isFinite(Number(v))?Number(v):0}
  catch(e){console.warn('[24K Signal pips]',e);const v=Number(s?.result_pips);return Number.isFinite(v)?v:0}
}
function mentorSafeHasPerformance(s){
  try{return mentorHasRecordedPerformance(s)}
  catch(e){console.warn('[24K Signal performance]',e);return s?.result_pips!==null&&s?.result_pips!==undefined&&s?.result_pips!==''}
}
function signalActionButtons(s){
  if(signalIsClosed(s))return '';
  const hit=Number(s.tp_hit||0),parts=[];
  if(s.take_profit_1!=null&&hit<1)parts.push(`<button class="mentor-btn small" data-signal-action="tp1_hit" data-id="${s.id}">TP1</button>`);
  if(s.take_profit_2!=null&&hit<2)parts.push(`<button class="mentor-btn small" data-signal-action="tp2_hit" data-id="${s.id}">TP2</button>`);
  if(s.take_profit_3!=null&&hit<3)parts.push(`<button class="mentor-btn small" data-signal-action="tp3_hit" data-id="${s.id}">TP3</button>`);
  if(s.take_profit_4!=null&&hit<4)parts.push(`<button class="mentor-btn small" data-signal-action="tp4_hit" data-id="${s.id}">TP4</button>`);
  if(!s.be_moved)parts.push(`<button class="mentor-btn small" data-signal-action="move_to_be" data-id="${s.id}">Move BE</button>`);
  parts.push(`<button class="mentor-btn small" data-signal-action="breakeven_hit" data-id="${s.id}">BE</button>`,`<button class="mentor-btn small danger" data-signal-action="sl_hit" data-id="${s.id}">SL</button>`,`<button class="mentor-btn small" data-signal-action="manually_closed" data-id="${s.id}">Close</button>`,`<button class="mentor-btn small danger" data-signal-action="cancelled" data-id="${s.id}">Cancel</button>`);
  return parts.join('')
}
function renderSignalDetail(id){
  const s=(state.signals||[]).find(x=>String(x.id)===String(id)),box=$('#mentorSignalDetailContent');if(!s||!box)return;
  const p=mentorSafeSignalPips(s),hasPips=mentorSafeHasPerformance(s),current=hasPips?pipText(p):'—';
  const pTone=p>0?'good':p<0?'bad':'neutral';
  const dir=String(s.direction||'BUY').toLowerCase(),isClosed=signalIsClosed(s);
  const created=mentorSignalStamp(s.created_at||s.published_at),updated=mentorSignalStamp(s.last_status_at||s.closed_at||s.updated_at||s.created_at);
  const level=(label,value,tone='',icon='')=>`<div class="mentor-manage-level ${tone}"><span>${icon?`<i class="fa-solid ${icon}"></i>`:''}<small>${label}</small></span><b>${esc(value??'—')}</b></div>`;

  const tpActions=[
    s.take_profit_1!=null&&Number(s.tp_hit||0)<1?`<button class="mentor-manage-action tp" data-signal-action="tp1_hit" data-id="${s.id}"><i class="fa-solid fa-check"></i><span>TP1 Hit</span></button>`:'',
    s.take_profit_2!=null&&Number(s.tp_hit||0)<2?`<button class="mentor-manage-action tp" data-signal-action="tp2_hit" data-id="${s.id}"><i class="fa-solid fa-check"></i><span>TP2 Hit</span></button>`:'',
    s.take_profit_3!=null&&Number(s.tp_hit||0)<3?`<button class="mentor-manage-action tp" data-signal-action="tp3_hit" data-id="${s.id}"><i class="fa-solid fa-check"></i><span>TP3 Hit</span></button>`:'',
    s.take_profit_4!=null&&Number(s.tp_hit||0)<4?`<button class="mentor-manage-action tp" data-signal-action="tp4_hit" data-id="${s.id}"><i class="fa-solid fa-check"></i><span>TP4 Hit</span></button>`:''
  ].filter(Boolean).join('');

  const protectionActions=!isClosed?[
    !s.be_moved?`<button class="mentor-manage-action be" data-signal-action="move_to_be" data-id="${s.id}"><i class="fa-solid fa-shield-halved"></i><span>SL → BE</span></button>`:'',
    `<button class="mentor-manage-action be-hit" data-signal-action="breakeven_hit" data-id="${s.id}"><i class="fa-solid fa-scale-balanced"></i><span>BE Hit</span></button>`,
    `<button class="mentor-manage-action edit" data-edit-signal="${s.id}"><i class="fa-solid fa-pen"></i><span>Edit</span></button>`
  ].filter(Boolean).join(''):`<button class="mentor-manage-action edit wide" data-edit-signal="${s.id}"><i class="fa-solid fa-pen"></i><span>Edit Signal</span></button>`;

  const closeActions=!isClosed?[
    `<button class="mentor-manage-action close" data-signal-action="manually_closed" data-id="${s.id}"><i class="fa-solid fa-flag-checkered"></i><span>Close</span></button>`,
    `<button class="mentor-manage-action sl" data-signal-action="sl_hit" data-id="${s.id}"><i class="fa-solid fa-shield"></i><span>SL Hit</span></button>`,
    `<button class="mentor-manage-action cancel" data-signal-action="cancelled" data-id="${s.id}"><i class="fa-solid fa-ban"></i><span>Cancel</span></button>`
  ].join(''):'';

  box.innerHTML=`<section class="mentor-manage-signal premium">
    <div class="mentor-manage-hero ${dir}">
      <div class="mentor-manage-hero-main">
        <span class="mentor-manage-pair-icon ${dir}"><i class="fa-solid ${dir==='sell'?'fa-arrow-trend-down':'fa-arrow-trend-up'}"></i></span>
        <div>
          <small>TRADE SIGNAL</small>
          <h3>${esc(mentorDisplaySymbol(s.symbol))}</h3>
          <div class="mentor-manage-badges"><span class="mentor-type-badge ${dir}">${esc(signalTypeLabel(s))}</span>${statusChip(s.status)}</div>
        </div>
      </div>
      <div class="mentor-manage-hero-result ${pTone}">
        <small>${isClosed?'OFFICIAL RESULT':'RUNNING / RECORDED'}</small>
        <b>${current}</b>
        <span>${isClosed?'Final signal outcome':'Current recorded performance'}</span>
      </div>
      <div class="mentor-manage-timeline">
        <span><i class="fa-regular fa-clock"></i><small>Created</small><b>${esc(created.date)} · ${esc(created.time)}</b></span>
        <span><i class="fa-solid fa-rotate"></i><small>Last update</small><b>${esc(updated.date)} · ${esc(updated.time)}</b></span>
      </div>
    </div>

    <div class="mentor-manage-section">
      <div class="mentor-manage-section-head"><div><span class="num">01</span><div><small>TRADE LEVELS</small><b>Entry & Targets</b></div></div><span>Execution map</span></div>
      <div class="mentor-manage-levels premium-levels">
        ${level('Entry',s.entry_from,'entry','fa-location-crosshairs')}
        ${level('Stop Loss',s.stop_loss,'sl','fa-shield-halved')}
        ${level('TP1',s.take_profit_1,'tp','fa-bullseye')}
        ${level('TP2',s.take_profit_2,'tp','fa-bullseye')}
        ${level('TP3',s.take_profit_3,'tp','fa-bullseye')}
        ${level('TP4',s.take_profit_4,'tp','fa-bullseye')}
      </div>
    </div>

    ${!isClosed&&tpActions?`<div class="mentor-manage-action-group">
      <div class="mentor-manage-section-head compact"><div><span class="num">02</span><div><small>PROFIT MANAGEMENT</small><b>Take Profit Actions</b></div></div></div>
      <div class="mentor-manage-actions tp-group">${tpActions}</div>
    </div>`:''}

    <div class="mentor-manage-action-group">
      <div class="mentor-manage-section-head compact"><div><span class="num">${!isClosed&&tpActions?'03':'02'}</span><div><small>RISK CONTROL</small><b>${isClosed?'Signal Controls':'Protection & Adjustment'}</b></div></div></div>
      <div class="mentor-manage-actions protection-group">${protectionActions}</div>
    </div>

    ${closeActions?`<div class="mentor-manage-action-group danger-zone">
      <div class="mentor-manage-section-head compact"><div><span class="num">04</span><div><small>FINAL OUTCOME</small><b>Close Signal</b></div></div><span>Use carefully</span></div>
      <div class="mentor-manage-actions close-group">${closeActions}</div>
    </div>`:''}

    <div class="mentor-manage-note-result">
      <div class="mentor-signal-note premium-note">
        <div class="mentor-note-head"><span><i class="fa-regular fa-note-sticky"></i></span><div><small>SIGNAL NOTE</small><b>Trade Guidance</b></div></div>
        <p>${s.notes?esc(s.notes):'No note added for this signal.'}</p>
      </div>
      <div class="mentor-running-pips premium-result ${pTone}">
        <div class="mentor-result-head"><span><i class="fa-solid fa-chart-line"></i></span><div><small>RUNNING / RESULT PIPS</small><b>${current}</b></div></div>
        <p>${isClosed?'Official result recorded for this signal.':'Use the management actions above to record the official result.'}</p>
      </div>
    </div>
  </section>`;
  openModal('signalDetail')
}
function renderSignals(){
  const box=$('#mentorSignals');if(!box)return;
  syncSignalFilterOptions();readSignalFilters();
  const all=state.signals||[],filteredAll=applySignalFilters(all),active=filteredAll.filter(s=>!signalIsClosed(s)),hist=filteredAll.filter(signalIsClosed);
  const ac=$('#mentorActiveSignalCount'),hc=$('#mentorHistorySignalCount'),
    hac=$('#mentorHeaderActiveSignalCount'),hhc=$('#mentorHeaderHistorySignalCount');
  if(ac)ac.textContent=String(active.length);if(hc)hc.textContent=String(hist.length);
  if(hac)hac.textContent=String(active.length);if(hhc)hhc.textContent=String(hist.length);
  syncSignalPeriodButtons();

  const scored=hist.filter(s=>String(s.status||'')!=='cancelled'&&mentorSafeHasPerformance(s)),
    wins=scored.filter(s=>mentorSafeSignalPips(s)>0).length,
    losses=scored.filter(s=>mentorSafeSignalPips(s)<0).length,
    winRate=scored.length?wins/scored.length*100:0,
    net=filteredAll.filter(mentorSafeHasPerformance).reduce((a,s)=>a+mentorSafeSignalPips(s),0);
  const statActive=$('#mentorSignalStatActive'),statClosed=$('#mentorSignalStatClosed'),statWin=$('#mentorSignalStatWinRate'),statNet=$('#mentorSignalStatNet');
  if(statActive)statActive.textContent=String(active.length);
  if(statClosed)statClosed.textContent=String(hist.length);
  if(statWin)statWin.textContent=`${winRate.toFixed(0)}%`;
  if(statNet){statNet.textContent=`${net>=0?'+':''}${money(net)}`;statNet.className=net>0?'good':net<0?'bad':''}

  let items=state.signalTab==='history'?hist:active;
  const meta=$('#mentorSignalViewMeta');
  if(meta)meta.textContent=state.signalTab==='history'?`${items.length} history record${items.length===1?'':'s'} shown`:state.signalTab==='report'?'Performance summary':`${items.length} active / pending signal${items.length===1?'':'s'} shown`;

  $('#mentorSignalReport')?.classList.toggle('hidden',state.signalTab!=='report');
  box.classList.toggle('hidden',state.signalTab==='report');

  if(state.signalTab==='report'){
    const be=scored.filter(s=>mentorSafeSignalPips(s)===0).length;
    const avg=scored.length?scored.reduce((a,s)=>a+mentorSafeSignalPips(s),0)/scored.length:0;
    const report=[
      {label:'FILTERED SIGNALS',value:filteredAll.length,icon:'fa-layer-group',tone:'gold',hint:state.signalPeriod==='all'?'All published records':state.signalPeriod+' period'},
      {label:'RESOLVED',value:scored.length,icon:'fa-circle-check',tone:'neutral',hint:`${wins} wins - ${losses} losses - ${be} BE`},
      {label:'WIN RATE',value:`${winRate.toFixed(0)}%`,icon:'fa-bullseye',tone:'good',hint:'Resolved outcomes'},
      {label:'NET PIPS',value:`${net>=0?'+':''}${money(net)}`,icon:'fa-chart-line',tone:net>=0?'good':'bad',hint:`Avg ${avg>=0?'+':''}${money(avg)} pips`}
    ];
    $('#mentorSignalReport').innerHTML=report.map(r=>`<article class="mentor-signal-report-card ${r.tone}"><span><i class="fa-solid ${r.icon}"></i></span><div><small>${r.label}</small><b>${r.value}</b><em>${esc(r.hint)}</em></div></article>`).join('');
    return
  }

  if(!items.length){
    box.innerHTML=`<div class="mentor-signal-empty"><span><i class="fa-solid fa-wave-square"></i></span><b>No signals found</b><small>No records match the current filters.</small>${state.signalTab==='active'?'<button class="mentor-btn gold" data-open-mentor-modal="signal"><i class="fa-solid fa-plus"></i> Create Signal</button>':''}</div>`;
    return
  }

  const desktop=`<div class="mentor-signal-table-wrap"><table class="mentor-signal-table mentor-official-table"><thead><tr><th>Date</th><th>Pair</th><th>Type</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>TP4</th><th>Status</th><th>Pips</th><th>Note</th><th>Manage</th></tr></thead><tbody>${items.map(s=>{
    const p=mentorSafeSignalPips(s),hasPips=mentorSafeHasPerformance(s),dir=String(s.direction||'BUY').toLowerCase(),stamp=mentorSignalStamp(s.created_at||s.published_at);
    return `<tr class="mentor-signal-row ${dir}">
      <td><b>${esc(stamp.date)}</b><small class="mentor-table-time">${esc(stamp.time)}</small></td>
      <td><b class="mentor-signal-pair">${esc(mentorDisplaySymbol(s.symbol))}</b></td>
      <td><span class="mentor-type-badge ${dir}">${esc(signalTypeLabel(s))}</span></td>
      <td><b class="mentor-entry-value">${esc(s.entry_from??'-')}${s.entry_to!=null?`-${esc(s.entry_to)}`:''}</b></td>
      <td class="signal-sl">${esc(s.stop_loss??'-')}</td>
      <td class="signal-tp">${esc(s.take_profit_1??'-')}</td><td class="signal-tp">${esc(s.take_profit_2??'-')}</td><td class="signal-tp">${esc(s.take_profit_3??'-')}</td><td class="signal-tp">${esc(s.take_profit_4??'-')}</td>
      <td>${statusChip(s.status)}</td>
      <td><span class="mentor-pips-chip ${p>0?'good':p<0?'bad':'neutral'}">${hasPips?pipText(p):'-'}</span></td>
      <td><button type="button" class="mentor-note-btn" data-note-signal="${s.id}" title="${esc(s.notes||'No note')}"><i class="fa-regular fa-note-sticky"></i><span>Note</span></button></td>
      <td><div class="mentor-manage-buttons"><button type="button" data-copy-signal="${s.id}" title="Copy signal"><i class="fa-regular fa-copy"></i></button><button type="button" class="gold" data-view-signal="${s.id}">${signalIsClosed(s)?'View':'Manage'}</button></div></td>
    </tr>`
  }).join('')}</tbody></table></div>`;

  const mobile=`<div class="mentor-signal-mobile-list">${items.map(s=>{
    const p=mentorSafeSignalPips(s),hasPips=mentorSafeHasPerformance(s),dir=String(s.direction||'BUY').toLowerCase(),stamp=mentorSignalStamp(s.created_at||s.published_at);
    const resultText=hasPips?pipText(p):(signalIsClosed(s)?'-':'LIVE');
    return `<article class="mentor-signal-mobile-card ${dir}" data-signal-row="${s.id}">
      <div class="mentor-signal-row-line">
        <button type="button" class="mentor-signal-row-toggle" data-toggle-signal-row="${s.id}" aria-expanded="false">
          <span class="mentor-signal-icon mini ${dir}"><i class="fa-solid ${dir==='sell'?'fa-arrow-trend-down':'fa-arrow-trend-up'}"></i></span>
          <span class="mentor-signal-row-main"><b>${esc(mentorDisplaySymbol(s.symbol))}</b><small>${esc(stamp.date)} · ${esc(stamp.time)}</small></span>
          <span class="mentor-signal-row-type"><span class="mentor-type-badge ${dir}">${esc(signalTypeLabel(s))}</span></span>
          <span class="mentor-signal-row-entry"><small>ENTRY</small><b>${esc(s.entry_from??'-')}</b></span>
          <span class="mentor-signal-row-pips"><small>PIPS</small><b class="${p>0?'green':p<0?'red':''}">${resultText}</b></span>
          <i class="fa-solid fa-chevron-down mentor-signal-row-chevron"></i>
        </button>
        <button type="button" class="mentor-signal-inline-manage" data-view-signal="${s.id}">${signalIsClosed(s)?'View':'Manage'}</button>
      </div>
      <div class="mentor-signal-row-dropdown" aria-hidden="true">
        <div class="mentor-signal-row-meta">
          <span>${statusChip(s.status)}</span>
          <span><small>SL</small><b class="red">${esc(s.stop_loss??'-')}</b></span>
        </div>
        <div class="mentor-signal-row-levels">
          <span><small>TP1</small><b class="green">${esc(s.take_profit_1??'-')}</b></span>
          <span><small>TP2</small><b class="green">${esc(s.take_profit_2??'-')}</b></span>
          <span><small>TP3</small><b class="green">${esc(s.take_profit_3??'-')}</b></span>
          <span><small>TP4</small><b class="green">${esc(s.take_profit_4??'-')}</b></span>
        </div>
        <div class="mentor-signal-row-bottom">
          <span>${s.notes?'<i class="fa-regular fa-note-sticky"></i> Note added':'<i class="fa-solid fa-shield-halved"></i> 24K signal'}</span>
          <button type="button" class="mentor-row-copy" data-copy-signal="${s.id}"><i class="fa-regular fa-copy"></i> Copy</button>
        </div>
      </div>
    </article>`
  }).join('')}</div>`;

  box.innerHTML=desktop+mobile
}

function mentorChartDate(x){
  const d=new Date(x?.published_at||x?.created_at||0);
  return Number.isNaN(d.getTime())?new Date(0):d
}
function syncChartControls(){
  $$('[data-chart-period]').forEach(x=>x.classList.toggle('active',x.dataset.chartPeriod===state.chartPeriod));
  const pair=$('#mentorChartPair'),sort=$('#mentorChartSort');
  pair?.closest('.mentor-chart-select')?.classList.toggle('is-active',Boolean(pair&&pair.value!=='all'));
  sort?.closest('.mentor-chart-select')?.classList.toggle('is-active',Boolean(sort&&sort.value==='old'))
}
function setChartPeriod(period){
  state.chartPeriod=period||'all';
  syncChartControls();
  renderCharts();
  requestAnimationFrame(()=>$('#mentorCharts')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function clearChartFilters(){
  state.chartPeriod='all';
  const q=$('#mentorChartSearch'),pair=$('#mentorChartPair'),sort=$('#mentorChartSort');
  if(q)q.value='';if(pair)pair.value='all';if(sort)sort.value='new';
  syncChartControls();renderCharts()
}
async function shareChart(id){
  const x=(state.charts||[]).find(v=>String(v.id)===String(id));if(!x)return;
  const text=`${x.title||'24K Chart Analysis'} · ${mentorDisplaySymbol(x.symbol||'')}${x.timeframe?' · '+x.timeframe:''}`;
  const url=x.image_url||location.href;
  if(navigator.share){await navigator.share({title:x.title||'24K Chart Analysis',text,url});return}
  await navigator.clipboard?.writeText(`${text}\n${url}`);
  toast('Chart link copied.')
}
function openMentorChartViewer(id){
  const x=(state.charts||[]).find(v=>String(v.id)===String(id));if(!x||!x.image_url)return;
  const modal=$('#mentorChartViewerModal'),img=$('#mentorChartViewerImage'),title=$('#mentorChartViewerTitle'),meta=$('#mentorChartViewerMeta');
  if(!modal||!img)return;
  img.src=x.image_url;
  img.alt=x.title||mentorDisplaySymbol(x.symbol||'Chart');
  if(title)title.textContent=x.title||'Chart Analysis';
  if(meta)meta.textContent=[mentorDisplaySymbol(x.symbol||''),x.timeframe||'',x.category||'Market Analysis'].filter(Boolean).join(' · ');
  openModal('chartViewer')
}
function mentorContentDayKey(v){
  const d=new Date(v||0);if(Number.isNaN(d.getTime()))return'unknown';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function mentorContentDayLabel(v){
  const d=new Date(v||0),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
  if(d>=today)return'Today';
  if(d>=yesterday)return'Yesterday';
  return d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})
}
function renderCharts(){
  const box=$('#mentorCharts');if(!box)return;
  const all=[...(state.charts||[])],now=new Date(),desktop=window.innerWidth>900;

  const pairs=[...new Set(all.map(x=>String(x.symbol||'').toUpperCase()).filter(Boolean))].sort();
  const pairSelect=$('#mentorChartPair');
  if(pairSelect){
    const current=pairSelect.value||'all';
    pairSelect.innerHTML=`<option value="all">${desktop?'All Pairs':'Pair'}</option>`+pairs.map(x=>`<option value="${esc(x)}">${esc(mentorDisplaySymbol(x))}</option>`).join('');
    pairSelect.value=pairs.includes(current)?current:'all'
  }

  const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const startWeek=new Date(startToday);startWeek.setDate(startWeek.getDate()-6);
  const todayCount=all.filter(x=>mentorChartDate(x)>=startToday).length;
  const weekCount=all.filter(x=>mentorChartDate(x)>=startWeek).length;
  const pairCounts={};all.forEach(x=>{const k=mentorDisplaySymbol(x.symbol||'');if(k)pairCounts[k]=(pairCounts[k]||0)+1});
  const topPair=Object.entries(pairCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';

  for(const [id,value] of [
    ['mentorChartStatTotal',all.length],['mentorChartStatWeek',weekCount],['mentorChartStatToday',todayCount],['mentorChartStatPair',topPair],
    ['mentorChartAdminStatTotal',all.length],['mentorChartAdminStatWeek',weekCount],['mentorChartAdminStatToday',todayCount],['mentorChartAdminStatPair',topPair]
  ]){const el=$('#'+id);if(el)el.textContent=String(value)}

  let items=[...all];
  const q=String($('#mentorChartSearch')?.value||'').trim().toLowerCase();
  const pair=pairSelect?.value||'all';
  const sortSelect=$('#mentorChartSort'),sort=sortSelect?.value||'new';
  if(sortSelect){
    const n=sortSelect.querySelector('option[value="new"]'),o=sortSelect.querySelector('option[value="old"]');
    if(n)n.textContent=desktop?'Newest First':'Newest';
    if(o)o.textContent=desktop?'Oldest First':'Oldest'
  }
  const searchInput=$('#mentorChartSearch');
  if(searchInput)searchInput.placeholder=desktop?'Search chart analysis...':'Search chart, pair or summary...';

  /* Admin desktop uses only Search + Pair + Sort. Keep Mentor mobile periods untouched. */
  if(!desktop){
    if(state.chartPeriod==='today')items=items.filter(x=>mentorChartDate(x)>=startToday);
    if(state.chartPeriod==='weekly')items=items.filter(x=>mentorChartDate(x)>=startWeek);
    if(state.chartPeriod==='monthly'){
      const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
      items=items.filter(x=>mentorChartDate(x)>=monthStart)
    }
  }
  if(q)items=items.filter(x=>`${x.title||''} ${x.symbol||''} ${x.timeframe||''} ${x.summary||''} ${x.details||''}`.toLowerCase().includes(q));
  if(pair!=='all')items=items.filter(x=>String(x.symbol||'').toUpperCase()===pair);
  items.sort((a,b)=>(mentorChartDate(a)-mentorChartDate(b))*(sort==='old'?1:-1));

  syncChartControls();
  const periodName=desktop?'All Analysis':({all:'All Analysis',today:"Today's Analysis",weekly:'This Week',monthly:'This Month'}[state.chartPeriod]||'All Analysis');
  const resultTitle=$('#mentorChartResultTitle'),resultCount=$('#mentorChartResultCount');
  if(resultTitle)resultTitle.textContent=pair!=='all'?`${mentorDisplaySymbol(pair)} · ${periodName}`:periodName;
  if(resultCount)resultCount.textContent=`${items.length} result${items.length===1?'':'s'}`;
  box.classList.toggle('mentor-full-empty',desktop&&items.length===0);

  if(!items.length){
    if(desktop){
      box.innerHTML='<div class="mentor-chart-admin-empty"><i class="fa-solid fa-chart-line"></i><h3>No chart analysis found</h3><p>Change the filters or publish a new analysis.</p></div>';
    }else{
      const noLibrary=all.length===0;
      box.innerHTML=`<div class="mentor-chart-empty">
        <span class="mentor-chart-empty-icon"><i class="fa-solid ${noLibrary?'fa-chart-line':'fa-magnifying-glass'}"></i></span>
        <small>${noLibrary?'RESEARCH DESK READY':'NO MATCHING ANALYSIS'}</small>
        <b>${noLibrary?'Publish your first chart analysis':'No charts match these filters'}</b>
        <p>${noLibrary?'Build your research library with a clear chart, timeframe and market view.':'Change the period, pair or search to see more analysis.'}</p>
        <button type="button" class="mentor-btn gold" ${noLibrary?'data-open-mentor-modal="chart"':'data-clear-chart-filters'}><i class="fa-solid ${noLibrary?'fa-plus':'fa-arrow-rotate-left'}"></i> ${noLibrary?'Create First Analysis':'Clear Filters'}</button>
      </div>`;
    }
    return
  }

  let lastChartDay='';
  if(desktop){
    box.innerHTML=items.map((x,index)=>{
      const rawDate=x.published_at||x.created_at,stamp=mentorSignalStamp(rawDate),symbol=String(x.symbol||'CHART').toUpperCase(),dayKey=mentorContentDayKey(rawDate),live=Boolean(x.is_published);
      const groupHead=dayKey!==lastChartDay?`<div class="admin-content-date-group"><div><span>${esc(mentorContentDayLabel(rawDate))}</span><small>${esc(stamp.date)}</small></div><i></i></div>`:'';
      lastChartDay=dayKey;
      return groupHead+`<article class="admin-mentor-content-card ${index%2?'cream':'white'}">
        <div class="admin-mentor-media">
          ${x.image_url?`<img src="${esc(x.image_url)}" alt="${esc(x.title||symbol)}" loading="lazy">`:`<div class="admin-mentor-placeholder"><i class="fa-solid fa-chart-line"></i><span>24K RESEARCH</span></div>`}
          <div class="admin-mentor-media-top"><span class="gold">${esc(symbol)}</span>${x.timeframe?`<span>${esc(x.timeframe)}</span>`:''}<span class="${live?'live':'draft'}">${live?'Published':'Draft'}</span></div>
          <span class="admin-mentor-index">${String(index+1).padStart(2,'0')}</span>
        </div>
        <div class="admin-mentor-card-body">
          <div class="admin-mentor-card-meta"><span><i class="fa-regular fa-calendar"></i> ${esc(stamp.date)}</span><span><i class="fa-regular fa-clock"></i> ${esc(stamp.time)}</span></div>
          <h3>${esc(x.title||symbol+' Analysis')}</h3>
          <p>${esc(x.summary||'Market analysis update.')}</p>
          <div class="admin-mentor-card-foot">
            <span class="admin-mentor-state ${live?'live':'draft'}"><i class="fa-solid ${live?'fa-circle-check':'fa-pen'}"></i> ${live?'Live':'Draft'}</span>
            <div class="admin-mentor-actions">
              ${x.image_url?`<button type="button" data-view-chart="${x.id}" title="View chart"><i class="fa-solid fa-expand"></i><span>View</span></button>`:''}
              <button type="button" data-edit-chart="${x.id}"><i class="fa-solid fa-pen"></i><span>Edit</span></button>
              <button type="button" class="danger" data-delete-chart="${x.id}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          </div>
        </div>
      </article>`
    }).join('');
    return
  }

  box.innerHTML=`<div class="mentor-chart-grid">${items.map((x,index)=>{
    const rawDate=x.published_at||x.created_at,stamp=mentorSignalStamp(rawDate),symbol=mentorDisplaySymbol(x.symbol||'CHART');
    return `<article class="mentor-chart-card ${index%2?'cream':'white'}">
      <div class="mentor-chart-media">
        ${x.image_url?`<img src="${esc(x.image_url)}" alt="${esc(x.title||symbol)}" loading="lazy">`:`<div class="mentor-chart-placeholder"><i class="fa-solid fa-chart-line"></i><span>24K RESEARCH</span></div>`}
        <div class="mentor-chart-media-top"><span class="pair">${esc(symbol)}</span>${x.timeframe?`<span class="tf">${esc(x.timeframe)}</span>`:''}</div>
        <span class="mentor-chart-index">${String(index+1).padStart(2,'0')}</span>
      </div>
      <div class="mentor-chart-card-body">
        <div class="mentor-chart-card-meta"><span><i class="fa-regular fa-calendar"></i> ${esc(stamp.date)}</span><span><i class="fa-regular fa-clock"></i> ${esc(stamp.time)}</span></div>
        <h3>${esc(x.title||symbol+' Analysis')}</h3>
        <p>${esc(x.summary||'Market analysis update.')}</p>
        <div class="mentor-chart-card-foot">
          <span class="mentor-chart-publish"><i class="fa-solid fa-circle-check"></i> Published</span>
          <div class="mentor-chart-actions">
            ${x.image_url?`<button type="button" data-view-chart="${x.id}" title="View chart"><i class="fa-solid fa-expand"></i><span>View</span></button>`:''}
            <button type="button" data-share-chart="${x.id}" title="Share"><i class="fa-solid fa-share-nodes"></i><span>Share</span></button>
            <button type="button" data-edit-chart="${x.id}" title="Edit"><i class="fa-solid fa-pen"></i><span>Edit</span></button>
            <button type="button" class="danger" data-delete-chart="${x.id}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    </article>`
  }).join('')}</div>`
}
function mentorArticleDate(x){
  const d=new Date(x?.published_at||x?.created_at||0);
  return Number.isNaN(d.getTime())?new Date(0):d
}
function syncArticleControls(){
  $$('[data-article-period]').forEach(x=>x.classList.toggle('active',x.dataset.articlePeriod===state.articlePeriod));
  for(const id of ['mentorArticleCategory','mentorArticleStatus','mentorArticleSort']){
    const el=$('#'+id);
    if(!el)continue;
    const active=id==='mentorArticleCategory'?el.value!=='all':id==='mentorArticleStatus'?el.value!=='all':el.value==='old';
    el.closest('.mentor-article-select')?.classList.toggle('is-active',active)
  }
}
function setArticlePeriod(period){
  state.articlePeriod=period||'all';
  syncArticleControls();
  renderArticles();
  requestAnimationFrame(()=>$('#mentorArticles')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function clearArticleFilters(){
  state.articlePeriod='all';
  const q=$('#mentorArticleSearch'),cat=$('#mentorArticleCategory'),st=$('#mentorArticleStatus'),sort=$('#mentorArticleSort');
  if(q)q.value='';if(cat)cat.value='all';if(st)st.value='all';if(sort)sort.value='new';
  syncArticleControls();renderArticles()
}
function renderArticles(){
  const box=$('#mentorArticles');if(!box)return;
  const all=[...(state.articles||[])],now=new Date(),desktop=window.innerWidth>900;

  const cats=[...new Set(all.map(x=>String(x.category||'General')).filter(Boolean))].sort();
  const catSelect=$('#mentorArticleCategory');
  if(catSelect){
    const current=catSelect.value||'all';
    catSelect.innerHTML=`<option value="all">${desktop?'All Categories':'Category'}</option>`+cats.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    catSelect.value=cats.includes(current)?current:'all'
  }

  const statusSelect=$('#mentorArticleStatus');
  if(statusSelect){
    const current=statusSelect.value||'all';
    const first=statusSelect.querySelector('option[value="all"]');if(first)first.textContent=desktop?'All Status':'Status';
    statusSelect.value=current
  }
  const sortSelect=$('#mentorArticleSort');
  if(sortSelect){
    const current=sortSelect.value||'new',n=sortSelect.querySelector('option[value="new"]'),o=sortSelect.querySelector('option[value="old"]');
    if(n)n.textContent=desktop?'Newest First':'Newest';
    if(o)o.textContent=desktop?'Oldest First':'Oldest';
    sortSelect.value=current
  }
  const searchInput=$('#mentorArticleSearch');
  if(searchInput)searchInput.placeholder=desktop?'Search articles...':'Search title, category or content...';

  const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const startWeek=new Date(startToday);startWeek.setDate(startWeek.getDate()-6);
  const total=all.length,published=all.filter(x=>Boolean(x.is_published)).length,drafts=total-published,week=all.filter(x=>mentorArticleDate(x)>=startWeek).length;

  for(const [id,value] of [
    ['mentorArticleStatTotal',total],['mentorArticleStatPublished',published],['mentorArticleStatDrafts',drafts],['mentorArticleStatWeek',week],
    ['mentorArticleAdminStatTotal',total],['mentorArticleAdminStatPublished',published],['mentorArticleAdminStatDrafts',drafts],['mentorArticleAdminStatWeek',week]
  ]){const el=$('#'+id);if(el)el.textContent=String(value)}

  let items=[...all];
  const q=String(searchInput?.value||'').trim().toLowerCase();
  const cat=catSelect?.value||'all';
  const st=statusSelect?.value||'all';
  const sort=sortSelect?.value||'new';

  /* Admin desktop uses Search + Category + Status + Sort only. Mobile keeps period filters. */
  if(!desktop){
    if(state.articlePeriod==='today')items=items.filter(x=>mentorArticleDate(x)>=startToday);
    if(state.articlePeriod==='weekly')items=items.filter(x=>mentorArticleDate(x)>=startWeek);
    if(state.articlePeriod==='monthly'){
      const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
      items=items.filter(x=>mentorArticleDate(x)>=monthStart)
    }
  }
  if(q)items=items.filter(x=>`${x.title||''} ${x.category||''} ${x.excerpt||''} ${x.content||''} ${x.content_roman||''}`.toLowerCase().includes(q));
  if(cat!=='all')items=items.filter(x=>String(x.category||'General')===cat);
  if(st==='published')items=items.filter(x=>Boolean(x.is_published));
  if(st==='draft')items=items.filter(x=>!x.is_published);
  items.sort((a,b)=>(mentorArticleDate(a)-mentorArticleDate(b))*(sort==='old'?1:-1));

  syncArticleControls();
  const periodName=desktop?'All Articles':({all:'All Articles',today:"Today's Articles",weekly:'This Week',monthly:'This Month'}[state.articlePeriod]||'All Articles');
  const resultTitle=$('#mentorArticleResultTitle'),resultCount=$('#mentorArticleResultCount');
  if(resultTitle)resultTitle.textContent=cat!=='all'?`${cat} · ${periodName}`:periodName;
  if(resultCount)resultCount.textContent=`${items.length} result${items.length===1?'':'s'}`;
  box.classList.toggle('mentor-full-empty',desktop&&items.length===0);

  if(!items.length){
    if(desktop){
      box.innerHTML='<div class="mentor-article-admin-empty"><i class="fa-solid fa-newspaper"></i><h3>No articles found</h3><p>Change the filters or create a new article.</p></div>';
    }else{
      const noLibrary=all.length===0;
      box.innerHTML=`<div class="mentor-article-empty">
        <span class="mentor-article-empty-icon"><i class="fa-solid ${noLibrary?'fa-pen-nib':'fa-magnifying-glass'}"></i></span>
        <small>${noLibrary?'EDITORIAL DESK READY':'NO MATCHING ARTICLES'}</small>
        <b>${noLibrary?'Write your first premium article':'No articles match these filters'}</b>
        <p>${noLibrary?'Build your editorial library with educational research, strategy notes and market insight.':'Change the period, category, status or search to see more content.'}</p>
        <button type="button" class="mentor-btn gold" ${noLibrary?'data-open-mentor-modal="article"':'data-clear-article-filters'}><i class="fa-solid ${noLibrary?'fa-plus':'fa-arrow-rotate-left'}"></i> ${noLibrary?'Create First Article':'Clear Filters'}</button>
      </div>`
    }
    return
  }

  let lastArticleDay='';
  if(desktop){
    box.innerHTML=items.map((x,index)=>{
      const rawDate=x.published_at||x.created_at,stamp=mentorSignalStamp(rawDate),category=String(x.category||'General'),live=Boolean(x.is_published),excerpt=x.excerpt||String(x.content||'').slice(0,180)||'No excerpt added.',dayKey=mentorContentDayKey(rawDate);
      const groupHead=dayKey!==lastArticleDay?`<div class="admin-content-date-group"><div><span>${esc(mentorContentDayLabel(rawDate))}</span><small>${esc(stamp.date)}</small></div><i></i></div>`:'';
      lastArticleDay=dayKey;
      return groupHead+`<article class="admin-mentor-content-card ${index%2?'cream':'white'}">
        <div class="admin-mentor-media">
          ${x.cover_url?`<img src="${esc(x.cover_url)}" alt="${esc(x.title||category)}" loading="lazy">`:`<div class="admin-mentor-placeholder"><i class="fa-solid fa-newspaper"></i><span>24K EDITORIAL</span></div>`}
          <div class="admin-mentor-media-top"><span class="gold">${esc(category)}</span><span class="${live?'live':'draft'}">${live?'Published':'Draft'}</span></div>
          <span class="admin-mentor-index">${String(index+1).padStart(2,'0')}</span>
        </div>
        <div class="admin-mentor-card-body">
          <div class="admin-mentor-card-meta"><span><i class="fa-regular fa-calendar"></i> ${esc(stamp.date)}</span><span><i class="fa-regular fa-clock"></i> ${esc(stamp.time)}</span></div>
          <h3>${esc(x.title||'Untitled Article')}</h3>
          <p>${esc(excerpt)}</p>
          <div class="admin-mentor-card-foot">
            <span class="admin-mentor-state ${live?'live':'draft'}"><i class="fa-solid ${live?'fa-circle-check':'fa-pen'}"></i> ${live?'Live':'Draft'}</span>
            <div class="admin-mentor-actions">
              <button type="button" data-view-article="${x.id}"><i class="fa-regular fa-eye"></i><span>View</span></button>
              <button type="button" data-edit-article="${x.id}"><i class="fa-solid fa-pen"></i><span>Edit</span></button>
              <button type="button" class="danger" data-delete-article="${x.id}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          </div>
        </div>
      </article>`
    }).join('');
    return
  }

  box.innerHTML=`<div class="mentor-article-grid">${items.map((x,index)=>{
    const rawDate=x.published_at||x.created_at,stamp=mentorSignalStamp(rawDate),category=String(x.category||'General'),excerpt=x.excerpt||String(x.content||'').slice(0,180)||'No excerpt added.';
    return `<article class="mentor-article-card ${index%2?'cream':'white'}">
      <div class="mentor-article-media">
        ${x.cover_url?`<img src="${esc(x.cover_url)}" alt="${esc(x.title||category)}" loading="lazy">`:`<div class="mentor-article-placeholder"><i class="fa-solid fa-newspaper"></i><span>24K EDITORIAL</span></div>`}
        <div class="mentor-article-media-top">
          <span class="category">${esc(category)}</span>
          <span class="language">${x.content_roman?'EN + Roman':'EN'}</span>
          <span class="status ${x.is_published?'published':'draft'}">${x.is_published?'Published':'Draft'}</span>
        </div>
        <span class="mentor-article-index">${String(index+1).padStart(2,'0')}</span>
      </div>
      <div class="mentor-article-card-body">
        <div class="mentor-article-card-meta"><span><i class="fa-regular fa-calendar"></i> ${esc(stamp.date)}</span><span><i class="fa-regular fa-clock"></i> ${esc(stamp.time)}</span></div>
        <h3>${esc(x.title||'Untitled Article')}</h3>
        <p>${esc(excerpt)}</p>
        <div class="mentor-article-card-foot">
          <span class="mentor-article-state ${x.is_published?'live':'draft'}"><i class="fa-solid ${x.is_published?'fa-circle-check':'fa-pen'}"></i> ${x.is_published?'Live':'Draft'}</span>
          <div class="mentor-article-actions">
            <button type="button" data-view-article="${x.id}" title="View"><i class="fa-regular fa-eye"></i><span>View</span></button>
            <button type="button" data-edit-article="${x.id}" title="Edit"><i class="fa-solid fa-pen"></i><span>Edit</span></button>
            <button type="button" class="danger" data-delete-article="${x.id}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    </article>`
  }).join('')}</div>`
}
function renderMentorArticlePreview(language='english'){
  const id=$('#mentorArticlePreviewModal')?.dataset.articleId;
  const a=(state.articles||[]).find(x=>String(x.id)===String(id));if(!a)return;
  const roman=language==='roman'&&Boolean(String(a.content_roman||'').trim());
  const title=$('#mentorArticlePreviewTitle'),meta=$('#mentorArticlePreviewMeta'),content=$('#mentorArticlePreviewContent');
  if(title)title.textContent=a.title||'Article Preview';
  if(meta)meta.innerHTML=`<span><i class="fa-solid fa-tag"></i>${esc(a.category||'General')}</span><span><i class="fa-regular fa-calendar"></i>${esc(dt(a.published_at||a.created_at))}</span><span class="${a.is_published?'live':'draft'}"><i class="fa-solid ${a.is_published?'fa-circle-check':'fa-pen'}"></i>${a.is_published?'Published':'Draft'}</span>`;
  if(content)content.innerHTML=`<div class="mentor-article-preview-language-label"><i class="fa-solid fa-language"></i>${roman?'Roman English':'English'}</div><div class="mentor-article-preview-text">${esc(roman?a.content_roman:(a.content||a.excerpt||'')).replace(/\n/g,'<br>')}</div>`;
  $$('[data-article-preview-lang]').forEach(b=>{
    const isRoman=b.dataset.articlePreviewLang==='roman';
    b.classList.toggle('active',roman?isRoman:!isRoman);
    if(isRoman)b.disabled=!String(a.content_roman||'').trim()
  })
}
function openMentorArticlePreview(id){
  const modal=$('#mentorArticlePreviewModal');if(!modal)return;
  modal.dataset.articleId=id;
  renderMentorArticlePreview('english');
  openModal('articlePreview')
}

function renderHistoryGroups(items,type){if(!items.length)return'<div class="mentor-empty">Nothing published yet.</div>';return Object.entries(byDate(items)).map(([d,rows])=>`<section class="mentor-date-group"><h3>${esc(d)}</h3><div class="mentor-history-cards">${rows.map(x=>type==='chart'?`<article class="mentor-history-card">${x.image_url?`<img src="${esc(x.image_url)}" alt="Chart">`:''}<div class="body"><div class="mentor-meta"><span class="mentor-chip gold">${esc(x.symbol||'CHART')}</span><span class="mentor-chip">${esc(x.timeframe||'')}</span><small>${esc(dt(x.published_at||x.created_at))}</small></div><h3>${esc(x.title)}</h3><p>${esc(x.summary||'')}</p><div class="mentor-actions"><button type="button" class="mentor-btn small" data-view-chart="${x.id}">View</button><button class="mentor-btn small" data-edit-chart="${x.id}">Edit</button><button class="mentor-btn small danger" data-delete-chart="${x.id}">Delete</button></div></div></article>`:`<article class="mentor-history-card">${x.cover_url?`<img src="${esc(x.cover_url)}" alt="Article">`:'<div style="aspect-ratio:16/9;background:#0c1b36"></div>'}<div class="body"><div class="mentor-meta"><span class="mentor-chip gold">${x.is_published?'PUBLISHED':'DRAFT'}</span><span class="mentor-chip">${esc(x.category||'General')}</span><small>${esc(dt(x.published_at||x.created_at))}</small></div><h3>${esc(x.title)}</h3><p>${esc(x.excerpt||String(x.content||'').slice(0,160))}</p><div class="mentor-actions"><button class="mentor-btn small" data-view-article="${x.id}">View</button><button class="mentor-btn small" data-edit-article="${x.id}">Edit</button><button class="mentor-btn small danger" data-delete-article="${x.id}">Delete</button></div></div></article>`).join('')}</div></section>`).join('')}
function renderBanners(){const box=$('#mentorBanners');if(!box)return;const items=state.banners||[];box.innerHTML=items.length?Object.entries(byDate(items)).map(([d,rows])=>`<section class="mentor-date-group"><h3>${esc(d)}</h3><div class="mentor-history-cards">${rows.map(x=>`<article class="mentor-history-card"><img src="${esc(x.image_url)}" alt="Banner"><div class="body"><div class="mentor-meta"><span class="mentor-chip gold">${x.is_published?'PUBLISHED':'DRAFT'}</span></div><h3>${esc(x.title)}</h3><p>${esc(x.target_url||'No target URL')}</p><div class="mentor-actions"><a class="mentor-btn small" href="${esc(x.image_url)}" target="_blank" rel="noopener">View</a><button class="mentor-btn small" data-edit-banner="${x.id}">Edit</button><button class="mentor-btn small danger" data-delete-banner="${x.id}">Delete</button></div></div></article>`).join('')}</div></section>`).join(''):'<div class="mentor-empty">No banners yet.</div>'}
function editBanner(id){const x=state.banners.find(v=>v.id===id);if(!x)return;const f=$('#mentorBannerForm');f.elements.id.value=x.id;f.elements.existing_image.value=x.image_url||'';f.elements.title.value=x.title||'';f.elements.target_url.value=x.target_url||'';f.elements.is_published.checked=Boolean(x.is_published);$('#mentorBannerModalTitle').textContent='Edit Banner';openModal('banner')}
async function saveBanner(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),published=f.elements.is_published.checked,oldImage=String(d.existing_image||'');let image=null,saved=false;b.disabled=true;try{image=await upload(f.elements.image.files[0],'banners');const row={title:String(d.title||'').trim(),image_url:image||oldImage||null,target_url:String(d.target_url||'').trim()||null,is_published:published,updated_at:new Date().toISOString()};if(!row.title)throw new Error('Banner title is required.');if(!row.image_url)throw new Error('Banner image is required.');let r;if(d.id)r=await sb.from('mentor_banners').update(row).eq('id',d.id);else r=await sb.from('mentor_banners').insert({...row,created_by:state.user.id});if(r.error)throw r.error;saved=true;if(image&&oldImage&&image!==oldImage)await removeContentAsset(oldImage);f.reset();f.elements.id.value='';f.elements.existing_image.value='';f.elements.is_published.checked=true;$('#mentorBannerModalTitle').textContent='New Banner';closeModals();toast(d.id?'Banner updated.':'Banner saved.');await load()}catch(err){if(image&&!saved)await removeContentAsset(image);toast(err.message||'Could not save banner.')}finally{b.disabled=false}}
function mentorCourseMoney(v,currency='USD'){
  const n=Number(v||0);
  if(!Number.isFinite(n))return '—';
  if(n===0)return 'FREE';
  const code=String(currency||'USD').toUpperCase();
  const prefix=code==='USD'?'$':code==='PKR'?'Rs ':code==='USDT'?'USDT ':'';
  return prefix+n.toLocaleString('en-US',{maximumFractionDigits:2})
}
function mentorCourseDate(v){
  const d=v?new Date(v):null;
  if(!d||Number.isNaN(d.getTime()))return '';
  return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).format(d)
}
function mentorCourseStatus(v){
  return String(v||'active').split('_').map(x=>x?x.charAt(0).toUpperCase()+x.slice(1):'').join(' ')
}
function mentorNextCourseSession(courseId){
  const now=Date.now()-5*60*1000;
  return (state.courseSessions||[])
    .filter(s=>String(s?.course_id)===String(courseId)&&!['cancelled','completed'].includes(String(s?.status||'').toLowerCase())&&new Date(s?.starts_at||0).getTime()>=now)
    .sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]||null
}
function mentorCourseLocal(v){
  const d=v?new Date(v):null;if(!d||Number.isNaN(d.getTime()))return'';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
function mentorCourseIso(v){
  const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);if(!m)return null;
  const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4])-5,Number(m[5]),0));
  return Number.isNaN(d.getTime())?null:d.toISOString()
}
function mentorCourseSessionTemplate(session={},index=0){
  const no=index+1;
  return `<article class="mentor-course-session-row" data-mentor-course-session-row data-status="${esc(session.status||'upcoming')}">
    <input type="hidden" data-course-session-field="id" value="${esc(session.id||'')}">
    <div class="mentor-course-session-head"><div><small>CLASS ${String(no).padStart(2,'0')}</small><b>${esc(session.title||`Class ${no}`)}</b></div><button type="button" data-remove-mentor-course-session aria-label="Remove class"><i class="fa-regular fa-trash-can"></i></button></div>
    <div class="mentor-course-session-grid">
      <label><span>Class Title</span><input data-course-session-field="title" value="${esc(session.title||`Class ${no}`)}" required></label>
      <label><span>Date & Time (PKT)</span><input type="datetime-local" data-course-session-field="starts_at" value="${esc(mentorCourseLocal(session.starts_at))}" required></label>
      <label class="full"><span>Topic / What Students Will Learn</span><textarea data-course-session-field="topic" rows="3" required>${esc(session.topic||'')}</textarea></label>
      <label><span>Duration Minutes</span><input type="number" min="15" step="5" data-course-session-field="duration_minutes" value="${esc(session.duration_minutes||90)}" required></label>
      <label><span>Status</span><select data-course-session-field="status"><option value="upcoming" ${String(session.status||'upcoming')==='upcoming'?'selected':''}>Upcoming</option><option value="live" ${String(session.status||'')==='live'?'selected':''}>Live</option><option value="completed" ${String(session.status||'')==='completed'?'selected':''}>Completed</option><option value="cancelled" ${String(session.status||'')==='cancelled'?'selected':''}>Cancelled</option></select></label>
    </div>
  </article>`
}
function renderMentorCourseSessionEditor(rows){
  const box=$('#mentorCourseSessionEditor');if(!box)return;
  const list=rows?.length?rows:[{}];
  box.innerHTML=list.map(mentorCourseSessionTemplate).join('')
}
function openMentorCourseEditor(id,focusSessions=false){
  const course=(state.courses||[]).find(x=>String(x.id)===String(id)),form=$('#mentorCourseForm');if(!course||!form)return toast('Course could not be found.');
  form.reset();
  form.elements.id.value=course.id;
  form.elements.title.value=course.title||'';
  form.elements.instructor_name.value=course.instructor_name||'Mr. Zameer';
  form.elements.short_description.value=course.short_description||course.description||'';
  form.elements.course_type.value=course.course_type||((Number(course.price||0)<=0)?'free':'paid');
  form.elements.price.value=course.price??0;
  form.elements.discount_price.value=course.discount_price??'';
  form.elements.currency.value=course.currency||'USD';
  form.elements.enrollment_open.checked=course.enrollment_open!==false;
  form.elements.is_published.checked=course.is_published!==false;
  const rows=(state.courseSessions||[]).filter(x=>String(x.course_id)===String(course.id)).sort((a,b)=>Number(a.session_number||0)-Number(b.session_number||0));
  renderMentorCourseSessionEditor(rows);
  const title=$('#mentorCourseModalTitle');if(title)title.textContent='Edit Course — '+(course.title||'Course');
  openModal('course');
  if(focusSessions)setTimeout(()=>$('#mentorCourseSessionEditor')?.scrollIntoView({behavior:'smooth',block:'start'}),120)
}
function collectMentorCourseSessions(){
  return [...document.querySelectorAll('[data-mentor-course-session-row]')].map((row,index)=>{
    const get=name=>row.querySelector(`[data-course-session-field="${name}"]`)?.value??'';
    const title=String(get('title')).trim(),starts=mentorCourseIso(get('starts_at')),topic=String(get('topic')).trim(),duration=Math.max(15,Number(get('duration_minutes')||90));
    if(!title)throw new Error(`Class ${index+1}: title is required.`);
    if(!starts)throw new Error(`Class ${index+1}: date and time are required.`);
    if(!topic)throw new Error(`Class ${index+1}: topic is required.`);
    return {id:String(get('id')).trim()||null,session_number:index+1,title,topic,starts_at:starts,duration_minutes:duration,status:String(get('status')||row.dataset.status||'upcoming')}
  })
}
async function saveMentorCourse(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),old=button?.innerHTML||'Save Changes';
  const id=String(form.elements.id.value||''),course=(state.courses||[]).find(x=>String(x.id)===id);
  if(!course)return toast('Course could not be found.');
  try{
    if(button){button.disabled=true;button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Saving…'}
    const title=String(form.elements.title.value||'').trim(),desc=String(form.elements.short_description.value||'').trim(),type=String(form.elements.course_type.value||'paid'),price=Number(form.elements.price.value||0),discountRaw=String(form.elements.discount_price.value||'').trim(),discount=discountRaw===''?null:Number(discountRaw);
    if(!title)throw new Error('Course heading is required.');
    if(!desc)throw new Error('Short caption is required.');
    if(type==='paid'&&(!Number.isFinite(price)||price<=0))throw new Error('Paid course price must be greater than zero.');
    if(discount!==null&&(!Number.isFinite(discount)||discount<0))throw new Error('Discount price is invalid.');
    const sessions=collectMentorCourseSessions();
    if(!sessions.length)throw new Error('Add at least one class.');
    const starts=sessions.map(s=>new Date(s.starts_at)).sort((a,b)=>a-b);
    const row={
      title,
      short_description:desc,
      description:desc,
      instructor_name:String(form.elements.instructor_name.value||'Mr. Zameer').trim()||'Mr. Zameer',
      course_type:type,
      price:type==='free'?0:price,
      discount_price:type==='free'?null:discount,
      currency:String(form.elements.currency.value||'USD'),
      enrollment_open:Boolean(form.elements.enrollment_open.checked),
      is_published:Boolean(form.elements.is_published.checked),
      start_date:starts[0]?.toISOString().slice(0,10)||course.start_date||null,
      end_date:starts.at(-1)?.toISOString().slice(0,10)||course.end_date||null,
      updated_at:new Date().toISOString()
    };
    const cr=await sb.from('courses').update(row).eq('id',id).select('id').single();if(cr.error)throw cr.error;
    const existing=(state.courseSessions||[]).filter(x=>String(x.course_id)===id),keep=[];
    for(const s of sessions){
      const payload={course_id:id,session_number:s.session_number,title:s.title,topic:s.topic,starts_at:s.starts_at,duration_minutes:s.duration_minutes,status:s.status,updated_at:new Date().toISOString()};
      if(s.id){const r=await sb.from('course_sessions').update(payload).eq('id',s.id);if(r.error)throw r.error;keep.push(String(s.id))}
      else{const r=await sb.from('course_sessions').insert({...payload,created_by:state.user?.id||null}).select('id').single();if(r.error)throw r.error;keep.push(String(r.data.id))}
    }
    const removed=existing.filter(x=>!keep.includes(String(x.id)));
    for(const s of removed){const r=await sb.from('course_sessions').delete().eq('id',s.id);if(r.error)throw r.error}
    closeModals();
    await load();
    toast('Course and classes updated successfully.')
  }catch(err){
    console.error('[Mentor Course Save]',err);toast(err?.message||'Could not update course.')
  }finally{if(button){button.disabled=false;button.innerHTML=old}}
}

function renderCourses(){
  const courses=state.courses||[],sessions=state.courseSessions||[];
  const mobile=$('#mentorCourses'),stats=$('#mentorCourseStatsDesktop'),cards=$('#mentorCourseCardsDesktop');

  if(mobile){
    mobile.innerHTML=courses.length?courses.map(c=>'<article class="mentor-card">'+(c.thumbnail_url?'<img src="'+esc(c.thumbnail_url)+'" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px">':'')+'<div class="mentor-meta"><span class="mentor-chip gold">'+(Number((c.discount_price ?? c.price)||0)<=0?'FREE':esc(c.currency||'USD')+' '+esc(c.discount_price??c.price))+'</span><span class="mentor-chip">'+esc(c.status||'active')+'</span></div><h3>'+esc(c.title)+'</h3><p>'+esc(c.short_description||c.description||'')+'</p><small>'+esc(c.instructor_name||'24K MR ZERO')+'</small></article>').join(''):'<div class="mentor-empty">No published courses.</div>'
  }

  if(!stats||!cards)return;

  const now=Date.now()-5*60*1000;
  const published=courses.filter(c=>c?.is_published!==false).length;
  const enrollment=courses.filter(c=>c?.enrollment_open!==false).length;
  const upcoming=sessions.filter(s=>{
    const t=new Date(s?.starts_at||0).getTime(),status=String(s?.status||'').toLowerCase();
    return Number.isFinite(t)&&t>=now&&!['cancelled','completed'].includes(status)
  }).length;

  const statRows=[
    ['fa-layer-group','TOTAL COURSES',courses.length,'Course library','gold'],
    ['fa-circle-check','PUBLISHED',published,'Visible to students','green'],
    ['fa-door-open','ENROLLMENT OPEN',enrollment,'Accepting students','blue'],
    ['fa-video','UPCOMING CLASSES',upcoming,'Scheduled live sessions','violet']
  ];
  stats.innerHTML=statRows.map(row=>'<article class="admin-course-stat '+row[4]+'"><span><i class="fa-solid '+row[0]+'"></i></span><div><small>'+esc(row[1])+'</small><b>'+esc(row[2])+'</b><em>'+esc(row[3])+'</em></div></article>').join('');

  cards.innerHTML=courses.length?courses.map(course=>{
    const next=mentorNextCourseSession(course.id);
    const currentPrice=Number(course.discount_price||0)>0?course.discount_price:course.price;
    const price=mentorCourseMoney(currentPrice,course.currency);
    const regular=Number(course.discount_price||0)>0&&Number(course.price||0)>Number(course.discount_price||0)?mentorCourseMoney(course.price,course.currency):'';
    const free=Number(currentPrice||0)===0;
    const publishedState=course.is_published!==false;
    const thumb=course.thumbnail_url
      ?'<div class="admin-course-card-media"><img src="'+esc(course.thumbnail_url)+'" alt="'+esc(course.title||'Course')+'" loading="lazy" decoding="async"></div>'
      :'<div class="admin-course-card-media placeholder"><i class="fa-solid fa-graduation-cap"></i></div>';
    return '<article class="admin-course-card '+(free?'free':'paid')+'">'+thumb+
      '<div class="admin-course-card-body">'+
        '<div class="admin-course-card-top"><div><span class="admin-course-card-type">'+(free?'FREE COURSE':'PAID COURSE')+'</span><h3>'+esc(course.title||'Untitled Course')+'</h3></div><span class="admin-course-card-status">'+esc(mentorCourseStatus(course.status))+'</span></div>'+
        '<p>'+esc(course.short_description||course.description||'No course description added.')+'</p>'+
        '<div class="admin-course-card-metrics"><div><small>PRICE</small><b>'+esc(price)+'</b>'+(regular?'<em>'+esc(regular)+'</em>':'')+'</div><div><small>NEXT CLASS</small><b>'+(next?esc(next.title||'Upcoming Class'):'No upcoming class')+'</b><em>'+(next?esc(mentorCourseDate(next.starts_at)):'Schedule not added')+'</em></div></div>'+
        '<div class="admin-course-card-meta"><span><i class="fa-brands fa-whatsapp"></i> WhatsApp Community</span><span class="'+(publishedState?'ok':'muted')+'"><i class="fa-solid '+(publishedState?'fa-circle-check':'fa-circle-minus')+'"></i> '+(publishedState?'Published':'Hidden')+'</span></div>'+
        '<div class="mentor-course-admin-actions"><button type="button" class="mentor-btn small" data-edit-course="'+esc(course.id)+'"><i class="fa-regular fa-pen-to-square"></i> Edit Course</button><button type="button" class="mentor-btn small gold" data-edit-course-sessions="'+esc(course.id)+'"><i class="fa-solid fa-video"></i> Sessions</button></div>'+
      '</div>'+
    '</article>'
  }).join(''):'<div class="admin-course-card-empty"><i class="fa-solid fa-graduation-cap"></i><b>No courses created</b><small>Add a course from the Admin panel to begin.</small></div>'
}
function renderNews(){
  const b=$('#mentorNews');if(!b)return;
  const rows=(state.news||[]).slice().sort((a,b)=>new Date(b.published_at||b.created_at)-new Date(a.published_at||a.created_at));
  b.innerHTML=rows.length?rows.map(n=>{
    const important=String(n.priority||'normal')==='important',published=n.is_published!==false;
    return '<article class="mentor-news-card '+(important?'important ':'')+(published?'published':'draft')+'">'+
      '<div class="mentor-news-card-head"><div><div class="mentor-news-badges"><span class="'+(important?'important':'normal')+'">'+(important?'IMPORTANT':'NORMAL')+'</span><span class="'+(published?'published':'draft')+'">'+(published?'PUBLISHED':'DRAFT')+'</span></div><h3>'+esc(n.title||'Untitled Announcement')+'</h3></div></div>'+
      '<p>'+esc(n.message||'')+'</p>'+
      '<small>'+esc(dt(n.published_at||n.created_at))+' · '+esc(String(n.audience||'all_students').replaceAll('_',' '))+'</small>'+
      '<div class="mentor-news-actions"><button type="button" data-edit-announcement="'+esc(n.id)+'"><i class="fa-regular fa-pen-to-square"></i> Edit</button><button type="button" class="danger" data-delete-announcement="'+esc(n.id)+'" aria-label="Delete announcement"><i class="fa-regular fa-trash-can"></i></button></div>'+
    '</article>'
  }).join(''):'<div class="mentor-empty">No announcements.</div>'
}
function editAnnouncement(id){
  const x=(state.news||[]).find(v=>String(v.id)===String(id));if(!x)return;
  const f=$('#mentorAnnouncementForm');if(!f)return;
  f.elements.id.value=x.id||'';
  f.elements.title.value=x.title||'';
  f.elements.message.value=x.message||'';
  f.elements.priority.value=x.priority||'normal';
  f.elements.is_published.checked=x.is_published!==false;
  const t=$('#mentorAnnouncementModalTitle');if(t)t.textContent='Edit Announcement';
  openModal('announcement')
}
async function saveAnnouncement(e){
  e.preventDefault();
  const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),existing=(state.news||[]).find(x=>String(x.id)===String(d.id));
  const title=String(d.title||'').trim(),message=String(d.message||'').trim(),priority=String(d.priority||'normal').trim(),published=Boolean(f.elements.is_published?.checked);
  if(!title)return toast('Announcement title is required.');
  if(!message)return toast('Announcement message is required.');
  const original=b.innerHTML;b.disabled=true;b.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  try{
    const row={
      title,message,priority,is_published:published,
      updated_at:new Date().toISOString()
    };
    let r;
    if(d.id){
      r=await sb.from('announcements').update(row).eq('id',d.id)
    }else{
      r=await sb.from('announcements').insert({
        ...row,
        audience:'all_students',
        course_id:null,
        send_email:false,
        send_browser:true,
        published_at:new Date().toISOString(),
        created_by:state.user.id
      }).select('id').single()
    }
    if(r.error)throw r.error;
    const announcementId=d.id||r.data?.id;
    if(announcementId&&published&&(!d.id||!existing?.is_published)){
      await sendStudentPush24K({type:'announcement',content_id:announcementId,event_key:`announcement:new:${announcementId}`,title:`24K Update: ${title}`,message,url:`/student/updates/?push=${encodeURIComponent(announcementId)}`})
    }
    resetMentorEditor('announcement');
    closeModals();
    toast(d.id?'Announcement updated.':'Announcement published.');
    state.news=await safeLoad('announcements',sb.from('announcements').select('id,title,message,priority,is_published,published_at,created_at,updated_at,audience,course_id,send_email,send_browser,publish_at,expires_at').order('published_at',{ascending:false}).limit(200));
    renderNews()
  }catch(err){
    toast(err.message||'Could not save announcement.')
  }finally{
    b.disabled=false;b.innerHTML=original
  }
}
function renderSettings(){
  const name=state.profile?.full_name||'Mentor',
    email=state.profile?.email||state.user?.email||'';

  const profileHtml=`
    <div class="mentor-profile-account-hero clean">
      <div class="mentor-profile-brandmark"><img src="/assets/logo-v965.png" alt="24K MR ZERO"></div>
      <div class="mentor-profile-identity">
        <span class="mentor-profile-status"><i></i> ACTIVE MENTOR</span>
        <h3>${esc(name)}</h3>
        <p><i class="fa-regular fa-envelope"></i> ${esc(email)}</p>
      </div>
      <span class="mentor-profile-verified"><i class="fa-solid fa-circle-check"></i> Verified</span>
    </div>

    <div class="mentor-profile-access-simple">
      <div class="mentor-profile-access-title"><span><i class="fa-solid fa-shield-halved"></i> Workspace Access</span><small>Admin managed</small></div>
      <div class="mentor-profile-permissions-simple">
        ${Object.keys(state.perms).filter(k=>k!=='banners').map(k=>`<span class="${state.perms[k]?'on':'off'}"><i class="fa-solid ${state.perms[k]?'fa-check':'fa-lock'}"></i>${esc(k==='announcements'?'News / Announcements':k.charAt(0).toUpperCase()+k.slice(1))}</span>`).join('')}
      </div>
    </div>`;

  const profile=$('#mentorProfileContent');
  if(profile)profile.innerHTML=profileHtml;
  updateMentorInstall()
}
function mentorPipSize(symbol){const s=String(symbol||'').replace('/','').toUpperCase();if(s.startsWith('BTC'))return 10;if(s==='XAUUSD')return .1;if(s==='XAGUSD')return .001;if(s.endsWith('JPY'))return .01;return .0001}
function projectedSignalPips(signal,price){
  const p=Number(price),a=Number(signal?.entry_from),b=signal?.entry_to==null||signal?.entry_to===''?a:Number(signal.entry_to);
  if(!Number.isFinite(p)||!Number.isFinite(a)||!Number.isFinite(b))return null;
  const entry=(a+b)/2,pip=mentorPipSize(signal?.symbol),dir=String(signal?.direction||'BUY').toUpperCase();
  const result=(dir==='SELL'?entry-p:p-entry)/pip;
  return Math.round(result*10)/10
}
function pipText(v){return v==null?'—':`${v>0?'+':''}${Number.isInteger(v)?v:Number(v).toFixed(1)} pips`}
function renderMentorPipPreview(){
  const f=$('#mentorSignalForm'),box=$('#mentorPipPreview');if(!f||!box)return;
  const d=Object.fromEntries(new FormData(f)),kind=String(d.signal_type||'BUY').toUpperCase(),signal={symbol:d.symbol,direction:kind.startsWith('SELL')?'SELL':'BUY',entry_from:num(d.entry_from),entry_to:num(d.entry_to)};
  if(signal.entry_from==null){box.innerHTML='<span>Automatic Pip Preview</span><small>Enter Entry, SL and TP levels to calculate projected pips.</small>';return}
  const levels=[['SL',d.stop_loss],['TP1',d.take_profit_1],['TP2',d.take_profit_2],['TP3',d.take_profit_3],['TP4',d.take_profit_4]].filter(([,v])=>v!==''&&v!=null);
  box.innerHTML='<span>Automatic Pip Preview</span><div>'+levels.map(([k,v])=>{const bad=k==='SL',p=mentorOutcomePips(signal,v,bad?'sl':'tp');return `<b class="${bad?'bad':'good'}">${k} <em>${pipText(p)}</em></b>`}).join('')+'</div>'
}
function mentorSignalResult(signal,row){const status=String(signal.status||'');if(status==='cancelled')return{result_pips:null,close_price:null};const entry=(Number(row.entry_from||0)+Number(row.entry_to??row.entry_from??0))/2;let price=null,outcome='manual';if(status==='breakeven_hit'){price=entry;outcome='be'}else if(status==='tp1_hit'){price=row.take_profit_1;outcome='tp'}else if(status==='tp2_hit'){price=row.take_profit_2;outcome='tp'}else if(status==='tp3_hit'){price=row.take_profit_3;outcome='tp'}else if(status==='tp4_hit'){price=row.take_profit_4;outcome='tp'}else if(status==='sl_hit'){price=row.stop_loss;outcome='sl'}else if(status==='manually_closed')price=signal.close_price;if(price===null||price===undefined||!Number.isFinite(Number(price)))return{result_pips:signal.result_pips??null,close_price:signal.close_price??null};const result=mentorOutcomePips({...signal,...row},price,outcome);return{result_pips:result,close_price:signalIsClosed({...signal,...row,status})?Number(price):(signal.close_price??null)}}
function editSignal(id){const x=state.signals.find(v=>v.id===id);if(!x)return;closeModals();const f=$('#mentorSignalForm');f.elements.id.value=x.id;f.elements.symbol.value=x.symbol||'XAUUSD';f.elements.signal_type.value=signalTypeLabel(x);f.elements.entry_from.value=x.entry_from??'';f.elements.entry_to.value=x.entry_to??'';f.elements.stop_loss.value=x.stop_loss??'';f.elements.take_profit_1.value=x.take_profit_1??'';f.elements.take_profit_2.value=x.take_profit_2??'';f.elements.take_profit_3.value=x.take_profit_3??'';f.elements.take_profit_4.value=x.take_profit_4??'';f.elements.notes.value=x.notes||'';const t=$('#mentorSignalModalTitle');if(t)t.textContent=signalIsClosed(x)?'Edit Signal History':'Edit Signal';openModal('signal');renderMentorPipPreview()}
async function saveSignal(e){e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),kind=String(d.signal_type||'BUY').trim().toUpperCase(),direction=kind.startsWith('SELL')?'SELL':'BUY',orderType=kind.includes('STOP')?'stop':kind.includes('LIMIT')?'limit':'market',original=b.innerHTML;b.disabled=true;b.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';try{const row={symbol:String(d.symbol||'').trim().toUpperCase(),direction,order_type:orderType,entry_from:num(d.entry_from),entry_to:num(d.entry_to),stop_loss:num(d.stop_loss),take_profit_1:num(d.take_profit_1),take_profit_2:num(d.take_profit_2),take_profit_3:num(d.take_profit_3),take_profit_4:num(d.take_profit_4),notes:String(d.notes||'').trim()||null};if(!row.symbol||row.entry_from===null||row.stop_loss===null||row.take_profit_1===null){const name=row.entry_from===null?'entry_from':row.stop_loss===null?'stop_loss':row.take_profit_1===null?'take_profit_1':'symbol';f.elements[name]?.focus();throw new Error('Entry From, Stop Loss and TP1 are required.');}let r;if(d.id){const existing=state.signals.find(x=>x.id===d.id);if(!existing)throw new Error('Signal not found.');const calc=mentorSignalResult(existing,row);r=await sb.from('signals').update({...row,...calc,updated_at:new Date().toISOString()}).eq('id',d.id);if(r.error)throw r.error;toast('Signal updated.')}else{r=await sb.from('signals').insert({...row,status:row.order_type==='market'?'active':'pending',audience_access:'all_students',is_published:true,published_at:new Date().toISOString(),created_by:state.user.id}).select('id').single();if(r.error)throw r.error;const signalId=r.data?.id;if(signalId)await sendStudentPush24K({type:'signal',content_id:signalId,event_key:`signal:new:${signalId}`,title:`New ${mentorDisplaySymbol(row.symbol)} ${row.direction} Signal`,message:`${String(kind||'MARKET').replace('_',' ')} · Entry ${row.entry_from}${row.entry_to!=null?' - '+row.entry_to:''} · SL ${row.stop_loss} · TP1 ${row.take_profit_1}`,url:`/student/signals/?push=${encodeURIComponent(signalId)}`});toast('Signal published.')}f.reset();f.elements.id.value='';const t=$('#mentorSignalModalTitle');if(t)t.textContent='New Signal';closeModals();await load()}catch(err){toast(err.message||'Could not save signal.')}finally{b.disabled=false;b.innerHTML=original}}
async function signalAction(id,action){let close=null;if(action==='manually_closed'){const v=await mentorAskAction({title:'Close Signal',eyebrow:'TRADE MANAGEMENT',message:'Enter the final close price.',hint:'The result pips will be calculated from this price.',confirmText:'Close Signal',icon:'fa-chart-line',input:true,inputLabel:'Close Price',inputPlaceholder:'e.g. 4012.50'});if(v===null)return;close=Number(v);if(!Number.isFinite(close))return toast('Enter a valid close price.')}const r=await sb.rpc('mentor_update_signal_status_v12_16',{p_signal_id:id,p_action:action,p_close_price:close,p_note:null,p_notify_users:true});if(r.error)throw r.error;await sendLatestMentorSignalUpdatePush24K(id);const p=r.data?.result_pips;toast(p==null?'Signal updated.':`Signal updated · ${pipText(Number(p))}`);closeModals();await load()}
function syncEditorFileLabel(kind,file){
  const el=document.querySelector(`[data-file-label="${kind}"]`);
  if(!el)return;
  if(file){el.textContent=file.name;el.closest('.premium-upload')?.classList.add('has-file')}
  else{el.textContent=kind==='chart'?'PNG, JPG or WEBP · Tap to select':'Optional · Tap to select';el.closest('.premium-upload')?.classList.remove('has-file')}
}
function syncArticleEditorUI(){
  const f=$('#mentorArticleForm');if(!f)return;
  const published=Boolean(f.elements.is_published?.checked),stateEl=f.querySelector('[data-publish-state]');
  if(stateEl){
    stateEl.classList.toggle('draft',!published);
    stateEl.innerHTML=published?'<i class="fa-solid fa-circle-check"></i> Ready to publish':'<i class="fa-solid fa-pen"></i> Saving as draft'
  }
}
const mentorChartInstruments=[
  {group:'Top Markets',symbol:'XAUUSD',label:'GOLD — XAU/USD'},
  {group:'Top Markets',symbol:'XAGUSD',label:'SILVER — XAG/USD'},
  {group:'Top Markets',symbol:'BTCUSD',label:'BTC — BTC/USD'},
  {group:'USD Pairs',symbol:'EURUSD',label:'EUR/USD'},
  {group:'USD Pairs',symbol:'GBPUSD',label:'GBP/USD'},
  {group:'USD Pairs',symbol:'USDJPY',label:'USD/JPY'},
  {group:'USD Pairs',symbol:'USDCHF',label:'USD/CHF'},
  {group:'USD Pairs',symbol:'AUDUSD',label:'AUD/USD'},
  {group:'USD Pairs',symbol:'NZDUSD',label:'NZD/USD'},
  {group:'USD Pairs',symbol:'USDCAD',label:'USD/CAD'},
  ...['EURGBP','EURJPY','GBPJPY','AUDJPY','CADJPY','CHFJPY','EURAUD','EURNZD','EURCAD','EURCHF','GBPAUD','GBPNZD','GBPCAD','GBPCHF','AUDCAD','AUDCHF','AUDNZD','NZDCAD','NZDCHF','NZDJPY','CADCHF'].map(symbol=>({group:'Cross Pairs',symbol,label:`${symbol.slice(0,3)}/${symbol.slice(3)}`}))
];
let mentorChartPreviewObjectUrl='';
function mentorChartCategory(symbol){
  const value=String(symbol||'').toUpperCase();
  if(value==='XAUUSD')return'Gold';
  if(value==='XAGUSD')return'Silver';
  if(value==='BTCUSD')return'Crypto';
  return'Forex'
}
function mentorChartInstrumentMeta(symbol){
  const key=String(symbol||'').replace('/','').toUpperCase();
  return mentorChartInstruments.find(i=>i.symbol===key)||{symbol:key,label:mentorDisplaySymbol(key)}
}
function clearMentorChartPreview(){
  if(mentorChartPreviewObjectUrl){URL.revokeObjectURL(mentorChartPreviewObjectUrl);mentorChartPreviewObjectUrl=''}
  const preview=$('#mentorChartImagePreview');
  if(preview){preview.className='mentor-chart-upload-preview empty';preview.innerHTML='<i class="fa-solid fa-image"></i><span>Selected chart image preview will appear here.</span>'}
}
function renderMentorChartPreview(file,url=''){
  const preview=$('#mentorChartImagePreview');if(!preview)return;
  if(mentorChartPreviewObjectUrl){URL.revokeObjectURL(mentorChartPreviewObjectUrl);mentorChartPreviewObjectUrl=''}
  let source=url;
  if(file){mentorChartPreviewObjectUrl=URL.createObjectURL(file);source=mentorChartPreviewObjectUrl}
  if(!source)return clearMentorChartPreview();
  preview.className='mentor-chart-upload-preview';
  preview.innerHTML=`<img src="${esc(source)}" alt="Chart image preview">`
}
function selectMentorChartInstrument(symbol,autoTitle=true){
  const form=$('#mentorChartDesktopForm');if(!form)return;
  const meta=mentorChartInstrumentMeta(symbol);
  form.elements.symbol.value=meta.symbol;
  const search=$('#mentorChartInstrumentSearch');if(search)search.value=meta.label;
  if(form.elements.category)form.elements.category.value=mentorChartCategory(meta.symbol);
  $('#mentorChartInstrumentPicker')?.classList.remove('invalid','open');
  if(autoTitle&&!String(form.elements.title.value||'').trim()){
    form.elements.title.value=`${meta.label} ${form.elements.timeframe.value||''} Market Analysis`.replace(/\s+/g,' ').trim()
  }
}
function bindMentorChartInstrumentPicker(){
  const picker=$('#mentorChartInstrumentPicker'),search=$('#mentorChartInstrumentSearch'),menu=$('#mentorChartInstrumentMenu'),form=$('#mentorChartDesktopForm');
  if(!picker||!search||!menu||!form||picker.dataset.bound==='1')return;
  picker.dataset.bound='1';
  const draw=()=>{
    const q=search.value.trim().toLowerCase();
    const filtered=mentorChartInstruments.filter(i=>!q||`${i.symbol} ${i.label}`.toLowerCase().includes(q));
    let group='';
    menu.innerHTML=filtered.map(i=>{
      const head=i.group!==group?(group=i.group,`<div class="instrument-group">${esc(group)}</div>`):'';
      return `${head}<button type="button" data-mentor-chart-pair="${esc(i.symbol)}"><b>${esc(i.label)}</b><small>${esc(mentorChartCategory(i.symbol))}</small></button>`
    }).join('')||'<div class="instrument-empty">No instrument found</div>'
  };
  search.addEventListener('focus',()=>{draw();picker.classList.add('open');picker.classList.remove('invalid')});
  search.addEventListener('input',()=>{form.elements.symbol.value='';if(form.elements.category)form.elements.category.value='';draw();picker.classList.add('open')});
  picker.querySelector('.mentor-admin-instrument-toggle')?.addEventListener('click',()=>{draw();picker.classList.toggle('open');search.focus()});
  menu.addEventListener('click',e=>{const b=e.target.closest('[data-mentor-chart-pair]');if(!b)return;selectMentorChartInstrument(b.dataset.mentorChartPair);picker.classList.remove('open')});
  document.addEventListener('click',e=>{if(!picker.contains(e.target))picker.classList.remove('open')});
  draw()
}
function fillMentorChartForm(form,x){
  if(!form)return;
  form.elements.id.value=x.id;
  form.elements.existing_image.value=x.image_url||'';
  form.elements.title.value=x.title||'';
  form.elements.symbol.value=x.symbol||'';
  if(form.elements.timeframe)form.elements.timeframe.value=x.timeframe||'M15';
  if(form.elements.category)form.elements.category.value=x.category||mentorChartCategory(x.symbol);
  form.elements.summary.value=x.summary||'';
  form.elements.details.value=x.details||'';
  if(form.elements.is_published)form.elements.is_published.checked=Boolean(x.is_published)
}
function editChart(id){
  const x=state.charts.find(v=>v.id===id);if(!x)return;
  const mobile=$('#mentorChartForm'),desktop=$('#mentorChartDesktopForm');
  fillMentorChartForm(mobile,x);fillMentorChartForm(desktop,x);
  const meta=mentorChartInstrumentMeta(x.symbol);
  const search=$('#mentorChartInstrumentSearch');if(search)search.value=meta.label;
  renderMentorChartPreview(null,x.image_url||'');
  syncEditorFileLabel('chart',x.image_url?{name:'Current chart image retained'}:null);
  const mt=$('#mentorChartModalTitle');if(mt)mt.textContent='Edit Chart';
  const dt=$('#mentorChartDesktopModalTitle');if(dt)dt.textContent='Edit Chart';
  openModal('chart')
}
async function saveChart(e){
  e.preventDefault();
  const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),oldImage=String(d.existing_image||''),desktop=f.id==='mentorChartDesktopForm';
  let image=null,saved=false;b.disabled=true;
  const oldButton=b.innerHTML;
  b.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> ${d.id?'Updating chart...':'Uploading chart...'}`;
  try{
    if(desktop&&!String(d.symbol||'').trim()){
      $('#mentorChartInstrumentPicker')?.classList.add('invalid');
      $('#mentorChartInstrumentSearch')?.focus();
      throw new Error('Select a trading instrument from the dropdown.')
    }
    if(!String(d.title||'').trim())throw new Error('Chart title is required.');
    if(!String(d.summary||'').trim())throw new Error('Analysis summary is required.');
    const file=f.elements.image.files?.[0]||null;
    if(desktop&&!d.id&&!file&&!oldImage)throw new Error('Choose a chart image before saving.');
    image=await upload(file,'charts');
    const row={
      title:String(d.title||'').trim(),
      symbol:String(d.symbol||'').trim().toUpperCase(),
      timeframe:String(d.timeframe||'').trim()||null,
      summary:String(d.summary||'').trim(),
      details:String(d.details||'').trim()||null,
      category:String(d.category||mentorChartCategory(d.symbol)||'').trim()||null,
      image_url:image||oldImage||null,
      is_published:desktop?Boolean(f.elements.is_published?.checked):true
    };
    if(!row.title||!row.symbol||!row.summary)throw new Error('Title, symbol and summary are required.');
    let r;
    if(d.id)r=await sb.from('charts').update(row).eq('id',d.id);
    else r=await sb.from('charts').insert({...row,published_at:new Date().toISOString(),created_by:state.user.id}).select('id').single();
    if(r.error)throw r.error;
    saved=true;
    const chartId=d.id||r.data?.id;
    const existingChart=d.id?(state.charts||[]).find(x=>String(x.id)===String(d.id)):null;
    if(chartId&&row.is_published&&(!d.id||!existingChart?.is_published)){
      await sendStudentPush24K({type:'chart',content_id:chartId,event_key:`chart:new:${chartId}`,title:`New ${mentorDisplaySymbol(row.symbol)} Chart Analysis`,message:`${row.title}${row.timeframe?' · '+row.timeframe:''}`,url:`/student/charts/?push=${encodeURIComponent(chartId)}`,image_url:row.image_url||null})
    }
    if(image&&oldImage&&image!==oldImage)await removeContentAsset(oldImage);
    resetMentorEditor('chart');
    closeModals();
    toast(d.id?'Chart updated successfully.':'Chart uploaded and published successfully.');
    await load()
  }catch(err){
    if(image&&!saved)await removeContentAsset(image);
    toast(err.message||'Could not save chart. Check image permissions and try again.')
  }finally{
    b.disabled=false;b.innerHTML=oldButton
  }
}
function fillMentorArticleForm(form,x,desktop=false){
  if(!form)return;
  form.elements.id.value=x.id;
  form.elements.existing_cover.value=x.cover_url||'';
  form.elements.title.value=x.title||'';
  if(form.elements.slug)form.elements.slug.value=x.slug||'';
  if(form.elements.category)form.elements.category.value=x.category||'';
  if(form.elements.excerpt)form.elements.excerpt.value=x.excerpt||'';
  if(form.elements.content)form.elements.content.value=x.content||'';
  if(form.elements.content_roman)form.elements.content_roman.value=x.content_roman||'';
  if(form.elements.is_published)form.elements.is_published.checked=Boolean(x.is_published)
}
function editArticle(id){
  const x=state.articles.find(v=>v.id===id);if(!x)return;
  const mobile=$('#mentorArticleForm'),desktop=$('#mentorArticleDesktopForm');
  fillMentorArticleForm(mobile,x,false);fillMentorArticleForm(desktop,x,true);
  syncArticleEditorUI();
  syncEditorFileLabel('article',x.cover_url?{name:'Current cover image retained'}:null);
  const mt=$('#mentorArticleModalTitle');if(mt)mt.textContent='Edit Article';
  const dt=$('#mentorArticleDesktopModalTitle');if(dt)dt.textContent='Edit Article';
  openModal('article')
}
async function saveArticle(e){
  e.preventDefault();
  const f=e.currentTarget,b=f.querySelector('button[type=submit]'),d=Object.fromEntries(new FormData(f)),desktop=f.id==='mentorArticleDesktopForm',published=Boolean(f.elements.is_published?.checked),oldCover=String(d.existing_cover||'');
  const existing=state.articles.find(x=>String(x.id)===String(d.id));
  let cover=null,saved=false;
  b.disabled=true;
  const oldButton=b.innerHTML;
  b.innerHTML=desktop?`<i class="fa-solid fa-spinner fa-spin"></i> ${d.id?'Updating article...':'Saving article...'}`:oldButton;
  try{
    cover=await upload(f.elements.cover.files?.[0]||null,'articles');
    const title=String(d.title||'').trim(),content=String(d.content||'').trim(),contentRoman=String(d.content_roman||'').trim();
    if(!title)throw new Error('Article title is required.');
    if(!content)throw new Error('English content is required.');
    if(!contentRoman)throw new Error('Roman English content is required.');

    const cleanText=content.replace(/\s+/g,' ').trim();
    const autoExcerpt=cleanText.length>180?`${cleanText.slice(0,177).trim()}...`:cleanText;
    const row={
      title,
      slug:existing?.slug||`${slug(title)}-${Date.now().toString().slice(-5)}`,
      category:existing?.category||'General',
      excerpt:autoExcerpt||null,
      content,
      content_roman:contentRoman,
      content_language:'english',
      cover_url:cover||oldCover||null,
      is_published:published
    };
    if(!d.id)row.published_at=published?new Date().toISOString():null;
    else row.published_at=published?(existing?.published_at||new Date().toISOString()):null;

    let r;
    if(d.id)r=await sb.from('articles').update(row).eq('id',d.id);
    else r=await sb.from('articles').insert({...row,created_by:state.user.id}).select('id').single();
    if(r.error)throw r.error;
    saved=true;
    const articleId=d.id||r.data?.id;
    if(articleId&&published&&(!d.id||!existing?.is_published)){
      await sendStudentPush24K({type:'article',content_id:articleId,event_key:`article:new:${articleId}`,title:`New Article: ${title}`,message:autoExcerpt||'A new learning article is available.',url:`/student/articles/?push=${encodeURIComponent(articleId)}`,image_url:row.cover_url||null})
    }
    if(cover&&oldCover&&cover!==oldCover)await removeContentAsset(oldCover);
    resetMentorEditor('article');
    closeModals();
    toast(d.id?'Article updated successfully.':published?'Article published successfully.':'Article saved as draft.');
    await load()
  }catch(err){
    if(cover&&!saved)await removeContentAsset(cover);
    toast(err.message||'Could not save article.')
  }finally{
    b.disabled=false;b.innerHTML=oldButton
  }
}
async function del(table,id,label){const ok=await mentorAskAction({title:`Delete ${label}?`,eyebrow:'CONFIRM DELETE',message:`Delete this ${label} permanently?`,hint:'This action cannot be undone.',confirmText:'Delete',danger:true});if(!ok)return;const source=table==='charts'?state.charts:table==='articles'?state.articles:table==='mentor_banners'?state.banners:[],item=source.find(x=>String(x.id)===String(id)),media=item?.image_url||item?.cover_url||null;let query=sb.from(table).delete().eq('id',id);const r=await query;if(r.error)throw r.error;if(media)await removeContentAsset(media);toast(`${label} deleted.`);await load()}
async function logout(){await auditMentor('mentor_logout','success',{view:(location.hash||'#performance').slice(1)});await sb?.auth.signOut();location.href='/mentor-login.html'}
document.addEventListener('change',e=>{
  if(e.target.matches('#mentorChartForm input[name="image"]')){syncEditorFileLabel('chart',e.target.files?.[0]||null);return}
  if(e.target.matches('#mentorChartDesktopForm input[name="image"]')){renderMentorChartPreview(e.target.files?.[0]||null);return}
  if(e.target.matches('#mentorArticleForm input[name="cover"]')){syncEditorFileLabel('article',e.target.files?.[0]||null);return}
  if(e.target.matches('#mentorArticleForm input[name="is_published"]')){syncArticleEditorUI();return}
});
if(!window.__24K_MENTOR_MODAL_BACK__){
  window.__24K_MENTOR_MODAL_BACK__=true;
  window.addEventListener('popstate',()=>{
    if(document.querySelector('.mentor-modal.open'))closeModals(true);
  });
}
document.addEventListener('click',e=>{const actionCancel=e.target.closest('[data-mentor-action-cancel]');if(actionCancel){e.preventDefault();settleMentorAction(null);return}const actionConfirm=e.target.closest('[data-mentor-action-confirm]');if(actionConfirm){e.preventDefault();const wrap=$('#mentorActionInputWrap'),input=$('#mentorActionInput');if(wrap&&!wrap.hidden){const value=String(input?.value||'').trim();if(!value)return toast('Enter a value.');settleMentorAction(value)}else settleMentorAction(true);return}const signalTabButton=e.target.closest('[data-signal-tab]');if(signalTabButton){e.preventDefault();e.stopPropagation();const next=String(signalTabButton.dataset.signalTab||'active');state.signalTab=['active','history','report'].includes(next)?next:'active';document.querySelectorAll('[data-signal-tab]').forEach(x=>x.classList.toggle('active',x.dataset.signalTab===state.signalTab));renderSignals();return}const courseEdit=e.target.closest('[data-edit-course]');if(courseEdit){e.preventDefault();openMentorCourseEditor(courseEdit.dataset.editCourse,false);return}const courseSessionsEdit=e.target.closest('[data-edit-course-sessions]');if(courseSessionsEdit){e.preventDefault();openMentorCourseEditor(courseSessionsEdit.dataset.editCourseSessions,true);return}const addCourseSession=e.target.closest('[data-add-mentor-course-session]');if(addCourseSession){e.preventDefault();const box=$('#mentorCourseSessionEditor');if(box){const count=box.querySelectorAll('[data-mentor-course-session-row]').length;box.insertAdjacentHTML('beforeend',mentorCourseSessionTemplate({},count));box.lastElementChild?.scrollIntoView({behavior:'smooth',block:'nearest'})}return}const removeCourseSession=e.target.closest('[data-remove-mentor-course-session]');if(removeCourseSession){e.preventDefault();const row=removeCourseSession.closest('[data-mentor-course-session-row]'),box=$('#mentorCourseSessionEditor');if(row&&box){if(box.querySelectorAll('[data-mentor-course-session-row]').length<=1)return toast('At least one class is required.');row.remove()}return}const install=e.target.closest('#mentorInstallButton');if(install){e.preventDefault();(async()=>{if(mentorStandalone())return toast('Mentor App is already installed.','success');if(mentorInstallPrompt){mentorInstallPrompt.prompt();const choice=await mentorInstallPrompt.userChoice;if(choice?.outcome==='accepted')toast('Installing 24K Mentor App…','success');mentorInstallPrompt=null;updateMentorInstall();return}const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);toast(ios?'Use Share → Add to Home Screen to install the app.':'Use your browser menu → Install app / Add to Home screen.','info')})().catch(()=>{});return}const preset=e.target.closest('[data-note-preset]');if(preset){const f=$('#mentorSignalForm'),ta=f?.elements.notes;if(!ta)return;$$('[data-note-preset]').forEach(x=>x.classList.toggle('active',x===preset));if(preset.dataset.notePreset==='custom'){ta.value='';ta.focus()}else{ta.value=preset.dataset.notePreset}return}const copySignal=e.target.closest('[data-copy-signal]');if(copySignal){const s=(state.signals||[]).find(x=>String(x.id)===String(copySignal.dataset.copySignal));if(s){const text=[`${s.symbol} — ${signalTypeLabel(s)}`,`Entry: ${s.entry_from}${s.entry_to!=null?' - '+s.entry_to:''}`,`SL: ${s.stop_loss}`,`TP1: ${s.take_profit_1??'—'}`,`TP2: ${s.take_profit_2??'—'}`,`TP3: ${s.take_profit_3??'—'}`,`TP4: ${s.take_profit_4??'—'}`,s.notes?`Note: ${s.notes}`:''].filter(Boolean).join('\n');navigator.clipboard?.writeText(text).then(()=>toast('Signal copied.')).catch(()=>toast('Could not copy signal.'))}return}const noteSignal=e.target.closest('[data-note-signal]');if(noteSignal){const s=(state.signals||[]).find(x=>String(x.id)===String(noteSignal.dataset.noteSignal));toast(s?.notes||'No note added.');return}const toggleSignalRow=e.target.closest('[data-toggle-signal-row]');if(toggleSignalRow){const card=toggleSignalRow.closest('.mentor-signal-mobile-card');if(!card)return;const wasOpen=card.classList.contains('is-open');document.querySelectorAll('.mentor-signal-mobile-card.is-open').forEach(x=>{x.classList.remove('is-open');x.querySelector('[data-toggle-signal-row]')?.setAttribute('aria-expanded','false');x.querySelector('.mentor-signal-row-dropdown')?.setAttribute('aria-hidden','true')});if(!wasOpen){card.classList.add('is-open');toggleSignalRow.setAttribute('aria-expanded','true');card.querySelector('.mentor-signal-row-dropdown')?.setAttribute('aria-hidden','false')}return}const viewSignal=e.target.closest('[data-view-signal]');if(viewSignal){renderSignalDetail(viewSignal.dataset.viewSignal);return}const openFilters=e.target.closest('[data-open-signal-filters]');if(openFilters){const ids=[['mentorMobileSignalPair','mentorSignalPairFilter'],['mentorMobileSignalType','mentorSignalTypeFilter'],['mentorMobileSignalStatus','mentorSignalStatusFilter'],['mentorMobileSignalFrom','mentorSignalFrom'],['mentorMobileSignalTo','mentorSignalTo']];ids.forEach(([a,b])=>{const A=$('#'+a),B=$('#'+b);if(A&&B)A.value=B.value});openModal('signalFilter');return}const applyFilters=e.target.closest('[data-apply-signal-filters]');if(applyFilters){state.signalPeriod='custom';const ids=[['mentorSignalPairFilter','mentorMobileSignalPair'],['mentorSignalTypeFilter','mentorMobileSignalType'],['mentorSignalStatusFilter','mentorMobileSignalStatus'],['mentorSignalFrom','mentorMobileSignalFrom'],['mentorSignalTo','mentorMobileSignalTo']];ids.forEach(([a,b])=>{const A=$('#'+a),B=$('#'+b);if(A&&B)A.value=B.value});closeModals();renderSignals();syncSignalPeriodButtons();focusFilteredSignalResults();return}const resetFilters=e.target.closest('[data-reset-signal-filters]');if(resetFilters){for(const id of ['mentorSignalSearch','mentorSignalFrom','mentorSignalTo','mentorMobileSignalFrom','mentorMobileSignalTo']){const el=$('#'+id);if(el)el.value=''}for(const id of ['mentorSignalPairFilter','mentorSignalTypeFilter','mentorSignalStatusFilter','mentorMobileSignalPair','mentorMobileSignalType','mentorMobileSignalStatus']){const el=$('#'+id);if(el)el.value='all'}state.signalFilters={q:'',pair:'all',type:'all',status:'all',from:'',to:''};state.signalPeriod='all';renderSignals();syncSignalPeriodButtons();focusFilteredSignalResults();return}const quickDate=e.target.closest('[data-apply-quick-date]');if(quickDate){state.signalPeriod='custom';syncSignalPeriodButtons();toggleSignalCustomDate(false);renderSignals();focusFilteredSignalResults();return}const period=e.target.closest('[data-signal-period]');if(period){setSignalPeriod(period.dataset.signalPeriod);return}const cp=e.target.closest('[data-chart-period]');if(cp){setChartPeriod(cp.dataset.chartPeriod);return}const ccf=e.target.closest('[data-clear-chart-filters]');if(ccf){clearChartFilters();return}const vc=e.target.closest('[data-view-chart]');if(vc){e.preventDefault();openMentorChartViewer(vc.dataset.viewChart);return}const sc=e.target.closest('[data-share-chart]');if(sc){shareChart(sc.dataset.shareChart).catch(x=>toast(x.message||'Could not share chart.'));return}const ap=e.target.closest('[data-article-period]');if(ap){setArticlePeriod(ap.dataset.articlePeriod);return}const caf=e.target.closest('[data-clear-article-filters]');if(caf){clearArticleFilters();return}const v=e.target.closest('[data-mentor-view]');if(v){e.preventDefault();closeModals();showView(v.dataset.mentorView);return}const o=e.target.closest('[data-open-mentor-modal]');if(o){resetMentorEditor(o.dataset.openMentorModal);openModal(o.dataset.openMentorModal);return}if(e.target.closest('[data-close-mentor-modal]'))return closeModals();const sa=e.target.closest('[data-signal-action]');if(sa)signalAction(sa.dataset.id,sa.dataset.signalAction).catch(x=>toast(x.message));const es=e.target.closest('[data-edit-signal]');if(es)editSignal(es.dataset.editSignal);const ec=e.target.closest('[data-edit-chart]');if(ec)editChart(ec.dataset.editChart);const dc=e.target.closest('[data-delete-chart]');if(dc)del('charts',dc.dataset.deleteChart,'chart').catch(x=>toast(x.message));const ea=e.target.closest('[data-edit-article]');if(ea)editArticle(ea.dataset.editArticle);const da=e.target.closest('[data-delete-article]');if(da)del('articles',da.dataset.deleteArticle,'article').catch(x=>toast(x.message));const eb=e.target.closest('[data-edit-banner]');if(eb)editBanner(eb.dataset.editBanner);const db=e.target.closest('[data-delete-banner]');if(db)del('mentor_banners',db.dataset.deleteBanner,'banner').catch(x=>toast(x.message));const en=e.target.closest('[data-edit-announcement]');if(en)editAnnouncement(en.dataset.editAnnouncement);const dn=e.target.closest('[data-delete-announcement]');if(dn)del('announcements',dn.dataset.deleteAnnouncement,'announcement').catch(x=>toast(x.message));const pv=e.target.closest('[data-article-preview-lang]');if(pv){renderMentorArticlePreview(pv.dataset.articlePreviewLang||'english');return}const va=e.target.closest('[data-view-article]');if(va){openMentorArticlePreview(va.dataset.viewArticle);return}});
$('#mentorCourseForm')?.addEventListener('submit',saveMentorCourse);$('#mentorSignalForm')?.addEventListener('submit',saveSignal);$('#mentorSignalForm')?.addEventListener('input',renderMentorPipPreview);$('#mentorSignalForm')?.addEventListener('change',renderMentorPipPreview);$('#mentorChartForm')?.addEventListener('submit',saveChart);$('#mentorChartDesktopForm')?.addEventListener('submit',saveChart);bindMentorChartInstrumentPicker();$('#mentorArticleForm')?.addEventListener('submit',saveArticle);$('#mentorArticleDesktopForm')?.addEventListener('submit',saveArticle);$('#mentorBannerForm')?.addEventListener('submit',saveBanner);$('#mentorAnnouncementForm')?.addEventListener('submit',saveAnnouncement);$('#mentorLogout')?.addEventListener('click',logout);$('#mentorProfileLogout')?.addEventListener('click',logout);function mentorRefresh(btn){if(btn?.classList.contains('is-loading'))return;btn?.classList.add('is-loading');document.body.classList.add('mentor-refreshing');auditMentor('mentor_refresh','success',{view:(location.hash||'#performance').slice(1)});load().then(()=>toast('Updated')).catch(e=>toast(e.message)).finally(()=>{btn?.classList.remove('is-loading');document.body.classList.remove('mentor-refreshing')})}
$('#mentorMenuToggle')?.addEventListener('click',openMentorMenu);$('#mentorMenuClose')?.addEventListener('click',closeMentorMenu);$('#mentorSidebarOverlay')?.addEventListener('click',closeMentorMenu);
$('#mentorRefresh')?.addEventListener('click',e=>mentorRefresh(e.currentTarget));$('#mentorTopRefresh')?.addEventListener('click',e=>mentorRefresh(e.currentTarget));$('#mentorMonthSelect')?.addEventListener('change',e=>setPerformanceMonth(e.currentTarget.value));$('#mentorMonthPrev')?.addEventListener('click',()=>shiftPerformanceMonth(-1));$('#mentorMonthNext')?.addEventListener('click',()=>shiftPerformanceMonth(1));$('#mentorThisMonth')?.addEventListener('click',()=>setPerformanceMonth(performanceMonthKey(new Date())));$('#mentorTheme')?.addEventListener('click',()=>applyMentorTheme(document.documentElement.dataset.theme==='light'?'dark':'light'));['#mentorSignalSearch','#mentorSignalPairFilter','#mentorSignalTypeFilter','#mentorSignalStatusFilter','#mentorSignalFrom','#mentorSignalTo'].forEach(s=>$(s)?.addEventListener('input',()=>{if(s==='#mentorSignalFrom'||s==='#mentorSignalTo'){state.signalPeriod='custom'}renderSignals();syncSignalPeriodButtons()}));['#mentorSignalPairFilter','#mentorSignalTypeFilter','#mentorSignalStatusFilter'].forEach(s=>$(s)?.addEventListener('change',()=>{renderSignals();syncSignalPeriodButtons();focusFilteredSignalResults()}));['#mentorSignalFrom','#mentorSignalTo'].forEach(s=>$(s)?.addEventListener('change',()=>{state.signalPeriod='custom';renderSignals();syncSignalPeriodButtons()}));$('#mentorChartSearch')?.addEventListener('input',renderCharts);['#mentorChartPair','#mentorChartSort'].forEach(s=>$(s)?.addEventListener('change',()=>{renderCharts();syncChartControls()}));$('#mentorArticleSearch')?.addEventListener('input',renderArticles);['#mentorArticleCategory','#mentorArticleStatus','#mentorArticleSort'].forEach(s=>$(s)?.addEventListener('change',()=>{renderArticles();syncArticleControls()}));$$('.mentor-modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModals()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMentorMenu()});
window.addEventListener('resize',()=>{if(window.innerWidth>760)closeMentorMenu()});
if(localStorage.getItem('mentor-theme-v1220')!=='1'){localStorage.setItem('mentor-theme','light');localStorage.setItem('mentor-theme-v1220','1')}
const theme=localStorage.getItem('mentor-theme');applyMentorTheme(theme||'light');
load().then(()=>{subscribeMentorRealtime();let h=(location.hash||'#performance').slice(1);if(h==='more')h='settings';if(!document.querySelector(`[data-mentor-panel="${CSS.escape(h)}"]`))h='performance';showView(h)}).catch(err=>{console.error(err);toast(err.message||'Could not load Mentor Panel.');$('#mentorLoading').innerHTML='<div class="mentor-login-card"><h2>Could not load Mentor Panel</h2><p>Please refresh or sign in again.</p><a class="mentor-btn gold" href="/mentor-login.html" style="display:grid;place-items:center;text-decoration:none">Mentor Login</a></div>'});
})();

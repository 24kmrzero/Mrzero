(function(){
'use strict';
const A=window.App;
if(!A?.supabase)return;
const sb=A.supabase,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>A.escapeHtml(v??'');
const attr=v=>esc(v).replace(/"/g,'&quot;');
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const state={team:[],links:[],courses:[],premium:null,activeLink:null};
let linkType='normal';
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function toast(m,t='info'){A.toast?.(m,t)}
async function rpc(name,args={}){const r=await sb.rpc(name,args);if(r.error)throw r.error;return r.data}
async function one(q){const r=await q;if(r.error)throw r.error;return r.data}
function openModal(id){A.openModal?.(id)}function closeModal(id){A.closeModal?.(id)}
function normPath(v){const s=String(v||'/').trim()||'/';return s==='/'?'/':`/${s.replace(/^\/+|\/+$/g,'')}/`}
function refCode(name){return `${String(name||'link').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,28)||'link'}-${Date.now().toString(36).slice(-5)}`}
function initials(v){return String(v||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()}
function fmtDateTime(v){return v?new Date(v).toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'}
function isFreeCourse(c){return String(c?.course_type||'').toLowerCase()==='free'||Number(c?.discount_price??c?.price??0)===0}
function linkUrl(l){const u=new URL(normPath(l.destination_path||'/'),location.origin);u.searchParams.set('ref',l.ref_code);if(l.source)u.searchParams.set('source',l.source);if(l.campaign)u.searchParams.set('campaign',l.campaign);if(l.course_slug)u.searchParams.set('course',l.course_slug);return u.toString()}
function leadOwner(l){const teams=Array.isArray(l.assigned_teams)?l.assigned_teams:[];if(l.round_robin)return 'Auto Distribute';return teams[0]?.display_name||'Auto Distribute'}

function installContentHub(){
 const content=$('.app-content');if(!content||$('#p-content'))return;
 const s=document.createElement('section');s.className='panel';s.id='p-content';s.innerHTML=`
  <div class="panel-heading"><div><h2>Content</h2><p>Signals, charts, articles and announcements — all in one place.</p></div></div>
  <div class="admin-hub-grid">
   ${[['signals','fa-bolt','Signals','Create, update and close trading signals.'],['charts','fa-chart-line','Charts','Upload market charts and educational analysis.'],['articles','fa-newspaper','Articles','Write and publish educational articles.'],['announcements','fa-bullhorn','Announcements','Send important updates to students.']].map(([k,i,t,d])=>`<button type="button" class="app-card admin-hub-card" data-goto="${k}"><span class="hub-icon"><i class="fa-solid ${i}"></i></span><h3>${t}</h3><p>${d}</p></button>`).join('')}
  </div>`;
 content.insertBefore(s,$('#p-signals'));
}

function teamLinksHtml(){return `
 <div class="panel-heading link-hub-hero">
  <div>
   <span class="link-hub-kicker"><i class="fa-solid fa-people-group"></i> TEAM OPERATIONS</span>
   <h2>Team Accounts</h2>
   <p>Manage Team accounts, WhatsApp details, account access and lead routing from one workspace.</p>
   <small>TEAM CONTROL CENTER</small>
  </div>
  <div class="v14-panel-head-actions link-hub-head-actions"><a class="app-btn outline" href="/admin/team-performance/"><i class="fa-solid fa-chart-column"></i> Team Performance</a></div>
 </div>
 <div id="v14TeamKpis" class="v14-kpis link-hub-kpis"></div>
 <div class="v14-subpanel link-hub-section on" data-v14-team-panel="team">
  <div class="panel-heading compact-heading link-section-head"><div><span class="link-section-eyebrow">TEAM ACCOUNTS</span><h3>Team Members</h3><p>People who can receive and manage new leads.</p></div><button class="app-btn gold" type="button" id="v14AddTeam"><i class="fa-solid fa-user-plus"></i> Add Team Member</button></div>
  <div class="filter-row link-team-search"><i class="fa-solid fa-magnifying-glass"></i><input id="v14TeamSearch" type="search" placeholder="Search by name, username, email or WhatsApp..."></div>
  <div id="v14TeamList" class="link-team-list"></div>
 </div>`}
function installTeamLinks(){const p=$('#p-links');if(!p)return;p.innerHTML=teamLinksHtml();}

function premiumHtml(){return `
 <div class="panel-heading premium-access-command"><div><span class="premium-access-kicker"><i class="fa-solid fa-crown"></i> PREMIUM OPERATIONS</span><h2>Premium Access</h2><p>Manage premium students, access requests and broker-linked approvals from one clear workspace.</p><small>PREMIUM CONTROL CENTER</small></div><div class="v14-panel-head-actions premium-access-actions"><button type="button" class="app-btn gold" id="v14GrantPremium"><i class="fa-solid fa-crown"></i> Grant Access</button><button type="button" class="app-btn outline" id="v14PremiumSettings"><i class="fa-solid fa-gear"></i> Settings</button></div></div>
 <div id="v14PremiumKpis" class="v14-kpis premium-access-kpis"></div>
 <div class="v14-tabs premium-access-tabs"><button class="on" type="button" data-v14-prem-tab="users"><i class="fa-solid fa-users"></i> Premium Users</button><button type="button" data-v14-prem-tab="requests"><i class="fa-solid fa-list-check"></i> Requests</button></div>
 <div class="v14-subpanel premium-users-panel on" data-v14-prem-panel="users"><div class="premium-course-filter-shell"><div class="premium-course-filter-copy"><b>Course Filter</b><small>Filter premium users by enrolled course.</small></div><div class="premium-course-filters" id="v14PremiumCourseFilters"></div></div><div class="filter-row premium-users-toolbar"><input id="v14PremiumSearch" type="search" placeholder="Search name or email..."><select id="v14PremiumFilter"><option value="all">All Students</option><option value="active">Active Premium</option><option value="inactive">No Active Access</option></select></div><div class="table-scroll premium-users-table-shell"><table class="admin-table premium-users-table"><thead><tr><th>Student</th><th>Access</th><th>Expires</th><th>Days Left</th><th>Actions</th></tr></thead><tbody id="v14PremiumUsers"></tbody></table></div></div>
 <div class="v14-subpanel premium-requests-panel" data-v14-prem-panel="requests"><div class="premium-request-filterbar"><div class="premium-request-filtercopy"><b>Request Review</b><small>Filter premium payment and broker requests by decision status.</small></div><div class="premium-request-statuses"><button type="button" class="on" data-v14-request-status="all">All <b id="v14ReqAll">0</b></button><button type="button" data-v14-request-status="pending">Pending <b id="v14ReqPending">0</b></button><button type="button" data-v14-request-status="approved">Approved <b id="v14ReqApproved">0</b></button><button type="button" data-v14-request-status="rejected">Rejected <b id="v14ReqRejected">0</b></button></div></div><div class="app-grid cols-2 premium-request-grid"><div class="app-card premium-request-card"><div class="app-card-head"><div><span class="premium-request-icon"><i class="fa-solid fa-receipt"></i></span><h3>Premium Payments</h3><p>Review premium payment submissions and decisions.</p></div></div><div id="v14PremiumPayments" class="v14-prem-list"></div></div><div class="app-card premium-request-card"><div class="app-card-head"><div><span class="premium-request-icon"><i class="fa-solid fa-building-columns"></i></span><h3>IB / Broker Requests</h3><p>Review broker verification requests and decisions.</p></div></div><div id="v14PremiumIb" class="v14-prem-list"></div></div></div></div>`}
function installPremium(){const p=$('#p-premium-access');if(!p)return;p.innerHTML=premiumHtml();}

function installOperations(){
 const content=$('.app-content');if(!content||$('#p-operations'))return;
 const p=document.createElement('section');p.className='panel';p.id='p-operations';p.innerHTML=`
 <div class="panel-heading"><div><h2>Operations</h2><p>Advanced business tools stay separate from daily Admin work.</p></div></div>
 <div class="ops-hub-grid">
 ${[['finance','fa-coins','Finance & Accounts','Income, expenses, salaries and partner payouts.'],['ea','fa-microchip','EA & Indicators','Products, requests and licensed file delivery.'],['mentors','fa-chalkboard-user','Mentor Access','Control mentor permissions.'],['desk','fa-comments','Live Desk','Customer conversations and support handoff.']].map(([v,i,t,d])=>`<a class="app-card admin-hub-card" href="/admin/operations/advanced/?view=${v}"><span class="hub-icon"><i class="fa-solid ${i}"></i></span><h3>${t}</h3><p>${d}</p></a>`).join('')}
 <button type="button" class="app-card admin-hub-card" data-goto="audit"><span class="hub-icon"><i class="fa-solid fa-clock-rotate-left"></i></span><h3>Activity Logs</h3><p>Review important Admin and platform activity.</p></button>
 <a class="app-card admin-hub-card" href="/admin/operations/advanced/"><span class="hub-icon"><i class="fa-solid fa-sliders"></i></span><h3>Advanced Tools</h3><p>Enrollments, batches, client ownership, access control and campaigns.</p></a>
 </div>`;
 content.appendChild(p);
}

function installNav(){
 if(document.querySelector('script[src*="v1218-admin-reference.js"]'))return;
 const nav=$('.app-nav');if(!nav)return;
 nav.innerHTML=`
  <a href="/admin/" data-panel="dashboard"><i class="fa-solid fa-gauge-high"></i> Dashboard</a>
  <a href="/admin/content/" data-panel="content"><i class="fa-solid fa-layer-group"></i> Content</a>
  <a href="/admin/courses/" data-panel="courses"><i class="fa-solid fa-graduation-cap"></i> Courses</a>
  <a href="/admin/students/" data-panel="students"><i class="fa-solid fa-users"></i> Students</a>
  <a href="/admin/payments/" data-panel="payments"><i class="fa-solid fa-receipt"></i> Payments <span class="nav-count" id="pendingPaymentCount">0</span></a>
  <a href="/admin/team-manager/" data-panel="links"><i class="fa-solid fa-people-group"></i> Team & Links</a>
  <a href="/admin/premium-access/" data-panel="premium-access"><i class="fa-solid fa-crown"></i> Premium</a>
  <a href="/admin/support/" data-panel="support"><i class="fa-solid fa-headset"></i> Support</a>
  <a href="/admin/operations/" data-panel="operations"><i class="fa-solid fa-briefcase"></i> Operations</a>`;
 const sub=$('.app-title small');if(sub)sub.textContent='Simple control panel for daily Admin work';
}
function syncGroupedNav(key){
 const group={signals:'content',charts:'content',articles:'content',announcements:'content',sessions:'courses',methods:'payments',audit:'operations','admin-notifications':'dashboard'}[key]||key;
 $$('.app-nav [data-panel]').forEach(a=>a.classList.toggle('on',a.dataset.panel===group));
}

function installQuickAdd(){
 const top=$('.app-topbar');if(!top||$('#adminQuickAddWrap'))return;
 const wrap=document.createElement('div');wrap.id='adminQuickAddWrap';wrap.innerHTML=`<button type="button" class="app-btn small gold v14-top-add" id="adminQuickAdd"><i class="fa-solid fa-plus"></i> <span>Add</span></button><div class="admin-quick-menu" id="adminQuickMenu"><button data-v14-quick="signal"><i class="fa-solid fa-bolt"></i> New Signal</button><button data-v14-quick="course"><i class="fa-solid fa-graduation-cap"></i> New Course</button><button data-v14-quick="team"><i class="fa-solid fa-user-plus"></i> Team Member</button><button data-v14-quick="link"><i class="fa-solid fa-link"></i> Create Link</button><button data-v14-quick="announcement"><i class="fa-solid fa-bullhorn"></i> Announcement</button></div>`;
 const theme=$('.app-theme-toggle');top.insertBefore(wrap,theme||$('.app-notify'));
}

function installModals(){if($('#v14TeamModal'))return;document.body.insertAdjacentHTML('beforeend',`
 <div class="app-modal" id="v14TeamModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3 id="v14TeamModalTitle">Add Team Member</h3><small class="muted">Only the details needed for Team login and lead routing.</small></div><button class="modal-close" data-close-modal="v14TeamModal"><i class="fa-solid fa-xmark"></i></button></div><form id="v14TeamForm"><input type="hidden" name="team_id"><div class="app-modal-body"><div class="form-grid"><div class="form-field"><label>Name</label><input name="display_name" required></div><div class="form-field"><label>Greeting</label><select name="salutation" required><option value="">Select Sir / Miss</option><option value="Sir">Sir</option><option value="Miss">Miss</option></select></div><div class="form-field"><label>Username</label><input name="username" required></div><div class="form-field"><label>WhatsApp</label><input name="whatsapp" placeholder="+60..."></div><div class="form-field"><label>Email <span class="muted">optional</span></label><input name="email" type="email"></div><div class="form-field full"><label>Password</label><input name="password" type="password" autocomplete="new-password" placeholder="Required for new account"></div><div class="form-field full"><details class="v14-advanced"><summary>Account Settings</summary><div><label class="check-row"><input name="receive_leads" type="checkbox" checked> Accept New Leads</label><label class="check-row"><input name="is_active" type="checkbox" checked> Account Active</label></div></details></div></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="v14TeamModal">Cancel</button><button class="app-btn gold" type="submit">Save Team Member</button></div></form></div></div>
 <div class="app-modal premium-link-modal" id="v14LinkModal"><div class="app-modal-card large premium-link-card">
   <div class="app-modal-head premium-link-head">
    <div><span class="premium-link-kicker"><i class="fa-solid fa-link"></i> TRACKED LINK BUILDER</span><h3 id="v14LinkModalTitle">Create Link</h3><small class="muted">Choose the link type, destination and lead routing. Technical tracking is automatic.</small></div>
    <button class="modal-close" data-close-modal="v14LinkModal" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
   </div>
   <form id="v14LinkForm"><input type="hidden" name="id"><input type="hidden" name="ref_code"><input type="hidden" name="link_type" value="normal">
    <div class="app-modal-body premium-link-body">
     <div class="premium-link-layout">
      <div class="premium-link-main">
       <section class="premium-link-section">
        <div class="premium-link-section-head"><span>01</span><div><h4>Link Type</h4><p>Choose how this link will be used.</p></div></div>
        <div class="v14-choice-grid premium-link-choice-grid">
         <button type="button" class="v14-choice on" data-v14-link-type="normal"><span class="premium-choice-icon"><i class="fa-solid fa-share-nodes"></i></span><div><b>Normal Link</b><small>WhatsApp, referral or direct sharing</small></div><i class="fa-solid fa-circle-check premium-choice-check"></i></button>
         <button type="button" class="v14-choice" data-v14-link-type="ad"><span class="premium-choice-icon"><i class="fa-solid fa-bullseye"></i></span><div><b>Ad Link</b><small>Meta, TikTok, YouTube or paid campaigns</small></div><i class="fa-solid fa-circle-check premium-choice-check"></i></button>
        </div>
       </section>

       <section class="premium-link-section">
        <div class="premium-link-section-head"><span>02</span><div><h4>Link Details</h4><p>Give the link a clear internal name.</p></div></div>
        <div class="form-grid">
         <div class="form-field full"><label>Link Name</label><input name="name" required placeholder="e.g. Hassan WhatsApp or Meta Level 1"><small class="premium-field-help">Use a name you can recognise later in reports.</small></div>
        </div>
       </section>

       <section class="premium-link-section">
        <div class="premium-link-section-head"><span>03</span><div><h4>Destination & Source</h4><p>Choose where the visitor lands and where traffic comes from.</p></div></div>
        <div data-v14-normal-fields class="form-field full"><div class="form-grid"><div class="form-field"><label>Send Visitor To</label><select name="normal_destination"><option value="/sign-up/">Sign Up</option><option value="/">Home</option><option value="/courses/">Courses</option><option value="/free-course/">Free Course Form</option></select></div><div class="form-field"><label>Shared On</label><select name="normal_source"><option>WhatsApp</option><option>Instagram</option><option>Facebook</option><option>TikTok</option><option>YouTube</option><option>Direct</option><option>Other</option></select></div></div></div>
        <div data-v14-ad-fields class="form-field full" style="display:none"><div class="form-grid"><div class="form-field"><label>Select Course</label><select name="course_id" id="v14LinkCourse"><option value="">Select Course</option></select></div><div class="form-field"><label>Ad Platform</label><select name="ad_source"><option>Meta Ads</option><option>TikTok Ads</option><option>YouTube Ads</option><option>Google Ads</option><option>Other</option></select></div><div class="form-field full"><label>Campaign Name</label><input name="campaign" placeholder="e.g. Pakistan Level 1 Campaign"><small class="premium-field-help">This appears in analytics and attribution.</small></div></div></div>
       </section>

       <section class="premium-link-section">
        <div class="premium-link-section-head"><span>04</span><div><h4>Lead Routing</h4><p>Choose who receives leads generated from this link.</p></div></div>
        <div class="form-grid">
         <div class="form-field full"><label>Lead Goes To</label><select name="lead_to" id="v14LeadTo"><option value="auto">Auto Distribute Between Active Team</option></select><small class="premium-field-help">Auto distribute rotates leads across Team members who have Leads ON.</small></div>
         <div class="form-field full"><details class="v14-advanced premium-link-advanced"><summary><span><i class="fa-solid fa-sliders"></i> Advanced</span><i class="fa-solid fa-chevron-down"></i></summary><div><label class="premium-toggle-row"><div><b>Link Active</b><small>Turn this off to stop new traffic without deleting the link.</small></div><span class="premium-switch"><input name="is_active" type="checkbox" checked><span></span></span></label></div></details></div>
        </div>
       </section>
      </div>

      <aside class="premium-link-preview">
       <div class="premium-link-preview-label"><span>LIVE PREVIEW</span><i class="fa-solid fa-eye"></i></div>
       <div class="premium-link-preview-card">
        <div class="premium-link-preview-top"><span id="v14PreviewType" class="normal">NORMAL LINK</span><span id="v14PreviewStatus" class="active">ACTIVE</span></div>
        <h4 id="v14PreviewName">New tracked link</h4>
        <p id="v14PreviewSummary">Sign Up · WhatsApp</p>
        <div class="premium-link-preview-meta">
         <span><i class="fa-solid fa-location-arrow"></i><b id="v14PreviewDestination">Sign Up</b></span>
         <span><i class="fa-solid fa-share-nodes"></i><b id="v14PreviewSource">WhatsApp</b></span>
         <span><i class="fa-solid fa-user-group"></i><b id="v14PreviewRouting">Auto Distribute</b></span>
        </div>
        <div class="premium-link-preview-url"><small>TRACKED URL</small><code id="v14PreviewUrl">—</code></div>
       </div>
       <div class="premium-link-preview-note"><i class="fa-solid fa-shield-halved"></i><span>Tracking parameters and lead attribution are added automatically when you save.</span></div>
      </aside>
     </div>
    </div>
    <div class="app-modal-foot premium-link-foot"><div class="premium-link-foot-note"><i class="fa-solid fa-circle-info"></i><span>Review the preview before saving.</span></div><div><button type="button" class="app-btn outline" data-close-modal="v14LinkModal">Cancel</button><button class="app-btn gold" type="submit"><i class="fa-solid fa-check"></i> Save Link</button></div></div>
   </form>
  </div></div>
 <div class="app-modal" id="v14LeadModal"><div class="app-modal-card extra-large"><div class="app-modal-head"><div><h3 id="v14LeadTitle">Link Details</h3><small class="muted" id="v14LeadSubtitle"></small></div><button class="modal-close" data-close-modal="v14LeadModal"><i class="fa-solid fa-xmark"></i></button></div><div class="app-modal-body"><div id="v14LeadKpis" class="v14-kpis"></div><div class="v14-toolbar"><select id="v14LeadRange"><option value="all">All Time</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7d">Last 7 Days</option><option value="custom">Custom Date</option></select><input id="v14LeadStart" type="date" style="display:none"><input id="v14LeadEnd" type="date" style="display:none"><select id="v14LeadTeam"><option value="">All Team</option></select><select id="v14LeadCourse"><option value="">All Courses</option></select><select id="v14LeadSource"><option value="">All Sources</option></select><button type="button" class="app-btn outline" id="v14RefreshLeads"><i class="fa-solid fa-rotate"></i> Apply</button></div><div class="table-scroll"><table class="admin-table v14-details-table"><thead><tr><th>Date & Time</th><th>Name</th><th>Email</th><th>WhatsApp</th><th>Client ID</th><th>Course</th><th>Assigned Team</th><th>Assigned Date & Time</th><th>Source</th><th>Email</th><th>Routed</th></tr></thead><tbody id="v14LeadRows"></tbody></table></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="v14LeadModal">Close</button></div></div></div>
 <div class="app-modal" id="v14GrantModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3>Grant / Extend Premium</h3><small class="muted">Student + number of access days.</small></div><button class="modal-close" data-close-modal="v14GrantModal"><i class="fa-solid fa-xmark"></i></button></div><form id="v14GrantForm"><div class="app-modal-body"><div class="form-grid"><div class="form-field full"><label>Student</label><select name="user_id" id="v14GrantStudent" required></select></div><div class="form-field"><label>Access Days</label><input name="days" type="number" min="1" value="30" required></div><div class="form-field"><label>Internal Note <span class="muted">optional</span></label><input name="note"></div></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="v14GrantModal">Cancel</button><button class="app-btn gold" type="submit">Grant / Extend</button></div></form></div></div>
 <div class="app-modal" id="v14PremiumSettingsModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3>Premium Settings</h3><small class="muted">Advanced package settings.</small></div><button class="modal-close" data-close-modal="v14PremiumSettingsModal"><i class="fa-solid fa-xmark"></i></button></div><form id="v14PremiumSettingsForm"><div class="app-modal-body"><div class="form-grid"><div class="form-field"><label>Package Mode</label><select name="package_mode"><option value="paid">Paid</option><option value="free">Free</option></select></div><div class="form-field"><label>Trial Days</label><input name="trial_days" type="number" min="0"></div><label class="check-row"><input name="trial_enabled" type="checkbox"> Free Trial Enabled</label><label class="check-row"><input name="ib_enabled" type="checkbox"> IB / Broker Access Enabled</label><div class="form-field"><label>Price PKR</label><input name="price_pkr" type="number" min="0" step="0.01"></div><div class="form-field"><label>Price USDT</label><input name="price_usdt" type="number" min="0" step="0.01"></div><div class="form-field"><label>IB Access Days</label><input name="ib_access_days" type="number" min="1"></div><div class="form-field"><label>Monthly Renewal</label><input value="30 days" readonly></div></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="v14PremiumSettingsModal">Cancel</button><button class="app-btn gold" type="submit">Save Settings</button></div></form></div></div>`)}

async function loadTeamLinks(){
 try{
  const [team,links,courses]=await Promise.all([rpc('admin_get_team_manager'),rpc('admin_get_link_performance'),one(sb.from('courses').select('*').order('display_order').order('created_at'))]);
  state.team=team?.accounts||[];state.links=links||[];state.courses=courses||[];renderTeamLinks();
 }catch(e){console.error(e);toast(A.friendlyError(e,'Could not load Team & Links.'),'error')}
}
function renderTeamLinks(){
 const active=state.team.filter(x=>x.is_active!==false).length,accepting=state.team.filter(x=>x.is_active!==false&&x.receive_leads!==false).length,leads=state.links.reduce((s,l)=>s+Number(l.signups||0),0);
 $('#v14TeamKpis').innerHTML=[['fa-user-group','Team Members',state.team.length],['fa-circle-check','Active',active],['fa-route','Accepting Leads',accepting],['fa-link','Assigned Links',state.links.length],['fa-user-plus','Total Leads',leads]].map(([i,a,b])=>`<div class="v14-kpi link-hub-kpi"><span><i class="fa-solid ${i}"></i></span><div><b>${b}</b><small>${a}</small></div></div>`).join('');
 renderTeam();fillLinkSelects();
}
function renderTeam(){const box=$('#v14TeamList');if(!box)return;const q=String($('#v14TeamSearch')?.value||'').toLowerCase(),rows=state.team.filter(a=>!q||`${a.display_name} ${a.username} ${a.email||''} ${a.whatsapp||''}`.toLowerCase().includes(q)),desktop=window.matchMedia&&window.matchMedia('(min-width: 901px)').matches;box.innerHTML=rows.length?rows.map(a=>{const links=Array.isArray(a.link_ids)?a.link_ids.length:0,leads=Number(a.total_leads||a.leads||0);if(!desktop)return `<div class="v14-person"><div class="v14-avatar">${esc(initials(a.display_name||a.username))}</div><div class="v14-person-main"><b>${esc(a.display_name||a.username)}</b><small>${a.salutation?esc(a.salutation)+' · ':''}@${esc(a.username)} · ${esc(a.whatsapp||'No WhatsApp')}</small><div class="v14-badges"><span class="v14-chip ${a.is_active!==false?'good':'bad'}">${a.is_active!==false?'Active':'Disabled'}</span><span class="v14-chip">${a.receive_leads!==false?'Accepting Leads':'Leads Off'}</span><span class="v14-chip">${links} Links</span></div></div><button class="app-btn small outline" type="button" data-v14-edit-team="${a.id}"><i class="fa-solid fa-pen"></i> Edit</button></div>`;return `<article class="v14-person v14-person-premium"><div class="v14-person-head"><div class="v14-avatar">${esc(initials(a.display_name||a.username))}</div><div class="v14-person-main"><span class="v14-team-eyebrow">TEAM MEMBER</span><b>${esc(a.display_name||a.username)}</b><small>${a.salutation?esc(a.salutation)+' · ':''}@${esc(a.username)}</small></div><span class="v14-team-status ${a.is_active!==false?'on':'off'}"><i></i>${a.is_active!==false?'Active':'Disabled'}</span></div><div class="v14-team-contact"><span><i class="fa-brands fa-whatsapp"></i>${esc(a.whatsapp||'No WhatsApp')}</span><span><i class="fa-regular fa-envelope"></i>${esc(a.email||'No email')}</span></div><div class="v14-team-metrics"><div><small>LEADS</small><b>${leads}</b></div><div><small>LINKS</small><b>${links}</b></div><div><small>ROUTING</small><b>${a.receive_leads!==false?'ON':'OFF'}</b></div></div><div class="v14-team-foot"><span class="v14-chip ${a.receive_leads!==false?'good':'bad'}">${a.receive_leads!==false?'Accepting Leads':'Leads Off'}</span><button class="app-btn small outline" type="button" data-v14-edit-team="${a.id}"><i class="fa-solid fa-pen"></i> Edit</button></div></article>`}).join(''):`<div class="app-card v14-empty">No Team members yet. Click “Add Team Member”.</div>`}
function renderLinks(){
 const body=$('#v14LinksBody');if(!body)return;
 const q=String($('#v14LinkSearch')?.value||'').toLowerCase(),type=$('#v14LinkFilter')?.value||'all',status=$('#v14LinkStatus')?.value||'all',source=$('#v14LinkSource')?.value||'all',course=$('#v14LinkCourseFilter')?.value||'all';
 const rows=state.links.filter(l=>{
   const typeOk=type==='all'||(type==='ad'&&l.is_ad_link)||(type==='normal'&&!l.is_ad_link);
   const statusOk=status==='all'||(status==='active'&&l.is_active)||(status==='off'&&!l.is_active);
   const sourceOk=source==='all'||String(l.source||'Direct')===source;
   const courseOk=course==='all'||(course==='none'&&!l.course_id)||String(l.course_id||'')===course;
   const searchOk=!q||`${l.name} ${l.campaign||''} ${l.course_title||''} ${l.source||''} ${leadOwner(l)}`.toLowerCase().includes(q);
   return typeOk&&statusOk&&sourceOk&&courseOk&&searchOk;
 });
 body.innerHTML=rows.length?rows.map(l=>{const dest=l.is_ad_link?(l.course_title||'Course'):(l.destination_path==='/'?'Home':String(l.destination_path||'/').replaceAll('/',' ').trim()||'Page');return `<tr>
  <td class="v14-link-name"><div class="link-row-name"><span class="link-row-icon"><i class="fa-solid ${l.is_ad_link?'fa-bullseye':'fa-link'}"></i></span><div><b>${esc(l.name)}</b><small>${esc(l.source||'Direct')} · ${esc(l.campaign||'No campaign')}</small></div></div></td>
  <td><span class="v14-chip ${l.is_ad_link?'gold':''}">${l.is_ad_link?'Ad Link':'Normal'}</span></td>
  <td><b class="link-destination">${esc(dest)}</b></td>
  <td><span class="link-routing-chip"><i class="fa-solid fa-route"></i>${esc(leadOwner(l))}</span></td>
  <td><b class="link-lead-count">${Number(l.signups||0)}</b></td>
  <td><span class="status-pill ${l.is_active?'ok':'bad'}">${l.is_active?'Active':'Off'}</span></td>
  <td><div class="v14-actions link-row-actions"><button class="app-btn small gold" type="button" data-v14-copy-link="${l.id}"><i class="fa-regular fa-copy"></i> Copy</button><button class="app-btn small outline" type="button" data-v14-link-details="${l.id}"><i class="fa-solid fa-chart-line"></i> Details</button><button class="app-btn small outline icon-only" type="button" data-v14-edit-link="${l.id}" aria-label="Edit link"><i class="fa-solid fa-pen"></i></button></div></td>
 </tr>`}).join(''):`<tr><td colspan="7"><div class="v14-empty">No links match these filters.</div></td></tr>`;
}
function fillLinkSelects(){
 const c=$('#v14LinkCourse');if(c){const cur=c.value;c.innerHTML='<option value="">Select Course</option>'+state.courses.map(x=>`<option value="${x.id}">${esc(x.title)} — ${x.course_type==='free'?'FREE':`${x.currency||'USD'} ${Number(x.discount_price??x.price??0).toLocaleString()}`}</option>`).join('');if(cur&&state.courses.some(x=>String(x.id)===String(cur)))c.value=cur}
 const lead=$('#v14LeadTo');if(lead){const cur=lead.value;lead.innerHTML='<option value="auto">Auto Distribute Between Active Team</option>'+state.team.filter(a=>a.is_active!==false&&a.receive_leads!==false).map(a=>`<option value="${a.id}">${esc(a.display_name||a.username)}</option>`).join('');if(cur&&[...lead.options].some(o=>o.value===cur))lead.value=cur}
 const source=$('#v14LinkSource');if(source){const cur=source.value;const values=[...new Set(state.links.map(x=>String(x.source||'Direct')).filter(Boolean))].sort();source.innerHTML='<option value="all">All Sources</option>'+values.map(x=>`<option value="${attr(x)}">${esc(x)}</option>`).join('');source.value=values.includes(cur)?cur:'all'}
 const courseFilter=$('#v14LinkCourseFilter');if(courseFilter){const cur=courseFilter.value;courseFilter.innerHTML='<option value="all">All Courses / Pages</option><option value="none">Normal / No Course</option>'+state.courses.map(x=>`<option value="${x.id}">${esc(x.title)}</option>`).join('');courseFilter.value=(cur==='none'||state.courses.some(x=>String(x.id)===String(cur)))?cur:'all'}
}
function teamTab(k='team'){$('[data-v14-team-tab]').forEach(b=>b.classList.toggle('on',b.dataset.v14TeamTab===k));$('[data-v14-team-panel]').forEach(p=>p.classList.toggle('on',p.dataset.v14TeamPanel==='team'))}
function newTeam(){const f=$('#v14TeamForm');f.reset();f.elements.team_id.value='';f.elements.receive_leads.checked=true;f.elements.is_active.checked=true;f.elements.password.required=true;$('#v14TeamModalTitle').textContent='Add Team Member';openModal('v14TeamModal')}
function editTeam(id){const a=state.team.find(x=>x.id===id);if(!a)return;const f=$('#v14TeamForm');f.reset();f.elements.team_id.value=a.id;f.elements.display_name.value=a.display_name||'';f.elements.username.value=a.username||'';f.elements.whatsapp.value=a.whatsapp||'';f.elements.email.value=a.email||'';if(f.elements.salutation){const n=String(a.display_name||'').trim();f.elements.salutation.value=a.salutation||(/^miss\b|^ms\.?\b/i.test(n)?'Miss':/^sir\b/i.test(n)?'Sir':'');}f.elements.receive_leads.checked=a.receive_leads!==false;f.elements.is_active.checked=a.is_active!==false;f.elements.password.required=false;$('#v14TeamModalTitle').textContent='Edit Team Member';openModal('v14TeamModal')}
async function openTeamEditorDirect(id){
  try{
    await loadTeamLinks();
    editTeam(id);
  }catch(error){
    toast(A.friendlyError(error,'Could not open Team member.'),'error');
  }
}
window.AdminUnifiedEditTeam=openTeamEditorDirect;
window.AdminUnifiedNewTeam=()=>newTeam();
window.AdminUnifiedNewLink=(ad=false)=>newLink(!!ad);
window.AdminUnifiedEditLink=(id)=>editLink(id);
async function saveTeam(e){e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f));try{await rpc('admin_upsert_team_account_v12_15',{p_team_id:d.team_id||null,p_display_name:String(d.display_name||'').trim(),p_username:String(d.username||'').trim(),p_email:String(d.email||'').trim(),p_whatsapp:String(d.whatsapp||'').trim(),p_password:String(d.password||''),p_is_active:f.elements.is_active.checked,p_receive_leads:f.elements.receive_leads.checked,p_salutation:String(d.salutation||'').trim()||null});closeModal('v14TeamModal');toast('Team member saved.','success');await loadTeamLinks()}catch(x){toast(A.friendlyError(x,'Could not save Team member.'),'error')}}
function setLinkType(t){linkType=t;const f=$('#v14LinkForm');if(!f)return;f.elements.link_type.value=t;$('[data-v14-link-type]').forEach(b=>b.classList.toggle('on',b.dataset.v14LinkType===t));$('[data-v14-normal-fields]').style.display=t==='normal'?'block':'none';$('[data-v14-ad-fields]').style.display=t==='ad'?'block':'none';$('#v14LinkModalTitle').textContent=f.elements.id.value?(t==='ad'?'Edit Ad Link':'Edit Normal Link'):(t==='ad'?'Create Ad Link':'Create Normal Link');updateLinkPreview()}
function newLink(ad=false){const f=$('#v14LinkForm');f.reset();f.elements.id.value='';f.elements.ref_code.value='';f.elements.is_active.checked=true;fillLinkSelects();f.elements.lead_to.value='auto';setLinkType(ad?'ad':'normal');updateLinkPreview();openModal('v14LinkModal')}
function editLink(id){const l=state.links.find(x=>x.id===id);if(!l)return;const f=$('#v14LinkForm');f.reset();fillLinkSelects();f.elements.id.value=l.id;f.elements.ref_code.value=l.ref_code||'';f.elements.name.value=l.name||'';f.elements.is_active.checked=!!l.is_active;setLinkType(l.is_ad_link?'ad':'normal');if(l.is_ad_link){f.elements.course_id.value=l.course_id||'';f.elements.ad_source.value=l.source||'Meta Ads';f.elements.campaign.value=l.campaign||''}else{f.elements.normal_destination.value=normPath(l.destination_path||'/sign-up/');f.elements.normal_source.value=l.source||'WhatsApp'}const teams=Array.isArray(l.assigned_teams)?l.assigned_teams:[];f.elements.lead_to.value=l.round_robin?'auto':(teams[0]?.team_id||'auto');updateLinkPreview();openModal('v14LinkModal')}
async function saveLink(e){e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f)),id=String(d.id||''),name=String(d.name||'').trim(),type=String(d.link_type||'normal'),lead=String(d.lead_to||'auto');if(!name)return toast('Link name is required.','error');let course=null,source='',campaign=null,destination='';if(type==='ad'){course=state.courses.find(c=>c.id===String(d.course_id||''));if(!course)return toast('Select a course for the Ad Link.','error');source=String(d.ad_source||'Meta Ads');campaign=String(d.campaign||'').trim()||name;destination=isFreeCourse(course)?'/free-course/':'/sign-up/'}else{source=String(d.normal_source||'WhatsApp');campaign=name;destination=normPath(d.normal_destination||'/sign-up/')}const row={name,ref_code:String(d.ref_code||'').trim()||refCode(name),source,campaign,destination_path:destination,course_id:type==='ad'?course.id:null,is_ad_link:type==='ad',round_robin:lead==='auto',referral_whatsapp:null,is_active:f.elements.is_active.checked,updated_at:new Date().toISOString()};try{let linkId=id;if(id){await one(sb.from('tracking_links').update(row).eq('id',id))}else{const u=await A.getCurrentUser();row.created_by=u.id;const x=await one(sb.from('tracking_links').insert(row).select('id').single());linkId=x.id}const ids=lead==='auto'?state.team.filter(a=>a.is_active!==false&&a.receive_leads!==false).map(a=>a.id):[lead];await rpc('admin_set_link_team_assignments',{p_link_id:linkId,p_team_ids:ids});closeModal('v14LinkModal');toast('Link saved.','success');await loadTeamLinks();teamTab('links')}catch(x){toast(A.friendlyError(x,'Could not save link.'),'error')}}
function leadRange(){const v=$('#v14LeadRange').value,now=new Date();let s=null,e=null;if(v==='today'){s=new Date(now.getFullYear(),now.getMonth(),now.getDate());e=new Date(s);e.setDate(e.getDate()+1)}else if(v==='yesterday'){e=new Date(now.getFullYear(),now.getMonth(),now.getDate());s=new Date(e);s.setDate(s.getDate()-1)}else if(v==='7d'){e=new Date();s=new Date();s.setDate(s.getDate()-7)}else if(v==='custom'){const sv=$('#v14LeadStart').value,ev=$('#v14LeadEnd').value;if(sv)s=new Date(`${sv}T00:00:00`);if(ev){e=new Date(`${ev}T00:00:00`);e.setDate(e.getDate()+1)}}return{start:s?s.toISOString():null,end:e?e.toISOString():null}}
async function openLeadDetails(id){state.activeLink=state.links.find(x=>x.id===id);if(!state.activeLink)return;$('#v14LeadTitle').textContent=state.activeLink.name;$('#v14LeadSubtitle').textContent=`${state.activeLink.is_ad_link?'Ad Link':'Normal Link'} · ${linkUrl(state.activeLink)}`;$('#v14LeadRange').value='all';$('#v14LeadStart').style.display='none';$('#v14LeadEnd').style.display='none';$('#v14LeadTeam').innerHTML='<option value="">All Team</option>'+state.team.map(a=>`<option value="${a.id}">${esc(a.display_name||a.username)}</option>`).join('');$('#v14LeadCourse').innerHTML='<option value="">All Courses</option>'+state.courses.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('');const sources=[...new Set(state.links.map(x=>x.source).filter(Boolean))];$('#v14LeadSource').innerHTML='<option value="">All Sources</option>'+sources.map(x=>`<option value="${attr(x)}">${esc(x)}</option>`).join('');openModal('v14LeadModal');await loadLeadRows()}
window.AdminUnifiedOpenLeadDetails=openLeadDetails;
async function loadLeadRows(){if(!state.activeLink)return;const range=leadRange();try{const data=await rpc('admin_get_link_leads',{p_link_id:state.activeLink.id,p_start:range.start,p_end:range.end,p_team_id:$('#v14LeadTeam').value||null,p_course_id:$('#v14LeadCourse').value||null,p_source:$('#v14LeadSource').value||null,p_limit:1000,p_offset:0});$('#v14LeadKpis').innerHTML=[['Total Leads',data.total_leads||0],['Clicks',state.activeLink.total_clicks||0],['Enrollments',state.activeLink.enrollments||0],['Email Sent',data.email_sent||0],['Routed',data.routed||0]].map(([a,b])=>`<div class="v14-kpi"><b>${b}</b><span>${a}</span></div>`).join('');const rows=data.rows||[];$('#v14LeadRows').innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(fmtDateTime(r.lead_at))}</td><td class="v14-lead-name"><b>${esc(r.name)}</b></td><td class="v14-lead-email">${esc(r.email)}</td><td>${esc(r.whatsapp)}</td><td><b>${esc(r.client_id)}</b></td><td>${esc(r.course)}</td><td>${esc(r.assigned_team||'Unassigned')}</td><td>${esc(fmtDateTime(r.assigned_at))}</td><td>${esc(r.source)}</td><td><span class="${r.email_status==='Sent'?'v14-status-sent':r.email_status==='Failed'?'v14-status-failed':'v14-status-pending'}">${esc(r.email_status)}</span></td><td><span class="${r.routed?'v14-routed':'v14-not-routed'}">${r.routed?'Routed':'Not Routed'}</span></td></tr>`).join(''):`<tr><td colspan="11"><div class="v14-empty">No leads found for this filter.</div></td></tr>`}catch(x){toast(A.friendlyError(x,'Could not load link leads.'),'error')}}

function premiumAccess(p){const s=state.premium?.settings||{},now=Date.now();if(s.package_mode==='free')return{active:true,label:'Free',expiry:null,days:null};if(p.premium_access_expires_at&&new Date(p.premium_access_expires_at).getTime()>now){const x=new Date(p.premium_access_expires_at);return{active:true,label:String(p.premium_access_source||'Premium').replaceAll('_',' '),expiry:x,days:Math.max(0,Math.ceil((x-now)/86400000))}}if(s.trial_enabled&&p.trial_started_at&&Number(s.trial_days||0)>0){const x=new Date(new Date(p.trial_started_at).getTime()+Number(s.trial_days)*86400000);if(x.getTime()>now)return{active:true,label:'Free Trial',expiry:x,days:Math.max(0,Math.ceil((x-now)/86400000))}}return{active:false,label:'No Access',expiry:null,days:0}}
async function loadPremium(){try{state.premium=await rpc('admin_get_premium_center');renderPremium()}catch(x){console.error(x);toast(A.friendlyError(x,'Could not load Premium.'),'error')}}
function renderPremium(){if(!state.premium)return;const st=state.premium.students||[],pay=state.premium.payments||[],ib=state.premium.ib_requests||[],active=st.filter(p=>premiumAccess(p).active).length,pending=pay.filter(x=>['received','initiated','under_review'].includes(x.status)).length,pendingIb=ib.filter(x=>x.status==='pending').length,soon=st.filter(p=>{const a=premiumAccess(p);return a.active&&a.days!=null&&a.days<=7}).length;$('#v14PremiumKpis').innerHTML=[['fa-crown','Active Premium',active],['fa-receipt','Pending Payments',pending],['fa-building-columns','Pending IB',pendingIb],['fa-hourglass-half','Expiring Soon',soon],['fa-users','Students',st.length]].map(([i,a,b])=>`<div class="v14-kpi premium-access-kpi"><span><i class="fa-solid ${i}"></i></span><div><b>${b}</b><small>${a}</small></div></div>`).join('');renderPremiumCourseFilters();renderPremiumUsers();renderPremiumRequests();fillPremiumForms()}
function premiumStudentCourseIds(p){return Array.isArray(p?.course_ids)?p.course_ids.map(String):[]}
function renderPremiumCourseFilters(){
 const box=$('#v14PremiumCourseFilters');
 if(!box||!state.premium)return;
 const students=state.premium.students||[];
 const courses=state.premium.courses||[];
 const current=box.querySelector('[data-v14-prem-course].on')?.dataset.v14PremCourse||'all';
 const selected=current==='all'||courses.some(c=>String(c.id)===current)?current:'all';
 const buttons=[{id:'all',title:'All Courses',count:students.length},...courses.map(c=>({id:String(c.id),title:c.title||'Course',count:students.filter(p=>premiumStudentCourseIds(p).includes(String(c.id))).length}))];
 box.innerHTML=buttons.map(x=>'<button type="button" class="'+(selected===x.id?'on':'')+'" data-v14-prem-course="'+attr(x.id)+'"><span>'+esc(x.title)+'</span><b>'+x.count+'</b></button>').join('');
}
function renderPremiumUsers(){
 const body=$('#v14PremiumUsers');
 if(!body||!state.premium)return;
 const q=String($('#v14PremiumSearch')?.value||'').toLowerCase();
 const f=$('#v14PremiumFilter')?.value||'all';
 const course=$('[data-v14-prem-course].on')?.dataset.v14PremCourse||'all';
 const rows=(state.premium.students||[]).filter(p=>{
   const a=premiumAccess(p);
   const courseOk=course==='all'||premiumStudentCourseIds(p).includes(String(course));
   const accessOk=f==='all'||(f==='active'&&a.active)||(f==='inactive'&&!a.active);
   const searchOk=!q||(`${p.full_name||''} ${p.email||''}`).toLowerCase().includes(q);
   return courseOk&&accessOk&&searchOk;
 });
 if(!rows.length){
   body.innerHTML='<tr><td colspan="5"><div class="v14-empty">No students found for this course/filter.</div></td></tr>';
   return;
 }
 body.innerHTML=rows.map(p=>{
   const a=premiumAccess(p);
   const daysClass=a.days!=null&&a.days<=7?'soon':'';
   const revoke=a.active&&a.label!=='Free'?'<button type="button" class="app-btn small danger" data-v14-prem-revoke="'+p.id+'">End Access</button>':'';
   return '<tr><td><div class="premium-student-cell"><span class="premium-student-avatar">'+esc((p.full_name||p.email||'S').slice(0,1).toUpperCase())+'</span><div><b>'+esc(p.full_name||'Student')+'</b><small>'+esc(p.email||'')+'</small></div></div></td><td><span class="v14-chip premium-access-state '+(a.active?'gold':'off')+'">'+esc(a.label)+'</span></td><td><span class="premium-expiry">'+(a.expiry?esc(fmtDateTime(a.expiry)):(a.active?'No Expiry':'—'))+'</span></td><td><span class="premium-days '+daysClass+'">'+(a.days==null?'—':a.days)+'</span></td><td><div class="v14-actions"><button type="button" class="app-btn small '+(a.active?'outline':'gold')+'" data-v14-prem-grant="'+p.id+'">'+(a.active?'Extend Access':'Grant Access')+'</button>'+revoke+'</div></td></tr>';
 }).join('');
}
function pname(id){const p=state.premium?.students?.find(x=>x.id===id);return p?.full_name||p?.email||'Student'}
function premiumReqGroup(status){const s=String(status||'').toLowerCase();if(['approved','success','completed'].includes(s))return'approved';if(['declined','rejected','failed'].includes(s))return'rejected';return'pending'}
function reqCard(title,sub,status,actions,type){const group=premiumReqGroup(status);return `<div class="v14-request premium-request-row ${group}"><span class="premium-request-kind"><i class="fa-solid ${type==='ib'?'fa-building-columns':'fa-receipt'}"></i></span><div class="v14-request-main"><b>${esc(title)}</b><small>${esc(sub)}</small><div class="v14-badges"><span class="v14-chip premium-request-status ${group}">${esc(String(status||group).replaceAll('_',' '))}</span></div></div><div class="v14-actions">${actions||'<span class="premium-reviewed">Reviewed</span>'}</div></div>`}
function renderPremiumRequests(){if(!state.premium)return;const allPay=state.premium.payments||[],allIb=state.premium.ib_requests||[],filter=$('[data-v14-request-status].on')?.dataset.v14RequestStatus||'all',matches=x=>filter==='all'||premiumReqGroup(x.status)===filter;const all=[...allPay,...allIb],counts={all:all.length,pending:all.filter(x=>premiumReqGroup(x.status)==='pending').length,approved:all.filter(x=>premiumReqGroup(x.status)==='approved').length,rejected:all.filter(x=>premiumReqGroup(x.status)==='rejected').length};[['v14ReqAll','all'],['v14ReqPending','pending'],['v14ReqApproved','approved'],['v14ReqRejected','rejected']].forEach(([id,k])=>{const el=$('#'+id);if(el)el.textContent=counts[k]});const pay=allPay.filter(matches);$('#v14PremiumPayments').innerHTML=pay.length?pay.map(r=>{const pending=premiumReqGroup(r.status)==='pending';return reqCard(pname(r.student_id),`${Number(r.amount||0).toLocaleString()} ${r.currency||''} · ${r.payment_method_name||''}`,r.status,pending?`<button class="app-btn small gold" data-v14-pay="${r.id}" data-status="approved">Approve</button><button class="app-btn small danger" data-v14-pay="${r.id}" data-status="declined">Reject</button>`:'','payment')}).join(''):`<div class="v14-empty">No premium payments match this filter.</div>`;const ib=allIb.filter(matches);$('#v14PremiumIb').innerHTML=ib.length?ib.map(r=>{const pending=premiumReqGroup(r.status)==='pending';return reqCard(pname(r.student_id),`${r.broker||''} · ${r.trading_account_id||''}`,r.status,pending?`<button class="app-btn small gold" data-v14-ib="${r.id}" data-status="approved">Approve</button><button class="app-btn small danger" data-v14-ib="${r.id}" data-status="declined">Reject</button>`:'','ib')}).join(''):`<div class="v14-empty">No IB requests match this filter.</div>`}
function fillPremiumForms(){if(!state.premium)return;$('#v14GrantStudent').innerHTML=(state.premium.students||[]).map(p=>`<option value="${p.id}">${esc(p.full_name||p.email)} · ${esc(p.email||'')}</option>`).join('');const s=state.premium.settings||{},f=$('#v14PremiumSettingsForm');f.elements.package_mode.value=s.package_mode||'paid';f.elements.trial_days.value=s.trial_days??0;f.elements.trial_enabled.checked=!!s.trial_enabled;f.elements.price_pkr.value=s.price_pkr??0;f.elements.price_usdt.value=s.price_usdt??0;f.elements.ib_enabled.checked=!!s.ib_enabled;f.elements.ib_access_days.value=s.ib_access_days??30}
function premTab(k){$$('[data-v14-prem-tab]').forEach(b=>b.classList.toggle('on',b.dataset.v14PremTab===k));$$('[data-v14-prem-panel]').forEach(p=>p.classList.toggle('on',p.dataset.v14PremPanel===k))}
async function savePremiumGrant(e){e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await rpc('admin_manage_premium_access_v12_13',{p_user_id:d.user_id,p_action:'extend',p_days:Number(d.days||30),p_note:String(d.note||'').trim()||null});closeModal('v14GrantModal');toast('Premium access updated.','success');await loadPremium()}catch(x){toast(A.friendlyError(x,'Could not update Premium access.'),'error')}}
async function revokePremium(id){if(!confirm('End Premium access for this student now?'))return;try{await rpc('admin_manage_premium_access_v12_13',{p_user_id:id,p_action:'revoke',p_days:null,p_note:'Ended by Admin'});toast('Premium access ended.','success');await loadPremium()}catch(x){toast(A.friendlyError(x),'error')}}
async function savePremiumSettings(e){e.preventDefault();const f=e.currentTarget;try{await rpc('admin_update_premium_settings',{p_package_mode:f.elements.package_mode.value,p_trial_enabled:f.elements.trial_enabled.checked,p_trial_days:Number(f.elements.trial_days.value||0),p_monthly_days:30,p_price_pkr:Number(f.elements.price_pkr.value||0),p_price_usdt:Number(f.elements.price_usdt.value||0),p_ib_enabled:f.elements.ib_enabled.checked,p_ib_access_days:Number(f.elements.ib_access_days.value||30)});closeModal('v14PremiumSettingsModal');toast('Premium settings saved.','success');await loadPremium()}catch(x){toast(A.friendlyError(x),'error')}}
async function reviewPremiumPayment(id,status){let note=null;if(status==='declined'){note=prompt('Decline reason:')||'';if(!note.trim())return}try{await rpc('admin_review_premium_payment',{p_payment_id:id,p_status:status,p_admin_note:note});toast(status==='approved'?'Premium payment approved.':'Premium payment declined.','success');await loadPremium()}catch(x){toast(A.friendlyError(x),'error')}}
async function reviewIb(id,status){let note=null;if(status==='declined'){note=prompt('Decline reason:')||'';if(!note.trim())return}try{await rpc('admin_review_ib_verification',{p_id:id,p_status:status,p_admin_note:note});toast(status==='approved'?'IB request approved.':'IB request declined.','success');await loadPremium()}catch(x){toast(A.friendlyError(x),'error')}}

function bind(){
 document.addEventListener('panel:open',e=>{const k=e.detail?.key;syncGroupedNav(k);if(k==='links')loadTeamLinks();if(k==='premium-access')loadPremium()});
 document.addEventListener('click',e=>{
  const tt=e.target.closest('[data-v14-team-tab]');if(tt)teamTab(tt.dataset.v14TeamTab);
  const pt=e.target.closest('[data-v14-prem-tab]');if(pt)premTab(pt.dataset.v14PremTab);
  const rs=e.target.closest('[data-v14-request-status]');if(rs){document.querySelectorAll('[data-v14-request-status]').forEach(b=>b.classList.toggle('on',b===rs));renderPremiumRequests();}
  const pc=e.target.closest('[data-v14-prem-course]');if(pc){document.querySelectorAll('[data-v14-prem-course]').forEach(b=>b.classList.toggle('on',b===pc));renderPremiumUsers();}
  const lt=e.target.closest('[data-v14-link-type]');if(lt)setLinkType(lt.dataset.v14LinkType);
  const et=e.target.closest('[data-v14-edit-team]');if(et)editTeam(et.dataset.v14EditTeam);
  const el=e.target.closest('[data-v14-edit-link]');if(el)editLink(el.dataset.v14EditLink);
  const dl=e.target.closest('[data-v14-link-details]');if(dl)openLeadDetails(dl.dataset.v14LinkDetails);
  const cp=e.target.closest('[data-v14-copy-link]');if(cp){const l=state.links.find(x=>x.id===cp.dataset.v14CopyLink);if(l)navigator.clipboard.writeText(linkUrl(l)).then(()=>toast('Link copied.','success'))}
  const pg=e.target.closest('[data-v14-prem-grant]');if(pg){$('#v14GrantStudent').value=pg.dataset.v14PremGrant;openModal('v14GrantModal')}
  const pr=e.target.closest('[data-v14-prem-revoke]');if(pr)revokePremium(pr.dataset.v14PremRevoke);
  const pay=e.target.closest('[data-v14-pay]');if(pay)reviewPremiumPayment(pay.dataset.v14Pay,pay.dataset.status);
  const ib=e.target.closest('[data-v14-ib]');if(ib)reviewIb(ib.dataset.v14Ib,ib.dataset.status);
  if(e.target.closest('#adminQuickAdd')){$('#adminQuickMenu').classList.toggle('open');return}
  const quick=e.target.closest('[data-v14-quick]');if(quick){$('#adminQuickMenu').classList.remove('open');const k=quick.dataset.v14Quick;if(k==='team'){document.querySelector('[data-panel="links"]')?.click();setTimeout(newTeam,120)}else if(k==='link'){document.querySelector('[data-panel="link-manager-ref"]')?.click();setTimeout(()=>newLink(false),140)}else if(k==='signal'){document.querySelector('[data-panel="signals"]')?.click();setTimeout(()=>document.querySelector('[data-toggle-form="signalFormBox"]')?.click(),120)}else if(k==='course'){document.querySelector('[data-panel="courses"]')?.click();setTimeout(()=>document.querySelector('[data-toggle-form="courseFormBox"]')?.click(),120)}else if(k==='announcement'){document.querySelector('[data-panel="announcements"]')?.click();setTimeout(()=>document.querySelector('[data-toggle-form="announcementFormBox"]')?.click(),120)}}else if(!e.target.closest('#adminQuickAddWrap'))$('#adminQuickMenu')?.classList.remove('open');
 });
 $('#v14AddTeam')?.addEventListener('click',newTeam);$('#v14AddLink')?.addEventListener('click',newLink);$('#v14TeamForm')?.addEventListener('submit',saveTeam);$('#v14LinkForm')?.addEventListener('submit',saveLink);$('#v14LinkForm')?.addEventListener('input',updateLinkPreview);$('#v14LinkForm')?.addEventListener('change',updateLinkPreview);$('#v14TeamSearch')?.addEventListener('input',renderTeam);$('#v14LinkSearch')?.addEventListener('input',renderLinks);['v14LinkFilter','v14LinkStatus','v14LinkSource','v14LinkCourseFilter'].forEach(id=>$('#'+id)?.addEventListener('change',renderLinks));$('#v14LinkReset')?.addEventListener('click',()=>{if($('#v14LinkSearch'))$('#v14LinkSearch').value='';['v14LinkFilter','v14LinkStatus','v14LinkSource','v14LinkCourseFilter'].forEach(id=>{const el=$('#'+id);if(el)el.value='all'});renderLinks()});
 $('#v14LeadRange')?.addEventListener('change',()=>{const c=$('#v14LeadRange').value==='custom';$('#v14LeadStart').style.display=c?'block':'none';$('#v14LeadEnd').style.display=c?'block':'none'});$('#v14RefreshLeads')?.addEventListener('click',loadLeadRows);
 $('#v14GrantPremium')?.addEventListener('click',()=>openModal('v14GrantModal'));$('#v14PremiumSettings')?.addEventListener('click',()=>openModal('v14PremiumSettingsModal'));$('#v14GrantForm')?.addEventListener('submit',savePremiumGrant);$('#v14PremiumSettingsForm')?.addEventListener('submit',savePremiumSettings);$('#v14PremiumSearch')?.addEventListener('input',renderPremiumUsers);$('#v14PremiumFilter')?.addEventListener('change',renderPremiumUsers);
}

async function init(){
 for(let i=0;i<120&&$('#adminApp')?.classList.contains('hidden');i++)await wait(100);
 installContentHub();installTeamLinks();installPremium();installOperations();installModals();installNav();installQuickAdd();bind();
 // Add USD option to course editor because Level 2 is priced in USD.
 const currency=$('#courseForm select[name="currency"]');if(currency&&![...currency.options].some(o=>o.value==='USD'))currency.insertAdjacentHTML('beforeend','<option value="USD">USD — Course price</option>');
 // Keep useful secondary actions inside their parent sections instead of the sidebar.
 const courseHead=$('#p-courses .panel-heading');if(courseHead&&!$('#v14LiveClassesBtn'))courseHead.querySelector(':scope > button')?.insertAdjacentHTML('beforebegin','<button type="button" class="app-btn outline" id="v14LiveClassesBtn" data-goto="sessions"><i class="fa-solid fa-video"></i> Live Classes</button>');
 const payHead=$('#p-payments .panel-heading');if(payHead&&!$('#v14MethodsBtn'))payHead.insertAdjacentHTML('beforeend','<button type="button" class="app-btn outline" id="v14MethodsBtn" data-goto="methods"><i class="fa-solid fa-building-columns"></i> Payment Methods</button>');
 const initial=(location.pathname.includes('/admin/content')?'content':location.pathname.includes('/admin/team-manager')?'links':location.pathname.includes('/admin/premium-access')?'premium-access':location.pathname.includes('/admin/operations')?'operations':'');
 if(initial)setTimeout(()=>document.querySelector(`[data-panel="${initial}"]`)?.click(),150);
 const active=document.querySelector('.panel.on')?.id?.replace('p-','')||'dashboard';syncGroupedNav(active);
}
init();
})();

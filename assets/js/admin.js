(async function () {
  const A = window.App;
  const FINAL_SIGNAL_STATES = new Set(['tp3_hit','tp4_hit','sl_hit','breakeven_hit','manually_closed','cancelled']);
  const state = { profile:null, profiles:[], courses:[], sessions:[], sessionLinks:{}, payments:[], signals:[], signalUpdates:[], charts:[], articles:[], announcements:[], resources:[], support:[], methods:[] };
  window.AdminBase = { state, reload: async () => { await loadAll(); renderAll(); return state; } };
  const instruments = [
    {group:'Top Markets',symbol:'XAUUSD',label:'GOLD — XAU/USD',unit:'pips',pip:0.1},
    {group:'Top Markets',symbol:'XAGUSD',label:'SILVER — XAG/USD',unit:'pips',pip:0.001},
    {group:'Top Markets',symbol:'BTCUSD',label:'BTC — BTC/USD',unit:'pips',pip:10},
    {group:'USD Pairs',symbol:'EURUSD',label:'EUR/USD',unit:'pips',pip:0.0001},
    {group:'USD Pairs',symbol:'GBPUSD',label:'GBP/USD',unit:'pips',pip:0.0001},
    {group:'USD Pairs',symbol:'USDJPY',label:'USD/JPY',unit:'pips',pip:0.01},
    {group:'USD Pairs',symbol:'USDCHF',label:'USD/CHF',unit:'pips',pip:0.0001},
    {group:'USD Pairs',symbol:'AUDUSD',label:'AUD/USD',unit:'pips',pip:0.0001},
    {group:'USD Pairs',symbol:'NZDUSD',label:'NZD/USD',unit:'pips',pip:0.0001},
    {group:'USD Pairs',symbol:'USDCAD',label:'USD/CAD',unit:'pips',pip:0.0001},
    ...['EURGBP','EURJPY','GBPJPY','AUDJPY','CADJPY','CHFJPY','EURAUD','EURNZD','EURCAD','EURCHF','GBPAUD','GBPNZD','GBPCAD','GBPCHF','AUDCAD','AUDCHF','AUDNZD','NZDCAD','NZDCHF','NZDJPY','CADCHF'].map(symbol=>({group:'Cross Pairs',symbol,label:`${symbol.slice(0,3)}/${symbol.slice(3)}`,unit:'pips',pip:symbol.endsWith('JPY')?0.01:0.0001}))
  ];

  const result = await A.requireRole('admin');
  if (!result) return;
  state.profile = result.profile;
  A.activateDashboardNavigation();
  async function auditSession(action){try{await A.supabase.functions.invoke('audit-event',{body:{action,entity_type:'session',status:'success',details:{scope:'admin'}}});}catch{}}
  document.getElementById('logoutButton').addEventListener('click', async()=>{await auditSession('admin_logout');await A.logout();});
  await loadAll();
  renderAll();
  bindEvents();
  subscribeRealtime();
  document.getElementById('pageLoader').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');

  async function loadAll() {
    const sb=A.supabase;
    try { await sb.rpc('refresh_course_statuses_from_schedule'); } catch (error) { console.warn('Course schedule status refresh skipped:', error?.message || error); }
    const responses=await Promise.all([
      sb.from('profiles').select('*').order('created_at',{ascending:false}),
      sb.from('courses').select('*').order('created_at',{ascending:false}),
      sb.from('course_sessions').select('*').order('starts_at'),
      sb.from('course_session_links').select('*'),
      sb.from('payments').select('*').order('created_at',{ascending:false}),
      sb.from('signals').select('*').order('published_at',{ascending:false}),
      sb.from('signal_updates').select('*').order('created_at',{ascending:false}),
      sb.from('charts').select('*').order('published_at',{ascending:false}),
      sb.from('articles').select('*').order('published_at',{ascending:false}),
      sb.from('announcements').select('*').order('published_at',{ascending:false}),
      sb.from('course_resources').select('*').order('created_at',{ascending:false}),
      sb.from('support_requests').select('*').order('created_at',{ascending:false}),
      sb.from('payment_methods').select('*').order('sort_order')
    ]);
    const error=responses.find(r=>r.error)?.error;
    if(error) throw error;
    [state.profiles,state.courses,state.sessions,,state.payments,state.signals,state.signalUpdates,state.charts,state.articles,state.announcements,state.resources,state.support,state.methods]=responses.map(r=>r.data||[]);
    state.sessionLinks=Object.fromEntries((responses[3].data||[]).map(r=>[r.course_session_id,r.meet_url]));
  }

  function renderAll(){populateCourseSelects();renderDashboard();renderSignals();renderCharts();renderArticles();renderAnnouncements();renderCourses();renderSessions();renderResources();renderPayments();renderStudents();renderSupport();renderMethods();const p=state.payments.filter(x=>['received','under_review'].includes(x.status)).length;document.getElementById('pendingPaymentCount').textContent=p;document.getElementById('topPendingCount').textContent=p;window.dispatchEvent(new CustomEvent('24k:admin-base-updated',{detail:state}));}

  function renderDashboard(){
    const students=state.profiles.filter(p=>p.role==='student');const pending=state.payments.filter(p=>['received','under_review'].includes(p.status));const approved=state.payments.filter(p=>p.status==='approved');const revenueTotals=approved.reduce((totals,p)=>{const currency=courseCurrency(p.course_id);totals[currency]=(totals[currency]||0)+Number(p.amount||0);return totals;},{});const revenueText=Object.keys(revenueTotals).length?Object.entries(revenueTotals).map(([currency,total])=>`${currency} ${Number(total).toLocaleString('en-US',{maximumFractionDigits:2})}`).join(' · '):'PKR 0';const activeCourses=state.courses.filter(c=>c.status==='active'&&c.is_published).length;const upcoming=state.sessions.filter(s=>new Date(s.starts_at)>=new Date()&&s.status!=='cancelled');
    document.getElementById('adminKpis').innerHTML=[
      ['fa-users',students.length,'Registered Students','students'],
      ['fa-hourglass-half',pending.length,'Payments To Review','payments'],
      ['fa-sack-dollar',revenueText,'Approved Revenue','payments'],
      ['fa-graduation-cap',activeCourses,'Active Courses','courses'],
      ['fa-video',upcoming.length,'Upcoming Sessions','sessions']
    ].map(([i,v,l,panel])=>`<button type="button" class="app-kpi dashboard-nav-card" data-goto="${panel}" aria-label="Open ${l}"><i class="fa-solid ${i}"></i><div><b>${v}</b><small>${l}</small></div><i class="fa-solid fa-arrow-right dashboard-nav-arrow"></i></button>`).join('');
    document.getElementById('dashboardPayments').innerHTML=pending.length?pending.slice(0,5).map(p=>`<div class="activity-item"><div class="activity-icon"><i class="fa-solid fa-receipt"></i></div><div><b>${A.escapeHtml(profileName(p.student_id))} · ${A.escapeHtml(courseName(p.course_id))}</b><small>${A.escapeHtml(p.invoice_no||'')} · ${A.formatMoney(p.amount,courseCurrency(p.course_id))}</small></div><button class="app-btn small gold" data-review-payment="${p.id}">Review</button></div>`).join(''):empty('No payment currently requires review.','fa-circle-check');
    document.getElementById('dashboardSessions').innerHTML=upcoming.length?upcoming.slice(0,5).map(s=>`<button type="button" class="activity-item dashboard-activity-link" data-goto="sessions"><div class="activity-icon"><i class="fa-solid fa-video"></i></div><div><b>${A.escapeHtml(s.title)}</b><small>${A.escapeHtml(courseName(s.course_id))} · ${A.formatDateTime(s.starts_at)}</small></div><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></button>`).join(''):empty('No upcoming session.','fa-calendar');
  }

  function signalIsFinal(s){return Boolean(s.closed_at)||FINAL_SIGNAL_STATES.has(s.status);}
  function signalProgress(s){return Math.min(100,Math.round((Math.min(3,Number(s.tp_hit||0))/3)*100));}
  function adminHistoryDateParts(value){const d=value?new Date(value):null;if(!d||Number.isNaN(d.getTime()))return{date:'—',time:'—'};return{date:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),time:d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})};}
  function renderSignals(){
    const q=document.getElementById('adminSignalSearch')?.value.trim().toLowerCase()||'';const view=document.getElementById('adminSignalView')?.value||'active';
    const final=state.signals.filter(signalIsFinal);const countable=final.filter(s=>s.status!=='cancelled'&&s.result_pips!==null);const wins=countable.filter(s=>Number(s.result_pips)>0);const losses=countable.filter(s=>Number(s.result_pips)<0);const total=countable.reduce((sum,s)=>sum+Number(s.result_pips||0),0);const winRate=countable.length?Math.round(wins.length/countable.length*100):0;
    document.getElementById('adminSignalStats').innerHTML=[['Total Signals',state.signals.length],['Active',state.signals.filter(s=>!signalIsFinal(s)).length],['Total Pips',signed(total)],['Wins',wins.length],['Losses',losses.length],['Win Rate',`${winRate}%`]].map(([l,v])=>`<div class="performance-item"><small>${l}</small><b>${v}</b></div>`).join('');
    const activeCount=state.signals.filter(s=>!signalIsFinal(s)).length,historyCount=final.length;document.getElementById('adminActiveSignalCount').textContent=activeCount;document.getElementById('adminHistorySignalCount').textContent=historyCount;document.querySelectorAll('[data-admin-signal-view]').forEach(btn=>{const on=btn.dataset.adminSignalView===view;btn.classList.toggle('active',on);btn.setAttribute('aria-selected',String(on));});
    const rows=state.signals.filter(s=>(!q||`${s.symbol} ${s.notes||''}`.toLowerCase().includes(q))&&((view==='active'&&!signalIsFinal(s))||(view==='history'&&signalIsFinal(s))));
    const table=document.getElementById('signalsBody').closest('table');
    if(view==='history'){
      table.classList.add('admin-signal-history-report');
      table.querySelector('thead').innerHTML='<tr><th>Date</th><th>Time</th><th>Pair</th><th>Direction</th><th>Order Type</th><th>Entry / Zone</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>Final Result</th><th>Final Pips</th><th>Published</th><th>Closed</th><th>Details</th></tr>';
      document.getElementById('signalsBody').innerHTML=rows.length?rows.map(s=>{const closed=adminHistoryDateParts(s.closed_at||s.last_status_at||s.updated_at),published=adminHistoryDateParts(s.published_at),finalPips=s.result_pips==null?'—':`${signed(s.result_pips)} Pips`,fc=Number(s.result_pips)>0?'result-positive':Number(s.result_pips)<0?'result-negative':'';return `<tr class="signal-report-row"><td>${closed.date}</td><td>${closed.time}</td><td><b>${displaySymbol(s.symbol)}</b></td><td><span class="direction ${String(s.direction).toLowerCase()}">${s.direction}</span></td><td>${A.statusLabel(s.order_type||'market')}</td><td><b>${entryText(s)}</b></td><td>${num(s.stop_loss)}</td><td>${num(s.take_profit_1)}</td><td>${num(s.take_profit_2)}</td><td>${num(s.take_profit_3)}</td><td><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></td><td><b class="${fc}">${finalPips}</b></td><td>${published.time}<small>${published.date}</small></td><td>${closed.time}<small>${closed.date}</small></td><td><button class="app-btn small outline" data-signal-history="${s.id}">View History</button></td></tr>`}).join(''):`<tr><td colspan="15">${empty('No closed signals found.','fa-clock-rotate-left')}</td></tr>`;
      return;
    }
    table.classList.remove('admin-signal-history-report');
    table.querySelector('thead').innerHTML='<tr><th>Signal</th><th>Order</th><th>Entry / SL</th><th>Targets & Progress</th><th>Status</th><th>Result</th><th>Published</th><th>Actions</th></tr>';
    document.getElementById('signalsBody').innerHTML=rows.length?rows.map(s=>{const progress=signalProgress(s);return `<tr><td><div class="signal-symbol-cell"><span class="direction ${String(s.direction).toLowerCase()}">${s.direction}</span><div><b>${displaySymbol(s.symbol)}</b><small>${audienceLabel(s.audience_access)}</small>${s.be_moved?'<span class="be-badge"><i class="fa-solid fa-shield-halved"></i> SL at BE</span>':''}</div></div></td><td><b>${A.statusLabel(s.order_type||'market')}</b></td><td><span>${entryText(s)}</span><small>SL ${num(s.stop_loss)}</small></td><td><div class="target-mini">TP1 ${num(s.take_profit_1)} · TP2 ${num(s.take_profit_2)} · TP3 ${num(s.take_profit_3)}</div><div class="signal-progress compact"><span style="width:${progress}%"></span></div><small>${progress}% complete</small></td><td><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></td><td><b class="${Number(s.result_pips)>0?'result-positive':Number(s.result_pips)<0?'result-negative':''}">${s.result_pips==null?'—':`${signed(s.result_pips)} Pips`}</b></td><td>${A.formatDateTime(s.published_at)}</td><td><div class="table-actions"><button class="app-btn small outline" data-signal-history="${s.id}">History</button><button class="app-btn small gold" data-signal-update="${s.id}">Update</button><button class="app-btn small outline" data-edit="signal" data-id="${s.id}">Edit</button></div></td></tr>`}).join(''):`<tr><td colspan="8">${empty('No active signals found.','fa-bolt')}</td></tr>`;
  }

  function renderCharts(){document.getElementById('adminChartsGrid').innerHTML=state.charts.length?state.charts.map(c=>`<article class="content-card"><div class="content-cover ${c.image_url?'has-image':''}">${c.image_url?`<img src="${attr(c.image_url)}" alt="${attr(c.title)}" loading="lazy" decoding="async">`:'<i class="fa-solid fa-chart-line"></i>'}</div><div class="content-body"><div class="course-meta"><span>${A.escapeHtml(c.symbol)}</span><span>${A.escapeHtml(c.timeframe||'')}</span><span class="status-pill ${c.is_published?'ok':'warn'}">${c.is_published?'Published':'Draft'}</span></div><h3>${A.escapeHtml(c.title)}</h3><p>${A.escapeHtml(c.summary||'')}</p><div class="card-actions"><button class="app-btn small outline" data-edit="chart" data-id="${c.id}">Edit</button><button class="app-btn small danger" data-delete="chart" data-id="${c.id}">Delete</button></div></div></article>`).join(''):empty('No charts uploaded.','fa-chart-line');}
  function renderArticles(){document.getElementById('adminArticlesGrid').innerHTML=state.articles.length?state.articles.map(a=>`<article class="content-card"><div class="content-cover ${a.cover_url?'has-image':''}">${a.cover_url?`<img src="${attr(a.cover_url)}" alt="${attr(a.title)}" loading="lazy" decoding="async">`:'<i class="fa-solid fa-newspaper"></i>'}</div><div class="content-body"><div class="course-meta"><span>${A.formatDate(a.published_at)}</span><span class="status-pill ${a.is_published?'ok':'warn'}">${a.is_published?'Published':'Draft'}</span></div><h3>${A.escapeHtml(a.title)}</h3><p>${A.escapeHtml(a.excerpt||'')}</p><div class="card-actions"><button class="app-btn small outline" data-edit="article" data-id="${a.id}">Edit</button><button class="app-btn small danger" data-delete="article" data-id="${a.id}">Delete</button></div></div></article>`).join(''):empty('No articles created.','fa-newspaper');}
  function renderAnnouncements(){document.getElementById('adminAnnouncements').innerHTML=state.announcements.length?state.announcements.map(n=>`<article class="announcement ${n.priority==='important'?'important':''}"><div class="signal-head"><div><h4>${A.escapeHtml(n.title)}</h4><small>${A.formatDateTime(n.published_at)} · ${n.is_published?'Published':'Draft'}</small></div><div class="table-actions"><button class="app-btn small outline" data-edit="announcement" data-id="${n.id}">Edit</button><button class="app-btn small danger" data-delete="announcement" data-id="${n.id}">Delete</button></div></div><p>${A.escapeHtml(n.message)}</p></article>`).join(''):empty('No announcements created.','fa-bullhorn');}
  function nextCourseSession(courseId){const now=Date.now()-5*60*1000;return state.sessions.filter(s=>s.course_id===courseId&&s.status!=='cancelled'&&s.status!=='completed'&&new Date(s.starts_at).getTime()>=now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]||null;}
  function adminCourseThumb(c){if(!c.thumbnail_url)return '<span class="table-course-placeholder"><i class="fa-solid fa-graduation-cap"></i></span>';return `<img src="${attr(c.thumbnail_url)}" alt="${attr(c.title||'Course thumbnail')}" loading="lazy" decoding="async" onerror="this.outerHTML='<span class=&quot;table-course-placeholder&quot;><i class=&quot;fa-solid fa-graduation-cap&quot;></i></span>'">`;}
  function renderCourses(){document.getElementById('coursesBody').innerHTML=state.courses.length?state.courses.map(c=>{const next=nextCourseSession(c.id);return `<tr><td><div class="table-course-cell">${adminCourseThumb(c)}<div><b>${A.escapeHtml(c.title)}</b><small>${A.escapeHtml(c.short_description||'No caption added')}</small></div></div></td><td>${coursePriceText(c)}</td><td><span class="status-pill ${A.statusClass(c.status)}">${A.statusLabel(c.status)}</span></td><td>${next?`<b>${A.escapeHtml(next.title)}</b><br><small>${A.formatDateTime(next.starts_at)}</small>`:'<span class="muted">No upcoming class</span>'}</td><td><span class="status-pill neutral"><i class="fa-brands fa-whatsapp"></i> WhatsApp Community</span></td><td>${c.is_published?'Yes':'No'}</td><td><div class="table-actions"><button class="app-btn small outline" data-edit="course" data-id="${c.id}">Edit</button><button class="app-btn small outline" data-goto="sessions">Sessions</button><button class="app-btn small danger" data-delete="course" data-id="${c.id}">Delete</button></div></td></tr>`}).join(''):`<tr><td colspan="7">${empty('No courses created.','fa-graduation-cap')}</td></tr>`;}
  function renderSessions(){document.getElementById('sessionsBody').innerHTML=state.sessions.length?state.sessions.map(s=>`<tr><td>${s.session_number}</td><td>${A.escapeHtml(courseName(s.course_id))}</td><td><b>${A.escapeHtml(s.title)}</b><br><small>${A.escapeHtml(s.topic||'')}</small></td><td>${A.formatDateTime(s.starts_at)}</td><td>${s.duration_minutes||90} min</td><td><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></td><td><span class="status-pill neutral"><i class="fa-brands fa-whatsapp"></i> Shared in Community</span></td><td><div class="table-actions"><button class="app-btn small outline" data-edit="session" data-id="${s.id}">Edit</button><button class="app-btn small danger" data-delete="session" data-id="${s.id}">Delete</button></div></td></tr>`).join(''):`<tr><td colspan="8">${empty('No Zoom sessions scheduled.','fa-video')}</td></tr>`;}
  function renderResources(){const root=document.getElementById('adminResources');if(!root)return;root.innerHTML=state.resources.length?state.resources.map(r=>`<div class="resource-row"><div><b>${A.escapeHtml(r.title)}</b><small class="muted" style="display:block">${A.escapeHtml(courseName(r.course_id))}${r.course_session_id?` · Session ${state.sessions.find(s=>s.id===r.course_session_id)?.session_number||''}`:''} · ${A.escapeHtml(r.file_name||'')}</small></div><button class="app-btn small danger" data-delete="resource" data-id="${r.id}">Delete</button></div>`).join(''):empty('No optional course resource uploaded.','fa-folder-open');}
  function renderPayments(){
    const q=document.getElementById('paymentSearch')?.value.trim().toLowerCase()||'';
    const st=document.getElementById('paymentStatusFilter')?.value||'all';
    const rows=state.payments.filter(p=>(st==='all'||p.status===st)&&(!q||`${p.invoice_no} ${p.transaction_reference} ${p.provider_request_id||''} ${profileName(p.student_id)} ${courseName(p.course_id)}`.toLowerCase().includes(q)));
    document.getElementById('adminPaymentsBody').innerHTML=rows.length?rows.map(p=>{
      const hosted=p.provider==='infinity';
      const providerInfo=hosted?`<small class="muted" style="display:block">Local Bank Transfer #${A.escapeHtml(p.provider_request_id||'—')}</small>`:'';
      const receiptAction=hosted?'<span class="status-pill neutral">Hosted Verify</span>':p.receipt_path?`<button class="app-btn small outline" data-view-receipt="${p.id}">Receipt</button>`:'';
      return `<tr class="${p.duplicate_flag?'duplicate-payment-row':''}"><td><b>${A.escapeHtml(p.invoice_no||'Pending')}</b>${providerInfo}${p.duplicate_flag?'<span class="status-pill bad"><i class="fa-solid fa-triangle-exclamation"></i> Duplicate Warning</span>':''}</td><td>${A.escapeHtml(profileName(p.student_id))}<br><small>${A.escapeHtml(profileEmail(p.student_id))}</small></td><td>${A.escapeHtml(courseName(p.course_id))}</td><td>${A.formatMoney(p.amount,courseCurrency(p.course_id))}</td><td>${A.escapeHtml(hosted ? 'Local Bank Transfer' : (p.payment_method_name||'—'))}</td><td>${A.escapeHtml(p.transaction_reference||'—')}${p.provider_rejection_reason?`<small class="danger-text">${A.escapeHtml(p.provider_rejection_reason)}</small>`:''}${p.duplicate_reason?`<small class="danger-text">${A.escapeHtml(p.duplicate_reason)}</small>`:''}</td><td>${A.formatDateTime(p.created_at)}</td><td><span class="status-pill ${A.statusClass(p.status)}">${A.statusLabel(p.status)}</span></td><td><div class="table-actions">${receiptAction}<button class="app-btn small gold" data-review-payment="${p.id}">Review</button></div></td></tr>`;
    }).join(''):`<tr><td colspan="9">${empty('No payments match this filter.','fa-receipt')}</td></tr>`;
  }
  function renderStudents(){const target=document.getElementById('studentsBody');if(!target)return;const rows=state.profiles.filter(p=>p.role==='student');target.innerHTML=rows.length?rows.map(p=>`<tr><td><b>${A.escapeHtml(p.full_name||'Student')}</b></td><td>${A.escapeHtml(p.email||'')}</td><td>${A.escapeHtml(p.whatsapp||'—')}</td><td>${A.escapeHtml(p.country||'—')}</td><td>${A.escapeHtml(p.experience||'—')}</td><td>${A.formatDate(p.created_at)}</td></tr>`).join(''):`<tr><td colspan="6">${empty('No registered students.','fa-users')}</td></tr>`;}
  function renderSupport(){document.getElementById('supportBody').innerHTML=state.support.length?state.support.map(s=>`<tr><td>${A.escapeHtml(profileName(s.student_id))}</td><td>${A.escapeHtml(s.category)}</td><td><b>${A.escapeHtml(s.subject)}</b></td><td>${A.escapeHtml(s.message)}</td><td>${A.formatDateTime(s.created_at)}</td><td><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></td><td><div class="table-actions">${s.status!=='resolved'?`<button class="app-btn small green" data-support-status="resolved" data-id="${s.id}">Resolve</button>`:''}<button class="app-btn small outline" data-support-status="open" data-id="${s.id}">Reopen</button></div></td></tr>`).join(''):`<tr><td colspan="7">${empty('No support requests.','fa-headset')}</td></tr>`;}
  function renderMethods(){const builtIn=`<tr><td><b>Local Bank Transfer</b><small class="muted" style="display:block">Built-in</small></td><td>Automatic</td><td>—</td><td>Secure hosted local bank transfer for PKR course payments.</td><td><span class="status-pill ok">Active</span></td><td><span class="status-pill neutral"><i class="fa-solid fa-lock"></i> Locked</span></td></tr>`;const editable=state.methods.filter(m=>!/^(local bank transfer|infinity( money solutions)?)$/i.test(String(m.name||'').trim()));const rows=editable.map(m=>`<tr><td><b>${A.escapeHtml(m.name)}</b></td><td>${A.escapeHtml(m.account_title||'')}</td><td>${A.escapeHtml(m.account_number||'')}</td><td>${A.escapeHtml(m.instructions||'')}</td><td><span class="status-pill ${m.is_active?'ok':'warn'}">${m.is_active?'Active':'Inactive'}</span></td><td><div class="table-actions"><button class="app-btn small outline" data-edit="method" data-id="${m.id}">Edit</button><button class="app-btn small danger" data-delete="method" data-id="${m.id}">Delete</button></div></td></tr>`).join('');document.getElementById('methodsBody').innerHTML=builtIn+rows;}

  function populateCourseSelects(){const opts=state.courses.map(c=>`<option value="${c.id}">${A.escapeHtml(c.title)}</option>`).join('');document.getElementById('sessionCourseSelect').innerHTML=opts;const resourceSelect=document.getElementById('resourceCourseSelect');if(resourceSelect){resourceSelect.innerHTML=opts;updateResourceSessionOptions();}}

  function bindEvents(){
    prepareCourseSaveUi();
    document.querySelectorAll('[data-toggle-form]').forEach(btn=>btn.addEventListener('click',()=>{const box=document.getElementById(btn.dataset.toggleForm);box?.classList.add('open');if(box?.classList.contains('app-modal'))box.setAttribute('aria-hidden','false');if(btn.dataset.toggleForm==='signalFormBox'&&!document.getElementById('signalForm').elements.id.value)resetSignalForm();if(btn.dataset.toggleForm==='chartFormBox'&&!document.getElementById('chartForm').elements.id.value)resetChartForm();if(btn.dataset.toggleForm==='courseFormBox'&&!document.getElementById('courseForm').elements.id.value){const title=document.getElementById('courseFormTitle');if(title)title.textContent='Add Course';}}));
    document.querySelectorAll('[data-cancel-form]').forEach(btn=>btn.addEventListener('click',()=>{const box=document.getElementById(btn.dataset.cancelForm);box?.classList.remove('open');if(box?.classList.contains('app-modal'))box.setAttribute('aria-hidden','true');box?.querySelector('form')?.reset();if(btn.dataset.cancelForm==='signalFormBox')resetSignalForm();if(btn.dataset.cancelForm==='chartFormBox')resetChartForm();if(btn.dataset.cancelForm==='courseFormBox'){const title=document.getElementById('courseFormTitle');if(title)title.textContent='Add Course';setCourseThumbnailPreview(null,'');}}));
    document.getElementById('resourceCourseSelect')?.addEventListener('change',updateResourceSessionOptions);document.getElementById('courseForm').elements.course_type.addEventListener('change',syncCourseTypeFields);syncCourseTypeFields();document.getElementById('addCourseSessionBtn').addEventListener('click',()=>{const editor=document.getElementById('courseSessionEditor'),count=editor.querySelectorAll('[data-course-session-row]').length;editor.insertAdjacentHTML('beforeend',courseSessionTemplate({},count));renumberCourseSessionRows();});document.getElementById('courseSessionEditor').addEventListener('click',e=>{const button=e.target.closest('[data-remove-course-session]');if(!button)return;const rows=document.querySelectorAll('[data-course-session-row]');if(rows.length===1)return A.toast('A course needs at least one class session.','warning');button.closest('[data-course-session-row]').remove();renumberCourseSessionRows();});document.getElementById('paymentStatusFilter').addEventListener('change',renderPayments);document.getElementById('paymentSearch').addEventListener('input',renderPayments);document.getElementById('adminSignalSearch').addEventListener('input',renderSignals);document.querySelectorAll('[data-admin-signal-view]').forEach(btn=>btn.addEventListener('click',()=>{document.getElementById('adminSignalView').value=btn.dataset.adminSignalView;renderSignals();}));
    document.getElementById('adminSearch').addEventListener('input',e=>{const q=e.currentTarget.value.trim().toLowerCase();document.querySelectorAll('.panel.on tbody tr,.panel.on article.content-card,.panel.on .announcement,.panel.on .resource-row').forEach(row=>row.classList.toggle('hidden',q&&!row.textContent.toLowerCase().includes(q)));});
    bindInstrumentPicker();
    bindChartInstrumentPicker();
    document.getElementById('chartForm').elements.image.addEventListener('change',event=>renderChartImagePreview(event.target.files?.[0]||null));
    const sf=document.getElementById('signalForm');['entry_from','entry_to','stop_loss','take_profit_1','take_profit_2','take_profit_3','take_profit_4'].forEach(n=>sf.elements[n]?.addEventListener('input',renderSignalCalculationPreview));document.getElementById('signalDirectionOrder')?.addEventListener('change',e=>syncSignalDirectionOrder(e.currentTarget.value));
    document.getElementById('signalNoteTemplate').addEventListener('change',e=>{if(e.target.value){const t=sf.elements.notes;t.value=t.value?`${t.value.trim()}\n${e.target.value}`:e.target.value;e.target.value='';}});
    document.getElementById('signalActionSelect').addEventListener('change',renderStatusPreview);document.getElementById('signalStatusForm').elements.close_price?.addEventListener('input',renderStatusPreview);
    sf.addEventListener('submit',saveSignal);document.getElementById('signalStatusForm').addEventListener('submit',saveSignalStatus);document.getElementById('chartForm').addEventListener('submit',saveChart);document.getElementById('articleForm').addEventListener('submit',saveArticle);document.getElementById('announcementForm').addEventListener('submit',saveAnnouncement);document.getElementById('courseForm').addEventListener('submit',saveCourse);document.getElementById('sessionForm').addEventListener('submit',saveSession);document.getElementById('resourceForm')?.addEventListener('submit',saveResource);document.getElementById('methodForm').addEventListener('submit',saveMethod);document.getElementById('paymentReviewForm').addEventListener('submit',reviewPayment);
    document.body.addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]');if(edit)editRecord(edit.dataset.edit,edit.dataset.id);const del=e.target.closest('[data-delete]');if(del)await deleteRecord(del.dataset.delete,del.dataset.id,del);const update=e.target.closest('[data-signal-update]');if(update)openSignalStatus(update.dataset.signalUpdate);const history=e.target.closest('[data-signal-history]');if(history)openSignalHistory(history.dataset.signalHistory);const review=e.target.closest('[data-review-payment]');if(review)openPaymentReview(review.dataset.reviewPayment);const receipt=e.target.closest('[data-view-receipt]');if(receipt)await viewReceipt(receipt.dataset.viewReceipt);const support=e.target.closest('[data-support-status]');if(support)await updateSupport(support.dataset.id,support.dataset.supportStatus,support);});
  }

  function syncSignalDirectionOrder(value) {
    const f=document.getElementById('signalForm');
    if(!f)return;
    const select=document.getElementById('signalDirectionOrder');
    const raw=String(value || select?.value || 'BUY|market');
    const [direction,orderType]=raw.split('|');
    f.elements.direction.value=direction==='SELL'?'SELL':'BUY';
    f.elements.order_type.value=['limit','stop'].includes(orderType)?orderType:'market';
    if(select && select.value!==`${f.elements.direction.value}|${f.elements.order_type.value}`)select.value=`${f.elements.direction.value}|${f.elements.order_type.value}`;
    renderSignalCalculationPreview();
  }

  function bindInstrumentPicker(){const picker=document.getElementById('instrumentPicker'),search=document.getElementById('instrumentSearch'),menu=document.getElementById('instrumentMenu'),hidden=document.getElementById('signalForm').elements.symbol;const draw=()=>{const q=search.value.trim().toLowerCase();const filtered=instruments.filter(i=>!q||`${i.symbol} ${i.label}`.toLowerCase().includes(q));let group='';menu.innerHTML=filtered.map(i=>{const h=i.group!==group?(group=i.group,`<div class="instrument-group">${group}</div>`):'';return `${h}<button type="button" data-pair="${i.symbol}"><b>${i.label}</b><small>${i.unit}</small></button>`;}).join('')||'<div class="instrument-empty">No pair found</div>';};search.addEventListener('focus',()=>{draw();picker.classList.add('open');});search.addEventListener('input',()=>{hidden.value='';draw();picker.classList.add('open');});picker.querySelector('.instrument-toggle').addEventListener('click',()=>{draw();picker.classList.toggle('open');search.focus();});menu.addEventListener('click',e=>{const b=e.target.closest('[data-pair]');if(!b)return;selectInstrument(b.dataset.pair);picker.classList.remove('open');});document.addEventListener('click',e=>{if(!picker.contains(e.target))picker.classList.remove('open');});draw();}
  function selectInstrument(symbol){const meta=instrumentMeta(symbol),f=document.getElementById('signalForm');f.elements.symbol.value=meta.symbol;document.getElementById('instrumentSearch').value=meta.label;renderSignalCalculationPreview();}
  function resetSignalForm(){const f=document.getElementById('signalForm');f.reset();f.elements.id.value='';f.elements.symbol.value='';document.getElementById('instrumentSearch').value='';f.elements.is_published.checked=true;const combined=document.getElementById('signalDirectionOrder');if(combined)combined.value='BUY|market';syncSignalDirectionOrder('BUY|market');const title=document.getElementById('signalFormTitle');if(title)title.textContent='New Signal';}

  let chartPreviewObjectUrl='';
  function chartCategory(symbol){const value=String(symbol||'').toUpperCase();if(value==='XAUUSD')return'Gold';if(value==='XAGUSD')return'Silver';if(value==='BTCUSD')return'Crypto';return'Forex';}
  function bindChartInstrumentPicker(){const picker=document.getElementById('chartInstrumentPicker'),search=document.getElementById('chartInstrumentSearch'),menu=document.getElementById('chartInstrumentMenu'),form=document.getElementById('chartForm'),hidden=form?.elements.symbol;if(!picker||!search||!menu||!hidden)return;const draw=()=>{const q=search.value.trim().toLowerCase();const filtered=instruments.filter(i=>!q||`${i.symbol} ${i.label}`.toLowerCase().includes(q));let group='';menu.innerHTML=filtered.map(i=>{const h=i.group!==group?(group=i.group,`<div class="instrument-group">${group}</div>`):'';return `${h}<button type="button" data-chart-pair="${i.symbol}"><b>${i.label}</b><small>${chartCategory(i.symbol)}</small></button>`;}).join('')||'<div class="instrument-empty">No instrument found</div>';};search.addEventListener('focus',()=>{draw();picker.classList.add('open');picker.classList.remove('invalid');});search.addEventListener('input',()=>{hidden.value='';form.elements.category.value='';draw();picker.classList.add('open');});picker.querySelector('.instrument-toggle')?.addEventListener('click',()=>{draw();picker.classList.toggle('open');search.focus();});menu.addEventListener('click',event=>{const button=event.target.closest('[data-chart-pair]');if(!button)return;selectChartInstrument(button.dataset.chartPair);picker.classList.remove('open');});document.addEventListener('click',event=>{if(!picker.contains(event.target))picker.classList.remove('open');});draw();}
  function selectChartInstrument(symbol,autoTitle=true){const meta=instrumentMeta(symbol),form=document.getElementById('chartForm');if(!form)return;form.elements.symbol.value=meta.symbol;document.getElementById('chartInstrumentSearch').value=meta.label;form.elements.category.value=chartCategory(meta.symbol);document.getElementById('chartInstrumentPicker')?.classList.remove('invalid');if(autoTitle&&!form.elements.title.value.trim())form.elements.title.value=`${meta.label} ${form.elements.timeframe.value||''} Market Analysis`.replace(/\s+/g,' ').trim();}
  function resetChartForm(){const form=document.getElementById('chartForm');if(!form)return;form.reset();form.elements.id.value='';form.elements.existing_image_url.value='';form.elements.symbol.value='';form.elements.category.value='';form.elements.is_published.checked=true;document.getElementById('chartInstrumentSearch').value='';document.getElementById('chartInstrumentPicker')?.classList.remove('invalid','open');clearChartPreview();}
  function clearChartPreview(){if(chartPreviewObjectUrl){URL.revokeObjectURL(chartPreviewObjectUrl);chartPreviewObjectUrl='';}const preview=document.getElementById('chartImagePreview');if(preview){preview.className='chart-upload-preview empty';preview.innerHTML='<i class="fa-solid fa-image"></i><span>Selected chart image preview will appear here.</span>';}}
  function renderChartImagePreview(file,url=''){const preview=document.getElementById('chartImagePreview');if(!preview)return;if(chartPreviewObjectUrl){URL.revokeObjectURL(chartPreviewObjectUrl);chartPreviewObjectUrl='';}let source=url;if(file){chartPreviewObjectUrl=URL.createObjectURL(file);source=chartPreviewObjectUrl;}if(!source)return clearChartPreview();preview.className='chart-upload-preview';preview.innerHTML=`<img src="${attr(source)}" alt="Chart image preview">`;}
  function instrumentMeta(symbol){const key=String(symbol||'').replace('/','').toUpperCase();return instruments.find(i=>i.symbol===key)||{symbol:key,label:displaySymbol(symbol),unit:'pips',pip:key.startsWith('BTC')?10:key.endsWith('JPY')?0.01:key==='XAUUSD'?0.1:key==='XAGUSD'?0.001:0.0001};}
  function calculateResult(signal,price){const p=Number(price);if(!Number.isFinite(p))return null;const entry=(Number(signal.entry_from)+(signal.entry_to!=null?Number(signal.entry_to):Number(signal.entry_from)))/2;const meta=instrumentMeta(signal.symbol);return Math.round(((signal.direction==='SELL'?entry-p:p-entry)/meta.pip)*10)/10;}
  function renderSignalCalculationPreview(){const f=document.getElementById('signalForm'),meta=instrumentMeta(f.elements.symbol.value),entry=referenceEntry(n(f.elements.entry_from.value),n(f.elements.entry_to.value)),sl=n(f.elements.stop_loss.value),tps=[1,2,3].map(i=>n(f.elements[`take_profit_${i}`].value));const values=[];const distance=x=>entry!=null&&x!=null?Math.abs(x-entry)/meta.pip:null;values.push(formatMeasure(distance(sl),meta.unit));tps.forEach(tp=>values.push(formatMeasure(distance(tp),meta.unit)));const risk=entry!=null&&sl!=null?Math.abs(entry-sl):null;const best=[...tps].filter(x=>x!=null).map(tp=>risk?Math.abs(tp-entry)/risk:null).filter(Boolean).pop();values.push(best?`1:${best.toFixed(2)}`:'—');document.querySelectorAll('#signalCalculationPreview b').forEach((b,i)=>b.textContent=values[i]||'—');}

  async function saveSignal(e){e.preventDefault();const f=e.currentTarget;syncSignalDirectionOrder(document.getElementById('signalDirectionOrder')?.value);const v=formValues(f),id=v.id||A.uid(),isEdit=Boolean(v.id);if(!v.symbol)return A.toast('Select a trading pair from the dropdown.','error');const zone=[n(v.entry_from),n(v.entry_to)].filter(x=>x!=null).sort((a,b)=>a-b),entryFrom=zone[0],entryTo=zone.length>1?zone[1]:null,entry=referenceEntry(entryFrom,entryTo),sl=n(v.stop_loss),targets=[n(v.take_profit_1),n(v.take_profit_2),n(v.take_profit_3)].filter(x=>x!=null);if(entry==null||sl==null||targets.length<3)return A.toast('Entry, Stop Loss, TP1, TP2 and TP3 are required.','error');if(v.direction==='BUY'&&(sl>=entry||targets.some(tp=>tp<=entry)))return A.toast('For BUY signals, SL must be below entry and all targets must be above entry.','error');if(v.direction==='SELL'&&(sl<=entry||targets.some(tp=>tp>=entry)))return A.toast('For SELL signals, SL must be above entry and all targets must be below entry.','error');const ordered=v.direction==='BUY'?targets.every((tp,i)=>!i||tp>targets[i-1]):targets.every((tp,i)=>!i||tp<targets[i-1]);if(!ordered)return A.toast('TP levels must progress in the correct order.','error');const row={id,symbol:v.symbol,direction:v.direction,order_type:v.order_type,entry_from:entryFrom,entry_to:entryTo,stop_loss:sl,take_profit_1:n(v.take_profit_1),take_profit_2:n(v.take_profit_2),take_profit_3:n(v.take_profit_3),take_profit_4:null,notes:v.notes,audience_access:v.audience_access,is_published:checked(f,'is_published'),created_by:state.profile.id,result_unit:'pips'};const button=f.querySelector('button[type=submit]');A.setLoading(button,true,isEdit?'Saving changes...':'Publishing...');try{const old=state.signals.find(s=>s.id===id);const query=isEdit?A.supabase.from('signals').update(omit(row,'id','created_by')).eq('id',id):A.supabase.from('signals').insert({...row,status:'active',tp_hit:0,be_moved:false,published_at:new Date().toISOString()});const {error}=await query;if(error)throw error;if(isEdit){const {error:hError}=await A.supabase.from('signal_updates').insert({signal_id:id,event_type:'edited',previous_status:old?.status||'active',new_status:old?.status||'active',result_pips:old?.result_pips??null,result_unit:old?.result_unit||instrumentMeta(v.symbol).unit,note:'Signal details edited by Admin.',notify_users:false,notification_title:'Signal Edited',notification_message:'Signal details were updated.',created_by:state.profile.id});if(hError)throw hError;}await loadAll();resetSignalForm();document.getElementById('signalFormBox').classList.remove('open');renderAll();A.toast(isEdit?'Signal updated without a new-signal notification.':'Signal published successfully.','success');}catch(error){A.toast(A.friendlyError(error,'Could not save signal.'),'error');}finally{A.setLoading(button,false);}}

  function availableActions(s){const list=[];const hit=Number(s.tp_hit||0);if(!s.be_moved)list.push(['move_to_be','Move SL to Breakeven']);if(s.take_profit_1&&hit<1)list.push(['tp1_hit','TP1 Hit']);if(s.take_profit_2&&hit<2)list.push(['tp2_hit','TP2 Hit']);if(s.take_profit_3&&hit<3)list.push(['tp3_hit','TP3 Hit & Close']);list.push(['sl_hit','SL Hit'],['breakeven_hit','Breakeven Hit'],['manually_closed','Close Trade Manually'],['cancelled','Cancel Signal']);return list;}
  function openSignalStatus(id){const s=state.signals.find(x=>x.id===id);if(!s)return;const f=document.getElementById('signalStatusForm');f.reset();f.elements.signal_id.value=id;document.getElementById('signalStatusSubtitle').textContent=`${displaySymbol(s.symbol)} ${s.direction} · ${entryText(s)}`;document.getElementById('signalResultUnitLabel').textContent=('pips').replace(/^./,c=>c.toUpperCase());document.getElementById('signalActionSelect').innerHTML='<option value="" selected disabled>Choose an action</option>'+availableActions(s).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');renderStatusPreview();A.openModal('signalStatusModal');}
  function automaticPipsForAction(signal,action,closePrice=null){
    const entry=referenceEntry(Number(signal.entry_from),signal.entry_to==null?null:Number(signal.entry_to));
    const prices={tp1_hit:Number(signal.take_profit_1),tp2_hit:Number(signal.take_profit_2),tp3_hit:Number(signal.take_profit_3),sl_hit:Number(signal.stop_loss),breakeven_hit:entry,manually_closed:(closePrice==null||String(closePrice).trim()===''?NaN:Number(closePrice))};
    const price=prices[action];
    if(!Number.isFinite(entry)||!Number.isFinite(price)) return null;
    return calculateResult(signal,price);
  }
  function renderStatusPreview(){
    const f=document.getElementById('signalStatusForm'),s=state.signals.find(x=>x.id===f.elements.signal_id.value);if(!s)return;
    const action=f.elements.action.value,input=f.elements.result_pips,closeField=document.getElementById('signalClosePriceField'),closeInput=f.elements.close_price;
    const manual=action==='manually_closed';
    closeField?.classList.toggle('hidden',!manual);
    if(!manual&&closeInput)closeInput.value='';
    const noResult=['move_to_be','cancelled'].includes(action);
    const automatic=noResult?null:automaticPipsForAction(s,action,closeInput?.value);
    input.readOnly=true; input.required=false;
    input.value=automatic==null?'':automatic;
    input.placeholder=noResult?'No Pip result required':manual?'Enter close price above to calculate':'Calculated automatically';
    const result=n(input.value);
    const label={tp1_hit:'TP1 current result',tp2_hit:'TP2 current result',tp3_hit:'TP3 final result — signal will close',sl_hit:'Final Stop Loss result',breakeven_hit:'Final Breakeven result',manually_closed:'Manual close result',move_to_be:'Trade remains active; no Pip result required',cancelled:'Signal will close as Cancelled; no Pip result required'}[action]||'Select an action';
    const autoLabel=action?`Automatic ${displaySymbol(s.symbol)} calculation`:'';
    document.getElementById('signalResultPreview').innerHTML=`<i class="fa-solid ${action==='move_to_be'?'fa-shield-halved':action==='cancelled'?'fa-ban':'fa-calculator'}"></i> ${label}${!noResult?` · ${autoLabel}: <b>${result==null?'Waiting for price':`${signed(result)} Pips`}</b>`:''}`;
  }
  async function saveSignalStatus(e){
    e.preventDefault();const f=e.currentTarget,v=formValues(f),button=f.querySelector('button[type=submit]');
    if(v.action==='manually_closed'&&n(v.close_price)==null)return A.toast('Enter the final close price. Pips will calculate automatically.','error');
    const selectedView=document.getElementById('adminSignalView')?.value||'active';
    A.setLoading(button,true,'Updating...');
    try{
      const {error}=await A.supabase.rpc('admin_update_signal_status_v969',{p_signal_id:v.signal_id,p_action:v.action,p_close_price:n(v.close_price),p_note:v.note||null,p_notify_users:checked(f,'notify_users')});
      if(error)throw error;
      await loadAll();A.closeModal('signalStatusModal');
      if(document.getElementById('adminSignalView'))document.getElementById('adminSignalView').value=selectedView;
      renderAll();
      A.toast(['tp3_hit','sl_hit','breakeven_hit','manually_closed','cancelled'].includes(v.action)?'Signal closed. Active/History counts updated without changing your tab.':'Signal status and Pips updated automatically.','success');
    }catch(error){A.toast(A.friendlyError(error,'Could not update signal.'),'error');}
    finally{A.setLoading(button,false);}
  }
  async function flushEmailQueueQuiet() {
    try {
      await A.supabase.functions.invoke('process-email-queue', { body: { limit: 50 } });
    } catch (error) {
      console.warn('Email delivery will retry later:', error);
    }
  }

  async function saveAnnouncement(e){e.preventDefault();const f=e.currentTarget,v=formValues(f),id=v.id||A.uid();if(v.audience==='course_students'&&!v.course_id)return A.toast('Select a course for this audience.','error');await save('announcements',{id,title:v.title,message:v.message,priority:v.priority,audience:v.audience||'all_students',course_id:v.audience==='course_students'?v.course_id:null,send_email:checked(f,'send_email'),send_browser:checked(f,'send_browser'),publish_at:v.publish_at?new Date(v.publish_at).toISOString():null,expires_at:v.expires_at?new Date(v.expires_at).toISOString():null,is_published:checked(f,'is_published'),published_at:v.id?undefined:new Date().toISOString(),created_by:state.profile.id},v.id,f,'Announcement saved.');if(checked(f,'send_email'))await flushEmailQueueQuiet();}
  function courseSessionTemplate(session={},index=0){
    const number=index+1;
    const title=session.title||`Class ${number}`;
    const starts=session.starts_at?isoToPktInput(session.starts_at):(number===1?'2026-08-20T21:00':'');
    const topic=session.topic||(number===1?'Basics of Forex\n• What is Forex trading?\n• How currency pairs work\n• Basic buy and sell concept':'');
    const duration=session.duration_minutes||90;
    return `<article class="course-session-row" data-course-session-row>
      <input type="hidden" data-session-field="id" value="${attr(session.id||'')}">
      <div class="course-session-row-head"><b>Class ${number}</b><button type="button" class="app-btn small danger session-remove-btn" data-remove-course-session title="Remove this class"><i class="fa-solid fa-trash"></i> Remove</button></div>
      <div class="form-grid">
        <div class="form-field"><label>Class Title / Number</label><input data-session-field="title" value="${attr(title)}" placeholder="Class ${number}" required></div>
        <div class="form-field"><label>Date & Time (Pakistan Time)</label><input type="datetime-local" data-session-field="starts_at" value="${attr(starts)}" required></div>
        <div class="form-field full"><label>Heading & What Students Will Learn</label><textarea data-session-field="topic" required>${A.escapeHtml(topic)}</textarea></div>
        <div class="form-field"><label>Duration Minutes</label><input type="number" min="15" data-session-field="duration_minutes" value="${attr(duration)}" required></div>
        <input type="hidden" data-session-field="meet_url" value="https://www.24kmrzero.com/"><div class="form-field"><label>Zoom Access</label><div class="notice info compact-notice"><i class="fa-brands fa-whatsapp"></i> Join link is shared in the WhatsApp Community.</div></div>
      </div>
    </article>`;
  }
  function renderCourseSessionEditor(sessions){
    const rows=(sessions&&sessions.length?sessions:[{}]).sort((a,b)=>(a.session_number||0)-(b.session_number||0));
    document.getElementById('courseSessionEditor').innerHTML=rows.map((row,index)=>courseSessionTemplate(row,index)).join('');
  }
  function collectCourseSessions(){
    return [...document.querySelectorAll('[data-course-session-row]')].map((row,index)=>({
      id:row.querySelector('[data-session-field="id"]').value||null,
      session_number:index+1,
      title:row.querySelector('[data-session-field="title"]').value.trim(),
      starts_at:row.querySelector('[data-session-field="starts_at"]').value,
      topic:row.querySelector('[data-session-field="topic"]').value.trim(),
      duration_minutes:Number(row.querySelector('[data-session-field="duration_minutes"]').value||90),
      meet_url:row.querySelector('[data-session-field="meet_url"]')?.value.trim()||'https://www.24kmrzero.com/'
    }));
  }
  function renumberCourseSessionRows(){
    [...document.querySelectorAll('[data-course-session-row]')].forEach((row,index)=>{
      row.querySelector('.course-session-row-head b').textContent=`Class ${index+1}`;
      const title=row.querySelector('[data-session-field="title"]');
      if(!title.value.trim()||/^Class \d+$/i.test(title.value.trim()))title.value=`Class ${index+1}`;
    });
  }

  function setCourseThumbnailPreview(file,url){
    const box=document.getElementById('courseThumbnailPreview');
    const img=document.getElementById('courseThumbnailPreviewImage');
    const label=document.getElementById('courseThumbnailPreviewLabel');
    const meta=document.getElementById('courseThumbnailPreviewMeta');
    if(!box||!img)return;
    if(!file&&!url){box.style.display='none';img.removeAttribute('src');return;}
    box.style.display='flex';
    if(file){
      const objectUrl=URL.createObjectURL(file);
      img.onload=()=>URL.revokeObjectURL(objectUrl);
      img.src=objectUrl;
      if(label)label.textContent='New thumbnail selected';
      if(meta)meta.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
    }else{
      img.src=url;
      if(label)label.textContent='Current saved thumbnail';
      if(meta)meta.textContent='Choose a new image only if you want to replace it.';
    }
  }
  function validatePublicImage(file,label='Image',field=null){
    if(!file)return;
    const type=String(file.type||'').toLowerCase();
    const ext=String(file.name||'').split('.').pop().toLowerCase();
    const allowedTypes=['image/png','image/jpeg','image/webp'];
    const allowedExt=['png','jpg','jpeg','webp'];
    if((type&&!allowedTypes.includes(type))||(!type&&!allowedExt.includes(ext))){const err=new Error(`${label} must be PNG, JPG or WEBP.`);err.field=field;throw err;}
    if(file.size<=0){const err=new Error(`${label} file is empty. Choose the image again.`);err.field=field;throw err;}
    if(file.size>8*1024*1024){const err=new Error(`${label} must be 8 MB or smaller.`);err.field=field;throw err;}
  }
  function validateCourseThumbnail(file){return validatePublicImage(file,'Course thumbnail',document.getElementById('courseForm')?.elements.thumbnail||null);}
  function imageContentType(file){const type=String(file?.type||'').toLowerCase();if(type)return type;const ext=String(file?.name||'').split('.').pop().toLowerCase();return ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';}
  async function persistCourseThumbnail(courseId,expectedUrl){
    if(!courseId||!expectedUrl)throw new Error('Course thumbnail could not be linked because the saved course ID or image URL is missing.');
    let saved=null;
    const rpc=await A.supabase.rpc('admin_set_course_thumbnail',{p_course_id:courseId,p_thumbnail_url:expectedUrl});
    if(!rpc.error&&rpc.data){saved=Array.isArray(rpc.data)?rpc.data[0]:rpc.data;}
    else if(rpc.error&&!/could not find the function|pgrst202|schema cache/i.test(String(rpc.error.message||''))){throw rpc.error;}
    if(!saved){const fallback=await A.supabase.from('courses').update({thumbnail_url:expectedUrl}).eq('id',courseId).select('id,thumbnail_url').single();if(fallback.error)throw fallback.error;saved=fallback.data;}
    if(String(saved?.thumbnail_url||'')!==String(expectedUrl)){const check=await A.supabase.from('courses').select('id,thumbnail_url').eq('id',courseId).single();if(check.error)throw check.error;if(String(check.data?.thumbnail_url||'')!==String(expectedUrl))throw new Error('Course was saved, but the thumbnail URL was not stored in the course record.');}
  }

  function prepareCourseSaveUi(){
    const courseForm=document.getElementById('courseForm');
    if(courseForm){
      courseForm.noValidate=true;
      const thumbInput=courseForm.elements.thumbnail;
      if(thumbInput&&!thumbInput.dataset.previewBound){
        thumbInput.dataset.previewBound='1';
        thumbInput.addEventListener('change',()=>{
          const file=thumbInput.files?.[0]||null;
          try{validateCourseThumbnail(file);setCourseThumbnailPreview(file,file?null:courseForm.elements.existing_thumbnail_url?.value||'');}
          catch(error){thumbInput.value='';setCourseThumbnailPreview(null,courseForm.elements.existing_thumbnail_url?.value||'');courseSaveError(error.message,thumbInput);}
        });
      }
      const foot=courseForm.querySelector('.app-modal-foot');
      if(foot&&!document.getElementById('courseSaveError')){
        const box=document.createElement('div');
        box.id='courseSaveError';
        box.className='notice bad hidden';
        box.setAttribute('role','alert');
        box.setAttribute('aria-live','assertive');
        box.style.cssText='margin:0 16px 12px;white-space:pre-wrap;word-break:break-word;';
        foot.parentNode.insertBefore(box,foot);
      }
    }
    const sessionForm=document.getElementById('sessionForm');
    if(sessionForm){
      sessionForm.noValidate=true;
    }
  }
  function prepareUrlInput(input){
    if(!input)return;
    input.type='text';
    input.inputMode='url';
    input.autocomplete='url';
    input.setAttribute('placeholder','https://your-secure-class-link.com/ or www.example.com');
  }
  function clearCourseSaveError(){
    const box=document.getElementById('courseSaveError');
    if(box){box.textContent='';box.classList.add('hidden');}
    document.querySelectorAll('#courseForm .course-field-invalid').forEach(el=>{el.classList.remove('course-field-invalid');el.style.outline='';el.style.outlineOffset='';});
  }
  function courseSaveError(message,field){
    const text=String(message||'Could not save course.');
    const box=document.getElementById('courseSaveError');
    if(box){box.textContent=text;box.classList.remove('hidden');}
    A.toast(text.length>180?'Course could not be saved. See the error inside the form.':text,'error',6500);
    if(field){field.classList.add('course-field-invalid');field.style.outline='2px solid #ef4444';field.style.outlineOffset='2px';field.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>field.focus?.(),180);}
  }
  function rawCourseError(error){
    const bits=[];
    if(error?.message)bits.push(error.message);
    if(error?.details)bits.push(`Details: ${error.details}`);
    if(error?.hint)bits.push(`Hint: ${error.hint}`);
    if(error?.code)bits.push(`Code: ${error.code}`);
    const joined=bits.filter(Boolean).join('\n');
    if(/admin_save_course_with_sessions_v2|pgrst202|could not find the function/i.test(joined)){
      return 'Course save database function is not installed yet. Run supabase/17_COURSE_SAVE_V2_DIAGNOSTICS.sql once, then try again.\n'+joined;
    }
    return joined||A.friendlyError(error,'Could not save course.');
  }
  function requireCourseField(value,message,field){
    if(String(value??'').trim())return;
    const err=new Error(message);err.field=field;throw err;
  }
  function safePktIso(value,label,field){
    requireCourseField(value,`${label} date and time is required.`,field);
    try{return pktToIso(value);}catch{const err=new Error(`${label} has an invalid date/time.`);err.field=field;throw err;}
  }

  async function saveCourse(e){
    e.preventDefault();
    const f=e.currentTarget,v=formValues(f),button=f.querySelector('button[type=submit]');
    let uploaded=null,courseBundleSaved=false,thumbnailCommitted=false,savedCourseId=String(v.id||'');
    clearCourseSaveError();
    A.setLoading(button,true,'Saving course...');
    try{
      const titleInput=f.elements.title;
      const captionInput=f.elements.short_description;
      requireCourseField(v.title,'Course heading is required.',titleInput);
      requireCourseField(v.short_description,'Short caption is required.',captionInput);
      const type=v.course_type||'paid';
      const price=type==='free'?0:Number(v.price||0);
      const discount=type==='free'?null:n(v.discount_price);
      if(type==='paid'&&(!Number.isFinite(price)||price<=0)){const err=new Error('Paid course price must be greater than zero.');err.field=f.elements.price;throw err;}
      if(discount!==null&&(!Number.isFinite(discount)||discount<0||discount>price)){const err=new Error('Discount price must be between zero and the regular price.');err.field=f.elements.discount_price;throw err;}
      const sessions=collectCourseSessions();
      if(!sessions.length)throw new Error('Add at least one class session.');
      const sessionRows=[...document.querySelectorAll('[data-course-session-row]')];
      sessions.forEach((session,index)=>{
        const row=sessionRows[index];
        const label=`Class ${session.session_number}`;
        requireCourseField(session.title,`${label} title is required.`,row?.querySelector('[data-session-field="title"]'));
        requireCourseField(session.topic,`${label} topic is required.`,row?.querySelector('[data-session-field="topic"]'));
        const durationField=row?.querySelector('[data-session-field="duration_minutes"]');
        if(!Number.isFinite(session.duration_minutes)||session.duration_minutes<15){const err=new Error(`${label} duration must be at least 15 minutes.`);err.field=durationField;throw err;}
        session.starts_at_iso=safePktIso(session.starts_at,label,row?.querySelector('[data-session-field="starts_at"]'));
        session.meet_url='https://www.24kmrzero.com/';
      });
      const file=f.elements.thumbnail.files?.[0]||null;
      validateCourseThumbnail(file);
      const existingThumbnail=String(v.existing_thumbnail_url||'').trim();
      const caption=String(v.short_description||'').trim();
      const coursePayload={
        id:v.id||null,
        title:String(v.title).trim(),
        slug:String(v.slug||slugify(v.title)).toLowerCase().trim().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,''),
        short_description:caption,
        instructor_name:String(v.instructor_name||'Malik Zameer').trim()||'Malik Zameer',
        course_type:type,
        price,
        discount_price:discount,
        currency:['PKR','USDT'].includes(String(v.currency||'PKR').toUpperCase())?String(v.currency||'PKR').toUpperCase():'PKR',
        status:'active',
        enrollment_open:checked(f,'enrollment_open'),
        thumbnail_url:existingThumbnail||null,
        is_published:checked(f,'is_published'),
        publish_at:v.publish_at?new Date(v.publish_at).toISOString():null,
        unpublish_at:v.unpublish_at?new Date(v.unpublish_at).toISOString():null,
        featured:checked(f,'featured')
      };
      const sessionPayload=sessions.map(session=>({
        id:session.id||null,
        session_number:session.session_number,
        title:session.title,
        topic:session.topic,
        starts_at:session.starts_at_iso,
        duration_minutes:session.duration_minutes,
        status:'upcoming',
        meet_url:session.meet_url
      }));
      console.info('[24K] Saving course bundle',{course:coursePayload.title,type:coursePayload.course_type,currency:coursePayload.currency,sessions:sessionPayload.length,thumbnailSelected:Boolean(file)});
      const {data,error}=await A.supabase.rpc('admin_save_course_with_sessions_v2',{p_course:coursePayload,p_sessions:sessionPayload});
      if(error)throw error;
      if(!data?.course_id)throw new Error('Database returned no course ID. Save was not confirmed.');
      courseBundleSaved=true;
      savedCourseId=String(data.course_id);
      f.elements.id.value=savedCourseId;

      if(file){
        A.setLoading(button,true,'Uploading thumbnail...');
        uploaded=await uploadPublicAsset(file,`courses/${savedCourseId}`);
        await persistCourseThumbnail(savedCourseId,uploaded.url);
        thumbnailCommitted=true;
        f.elements.existing_thumbnail_url.value=uploaded.url;
        setCourseThumbnailPreview(null,uploaded.url);
        if(existingThumbnail&&existingThumbnail!==uploaded.url){const oldPath=publicStoragePath(existingThumbnail,'content-assets');if(oldPath){const cleanup=await A.supabase.storage.from('content-assets').remove([oldPath]);if(cleanup.error)console.warn('Old course thumbnail cleanup skipped:',cleanup.error);}}
      }

      A.setLoading(button,true,'Refreshing course...');
      await loadAll();
      const saved=state.courses.find(course=>String(course.id)===savedCourseId);
      if(!saved)throw new Error(`Course was saved in the database but did not reload in Admin. Course ID: ${savedCourseId}`);
      if(file&&String(saved.thumbnail_url||'')!==String(uploaded?.url||''))throw new Error('Thumbnail upload completed, but the refreshed course record does not contain the new thumbnail URL.');
      f.reset();
      f.elements.id.value='';
      f.elements.existing_thumbnail_url.value='';
      setCourseThumbnailPreview(null,'');
      f.elements.instructor_name.value='Malik Zameer';
      f.elements.price.value='0';
      renderCourseSessionEditor();
      prepareCourseSaveUi();
      document.getElementById('courseFormBox').classList.remove('open');
      document.getElementById('courseFormBox').setAttribute('aria-hidden','true');
      const formTitle=document.getElementById('courseFormTitle');if(formTitle)formTitle.textContent='Add Course';
      renderAll();
      await flushEmailQueueQuiet();
      A.toast(`Course, ${data.sessions_saved||sessions.length} class session${sessions.length===1?'':'s'}${file?' and thumbnail':''} saved successfully.`,'success',5500);
    }catch(error){
      if(uploaded?.path&&!thumbnailCommitted)try{await A.supabase.storage.from('content-assets').remove([uploaded.path]);}catch{}
      console.error('Course save failed:',error);
      let message=rawCourseError(error);
      if(courseBundleSaved&&!thumbnailCommitted&&f.elements.thumbnail.files?.[0])message=`Course and class sessions were saved, but the thumbnail could not be saved. You can press Save again after fixing the thumbnail issue; the same course will be updated, not duplicated.\n\n${message}`;
      if(/content-assets|bucket not found|storage|row-level security|permission/i.test(String(error?.message||'')))message+=`\n\nRun supabase/25_MEDIA_STORAGE_AND_THUMBNAIL_FIX.sql once, then retry the same course.`;
      courseSaveError(message,error?.field||f.elements.thumbnail);
    }finally{A.setLoading(button,false);}
  }
  async function saveSession(e){
    e.preventDefault();const f=e.currentTarget,v=formValues(f),id=v.id||A.uid(),button=f.querySelector('button[type=submit]');
    A.setLoading(button,true,'Saving...');
    try{
      if(!v.course_id)throw new Error('Choose a course.');
      if(!String(v.title||'').trim())throw new Error('Session title is required.');
      if(!String(v.topic||'').trim())throw new Error('Class topic is required.');
      if(!v.starts_at)throw new Error('Session date and time is required.');
      if(Number(v.duration_minutes||0)<15)throw new Error('Duration must be at least 15 minutes.');
      const row={id,course_id:v.course_id,session_number:Number(v.session_number),title:String(v.title).trim(),topic:String(v.topic).trim(),starts_at:pktToIso(v.starts_at),duration_minutes:Number(v.duration_minutes||90),status:v.status,created_by:state.profile.id};
      const {error}=v.id?await A.supabase.from('course_sessions').update(omit(row,'id','created_by')).eq('id',id):await A.supabase.from('course_sessions').insert(row);if(error)throw error;await flushEmailQueueQuiet();
      await loadAll();f.reset();f.elements.id.value='';document.getElementById('sessionFormBox').classList.remove('open');document.getElementById('sessionFormBox')?.setAttribute('aria-hidden','true');renderAll();A.toast('Zoom session saved. Join link will be shared in the WhatsApp Community.','success');
    }catch(error){console.error('Session save failed:',error);A.toast(A.friendlyError(error,'Could not save session.'),'error',6000);}finally{A.setLoading(button,false);}
  }
  async function saveResource(e){e.preventDefault();const f=e.currentTarget,v=formValues(f),file=f.elements.file.files[0],button=f.querySelector('button[type=submit]');if(!file)return A.toast('Choose a file.','error');A.setLoading(button,true,'Uploading...');try{const id=A.uid(),path=`${v.course_id}/${id}/${A.fileSafeName(file.name)}`;const upload=await A.supabase.storage.from('course-resources').upload(path,file,{contentType:file.type});if(upload.error)throw upload.error;const {error}=await A.supabase.from('course_resources').insert({id,course_id:v.course_id,course_session_id:v.course_session_id||null,title:v.title,description:v.description,file_path:path,file_name:file.name,mime_type:file.type,file_size:file.size,created_by:state.profile.id});if(error){await A.supabase.storage.from('course-resources').remove([path]);throw error;}await loadAll();f.reset();document.getElementById('resourceFormBox').classList.remove('open');renderAll();A.toast('Course resource uploaded.','success');}catch(error){A.toast(A.friendlyError(error,'Upload failed.'),'error');}finally{A.setLoading(button,false);}}
  async function saveMethod(e){e.preventDefault();const f=e.currentTarget,v=formValues(f),id=v.id||A.uid();await save('payment_methods',{id,name:v.name,account_title:v.account_title,account_number:v.account_number,instructions:v.instructions,sort_order:Number(v.sort_order||0),is_active:checked(f,'is_active')},v.id,f,'Payment method saved.');}
  async function save(table,row,existingId,form,message){const button=form.querySelector('button[type=submit]');A.setLoading(button,true,'Saving...');try{const clean=Object.fromEntries(Object.entries(row).filter(([,v])=>v!==undefined));const {error}=existingId?await A.supabase.from(table).update(omit(clean,'id','created_by')).eq('id',row.id):await A.supabase.from(table).insert(clean);if(error)throw error;await loadAll();form.reset();if(form.elements.id)form.elements.id.value='';form.closest('.admin-form-box')?.classList.remove('open');renderAll();A.toast(message,'success');}catch(error){A.toast(A.friendlyError(error,'Could not save record.'),'error');}finally{A.setLoading(button,false);}}

  function editRecord(type,id){const map={signal:['signals','signalForm','signalFormBox'],chart:['charts','chartForm','chartFormBox'],article:['articles','articleForm','articleFormBox'],announcement:['announcements','announcementForm','announcementFormBox'],course:['courses','courseForm','courseFormBox'],session:['sessions','sessionForm','sessionFormBox'],method:['methods','methodForm','methodFormBox']};const [key,formId,boxId]=map[type]||[];if(!key)return;const row=state[key].find(x=>x.id===id);if(!row)return;const f=document.getElementById(formId);f.reset();Object.entries(row).forEach(([k,val])=>{const el=f.elements[k];if(!el)return;if(el.type==='checkbox')el.checked=Boolean(val);else if(['starts_at','publish_at','unpublish_at','expires_at'].includes(k))el.value=isoToLocalInput(val);else el.value=val??'';});if(type==='signal'){selectInstrument(row.symbol);f.elements.id.value=id;const combined=document.getElementById('signalDirectionOrder');if(combined)combined.value=`${row.direction||'BUY'}|${row.order_type||'market'}`;syncSignalDirectionOrder(combined?.value);const title=document.getElementById('signalFormTitle');if(title)title.textContent='Edit Signal';renderSignalCalculationPreview();}if(type==='chart'){f.elements.existing_image_url.value=row.image_url||'';selectChartInstrument(row.symbol,false);renderChartImagePreview(null,row.image_url||'');}if(type==='article')f.elements.existing_cover_url.value=row.cover_url||'';if(type==='course'){const courseTitle=document.getElementById('courseFormTitle');if(courseTitle)courseTitle.textContent='Edit Course';f.elements.existing_thumbnail_url.value=row.thumbnail_url||'';setCourseThumbnailPreview(null,row.thumbnail_url||'');f.elements.short_description.value=row.short_description||row.description||'';f.elements.price.value=row.price||0;const courseSessions=state.sessions.filter(x=>x.course_id===id).sort((a,b)=>a.session_number-b.session_number);renderCourseSessionEditor(courseSessions.length?courseSessions:[{}]);}document.getElementById(boxId).classList.add('open');if(document.getElementById(boxId).classList.contains('app-modal'))document.getElementById(boxId).setAttribute('aria-hidden','false');else document.getElementById(boxId).scrollIntoView({behavior:'smooth',block:'start'});}
  async function deleteRecord(type,id,button){if(type==='signal')return A.toast('Signals are preserved in history. Use Cancel Signal or hide it through Edit.','warning');const confirmation=await A.confirmAction({title:`Delete ${A.statusLabel(type)}`,message:'This action cannot be undone and may affect connected records.',confirmText:'Delete Permanently',danger:true});if(!confirmation.confirmed)return;A.setLoading(button,true,'Deleting...');const map={chart:['charts','charts'],article:['articles','articles'],announcement:['announcements','announcements'],course:['courses','courses'],session:['course_sessions','sessions'],resource:['course_resources','resources'],method:['payment_methods','methods']};const [table,key]=map[type]||[];if(!table)return A.setLoading(button,false);try{const row=state[key].find(x=>x.id===id);const mediaUrl=type==='chart'?row?.image_url:type==='article'?row?.cover_url:type==='course'?row?.thumbnail_url:'';const mediaPath=publicStoragePath(mediaUrl,'content-assets');if(type==='resource'&&row?.file_path)await A.supabase.storage.from('course-resources').remove([row.file_path]);const {error}=await A.supabase.from(table).delete().eq('id',id);if(error)throw error;if(mediaPath){const cleanup=await A.supabase.storage.from('content-assets').remove([mediaPath]);if(cleanup.error)console.warn(`${type} media cleanup failed:`,cleanup.error);}await loadAll();renderAll();A.toast(mediaPath?`${A.statusLabel(type)} and its media deleted successfully.`:'Record deleted successfully.','success');}catch(error){A.toast(A.friendlyError(error,'Could not delete record.'),'error');}finally{A.setLoading(button,false);}}


  function openPaymentReview(id){const p=state.payments.find(x=>x.id===id);if(!p)return;const f=document.getElementById('paymentReviewForm');f.reset();f.elements.payment_id.value=id;f.elements.status.value=p.status==='approved'?'approved':p.status==='declined'?'declined':p.status==='resubmission_required'?'resubmission_required':'under_review';f.elements.admin_note.value=p.admin_note||'';if(f.elements.override_duplicate)f.elements.override_duplicate.checked=false;document.getElementById('reviewPaymentSummary').innerHTML=`<b>${A.escapeHtml(profileName(p.student_id))}</b><br>${A.escapeHtml(courseName(p.course_id))} · ${A.formatMoney(p.amount,courseCurrency(p.course_id))}<br>Reference: ${A.escapeHtml(p.transaction_reference||'—')}${p.duplicate_flag?`<div class="duplicate-warning"><i class="fa-solid fa-triangle-exclamation"></i><b>Duplicate warning</b><span>${A.escapeHtml(p.duplicate_reason||'This payment matches another record.')}</span></div>`:''}`;document.getElementById('duplicateOverrideWrap')?.classList.toggle('hidden',!p.duplicate_flag);A.openModal('paymentReviewModal');}
  async function reviewPayment(e){e.preventDefault();const f=e.currentTarget,v=formValues(f),button=f.querySelector('button[type=submit]');if(['declined','resubmission_required'].includes(v.status)&&!String(v.admin_note||'').trim())return A.toast('A clear reason is required.','error');const payment=state.payments.find(x=>x.id===v.payment_id);if(v.status==='approved'){const confirmation=await A.confirmAction({title:'Approve Payment & Unlock Course',message:`Approve ${profileName(payment?.student_id)} payment and activate ${courseName(payment?.course_id)}?`,confirmText:'Approve & Unlock'});if(!confirmation.confirmed)return;}A.setLoading(button,true,'Saving...');try{const {error}=await A.supabase.rpc('admin_review_payment_v2',{p_payment_id:v.payment_id,p_status:v.status,p_admin_note:v.admin_note||null,p_override_duplicate:Boolean(f.elements.override_duplicate?.checked)});if(error)throw error;await flushEmailQueueQuiet();await loadAll();A.closeModal('paymentReviewModal');renderAll();A.toast(v.status==='approved'?'Payment approved and course access activated.':v.status==='resubmission_required'?'New receipt requested from the student.':'Payment status updated successfully.','success');}catch(error){A.toast(A.friendlyError(error,'Could not update payment.'),'error');}finally{A.setLoading(button,false);}}
  async function viewReceipt(id){const p=state.payments.find(x=>x.id===id);if(!p?.receipt_path)return;const {data,error}=await A.supabase.storage.from('payment-receipts').createSignedUrl(p.receipt_path,180);if(error)return A.toast(A.friendlyError(error),'error');const url=data.signedUrl,content=document.getElementById('receiptPreviewContent'),external=document.getElementById('receiptOpenExternal');if(!content||!external)return window.open(url,'_blank','noopener');const isPdf=/\.pdf(?:$|\?)/i.test(p.receipt_path);content.innerHTML=isPdf?`<iframe src="${attr(url)}" title="Payment receipt PDF"></iframe>`:`<img src="${attr(url)}" alt="Payment receipt">`;external.href=url;document.getElementById('receiptPreviewSubtitle').textContent=`${profileName(p.student_id)} · ${p.invoice_no||p.transaction_reference||'Receipt'}`;A.openModal('receiptPreviewModal');}
  async function updateSupport(id,status,button){A.setLoading(button,true,'Updating...');try{const {error}=await A.supabase.rpc('admin_update_support',{p_request_id:id,p_status:status,p_note:null});if(error)throw error;await flushEmailQueueQuiet();await loadAll();renderAll();A.toast('Support request updated and student notified.','success');}catch(error){A.toast(A.friendlyError(error),'error');}finally{A.setLoading(button,false);}}
  async function uploadPublicAsset(file,prefix){validatePublicImage(file,'Image');const safe=A.fileSafeName(file.name||'image').replace(/^-+|-+$/g,'')||`image-${Date.now()}.jpg`;const path=`${prefix}/${Date.now()}-${A.uid().slice(0,8)}-${safe}`;const bucket=A.supabase.storage.from('content-assets');const upload=await bucket.upload(path,file,{contentType:imageContentType(file),upsert:false,cacheControl:'3600'});if(upload.error){const err=new Error(`Public media upload failed: ${upload.error.message||upload.error}`);err.code=upload.error.statusCode||upload.error.status||upload.error.code;throw err;}const {data}=bucket.getPublicUrl(path);const publicUrl=String(data?.publicUrl||'').trim();if(!publicUrl){await bucket.remove([path]);throw new Error('Storage accepted the image but did not return a public URL.');}return{path,url:publicUrl,bucket:'content-assets'};}
  async function uploadPublic(file,prefix){return(await uploadPublicAsset(file,prefix)).url;}
  function publicStoragePath(url,bucket){if(!url)return'';try{const marker=`/storage/v1/object/public/${bucket}/`;const parsed=new URL(url);const index=parsed.pathname.indexOf(marker);return index<0?'':decodeURIComponent(parsed.pathname.slice(index+marker.length));}catch{return'';}}
  function syncCourseTypeFields(){const f=document.getElementById('courseForm'),isFree=f.elements.course_type.value==='free';if(isFree){f.elements.price.value='0';f.elements.discount_price.value='';}f.elements.price.disabled=isFree;f.elements.discount_price.disabled=isFree;}
  function coursePriceText(c){const effective=c.discount_price!==null&&c.discount_price!==undefined?Number(c.discount_price):Number(c.price||0);if(c.course_type==='free'||effective===0)return '<span class="status-pill ok">Free</span>';const regular=A.formatMoney(c.price,c.currency);return c.discount_price!==null&&Number(c.discount_price)<Number(c.price)?`<b>${A.formatMoney(c.discount_price,c.currency)}</b><small class="price-old">${regular}</small>`:regular;}
  function updateResourceSessionOptions(){const c=document.getElementById('resourceCourseSelect').value;document.getElementById('resourceSessionSelect').innerHTML='<option value="">General Course Resource</option>'+state.sessions.filter(s=>s.course_id===c).map(s=>`<option value="${s.id}">Session ${s.session_number}: ${A.escapeHtml(s.title)}</option>`).join('');}
  function subscribeRealtime(){let timer;const refresh=()=>{clearTimeout(timer);timer=setTimeout(async()=>{try{await loadAll();renderAll();}catch(e){console.error(e);}},350);};A.supabase.channel('admin-live').on('postgres_changes',{event:'*',schema:'public',table:'signals'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'signal_updates'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'payments'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'support_requests'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},refresh).subscribe();}

  function formValues(f){return Object.fromEntries(new FormData(f).entries());}function checked(f,nm){return Boolean(f.elements[nm]?.checked);}function omit(o,...k){return Object.fromEntries(Object.entries(o).filter(([x])=>!k.includes(x)));}function slugify(t){return String(t).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString().slice(-5);}function n(v){return v===''||v==null?null:Number(v);}function num(v){return v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:5});}function signed(v){const x=Number(v||0);return `${x>0?'+':''}${Number.isInteger(x)?x:x.toFixed(1)}`;}function referenceEntry(a,b){return a==null?null:b==null?a:(Number(a)+Number(b))/2;}function displaySymbol(s){const x=String(s||'').replace('/','').toUpperCase();return x.length===6?`${x.slice(0,3)}/${x.slice(3)}`:x;}function entryText(s){return `${num(s.entry_from)}${s.entry_to!=null?` – ${num(s.entry_to)}`:''}`;}function formatMeasure(v,u){return v==null||!Number.isFinite(v)?'—':`${Number(v.toFixed(1)).toLocaleString()} ${u}`;}function audienceLabel(v){return {all_students:'All Students',course_students:'Course Students',premium_users:'Premium Users'}[v]||'All Students';}function eventLabel(v){return {published:'Signal Published',edited:'Signal Edited',move_to_be:'SL Moved to Breakeven',tp1_hit:'TP1 Hit',tp2_hit:'TP2 Hit',tp3_hit:'TP3 Hit',tp4_hit:'TP4 Hit',sl_hit:'SL Hit',breakeven_hit:'Breakeven Hit',manually_closed:'Trade Closed Manually',cancelled:'Signal Cancelled'}[v]||A.statusLabel(v);}function eventTone(v){return v==='sl_hit'||v==='cancelled'?'bad':v==='breakeven_hit'||v==='move_to_be'?'warn':v==='edited'?'neutral':'ok';}function pktToIso(v){return new Date(`${v}:00+05:00`).toISOString();}function isoToLocalInput(v){if(!v)return'';const d=new Date(v),pad=x=>String(x).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}function isoToPktInput(v){if(!v)return'';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v)).replace(' ','T');}function profileName(id){return state.profiles.find(p=>p.id===id)?.full_name||'Student';}function profileEmail(id){return state.profiles.find(p=>p.id===id)?.email||'';}function courseName(id){return state.courses.find(c=>c.id===id)?.title||'Course';}function courseCurrency(id){const raw=String(state.courses.find(c=>c.id===id)?.currency||'PKR').toUpperCase();return raw==='USD'||raw==='MYR'?'USDT':raw;}function empty(t,i){return `<div class="empty-state"><i class="fa-solid ${i}"></i>${A.escapeHtml(t)}</div>`;}function attr(v){return A.escapeHtml(v).replace(/`/g,'&#96;');}
})().catch(error=>{console.error(error);window.App?.toast(window.App.friendlyError(error,'Could not load admin panel.'),'error');document.getElementById('pageLoader')?.classList.add('hidden');document.getElementById('adminApp')?.classList.remove('hidden');});

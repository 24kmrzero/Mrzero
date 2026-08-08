(async function () {
  const A = window.App;
  const state = {
    user: null, profile: null, courses: [], sessions: [], sessionLinks: {}, enrollments: [], payments: [],
    paymentMethods: [], signals: [], signalUpdates: [], charts: [], articles: [], announcements: [], resources: [], support: [], riskAccepted: false,
    selectedCourse: null
  };
  window.StudentBase = { state, reload: async () => { await loadAll(); renderAll(); return state; } };
  let openPanel;
  let signalView = 'active';

  const result = await A.requireRole('student');
  if (!result) return;
  state.user = result.user;
  state.profile = result.profile;
  openPanel = A.activateDashboardNavigation();
  document.getElementById('logoutButton').addEventListener('click', A.logout);
  document.getElementById('supportWhatsApp').href = `https://wa.me/${A.cfg.SUPPORT_WHATSAPP}`;
  document.getElementById('supportEmail').href = `mailto:${A.cfg.SUPPORT_EMAIL}`;

  const initials = (state.profile.full_name || state.profile.email || 'ST').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  document.getElementById('welcomeName').textContent = `Welcome back, ${state.profile.full_name || 'Student'}`;
  document.getElementById('studentAvatar').textContent = initials;

  await loadAll();
  renderAll();
  bindEvents();
  subscribeRealtime();
  document.getElementById('pageLoader').classList.add('hidden');
  document.getElementById('studentApp').classList.remove('hidden');
  handlePaymentReturn();

  async function loadAll() {
    const sb = A.supabase;
    const requests = await Promise.all([
      sb.from('courses').select('*').eq('is_published', true).order('created_at', { ascending: false }),
      sb.from('course_sessions').select('*').order('starts_at', { ascending: true }),
      sb.from('course_session_links').select('course_session_id,meet_url'),
      sb.from('enrollments').select('*').eq('student_id', state.user.id),
      sb.from('payments').select('*,courses(title,currency)').eq('student_id', state.user.id).order('created_at', { ascending: false }),
      sb.from('payment_methods').select('*').eq('is_active', true).order('sort_order'),
      sb.from('signals').select('*').eq('is_published', true).order('published_at', { ascending: false }),
      sb.from('signal_updates').select('*').order('created_at', { ascending: false }),
      sb.from('charts').select('*').eq('is_published', true).order('published_at', { ascending: false }),
      sb.from('articles').select('*').eq('is_published', true).order('published_at', { ascending: false }),
      sb.from('announcements').select('*').eq('is_published', true).order('published_at', { ascending: false }),
      sb.from('course_resources').select('*').order('created_at', { ascending: false }),
      sb.from('support_requests').select('*').eq('student_id', state.user.id).order('created_at', { ascending: false }),
      sb.from('terms_acceptances').select('id').eq('user_id', state.user.id).eq('document_type', 'risk_disclaimer').eq('version', A.cfg.RISK_VERSION).limit(1)
    ]);
    const firstError = requests.find(item => item.error)?.error;
    if (firstError) throw firstError;
    state.courses=requests[0].data||[]; state.sessions=requests[1].data||[];
    state.sessionLinks=Object.fromEntries((requests[2].data||[]).map(row=>[row.course_session_id,row.meet_url]));
    state.enrollments=requests[3].data||[]; state.payments=requests[4].data||[]; state.paymentMethods=requests[5].data||[];
    state.signals=requests[6].data||[]; state.signalUpdates=requests[7].data||[]; state.charts=requests[8].data||[];
    state.articles=requests[9].data||[]; state.announcements=requests[10].data||[]; state.resources=requests[11].data||[]; state.support=requests[12].data||[];
    state.riskAccepted=Boolean(requests[13].data?.length);
  }

  function renderAll() {
    renderKpis(); renderDashboard(); renderSignals(); renderCharts(); renderArticles(); renderCourses();
    renderPayments(); renderAnnouncements(); renderProfile(); renderSupport();
    document.getElementById('paymentCount').textContent = state.payments.filter(p => ['initiated', 'received', 'under_review', 'resubmission_required'].includes(p.status)).length;
    document.getElementById('announcementCount').textContent = state.announcements.length;
    window.dispatchEvent(new CustomEvent('24k:student-base-updated',{detail:state}));
  }

  function renderKpis() {
    const activeSignals = state.signals.filter(s => !signalIsFinal(s)).length;
    const approvedCourses = state.enrollments.filter(isEnrollmentActive).length;
    const pending = state.payments.filter(p => ['initiated', 'received', 'under_review'].includes(p.status)).length;
    const finals = state.signals.filter(s => signalIsFinal(s) && s.status !== 'cancelled' && s.result_pips !== null);
    const wins = finals.filter(s => Number(s.result_pips) > 0).length;
    const losses = finals.filter(s => Number(s.result_pips) < 0).length;
    const breakeven = finals.filter(s => Number(s.result_pips) === 0).length;
    const forex = finals.filter(s => resultUnit(s.symbol) === 'pips');
    const markets = [];
    const totalPips = forex.reduce((sum,s)=>sum+Number(s.result_pips||0),0);
    const totalPoints = 0;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const weekPips = forex.filter(s=>new Date(s.closed_at)>=weekStart).reduce((sum,s)=>sum+Number(s.result_pips||0),0);
    const monthPips = forex.filter(s=>new Date(s.closed_at)>=monthStart).reduce((sum,s)=>sum+Number(s.result_pips||0),0);
    const winRate = finals.length ? Math.round((wins / finals.length) * 100) : 0;
    const data = [
      ['fa-bolt', activeSignals, 'Active Signals', 'signals'],
      ['fa-chart-line', state.charts.length, 'Published Charts', 'charts'],
      ['fa-newspaper', state.articles.length, 'Learning Articles', 'articles'],
      ['fa-graduation-cap', approvedCourses, 'Unlocked Courses', 'courses'],
      ['fa-receipt', pending, 'Pending Payments', 'payments']
    ];
    document.getElementById('studentKpis').innerHTML = data.map(([icon, value, label, panel]) => `<button type="button" class="app-kpi dashboard-nav-card" data-goto="${panel}" aria-label="Open ${label}"><i class="fa-solid ${icon}"></i><div><b>${value}</b><small>${label}</small></div><i class="fa-solid fa-arrow-right dashboard-nav-arrow"></i></button>`).join('');
    document.getElementById('signalPerformance').innerHTML = [
      ['Total Pips', signed(finals.filter(s=>s.status!=='cancelled').reduce((sum,s)=>sum+Number(s.result_pips||0),0))], ['Active Signals', state.signals.filter(s=>!signalIsFinal(s)).length], ['This Week Pips', signed(weekPips)],
      ['This Month Pips', signed(monthPips)], ['Win Rate', `${winRate}%`], ['Closed Signals', finals.length],
      ['Wins / Losses', `${wins} / ${losses}`], ['Breakeven', breakeven]
    ].map(([label, value]) => `<div class="performance-item"><small>${label}</small><b>${value}</b></div>`).join('');
  }


  function renderDashboard() {
    const pending = state.payments.find(p => ['received', 'under_review'].includes(p.status));
    const resubmit = state.payments.find(p => p.status === 'resubmission_required');
    const declined = state.payments.find(p => p.status === 'declined');
    const alert = document.getElementById('dashboardAlert');
    if (resubmit) alert.innerHTML = `<div class="notice bad"><i class="fa-solid fa-file-circle-exclamation"></i> Admin requested a new payment receipt. Open Payments and submit corrected proof. ${resubmit.admin_note?`<b>Reason: ${A.escapeHtml(resubmit.admin_note)}</b>`:''}</div>`;
    else if (pending) alert.innerHTML = `<div class="notice warn"><i class="fa-solid fa-hourglass-half"></i> Your payment <b>${A.escapeHtml(pending.invoice_no || '')}</b> is ${A.statusLabel(pending.status).toLowerCase()}. Course access will unlock only after admin approval.</div>`;
    else if (declined) alert.innerHTML = `<div class="notice bad"><i class="fa-solid fa-circle-xmark"></i> A payment was declined. Review the admin note in Payment History and submit a new receipt.</div>`;
    else alert.innerHTML = '';

    document.getElementById('latestSignal').innerHTML = `<div class="dashboard-preview-link" data-goto="signals" role="button" tabindex="0" aria-label="Open Signals">${state.signals[0] ? signalCard(state.signals[0], true) : empty('No signal has been published yet.', 'fa-bolt')}</div>`;
    const coursePreview = state.courses.slice(0, 2);
    document.getElementById('dashboardCourses').innerHTML = coursePreview.length ? coursePreview.map(course => {
      const access = hasCourseAccess(course.id);
      const payment = latestPayment(course.id);
      return `<div class="activity-item"><div class="activity-icon"><i class="fa-solid ${access ? 'fa-lock-open' : 'fa-lock'}"></i></div><div><b>${A.escapeHtml(course.title)}</b><small>${access ? 'Course access approved' : payment ? A.statusLabel(payment.status) : (course.course_type==='free'||Number(course.discount_price!=null?course.discount_price:course.price)===0 ? 'Free enrollment available' : `${A.formatMoney(course.discount_price!=null?course.discount_price:course.price, course.currency)} · Payment required`)}</small></div><button class="app-btn small ${access ? 'gold' : 'outline'}" data-open-course="${course.id}">${access ? 'Open' : 'Details'}</button></div>`;
    }).join('') : empty('No course is currently available.', 'fa-graduation-cap');

    const next = state.sessions.filter(s => new Date(s.starts_at) >= new Date() && s.status !== 'cancelled')[0] || state.sessions.find(s => s.status === 'upcoming');
    document.getElementById('nextSession').innerHTML = `<div class="dashboard-preview-link" data-goto="courses" role="button" tabindex="0" aria-label="Open Courses and live sessions">${next ? sessionCompact(next) : empty('No upcoming class has been scheduled.', 'fa-calendar')}</div>`;
    const notice = state.announcements[0];
    document.getElementById('latestAnnouncement').innerHTML = `<div class="dashboard-preview-link" data-goto="announcements" role="button" tabindex="0" aria-label="Open Announcements">${notice ? `<div class="announcement ${notice.priority === 'important' ? 'important' : ''}"><h4>${A.escapeHtml(notice.title)}</h4><p>${A.escapeHtml(notice.message)}</p><small>${A.formatDateTime(notice.published_at)}</small></div>` : empty('No announcement has been published.', 'fa-bullhorn')}</div>`;
  }

  function renderSignals() {
    const query = document.getElementById('signalSearch')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('signalStatusFilter')?.value || 'all';
    const direction = document.getElementById('signalDirectionFilter')?.value || 'all';
    const activeRows = state.signals.filter(s => !signalIsFinal(s));
    const historyRows = state.signals.filter(signalIsFinal);
    const activeCount = document.getElementById('activeSignalsTabCount');
    const historyCount = document.getElementById('historySignalsTabCount');
    if (activeCount) activeCount.textContent = activeRows.length;
    if (historyCount) historyCount.textContent = historyRows.length;
    document.querySelectorAll('[data-signal-view]').forEach(btn => {
      const selected = btn.dataset.signalView === signalView;
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    const baseRows = signalView === 'active' ? activeRows : historyRows;
    const rows = baseRows.filter(s => {
      const result = Number(s.result_pips || 0);
      const statusMatch = signalView === 'active' || status === 'all' || (status === 'wins' && result > 0) || (status === 'losses' && result < 0) || (status === 'breakeven' && s.status === 'breakeven_hit') || (status === 'cancelled' && s.status === 'cancelled');
      return (!query || `${s.symbol} ${s.notes || ''}`.toLowerCase().includes(query)) && statusMatch && (direction === 'all' || s.direction === direction);
    });
    const statusFilter = document.getElementById('signalStatusFilter');
    if (statusFilter) statusFilter.classList.toggle('hidden', signalView === 'active');
    document.getElementById('signalsGrid').innerHTML = rows.length
      ? (signalView === 'history' ? renderSignalHistoryGroups(rows) : renderSignalDateGroups(rows, signalView))
      : empty(signalView === 'active' ? 'No active signal is available.' : 'No closed signal matches these filters.', 'fa-filter');
    const latest=state.signalUpdates.find(u=>u.notify_users);
    document.getElementById('latestSignalUpdate').innerHTML=latest?`<div class="signal-update-banner"><i class="fa-solid fa-bell"></i><div><b>${A.escapeHtml(latest.notification_title||eventLabel(latest.event_type))}</b><small style="display:block;color:#888">${A.escapeHtml(latest.notification_message||'')} · ${A.formatDateTime(latest.created_at)}</small></div></div>`:'';
  }


  function renderSignalDateGroups(rows, view = 'active') {
    const groups = new Map();
    rows.forEach(signal => {
      const sourceDate = view === 'history' ? (signal.closed_at || signal.last_status_at || signal.updated_at || signal.published_at) : signal.published_at;
      const date = sourceDate ? new Date(sourceDate) : new Date();
      const key = Number.isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(signal);
    });
    return [...groups.entries()].map(([key, signals]) => {
      const label = signalDateLabel(key);
      return `<section class="signal-date-group"><div class="signal-date-label"><span>${A.escapeHtml(label)}</span><small>${signals.length} signal${signals.length === 1 ? '' : 's'}</small></div><div class="signal-date-cards">${signals.map(s => signalCard(s)).join('')}</div></section>`;
    }).join('');
  }

  function signalDateLabel(key) {
    if (key === 'unknown') return 'Older Signals';
    const parts = key.split('-').map(Number);
    const date = new Date(parts[0], parts[1]-1, parts[2]);
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }


  function historyDateParts(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return { date: '—', time: '—' };
    return {
      date: date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true })
    };
  }

  function renderSignalHistoryGroups(rows) {
    const groups = new Map();
    rows.forEach(signal => {
      const sourceDate = signal.closed_at || signal.last_status_at || signal.updated_at || signal.published_at;
      const date = sourceDate ? new Date(sourceDate) : new Date();
      const key = Number.isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(signal);
    });
    return [...groups.entries()].map(([key, signals]) => {
      const rowsHtml = signals.map(signal => {
        const closed = historyDateParts(signal.closed_at || signal.last_status_at || signal.updated_at);
        const published = historyDateParts(signal.published_at);
        const finalPips = signal.result_pips == null ? '—' : `${signed(signal.result_pips)} Pips`;
        const finalClass = Number(signal.result_pips) > 0 ? 'result-positive' : Number(signal.result_pips) < 0 ? 'result-negative' : '';
        return `<tr class="signal-report-row" data-student-signal-history="${signal.id}" tabindex="0" role="button" aria-label="Open ${attr(displaySymbol(signal.symbol))} signal history">
          <td>${A.escapeHtml(closed.date)}</td>
          <td>${A.escapeHtml(closed.time)}</td>
          <td><b>${displaySymbol(signal.symbol)}</b></td>
          <td><span class="direction ${String(signal.direction).toLowerCase()}">${A.escapeHtml(signal.direction)}</span></td>
          <td>${A.escapeHtml(A.statusLabel(signal.order_type || 'market'))}</td>
          <td><b>${entryText(signal)}</b></td>
          <td>${num(signal.stop_loss)}</td>
          <td>${num(signal.take_profit_1)}</td>
          <td>${num(signal.take_profit_2)}</td>
          <td>${num(signal.take_profit_3)}</td>
          <td><span class="status-pill ${A.statusClass(signal.status)}">${A.statusLabel(signal.status)}</span></td>
          <td><b class="${finalClass}">${finalPips}</b></td>
          <td>${A.escapeHtml(published.time)}<small>${A.escapeHtml(published.date)}</small></td>
          <td>${A.escapeHtml(closed.time)}<small>${A.escapeHtml(closed.date)}</small></td>
        </tr>`;
      }).join('');
      return `<section class="signal-date-group signal-history-report-group">
        <div class="signal-date-label"><span>${A.escapeHtml(signalDateLabel(key))}</span><small>${signals.length} signal${signals.length === 1 ? '' : 's'}</small></div>
        <div class="signal-history-table-wrap">
          <table class="signal-history-report-table">
            <thead><tr>
              <th>Date</th><th>Time</th><th>Pair</th><th>Direction</th><th>Order Type</th><th>Entry / Zone</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>Final Result</th><th>Final Pips</th><th>Published</th><th>Closed</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </section>`;
    }).join('');
  }

  function signalEventResult(signalId, eventType) {
    return state.signalUpdates.find(update => update.signal_id === signalId && update.event_type === eventType && update.result_pips !== null && update.result_pips !== undefined);
  }

  function signalCard(signal, compact = false) {
    const total=3, hit=Math.min(3,Number(signal.tp_hit||0)), progress=Math.min(100,Math.round(hit/total*100));
    const unit=signal.result_unit||resultUnit(signal.symbol); const final=signalIsFinal(signal);
    const targets=[1,2,3].map(i=>{
      const price=signal[`take_profit_${i}`]; if(price==null)return'';
      const event=signalEventResult(signal.id,`tp${i}_hit`);
      const resultText=event?`<span class="tp-manual-result ${Number(event.result_pips)>=0?'positive':'negative'}">${signed(event.result_pips)} ${event.result_unit||unit}</span>`:'';
      return `<div class="signal-level ${hit>=i?'hit':''}"><small>TP${i}${hit>=i?' ✓':''}</small><b>${num(price)}</b>${resultText}</div>`;
    }).join('');
    const levels=compact?'':`<div class="signal-levels"><div class="signal-level"><small>Entry ${signal.entry_to?'Zone':'Price'}</small><b>${entryText(signal)}</b></div><div class="signal-level"><small>Stop Loss</small><b>${num(signal.stop_loss)}</b></div></div><div class="tp-list">${targets}</div><div class="signal-progress-wrap"><div class="signal-progress-label"><span>TP Progress</span><b>${progress}%</b></div><div class="signal-progress"><span style="width:${progress}%"></span></div></div>`;
    const tone=signal.status==='sl_hit'?'final-loss':['breakeven_hit','cancelled'].includes(signal.status)?'final-neutral':'';
    return `<article class="signal-card ${String(signal.direction).toLowerCase()} ${tone}"><div class="signal-body"><div class="signal-head"><div><div style="display:flex;gap:7px;align-items:center"><span class="direction ${String(signal.direction).toLowerCase()}">${A.escapeHtml(signal.direction)}</span><span class="signal-order-badge">${A.statusLabel(signal.order_type||'market')}</span></div><h3>${displaySymbol(signal.symbol)}</h3></div><span class="status-pill ${A.statusClass(signal.status)}">${A.statusLabel(signal.status)}</span></div>${signal.be_moved?'<div class="be-badge"><i class="fa-solid fa-shield-halved"></i> Stop Loss Moved to Breakeven</div>':''}${levels}<p>${A.escapeHtml(signal.notes || 'No additional note.')}</p><div class="course-meta"><span><i class="fa-solid fa-clock"></i> ${A.formatDateTime(final?(signal.closed_at||signal.last_status_at):signal.published_at)}</span>${signal.result_pips !== null && signal.result_pips !== undefined ? `<span class="${Number(signal.result_pips)>0?'result-positive':Number(signal.result_pips)<0?'result-negative':''}"><i class="fa-solid fa-chart-simple"></i> ${final?'Final':'Current'}: ${signed(signal.result_pips)} ${unit}</span>` : ''}</div>${compact?'':`<div class="signal-card-actions"><button class="app-btn small outline" data-student-signal-history="${signal.id}"><i class="fa-solid fa-clock-rotate-left"></i> View History</button></div>`}</div></article>`;
  }


  function openSignalHistory(id){
    const signal=state.signals.find(s=>s.id===id); if(!signal)return;
    const events=state.signalUpdates.filter(u=>u.signal_id===id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    document.getElementById('studentSignalHistoryTitle').textContent=`${displaySymbol(signal.symbol)} ${signal.direction} History`;
    document.getElementById('studentSignalHistoryContent').innerHTML=`<div class="signal-history-summary"><div><small>Entry</small><b>${entryText(signal)}</b></div><div><small>Status</small><b>${A.statusLabel(signal.status)}</b></div><div><small>Result</small><b>${signal.result_pips==null?'—':`${signed(signal.result_pips)} ${signal.result_unit||resultUnit(signal.symbol)}`}</b></div><div><small>Published</small><b>${A.formatDateTime(signal.published_at)}</b></div></div><div class="signal-timeline">${events.length?events.map(ev=>`<div class="timeline-event ${eventTone(ev.event_type)}"><span class="timeline-dot"></span><div><div class="timeline-title"><b>${eventLabel(ev.event_type)}</b><time>${A.formatDateTime(ev.created_at)}</time></div>${ev.notification_message?`<p>${A.escapeHtml(ev.notification_message)}</p>`:''}${ev.note?`<small>Note: ${A.escapeHtml(ev.note)}</small>`:''}${ev.result_pips!=null?`<span class="timeline-result">${signed(ev.result_pips)} ${ev.result_unit}</span>`:''}</div></div>`).join(''):empty('No history recorded yet.','fa-clock-rotate-left')}</div>`;
    A.openModal('studentSignalHistoryModal');
  }


  function renderCharts() {
    const query = document.getElementById('chartSearch')?.value.trim().toLowerCase() || '';
    const tf = document.getElementById('chartTimeframeFilter')?.value || 'all';
    const rows = state.charts.filter(c => (!query || `${c.title} ${c.symbol} ${c.summary}`.toLowerCase().includes(query)) && (tf === 'all' || c.timeframe === tf));
    document.getElementById('chartsGrid').innerHTML = rows.length ? rows.map(chart => `<article class="content-card"><div class="content-cover ${chart.image_url ? 'has-image' : ''}">${chart.image_url ? `<img src="${attr(chart.image_url)}" alt="${attr(chart.title)}" loading="lazy" decoding="async">` : '<i class="fa-solid fa-chart-candlestick"></i>'}</div><div class="content-body"><div class="course-meta"><span>${A.escapeHtml(chart.symbol)}</span><span>${A.escapeHtml(chart.timeframe || '—')}</span><span>${A.escapeHtml(chart.category || 'Market Analysis')}</span><span>${A.formatDate(chart.published_at)}</span></div><h3>${A.escapeHtml(chart.title)}</h3><p>${A.escapeHtml(chart.summary || '')}</p><div class="card-actions"><button class="app-btn small gold" data-read-chart="${chart.id}">View Details</button>${chart.image_url ? `<a class="app-btn small outline" href="${attr(chart.image_url)}" target="_blank"><i class="fa-solid fa-up-right-from-square"></i> Full Chart</a>` : ''}</div></div></article>`).join('') : empty('No chart analysis matches your search.', 'fa-chart-line');
  }

  function renderArticles() {
    const query = document.getElementById('articleSearch')?.value.trim().toLowerCase() || '';
    const rows = state.articles.filter(a => !query || `${a.title} ${a.excerpt} ${a.content}`.toLowerCase().includes(query));
    document.getElementById('articlesGrid').innerHTML = rows.length ? rows.map(article => `<article class="content-card"><div class="content-cover ${article.cover_url ? 'has-image' : ''}">${article.cover_url ? `<img src="${attr(article.cover_url)}" alt="${attr(article.title)}" loading="lazy" decoding="async">` : '<i class="fa-solid fa-book-open"></i>'}</div><div class="content-body"><div class="course-meta"><span>${A.escapeHtml(article.category || 'Education')}</span><span><i class="fa-solid fa-calendar"></i> ${A.formatDate(article.published_at)}</span></div><h3>${A.escapeHtml(article.title)}</h3><p>${A.escapeHtml(article.excerpt || '')}</p><button class="app-btn small gold" data-read-article="${article.id}">Read Article</button></div></article>`).join('') : empty('No article matches your search.', 'fa-newspaper');
  }

  function renderCourses() {
    document.getElementById('coursesGrid').innerHTML = state.courses.length ? state.courses.map(course => {
      const access = hasCourseAccess(course.id);
      const payment = latestPayment(course.id);
      const nextSession=state.sessions.filter(s=>s.course_id===course.id&&s.status!=='cancelled').sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0];
      const actualPrice=course.discount_price!=null?Number(course.discount_price):Number(course.price);
      const paymentText = payment ? A.statusLabel(payment.status) : (course.course_type==='free'||actualPrice===0 ? 'Free enrollment' : 'Payment required');
      const isInfinity = String(course.currency||'').toUpperCase()==='PKR';
      const paymentButtonText = payment?.status==='initiated' ? 'Continue Payment' : payment && ['received','under_review'].includes(payment.status) ? 'Payment Submitted' : payment?.status==='resubmission_required' ? 'Submit New Receipt' : ['failed','declined'].includes(payment?.status) ? 'Try Payment Again' : isInfinity ? 'Pay Now' : 'Submit Payment';
      const paymentTone = ['declined','failed'].includes(payment?.status) ? 'bad' : 'warn';
      return `<article class="course-card"><div class="course-cover ${course.thumbnail_url?'has-image':''}">${course.thumbnail_url?`<img src="${attr(course.thumbnail_url)}" alt="${attr(course.title)}" loading="lazy" decoding="async">`:'<i class="fa-solid fa-graduation-cap"></i>'}<span class="status-pill ${A.statusClass(course.status)}">${A.statusLabel(course.status)}</span></div><div class="course-body"><h3>${A.escapeHtml(course.title)}</h3><p>${A.escapeHtml(course.short_description || course.description || '')}</p><div class="course-meta"><span><i class="fa-solid fa-user-tie"></i> ${A.escapeHtml(course.instructor_name || A.cfg.INSTRUCTOR_NAME)}</span><span><i class="fa-solid fa-money-bill"></i> ${course.discount_price!=null?`<s>${A.formatMoney(course.price,course.currency)}</s> ${A.formatMoney(course.discount_price,course.currency)}`:A.formatMoney(course.price, course.currency)}</span>${nextSession?`<span><i class="fa-solid fa-calendar"></i> ${A.formatDateTime(nextSession.starts_at)}</span>`:`<span><i class="fa-solid fa-calendar"></i> Date to be announced</span>`}</div>${nextSession?`<div class="course-next-class"><small>Next Live Class</small><b>${A.escapeHtml(nextSession.title)}</b><span>${A.escapeHtml(nextSession.topic||'')}</span></div>`:''}<div class="notice ${access ? 'ok' : paymentTone}">${access ? '<b>Access approved.</b> Online class access is unlocked.' : `<b>${paymentText}.</b> ${payment?.status==='initiated'&&isInfinity?'Complete the secure hosted bank payment and receipt verification.':'Class date is visible, but online class access remains locked.'}`}</div><div class="course-actions"><button class="app-btn ${access ? 'gold' : 'outline'}" data-open-course="${course.id}"><i class="fa-solid fa-calendar-days"></i> View Live Class</button>${access ? '' : (course.course_type==='free'||actualPrice===0) ? `<button class="app-btn gold" data-free-enroll="${course.id}">Enroll Free</button>` : `<button class="app-btn gold" data-buy-course="${course.id}"><i class="fa-solid fa-building-columns"></i> ${paymentButtonText}</button>`}</div></div></article>`;
    }).join('') : empty('No course is currently published.', 'fa-graduation-cap');
  }

  function resetCourseView() {
    state.selectedCourse = null;
    document.getElementById('sessionsArea')?.classList.add('hidden');
    document.getElementById('coursesGrid')?.classList.remove('hidden');
  }

  function showCourseSessions(courseId) {
    state.selectedCourse = state.courses.find(c => c.id === courseId);
    if (!state.selectedCourse) return;
    document.getElementById('coursesGrid').classList.add('hidden');
    document.getElementById('sessionsArea').classList.remove('hidden');
    document.getElementById('sessionCourseTitle').textContent = state.selectedCourse.title;
    const rows = state.sessions.filter(s => s.course_id === courseId).sort((a,b) => a.session_number - b.session_number);
    const access = hasCourseAccess(courseId);
    document.getElementById('sessionsGrid').innerHTML = rows.length ? rows.map(session => sessionCard(session, access)).join('') : empty('Session schedule has not been published yet.', 'fa-calendar');
    const resources = state.resources.filter(r => r.course_id === courseId);
    const area = document.getElementById('resourcesArea');
    area.classList.toggle('hidden', !resources.length || !access);
    document.getElementById('resourcesList').innerHTML = resources.map(r => `<div class="resource-row"><div><b>${A.escapeHtml(r.title)}</b><small class="muted" style="display:block">${A.escapeHtml(r.description || '')}</small></div><button class="app-btn small outline" data-download-resource="${r.id}"><i class="fa-solid fa-download"></i> Download</button></div>`).join('');
  }

  function sessionCard(session, access) {
    const link = state.sessionLinks[session.id];
    const unlocked = access && Boolean(link);
    const course = state.selectedCourse || state.courses.find(c => c.id === session.course_id);
    const effectivePrice = course ? Number(course.discount_price != null ? course.discount_price : course.price || 0) : 0;
    const isFree = course?.course_type === 'free' || effectivePrice === 0;
    const lockedLabel = access ? 'Online class link not added yet' : (isFree ? 'Locked until enrollment' : 'Locked until payment approval');
    return `<article class="session-card"><div class="session-top"><span class="session-number">Session ${session.session_number}</span><span class="session-lock"><i class="fa-solid ${unlocked ? 'fa-lock-open' : 'fa-lock'}"></i></span></div><div class="session-body"><div class="signal-head"><h3>${A.escapeHtml(session.title)}</h3><span class="status-pill ${A.statusClass(session.status)}">${A.statusLabel(session.status)}</span></div><p>${A.escapeHtml(session.topic || '')}</p><div class="session-date"><span><i class="fa-solid fa-calendar"></i> ${A.formatDateTime(session.starts_at)}</span><span><i class="fa-solid fa-hourglass-half"></i> ${session.duration_minutes || 90} minutes</span><span><i class="fa-solid fa-video"></i> Online Class</span></div>${unlocked ? `<a class="app-btn green" href="${attr(link)}" target="_blank" rel="noopener"><i class="fa-solid fa-video"></i> Join Online Class</a>` : `<button class="app-btn outline" disabled><i class="fa-solid fa-lock"></i> ${lockedLabel}</button>`}</div></article>`;
  }

  function sessionCompact(session) {
    const course = state.courses.find(c => c.id === session.course_id);
    const access = hasCourseAccess(session.course_id);
    return `<div class="session-body" style="padding:0"><span class="status-pill ${A.statusClass(session.status)}">${A.statusLabel(session.status)}</span><h3 style="margin-top:12px">${A.escapeHtml(session.title)}</h3><p>${A.escapeHtml(course?.title || '')}</p><div class="session-date"><span><i class="fa-solid fa-calendar"></i> ${A.formatDateTime(session.starts_at)}</span><span><i class="fa-solid fa-user-tie"></i> Malik Zameer</span></div><button class="app-btn ${access ? 'gold' : 'outline'}" data-open-course="${session.course_id}">${access ? 'Open Session' : 'View Locked Schedule'}</button></div>`;
  }

  function renderPayments() {
    const body = document.getElementById('paymentsBody');
    if (!state.payments.length) { body.innerHTML = `<tr><td colspan="9">${empty('No payment has been submitted yet.', 'fa-receipt')}</td></tr>`; return; }
    body.innerHTML = state.payments.map(p => {
      const course = p.courses || state.courses.find(c => c.id === p.course_id) || {};
      const latest = latestPayment(p.course_id);
      const canResubmit = p.status === 'resubmission_required' && latest?.id === p.id;
      const isInfinity = p.provider === 'infinity';
      const action = isInfinity
        ? (p.status === 'initiated' && latest?.id === p.id
            ? `<button class="app-btn small gold" data-buy-course="${p.course_id}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Continue</button>`
            : ['failed','declined'].includes(p.status) && latest?.id === p.id
              ? `<button class="app-btn small outline" data-buy-course="${p.course_id}"><i class="fa-solid fa-rotate-right"></i> Try Again</button>`
              : '<span class="status-pill neutral">Hosted</span>')
        : canResubmit
          ? `<button class="app-btn small gold" data-buy-course="${p.course_id}"><i class="fa-solid fa-upload"></i> New Receipt</button>`
          : p.status === 'resubmission_required' && latest?.id !== p.id
            ? '<span class="status-pill neutral">Superseded</span>'
            : p.receipt_path
              ? `<button class="app-btn small outline" data-view-receipt="${p.id}"><i class="fa-solid fa-eye"></i> View</button>`
              : '—';
      return `<tr><td><b>${A.escapeHtml(p.invoice_no || 'Pending')}</b></td><td>${A.escapeHtml(course.title || 'Course')}</td><td>${A.formatMoney(p.amount, course.currency || 'USD')}</td><td>${A.escapeHtml(p.payment_method_name || p.method || '—')}</td><td>${A.escapeHtml(p.transaction_reference || '—')}</td><td>${A.formatDateTime(p.created_at)}</td><td><span class="status-pill ${A.statusClass(p.status)}">${A.statusLabel(p.status)}</span></td><td>${A.escapeHtml(p.admin_note || p.decline_reason || '—')}</td><td>${action}</td></tr>`;
    }).join('');
  }

  function renderAnnouncements() {
    document.getElementById('announcementsList').innerHTML = state.announcements.length ? state.announcements.map(n => `<article class="announcement ${n.priority === 'important' ? 'important' : ''}"><h4>${A.escapeHtml(n.title)}</h4><p>${A.escapeHtml(n.message)}</p><small>${A.formatDateTime(n.published_at)}</small></article>`).join('') : empty('No announcements yet.', 'fa-bullhorn');
  }

  function renderProfile() {
    const form = document.getElementById('profileForm');
    ['full_name','email','whatsapp','country','experience'].forEach(key => { if (form.elements[key]) form.elements[key].value = state.profile[key] || ''; });
  }

  function renderSupport() {
    const open = state.support.filter(s => !['resolved','closed'].includes(s.status)).length;
    document.getElementById('supportCount').textContent = `${open} open request(s)`;
    document.getElementById('supportRequests').innerHTML = state.support.length ? state.support.map(s => `<div class="activity-item"><div class="activity-icon"><i class="fa-solid fa-ticket"></i></div><div><b>${A.escapeHtml(s.subject)}</b><small>${A.escapeHtml(s.category)} · ${A.formatDateTime(s.created_at)}</small></div><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></div>`).join('') : empty('You have not submitted a support request.', 'fa-headset');
  }

  function bindEvents() {
    document.addEventListener('panel:open', event => {
      if (event.detail.key === 'signals' && !state.riskAccepted) A.openModal('riskModal');
      if (event.detail.key === 'courses') resetCourseView();
    });
    ['signalSearch','signalStatusFilter','signalDirectionFilter'].forEach(id => document.getElementById(id)?.addEventListener('input', renderSignals));
    ['chartSearch','chartTimeframeFilter'].forEach(id => document.getElementById(id)?.addEventListener('input', renderCharts));
    document.getElementById('articleSearch')?.addEventListener('input', renderArticles);
    document.getElementById('closeSessions').addEventListener('click', resetCourseView);

    document.body.addEventListener('click', async event => {
      const signalViewButton = event.target.closest('[data-signal-view]');
      if (signalViewButton) { signalView = signalViewButton.dataset.signalView; renderSignals(); }
      const courseOpen = event.target.closest('[data-open-course]');
      if (courseOpen) { openPanel('courses'); showCourseSessions(courseOpen.dataset.openCourse); }
      const buy = event.target.closest('[data-buy-course]');
      if (buy) await openPaymentModal(buy.dataset.buyCourse, buy);
      const free = event.target.closest('[data-free-enroll]');
      if (free) await enrollFree(free.dataset.freeEnroll, free);
      const article = event.target.closest('[data-read-article]');
      if (article) openArticle(article.dataset.readArticle);
      const chart = event.target.closest('[data-read-chart]');
      if (chart) openChart(chart.dataset.readChart);
      const receipt = event.target.closest('[data-view-receipt]');
      if (receipt) await viewReceipt(receipt.dataset.viewReceipt);
      const resource = event.target.closest('[data-download-resource]');
      if (resource) await downloadResource(resource.dataset.downloadResource);
      const signalHistory = event.target.closest('[data-student-signal-history]');
      if (signalHistory) openSignalHistory(signalHistory.dataset.studentSignalHistory);
    });

    document.getElementById('enableSignalAlerts')?.addEventListener('click', enableSignalAlerts);
    updateAlertButton();
    document.getElementById('paymentForm').addEventListener('submit', submitPayment);
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('supportForm').addEventListener('submit', submitSupport);
    document.getElementById('riskForm').addEventListener('submit', acceptRisk);
    document.getElementById('globalSearch').addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const q = event.currentTarget.value.trim().toLowerCase();
      if (!q) return;
      if (state.signals.some(x => `${x.symbol} ${x.notes}`.toLowerCase().includes(q))) { openPanel('signals'); document.getElementById('signalSearch').value = q; renderSignals(); }
      else if (state.charts.some(x => `${x.title} ${x.symbol}`.toLowerCase().includes(q))) { openPanel('charts'); document.getElementById('chartSearch').value = q; renderCharts(); }
      else { openPanel('articles'); document.getElementById('articleSearch').value = q; renderArticles(); }
    });
  }

  async function enableSignalAlerts(){
    if(!('Notification' in window)) return A.toast('Browser notifications are not supported here.','warning');
    const permission=await Notification.requestPermission(); updateAlertButton();
    A.toast(permission==='granted'?'Live signal alerts enabled.':'Notification permission was not allowed.',permission==='granted'?'success':'warning');
  }
  function updateAlertButton(){const b=document.getElementById('enableSignalAlerts');if(!b)return;const enabled='Notification' in window&&Notification.permission==='granted';b.classList.toggle('enabled',enabled);b.innerHTML=`<i class="fa-solid fa-bell${enabled?'':'-slash'}"></i> ${enabled?'Live Alerts Enabled':'Enable Live Alerts'}`;}
  function showSignalNotification(update){if(!update?.notify_users)return;A.toast(`${update.notification_title||'Signal Update'} — ${update.notification_message||''}`,'success');if('Notification' in window&&Notification.permission==='granted'&&document.visibilityState!=='visible'){new Notification(update.notification_title||'24K Signal Update',{body:update.notification_message||'',icon:'assets/logo.png'});}}


  async function openPaymentModal(courseId, triggerButton=null) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;
    const pending = latestPayment(courseId);
    if (pending && ['received','under_review'].includes(pending.status)) return A.toast('Your payment is already being processed.', 'warning');

    // PKR paid courses use the secure Infinity hosted bank-deposit flow.
    if (course.course_type === 'paid' && String(course.currency||'').toUpperCase() === 'PKR') {
      return startInfinityPayment(courseId, triggerButton);
    }

    // Legacy/manual fallback remains available for any non-PKR course.
    const form = document.getElementById('paymentForm');
    form.reset(); form.elements.course_id.value = course.id; form.dataset.supersedesPaymentId = pending?.status==='resubmission_required'?pending.id:''; const payable=course.discount_price!=null?Number(course.discount_price):Number(course.price); form.elements.amount.value = payable;
    document.getElementById('paymentCourseSummary').innerHTML = `<b>${A.escapeHtml(course.title)}</b><br>Instructor: Malik Zameer · Amount: ${A.formatMoney(course.discount_price!=null?course.discount_price:course.price, course.currency)}`;
    document.getElementById('paymentMethodSelect').innerHTML = state.paymentMethods.map(m => `<option value="${m.id}">${A.escapeHtml(m.name)}</option>`).join('');
    renderPaymentMethodInfo();
    document.getElementById('paymentMethodSelect').onchange = renderPaymentMethodInfo;
    A.openModal('paymentModal');
  }

  async function startInfinityPayment(courseId, triggerButton=null) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;
    const button = triggerButton || document.querySelector(`[data-buy-course="${courseId}"]`);
    A.setLoading(button, true, 'Opening secure payment...');
    try {
      const { data, error } = await A.supabase.functions.invoke('create-infinity-payment', { body: { course_id: courseId } });
      if (error) throw error;
      if (!data?.redirect_url) throw new Error(data?.error || 'Payment provider did not return a secure payment page.');
      if (!/^https?:\/\//i.test(data.redirect_url)) throw new Error('Invalid payment redirect URL.');
      window.location.assign(data.redirect_url);
    } catch (error) {
      await loadAll().catch(()=>{});
      renderAll();
      A.toast(A.friendlyError(error, 'Could not open secure payment. Please try again.'), 'error');
    } finally {
      A.setLoading(button, false);
    }
  }

  function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_return') !== '1') return;
    openPanel('payments');
    const payment = state.payments.find(p => Number(p.provider_request_id) === Number(params.get('request_id')));
    if (payment?.status === 'approved') A.toast('Payment verified successfully. Your course access is now active.', 'success');
    else if (payment?.status === 'declined') A.toast(payment.provider_rejection_reason || payment.admin_note || 'Payment was rejected.', 'error');
    else A.toast('Payment verification is being finalized. This page will update automatically.', 'warning');
    try {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('payment_return');
      clean.searchParams.delete('request_id');
      history.replaceState({}, '', `${clean.pathname}${clean.search}#payments`);
    } catch { /* cosmetic URL cleanup only */ }
  }

  function renderPaymentMethodInfo() {
    const method = state.paymentMethods.find(m => m.id === document.getElementById('paymentMethodSelect').value);
    document.getElementById('paymentMethodsBox').innerHTML = method ? `<div class="notice warn"><b>${A.escapeHtml(method.name)}</b><br>Account title: ${A.escapeHtml(method.account_title || '—')}<br>Account/number: ${A.escapeHtml(method.account_number || '—')}<br>${A.escapeHtml(method.instructions || '')}</div>` : '';
  }

  async function submitPayment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    const course = state.courses.find(c => c.id === fd.get('course_id'));
    const method = state.paymentMethods.find(m => m.id === fd.get('payment_method_id'));
    const file = fd.get('receipt');
    if (!file || !file.size) return A.toast('Please select a payment receipt.', 'error');
    if (file.size > 5 * 1024 * 1024) return A.toast('Receipt must be 5 MB or smaller.', 'error');
    A.setLoading(button, true, 'Uploading receipt...');
    try {
      const paymentId = A.uid();
      const path = `${state.user.id}/${paymentId}/${A.fileSafeName(file.name)}`;
        const upload = await A.supabase.storage.from('payment-receipts').upload(path, file, { upsert: false, contentType: file.type });
        if (upload.error) throw upload.error;
        const receiptHash = await A.hashFile(file);
        const { error } = await A.supabase.from('payments').insert({ id: paymentId, student_id: state.user.id, course_id: course.id, amount: Number(fd.get('amount')), payment_method_id: method?.id, payment_method_name: method?.name, transaction_reference: String(fd.get('transaction_reference')).trim(), student_note: String(fd.get('student_note') || '').trim(), receipt_path: path, receipt_hash: receiptHash, supersedes_payment_id: form.dataset.supersedesPaymentId || null, status: 'received' });
        if (error) { await A.supabase.storage.from('payment-receipts').remove([path]); throw error; }
        await loadAll();
      renderAll(); A.closeModal('paymentModal'); form.reset();
      A.toast('Receipt received. Admin approval is required before course access unlocks.', 'success');
      openPanel('payments');
    } catch (error) { A.toast(A.friendlyError(error, 'Payment submission failed.'), 'error'); }
    finally { A.setLoading(button, false); }
  }

  async function enrollFree(courseId, button) {
    A.setLoading(button, true, 'Enrolling...');
    try {
      const { error } = await A.supabase.rpc('enroll_free_course', { p_course_id: courseId });
        if (error) throw error;
        await loadAll();
      renderAll();
      showCourseSessions(courseId);
      A.toast('Free course enrolled successfully. Online class access is now unlocked.', 'success');
    } catch (error) { A.toast(A.friendlyError(error, 'Could not enroll.'), 'error'); }
    finally { A.setLoading(button, false); }
  }

  function openChart(id) {
    const chart = state.charts.find(c => c.id === id); if (!chart) return;
    document.getElementById('chartModalTitle').textContent = chart.title;
    document.getElementById('chartModalContent').innerHTML = `${chart.image_url?`<img src="${attr(chart.image_url)}" alt="${attr(chart.title)}" class="detail-image">`:''}<div class="course-meta"><span>${A.escapeHtml(chart.symbol)}</span><span>${A.escapeHtml(chart.timeframe||'—')}</span><span>${A.escapeHtml(chart.category||'Market Analysis')}</span></div><p>${A.escapeHtml(chart.summary||'')}</p><div class="article-content">${A.escapeHtml(chart.details||chart.summary||'').replace(/\n/g,'<br>')}</div>`;
    A.openModal('chartModal');
  }

  function openArticle(id) {
    const article = state.articles.find(a => a.id === id); if (!article) return;
    document.getElementById('articleModalTitle').textContent = article.title;
    document.getElementById('articleModalContent').innerHTML = `${article.cover_url?`<img src="${attr(article.cover_url)}" alt="${attr(article.title)}" class="detail-image" loading="lazy" decoding="async">`:''}<div class="course-meta"><span>${A.escapeHtml(article.category||'Education')}</span><span>${A.formatDate(article.published_at)}</span></div><div>${A.escapeHtml(article.content || article.excerpt || '').replace(/\n/g,'<br>')}</div>`;
    A.openModal('articleModal');
  }

  async function viewReceipt(id) {
    const payment = state.payments.find(p => p.id === id); if (!payment?.receipt_path) return;
    const { data, error } = await A.supabase.storage.from('payment-receipts').createSignedUrl(payment.receipt_path, 120);
    if (error) return A.toast(A.friendlyError(error), 'error');
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function downloadResource(id) {
    const resource = state.resources.find(r => r.id === id); if (!resource) return;
    const { data, error } = await A.supabase.storage.from('course-resources').createSignedUrl(resource.file_path, 120, { download: resource.file_name });
    if (error) return A.toast(A.friendlyError(error), 'error');
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function saveProfile(event) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); const values = Object.fromEntries(new FormData(form));
    A.setLoading(button, true, 'Saving...');
    try {
      const changes = { full_name: String(values.full_name).trim(), whatsapp: String(values.whatsapp).trim(), country: String(values.country || '').trim(), experience: String(values.experience || '') };
      const { error } = await A.supabase.from('profiles').update(changes).eq('id', state.user.id); if (error) throw error;
      Object.assign(state.profile, changes); document.getElementById('welcomeName').textContent = `Welcome back, ${state.profile.full_name}`;
      A.toast('Profile updated successfully.', 'success');
    } catch (error) { A.toast(A.friendlyError(error, 'Could not update profile.'), 'error'); }
    finally { A.setLoading(button, false); }
  }

  async function submitSupport(event) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); const values = Object.fromEntries(new FormData(form));
    A.setLoading(button, true, 'Submitting...');
    try {
      const row = { id: A.uid(), student_id: state.user.id, category: values.category, subject: String(values.subject).trim(), message: String(values.message).trim(), status: 'open', created_at: new Date().toISOString() };
      const { error } = await A.supabase.from('support_requests').insert({ student_id: state.user.id, category: row.category, subject: row.subject, message: row.message }); if (error) throw error; await loadAll();
      form.reset(); renderSupport(); A.toast('Support request submitted.', 'success');
    } catch (error) { A.toast(A.friendlyError(error, 'Could not submit request.'), 'error'); }
    finally { A.setLoading(button, false); }
  }

  async function acceptRisk(event) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); A.setLoading(button, true, 'Saving...');
    try {
      const { error } = await A.supabase.from('terms_acceptances').upsert({ user_id: state.user.id, document_type: 'risk_disclaimer', version: A.cfg.RISK_VERSION, accepted_at: new Date().toISOString(), ip_address: null }, { onConflict: 'user_id,document_type,version' });
        if (error) throw error;
      state.riskAccepted = true; A.closeModal('riskModal'); A.toast('Risk disclaimer accepted.', 'success');
    } catch (error) { A.toast(A.friendlyError(error, 'Could not record acceptance.'), 'error'); }
    finally { A.setLoading(button, false); }
  }


  function subscribeRealtime() {
    let timer;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(async () => { try { await loadAll(); renderAll(); } catch (error) { console.error('Realtime refresh failed', error); } }, 350); };
    A.supabase.channel(`student-${state.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signal_updates' }, payload => { showSignalNotification(payload.new); refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charts' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `student_id=eq.${state.user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_sessions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments', filter: `student_id=eq.${state.user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_progress', filter: `student_id=eq.${state.user.id}` }, refresh)
      .subscribe();
  }

  function signalIsFinal(s){return Boolean(s.closed_at)||['tp3_hit','tp4_hit','sl_hit','breakeven_hit','manually_closed','cancelled'].includes(s.status);}
  function resultUnit(){return 'pips';}
  function displaySymbol(symbol){const x=String(symbol||'').replace('/','').toUpperCase();return x.length===6?`${x.slice(0,3)}/${x.slice(3)}`:x;}
  function entryText(s){return `${num(s.entry_from)}${s.entry_to!=null?` – ${num(s.entry_to)}`:''}`;}
  function signed(value){const n=Number(value||0);return `${n>0?'+':''}${Number.isInteger(n)?n:n.toFixed(1)}`;}
  function eventLabel(v){return {published:'Signal Published',edited:'Signal Edited',move_to_be:'SL Moved to Breakeven',tp1_hit:'TP1 Hit',tp2_hit:'TP2 Hit',tp3_hit:'TP3 Hit',tp4_hit:'TP4 Hit',sl_hit:'SL Hit',breakeven_hit:'Breakeven Hit',manually_closed:'Trade Closed Manually',cancelled:'Signal Cancelled'}[v]||A.statusLabel(v);}
  function eventTone(v){return ['sl_hit','cancelled'].includes(v)?'bad':['breakeven_hit','move_to_be'].includes(v)?'warn':v==='edited'?'neutral':'ok';}


  function latestPayment(courseId) { return state.payments.filter(p => p.course_id === courseId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0]; }
  function isEnrollmentActive(e) { return e.status === 'active' && (!e.access_expires_at || new Date(e.access_expires_at) > new Date()); }
  function hasCourseAccess(courseId) { return state.enrollments.some(e => e.course_id === courseId && isEnrollmentActive(e)); }
  function empty(text, icon) { return `<div class="empty-state"><i class="fa-solid ${icon}"></i>${A.escapeHtml(text)}</div>`; }
  function num(value) { if (value === null || value === undefined || value === '') return '—'; return Number(value).toLocaleString('en-US', { maximumFractionDigits: 5 }); }
  function attr(value) { return A.escapeHtml(value).replace(/`/g, '&#96;'); }
})().catch(error => {
  console.error(error);
  window.App?.toast(window.App.friendlyError(error, 'Could not load the student panel.'), 'error');
  document.getElementById('pageLoader')?.classList.add('hidden');
  document.getElementById('studentApp')?.classList.remove('hidden');
});

(async function () {
  const A = window.App;
  const D = window.DEMO_DATA;
  const state = {
    user: null, profile: null, courses: [], sessions: [], sessionLinks: {}, enrollments: [], payments: [],
    paymentMethods: [], signals: [], charts: [], articles: [], announcements: [], resources: [], support: [], riskAccepted: false,
    selectedCourse: null
  };
  let openPanel;

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

  async function loadAll() {
    if (!A.configured) {
      const demoPayments = JSON.parse(localStorage.getItem('k24_demo_payments') || '[]');
      const demoSupport = JSON.parse(localStorage.getItem('k24_demo_support') || '[]');
      state.courses = structuredClone(D.courses);
      state.sessions = structuredClone(D.sessions);
      state.payments = demoPayments;
      state.enrollments = demoPayments.filter(p => p.status === 'approved').map(p => ({ id: `enr-${p.id}`, student_id: state.user.id, course_id: p.course_id, status: 'active', access_expires_at: null }));
      state.sessionLinks = state.enrollments.length ? structuredClone(D.sessionLinks) : {};
      state.paymentMethods = structuredClone(D.paymentMethods);
      state.signals = structuredClone(D.signals);
      state.charts = structuredClone(D.charts);
      state.articles = structuredClone(D.articles);
      state.announcements = structuredClone(D.announcements);
      state.resources = structuredClone(D.resources);
      state.support = demoSupport;
      state.riskAccepted = localStorage.getItem('k24_risk_accepted') === A.cfg.RISK_VERSION;
      return;
    }

    const sb = A.supabase;
    const requests = await Promise.all([
      sb.from('courses').select('*').eq('is_published', true).order('created_at', { ascending: false }),
      sb.from('course_sessions').select('*').order('starts_at', { ascending: true }),
      sb.from('course_session_links').select('course_session_id,meet_url'),
      sb.from('enrollments').select('*').eq('student_id', state.user.id),
      sb.from('payments').select('*,courses(title,currency)').eq('student_id', state.user.id).order('created_at', { ascending: false }),
      sb.from('payment_methods').select('*').eq('is_active', true).order('sort_order'),
      sb.from('signals').select('*').eq('is_published', true).order('published_at', { ascending: false }),
      sb.from('charts').select('*').eq('is_published', true).order('published_at', { ascending: false }),
      sb.from('articles').select('*').eq('is_published', true).order('published_at', { ascending: false }),
      sb.from('announcements').select('*').eq('is_published', true).order('published_at', { ascending: false }),
      sb.from('course_resources').select('*').order('created_at', { ascending: false }),
      sb.from('support_requests').select('*').eq('student_id', state.user.id).order('created_at', { ascending: false }),
      sb.from('terms_acceptances').select('id').eq('user_id', state.user.id).eq('document_type', 'risk_disclaimer').eq('version', A.cfg.RISK_VERSION).limit(1)
    ]);
    const firstError = requests.find(item => item.error)?.error;
    if (firstError) throw firstError;
    [state.courses, state.sessions, , state.enrollments, state.payments, state.paymentMethods, state.signals, state.charts, state.articles, state.announcements, state.resources, state.support] = requests.slice(0, 12).map(r => r.data || []);
    state.sessionLinks = Object.fromEntries((requests[2].data || []).map(row => [row.course_session_id, row.meet_url]));
    state.riskAccepted = Boolean(requests[12].data?.length);
  }

  function renderAll() {
    renderKpis(); renderDashboard(); renderSignals(); renderCharts(); renderArticles(); renderCourses();
    renderPayments(); renderAnnouncements(); renderProfile(); renderSupport();
    document.getElementById('paymentCount').textContent = state.payments.filter(p => ['received', 'under_review'].includes(p.status)).length;
    document.getElementById('announcementCount').textContent = state.announcements.length;
    document.getElementById('topNoticeCount').textContent = state.announcements.length;
  }

  function renderKpis() {
    const activeSignals = state.signals.filter(s => s.status === 'active').length;
    const approvedCourses = state.enrollments.filter(isEnrollmentActive).length;
    const pending = state.payments.filter(p => ['received', 'under_review'].includes(p.status)).length;
    const completed = state.signals.filter(s => ['tp_hit', 'sl_hit', 'breakeven', 'closed'].includes(s.status));
    const wins = completed.filter(s => s.status === 'tp_hit').length;
    const winRate = completed.length ? Math.round((wins / completed.length) * 100) : 0;
    const data = [
      ['fa-bolt', activeSignals, 'Active Signals'], ['fa-chart-line', state.charts.length, 'Published Charts'],
      ['fa-newspaper', state.articles.length, 'Learning Articles'], ['fa-graduation-cap', approvedCourses, 'Unlocked Courses'],
      ['fa-receipt', pending, 'Pending Payments']
    ];
    document.getElementById('studentKpis').innerHTML = data.map(([icon, value, label]) => `<div class="app-kpi"><i class="fa-solid ${icon}"></i><div><b>${value}</b><small>${label}</small></div></div>`).join('');
    document.getElementById('signalPerformance').innerHTML = [
      ['Total Signals', state.signals.length], ['Active', activeSignals], ['TP Hit', wins],
      ['SL Hit', completed.filter(s => s.status === 'sl_hit').length], ['Breakeven', completed.filter(s => s.status === 'breakeven').length], ['Win Rate', `${winRate}%`]
    ].map(([label, value]) => `<div class="performance-item"><small>${label}</small><b>${value}</b></div>`).join('');
  }

  function renderDashboard() {
    const pending = state.payments.find(p => ['received', 'under_review'].includes(p.status));
    const declined = state.payments.find(p => p.status === 'declined');
    const alert = document.getElementById('dashboardAlert');
    if (pending) alert.innerHTML = `<div class="notice warn"><i class="fa-solid fa-hourglass-half"></i> Your payment <b>${A.escapeHtml(pending.invoice_no || '')}</b> is ${A.statusLabel(pending.status).toLowerCase()}. Course access will unlock only after admin approval.</div>`;
    else if (declined) alert.innerHTML = `<div class="notice bad"><i class="fa-solid fa-circle-xmark"></i> A payment was declined. Review the admin note in Payment History and submit a new receipt.</div>`;
    else alert.innerHTML = '';

    document.getElementById('latestSignal').innerHTML = state.signals[0] ? signalCard(state.signals[0], true) : empty('No signal has been published yet.', 'fa-bolt');
    const coursePreview = state.courses.slice(0, 2);
    document.getElementById('dashboardCourses').innerHTML = coursePreview.length ? coursePreview.map(course => {
      const access = hasCourseAccess(course.id);
      const payment = latestPayment(course.id);
      return `<div class="activity-item"><div class="activity-icon"><i class="fa-solid ${access ? 'fa-lock-open' : 'fa-lock'}"></i></div><div><b>${A.escapeHtml(course.title)}</b><small>${access ? 'Course access approved' : payment ? A.statusLabel(payment.status) : `${A.formatMoney(course.price, course.currency)} · Payment required`}</small></div><button class="app-btn small ${access ? 'gold' : 'outline'}" data-open-course="${course.id}">${access ? 'Open' : 'Details'}</button></div>`;
    }).join('') : empty('No course is currently available.', 'fa-graduation-cap');

    const next = state.sessions.filter(s => new Date(s.starts_at) >= new Date() && s.status !== 'cancelled')[0] || state.sessions.find(s => s.status === 'upcoming');
    document.getElementById('nextSession').innerHTML = next ? sessionCompact(next) : empty('No upcoming class has been scheduled.', 'fa-calendar');
    const notice = state.announcements[0];
    document.getElementById('latestAnnouncement').innerHTML = notice ? `<div class="announcement ${notice.priority === 'important' ? 'important' : ''}"><h4>${A.escapeHtml(notice.title)}</h4><p>${A.escapeHtml(notice.message)}</p><small>${A.formatDateTime(notice.published_at)}</small></div>` : empty('No announcement has been published.', 'fa-bullhorn');
  }

  function renderSignals() {
    const query = document.getElementById('signalSearch')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('signalStatusFilter')?.value || 'all';
    const direction = document.getElementById('signalDirectionFilter')?.value || 'all';
    const rows = state.signals.filter(s => (!query || `${s.symbol} ${s.notes || ''}`.toLowerCase().includes(query)) && (status === 'all' || s.status === status) && (direction === 'all' || s.direction === direction));
    document.getElementById('signalsGrid').innerHTML = rows.length ? rows.map(s => signalCard(s)).join('') : empty('No signal matches these filters.', 'fa-filter');
  }

  function signalCard(signal, compact = false) {
    const levels = compact ? '' : `<div class="signal-levels"><div class="signal-level"><small>Entry Zone</small><b>${num(signal.entry_from)}${signal.entry_to ? ` – ${num(signal.entry_to)}` : ''}</b></div><div class="signal-level"><small>Stop Loss</small><b>${num(signal.stop_loss)}</b></div><div class="signal-level"><small>Take Profit 1</small><b>${num(signal.take_profit_1)}</b></div><div class="signal-level"><small>Take Profit 2 / 3</small><b>${num(signal.take_profit_2)}${signal.take_profit_3 ? ` / ${num(signal.take_profit_3)}` : ''}</b></div></div>`;
    return `<article class="signal-card ${String(signal.direction).toLowerCase()}"><div class="signal-body"><div class="signal-head"><div><span class="direction ${String(signal.direction).toLowerCase()}">${A.escapeHtml(signal.direction)}</span><h3>${A.escapeHtml(signal.symbol)}</h3></div><span class="status-pill ${A.statusClass(signal.status)}">${A.statusLabel(signal.status)}</span></div>${levels}<p>${A.escapeHtml(signal.notes || 'No additional note.')}</p><div class="course-meta"><span><i class="fa-solid fa-clock"></i> ${A.formatDateTime(signal.published_at)}</span>${signal.result_pips !== null && signal.result_pips !== undefined ? `<span><i class="fa-solid fa-chart-simple"></i> Result: ${signal.result_pips} pips</span>` : ''}</div></div></article>`;
  }

  function renderCharts() {
    const query = document.getElementById('chartSearch')?.value.trim().toLowerCase() || '';
    const tf = document.getElementById('chartTimeframeFilter')?.value || 'all';
    const rows = state.charts.filter(c => (!query || `${c.title} ${c.symbol} ${c.summary}`.toLowerCase().includes(query)) && (tf === 'all' || c.timeframe === tf));
    document.getElementById('chartsGrid').innerHTML = rows.length ? rows.map(chart => `<article class="content-card"><div class="content-cover ${chart.image_url ? 'has-image' : ''}" ${chart.image_url ? `style="background-image:url('${attr(chart.image_url)}')"` : ''}>${chart.image_url ? '' : '<i class="fa-solid fa-chart-candlestick"></i>'}</div><div class="content-body"><div class="course-meta"><span>${A.escapeHtml(chart.symbol)}</span><span>${A.escapeHtml(chart.timeframe || '—')}</span><span>${A.formatDate(chart.published_at)}</span></div><h3>${A.escapeHtml(chart.title)}</h3><p>${A.escapeHtml(chart.summary || '')}</p>${chart.image_url ? `<a class="app-btn small outline" href="${attr(chart.image_url)}" target="_blank"><i class="fa-solid fa-up-right-from-square"></i> Open Full Chart</a>` : ''}</div></article>`).join('') : empty('No chart analysis matches your search.', 'fa-chart-line');
  }

  function renderArticles() {
    const query = document.getElementById('articleSearch')?.value.trim().toLowerCase() || '';
    const rows = state.articles.filter(a => !query || `${a.title} ${a.excerpt} ${a.content}`.toLowerCase().includes(query));
    document.getElementById('articlesGrid').innerHTML = rows.length ? rows.map(article => `<article class="content-card"><div class="content-cover ${article.cover_url ? 'has-image' : ''}" ${article.cover_url ? `style="background-image:url('${attr(article.cover_url)}')"` : ''}>${article.cover_url ? '' : '<i class="fa-solid fa-book-open"></i>'}</div><div class="content-body"><div class="course-meta"><span><i class="fa-solid fa-calendar"></i> ${A.formatDate(article.published_at)}</span></div><h3>${A.escapeHtml(article.title)}</h3><p>${A.escapeHtml(article.excerpt || '')}</p><button class="app-btn small gold" data-read-article="${article.id}">Read Article</button></div></article>`).join('') : empty('No article matches your search.', 'fa-newspaper');
  }

  function renderCourses() {
    document.getElementById('coursesGrid').innerHTML = state.courses.length ? state.courses.map(course => {
      const access = hasCourseAccess(course.id);
      const payment = latestPayment(course.id);
      const paymentText = payment ? A.statusLabel(payment.status) : (Number(course.price) === 0 ? 'Free enrollment' : 'Payment required');
      return `<article class="course-card"><div class="course-cover"><i class="fa-solid fa-graduation-cap"></i><span class="status-pill ${A.statusClass(course.status)}">${A.statusLabel(course.status)}</span></div><div class="course-body"><h3>${A.escapeHtml(course.title)}</h3><p>${A.escapeHtml(course.description || '')}</p><div class="course-meta"><span><i class="fa-solid fa-user-tie"></i> ${A.escapeHtml(course.instructor_name || A.cfg.INSTRUCTOR_NAME)}</span><span><i class="fa-solid fa-money-bill"></i> ${A.formatMoney(course.price, course.currency)}</span><span><i class="fa-solid fa-calendar"></i> ${course.start_date ? A.formatDate(course.start_date) : 'Date to be announced'}</span></div><div class="notice ${access ? 'ok' : payment?.status === 'declined' ? 'bad' : 'warn'}">${access ? '<b>Access approved.</b> Session links are unlocked.' : `<b>${paymentText}.</b> Session dates are visible, but Google Meet links remain locked.`}</div><div class="course-actions"><button class="app-btn ${access ? 'gold' : 'outline'}" data-open-course="${course.id}"><i class="fa-solid fa-calendar-days"></i> View Sessions</button>${access ? '' : Number(course.price) === 0 ? `<button class="app-btn gold" data-free-enroll="${course.id}">Enroll Free</button>` : `<button class="app-btn gold" data-buy-course="${course.id}"><i class="fa-solid fa-receipt"></i> ${payment && ['received','under_review'].includes(payment.status) ? 'Payment Submitted' : 'Submit Payment'}</button>`}</div></div></article>`;
    }).join('') : empty('No course is currently published.', 'fa-graduation-cap');
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
    return `<article class="session-card"><div class="session-top"><span class="session-number">Session ${session.session_number}</span><span class="session-lock"><i class="fa-solid ${unlocked ? 'fa-lock-open' : 'fa-lock'}"></i></span></div><div class="session-body"><div class="signal-head"><h3>${A.escapeHtml(session.title)}</h3><span class="status-pill ${A.statusClass(session.status)}">${A.statusLabel(session.status)}</span></div><p>${A.escapeHtml(session.topic || '')}</p><div class="session-date"><span><i class="fa-solid fa-calendar"></i> ${A.formatDateTime(session.starts_at)}</span><span><i class="fa-solid fa-hourglass-half"></i> ${session.duration_minutes || 90} minutes</span><span><i class="fa-solid fa-video"></i> Google Meet</span></div>${unlocked ? `<a class="app-btn green" href="${attr(link)}" target="_blank" rel="noopener"><i class="fa-solid fa-video"></i> Join Google Meet</a>` : `<button class="app-btn outline" disabled><i class="fa-solid fa-lock"></i> ${access ? 'Meet link not added yet' : 'Locked until payment approval'}</button>`}</div></article>`;
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
      return `<tr><td><b>${A.escapeHtml(p.invoice_no || 'Pending')}</b></td><td>${A.escapeHtml(course.title || 'Course')}</td><td>${A.formatMoney(p.amount, course.currency || 'USD')}</td><td>${A.escapeHtml(p.payment_method_name || p.method || '—')}</td><td>${A.escapeHtml(p.transaction_reference || '—')}</td><td>${A.formatDateTime(p.created_at)}</td><td><span class="status-pill ${A.statusClass(p.status)}">${A.statusLabel(p.status)}</span></td><td>${A.escapeHtml(p.admin_note || p.decline_reason || '—')}</td><td>${p.receipt_path ? `<button class="app-btn small outline" data-view-receipt="${p.id}"><i class="fa-solid fa-eye"></i> View</button>` : '—'}</td></tr>`;
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
    });
    ['signalSearch','signalStatusFilter','signalDirectionFilter'].forEach(id => document.getElementById(id)?.addEventListener('input', renderSignals));
    ['chartSearch','chartTimeframeFilter'].forEach(id => document.getElementById(id)?.addEventListener('input', renderCharts));
    document.getElementById('articleSearch')?.addEventListener('input', renderArticles);
    document.getElementById('closeSessions').addEventListener('click', () => { document.getElementById('sessionsArea').classList.add('hidden'); document.getElementById('coursesGrid').classList.remove('hidden'); });

    document.body.addEventListener('click', async event => {
      const courseOpen = event.target.closest('[data-open-course]');
      if (courseOpen) { openPanel('courses'); showCourseSessions(courseOpen.dataset.openCourse); }
      const buy = event.target.closest('[data-buy-course]');
      if (buy) openPaymentModal(buy.dataset.buyCourse);
      const free = event.target.closest('[data-free-enroll]');
      if (free) await enrollFree(free.dataset.freeEnroll, free);
      const article = event.target.closest('[data-read-article]');
      if (article) openArticle(article.dataset.readArticle);
      const receipt = event.target.closest('[data-view-receipt]');
      if (receipt) await viewReceipt(receipt.dataset.viewReceipt);
      const resource = event.target.closest('[data-download-resource]');
      if (resource) await downloadResource(resource.dataset.downloadResource);
    });

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

  function openPaymentModal(courseId) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;
    const pending = latestPayment(courseId);
    if (pending && ['received','under_review'].includes(pending.status)) return A.toast('Your payment is already under review.', 'warning');
    const form = document.getElementById('paymentForm');
    form.reset(); form.elements.course_id.value = course.id; form.elements.amount.value = course.price;
    document.getElementById('paymentCourseSummary').innerHTML = `<b>${A.escapeHtml(course.title)}</b><br>Instructor: Malik Zameer · Amount: ${A.formatMoney(course.price, course.currency)}`;
    document.getElementById('paymentMethodSelect').innerHTML = state.paymentMethods.map(m => `<option value="${m.id}">${A.escapeHtml(m.name)}</option>`).join('');
    renderPaymentMethodInfo();
    document.getElementById('paymentMethodSelect').onchange = renderPaymentMethodInfo;
    A.openModal('paymentModal');
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
      if (!A.configured) {
        const payment = { id: paymentId, invoice_no: `DEMO-${Date.now().toString().slice(-6)}`, student_id: state.user.id, course_id: course.id, amount: Number(fd.get('amount')), payment_method_id: method?.id, payment_method_name: method?.name, transaction_reference: String(fd.get('transaction_reference')), student_note: String(fd.get('student_note') || ''), receipt_path: `demo/${file.name}`, status: 'received', created_at: new Date().toISOString() };
        state.payments.unshift(payment);
        localStorage.setItem('k24_demo_payments', JSON.stringify(state.payments));
      } else {
        const path = `${state.user.id}/${paymentId}/${A.fileSafeName(file.name)}`;
        const upload = await A.supabase.storage.from('payment-receipts').upload(path, file, { upsert: false, contentType: file.type });
        if (upload.error) throw upload.error;
        const { error } = await A.supabase.from('payments').insert({ id: paymentId, student_id: state.user.id, course_id: course.id, amount: Number(fd.get('amount')), payment_method_id: method?.id, payment_method_name: method?.name, transaction_reference: String(fd.get('transaction_reference')).trim(), student_note: String(fd.get('student_note') || '').trim(), receipt_path: path, status: 'received' });
        if (error) { await A.supabase.storage.from('payment-receipts').remove([path]); throw error; }
        await loadAll();
      }
      renderAll(); A.closeModal('paymentModal'); form.reset();
      A.toast('Receipt received. Admin approval is required before course access unlocks.', 'success');
      openPanel('payments');
    } catch (error) { A.toast(error.message || 'Payment submission failed.', 'error'); }
    finally { A.setLoading(button, false); }
  }

  async function enrollFree(courseId, button) {
    A.setLoading(button, true, 'Enrolling...');
    try {
      if (!A.configured) {
        state.enrollments.push({ id: A.uid(), student_id: state.user.id, course_id: courseId, status: 'active', access_expires_at: null });
      } else {
        const { error } = await A.supabase.rpc('enroll_free_course', { p_course_id: courseId });
        if (error) throw error;
        await loadAll();
      }
      renderAll(); A.toast('Free course enrolled successfully.', 'success');
    } catch (error) { A.toast(error.message || 'Could not enroll.', 'error'); }
    finally { A.setLoading(button, false); }
  }

  function openArticle(id) {
    const article = state.articles.find(a => a.id === id); if (!article) return;
    document.getElementById('articleModalTitle').textContent = article.title;
    document.getElementById('articleModalContent').textContent = article.content || article.excerpt || '';
    A.openModal('articleModal');
  }

  async function viewReceipt(id) {
    const payment = state.payments.find(p => p.id === id); if (!payment?.receipt_path) return;
    if (!A.configured) return A.toast('Receipt preview is available after Supabase storage is connected.', 'warning');
    const { data, error } = await A.supabase.storage.from('payment-receipts').createSignedUrl(payment.receipt_path, 120);
    if (error) return A.toast(error.message, 'error');
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function downloadResource(id) {
    const resource = state.resources.find(r => r.id === id); if (!resource) return;
    if (!A.configured) return A.toast('Demo resource has no attached file.', 'warning');
    const { data, error } = await A.supabase.storage.from('course-resources').createSignedUrl(resource.file_path, 120, { download: resource.file_name });
    if (error) return A.toast(error.message, 'error');
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function saveProfile(event) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); const values = Object.fromEntries(new FormData(form));
    A.setLoading(button, true, 'Saving...');
    try {
      const changes = { full_name: String(values.full_name).trim(), whatsapp: String(values.whatsapp).trim(), country: String(values.country || '').trim(), experience: String(values.experience || '') };
      if (A.configured) { const { error } = await A.supabase.from('profiles').update(changes).eq('id', state.user.id); if (error) throw error; }
      Object.assign(state.profile, changes); document.getElementById('welcomeName').textContent = `Welcome back, ${state.profile.full_name}`;
      A.toast('Profile updated successfully.', 'success');
    } catch (error) { A.toast(error.message || 'Could not update profile.', 'error'); }
    finally { A.setLoading(button, false); }
  }

  async function submitSupport(event) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); const values = Object.fromEntries(new FormData(form));
    A.setLoading(button, true, 'Submitting...');
    try {
      const row = { id: A.uid(), student_id: state.user.id, category: values.category, subject: String(values.subject).trim(), message: String(values.message).trim(), status: 'open', created_at: new Date().toISOString() };
      if (!A.configured) { state.support.unshift(row); localStorage.setItem('k24_demo_support', JSON.stringify(state.support)); }
      else { const { error } = await A.supabase.from('support_requests').insert({ student_id: state.user.id, category: row.category, subject: row.subject, message: row.message }); if (error) throw error; await loadAll(); }
      form.reset(); renderSupport(); A.toast('Support request submitted.', 'success');
    } catch (error) { A.toast(error.message || 'Could not submit request.', 'error'); }
    finally { A.setLoading(button, false); }
  }

  async function acceptRisk(event) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); A.setLoading(button, true, 'Saving...');
    try {
      if (!A.configured) localStorage.setItem('k24_risk_accepted', A.cfg.RISK_VERSION);
      else {
        const { error } = await A.supabase.from('terms_acceptances').upsert({ user_id: state.user.id, document_type: 'risk_disclaimer', version: A.cfg.RISK_VERSION, accepted_at: new Date().toISOString(), ip_address: null }, { onConflict: 'user_id,document_type,version' });
        if (error) throw error;
      }
      state.riskAccepted = true; A.closeModal('riskModal'); A.toast('Risk disclaimer accepted.', 'success');
    } catch (error) { A.toast(error.message || 'Could not record acceptance.', 'error'); }
    finally { A.setLoading(button, false); }
  }


  function subscribeRealtime() {
    if (!A.configured) return;
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try { await loadAll(); renderAll(); }
        catch (error) { console.error('Realtime refresh failed', error); }
      }, 350);
    };
    A.supabase.channel(`student-${state.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charts' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `student_id=eq.${state.user.id}` }, refresh)
      .subscribe();
  }

  function latestPayment(courseId) { return state.payments.filter(p => p.course_id === courseId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0]; }
  function isEnrollmentActive(e) { return e.status === 'active' && (!e.access_expires_at || new Date(e.access_expires_at) > new Date()); }
  function hasCourseAccess(courseId) { return state.enrollments.some(e => e.course_id === courseId && isEnrollmentActive(e)); }
  function empty(text, icon) { return `<div class="empty-state"><i class="fa-solid ${icon}"></i>${A.escapeHtml(text)}</div>`; }
  function num(value) { if (value === null || value === undefined || value === '') return '—'; return Number(value).toLocaleString('en-US', { maximumFractionDigits: 5 }); }
  function attr(value) { return A.escapeHtml(value).replace(/`/g, '&#96;'); }
})().catch(error => {
  console.error(error);
  window.App?.toast(error.message || 'Could not load the student panel.', 'error');
  document.getElementById('pageLoader')?.classList.add('hidden');
  document.getElementById('studentApp')?.classList.remove('hidden');
});

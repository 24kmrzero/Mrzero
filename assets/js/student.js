(async function () {
  const A = window.App;
  // TEMPORARY: all signed-in student access is intentionally open until access rules are redesigned.
  const TEMP_OPEN_ACCESS = false;
  window.__24K_TEMP_OPEN_ACCESS__ = TEMP_OPEN_ACCESS;
  const state = {
    user: null, profile: null, courses: [], sessions: [], sessionLinks: {}, enrollments: [], payments: [],
    paymentMethods: [], signals: [], signalUpdates: [], charts: [], articles: [], announcements: [], resources: [], support: [], riskAccepted: false, premium: null, premiumPayments: [], ibVerifications: [],
    selectedCourse: null, courseFilter: 'all'
  };
  window.StudentBase = { state, reload: async () => { await loadAll(); renderAll(); return state; } };
  let openPanel;
  let signalStatusView = 'all';
  let signalWorkspaceView = 'active';
  let historyMarketFilter = 'all';
  let historyDateFilter = 'month';

  // V10.21: Premium Access state must be initialized before the first renderAll().
  // Previously these const declarations lived below the initial await/load/render path,
  // so renderPremium() -> renderAccessSelection() hit the temporal dead zone and crashed
  // with: Cannot access 'brokerAccessMeta' before initialization.
  const accessFlowState = { step:'home', broker:'', mode:'' };
  const brokerAccessMeta = {
    Exness: {
      url: 'https://one.exnessonelink.com/a/be2kjlypr9',
      newGuide: 'Open our Exness partner link and create your trading account. Fund the account, then submit the Trading Account ID, deposit amount and deposit proof below.',
      existingGuide: 'Login to Exness → open Live Chat → type “Change Partner” → open the official partner-change link sent by Exness Support → Reason: Education → submit our partner link → for “Where did you find us?” write “website” → save the confirmation email/screenshot.'
    },
    XM: {
      url: 'https://affs.click/tr9cq',
      newGuide: 'Open our XM partner link → login with your existing XM profile → Create New Account → create a new trading account under the partner link → transfer/fund the new account → save the new Trading Account ID and confirmation proof.',
      existingGuide: 'XM partner shift flow: open our XM partner link → login with your existing XM profile → Create New Account → create a new trading account under the partner link → transfer/fund the new account → save the Trading Account ID and confirmation proof.'
    },
    DPrime: {
      url: 'https://my.dooprime.com/links/go/72929',
      newGuide: 'Open our DPrime partner link and create your account. After funding, submit the Trading Account ID, deposit amount and deposit proof below.',
      existingGuide: 'Email en.support@dooprime.com → Subject: Shift Account → write: “Kindly shift my trading account under this partner link: https://my.dooprime.com/links/go/72929. Thank you for your support.” → wait for confirmation and save the confirmation proof.'
    }
  };

  // V10.20: bind Manage Access before any async dashboard loading. This makes
  // the control reliable even if a later optional render/data request fails.
  function forceOpenPremiumAccessModal() {
    const modal = document.getElementById('premiumAccessModal');
    if (!modal) { A.toast('Premium access window is unavailable. Please refresh the page.', 'error'); return false; }
    try { if (state.premium) { renderPremium(); renderAccessSelection(); renderIbBrokerInstructions(); } } catch (error) { console.warn('Premium access pre-render:', error); }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    const current = document.getElementById('allAccessCurrentStatus');
    if (current && state.premium?.has_access) {
      const days = state.premium?.days_left != null ? ` · ${state.premium.days_left} day${Number(state.premium.days_left)===1?'':'s'} left` : '';
      current.innerHTML = `<b>Access Active${days}</b><br><small>Your current access remains active. You can still submit a new Paid Access or IB / Broker verification request below.</small>`;
    }
    return true;
  }

  function installCriticalAccessBindings() {
    if (window.__24K_ACCESS_CRITICAL_BOUND__) return;
    window.__24K_ACCESS_CRITICAL_BOUND__ = true;
    document.addEventListener('click', event => {
      const button = event.target?.closest?.('#managePremiumAccess');
      if (!button) return;
      event.preventDefault();
      forceOpenPremiumAccessModal();
    }, true);
    const form = document.getElementById('ibVerificationForm');
    if (form && !form.dataset.v1020Bound) {
      form.dataset.v1020Bound = '1';
      form.addEventListener('submit', submitIbVerification);
    }
  }
  installCriticalAccessBindings();
  window.__24K_OPEN_PREMIUM_ACCESS__ = forceOpenPremiumAccessModal;

  const result = await A.requireRole('student');
  if (!result) return;
  state.user = result.user;
  state.profile = result.profile;
  // V10.22: Student-specific navigation. Do not rely on the generic Core router
  // or clean-route wrappers for in-panel navigation. All Student tabs switch the
  // already-loaded dashboard shell directly, so no auth/bootstrap reload occurs.
  function installStudentNavigation() {
    const routeMap = {
      dashboard: '/student/',
      courses: '/student/courses/',
      signals: '/student/signals/',
      charts: '/student/charts/',
      articles: '/student/articles/',
      announcements: '/student/updates/',
      profile: '/student/profile/'
    };
    const pathMap = Object.fromEntries(Object.entries(routeMap).map(([key,path]) => [path.replace(/\/+$/, '') || '/', key]));
    const normalize = value => {
      const raw = String(value || '').toLowerCase().replace(/^#/, '').replace(/^\/+|\/+$/g, '');
      if (raw === 'updates' || raw === 'update' || raw === 'notifications') return 'announcements';
      if (raw === 'course') return 'courses';
      if (raw === 'signal') return 'signals';
      if (raw === 'chart') return 'charts';
      if (raw === 'article') return 'articles';
      if (raw === 'account') return 'profile';
      return routeMap[raw] ? raw : '';
    };
    const keyFromLocation = () => {
      const path = (location.pathname || '').replace(/\/+$/, '') || '/';
      if (pathMap[path]) return pathMap[path];
      if (/\/student-dashboard\.html$/i.test(path)) return normalize(location.hash) || 'dashboard';
      return normalize(location.hash) || 'dashboard';
    };
    const open = (key, updateUrl = true) => {
      key = normalize(key) || 'dashboard';
      const panel = document.getElementById(`p-${key}`);
      if (!panel) return false;
      document.querySelectorAll('.panel').forEach(el => el.classList.toggle('on', el === panel));
      document.querySelectorAll('[data-panel]').forEach(el => el.classList.toggle('on', normalize(el.dataset.panel) === key));
      document.querySelectorAll('[data-goto]').forEach(el => el.classList.toggle('is-active', normalize(el.dataset.goto) === key));
      document.getElementById('side')?.classList.remove('open');
      if (updateUrl && history.replaceState) history.replaceState({studentPanel:key}, '', routeMap[key] || '/student/');
      try { window.scrollTo({top:0,behavior:'auto'}); } catch (_) {}
      document.dispatchEvent(new CustomEvent('panel:open', {detail:{key}}));
      return true;
    };

    if (!window.__24K_STUDENT_NAV_V1022__) {
      window.__24K_STUDENT_NAV_V1022__ = true;
      document.addEventListener('click', event => {
        const target = event.target?.closest?.('[data-panel],[data-goto]');
        if (!target) return;
        const key = normalize(target.dataset.panel || target.dataset.goto);
        if (!key || !document.getElementById(`p-${key}`)) return;
        event.preventDefault();
        event.stopPropagation();
        open(key, true);
      }, true);
      window.addEventListener('popstate', () => open(keyFromLocation(), false));
      document.getElementById('burger')?.addEventListener('click', () => document.getElementById('side')?.classList.toggle('open'));
    }
    setTimeout(() => open(keyFromLocation(), true), 0);
    return open;
  }
  openPanel = installStudentNavigation();
  document.getElementById('logoutButton').addEventListener('click', async()=>{await auditEvent('logout','session',null,'success',{});await A.logout();});
  const supportWhatsApp = document.getElementById('supportWhatsApp'); if (supportWhatsApp) supportWhatsApp.href = `https://wa.me/${A.cfg.SUPPORT_WHATSAPP}`;

  const initials = (state.profile.full_name || state.profile.email || 'ST').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const memberName = state.profile.full_name || 'Member';
  const dashboardWelcome = document.getElementById('dashboardWelcomeName');
  if (dashboardWelcome) dashboardWelcome.textContent = `${memberName} 👋`;
  initDashboardClock();
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
    const { data: freshProfile, error: profileError } = await sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (freshProfile) state.profile = freshProfile;
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
      sb.from('terms_acceptances').select('id').eq('user_id', state.user.id).eq('document_type', 'risk_disclaimer').eq('version', A.cfg.RISK_VERSION).limit(1)
    ]);
    const firstError = requests.find(item => item.error)?.error;
    if (firstError) throw firstError;
    state.courses=requests[0].data||[]; state.sessions=requests[1].data||[];
    state.sessionLinks=Object.fromEntries((requests[2].data||[]).map(row=>[row.course_session_id,row.meet_url]));
    state.enrollments=requests[3].data||[]; state.payments=requests[4].data||[]; state.paymentMethods=requests[5].data||[];
    state.signals=requests[6].data||[]; state.signalUpdates=requests[7].data||[]; state.charts=requests[8].data||[];
    state.articles=requests[9].data||[]; state.announcements=requests[10].data||[]; state.resources=requests[11].data||[]; state.support=[];
    state.riskAccepted=Boolean(requests[12].data?.length);
    const [premiumAccess,premiumPayments,ibRows] = await Promise.all([
      sb.rpc('get_my_premium_access'),
      sb.from('premium_payments').select('*').order('created_at',{ascending:false}),
      sb.from('ib_verifications').select('*').order('created_at',{ascending:false})
    ]);
    if (premiumAccess.error) throw premiumAccess.error;
    if (premiumPayments.error) throw premiumPayments.error;
    if (ibRows.error) throw ibRows.error;
    state.premium = premiumAccess.data || null;
    state.premiumPayments = premiumPayments.data || [];
    state.ibVerifications = ibRows.data || [];
  }

  function renderAll() {
    renderKpis(); renderDashboard(); renderSignals(); renderCharts(); renderArticles(); renderCourses();
    renderPayments(); renderAnnouncements(); renderProfile(); renderEmailVerification(); renderPremium(); renderSupport();
    const paymentCount=document.getElementById('paymentCount'); if(paymentCount) paymentCount.textContent = state.payments.filter(p => ['initiated', 'received', 'under_review', 'resubmission_required'].includes(p.status)).length;
    document.getElementById('announcementCount').textContent = state.announcements.length;
    window.dispatchEvent(new CustomEvent('24k:student-base-updated',{detail:state}));
  }

  function renderKpis() {
    const activeSignals = state.signals.filter(s => !signalIsFinal(s)).length;
    const approvedCourses = TEMP_OPEN_ACCESS ? state.courses.length : state.enrollments.filter(isEnrollmentActive).length;
    const todayKey = dateKey(new Date());
    const todayCharts = state.charts.filter(c => dateKey(new Date(c.published_at || c.created_at || Date.now())) === todayKey).length;
    const data = [
      ['fa-bolt', activeSignals, 'Active Signals', 'Live setups & target progress', 'signals'],
      ['fa-chart-column', todayCharts, 'Market Analysis', 'Fresh charts published today', 'charts'],
      ['fa-file-lines', state.articles.length, 'Learning Library', 'Guides, notes & education', 'articles'],
      ['fa-graduation-cap', approvedCourses, 'My Courses', 'Programs & live classes', 'courses']
    ];
    document.getElementById('studentKpis').innerHTML = data.map(([icon, value, label, note, panel]) => `<button type="button" class="app-kpi dashboard-nav-card" data-goto="${panel}" aria-label="Open ${label}"><span class="kpi-icon"><i class="fa-solid ${icon}"></i></span><div><small>${label}</small><b>${value}</b><em>${note}</em></div><span class="kpi-spark"><i></i><i></i><i></i></span><i class="fa-solid fa-arrow-right dashboard-nav-arrow"></i></button>`).join('');
    renderSignalPerformance();
  }

  function renderDashboard() {
    const alert = document.getElementById('dashboardAlert');
    if (alert) alert.innerHTML = '';

    const latest = state.signals.find(s => !signalIsFinal(s)) || state.signals[0];
    document.getElementById('latestSignal').innerHTML = latest ? dashboardSignalSnapshot(latest) : `<div class="dashboard-empty-compact"><span><i class="fa-solid fa-bolt"></i></span><b>No active market signal right now.</b><small>Fresh setups will appear here automatically.</small><button type="button" class="text-link-btn" data-refresh-dashboard>Refresh <i class="fa-solid fa-rotate"></i></button></div>`;

    const next = state.sessions.filter(s => new Date(s.starts_at) >= new Date() && s.status !== 'cancelled').sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
    document.getElementById('nextSession').innerHTML = next ? dashboardClassSnapshot(next) : `<div class="dashboard-empty-compact class-empty"><span><i class="fa-solid fa-calendar-check"></i></span><b>No upcoming class scheduled</b><small>Your next live class will appear here when published.</small><button type="button" class="text-link-btn" data-goto="courses">Open Courses <i class="fa-solid fa-arrow-right"></i></button></div>`;

    const analysis = state.charts.slice(0, 3);
    const analysisWrap = document.getElementById('dashboardMarketAnalysis');
    if (analysisWrap) analysisWrap.innerHTML = analysis.length ? analysis.map(chart => `<button type="button" class="analysis-mini-row" data-read-chart="${chart.id}"><span class="analysis-thumb ${chart.image_url ? 'has-image' : ''}">${chart.image_url ? `<img src="${attr(chart.image_url)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.remove();this.parentElement.classList.remove('has-image')">` : ''}<i class="fa-solid fa-chart-line analysis-thumb-fallback"></i></span><span class="analysis-mini-copy"><b>${A.escapeHtml(chart.title)}</b><small>${A.escapeHtml(chart.symbol || 'Market')} · ${A.escapeHtml(chart.timeframe || 'Analysis')}</small><em>${A.formatDateTime(chart.published_at)}</em></span><span class="analysis-open-arrow"><i class="fa-solid fa-arrow-up-right-from-square"></i></span></button>`).join('') : `<div class="dashboard-empty-inline premium-empty-state"><span class="empty-orb"><i class="fa-solid fa-chart-line"></i></span><div><b>No market analysis yet</b><small>New chart breakdowns will appear here when published.</small></div></div>`;

    const upcomingSessions = state.sessions.filter(s => new Date(s.starts_at) >= new Date() && s.status !== 'cancelled').sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at));
    const nextPulseSession = upcomingSessions[0];
    const latestNotice = state.announcements[0];
    const learning = document.getElementById('dashboardLearningSnapshot');
    if (learning) {
      const verified = Boolean(state.profile?.email_verified);
      const joined = state.profile?.created_at ? new Date(state.profile.created_at) : null;
      const joinedText = joined && !Number.isNaN(joined.getTime()) ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(joined) : '24K Member';
      const nextClassText = nextPulseSession ? A.formatDateTime(nextPulseSession.starts_at) : 'Not scheduled';
      const latestNoticeTitle = latestNotice?.title || 'No new announcement';
      const publishedResources = state.resources.length;
      const premiumOpen=Boolean(state.premium?.has_access);
      const premiumSource=String(state.premium?.source||'locked');
      const premiumLabel=premiumOpen?(premiumSource==='trial'?'Free Trial Active':premiumSource==='ib'?'IB Access Active':premiumSource==='free'?'Premium Free':'Premium Active'):'Premium Locked';
      const premiumNote=premiumOpen?(state.premium?.days_left!=null?`${state.premium.days_left} day${Number(state.premium.days_left)===1?'':'s'} remaining`:'Signals, charts and articles are available.'):'Renew by payment or approved IB verification.';
      learning.innerHTML = `<div class="member-desk-shell">
        <div class="member-desk-access ${premiumOpen?'':'is-locked'}" data-goto="profile" role="button" tabindex="0">
          <span class="desk-crown"><i class="fa-solid ${premiumOpen?'fa-crown':'fa-lock'}"></i></span>
          <div><small>PREMIUM MARKET ACCESS</small><b>${A.escapeHtml(premiumLabel)}</b><em>${A.escapeHtml(premiumNote)}</em></div>
          <span class="desk-active ${premiumOpen?'':'locked'}"><i></i> ${premiumOpen?'ACTIVE':'LOCKED'}</span>
        </div>
        <div class="member-desk-metrics">
          <button type="button" data-goto="profile"><span class="desk-metric-icon"><i class="fa-solid ${verified?'fa-circle-check':'fa-envelope'}"></i></span><small>Email security</small><b>${verified?'Verified':'Verify available'}</b><em>${verified?'Account protected':'Optional for now'}</em></button>
          <button type="button" data-goto="courses"><span class="desk-metric-icon"><i class="fa-regular fa-calendar"></i></span><small>Next live class</small><b>${A.escapeHtml(nextClassText)}</b><em>${upcomingSessions.length ? `${upcomingSessions.length} upcoming` : 'Waiting for schedule'}</em></button>
          <button type="button" data-goto="courses"><span class="desk-metric-icon"><i class="fa-solid fa-folder-open"></i></span><small>Learning resources</small><b>${publishedResources}</b><em>Available files</em></button>
          <button type="button" data-goto="announcements"><span class="desk-metric-icon"><i class="fa-solid fa-bullhorn"></i></span><small>Latest update</small><b>${A.escapeHtml(latestNoticeTitle)}</b><em>${latestNotice ? A.formatDateTime(latestNotice.published_at || latestNotice.created_at) : 'No update yet'}</em></button>
        </div>
        <div class="member-desk-footer"><span><i class="fa-regular fa-id-badge"></i> Member since <b>${A.escapeHtml(joinedText)}</b></span><button type="button" data-goto="profile">Account settings <i class="fa-solid fa-arrow-right"></i></button></div>
      </div>`;
    }
  }


  function signalHistorySourceDate(signal) {
    return new Date(signal.closed_at || signal.last_status_at || signal.updated_at || signal.published_at || signal.created_at || Date.now());
  }

  function signalMarketBucket(signal) {
    const symbol = String(signal.symbol || '').replace(/[^A-Za-z]/g,'').toUpperCase();
    if (symbol.startsWith('XAU')) return 'gold';
    if (symbol.startsWith('BTC')) return 'btc';
    const currencies = ['USD','EUR','GBP','JPY','AUD','NZD','CAD','CHF'];
    if (symbol.length === 6 && currencies.includes(symbol.slice(0,3)) && currencies.includes(symbol.slice(3))) return 'forex';
    return 'other';
  }

  function historyDateMatches(signal, filter) {
    const source = signalHistorySourceDate(signal);
    if (Number.isNaN(source.getTime())) return false;
    const now = new Date();
    const today = dateKey(now);
    if (filter === 'today') return dateKey(source) === today;
    if (filter === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      return dateKey(source) === dateKey(y);
    }
    const age = now.getTime() - source.getTime();
    if (filter === 'week') return age >= 0 && age <= 7 * 86400000;
    if (filter === 'month') return age >= 0 && age <= 30 * 86400000;
    return true;
  }

  function signalBaseRowsForWorkspace() {
    if (signalWorkspaceView === 'active') return state.signals.filter(signal => !signalIsFinal(signal));
    return state.signals.filter(signal => signalIsFinal(signal));
  }

  function signalVisibleRows() {
    let rows = signalBaseRowsForWorkspace();
    if (signalWorkspaceView === 'history') {
      rows = rows.filter(signal => (historyMarketFilter === 'all' || signalMarketBucket(signal) === historyMarketFilter) && historyDateMatches(signal, historyDateFilter));
      rows.sort((a,b) => signalHistorySourceDate(b) - signalHistorySourceDate(a));
    } else {
      rows.sort((a,b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0));
    }
    return rows;
  }

  function renderSignalPerformance() {
    const rows = signalVisibleRows();
    const pips = rows.map(latestSignalPips).filter(value => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number);
    const totalPips = pips.reduce((sum, value) => sum + value, 0);
    const tpHits = rows.filter(signal => Number(signal.tp_hit || 0) > 0 || /^tp\d+_hit$/.test(String(signal.status || '').toLowerCase())).length;
    const slHits = rows.filter(signal => String(signal.status || '').toLowerCase() === 'sl_hit').length;
    const pending = rows.filter(signal => matchesSignalStatus(signal,'pending')).length;
    const beCount = rows.filter(signal => Boolean(signal.be_moved) || ['breakeven_hit','move_to_be','be'].includes(String(signal.status || '').toLowerCase())).length;
    const wins = rows.filter(signal => {
      const pip = latestSignalPips(signal);
      return (pip != null && Number(pip) > 0) || Number(signal.tp_hit || 0) > 0;
    }).length;
    const resolved = rows.filter(signal => signalIsFinal(signal) || Number(signal.tp_hit || 0) > 0 || signal.be_moved).length;
    const winRate = resolved ? Math.round((wins / resolved) * 100) : 0;
    const summary = signalWorkspaceView === 'active'
      ? [
          ['fa-bolt', rows.length, 'Active Signals', 'Current open setups', 'gold'],
          ['fa-hourglass-half', pending, 'Pending', 'Waiting for activation', 'violet'],
          ['fa-bullseye', tpHits, 'TP Progress', 'Targets already hit', 'target'],
          ['fa-shield-halved', beCount, 'Break Even', 'Protected live setups', 'green'],
          ['fa-chart-line', `${signed(totalPips)} Pips`, 'Live Performance', 'Visible active result', 'gold']
        ]
      : [
          ['fa-clock-rotate-left', rows.length, 'History Signals', 'Filtered completed records', 'gold'],
          ['fa-bullseye', tpHits, 'TP Hits', 'Filtered target hits', 'target'],
          ['fa-ban', slHits, 'SL Hits', 'Filtered stopped trades', 'bad'],
          ['fa-chart-line', `${signed(totalPips)} Pips`, 'Total Performance', 'Filtered result', 'gold'],
          ['fa-trophy', `${winRate}%`, 'Win Rate', 'Filtered resolved signals', 'violet']
        ];
    const root = document.getElementById('signalPerformance');
    if (root) root.innerHTML = summary.map(([icon,value,label,note,tone]) => `<div class="signal-summary-card ${tone}"><span class="signal-summary-icon"><i class="fa-solid ${icon}"></i></span><div><b>${A.escapeHtml(String(value))}</b><strong>${label}</strong><small>${note}</small></div></div>`).join('');
  }

  function updateSignalWorkspaceUi() {
    document.querySelectorAll('[data-signal-view]').forEach(btn => {
      const active = btn.dataset.signalView === signalWorkspaceView;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const filters = document.getElementById('signalHistoryFilters');
    if (filters) filters.hidden = signalWorkspaceView !== 'history';
    document.querySelectorAll('[data-history-market]').forEach(btn => btn.classList.toggle('active', btn.dataset.historyMarket === historyMarketFilter));
    document.querySelectorAll('[data-history-date]').forEach(btn => btn.classList.toggle('active', btn.dataset.historyDate === historyDateFilter));
  }

  function renderSignals() {
    updateSignalWorkspaceUi();
    const rows = signalVisibleRows();
    renderSignalPerformance();
    const grid = document.getElementById('signalsGrid');
    if (!grid) return;
    if (!rows.length) {
      grid.innerHTML = `<div class="signal-table-empty"><i class="fa-solid fa-filter-circle-xmark"></i><b>${signalWorkspaceView === 'active' ? 'No active signals right now.' : 'No history matches these filters.'}</b><span>${signalWorkspaceView === 'active' ? 'New active setups will appear here automatically.' : 'Try another market or date range.'}</span></div>`;
      return;
    }
    grid.innerHTML = `<table class="premium-signal-table compact-history-table"><thead><tr><th>Time</th><th>Date</th><th>Instrument</th><th>Type</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>Current Pips</th><th>Status</th></tr></thead><tbody>${rows.map(signalTableRow).join('')}</tbody></table><div class="signal-table-footer">Showing ${rows.length} signal${rows.length === 1 ? '' : 's'}</div>`;
  }

  function syncSignalInstrumentFilter() { return; }

  function matchesSignalStatus(signal, key) {
    if (!key || key === 'all') return true;
    const status = String(signal.status || '').toLowerCase();
    const order = String(signal.order_type || '').toLowerCase();
    if (key === 'active') return !signalIsFinal(signal) && !['pending','waiting'].includes(status);
    if (key === 'pending') return ['pending','waiting'].includes(status) || status.includes('pending') || (!signalIsFinal(signal) && (order.includes('limit') || order.includes('stop')) && !signal.activated_at && status !== 'active');
    if (key === 'tp_hit') return Number(signal.tp_hit || 0) > 0 || /^tp\d+_hit$/.test(status);
    if (key === 'be') return Boolean(signal.be_moved) || ['breakeven_hit','move_to_be','be'].includes(status);
    if (key === 'closed') return signalIsFinal(signal);
    if (key === 'sl') return status === 'sl_hit';
    return true;
  }

  function signalTableRow(signal) {
    const sourceDate = signalWorkspaceView === 'history' ? signalHistorySourceDate(signal) : new Date(signal.published_at || signal.created_at || Date.now());
    const time = Number.isNaN(sourceDate.getTime()) ? '—' : new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}).format(sourceDate);
    const date = Number.isNaN(sourceDate.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',day:'2-digit',month:'short',year:'numeric'}).format(sourceDate);
    const symbol = String(signal.symbol || '').replace('/','').toUpperCase();
    const meta = instrumentMeta(symbol);
    const currentPips = latestSignalPips(signal);
    const pipClass = currentPips == null ? '' : Number(currentPips) > 0 ? 'positive' : Number(currentPips) < 0 ? 'negative' : 'neutral';
    const pipText = currentPips == null ? '—' : `${signed(currentPips)} Pips`;
    const status = signalDisplayStatus(signal);
    return `<tr data-student-signal-history="${signal.id}" tabindex="0"><td class="signal-time-cell"><b>${A.escapeHtml(time)}</b></td><td class="signal-date-cell">${A.escapeHtml(date)}</td><td><div class="instrument-cell"><span class="instrument-badge ${meta.tone}">${meta.icon}</span><div><b>${A.escapeHtml(displaySymbol(symbol))}</b><small>${A.escapeHtml(meta.name)}</small></div></div></td><td><span class="table-direction ${String(signal.direction||'').toLowerCase()}">${A.escapeHtml(signal.direction || '—')}</span></td><td><b>${entryText(signal)}</b></td><td>${num(signal.stop_loss)}</td><td>${num(signal.take_profit_1)}</td><td>${num(signal.take_profit_2)}</td><td>${num(signal.take_profit_3)}</td><td><b class="table-pips ${pipClass}">${A.escapeHtml(pipText)}</b></td><td><span class="signal-table-status ${status.tone}">${A.escapeHtml(status.label)}</span></td></tr>`;
  }

  function latestSignalPips(signal) {
    if (signal.result_pips !== null && signal.result_pips !== undefined) return Number(signal.result_pips);
    const update = state.signalUpdates.find(u => u.signal_id === signal.id && u.result_pips !== null && u.result_pips !== undefined);
    return update ? Number(update.result_pips) : null;
  }

  function signalDisplayStatus(signal) {
    const status = String(signal.status || '').toLowerCase();
    if (status === 'sl_hit') return { label:'SL Hit', tone:'sl' };
    if (status === 'cancelled') return { label:'Cancelled', tone:'closed' };
    if (status === 'breakeven_hit' || signal.be_moved) return { label:'BE', tone:'be' };
    if (Number(signal.tp_hit || 0) > 0 && !signalIsFinal(signal)) return { label:`TP${Math.min(3,Number(signal.tp_hit||0))} Hit`, tone:'tp' };
    if (/^tp\d+_hit$/.test(status)) return { label:A.statusLabel(status), tone:'tp' };
    if (signalIsFinal(signal)) return { label:A.statusLabel(status || 'closed'), tone:'closed' };
    if (status.includes('pending') || status === 'waiting') return { label:'Pending', tone:'pending' };
    return { label:'Active', tone:'active' };
  }

  function instrumentMeta(symbol) {
    const map = {
      XAUUSD:{icon:'<i class="fa-solid fa-coins"></i>',name:'Gold / USD',tone:'gold'},
      XAGUSD:{icon:'<i class="fa-solid fa-circle-half-stroke"></i>',name:'Silver / USD',tone:'silver'},
      EURUSD:{icon:'€',name:'Euro / USD',tone:'blue'},
      GBPUSD:{icon:'£',name:'GBP / USD',tone:'navy'},
      AUDUSD:{icon:'A$',name:'AUD / USD',tone:'blue'},
      USDJPY:{icon:'¥',name:'USD / JPY',tone:'red'},
      USOIL:{icon:'<i class="fa-solid fa-droplet"></i>',name:'Crude Oil',tone:'black'},
      BTCUSD:{icon:'₿',name:'Bitcoin / USD',tone:'orange'}
    };
    return map[symbol] || {icon:'<i class="fa-solid fa-chart-line"></i>',name:displaySymbol(symbol),tone:'gold'};
  }

  function dashboardSignalSnapshot(signal) {
    const status = signalDisplayStatus(signal);
    const pips = latestSignalPips(signal);
    const pipsClass = pips == null ? 'neutral' : pips > 0 ? 'positive' : pips < 0 ? 'negative' : 'neutral';
    const pipsText = pips == null ? 'Live' : `${signed(pips)} Pips`;
    return `<button type="button" class="dashboard-signal-snapshot premium-signal-snapshot" data-goto="signals">
      <div class="dash-signal-command">
        <div class="dash-signal-identity"><span class="dash-market-icon"><i class="fa-solid fa-chart-line"></i></span><div><small>LIVE SETUP</small><b>${A.escapeHtml(displaySymbol(signal.symbol))}</b></div><span class="table-direction ${String(signal.direction||'').toLowerCase()}">${A.escapeHtml(signal.direction || '—')}</span></div>
        <div class="dash-signal-result"><small>CURRENT RESULT</small><b class="table-pips ${pipsClass}">${A.escapeHtml(pipsText)}</b></div>
        <span class="signal-table-status ${status.tone}">${A.escapeHtml(status.label)}</span>
      </div>
      <div class="dash-signal-note"><i class="fa-solid fa-circle-info"></i>${A.escapeHtml(signal.notes || 'Live trade setup')}</div>
      <div class="dash-signal-levels"><span><small>ENTRY ZONE</small><b>${entryText(signal)}</b></span><span><small>STOP LOSS</small><b>${num(signal.stop_loss)}</b></span><span><small>TP1</small><b>${num(signal.take_profit_1)}</b></span><span><small>TP2</small><b>${num(signal.take_profit_2)}</b></span><span><small>TP3</small><b>${num(signal.take_profit_3)}</b></span></div>
      <div class="dash-signal-foot"><small><i class="fa-regular fa-clock"></i> Published ${A.formatDateTime(signal.published_at)}</small><span>Open signal desk <i class="fa-solid fa-arrow-right"></i></span></div>
    </button>`;
  }

  function dashboardClassSnapshot(session) {
    const course = state.courses.find(c => c.id === session.course_id);
    const start = new Date(session.starts_at);
    const diff = start.getTime() - Date.now();
    let countdown = 'Scheduled';
    if (Number.isFinite(diff) && diff > 0) {
      const mins = Math.max(1, Math.floor(diff / 60000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      countdown = days > 0 ? `Starts in ${days}d ${hours}h` : hours > 0 ? `Starts in ${hours}h ${mins % 60}m` : `Starts in ${mins}m`;
    }
    return `<button type="button" class="dashboard-class-snapshot premium-class-snapshot" data-open-course="${session.course_id}">
      <div class="class-visual-lockup"><span class="class-visual-icon"><i class="fa-solid fa-video"></i></span><div><small>UPCOMING LIVE SESSION</small><b>${A.escapeHtml(countdown)}</b></div></div>
      <div class="class-status-row"><span class="class-upcoming">${A.escapeHtml(A.statusLabel(session.status || 'upcoming'))}</span><span class="class-course-chip">${A.escapeHtml(course?.course_type === 'free' ? 'Free Course' : 'Member Class')}</span></div>
      <h4>${A.escapeHtml(session.title)}</h4><p>${A.escapeHtml(course?.title || '24K Excellence')}</p>
      <div class="class-meta-row"><span><i class="fa-regular fa-calendar"></i>${A.formatDateTime(session.starts_at)}</span><span><i class="fa-solid fa-user-tie"></i>Malik Zameer</span></div>
      <span class="class-open-link">View class details <i class="fa-solid fa-arrow-right"></i></span>
    </button>`;
  }

  function dateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
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


  function safeMediaImage(url, altText, fallbackIcon) {
    const cleanUrl = String(url || '').trim();
    return `<i class="fa-solid ${fallbackIcon} content-cover-fallback" aria-hidden="true"></i>${cleanUrl ? `<img src="${attr(cleanUrl)}" alt="${attr(altText || '')}" loading="lazy" decoding="async" onerror="this.remove();this.parentElement.classList.remove('has-image')">` : ''}`;
  }

  function renderCharts() {
    const query = document.getElementById('chartSearch')?.value.trim().toLowerCase() || '';
    const tf = document.getElementById('chartTimeframeFilter')?.value || 'all';
    const rows = state.charts.filter(c => (!query || `${c.title} ${c.symbol} ${c.summary}`.toLowerCase().includes(query)) && (tf === 'all' || c.timeframe === tf));
    document.getElementById('chartsGrid').innerHTML = rows.length ? rows.map(chart => `<article class="content-card compact-media-card"><div class="content-cover media-thumb-16x9 ${chart.image_url ? 'has-image' : ''}">${safeMediaImage(chart.image_url, chart.title, 'fa-chart-candlestick')}</div><div class="content-body"><div class="course-meta content-meta-strong"><span>${A.escapeHtml(chart.symbol)}</span><span>${A.escapeHtml(chart.timeframe || '—')}</span><span>${A.escapeHtml(chart.category || 'Market Analysis')}</span><span>${A.formatDate(chart.published_at)}</span></div><h3>${A.escapeHtml(chart.title)}</h3><p>${A.escapeHtml(chart.summary || '')}</p><div class="card-actions"><button class="app-btn small gold" data-read-chart="${chart.id}">View Details</button>${chart.image_url ? `<a class="app-btn small outline" href="${attr(chart.image_url)}" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> Full Chart</a>` : ''}</div></div></article>`).join('') : empty('No chart analysis matches your search.', 'fa-chart-line');
  }

  function renderArticles() {
    const query = document.getElementById('articleSearch')?.value.trim().toLowerCase() || '';
    const rows = state.articles.filter(a => !query || `${a.title} ${a.excerpt} ${a.content}`.toLowerCase().includes(query));
    document.getElementById('articlesGrid').innerHTML = rows.length ? rows.map(article => `<article class="content-card compact-media-card"><div class="content-cover media-thumb-16x9 ${article.cover_url ? 'has-image' : ''}">${safeMediaImage(article.cover_url, article.title, 'fa-book-open')}</div><div class="content-body"><div class="course-meta content-meta-strong"><span>${A.escapeHtml(article.category || 'Education')}</span><span><i class="fa-solid fa-calendar"></i> ${A.formatDate(article.published_at)}</span></div><h3>${A.escapeHtml(article.title)}</h3><p>${A.escapeHtml(article.excerpt || '')}</p><button class="app-btn small gold" data-read-article="${article.id}">Read Article</button></div></article>`).join('') : empty('No article matches your search.', 'fa-newspaper');
  }

  function upcomingCourseSession(courseId) {
    const cutoff = Date.now() - (5 * 60 * 1000);
    return state.sessions
      .filter(session => {
        if (session.course_id !== courseId) return false;
        if (['cancelled','completed'].includes(String(session.status || '').toLowerCase())) return false;
        const starts = new Date(session.starts_at).getTime();
        return Number.isFinite(starts) && starts >= cutoff;
      })
      .sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at))[0] || null;
  }

  function courseCoverHtml(course) {
    const cleanUrl = String(course.thumbnail_url || '').trim();
    return `<div class="course-cover media-thumb-16x9 ${cleanUrl ? 'has-image' : ''}"><i class="fa-solid fa-graduation-cap course-cover-fallback" aria-hidden="true"></i>${cleanUrl ? `<img src="${attr(cleanUrl)}" alt="${attr(course.title)}" loading="lazy" decoding="async" onerror="this.remove();this.parentElement.classList.remove('has-image')">` : ''}<span class="status-pill ${A.statusClass(course.status)}">${A.statusLabel(course.status)}</span></div>`;
  }

  function renderCourses() {
    document.querySelectorAll('[data-course-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.courseFilter===state.courseFilter));
    const rows=state.courses.filter(course=>{const price=Number(course.discount_price!=null?course.discount_price:course.price||0);const isFree=course.course_type==='free'||price===0;return state.courseFilter==='all'||(state.courseFilter==='free'&&isFree)||(state.courseFilter==='paid'&&!isFree);});
    document.getElementById('coursesGrid').innerHTML = rows.length ? rows.map(course => {
      const access = hasCourseAccess(course.id);
      const payment = latestPayment(course.id);
      const nextSession = upcomingCourseSession(course.id);
      const actualPrice=course.discount_price!=null?Number(course.discount_price):Number(course.price);
      const paymentText = payment ? A.statusLabel(payment.status) : (course.course_type==='free'||actualPrice===0 ? 'Free enrollment' : 'Payment required');
      const isInfinity = String(course.currency||'').toUpperCase()==='PKR';
      const paymentButtonText = payment?.status==='initiated' ? 'Continue Payment' : payment && ['received','under_review'].includes(payment.status) ? 'Payment Submitted' : payment?.status==='resubmission_required' ? 'Submit New Receipt' : ['failed','declined'].includes(payment?.status) ? 'Try Payment Again' : 'Pay Now';
      const paymentTone = ['declined','failed'].includes(payment?.status) ? 'bad' : 'warn';
      return `<article class="course-card">${courseCoverHtml(course)}<div class="course-body"><h3>${A.escapeHtml(course.title)}</h3><p>${A.escapeHtml(course.short_description || course.description || '')}</p><div class="course-meta"><span><i class="fa-solid fa-user-tie"></i> ${A.escapeHtml(course.instructor_name || A.cfg.INSTRUCTOR_NAME)}</span><span><i class="fa-solid fa-money-bill"></i> ${course.discount_price!=null?`<s>${A.formatMoney(course.price,course.currency)}</s> ${A.formatMoney(course.discount_price,course.currency)}`:A.formatMoney(course.price, course.currency)}</span>${nextSession?`<span><i class="fa-solid fa-calendar"></i> ${A.formatDateTime(nextSession.starts_at)}</span>`:`<span><i class="fa-solid fa-calendar"></i> No upcoming class</span>`}</div>${nextSession?`<div class="course-next-class"><small>Next Live Class</small><b>${A.escapeHtml(nextSession.title)}</b><span>${A.escapeHtml(nextSession.topic||'')}</span></div>`:''}<div class="notice ${access ? 'ok' : paymentTone}">${access ? '<b>Access approved.</b> Online class access is unlocked.' : `<b>${paymentText}.</b> ${payment?.status==='initiated'&&isInfinity?'Complete the secure hosted bank payment and receipt verification.':'Class date is visible, but online class access remains locked.'}`}</div><div class="course-actions"><button class="app-btn ${access ? 'gold' : 'outline'}" data-open-course="${course.id}"><i class="fa-solid fa-calendar-days"></i> View Live Class</button>${access ? '' : (course.course_type==='free'||actualPrice===0) ? `<button class="app-btn gold" data-free-enroll="${course.id}">Enroll Free</button>` : `<button class="app-btn gold" data-buy-course="${course.id}"><i class="fa-solid fa-building-columns"></i> ${paymentButtonText}</button>`}</div></div></article>`;
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
    const course = state.selectedCourse || state.courses.find(c => c.id === session.course_id);
    const effectivePrice = course ? Number(course.discount_price != null ? course.discount_price : course.price || 0) : 0;
    const isFree = course?.course_type === 'free' || effectivePrice === 0;
    const accessText=access||isFree?'Session schedule available':'Course access is required for the class schedule.';
    return `<article class="session-card"><div class="session-top"><span class="session-number">Session ${session.session_number}</span><span class="session-lock"><i class="fa-solid fa-video"></i></span></div><div class="session-body"><div class="signal-head"><h3>${A.escapeHtml(session.title)}</h3><span class="status-pill ${A.statusClass(session.status)}">${A.statusLabel(session.status)}</span></div><p>${A.escapeHtml(session.topic || '')}</p><div class="session-date"><span><i class="fa-solid fa-calendar"></i> ${A.formatDateTime(session.starts_at)}</span><span><i class="fa-solid fa-hourglass-half"></i> ${session.duration_minutes || 90} minutes</span><span><i class="fa-solid fa-video"></i> Zoom</span></div><div class="session-community-note"><i class="fa-brands fa-whatsapp"></i><span>Zoom link will be shared in the WhatsApp Community.</span></div><small class="muted" style="display:block;margin-top:9px">${A.escapeHtml(accessText)}</small></div></article>`;
  }

  function sessionCompact(session) {
    const course = state.courses.find(c => c.id === session.course_id);
    const access = hasCourseAccess(session.course_id);
    return `<div class="session-body" style="padding:0"><span class="status-pill ${A.statusClass(session.status)}">${A.statusLabel(session.status)}</span><h3 style="margin-top:12px">${A.escapeHtml(session.title)}</h3><p>${A.escapeHtml(course?.title || '')}</p><div class="session-date"><span><i class="fa-solid fa-calendar"></i> ${A.formatDateTime(session.starts_at)}</span><span><i class="fa-solid fa-user-tie"></i> Malik Zameer</span></div><button class="app-btn ${access ? 'gold' : 'outline'}" data-open-course="${session.course_id}">${access ? 'Open Session' : 'View Locked Schedule'}</button></div>`;
  }

  async function loadPremiumState(){
    const [premiumAccess,premiumPayments,ibRows]=await Promise.all([
      A.supabase.rpc('get_my_premium_access'),
      A.supabase.from('premium_payments').select('*').order('created_at',{ascending:false}),
      A.supabase.from('ib_verifications').select('*').order('created_at',{ascending:false})
    ]);
    if(premiumAccess.error)throw premiumAccess.error;
    if(premiumPayments.error)throw premiumPayments.error;
    if(ibRows.error)throw ibRows.error;
    state.premium=premiumAccess.data||null;state.premiumPayments=premiumPayments.data||[];state.ibVerifications=ibRows.data||[];
  }

  function renderPremium() {
    const p=state.premium||{};
    const root=document.getElementById('premiumAccessOverview');
    if(root){
      const has=Boolean(p.has_access); const source=String(p.source||'locked');
      const expiry=p.expires_at?A.formatDateTime(p.expires_at):'No expiry';
      const title=has?(source==='trial'?'Free Trial Active':source==='ib'?'IB Access Active':source==='free'?'Premium Access Free':'Premium Access Active'):'Premium Access Locked';
      root.innerHTML=`<div class="premium-access-status ${has?'active':'locked'}"><span><i class="fa-solid ${has?'fa-lock-open':'fa-lock'}"></i></span><div><small>Signals + Charts + Articles</small><h3>${A.escapeHtml(title)}</h3><p>${has?`Access source: ${A.escapeHtml(source.toUpperCase())} · ${p.expires_at?`Expires ${expiry}`:'No expiry'}`:'Choose monthly payment or IB verification to unlock premium content.'}</p></div>${p.days_left!=null?`<b>${p.days_left} day${Number(p.days_left)===1?'':'s'} left</b>`:''}</div>`;
    }
    const price=document.getElementById('premiumPriceBox');
    if(price) price.innerHTML=p.package_mode==='free'?`<div class="premium-price"><b>FREE</b><small>Admin has opened Premium Market Access.</small></div>`:`<div class="premium-price"><span><b>PKR ${Number(p.price_pkr||0).toLocaleString()}</b><small>Local Bank Transfer</small></span><span><b>${Number(p.price_usdt||0).toLocaleString()} USDT</b><small>USDT TRC20</small></span><em>${Number(p.monthly_days||30)} days per renewal</em></div>`;
    const ib=document.getElementById('premiumIbStatus');
    if(ib){const latest=state.ibVerifications[0];ib.innerHTML=!p.ib_enabled?'<div class="notice warn">IB verification is currently disabled by Admin.</div>':latest?`<div class="notice ${latest.status==='approved'?'ok':latest.status==='declined'?'bad':'warn'}"><b>${A.statusLabel(latest.status)}</b> · ${A.escapeHtml(latest.broker)} / ${A.escapeHtml(latest.trading_account_id)}${latest.admin_note?`<br>${A.escapeHtml(latest.admin_note)}`:''}</div>`:'<div class="notice info">No IB verification submitted yet.</div>';}
    const compactStatus=document.getElementById('premiumCompactStatus');
    if(compactStatus){
      const has=Boolean(p.has_access); const source=String(p.source||'locked');
      compactStatus.classList.toggle('locked',!has);
      compactStatus.innerHTML=has
        ? `<i class="fa-solid fa-circle"></i> ${source==='trial'?'Free Trial':source==='ib'?'IB Access':'Premium Active'}${p.days_left!=null?` · ${p.days_left}d left`:''}`
        : `<i class="fa-solid fa-lock"></i> Locked`;
    }
    const historyCount=document.getElementById('premiumHistoryCount');
    if(historyCount) historyCount.textContent=`${state.premiumPayments.length} payment${state.premiumPayments.length===1?'':'s'}`;
    const body=document.getElementById('premiumPaymentsBody');
    if(body) body.innerHTML=state.premiumPayments.length?state.premiumPayments.map(row=>`<tr><td>${A.formatDateTime(row.created_at)}</td><td>${A.escapeHtml(row.payment_method_name)}</td><td>${A.escapeHtml(row.currency==='PKR'?`PKR ${Number(row.amount||0).toLocaleString()}`:`${Number(row.amount||0).toLocaleString()} USDT`)}</td><td><span class="status-pill ${A.statusClass(row.status)}">${A.statusLabel(row.status)}</span></td><td>${row.access_expires_at?A.formatDateTime(row.access_expires_at):'—'}</td><td>${A.escapeHtml(row.admin_note||row.provider_rejection_reason||'—')}</td></tr>`).join(''):`<tr><td colspan="6">${empty('No premium payment history yet.','fa-crown')}</td></tr>`;
    const localBankEnabled = state.paymentMethods.some(m => /^(local bank transfer|infinity(?: money solutions)?)$/i.test(String(m.name||'').trim()));
    const usdtEnabled = state.paymentMethods.some(m => /usdt|trc\s*20|trc20/i.test(`${m.name||''} ${m.instructions||''}`));
    const premiumLocal=document.getElementById('premiumPayLocal'); if(premiumLocal){premiumLocal.disabled=p.package_mode==='free'||!localBankEnabled;premiumLocal.classList.toggle('method-disabled',!localBankEnabled);premiumLocal.title=localBankEnabled?'':'Local Bank Transfer is currently disabled by Admin.';}
    const premiumUsdt=document.getElementById('premiumPayUsdt'); if(premiumUsdt){premiumUsdt.disabled=p.package_mode==='free'||!usdtEnabled;premiumUsdt.classList.toggle('method-disabled',!usdtEnabled);premiumUsdt.title=usdtEnabled?'':'USDT TRC20 is currently disabled by Admin.';}
    const ibSubmit=document.querySelector('#ibVerificationForm button[type="submit"]');if(ibSubmit)ibSubmit.disabled=(p.ib_enabled===false);
    renderIbBrokerInstructions();
    renderAccessSelection();
  }

  async function startPremiumLocalBank(button){
    A.setLoading(button,true,'Opening secure payment...');
    try{const {data,error}=await A.supabase.functions.invoke('create-premium-infinity-payment',{body:{}});if(error)throw error;if(!data?.redirect_url)throw new Error(data?.error||'Payment page was not returned.');await auditEvent('premium_payment_started','premium_package',data.payment_id,'success',{method:'local_bank'});location.href=data.redirect_url;}
    catch(error){A.toast(A.friendlyError(error,'Could not start premium payment.'),'error');}
    finally{A.setLoading(button,false);}
  }
  async function submitPremiumUsdt(event){event.preventDefault();const f=event.currentTarget,file=f.elements.receipt.files?.[0],button=f.querySelector('button[type=submit]');if(!file)return A.toast('Choose a payment receipt.','error');if(file.size>5*1024*1024)return A.toast('Receipt must be 5 MB or smaller.','error');A.setLoading(button,true,'Submitting...');let path='';try{path=`${state.user.id}/premium/${Date.now()}-${A.fileSafeName(file.name)}`;const upload=await A.supabase.storage.from('payment-receipts').upload(path,file,{contentType:file.type,upsert:false});if(upload.error)throw upload.error;const {error}=await A.supabase.rpc('submit_premium_usdt_payment',{p_reference:f.elements.transaction_reference.value.trim(),p_receipt_path:path,p_note:f.elements.student_note.value.trim()||null});if(error){await A.supabase.storage.from('payment-receipts').remove([path]);throw error;}await auditEvent('premium_payment_submitted','premium_package',null,'success',{method:'usdt'});A.closeModal('premiumUsdtModal');f.reset();await loadAll();renderAll();A.toast('Premium payment submitted for review.','success');}catch(error){A.toast(A.friendlyError(error,'Could not submit premium payment.'),'error');}finally{A.setLoading(button,false);}}
  async function submitIbVerification(event){
    event.preventDefault();
    const f=event.currentTarget,button=f.querySelector('button[type=submit]');
    const depositFile=f.elements.deposit_proof.files?.[0];
    const confirmationFile=f.elements.confirmation_proof.files?.[0]||null;
    if(!depositFile)return A.toast('Deposit proof is required.','error');
    if(depositFile.size>5*1024*1024)return A.toast('Deposit proof must be 5 MB or smaller.','error');
    if(confirmationFile&&confirmationFile.size>5*1024*1024)return A.toast('Confirmation proof must be 5 MB or smaller.','error');
    const amount=Number(f.elements.deposit_amount.value||0);
    if(!Number.isFinite(amount)||amount<=0)return A.toast('Enter a valid deposit amount.','error');
    A.setLoading(button,true,'Submitting...');
    const uploaded=[];
    try{
      const depositPath=`${state.user.id}/deposit/${Date.now()}-${A.fileSafeName(depositFile.name)}`;
      const dep=await A.supabase.storage.from('ib-proofs').upload(depositPath,depositFile,{contentType:depositFile.type,upsert:false});
      if(dep.error)throw dep.error;uploaded.push(depositPath);
      let confirmationPath=null;
      if(confirmationFile){
        confirmationPath=`${state.user.id}/confirmation/${Date.now()}-${A.fileSafeName(confirmationFile.name)}`;
        const conf=await A.supabase.storage.from('ib-proofs').upload(confirmationPath,confirmationFile,{contentType:confirmationFile.type,upsert:false});
        if(conf.error)throw conf.error;uploaded.push(confirmationPath);
      }
      const {data,error}=await A.supabase.rpc('submit_ib_verification_v969',{
        p_broker:f.elements.broker.value,
        p_account_id:f.elements.trading_account_id.value.trim(),
        p_account_type:f.elements.account_type.value,
        p_deposit_amount:amount,
        p_deposit_proof_path:depositPath,
        p_confirmation_proof_path:confirmationPath,
        p_note:f.elements.note.value.trim()||null
      });
      if(error)throw error;
      await auditEvent('ib_verification_submitted','ib_verification',data?.id||null,'success',{broker:f.elements.broker.value,account_action:f.elements.account_type.value,deposit_amount:amount});
      f.reset();renderIbBrokerInstructions();await loadPremiumState();renderPremium();
      A.toast('IB verification submitted for Admin review.','success');
    }catch(error){
      if(uploaded.length)try{await A.supabase.storage.from('ib-proofs').remove(uploaded);}catch{}
      A.toast(A.friendlyError(error,'Could not submit IB verification.'),'error');
    }finally{A.setLoading(button,false);}
  }
  async function auditEvent(action,entityType=null,entityId=null,status='success',details={}){try{await A.supabase.functions.invoke('audit-event',{body:{action,entity_type:entityType,entity_id:entityId,status,details}});}catch{}}

  function renderPayments() {
    const body = document.getElementById('paymentsBody');
    if (!body) return;
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
      return `<tr><td><b>${A.escapeHtml(p.invoice_no || 'Pending')}</b></td><td>${A.escapeHtml(course.title || 'Course')}</td><td>${A.formatMoney(p.amount, course.currency || 'PKR')}</td><td>${A.escapeHtml(isInfinity ? 'Local Bank Transfer' : (p.payment_method_name || p.method || '—'))}</td><td>${A.escapeHtml(p.transaction_reference || '—')}</td><td>${A.formatDateTime(p.created_at)}</td><td><span class="status-pill ${A.statusClass(p.status)}">${A.statusLabel(p.status)}</span></td><td>${A.escapeHtml(p.admin_note || p.decline_reason || '—')}</td><td>${action}</td></tr>`;
    }).join('');
  }

  function renderAnnouncements() {
    document.getElementById('announcementsList').innerHTML = state.announcements.length ? state.announcements.map(n => `<article class="announcement ${n.priority === 'important' ? 'important' : ''}"><h4>${A.escapeHtml(n.title)}</h4><p>${A.escapeHtml(n.message)}</p><small>${A.formatDateTime(n.published_at)}</small></article>`).join('') : empty('No announcements yet.', 'fa-bullhorn');
  }

  function renderProfile() {
    const form = document.getElementById('profileForm');
    ['full_name','email','whatsapp','country','experience'].forEach(key => { if (form.elements[key]) form.elements[key].value = state.profile[key] || ''; });
  }

  function renderEmailVerification() {
    const verified = Boolean(state.profile?.email_verified);
    const banner = document.getElementById('emailVerificationBanner');
    const card = document.getElementById('emailVerificationCard');
    const accountBadge = document.getElementById('dashboardAccountBadge');
    if (banner) banner.innerHTML = '';
    if (accountBadge) accountBadge.innerHTML = verified
      ? `<span class="account-check"><i class="fa-solid fa-check"></i></span><span><b>Account Verified</b><small>Email verification complete</small></span>`
      : `<span class="account-check pending"><i class="fa-solid fa-envelope"></i></span><span><b>Verify Email</b><small>Recommended for account security</small></span><button type="button" data-request-email-verification>Verify</button>`;
    if (card) card.innerHTML = verified
      ? `<span class="account-row-icon"><i class="fa-solid fa-circle-check"></i></span><div class="account-row-copy"><h3>Email Verified</h3><p>${A.escapeHtml(state.profile.email || '')}</p></div><div class="account-row-side"><span class="status-pill ok">Verified</span></div>`
      : `<span class="account-row-icon"><i class="fa-solid fa-envelope"></i></span><div class="account-row-copy"><h3>Email Verification</h3><p>Verify ${A.escapeHtml(state.profile.email || '')} to secure your account.</p></div><div class="account-row-side"><button type="button" class="app-btn gold" data-request-email-verification><i class="fa-solid fa-paper-plane"></i> Verify Email</button></div>`;
  }

  async function requestEmailVerification(button) {
    if (state.profile?.email_verified) return A.toast('Your email is already verified.', 'info');
    A.setLoading(button, true, 'Sending...');
    try {
      const { data, error } = await A.supabase.rpc('request_app_email_verification');
      if (error) throw error;
      await A.supabase.functions.invoke('process-email-queue', { body: { limit: 5 } }).catch(() => null);
      A.toast(data?.message || 'Verification email sent. Check your inbox.', 'success');
    } catch (error) {
      A.toast(A.friendlyError(error, 'Could not send verification email.'), 'error');
    } finally { A.setLoading(button, false); }
  }

  function renderSupport() { const link=document.getElementById('supportWhatsApp'); if(link) link.href=`https://wa.me/${A.cfg.SUPPORT_WHATSAPP}`; }

  function renderIbBrokerInstructions(){
    const form=document.getElementById('ibVerificationForm');
    const box=document.getElementById('ibBrokerInstructions');
    const wrap=document.getElementById('ibPartnerLinkWrap');
    const link=document.getElementById('ibSelectedPartnerLink');
    if(!form||!box)return;
    const broker=form.elements.broker?.value||'';
    const mode=form.elements.account_type?.value||'new';
    const meta=brokerAccessMeta[broker];
    wrap?.classList.toggle('hidden',!meta);
    if(link&&meta){link.href=meta.url;link.innerHTML=`<i class="fa-solid fa-arrow-up-right-from-square"></i> Open ${A.escapeHtml(broker)} Partner Link`;}
    if(!meta){box.innerHTML='<b>Choose a broker.</b>Select Exness, XM or DPrime to see the correct account / partner instructions.';return;}
    const heading=mode==='existing'?'Partner / IB Shift':'Create New Account';
    const guide=mode==='existing'?meta.existingGuide:meta.newGuide;
    box.innerHTML=`<b>${A.escapeHtml(broker)} — ${A.escapeHtml(heading)}</b>${A.escapeHtml(guide)}`;
  }

  async function copyIbPartnerLink(){
    const form=document.getElementById('ibVerificationForm');const meta=brokerAccessMeta[form?.elements.broker?.value||''];
    if(!meta)return A.toast('Choose a broker first.','warning');
    try{await navigator.clipboard.writeText(meta.url);A.toast('Partner link copied.','success');}catch{A.toast('Could not copy partner link.','error');}
  }


  function setAccessStep(step='home'){
    accessFlowState.step=step;
    document.querySelectorAll('[data-access-step]').forEach(node=>node.classList.toggle('access-hidden', node.dataset.accessStep!==step));
    document.querySelectorAll('[data-access-step-target]').forEach(btn=>btn.classList.toggle('is-active', btn.dataset.accessStepTarget===step && step!=='home'));
    renderAccessSelection();
  }

  function renderAccessSelection(){
    const current=document.getElementById('allAccessCurrentStatus');
    const p=state.premium||{};
    if(current){
      const has=Boolean(p.has_access);
      const title=has ? `Access Active${p.days_left!=null?` · ${p.days_left} day${Number(p.days_left)===1?'':'s'} left`:''}` : 'Access currently locked';
      current.innerHTML=`<b>${A.escapeHtml(title)}</b><br><small>${has?'Your current access remains active. You can still submit a new Paid Access or IB / Broker verification request below.':'Choose Paid Access or Free Access via IB / Broker below.'}</small>`;
    }
    document.querySelectorAll('[data-broker-select]').forEach(btn=>btn.classList.toggle('is-active', btn.dataset.brokerSelect===accessFlowState.broker));
    document.querySelectorAll('[data-access-account-mode]').forEach(btn=>btn.classList.toggle('is-active', btn.dataset.accessAccountMode===accessFlowState.mode));
    const details=document.getElementById('allAccessBrokerDetails');
    const link=document.getElementById('allAccessBrokerLink');
    const copy=document.getElementById('copyAllAccessBrokerLink');
    const guide=document.getElementById('allAccessModeGuide');
    const verify=document.getElementById('openIbVerification');
    const meta=brokerAccessMeta[accessFlowState.broker];
    if(details) details.classList.toggle('access-hidden', !(accessFlowState.step==='ib' && meta));
    if(link){
      link.href=meta?.url||'#';
      link.setAttribute('data-link-url', meta?.url||'');
      link.innerHTML=`<i class="fa-solid fa-arrow-up-right-from-square"></i> ${meta?`Open ${A.escapeHtml(accessFlowState.broker)} Link`:'Open Broker Link'}`;
    }
    if(copy) copy.disabled=!meta;
    if(guide){
      if(!meta) guide.innerHTML='Choose a broker and account option to see the next steps.';
      else if(accessFlowState.mode==='new') guide.innerHTML=`<b>${A.escapeHtml(accessFlowState.broker)} — Create New Account</b><br>${A.escapeHtml(meta.newGuide)}`;
      else if(accessFlowState.mode==='existing') guide.innerHTML=`<b>${A.escapeHtml(accessFlowState.broker)} — Change / Link Existing Account</b><br>${A.escapeHtml(meta.existingGuide)}`;
      else guide.innerHTML=`Choose whether you want to create a new ${A.escapeHtml(accessFlowState.broker)} account or link / change an existing one.`;
    }
    if(verify) verify.disabled=!meta || p.ib_enabled===false;
  }

  function openAllAccessModal(){
    try { if (typeof openPanel === 'function') openPanel('profile'); } catch {}
    return forceOpenPremiumAccessModal();
  }

  async function copySelectedBrokerLink(){
    const meta=brokerAccessMeta[accessFlowState.broker];
    if(!meta?.url) return A.toast('Choose a broker first.','warning');
    try{ await navigator.clipboard.writeText(meta.url); A.toast('Broker link copied.','success'); }
    catch(error){ A.toast('Could not copy the broker link.','error'); }
  }

  function prefillIbVerificationForm(){
    const form=document.getElementById('ibVerificationForm'); if(!form) return;
    if(form.elements.broker && accessFlowState.broker) form.elements.broker.value=accessFlowState.broker;
    if(form.elements.account_type) form.elements.account_type.value=accessFlowState.mode==='existing' ? 'Existing account / partner change' : accessFlowState.mode==='new' ? 'New partner account' : '';
    if(form.elements.note){
      const meta=brokerAccessMeta[accessFlowState.broker];
      const modeText=accessFlowState.mode==='existing' ? 'Existing account / partner change' : accessFlowState.mode==='new' ? 'New account from partner link' : '';
      const guide=meta ? (accessFlowState.mode==='existing' ? meta.existingGuide : accessFlowState.mode==='new' ? meta.newGuide : '') : '';
      form.elements.note.value=[accessFlowState.broker?`Broker: ${accessFlowState.broker}`:'', modeText, guide].filter(Boolean).join(' — ');
    }
  }


  function bindEvents() {
    document.addEventListener('panel:open', event => {
      const key=event.detail.key;
      if (['signals','charts','articles'].includes(key) && !state.premium?.has_access) { setTimeout(()=>{openPanel('profile');openAllAccessModal();},0); A.toast('Premium access is required for Signals, Charts and Articles.','warning'); return; }
      if (key === 'signals' && !state.riskAccepted) A.openModal('riskModal');
      if (key === 'courses') resetCourseView();
    });
    document.querySelectorAll('[data-signal-view]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();signalWorkspaceView=button.dataset.signalView==='history'?'history':'active';renderSignals();}));
    document.querySelectorAll('[data-history-market]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();historyMarketFilter=button.dataset.historyMarket||'all';renderSignals();}));
    document.querySelectorAll('[data-history-date]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();historyDateFilter=button.dataset.historyDate||'month';renderSignals();}));
    document.getElementById('ibBrokerSelect')?.addEventListener('change',renderIbBrokerInstructions);
    document.getElementById('ibAccountAction')?.addEventListener('change',renderIbBrokerInstructions);
    document.getElementById('ibCopyPartnerLink')?.addEventListener('click',copyIbPartnerLink);
    ['chartSearch','chartTimeframeFilter'].forEach(id => document.getElementById(id)?.addEventListener('input', renderCharts));
    document.getElementById('articleSearch')?.addEventListener('input', renderArticles);
    document.getElementById('closeSessions').addEventListener('click', resetCourseView);

    document.body.addEventListener('click', async event => {
      const signalStatusButton = event.target.closest('[data-signal-status]');
      if (signalStatusButton) { signalStatusView = signalStatusButton.dataset.signalStatus || 'all'; renderSignals(); }
      const signalWorkspaceButton = event.target.closest('[data-signal-view]');
      if (signalWorkspaceButton) return;
      const courseFilterButton=event.target.closest('[data-course-filter]');
      if(courseFilterButton){state.courseFilter=courseFilterButton.dataset.courseFilter||'all';renderCourses();}
      const historyMarketButton = event.target.closest('[data-history-market]'); if(historyMarketButton)return;
      const historyDateButton = event.target.closest('[data-history-date]'); if(historyDateButton)return;
      const courseOpen = event.target.closest('[data-open-course]');
      if (courseOpen) { openPanel('courses'); showCourseSessions(courseOpen.dataset.openCourse); }
      const buy = event.target.closest('[data-buy-course]');
      if (buy) await openPaymentModal(buy.dataset.buyCourse, buy);
      const paymentChoice = event.target.closest('[data-payment-choice]');
      if (paymentChoice) await choosePaymentMethod(paymentChoice.dataset.paymentChoice);
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
      const accessStepButton=event.target.closest('[data-access-step-target]'); if(accessStepButton){setAccessStep(accessStepButton.dataset.accessStepTarget||'home'); return;}
      const brokerButton=event.target.closest('[data-broker-select]'); if(brokerButton){accessFlowState.broker=brokerButton.dataset.brokerSelect||''; if(!accessFlowState.mode) accessFlowState.mode='new'; renderAccessSelection(); return;}
      const accessModeButton=event.target.closest('[data-access-account-mode]'); if(accessModeButton){accessFlowState.mode=accessModeButton.dataset.accessAccountMode||''; renderAccessSelection(); return;}
      const copyBrokerLink=event.target.closest('#copyAllAccessBrokerLink'); if(copyBrokerLink){await copySelectedBrokerLink(); return;}
      const premiumLocal=event.target.closest('#premiumPayLocal'); if(premiumLocal) await startPremiumLocalBank(premiumLocal);
      const premiumUsdt=event.target.closest('#premiumPayUsdt'); if(premiumUsdt){const box=document.getElementById('premiumUsdtSummary');if(box)box.innerHTML=`<b>${Number(state.premium?.price_usdt||0).toLocaleString()} USDT</b> · ${Number(state.premium?.monthly_days||30)} days Premium Market Access`;A.openModal('premiumUsdtModal');}
      const ibOpen=event.target.closest('#openIbVerification'); if(ibOpen){prefillIbVerificationForm();A.openModal('ibVerificationModal');}
      const verifyEmail = event.target.closest('[data-request-email-verification]');
      if (verifyEmail) await requestEmailVerification(verifyEmail);
      const refreshDashboard = event.target.closest('[data-refresh-dashboard]');
      if (refreshDashboard) {
        event.preventDefault();
        event.stopPropagation();
        A.setLoading(refreshDashboard, true, 'Refreshing...');
        try { await loadAll(); renderAll(); A.toast('Dashboard refreshed.', 'success'); }
        catch (error) { A.toast(A.friendlyError(error, 'Could not refresh the dashboard.'), 'error'); }
        finally { A.setLoading(refreshDashboard, false); }
      }
    });

    updateAlertButton();
    document.getElementById('paymentForm').addEventListener('submit', submitPayment);
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('premiumUsdtForm')?.addEventListener('submit',submitPremiumUsdt);
    document.getElementById('riskForm').addEventListener('submit', acceptRisk);
    document.getElementById('globalSearch').addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const q = event.currentTarget.value.trim().toLowerCase();
      if (!q) return;
      if (state.signals.some(x => `${x.symbol} ${x.notes}`.toLowerCase().includes(q))) { const found=state.signals.find(x => `${x.symbol} ${x.notes}`.toLowerCase().includes(q)); signalWorkspaceView=found&&signalIsFinal(found)?'history':'active'; openPanel('signals'); renderSignals(); }
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
  function showSignalNotification(update){if(!update?.notify_users)return;A.toast(`${update.notification_title||'Signal Update'} — ${update.notification_message||''}`,'success');if('Notification' in window&&Notification.permission==='granted'&&document.visibilityState!=='visible'){new Notification(update.notification_title||'24K Signal Update',{body:update.notification_message||'',icon:'assets/logo.png?v=9.68'});}}


  let paymentChoiceContext = { courseId: null, triggerButton: null };

  async function openPaymentModal(courseId, triggerButton=null) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;
    const pending = latestPayment(courseId);
    if (pending && ['received','under_review'].includes(pending.status)) return A.toast('Your payment is already being processed.', 'warning');

    paymentChoiceContext = { courseId, triggerButton };
    const payable = course.discount_price != null ? Number(course.discount_price) : Number(course.price);
    const currency = String(course.currency || '').toUpperCase();
    const localBankEnabled = state.paymentMethods.some(m => /^(local bank transfer|infinity(?: money solutions)?)$/i.test(String(m.name||'').trim()));
    const usdtEnabled = state.paymentMethods.some(m => /usdt|trc\s*20|trc20/i.test(`${m.name||''} ${m.instructions||''}`));
    const localChoice=document.querySelector('[data-payment-choice="local-bank"]'); if(localChoice){localChoice.disabled=!localBankEnabled;localChoice.classList.toggle('method-disabled',!localBankEnabled);localChoice.style.opacity=localBankEnabled?'':'0.45';}
    const usdtChoice=document.querySelector('[data-payment-choice="usdt"]'); if(usdtChoice){usdtChoice.disabled=!usdtEnabled;usdtChoice.classList.toggle('method-disabled',!usdtEnabled);usdtChoice.style.opacity=usdtEnabled?'':'0.45';}
    const summary = document.getElementById('paymentChoiceCourseSummary');
    if (summary) summary.innerHTML = `<b>${A.escapeHtml(course.title)}</b><br>Amount: ${A.formatMoney(payable, currency || 'PKR')}<br><small>${localBankEnabled||usdtEnabled?'Choose an available payment method below.':'Payment methods are temporarily disabled by Admin.'}</small>`;
    if(!localBankEnabled&&!usdtEnabled) A.toast('Payment methods are temporarily unavailable. Please contact Admin.','warning');
    A.openModal('paymentMethodChoiceModal');
  }

  async function choosePaymentMethod(choice) {
    const { courseId, triggerButton } = paymentChoiceContext;
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;
    const currency = String(course.currency || '').toUpperCase();

    if (choice === 'local-bank') {
      const enabled=state.paymentMethods.some(m=>/^(local bank transfer|infinity(?: money solutions)?)$/i.test(String(m.name||'').trim()));
      if(!enabled) return A.toast('Local Bank Transfer is currently disabled by Admin.','warning');
      if (currency !== 'PKR') return A.toast('Local Bank Transfer is available for courses priced in PKR. This course is currently priced in USDT.', 'warning');
      A.closeModal('paymentMethodChoiceModal');
      return startInfinityPayment(courseId, triggerButton);
    }

    if (choice === 'usdt') {
      const enabled=state.paymentMethods.some(m=>/usdt|trc\s*20|trc20/i.test(`${m.name||''} ${m.instructions||''}`));
      if(!enabled) return A.toast('USDT TRC20 is currently disabled by Admin.','warning');
      if (currency !== 'USDT') return A.toast('USDT TRC20 is available for courses priced in USDT. This course is currently priced in PKR.', 'warning');
      A.closeModal('paymentMethodChoiceModal');
      return openUsdtPaymentModal(courseId);
    }
  }

  async function openUsdtPaymentModal(courseId) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;
    const pending = latestPayment(courseId);
    if (pending && ['received','under_review'].includes(pending.status)) return A.toast('Your payment is already being processed.', 'warning');

    const usdtMethods = state.paymentMethods.filter(m => /usdt|trc\s*20|trc20/i.test(`${m.name||''} ${m.instructions||''}`));
    if (!usdtMethods.length) return A.toast('USDT TRC20 payment method is not configured yet. Please contact Admin.', 'warning');
    const form = document.getElementById('paymentForm');
    form.reset(); form.elements.course_id.value = course.id; form.dataset.supersedesPaymentId = pending?.status==='resubmission_required'?pending.id:''; const payable=course.discount_price!=null?Number(course.discount_price):Number(course.price); form.elements.amount.value = payable;
    document.getElementById('paymentCourseSummary').innerHTML = `<b>${A.escapeHtml(course.title)}</b><br>Instructor: Malik Zameer · Amount: USDT ${Number(payable).toLocaleString('en-US',{maximumFractionDigits:2})}<br><small>Pay using TRC20 network and submit the TXID + receipt for Admin approval.</small>`;
    document.getElementById('paymentMethodSelect').innerHTML = usdtMethods.map(m => `<option value="${m.id}">${A.escapeHtml(m.name)}</option>`).join('');
    renderPaymentMethodInfo();
    document.getElementById('paymentMethodSelect').onchange = renderPaymentMethodInfo;
    A.openModal('paymentModal');
  }

  async function flushMyEmailQueue() {
    try {
      await A.supabase.functions.invoke('process-email-queue', { body: { limit: 10 } });
    } catch (error) {
      console.warn('Email delivery will retry later:', error);
    }
  }

  async function startInfinityPayment(courseId, triggerButton=null) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;
    const button = triggerButton || document.querySelector(`[data-buy-course="${courseId}"]`);
    A.setLoading(button, true, 'Opening Local Bank Transfer...');
    try {
      const { data, error } = await A.supabase.functions.invoke('create-infinity-payment', { body: { course_id: courseId } });
      if (error) throw error;
      if (!data?.redirect_url) throw new Error(data?.error || 'Payment provider did not return a secure payment page.');
      if (!/^https?:\/\//i.test(data.redirect_url)) throw new Error('Invalid payment redirect URL.');
      await auditEvent('course_payment_started','course',courseId,'success',{method:'local_bank'});
      window.location.assign(data.redirect_url);
    } catch (error) {
      let paymentError = error;
      try {
        const response = error?.context;
        if (response && typeof response.clone === 'function') {
          const payload = await response.clone().json().catch(()=>null);
          if (payload?.error) {
            const extra = [payload.code, payload.details, payload.hint].filter(Boolean).join(' · ');
            paymentError = new Error(`${payload.error}${extra ? ` (${extra})` : ''}`);
          }
        }
      } catch { /* preserve original function error */ }
      await loadAll().catch(()=>{});
      renderAll();
      A.toast(A.friendlyError(paymentError, 'Could not open Local Bank Transfer. Please try again.'), 'error');
    } finally {
      A.setLoading(button, false);
    }
  }

  function handlePaymentReturn() {
    const premiumParams=new URLSearchParams(location.search); if(premiumParams.get('premium_return')==='1'){openPanel('profile');setTimeout(()=>openAllAccessModal(),80);A.toast('Premium payment return received. Status will update after provider confirmation.','info');}
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_return') !== '1') return;
    openPanel('courses');
    const payment = state.payments.find(p => Number(p.provider_request_id) === Number(params.get('request_id')));
    if (payment?.status === 'approved') A.toast('Payment verified successfully. Your course access is now active.', 'success');
    else if (payment?.status === 'declined') A.toast(payment.provider_rejection_reason || payment.admin_note || 'Payment was rejected.', 'error');
    else A.toast('Payment verification is being finalized. This page will update automatically.', 'warning');
    try {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('payment_return');
      clean.searchParams.delete('request_id');
      history.replaceState({}, '', `${clean.pathname}${clean.search}#courses`);
    } catch { /* cosmetic URL cleanup only */ }
  }

  function renderPaymentMethodInfo() {
    const method = state.paymentMethods.find(m => m.id === document.getElementById('paymentMethodSelect').value);
    document.getElementById('paymentMethodsBox').innerHTML = method ? `<div class="notice warn"><b>${A.escapeHtml(method.name)}</b><br>Account title: ${A.escapeHtml(method.account_title || '—')}<br>USDT TRC20 wallet: ${A.escapeHtml(method.account_number || '—')}<br>${A.escapeHtml(method.instructions || '')}</div>` : '';
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
        await auditEvent('course_payment_submitted','payment',paymentId,'success',{course_id:course.id,method:method?.name||'USDT TRC20'});
        await flushMyEmailQueue();
        await loadAll();
      renderAll(); A.closeModal('paymentModal'); form.reset();
      A.toast('Receipt received. Admin approval is required before course access unlocks.', 'success');
      openPanel('courses');
    } catch (error) { A.toast(A.friendlyError(error, 'Payment submission failed.'), 'error'); }
    finally { A.setLoading(button, false); }
  }

  async function enrollFree(courseId, button) {
    A.setLoading(button, true, 'Enrolling...');
    try {
      const { error } = await A.supabase.rpc('enroll_free_course', { p_course_id: courseId });
        if (error) throw error;
        await auditEvent('course_enrolled_free','course',courseId,'success',{});
        await flushMyEmailQueue();
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
      await auditEvent('profile_updated','profile',state.user.id,'success',{fields:['full_name','whatsapp','country','experience']});
      Object.assign(state.profile, changes);
      const dashName=document.getElementById('dashboardWelcomeName'); if(dashName) dashName.textContent=`${state.profile.full_name || 'Member'} 👋`;
      window.dispatchEvent(new CustomEvent('24k:student-base-updated',{detail:state}));
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


  function initDashboardClock() {
    const update = () => {
      const now = new Date();
      const time = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
      const shortTime = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',hour:'numeric',minute:'2-digit',hour12:true}).format(now);
      const date = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(now);
      const topClock=document.getElementById('topbarClock'); if(topClock) topClock.textContent=time;
      const dashClock=document.getElementById('dashboardClock'); if(dashClock) dashClock.textContent=`${shortTime} PKT`;
      const topDate=document.getElementById('topbarDate'); if(topDate) topDate.textContent=date;
      const dashDate=document.getElementById('dashboardToday'); if(dashDate) dashDate.textContent=date;
      const utc=now.getUTCHours()+now.getUTCMinutes()/60;
      const active=(start,end)=>start<=end?(utc>=start&&utc<end):(utc>=start||utc<end);
      const sessions={sydney:active(22,7),tokyo:active(0,9),london:active(7,16),newyork:active(12,21)};
      document.querySelectorAll('[data-session]').forEach(el=>el.classList.toggle('is-open',Boolean(sessions[el.dataset.session])));
    };
    update();
    if (!window.__24K_DASH_CLOCK__) window.__24K_DASH_CLOCK__=setInterval(update,1000);
  }

  async function refreshSignalState(){
    const [signals,updates]=await Promise.all([
      A.supabase.from('signals').select('*').eq('is_published',true).order('published_at',{ascending:false}),
      A.supabase.from('signal_updates').select('*').order('created_at',{ascending:false})
    ]);
    if(signals.error)throw signals.error;
    if(updates.error)throw updates.error;
    state.signals=signals.data||[];state.signalUpdates=updates.data||[];
    renderSignals();renderKpis();renderDashboard();
  }

  function subscribeRealtime() {
    let generalTimer,signalTimer,premiumTimer;
    const refreshGeneral=()=>{clearTimeout(generalTimer);generalTimer=setTimeout(async()=>{try{await loadAll();renderAll();}catch(error){console.error('Realtime refresh failed',error);}},300);};
    const refreshSignals=()=>{clearTimeout(signalTimer);signalTimer=setTimeout(async()=>{try{await refreshSignalState();}catch(error){console.error('Signal realtime refresh failed',error);}},120);};
    const refreshPremium=()=>{clearTimeout(premiumTimer);premiumTimer=setTimeout(async()=>{try{await loadPremiumState();renderPremium();}catch(error){console.error('Premium realtime refresh failed',error);}},180);};
    const channel=A.supabase.channel(`student-live-v969-${state.user.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'signals'},refreshSignals)
      .on('postgres_changes',{event:'*',schema:'public',table:'signal_updates'},payload=>{if(payload.eventType==='INSERT')showSignalNotification(payload.new);refreshSignals();})
      .on('postgres_changes',{event:'*',schema:'public',table:'charts'},refreshGeneral)
      .on('postgres_changes',{event:'*',schema:'public',table:'articles'},refreshGeneral)
      .on('postgres_changes',{event:'*',schema:'public',table:'announcements'},refreshGeneral)
      .on('postgres_changes',{event:'*',schema:'public',table:'payments',filter:`student_id=eq.${state.user.id}`},refreshGeneral)
      .on('postgres_changes',{event:'*',schema:'public',table:'premium_payments',filter:`student_id=eq.${state.user.id}`},refreshPremium)
      .on('postgres_changes',{event:'*',schema:'public',table:'ib_verifications',filter:`student_id=eq.${state.user.id}`},refreshPremium)
      .on('postgres_changes',{event:'*',schema:'public',table:'payment_methods'},refreshGeneral)
      .on('postgres_changes',{event:'*',schema:'public',table:'course_sessions'},refreshGeneral)
      .on('postgres_changes',{event:'*',schema:'public',table:'enrollments',filter:`student_id=eq.${state.user.id}`},refreshGeneral)
      .subscribe(status=>{
        if(status==='SUBSCRIBED'){
          if(window.__24K_SIGNAL_FALLBACK_POLL__){clearInterval(window.__24K_SIGNAL_FALLBACK_POLL__);window.__24K_SIGNAL_FALLBACK_POLL__=null;}
          return;
        }
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
          console.warn('Student realtime channel status:',status);
          if(!window.__24K_SIGNAL_FALLBACK_POLL__) window.__24K_SIGNAL_FALLBACK_POLL__=setInterval(()=>refreshSignals(),15000);
        }
      });
    window.__24K_STUDENT_REALTIME_CHANNEL__=channel;
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

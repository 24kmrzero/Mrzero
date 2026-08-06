(async function () {
  'use strict';
  const A = window.App;
  if (!A?.supabase) return;

  const esc = A.escapeHtml;
  const attr = value => esc(value).replace(/"/g, '&quot;');
  const label = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  for (let attempt = 0; attempt < 100 && document.getElementById('studentApp')?.classList.contains('hidden'); attempt += 1) {
    await sleep(100);
  }
  if (!document.getElementById('studentApp')) return;

  const state = {
    user: null, profile: null, notifications: [], reads: [], courses: [], modules: [], lessons: [],
    progress: [], sessions: [], sessionLinks: {}, resources: [], enrollments: []
  };
  let platformAllowed = true;
  let refreshTimer = null;

  installUI();
  bindUI();
  window.addEventListener('24k:student-base-updated', event => {
    syncBaseState(event.detail || window.StudentBase?.state);
    renderAccess();
    renderNotifications();
    renderCourseProgressForSelected();
  });
  await refresh();
  subscribeRealtime();
  openInitialPanel();

  function installUI() {
    const nav = document.querySelector('.app-nav');
    const accountLabel = [...nav.querySelectorAll('.app-nav-label')].find(item => item.textContent.trim() === 'ACCOUNT');
    if (accountLabel && !nav.querySelector('[data-panel="notifications"]')) {
      const notifications = document.createElement('a');
      notifications.href = '#';
      notifications.dataset.panel = 'notifications';
      notifications.innerHTML = '<i class="fa-solid fa-bell"></i> Notifications <span class="nav-count" id="notificationCountV8">0</span>';
      const access = document.createElement('a');
      access.href = '#';
      access.dataset.panel = 'access';
      access.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Access Status';
      accountLabel.after(access);
      accountLabel.after(notifications);
    }

    const content = document.querySelector('.app-content');
    const dashboardAlert = document.getElementById('dashboardAlert');
    if (dashboardAlert && !document.getElementById('accessBannerV8')) {
      dashboardAlert.insertAdjacentHTML('beforebegin', '<div id="accessBannerV8"></div>');
    }

    if (!document.getElementById('p-notifications')) {
      content.insertAdjacentHTML('beforeend', `
        <section class="panel" id="p-notifications">
          <div class="panel-heading"><div><h2>Notifications</h2><p>Signals, payments, courses, content and live-class updates from Admin.</p></div><button class="app-btn outline" id="markAllNotifications"><i class="fa-solid fa-check-double"></i> Mark All Read</button></div>
          <div id="notificationsListV8"></div>
        </section>
        <section class="panel" id="p-access">
          <div class="panel-heading"><div><h2>Access Status</h2><p>Your platform access, verification and expiry information.</p></div></div>
          <div class="app-grid cols-2"><div class="app-card" id="accessStatusCard"></div><div class="app-card"><h3>Protected Content</h3><p class="muted">Signals, charts, articles, private resources and Google Meet links require active platform access. Course catalogue, payments, profile and support remain available while access is locked.</p><a class="app-btn green" id="accessSupportLink" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Contact Support</a></div></div>
        </section>`);
    }

    const sessionsArea = document.getElementById('sessionsArea');
    if (sessionsArea && !document.getElementById('courseProgressAreaV8')) {
      sessionsArea.insertAdjacentHTML('beforeend', `
        <div id="courseProgressAreaV8" class="app-card hidden course-progress-card" style="margin-top:20px">
          <div class="app-card-head"><div><h3>Course Progress</h3><p>Lessons unlock in the exact sequence published by Admin.</p></div><strong id="courseProgressPercent">0%</strong></div>
          <div class="signal-progress"><span id="courseProgressBar" style="width:0%"></span></div>
          <div id="courseModulesV8" style="margin-top:18px"></div>
        </div>`);
    }

    if (!document.getElementById('lessonTextModal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="app-modal" id="lessonTextModal" aria-hidden="true"><div class="app-modal-card wide"><div class="app-modal-head"><div><h3 id="lessonTextTitle">Lesson</h3><small id="lessonTextMeta" class="muted"></small></div><button class="modal-close" data-close-modal="lessonTextModal"><i class="fa-solid fa-xmark"></i></button></div><div class="app-modal-body article-content" id="lessonTextContent"></div></div></div>`);
    }

    const topBell = document.querySelector('.app-topbar .app-notify');
    if (topBell) {
      topBell.dataset.goto = 'notifications';
      topBell.setAttribute('aria-label', 'Notifications');
    }
  }

  function bindUI() {
    document.getElementById('markAllNotifications')?.addEventListener('click', markAllRead);

    document.querySelector('.app-nav')?.addEventListener('click', event => {
      const link = event.target.closest('[data-panel]');
      if (!link || platformAllowed || !['signals', 'charts', 'articles', 'announcements'].includes(link.dataset.panel)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openPanel('access');
      A.toast('Protected content requires active access.', 'warning');
    }, true);

    document.body.addEventListener('click', async event => {
      const notification = event.target.closest('[data-notification-id]');
      if (notification) {
        const id = notification.dataset.notificationId;
        if (!isRead(state.notifications.find(item => item.id === id))) await markRead(id, false);
        const url = notification.dataset.notificationUrl;
        if (url) {
          const safe = safeActionUrl(url);
          const hash = safe.includes('#') ? safe.split('#').pop() : '';
          if (hash && document.getElementById(`p-${hash}`)) openPanel(hash);
          else location.href = safe;
        }
      }

      const lessonToggle = event.target.closest('[data-toggle-lesson]');
      if (lessonToggle) await toggleLesson(lessonToggle.dataset.toggleLesson, lessonToggle.dataset.completed === 'true', lessonToggle);

      const courseOpen = event.target.closest('[data-open-course]');
      if (courseOpen) setTimeout(() => renderCourseProgress(courseOpen.dataset.openCourse), 100);

      const textLesson = event.target.closest('[data-show-lesson-text]');
      if (textLesson) showTextLesson(textLesson.dataset.showLessonText);

      const liveLesson = event.target.closest('[data-open-live-lesson]');
      if (liveLesson) openLiveLesson(liveLesson.dataset.openLiveLesson);

      const resourceLesson = event.target.closest('[data-open-resource-lesson]');
      if (resourceLesson) await openResourceLesson(resourceLesson.dataset.openResourceLesson, resourceLesson);
    });

    const pendingCourse = sessionStorage.getItem('24k_open_course_id');
    if (pendingCourse) {
      sessionStorage.removeItem('24k_open_course_id');
      setTimeout(() => document.querySelector(`[data-open-course="${CSS.escape(pendingCourse)}"]`)?.click(), 650);
    }
  }

  function openPanel(key) {
    document.querySelectorAll('.app-nav [data-panel]').forEach(item => item.classList.toggle('on', item.dataset.panel === key));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('on', panel.id === `p-${key}`));
    document.getElementById('side')?.classList.remove('open');
    history.replaceState(null, '', `#${key}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openInitialPanel() {
    const key = location.hash.replace('#', '');
    if (['notifications', 'access'].includes(key)) openPanel(key);
  }

  function syncBaseState(base = window.StudentBase?.state) {
    if (!base) return;
    state.user = base.user || state.user;
    state.profile = base.profile || state.profile;
    state.courses = base.courses || [];
    state.sessions = base.sessions || [];
    state.sessionLinks = base.sessionLinks || {};
    state.resources = base.resources || [];
    state.enrollments = base.enrollments || [];
  }

  async function refresh() {
    syncBaseState();
    if (!state.user) state.user = await A.getCurrentUser();
    if (!state.user) return;

    try {
      state.profile = await A.getProfile(state.user.id);
      if (window.StudentBase?.state) window.StudentBase.state.profile = state.profile;
    } catch (error) {
      A.toast(A.friendlyError(error, 'Could not refresh account access.'), 'error');
    }

    const responses = await Promise.all([
      A.supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(150),
      A.supabase.from('notification_reads').select('*').eq('user_id', state.user.id),
      A.supabase.from('course_modules').select('*').eq('is_published', true).order('module_number'),
      A.supabase.from('course_lessons').select('*').eq('is_published', true).order('lesson_number'),
      A.supabase.from('course_progress').select('*').eq('student_id', state.user.id)
    ]);
    const error = responses.find(item => item.error)?.error;
    if (error) {
      A.toast(A.friendlyError(error, 'Some student features could not be loaded.'), 'error');
      return;
    }

    [state.notifications, state.reads, state.modules, state.lessons, state.progress] = responses.map(item => item.data || []);
    platformAllowed = ['active', 'grace'].includes(A.effectiveAccessStatus(state.profile)) || state.profile?.role === 'admin';
    renderAccess();
    renderNotifications();
    renderCourseProgressForSelected();
  }

  function renderAccess() {
    const profile = state.profile;
    if (!profile) return;
    const status = A.effectiveAccessStatus(profile);
    platformAllowed = ['active', 'grace'].includes(status) || profile.role === 'admin';
    const expiry = profile.lifetime_access ? 'Lifetime' : profile.access_expires_at ? A.formatDateTime(profile.access_expires_at) : 'No expiry set';
    const supportLink = document.getElementById('accessSupportLink');
    if (supportLink) supportLink.href = `https://wa.me/${A.cfg.SUPPORT_WHATSAPP}`;
    const statusCard = document.getElementById('accessStatusCard');
    if (statusCard) statusCard.innerHTML = `
      <div class="access-card-head"><i class="fa-solid ${platformAllowed ? 'fa-shield-halved' : 'fa-lock'}"></i><div><small>Current Access</small><h3>${profile.lifetime_access ? 'Lifetime Access' : A.statusLabel(status)}</h3></div></div>
      <div class="access-details"><div><small>Email Verification</small><b>${profile.email_verified ? 'Verified' : 'Unverified'}</b></div><div><small>Access Expiry</small><b>${expiry}</b></div><div><small>Grace Expiry</small><b>${A.formatDateTime(profile.grace_expires_at)}</b></div><div><small>Access PIN</small><b>${esc(profile.access_pin || 'Not assigned')}</b></div><div><small>Last Seen</small><b>${A.formatDateTime(profile.last_seen_at)}</b></div></div>`;
    const banner = document.getElementById('accessBannerV8');
    if (banner) banner.innerHTML = platformAllowed
      ? `<div class="notice ${status === 'grace' ? 'warn' : 'ok'}"><i class="fa-solid fa-shield-halved"></i> Platform access: <b>${profile.lifetime_access ? 'Lifetime' : A.statusLabel(status)}</b>${profile.access_expires_at ? ` · Expires ${A.formatDateTime(profile.access_expires_at)}` : ''}</div>`
      : `<div class="notice bad"><i class="fa-solid fa-lock"></i> Protected content is locked because your access is <b>${A.statusLabel(status)}</b>. Payments, Courses, Profile and Support remain available.</div>`;
    ['signals', 'charts', 'articles', 'announcements'].forEach(key => document.querySelector(`[data-panel="${key}"]`)?.classList.toggle('access-disabled', !platformAllowed));
  }

  function isRead(notification) {
    if (!notification) return true;
    if (notification.user_id === state.user?.id) return Boolean(notification.is_read);
    return state.reads.some(read => read.notification_id === notification.id);
  }

  function renderNotifications() {
    const list = document.getElementById('notificationsListV8');
    if (!list) return;
    const unread = state.notifications.filter(notification => !isRead(notification)).length;
    const navCount = document.getElementById('notificationCountV8');
    const topCount = document.getElementById('topNoticeCount');
    if (navCount) navCount.textContent = unread > 99 ? '99+' : unread;
    if (topCount) topCount.textContent = unread > 99 ? '99+' : unread;
    list.innerHTML = state.notifications.length ? state.notifications.map(notification => `
      <article class="notification-item ${isRead(notification) ? '' : 'unread'}" data-notification-id="${notification.id}" data-notification-url="${attr(notification.action_url || '')}">
        <div class="notification-icon"><i class="fa-solid ${notificationIcon(notification.type)}"></i></div>
        <div class="notification-copy"><div><b>${esc(notification.title)}</b>${isRead(notification) ? '' : '<span class="unread-dot"></span>'}</div><p>${esc(notification.message)}</p><small>${A.formatDateTime(notification.created_at)}</small></div>
        ${notification.action_url ? '<i class="fa-solid fa-chevron-right notification-arrow"></i>' : ''}
      </article>`).join('') : '<div class="empty-state"><i class="fa-solid fa-bell-slash"></i>No notifications yet.</div>';
  }

  async function markRead(id, showToast = true) {
    const { error } = await A.supabase.rpc('mark_notification_read', { p_notification_id: id });
    if (error) {
      if (showToast) A.toast(A.friendlyError(error, 'Could not mark notification as read.'), 'error');
      return false;
    }
    const notification = state.notifications.find(item => item.id === id);
    if (notification?.user_id === state.user.id) notification.is_read = true;
    else if (!state.reads.some(read => read.notification_id === id)) state.reads.push({ notification_id: id, user_id: state.user.id, read_at: new Date().toISOString() });
    renderNotifications();
    return true;
  }

  async function markAllRead(event) {
    const button = event?.currentTarget;
    A.setLoading(button, true, 'Marking...');
    try {
      const { error } = await A.supabase.rpc('mark_all_notifications_read');
      if (error) throw error;
      await refresh();
      A.toast('All notifications marked as read.', 'success');
    } catch (error) {
      A.toast(A.friendlyError(error, 'Could not update notifications.'), 'error');
    } finally {
      A.setLoading(button, false);
    }
  }

  function activeEnrollment(courseId) {
    return state.enrollments.some(enrollment => enrollment.course_id === courseId && enrollment.status === 'active' && (!enrollment.access_expires_at || new Date(enrollment.access_expires_at) > new Date()));
  }

  function renderCourseProgressForSelected() {
    const courseId = document.getElementById('courseProgressAreaV8')?.dataset.courseId;
    if (courseId) renderCourseProgress(courseId);
  }

  function renderCourseProgress(courseId) {
    const area = document.getElementById('courseProgressAreaV8');
    if (!area) return;
    area.dataset.courseId = courseId;
    const modules = state.modules.filter(module => module.course_id === courseId).sort((a, b) => a.module_number - b.module_number);
    const orderedLessons = modules.flatMap(module => state.lessons.filter(lesson => lesson.module_id === module.id).sort((a, b) => a.lesson_number - b.lesson_number));
    const completed = new Set(state.progress.filter(row => row.course_id === courseId && row.completed).map(row => row.lesson_id));
    if (!modules.length) {
      area.classList.add('hidden');
      return;
    }
    area.classList.remove('hidden');
    const completeCount = orderedLessons.filter(lesson => completed.has(lesson.id)).length;
    const percent = orderedLessons.length ? Math.round((completeCount / orderedLessons.length) * 100) : 0;
    const firstIncomplete = orderedLessons.findIndex(lesson => !completed.has(lesson.id));
    document.getElementById('courseProgressPercent').textContent = `${percent}%`;
    document.getElementById('courseProgressBar').style.width = `${percent}%`;

    document.getElementById('courseModulesV8').innerHTML = modules.map(module => `
      <div class="module-block student-module">
        <div class="module-head"><div><b>Module ${module.module_number}: ${esc(module.title)}</b><small>${esc(module.description || '')}</small></div></div>
        ${state.lessons.filter(lesson => lesson.module_id === module.id).sort((a, b) => a.lesson_number - b.lesson_number).map(lesson => {
          const index = orderedLessons.findIndex(item => item.id === lesson.id);
          const completedLesson = completed.has(lesson.id);
          const available = completedLesson || firstIncomplete === -1 || index <= firstIncomplete;
          return lessonRow(lesson, completedLesson, available, activeEnrollment(courseId));
        }).join('') || '<div class="empty-state">No lessons published.</div>'}
      </div>`).join('');
  }

  function lessonRow(lesson, completed, available, courseAccess) {
    let action = '';
    if (available && courseAccess && lesson.lesson_type === 'text' && lesson.text_content) action = `<button class="app-btn small outline" data-show-lesson-text="${lesson.id}"><i class="fa-solid fa-book-open"></i> Read</button>`;
    else if (available && courseAccess && lesson.lesson_type === 'live_class' && lesson.course_session_id) action = `<button class="app-btn small outline" data-open-live-lesson="${lesson.id}"><i class="fa-solid fa-video"></i> Class</button>`;
    else if (available && courseAccess && lesson.lesson_type === 'resource' && lesson.course_resource_id) action = `<button class="app-btn small outline" data-open-resource-lesson="${lesson.id}"><i class="fa-solid fa-download"></i> Resource</button>`;
    const completeButton = available && courseAccess
      ? `<button class="app-btn small ${completed ? 'outline' : 'gold'}" data-toggle-lesson="${lesson.id}" data-completed="${completed}"><i class="fa-solid ${completed ? 'fa-rotate-left' : 'fa-check'}"></i> ${completed ? 'Undo' : 'Complete'}</button>`
      : '<button class="app-btn small outline" disabled><i class="fa-solid fa-lock"></i> Locked</button>';
    return `<div class="lesson-row ${completed ? 'completed' : ''} ${available ? '' : 'locked'}"><div class="lesson-number">${lesson.lesson_number}</div><div><b>${esc(lesson.title)}</b><small>${label(lesson.lesson_type)} · ${esc(lesson.description || '')}</small></div>${action}${completeButton}</div>`;
  }

  async function toggleLesson(id, completed, button) {
    A.setLoading(button, true, completed ? 'Undoing...' : 'Saving...');
    try {
      const { error } = await A.supabase.rpc('set_lesson_progress', { p_lesson_id: id, p_completed: !completed });
      if (error) throw error;
      await refresh();
      const lesson = state.lessons.find(item => item.id === id);
      if (lesson) renderCourseProgress(lesson.course_id);
      A.toast(!completed ? 'Lesson marked complete.' : 'Lesson completion removed.', 'success');
    } catch (error) {
      A.toast(A.friendlyError(error, 'Could not update lesson progress.'), 'error');
    } finally {
      A.setLoading(button, false);
    }
  }

  function showTextLesson(id) {
    const lesson = state.lessons.find(item => item.id === id);
    if (!lesson) return;
    document.getElementById('lessonTextTitle').textContent = lesson.title;
    document.getElementById('lessonTextMeta').textContent = `Lesson ${lesson.lesson_number} · ${label(lesson.lesson_type)}`;
    document.getElementById('lessonTextContent').innerHTML = esc(lesson.text_content || '').replace(/\n/g, '<br>');
    A.openModal('lessonTextModal');
  }

  function openLiveLesson(lessonId) {
    const lesson = state.lessons.find(item => item.id === lessonId);
    const session = state.sessions.find(item => item.id === lesson?.course_session_id);
    if (!lesson || !session) return A.toast('Live-class information is not available yet.', 'warning');
    if (!platformAllowed || !activeEnrollment(lesson.course_id)) return A.toast('An active approved enrollment is required for this class.', 'warning');
    const link = state.sessionLinks[session.id];
    if (link) window.open(link, '_blank', 'noopener');
    else A.toast(`${session.title} is scheduled for ${A.formatDateTime(session.starts_at)}. The Meet link is locked or has not been added yet.`, 'warning');
  }

  async function openResourceLesson(lessonId, button) {
    const lesson = state.lessons.find(item => item.id === lessonId);
    const resource = state.resources.find(item => item.id === lesson?.course_resource_id);
    if (!resource) return A.toast('Resource is not available yet.', 'warning');
    if (!platformAllowed || !activeEnrollment(lesson.course_id)) return A.toast('An active approved enrollment is required for this resource.', 'warning');
    A.setLoading(button, true, 'Opening...');
    try {
      const { data, error } = await A.supabase.storage.from('course-resources').createSignedUrl(resource.file_path, 120, { download: resource.file_name });
      if (error) throw error;
      window.open(data.signedUrl, '_blank', 'noopener');
    } catch (error) {
      A.toast(A.friendlyError(error, 'Could not open resource.'), 'error');
    } finally {
      A.setLoading(button, false);
    }
  }

  function subscribeRealtime() {
    const schedule = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => refresh().catch(console.error), 350);
    };
    A.supabase.channel(`student-v9-${state.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
          new Notification(payload.new.title || '24K Excellence', { body: payload.new.message || '', icon: 'assets/logo.png' });
        }
        schedule();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${state.user.id}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${state.user.id}` }, async () => {
        if (window.StudentBase?.reload) await window.StudentBase.reload();
        schedule();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_progress', filter: `student_id=eq.${state.user.id}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_modules' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_lessons' }, schedule)
      .subscribe();
  }

  function safeActionUrl(value) {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return 'student-dashboard.html';
      const file = url.pathname.split('/').pop() || 'student-dashboard.html';
      return `${file}${url.search}${url.hash}`;
    } catch {
      return 'student-dashboard.html';
    }
  }

  function notificationIcon(type) {
    return {
      signal: 'fa-bolt', payment: 'fa-receipt', course: 'fa-graduation-cap', live_class: 'fa-video',
      announcement: 'fa-bullhorn', chart: 'fa-chart-line', article: 'fa-newspaper', access: 'fa-shield-halved',
      support: 'fa-headset', signup: 'fa-user-plus'
    }[type] || 'fa-bell';
  }
})().catch(error => {
  console.error(error);
  window.App?.toast(window.App?.friendlyError(error, 'Could not load notifications and course progress.'), 'error');
});

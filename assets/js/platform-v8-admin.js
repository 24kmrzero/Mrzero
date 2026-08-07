(async function () {
  'use strict';
  const A = window.App;
  if (!A?.supabase) return;

  const esc = value => A.escapeHtml(value ?? '');
  const attr = value => esc(value).replace(/`/g, '&#96;').replace(/"/g, '&quot;');
  const label = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  const slug = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const localInput = value => {
    if (!value) return '';
    const date = new Date(value);
    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const empty = (text, icon = 'fa-inbox') => `<div class="empty-state compact"><i class="fa-solid ${icon}"></i><b>${esc(text)}</b></div>`;
  const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const downloadText = (name, text, type = 'text/plain') => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  for (let attempt = 0; attempt < 100 && document.getElementById('adminApp')?.classList.contains('hidden'); attempt += 1) await sleep(100);
  if (!document.getElementById('adminApp')) return;

  let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const state = {
    profiles: [], courses: [], modules: [], lessons: [], sessions: [], resources: [], links: [],
    attributions: [], emailQueue: [], enrollments: [], signals: [], payments: [], support: [],
    notifications: [], activities: [], auditLogs: [], enquiries: [], settings: [], teamAccounts: [], overview: null
  };

  const analyticsState = {
    users: { range: 'last_week', start: '', end: '' },
    courses: { range: 'last_week', start: '', end: '' }
  };

  installUi();
  bindUi();
  syncBaseState();
  await refresh();
  subscribeRealtime();

  window.addEventListener('24k:admin-base-updated', event => {
    syncBaseState(event.detail || window.AdminBase?.state);
    renderBaseDependentViews();
  });

  window.AdminOps = { state, refresh, openUserDetails, openPanel: key => document.querySelector(`[data-goto="${key}"]`)?.click() };

  function navLink(panel, icon, text, badgeId = '') {
    return `<a href="#" data-panel="${panel}"><i class="fa-solid ${icon}"></i> ${text}${badgeId ? ` <span class="nav-count" id="${badgeId}">0</span>` : ''}</a>`;
  }

  function installUi() {
    const nav = document.querySelector('.app-nav');
    const courseLabel = [...nav.querySelectorAll('.app-nav-label')].find(node => node.textContent.trim() === 'COURSES');
    const operationsLabel = [...nav.querySelectorAll('.app-nav-label')].find(node => node.textContent.trim() === 'OPERATIONS');
    if (courseLabel && !nav.querySelector('[data-panel="calendar"]')) {
      const marker = document.createElement('div');
      marker.innerHTML = navLink('calendar', 'fa-calendar-days', 'Calendar');
      let cursor = courseLabel;
      while (cursor.nextElementSibling && !cursor.nextElementSibling.classList.contains('app-nav-label')) cursor = cursor.nextElementSibling;
      [...marker.children].reverse().forEach(link => cursor.after(link));
    }
    if (operationsLabel && !nav.querySelector('[data-panel="links"]')) {
      const marker = document.createElement('div');
      marker.innerHTML = navLink('leads', 'fa-address-book', 'Website Enquiries', 'enquiryCount') + navLink('links', 'fa-link', 'Link Manager') + navLink('admin-notifications', 'fa-bell', 'Admin Notifications', 'adminNotificationCount') + navLink('delivery', 'fa-paper-plane', 'Delivery Center') + navLink('audit', 'fa-clock-rotate-left', 'Activity Logs') + navLink('settings', 'fa-gear', 'Settings');
      [...marker.children].reverse().forEach(link => operationsLabel.after(link));
    }

    const content = document.querySelector('.app-content');
    if (!document.getElementById('p-calendar')) content.insertAdjacentHTML('beforeend', panelsHtml());
    enhanceStudentsPanel();
    installModals();
    enhanceDashboard();
    enhanceTopbar();
    addScheduleFields();
  }

  function panelsHtml() {
    return `


      <section class="panel" id="p-leads">
        <div class="panel-heading"><div><h2>Website Enquiries</h2><p>Review contact-form leads, source attribution and follow-up status.</p></div><button class="app-btn outline" id="exportEnquiries"><i class="fa-solid fa-file-csv"></i> Export CSV</button></div>
        <div class="filter-row"><input id="enquirySearch" type="search" placeholder="Search name, email, WhatsApp or service..."><select id="enquiryStatus"><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option><option value="spam">Spam</option></select></div>
        <div class="table-scroll"><table class="admin-table"><thead><tr><th>Visitor</th><th>WhatsApp</th><th>Service</th><th>Source</th><th>Message</th><th>Received</th><th>Status</th><th>Action</th></tr></thead><tbody id="enquiriesBody"></tbody></table></div>
      </section>

      <section class="panel" id="p-links">
        <div class="panel-heading"><div><h2>Link Manager</h2><p>Track the first click through signup and enrollment.</p></div><button class="app-btn outline" id="exportLinks"><i class="fa-solid fa-file-csv"></i> Export CSV</button></div>
        <div class="app-grid cols-2"><div class="app-card"><form id="linkForm"><input type="hidden" name="id"><div class="form-grid"><div class="form-field full"><label>Link Name</label><input name="name" required placeholder="August Free Course WhatsApp"></div><div class="form-field"><label>Destination</label><select name="destination_path"><option value="/">Home</option><option value="/courses">Courses</option><option value="/sign-in">Sign In</option><option value="/sign-up">Sign Up</option><option value="/free-course">Free Course</option><option value="/charts">Charts</option><option value="/articles">Articles</option></select></div><div class="form-field"><label>Reference Code</label><input name="ref_code" required placeholder="rabiafx"></div><div class="form-field"><label>Source</label><select name="source"><option>WhatsApp</option><option>Facebook</option><option>Instagram</option><option>YouTube</option><option>Direct</option><option>Other</option></select></div><div class="form-field full"><label>Campaign</label><input name="campaign" placeholder="free-course-august"></div><label class="check-row"><input type="checkbox" name="is_active" checked> Link active</label></div><div class="sticky-form-actions"><button class="app-btn outline" type="button" data-reset-form="linkForm">Clear</button><button class="app-btn gold" type="submit">Generate / Save Link</button></div></form></div><div class="app-card"><h3>Attribution Summary</h3><div id="linkSummary" class="performance-grid"></div><div id="topSources"></div></div></div>
        <div class="table-scroll"><table class="admin-table"><thead><tr><th>Link</th><th>Reference</th><th>Source</th><th>Clicks</th><th>Unique</th><th>Signups</th><th>Enrollments</th><th>Conversion</th><th>Last Activity</th><th>Status</th><th>Actions</th></tr></thead><tbody id="linkManagerBody"></tbody></table></div>
        <div class="app-card team-management-card"><div class="app-card-head"><div><h3>Team Performance Accounts</h3><p>Assign one existing tracked link to each team member.</p></div><button class="app-btn gold" type="button" id="addTeamAccount"><i class="fa-solid fa-user-plus"></i> Add Team Account</button></div><div class="table-scroll"><table class="admin-table"><thead><tr><th>Team Member</th><th>Username</th><th>Assigned Link</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead><tbody id="teamAccountsBody"></tbody></table></div></div>
      </section>

      <section class="panel" id="p-calendar">
        <div class="panel-heading"><div><h2>Operations Calendar</h2><p>Classes, course dates, scheduled content and user expiries.</p></div><div class="inline-actions"><button class="app-btn outline" id="calendarPrev"><i class="fa-solid fa-chevron-left"></i></button><b id="calendarTitle"></b><button class="app-btn outline" id="calendarNext"><i class="fa-solid fa-chevron-right"></i></button></div></div>
        <div class="calendar-legend"><span class="class-dot">Classes</span><span class="content-dot">Content</span><span class="expiry-dot">Expiries</span></div><div class="admin-calendar" id="adminCalendar"></div>
      </section>

      <section class="panel" id="p-admin-notifications">
        <div class="panel-heading"><div><h2>Admin Notifications</h2><p>New registrations, payments and support requests that need attention.</p></div><button class="app-btn outline" id="markAllAdminNotifications">Mark All Read</button></div>
        <div class="filter-row"><select id="adminNotificationFilter"><option value="all">All</option><option value="unread">Unread</option><option value="payment">Payments</option><option value="signup">Registrations</option><option value="support">Support</option><option value="enquiry">Enquiries</option></select></div><div id="adminNotificationsList"></div>
      </section>

      <section class="panel" id="p-delivery">
        <div class="panel-heading"><div><h2>Delivery Center</h2><p>Monitor queued, sent and failed transactional emails.</p></div><button class="app-btn gold" id="processEmailQueue"><i class="fa-solid fa-paper-plane"></i> Process Queue</button></div>
        <div class="kpi-grid" id="deliveryKpis"></div><div class="notice info"><i class="fa-solid fa-circle-info"></i> Supabase handles verification and password reset emails. Custom enrollment/payment/class emails require the included Edge Function and sender configuration.</div>
        <div class="filter-row"><input id="emailSearch" type="search" placeholder="Search recipient or template..."><select id="emailStatusFilter"><option value="all">All statuses</option><option value="pending">Pending</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></div>
        <div class="table-scroll"><table class="admin-table"><thead><tr><th>Recipient</th><th>Template</th><th>Subject</th><th>Status</th><th>Attempts</th><th>Scheduled</th><th>Error</th><th>Action</th></tr></thead><tbody id="emailQueueBody"></tbody></table></div>
      </section>

      <section class="panel" id="p-audit">
        <div class="panel-heading"><div><h2>Activity & Audit Logs</h2><p>Permanent history of sensitive admin changes and student activity.</p></div><button class="app-btn outline" id="exportAudit"><i class="fa-solid fa-file-csv"></i> Export CSV</button></div>
        <div class="filter-row"><input id="auditSearch" type="search" placeholder="Search action, user or entity..."><select id="auditType"><option value="admin">Admin Audit</option><option value="user">User Activity</option></select></div><div class="table-scroll"><table class="admin-table"><thead id="auditHead"></thead><tbody id="auditBody"></tbody></table></div>
      </section>

      <section class="panel" id="p-settings">
        <div class="panel-heading"><div><h2>Platform Settings</h2><p>Central operational defaults. Sensitive secrets are never stored here.</p></div></div>
        <div class="app-grid cols-2"><div class="app-card"><form id="generalSettingsForm"><h3>General</h3><div class="form-grid"><div class="form-field full"><label>Brand Name</label><input name="brand_name" required></div><div class="form-field"><label>Instructor</label><input name="instructor_name" required></div><div class="form-field"><label>Timezone</label><input name="timezone" required></div></div><button class="app-btn gold" type="submit">Save General Settings</button></form></div><div class="app-card"><form id="notificationSettingsForm"><h3>Notifications</h3><label class="check-row"><input type="checkbox" name="browser_enabled"> Browser notifications enabled</label><label class="check-row"><input type="checkbox" name="email_enabled"> Custom email delivery enabled</label><div class="form-field"><label>Admin re-confirmation window (minutes)</label><input type="number" min="5" max="180" name="admin_reauth_minutes"></div><button class="app-btn gold" type="submit">Save Notification Settings</button></form></div></div>
        <div class="app-card system-health"><h3>System Health</h3><div id="systemHealth"></div></div>
      </section>`;
  }

  function enhanceStudentsPanel() {
    const panel = document.getElementById('p-students');
    if (!panel) return;
    panel.innerHTML = `<div class="panel-heading"><div><h2>Student Management</h2><p>Users, course enrollment, payments and access in one place.</p></div><button class="app-btn outline" id="exportUsers"><i class="fa-solid fa-file-csv"></i> Export CSV</button></div>
      <div class="student-summary-grid" id="studentSummaryCards"></div>
      <div class="student-filter-toolbar">
        <div class="student-date-buttons" role="group" aria-label="Registration period">
          <button type="button" class="student-date-btn active" data-user-date-quick="all">All</button>
          <button type="button" class="student-date-btn" data-user-date-quick="today">Today</button>
          <button type="button" class="student-date-btn" data-user-date-quick="yesterday">Yesterday</button>
          <button type="button" class="student-date-btn" data-user-date-quick="7">Last Week</button>
          <button type="button" class="student-date-btn" data-user-date-quick="30">Last Month</button>
          <button type="button" class="student-date-btn" data-user-date-quick="custom">Custom Date</button>
        </div>
        <select id="userDateFilter" class="hidden"><option value="all">All</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="custom">Custom</option></select>
        <div class="student-custom-dates hidden" id="studentCustomDates"><input type="date" id="userDateFrom"><input type="date" id="userDateTo"></div>
        <div class="filter-row student-main-filters"><input id="userSearchV9" type="search" placeholder="Search name, email or WhatsApp..."><select id="userCourseFilter"><option value="all">All Courses</option></select><select id="userStatusFilter"><option value="all">All Access</option><option value="active">Active</option><option value="grace">Grace Active</option><option value="pending">Pending</option><option value="locked">Locked</option><option value="expired">Expired</option><option value="suspended">Suspended</option><option value="lifetime">Lifetime</option></select><select id="userVerifiedFilter"><option value="all">All Email Status</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select></div>
      </div>
      <div class="app-card bulk-bar"><div><b>Bulk Actions</b><small>Optional actions for selected users.</small></div><select id="bulkUserAction"><option value="extend_days">Extend Access</option><option value="lock">Lock Selected</option><option value="unlock">Unlock Selected</option><option value="resend_verification">Resend Verification</option></select><input id="bulkAccessDays" type="number" min="1" placeholder="Days"><button class="app-btn outline" id="notifySelectedUsers"><i class="fa-solid fa-bullhorn"></i> Notify</button><button class="app-btn gold" id="applyBulkUsers">Apply</button></div>
      <div class="table-scroll"><table class="admin-table student-management-table"><thead><tr><th><input type="checkbox" id="selectAllUsers"></th><th>Student</th><th>WhatsApp</th><th>Registered</th><th>Course</th><th>Enrollment</th><th>Payment</th><th>Access / Expiry</th><th>Actions</th></tr></thead><tbody id="studentsBodyV9"></tbody></table></div>`;
  }

  function installModals() {
    if (document.getElementById('userDetailsModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="app-modal" id="userAccessModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3>Manage User Access</h3><small id="accessUserName" class="muted"></small></div><button class="modal-close" data-close-modal="userAccessModal"><i class="fa-solid fa-xmark"></i></button></div><form id="userAccessForm"><input type="hidden" name="user_id"><div class="app-modal-body"><div class="form-field"><label>Action</label><select name="action" id="accessAction"><option value="unlock">Activate / Unlock</option><option value="lock">Lock Account</option><option value="set_days">Set Access for Days</option><option value="extend_days">Extend Access Days</option><option value="set_until">Set Exact Expiry</option><option value="lifetime">Give Lifetime Access</option><option value="reset">Reset Access</option><option value="new_pin">Generate / Set New PIN</option></select></div><div class="form-grid"><div class="form-field access-days"><label>Days</label><input type="number" min="1" name="days"></div><div class="form-field access-until hidden"><label>Expiry Date & Time</label><input type="datetime-local" name="until"></div><div class="form-field access-grace"><label>Grace Days</label><input type="number" min="0" name="grace_days" value="0"></div><div class="form-field access-pin hidden"><label>PIN <span class="muted">(blank = automatic)</span></label><input name="pin" maxlength="12"></div></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="userAccessModal">Cancel</button><button class="app-btn gold" type="submit">Apply Action</button></div></form></div></div>
      <div class="app-modal" id="userDetailsModal"><div class="app-modal-card extra-large"><div class="app-modal-head"><div><h3 id="userDetailsTitle">Student Details</h3><small id="userDetailsSubtitle" class="muted"></small></div><button class="modal-close" data-close-modal="userDetailsModal"><i class="fa-solid fa-xmark"></i></button></div><div class="app-modal-body" id="userDetailsContent"></div></div></div>
      <div class="app-modal" id="supportReviewModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3>Support Request</h3><small id="supportReviewSubtitle" class="muted"></small></div><button class="modal-close" data-close-modal="supportReviewModal"><i class="fa-solid fa-xmark"></i></button></div><form id="supportReviewForm"><input type="hidden" name="request_id"><div class="app-modal-body"><div id="supportReviewContent" class="notice info"></div><div class="form-field"><label>Status</label><select name="status"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div><div class="form-field"><label>Admin / Resolution Note</label><textarea name="note" placeholder="Required for a clear resolution"></textarea></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="supportReviewModal">Cancel</button><button class="app-btn gold" type="submit">Save Update</button></div></form></div></div>
      <div class="app-modal" id="enquiryReviewModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3>Website Enquiry</h3><small id="enquiryReviewSubtitle" class="muted"></small></div><button class="modal-close" data-close-modal="enquiryReviewModal"><i class="fa-solid fa-xmark"></i></button></div><form id="enquiryReviewForm"><input type="hidden" name="enquiry_id"><div class="app-modal-body"><div id="enquiryReviewContent" class="notice info"></div><div class="form-field"><label>Status</label><select name="status"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option><option value="spam">Spam</option></select></div><div class="form-field"><label>Admin Note</label><textarea name="note" placeholder="Follow-up notes"></textarea></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="enquiryReviewModal">Cancel</button><button class="app-btn gold" type="submit">Save Enquiry</button></div></form></div></div>
      <div class="app-modal" id="bulkMessageModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3>Notify Selected Students</h3><small id="bulkMessageSubtitle" class="muted"></small></div><button class="modal-close" data-close-modal="bulkMessageModal"><i class="fa-solid fa-xmark"></i></button></div><form id="bulkMessageForm"><div class="app-modal-body"><div class="form-field"><label>Title</label><input name="title" required maxlength="150"></div><div class="form-field"><label>Message</label><textarea name="message" required maxlength="2000"></textarea></div><label class="check-row"><input type="checkbox" name="send_email"> Also queue email delivery</label></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="bulkMessageModal">Cancel</button><button class="app-btn gold" type="submit">Send Notification</button></div></form></div></div>
      <div class="app-modal" id="enrollmentManageModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3>Manage Enrollment</h3><small id="enrollmentModalSubtitle" class="muted"></small></div><button class="modal-close" data-close-modal="enrollmentManageModal"><i class="fa-solid fa-xmark"></i></button></div><form id="enrollmentForm"><input type="hidden" name="enrollment_id"><div class="app-modal-body"><div class="form-grid"><div class="form-field full"><label>Student</label><select name="student_id" id="enrollmentStudent" required></select></div><div class="form-field full"><label>Course</label><select name="course_id" id="enrollmentCourse" required></select></div><div class="form-field"><label>Status</label><select name="status"><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option></select></div><div class="form-field"><label>Access Days</label><input type="number" min="1" name="access_days" placeholder="Optional"></div><div class="form-field full"><label>Exact Expiry</label><input type="datetime-local" name="expires_at"></div></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="enrollmentManageModal" id="resetEnrollmentForm">Cancel</button><button class="app-btn gold" type="submit">Save Enrollment</button></div></form></div></div>
      <div class="app-modal" id="calendarDayModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3 id="calendarDayTitle">Calendar Details</h3><small class="muted">Classes, content and expiries</small></div><button class="modal-close" data-close-modal="calendarDayModal"><i class="fa-solid fa-xmark"></i></button></div><div class="app-modal-body" id="calendarDayModalContent"></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="calendarDayModal">Close</button></div></div></div>
      <div class="app-modal" id="teamAccountModal"><div class="app-modal-card"><div class="app-modal-head"><div><h3 id="teamAccountModalTitle">Add Team Account</h3><small class="muted">Username + password only. Assign an existing tracked link.</small></div><button class="modal-close" data-close-modal="teamAccountModal"><i class="fa-solid fa-xmark"></i></button></div><form id="teamAccountForm"><input type="hidden" name="team_id"><div class="app-modal-body"><div class="form-grid"><div class="form-field"><label>Team Member Name</label><input name="display_name" required></div><div class="form-field"><label>Username</label><input name="username" required autocomplete="off"></div><div class="form-field full"><label>Password <span class="muted">(leave blank when editing to keep current)</span></label><input type="password" name="password" autocomplete="new-password"></div><div class="form-field full"><label>Existing Tracked Link</label><select name="link_id" id="teamLinkSelect" required></select></div><label class="check-row"><input type="checkbox" name="is_active" checked> Team account active</label></div></div><div class="app-modal-foot"><button type="button" class="app-btn outline" data-close-modal="teamAccountModal">Cancel</button><button class="app-btn gold" type="submit">Save Team Account</button></div></form></div></div>
      <div class="global-search-results hidden" id="globalSearchResults"></div>`);
  }

  function enhanceDashboard() {
    // V9.20: keep the dashboard compact. Business metrics start immediately
    // below the page heading; the oversized overview hero is intentionally removed.
    document.querySelector('#p-dashboard .operations-hero')?.remove();
  }

  function enhanceTopbar() {
    const bell = document.querySelector('.app-notify');
    if (bell) { bell.dataset.goto = 'admin-notifications'; bell.removeAttribute('data-panel'); }
    const input = document.getElementById('adminSearch');
    if (input) input.placeholder = 'Search users, payments, signals, courses...';
  }

  function addScheduleFields() {
    const targets = [
      ['chartForm', true], ['articleForm', true], ['courseForm', true]
    ];
    targets.forEach(([formId, featured]) => {
      const form = document.getElementById(formId);
      const grid = form?.querySelector('.form-grid');
      if (!grid || form.elements.publish_at) return;
      grid.insertAdjacentHTML('beforeend', `<div class="form-field"><label>Publish At <span class="muted">(optional)</span></label><input type="datetime-local" name="publish_at"></div><div class="form-field"><label>Unpublish At <span class="muted">(optional)</span></label><input type="datetime-local" name="unpublish_at"></div>${featured ? '<label class="check-row"><input type="checkbox" name="featured"> Featured content</label>' : ''}`);
    });
    const announcement = document.getElementById('announcementForm');
    const grid = announcement?.querySelector('.form-grid');
    if (grid && !announcement.elements.audience) grid.insertAdjacentHTML('beforeend', `<div class="form-field"><label>Audience</label><select name="audience"><option value="all_students">All Students</option><option value="active_users">Active Users</option><option value="paid_students">Paid Students</option><option value="course_students">Specific Course Students</option></select></div><div class="form-field"><label>Course <span class="muted">(when required)</span></label><select name="course_id" id="announcementCourse"><option value="">Select course</option></select></div><div class="form-field"><label>Publish At</label><input type="datetime-local" name="publish_at"></div><div class="form-field"><label>Expire At</label><input type="datetime-local" name="expires_at"></div><label class="check-row"><input type="checkbox" name="send_browser" checked> Browser / in-app notification</label><label class="check-row"><input type="checkbox" name="send_email"> Queue email delivery</label>`);
  }

  function bindUi() {
    document.getElementById('moduleForm')?.addEventListener('submit', saveModule);
    document.getElementById('lessonForm')?.addEventListener('submit', saveLesson);
    document.getElementById('lessonCourse')?.addEventListener('change', populateLessonRelations);
    document.getElementById('lessonType')?.addEventListener('change', renderLessonTypeFields);
    document.getElementById('structureCourseFilter')?.addEventListener('change', renderStructure);
    document.getElementById('enrollmentForm')?.addEventListener('submit', saveEnrollment);
    document.getElementById('resetEnrollmentForm')?.addEventListener('click', resetEnrollmentForm);
    document.getElementById('linkForm')?.addEventListener('submit', saveLink);
    document.getElementById('addTeamAccount')?.addEventListener('click', () => openTeamAccount());
    document.getElementById('teamAccountForm')?.addEventListener('submit', saveTeamAccount);
    document.getElementById('processEmailQueue')?.addEventListener('click', processEmailQueue);
    document.getElementById('emailSearch')?.addEventListener('input', renderDelivery);
    document.getElementById('emailStatusFilter')?.addEventListener('change', renderDelivery);
    document.getElementById('adminNotificationFilter')?.addEventListener('change', renderAdminNotifications);
    document.getElementById('markAllAdminNotifications')?.addEventListener('click', () => markAdminNotification(null, true));
    document.getElementById('auditSearch')?.addEventListener('input', renderAudit);
    document.getElementById('auditType')?.addEventListener('change', renderAudit);
    document.getElementById('generalSettingsForm')?.addEventListener('submit', saveGeneralSettings);
    document.getElementById('notificationSettingsForm')?.addEventListener('submit', saveNotificationSettings);
    document.getElementById('userAccessForm')?.addEventListener('submit', applyAccess);
    document.getElementById('accessAction')?.addEventListener('change', renderAccessFields);
    document.getElementById('supportReviewForm')?.addEventListener('submit', saveSupportReview);
    document.getElementById('enquiryReviewForm')?.addEventListener('submit', saveEnquiryReview);
    document.getElementById('enquirySearch')?.addEventListener('input', renderEnquiries);
    document.getElementById('enquiryStatus')?.addEventListener('change', renderEnquiries);
    ['userSearchV9', 'userDateFrom', 'userDateTo', 'userVerifiedFilter', 'userStatusFilter', 'userCourseFilter'].forEach(id => document.getElementById(id)?.addEventListener('input', renderUsers));
    document.querySelectorAll('[data-user-date-quick]').forEach(btn => btn.addEventListener('click', () => setUserDateFilter(btn.dataset.userDateQuick, btn)));
    document.getElementById('userDateFrom')?.addEventListener('change', renderUsers);
    document.getElementById('userDateTo')?.addEventListener('change', renderUsers);
    document.getElementById('selectAllUsers')?.addEventListener('change', event => document.querySelectorAll('[data-user-select]').forEach(input => { input.checked = event.target.checked; }));
    document.getElementById('bulkUserAction')?.addEventListener('change', toggleBulkDays);
    document.getElementById('applyBulkUsers')?.addEventListener('click', applyBulkUsers);
    document.getElementById('notifySelectedUsers')?.addEventListener('click', openBulkMessage);
    document.getElementById('bulkMessageForm')?.addEventListener('submit', sendBulkMessage);
    document.getElementById('calendarPrev')?.addEventListener('click', () => moveCalendar(-1));
    document.getElementById('calendarNext')?.addEventListener('click', () => moveCalendar(1));
    document.getElementById('adminSearch')?.addEventListener('input', renderGlobalSearch);
    document.getElementById('exportUsers')?.addEventListener('click', exportUsers);
    document.getElementById('exportEnrollments')?.addEventListener('click', exportEnrollments);
    document.getElementById('exportLinks')?.addEventListener('click', exportLinks);
    document.getElementById('exportAudit')?.addEventListener('click', exportAudit);
    document.getElementById('exportStructure')?.addEventListener('click', exportStructure);
    document.getElementById('exportEnquiries')?.addEventListener('click', exportEnquiries);

    document.addEventListener('click', async event => {
      const reset = event.target.closest('[data-reset-form]'); if (reset) resetForm(reset.dataset.resetForm);
      const editModule = event.target.closest('[data-edit-module]'); if (editModule) editModuleRow(editModule.dataset.editModule);
      const editTeam = event.target.closest('[data-edit-team]'); if (editTeam) openTeamAccount(editTeam.dataset.editTeam);
      const toggleTeam = event.target.closest('[data-toggle-team]'); if (toggleTeam) toggleTeamAccount(toggleTeam.dataset.toggleTeam);
      const editLesson = event.target.closest('[data-edit-lesson]'); if (editLesson) editLessonRow(editLesson.dataset.editLesson);
      const delModule = event.target.closest('[data-delete-module]'); if (delModule) deleteRow('course_modules', delModule.dataset.deleteModule, 'module');
      const delLesson = event.target.closest('[data-delete-lesson]'); if (delLesson) deleteRow('course_lessons', delLesson.dataset.deleteLesson, 'lesson');
      const editEnrollment = event.target.closest('[data-edit-enrollment]'); if (editEnrollment) editEnrollmentRow(editEnrollment.dataset.editEnrollment);
      const manageEnrollment = event.target.closest('[data-manage-enrollment]'); if (manageEnrollment) openEnrollmentForStudent(manageEnrollment.dataset.manageEnrollment);
      const enrollmentAction = event.target.closest('[data-enrollment-action]'); if (enrollmentAction) quickEnrollmentAction(enrollmentAction.dataset.enrollmentId, enrollmentAction.dataset.enrollmentAction, enrollmentAction);
      const copy = event.target.closest('[data-copy-link]'); if (copy) { await navigator.clipboard.writeText(copy.dataset.copyLink); A.toast('Tracked link copied.', 'success'); }
      const editLinkButton = event.target.closest('[data-edit-link]'); if (editLinkButton) editLink(editLinkButton.dataset.editLink);
      const toggleLinkButton = event.target.closest('[data-toggle-link]'); if (toggleLinkButton) toggleLink(toggleLinkButton.dataset.toggleLink);
      const access = event.target.closest('[data-manage-access]'); if (access) openAccess(access.dataset.manageAccess);
      const user = event.target.closest('[data-user-details]'); if (user) openUserDetails(user.dataset.userDetails);
      const resendVerification = event.target.closest('[data-resend-verification]'); if (resendVerification) resendVerificationEmail(resendVerification.dataset.resendVerification, resendVerification);
      const notify = event.target.closest('[data-admin-notification]'); if (notify) openAdminNotification(notify.dataset.adminNotification);
      const retry = event.target.closest('[data-retry-email]'); if (retry) retryEmail(retry.dataset.retryEmail, retry);
      const day = event.target.closest('[data-calendar-date]'); if (day) renderCalendarDay(day.dataset.calendarDate);
      const support = event.target.closest('[data-support-review]'); if (support) openSupportReview(support.dataset.supportReview);
      const enquiry = event.target.closest('[data-enquiry-review]'); if (enquiry) openEnquiryReview(enquiry.dataset.enquiryReview);
      const result = event.target.closest('[data-global-result]'); if (result) handleGlobalResult(result);
      const analyticsRange = event.target.closest('[data-analytics-range]');
      if (analyticsRange) {
        const target = analyticsRange.dataset.analyticsTarget;
        if (analyticsState[target]) { analyticsState[target].range = analyticsRange.dataset.range || 'last_week'; if (analyticsState[target].range === 'custom' && (!analyticsState[target].start || !analyticsState[target].end)) { const now = new Date(); const pad = n => String(n).padStart(2,'0'); const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; analyticsState[target].end = fmt(now); analyticsState[target].start = fmt(addDays(now,-6)); } renderOperationsDashboard(); }
      }
      if (!event.target.closest('.app-search') && !event.target.closest('#globalSearchResults')) document.getElementById('globalSearchResults')?.classList.add('hidden');
    });
    document.addEventListener('change', event => {
      const input = event.target.closest('[data-analytics-custom]');
      if (!input) return;
      const [target, field] = String(input.dataset.analyticsCustom || '').split('-');
      if (!analyticsState[target] || !['start','end'].includes(field)) return;
      analyticsState[target][field] = input.value || '';
      analyticsState[target].range = 'custom';
      renderOperationsDashboard();
    });
  }

  function syncBaseState(base = window.AdminBase?.state) {
    if (!base) return;
    ['profiles', 'courses', 'sessions', 'resources', 'signals', 'payments', 'support'].forEach(key => { state[key] = base[key] || []; });
  }

  async function refresh() {
    syncBaseState();
    try { await Promise.all([A.supabase.rpc('admin_publish_due_content'), A.supabase.rpc('admin_expire_due_access')]); } catch (error) { console.warn('Scheduled maintenance sync skipped:', error?.message || error); }
    const queries = [
      ['modules', A.supabase.from('course_modules').select('*').order('module_number')],
      ['lessons', A.supabase.from('course_lessons').select('*').order('lesson_number')],
      ['links', A.supabase.from('admin_link_performance').select('*').order('created_at', { ascending: false })],
      ['attributions', A.supabase.from('user_attributions').select('*')],
      ['emailQueue', A.supabase.from('email_queue').select('*').order('created_at', { ascending: false }).limit(500)],
      ['enrollments', A.supabase.from('enrollments').select('*').order('created_at', { ascending: false })],
      ['notifications', A.supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(300)],
      ['activities', A.supabase.from('user_activity_logs').select('*').order('created_at', { ascending: false }).limit(500)],
      ['auditLogs', A.supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(500)],
      ['enquiries', A.supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(500)],
      ['settings', A.supabase.from('platform_settings').select('*')],
      ['overview', A.supabase.from('admin_operations_overview').select('*').maybeSingle()]
    ];
    const results = await Promise.all(queries.map(async ([key, query]) => [key, await query]));
    const failures = results.filter(([, result]) => result.error);
    if (failures.length) {
      const missingPatch = failures.some(([, result]) => /does not exist|schema cache|relation/i.test(result.error.message || ''));
      A.toast(missingPatch ? 'V9 database patch is required before all Admin tools can load.' : A.friendlyError(failures[0][1].error), 'error', 6000);
    }
    results.forEach(([key, result]) => {
      if (result.error) return;
      state[key] = key === 'overview' ? (result.data || null) : (result.data || []);
    });
    try { const team = await A.supabase.rpc('admin_list_team_accounts'); if (!team.error) state.teamAccounts = team.data || []; else console.warn('Team accounts unavailable:', team.error.message); } catch (error) { console.warn('Team accounts unavailable:', error?.message || error); }
    renderAll();
  }

  function safeRender(name, fn) { try { fn(); } catch (error) { console.error(`Admin render failed: ${name}`, error); } }
  function renderAll() {
    [['courses',populateCourseOptions],['structure',renderStructure],['enrollments',renderEnrollments],['enquiries',renderEnquiries],['links',renderLinks],['team',renderTeamAccounts],['users',renderUsers],['delivery',renderDelivery],['notifications',renderAdminNotifications],['audit',renderAudit],['calendar',renderCalendar],['settings',renderSettings],['analytics',renderOperationsDashboard],['tables',decorateBaseTables],['search',renderGlobalSearch]].forEach(([name,fn])=>safeRender(name,fn));
  }

  function renderBaseDependentViews() {
    [['courses',populateCourseOptions],['enrollments',renderEnrollments],['users',renderUsers],['calendar',renderCalendar],['analytics',renderOperationsDashboard],['tables',decorateBaseTables],['team',renderTeamAccounts]].forEach(([name,fn])=>safeRender(name,fn));
  }

  function populateCourseOptions() {
    const options = state.courses.map(course => `<option value="${course.id}">${esc(course.title)}</option>`).join('');
    ['moduleCourse', 'lessonCourse', 'structureCourseFilter', 'enrollmentCourse'].forEach(id => {
      const element = document.getElementById(id); if (!element) return;
      const old = element.value; element.innerHTML = options || '<option value="">No course available</option>';
      if ([...element.options].some(option => option.value === old)) element.value = old;
    });
    const userCourseFilter = document.getElementById('userCourseFilter');
    if (userCourseFilter) { const old = userCourseFilter.value; userCourseFilter.innerHTML = '<option value="all">All Courses</option>' + options; if ([...userCourseFilter.options].some(option => option.value === old)) userCourseFilter.value = old; }
    const announcementCourse = document.getElementById('announcementCourse');
    if (announcementCourse) announcementCourse.innerHTML = '<option value="">Select course</option>' + options;
    const students = state.profiles.filter(profile => profile.role === 'student').map(profile => `<option value="${profile.id}">${esc(profile.full_name || 'Student')} — ${esc(profile.email)}</option>`).join('');
    const studentSelect = document.getElementById('enrollmentStudent');
    if (studentSelect) { const old = studentSelect.value; studentSelect.innerHTML = students || '<option value="">No student</option>'; if ([...studentSelect.options].some(option => option.value === old)) studentSelect.value = old; }
    populateLessonRelations();
  }

  function populateLessonRelations() {
    const courseId = document.getElementById('lessonCourse')?.value;
    const module = document.getElementById('lessonModule');
    const session = document.getElementById('lessonSession');
    const resource = document.getElementById('lessonResource');
    if (module) module.innerHTML = state.modules.filter(row => row.course_id === courseId).map(row => `<option value="${row.id}">Module ${row.module_number}: ${esc(row.title)}</option>`).join('');
    if (session) session.innerHTML = '<option value="">Select session</option>' + state.sessions.filter(row => row.course_id === courseId).map(row => `<option value="${row.id}">Session ${row.session_number}: ${esc(row.title)}</option>`).join('');
    if (resource) resource.innerHTML = '<option value="">Select resource</option>' + state.resources.filter(row => row.course_id === courseId).map(row => `<option value="${row.id}">${esc(row.title)}</option>`).join('');
  }

  function renderLessonTypeFields() {
    const type = document.getElementById('lessonType')?.value;
    document.querySelector('.v9-session-link')?.classList.toggle('hidden', type !== 'live_class');
    document.querySelector('.v9-resource-link')?.classList.toggle('hidden', type !== 'resource');
    document.querySelector('.v9-text-link')?.classList.toggle('hidden', type !== 'text');
  }

  async function saveModule(event) {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    await upsert('course_modules', { course_id: values.course_id, module_number: Number(values.module_number), title: values.title.trim(), description: values.description.trim(), is_published: form.elements.is_published.checked }, values.id, form, 'Module saved successfully.');
  }

  async function saveLesson(event) {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    const row = { course_id: values.course_id, module_id: values.module_id, lesson_number: Number(values.lesson_number), title: values.title.trim(), description: values.description.trim(), lesson_type: values.lesson_type, course_session_id: values.lesson_type === 'live_class' ? values.course_session_id || null : null, course_resource_id: null, text_content: values.lesson_type === 'text' ? values.text_content || null : null, is_published: form.elements.is_published.checked };
    await upsert('course_lessons', row, values.id, form, 'Lesson saved successfully.');
  }

  async function upsert(table, row, id, form, message) {
    const button = form.querySelector('button[type="submit"]'); A.setLoading(button, true, 'Saving...');
    try {
      const response = id ? await A.supabase.from(table).update(row).eq('id', id) : await A.supabase.from(table).insert(row);
      if (response.error) throw response.error;
      resetForm(form.id); await refresh(); A.toast(message, 'success');
    } catch (error) { A.toast(A.friendlyError(error, 'Could not save this record.'), 'error'); }
    finally { A.setLoading(button, false); }
  }

  function resetForm(id) { const form = document.getElementById(id); if (!form) return; form.reset(); if (form.elements.id) form.elements.id.value = ''; if (id === 'lessonForm') renderLessonTypeFields(); }

  function renderStructure() {
    const courseId = document.getElementById('structureCourseFilter')?.value;
    const modules = state.modules.filter(module => module.course_id === courseId);
    const list = document.getElementById('structureList'); if (!list) return;
    list.innerHTML = modules.length ? modules.map(module => `<div class="module-block"><div class="module-head"><div><b>Module ${module.module_number}: ${esc(module.title)}</b><small>${esc(module.description || '')}</small></div><div class="table-actions"><button class="app-btn small outline" data-edit-module="${module.id}">Edit</button><button class="app-btn small danger" data-delete-module="${module.id}">Delete</button></div></div><div class="module-lessons">${state.lessons.filter(lesson => lesson.module_id === module.id).map(lesson => `<div class="activity-item"><div class="activity-icon"><i class="fa-solid ${lesson.lesson_type === 'live_class' ? 'fa-video' : lesson.lesson_type === 'resource' ? 'fa-file-arrow-down' : 'fa-book-open'}"></i></div><div><b>Lesson ${lesson.lesson_number}: ${esc(lesson.title)}</b><small>${label(lesson.lesson_type)} · ${lesson.is_published ? 'Published' : 'Draft'}</small></div><div class="table-actions"><button class="app-btn small outline" data-edit-lesson="${lesson.id}">Edit</button><button class="app-btn small danger" data-delete-lesson="${lesson.id}">Delete</button></div></div>`).join('') || empty('No lessons in this module.', 'fa-book')}</div></div>`).join('') : empty('No modules created for this course.', 'fa-list-check');
  }

  function editModuleRow(id) { const row = state.modules.find(item => item.id === id); const form = document.getElementById('moduleForm'); if (!row || !form) return; Object.entries(row).forEach(([key, value]) => { const field = form.elements[key]; if (!field) return; field.type === 'checkbox' ? field.checked = Boolean(value) : field.value = value ?? ''; }); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function editLessonRow(id) { const row = state.lessons.find(item => item.id === id); const form = document.getElementById('lessonForm'); if (!row || !form) return; form.elements.course_id.value = row.course_id; populateLessonRelations(); Object.entries(row).forEach(([key, value]) => { const field = form.elements[key]; if (!field) return; field.type === 'checkbox' ? field.checked = Boolean(value) : field.value = value ?? ''; }); renderLessonTypeFields(); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  async function deleteRow(table, id, type) { const result = await A.confirmAction({ title: `Delete ${label(type)}`, message: `This ${type} will be permanently removed.`, confirmText: 'Delete', danger: true }); if (!result.confirmed) return; const response = await A.supabase.from(table).delete().eq('id', id); if (response.error) A.toast(A.friendlyError(response.error), 'error'); else { await refresh(); A.toast(`${label(type)} deleted.`, 'success'); } }

  function enrollmentRows() {
    const query = (document.getElementById('enrollmentSearch')?.value || '').trim().toLowerCase(); const status = document.getElementById('enrollmentStatus')?.value || 'all';
    return state.enrollments.filter(row => status === 'all' || row.status === status).filter(row => { const profile = state.profiles.find(item => item.id === row.student_id); const course = state.courses.find(item => item.id === row.course_id); return !query || `${profile?.full_name || ''} ${profile?.email || ''} ${course?.title || ''}`.toLowerCase().includes(query); });
  }

  function renderEnrollments() {
    const body = document.getElementById('enrollmentsBody'); if (!body) return; const rows = enrollmentRows();
    body.innerHTML = rows.length ? rows.map(row => { const profile = profileById(row.student_id); const course = courseById(row.course_id); const payment = state.payments.find(item => item.id === row.payment_id); return `<tr><td><button class="text-link" data-user-details="${row.student_id}"><b>${esc(profile?.full_name || 'Student')}</b></button><small>${esc(profile?.email || '')}</small></td><td><b>${esc(course?.title || 'Course')}</b></td><td><span class="status-pill ${A.statusClass(row.status)}">${A.statusLabel(row.status)}</span></td><td>${A.formatDateTime(row.access_started_at)}</td><td>${row.access_expires_at ? A.formatDateTime(row.access_expires_at) : 'No expiry'}</td><td>${payment ? `<span class="status-pill ${A.statusClass(payment.status)}">${A.statusLabel(payment.status)}</span>` : 'Manual / Free'}</td><td><div class="table-actions"><button class="app-btn small outline" data-edit-enrollment="${row.id}">Edit</button>${row.status !== 'active' ? `<button class="app-btn small green" data-enrollment-action="active" data-enrollment-id="${row.id}">Activate</button>` : `<button class="app-btn small danger" data-enrollment-action="revoked" data-enrollment-id="${row.id}">Revoke</button>`}</div></td></tr>`; }).join('') : `<tr><td colspan="7">${empty('No enrollments match this view.', 'fa-user-graduate')}</td></tr>`;
  }

  function resetEnrollmentForm() { const form = document.getElementById('enrollmentForm'); form?.reset(); if (form?.elements.enrollment_id) form.elements.enrollment_id.value = ''; }
  function openEnrollmentForStudent(studentId) { const form = document.getElementById('enrollmentForm'); const profile = profileById(studentId); if (!form || !profile) return; resetEnrollmentForm(); form.elements.student_id.value = studentId; const active = state.enrollments.find(row => row.student_id === studentId && row.status === 'active') || state.enrollments.find(row => row.student_id === studentId); if (active) { form.elements.enrollment_id.value = active.id; form.elements.course_id.value = active.course_id; form.elements.status.value = active.status; form.elements.expires_at.value = localInput(active.access_expires_at); } document.getElementById('enrollmentModalSubtitle').textContent = `${profile.full_name || 'Student'} · ${profile.email || ''}`; A.openModal('enrollmentManageModal'); }
  function editEnrollmentRow(id) { const row = state.enrollments.find(item => item.id === id); const form = document.getElementById('enrollmentForm'); if (!row || !form) return; form.elements.enrollment_id.value = row.id; form.elements.student_id.value = row.student_id; form.elements.course_id.value = row.course_id; form.elements.status.value = row.status; form.elements.access_days.value = ''; form.elements.expires_at.value = localInput(row.access_expires_at); const profile = profileById(row.student_id); document.getElementById('enrollmentModalSubtitle').textContent = `${profile?.full_name || 'Student'} · ${courseById(row.course_id)?.title || 'Course'}`; A.openModal('enrollmentManageModal'); }
  async function saveEnrollment(event) { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const button = form.querySelector('button[type="submit"]'); A.setLoading(button, true, 'Saving...'); try { const response = await A.supabase.rpc('admin_upsert_enrollment', { p_student_id: values.student_id, p_course_id: values.course_id, p_status: values.status, p_access_days: values.access_days ? Number(values.access_days) : null, p_expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null }); if (response.error) throw response.error; resetEnrollmentForm(); A.closeModal('enrollmentManageModal'); await refresh(); A.toast('Course enrollment updated successfully.', 'success'); } catch (error) { A.toast(A.friendlyError(error), 'error'); } finally { A.setLoading(button, false); } }
  async function quickEnrollmentAction(id, status, button) { const row = state.enrollments.find(item => item.id === id); if (!row) return; const confirm = await A.confirmAction({ title: status === 'active' ? 'Activate Enrollment' : 'Revoke Enrollment', message: `${status === 'active' ? 'Restore' : 'Remove'} course access for this student?`, confirmText: status === 'active' ? 'Activate' : 'Revoke', danger: status !== 'active' }); if (!confirm.confirmed) return; A.setLoading(button, true, 'Updating...'); try { const response = await A.supabase.rpc('admin_upsert_enrollment', { p_student_id: row.student_id, p_course_id: row.course_id, p_status: status, p_access_days: null, p_expires_at: null }); if (response.error) throw response.error; await refresh(); A.toast(status === 'active' ? 'Enrollment activated.' : 'Enrollment revoked.', 'success'); } catch (error) { A.toast(A.friendlyError(error), 'error'); } finally { A.setLoading(button, false); } }

  async function saveLink(event) { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const row = { name: values.name.trim(), destination_path: values.destination_path, ref_code: slug(values.ref_code), source: values.source, campaign: values.campaign.trim() || null, is_active: form.elements.is_active.checked, created_by: window.AdminBase?.state?.profile?.id || null }; await upsert('tracking_links', row, values.id, form, 'Tracked link saved.'); }
  function trackedUrl(row) { const root = `${location.origin}${A.cfg.SITE_BASE_PATH || '/Mrzero/'}`.replace(/\/$/, ''); const destination = row.destination_path === '/' ? '/' : `${row.destination_path.replace(/\/$/, '')}/`; const params = new URLSearchParams({ ref: row.ref_code }); if (row.source) params.set('source', row.source); if (row.campaign) params.set('campaign', row.campaign); return `${root}${destination}?${params}`; }
  function filteredEnquiries() {
    const query = document.getElementById('enquirySearch')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('enquiryStatus')?.value || 'all';
    return state.enquiries.filter(row => (status === 'all' || row.status === status) && (!query || `${row.full_name} ${row.email} ${row.whatsapp || ''} ${row.service || ''} ${row.message || ''}`.toLowerCase().includes(query)));
  }

  function renderEnquiries() {
    const body = document.getElementById('enquiriesBody'); if (!body) return;
    const rows = filteredEnquiries();
    const count = state.enquiries.filter(row => row.status === 'new').length;
    const badge = document.getElementById('enquiryCount'); if (badge) badge.textContent = count;
    body.innerHTML = rows.length ? rows.map(row => `<tr><td><b>${esc(row.full_name)}</b><small>${esc(row.email)}</small></td><td>${row.whatsapp ? `<a href="https://wa.me/${attr(String(row.whatsapp).replace(/\D/g,''))}" target="_blank" rel="noopener">${esc(row.whatsapp)}</a>` : '—'}</td><td>${esc(row.service || 'General')}</td><td><b>${esc(row.source || 'Direct')}</b><small>${esc(row.ref_code || row.campaign || '')}</small></td><td><span class="table-clamp">${esc(row.message || '—')}</span></td><td>${A.formatDateTime(row.created_at)}</td><td><span class="status-pill ${row.status === 'new' ? 'warn' : row.status === 'spam' ? 'bad' : row.status === 'closed' ? 'neutral' : 'ok'}">${label(row.status)}</span></td><td><button class="app-btn small gold" data-enquiry-review="${row.id}">Review</button></td></tr>`).join('') : `<tr><td colspan="8">${empty('No website enquiries match this filter.','fa-address-book')}</td></tr>`;
  }

  function openEnquiryReview(id) {
    const row = state.enquiries.find(item => item.id === id); const form = document.getElementById('enquiryReviewForm'); if (!row || !form) return;
    form.reset(); form.elements.enquiry_id.value = id; form.elements.status.value = row.status; form.elements.note.value = row.admin_note || '';
    document.getElementById('enquiryReviewSubtitle').textContent = `${row.full_name} · ${row.email}`;
    document.getElementById('enquiryReviewContent').innerHTML = `<b>${esc(row.service || 'General enquiry')}</b><p>${esc(row.message || 'No message supplied.')}</p><small>${esc(row.whatsapp || '')} · ${A.formatDateTime(row.created_at)}</small>`;
    A.openModal('enquiryReviewModal');
  }

  async function saveEnquiryReview(event) {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const button = form.querySelector('button[type="submit"]'); A.setLoading(button, true, 'Saving...');
    try { const response = await A.supabase.rpc('admin_update_enquiry', { p_enquiry_id: values.enquiry_id, p_status: values.status, p_note: values.note || null }); if (response.error) throw response.error; A.closeModal('enquiryReviewModal'); await refresh(); A.toast('Enquiry updated successfully.', 'success'); }
    catch (error) { A.toast(A.friendlyError(error, 'Could not update this enquiry.'), 'error'); }
    finally { A.setLoading(button, false); }
  }

  function renderLinks() { const body = document.getElementById('linkManagerBody'); if (!body) return; body.innerHTML = state.links.length ? state.links.map(row => { const url = trackedUrl(row); return `<tr><td><b>${esc(row.name)}</b><small class="truncate-url">${esc(url)}</small></td><td><b>${esc(row.ref_code)}</b></td><td>${esc(row.source)}<small>${esc(row.campaign || '—')}</small></td><td>${row.total_clicks || 0}</td><td>${row.unique_visitors || 0}</td><td>${row.signups || 0}</td><td>${row.enrollments || 0}</td><td>${Number(row.conversion_rate || 0).toFixed(1)}%</td><td>${A.formatDateTime(row.last_activity)}</td><td><span class="status-pill ${row.is_active ? 'ok' : 'bad'}">${row.is_active ? 'Active' : 'Disabled'}</span></td><td><div class="table-actions"><button class="app-btn small gold" data-copy-link="${attr(url)}">Copy</button><button class="app-btn small outline" data-edit-link="${row.id}">Edit</button><button class="app-btn small outline" data-toggle-link="${row.id}">${row.is_active ? 'Disable' : 'Enable'}</button></div></td></tr>`; }).join('') : `<tr><td colspan="11">${empty('No tracked links created.', 'fa-link')}</td></tr>`; renderLinkSummary(); }
  function renderLinkSummary() { const summary = document.getElementById('linkSummary'); if (!summary) return; const clicks = state.links.reduce((total, row) => total + Number(row.total_clicks || 0), 0); const unique = state.links.reduce((total, row) => total + Number(row.unique_visitors || 0), 0); const signups = state.links.reduce((total, row) => total + Number(row.signups || 0), 0); const enrollments = state.links.reduce((total, row) => total + Number(row.enrollments || 0), 0); summary.innerHTML = [['Clicks', clicks], ['Unique', unique], ['Signups', signups], ['Enrollments', enrollments]].map(([name, value]) => `<div class="performance-item"><small>${name}</small><b>${value}</b></div>`).join(''); const sources = {}; state.links.forEach(row => { sources[row.source] = (sources[row.source] || 0) + Number(row.enrollments || 0); }); document.getElementById('topSources').innerHTML = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, value]) => `<div class="metric-row"><span>${esc(source)}</span><b>${value} enrollment(s)</b></div>`).join('') || empty('No conversion data yet.', 'fa-chart-simple'); }
  function editLink(id) { const row = state.links.find(item => item.id === id); const form = document.getElementById('linkForm'); if (!row || !form) return; Object.entries(row).forEach(([key, value]) => { const field = form.elements[key]; if (!field) return; field.type === 'checkbox' ? field.checked = Boolean(value) : field.value = value ?? ''; }); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  async function toggleLink(id) { const row = state.links.find(item => item.id === id); if (!row) return; const result = await A.confirmAction({ title: row.is_active ? 'Disable Tracking Link' : 'Enable Tracking Link', message: `${row.is_active ? 'New clicks will no longer be attributed through this link.' : 'Tracking will resume for this link.'}`, confirmText: row.is_active ? 'Disable' : 'Enable', danger: row.is_active }); if (!result.confirmed) return; const response = await A.supabase.from('tracking_links').update({ is_active: !row.is_active }).eq('id', id); if (response.error) A.toast(A.friendlyError(response.error), 'error'); else { await refresh(); A.toast('Tracking link updated.', 'success'); } }


  function renderTeamAccounts() {
    const body=document.getElementById('teamAccountsBody'); if(!body) return;
    body.innerHTML=state.teamAccounts.length?state.teamAccounts.map(row=>`<tr><td><b>${esc(row.display_name)}</b></td><td>${esc(row.username)}</td><td>${esc(row.link_name||'—')}</td><td><code>${esc(row.ref_code||'—')}</code></td><td><span class="status-pill ${row.is_active?'ok':'bad'}">${row.is_active?'Active':'Disabled'}</span></td><td><div class="table-actions"><button class="app-btn small outline" data-edit-team="${row.id}">Edit</button><button class="app-btn small ${row.is_active?'outline':'gold'}" data-toggle-team="${row.id}">${row.is_active?'Disable':'Enable'}</button></div></td></tr>`).join(''):`<tr><td colspan="6">${empty('No team accounts created.','fa-users')}</td></tr>`;
    const select=document.getElementById('teamLinkSelect'); if(select){const old=select.value; select.innerHTML=state.links.map(link=>`<option value="${link.id}">${esc(link.name)} — ${esc(link.ref_code)}</option>`).join('')||'<option value="">Create a tracked link first</option>'; if([...select.options].some(o=>o.value===old))select.value=old;}
  }
  function openTeamAccount(id='') { const form=document.getElementById('teamAccountForm'); if(!form)return; form.reset(); form.elements.team_id.value=''; form.elements.is_active.checked=true; document.getElementById('teamAccountModalTitle').textContent=id?'Edit Team Account':'Add Team Account'; renderTeamAccounts(); if(id){const row=state.teamAccounts.find(x=>x.id===id); if(!row)return; form.elements.team_id.value=row.id; form.elements.display_name.value=row.display_name||''; form.elements.username.value=row.username||''; form.elements.link_id.value=row.link_id||''; form.elements.is_active.checked=Boolean(row.is_active);} A.openModal('teamAccountModal'); }
  async function saveTeamAccount(event){event.preventDefault();const form=event.currentTarget;const v=Object.fromEntries(new FormData(form));if(!v.team_id&&!String(v.password||'').trim())return A.toast('Password is required for a new team account.','error');const button=form.querySelector('button[type="submit"]');A.setLoading(button,true,'Saving...');try{const {error}=await A.supabase.rpc('admin_upsert_team_account',{p_team_id:v.team_id||null,p_display_name:String(v.display_name||'').trim(),p_username:String(v.username||'').trim(),p_password:String(v.password||'').trim()||null,p_link_id:v.link_id,p_is_active:form.elements.is_active.checked});if(error)throw error;A.closeModal('teamAccountModal');await refresh();A.toast('Team account saved.','success');}catch(error){A.toast(A.friendlyError(error),'error');}finally{A.setLoading(button,false);}}
  async function toggleTeamAccount(id){const row=state.teamAccounts.find(x=>x.id===id);if(!row)return;const {error}=await A.supabase.rpc('admin_set_team_account_active',{p_team_id:id,p_is_active:!row.is_active});if(error)return A.toast(A.friendlyError(error),'error');await refresh();A.toast(`Team account ${row.is_active?'disabled':'enabled'}.`,'success');}

  function effective(profile) { return A.effectiveAccessStatus(profile); }
  function filteredUsers() {
    const query = document.getElementById('userSearchV9')?.value.toLowerCase().trim() || '';
    const dateFilter = document.getElementById('userDateFilter')?.value || 'all';
    const verified = document.getElementById('userVerifiedFilter')?.value || 'all';
    const status = document.getElementById('userStatusFilter')?.value || 'all';
    const courseFilter = document.getElementById('userCourseFilter')?.value || 'all';
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return state.profiles.filter(profile => profile.role === 'student').filter(profile => {
      const haystack = `${profile.full_name || ''} ${profile.email || ''} ${profile.whatsapp || ''}`.toLowerCase();
      if (query && !haystack.includes(query)) return false;
      const created = new Date(profile.created_at);
      if (dateFilter === 'today' && (created < today || created >= addDays(today, 1))) return false;
      if (dateFilter === 'yesterday') { const start = addDays(today, -1); if (created < start || created >= today) return false; }
      if (['7','30'].includes(dateFilter)) { const start = addDays(today, -(Number(dateFilter)-1)); if (created < start) return false; }
      if (dateFilter === 'custom') { const from = document.getElementById('userDateFrom')?.value; const to = document.getElementById('userDateTo')?.value; if (from && created < new Date(`${from}T00:00:00`)) return false; if (to && created > new Date(`${to}T23:59:59`)) return false; }
      if (verified === 'verified' && !profile.email_verified) return false;
      if (verified === 'unverified' && profile.email_verified) return false;
      const access = effective(profile);
      if (status === 'lifetime' && !profile.lifetime_access) return false;
      if (status !== 'all' && status !== 'lifetime' && access !== status) return false;
      if (courseFilter !== 'all' && !state.enrollments.some(row => row.student_id === profile.id && row.course_id === courseFilter)) return false;
      return true;
    });
  }

  function setUserDateFilter(value, button) {
    const select = document.getElementById('userDateFilter'); if (select) select.value = value || 'all';
    document.querySelectorAll('[data-user-date-quick]').forEach(item => item.classList.toggle('active', item === button));
    const custom = value === 'custom'; document.getElementById('studentCustomDates')?.classList.toggle('hidden', !custom);
    if (custom && !document.getElementById('userDateFrom')?.value) { const today = startOfLocalDay(new Date()); document.getElementById('userDateTo').value = today.toLocaleDateString('en-CA'); document.getElementById('userDateFrom').value = addDays(today,-6).toLocaleDateString('en-CA'); }
    renderUsers();
  }

  function renderUsers() {
    const body = document.getElementById('studentsBodyV9'); if (!body) return; const rows = filteredUsers();
    const summary = document.getElementById('studentSummaryCards');
    if (summary) {
      const ids = new Set(rows.map(row => row.id));
      const enrollments = state.enrollments.filter(row => ids.has(row.student_id));
      const free = enrollments.filter(row => isFreeCourse(row.course_id)).length;
      const paid = enrollments.filter(row => !isFreeCourse(row.course_id)).length;
      summary.innerHTML = [
        ['fa-users', rows.length, 'Total Users', 'gold'],
        ['fa-user-graduate', new Set(enrollments.map(row => row.student_id)).size, 'Enrolled Users', 'green'],
        ['fa-gift', free, 'Free Enrollments', 'gold'],
        ['fa-crown', paid, 'Paid Enrollments', 'blue']
      ].map(([icon,value,labelText,tone]) => `<div class="student-summary-card ${tone}"><span><i class="fa-solid ${icon}"></i></span><div><b>${value}</b><small>${labelText}</small></div></div>`).join('');
    }
    body.innerHTML = rows.length ? rows.map(profile => {
      const access = effective(profile);
      const enrollments = state.enrollments.filter(row => row.student_id === profile.id).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
      const active = enrollments.find(row => row.status === 'active') || enrollments[0];
      const course = active ? courseById(active.course_id) : null;
      const payment = active ? state.payments.find(row => row.id === active.payment_id) || state.payments.find(row => row.student_id === profile.id && row.course_id === active.course_id && row.status === 'approved') : null;
      const enrollmentLabel = active ? A.statusLabel(active.status) : 'Not Enrolled';
      const paymentHtml = active ? (payment ? `<span class="status-pill ${A.statusClass(payment.status)}">${A.statusLabel(payment.status)}</span>` : (course && isFreeCourse(course.id) ? '<span class="status-pill ok">Free</span>' : '<span class="status-pill warn">No Payment</span>')) : '—';
      return `<tr><td><input type="checkbox" data-user-select value="${profile.id}"></td><td><button class="text-link" data-user-details="${profile.id}"><b>${esc(profile.full_name || 'Student')}</b></button><small>${esc(profile.email || '')}</small></td><td>${esc(profile.whatsapp || '—')}</td><td>${A.formatDateTime(profile.created_at)}</td><td>${course ? `<b>${esc(course.title)}</b><small>${enrollments.length > 1 ? `${enrollments.length} enrollments` : (isFreeCourse(course.id) ? 'Free Course' : 'Paid Course')}</small>` : '<span class="muted">No course</span>'}</td><td><span class="status-pill ${A.statusClass(active?.status || 'pending')}">${enrollmentLabel}</span></td><td>${paymentHtml}</td><td><span class="status-pill ${A.statusClass(access)}">${profile.lifetime_access ? 'Lifetime' : A.statusLabel(access)}</span><small>${profile.lifetime_access ? 'No expiry' : (profile.access_expires_at ? A.formatDateTime(profile.access_expires_at) : 'No expiry set')}</small></td><td><div class="table-actions"><button class="app-btn small outline" data-user-details="${profile.id}">View</button><button class="app-btn small gold" data-manage-enrollment="${profile.id}">Enrollment</button><button class="app-btn small outline" data-manage-access="${profile.id}">Access</button></div></td></tr>`;
    }).join('') : `<tr><td colspan="9">${empty('No users match the selected filters.', 'fa-users')}</td></tr>`;
  }


  async function resendVerificationEmail(id, button) {
    const profile = profileById(id); if (!profile) return;
    if (profile.email_verified) return A.toast('This email is already verified.', 'info');
    A.setLoading(button, true, 'Sending...');
    try {
      const response = await A.supabase.auth.resend({ type: 'signup', email: profile.email, options: { emailRedirectTo: new URL('login.html?tab=student-login', location.href).href } });
      if (response.error) throw response.error;
      A.toast('Verification email requested successfully. Supabase rate limits still apply.', 'success');
    } catch (error) { A.toast(A.friendlyError(error, 'Could not resend verification email.'), 'error'); } finally { A.setLoading(button, false); }
  }

  async function openUserDetails(id) { const profile = profileById(id); if (!profile) return; const enrollments = state.enrollments.filter(row => row.student_id === id); const payments = state.payments.filter(row => row.student_id === id); const activities = state.activities.filter(row => row.user_id === id).slice(0, 50); const supportRows = state.support.filter(row => row.student_id === id); const attribution = state.attributions.find(row => row.user_id === id); document.getElementById('userDetailsTitle').textContent = profile.full_name || 'Student'; document.getElementById('userDetailsSubtitle').textContent = profile.email; document.getElementById('userDetailsContent').innerHTML = `<div class="user-detail-grid"><div class="detail-card"><small>WhatsApp</small><b>${esc(profile.whatsapp || '—')}</b></div><div class="detail-card"><small>Email</small><b>${profile.email_verified ? 'Verified' : 'Unverified'}</b></div><div class="detail-card"><small>Access</small><b>${profile.lifetime_access ? 'Lifetime' : A.statusLabel(effective(profile))}</b></div><div class="detail-card"><small>Expiry</small><b>${profile.lifetime_access ? 'Never' : A.formatDateTime(profile.access_expires_at)}</b></div><div class="detail-card"><small>Source</small><b>${esc(profile.first_source || attribution?.source || 'Direct')}</b></div><div class="detail-card"><small>Reference</small><b>${esc(profile.first_ref || attribution?.ref_code || '—')}</b></div></div><div class="app-grid cols-2"><div class="app-card"><h3>Course Access</h3>${enrollments.map(row => `<div class="metric-row"><span>${esc(courseById(row.course_id)?.title || 'Course')}</span><span class="status-pill ${A.statusClass(row.status)}">${A.statusLabel(row.status)}</span></div>`).join('') || empty('No course enrollment.', 'fa-graduation-cap')}</div><div class="app-card"><h3>Payment History</h3>${payments.map(row => `<div class="metric-row"><span>${esc(courseById(row.course_id)?.title || 'Course')}<small>${esc(row.transaction_reference)}</small></span><span class="status-pill ${A.statusClass(row.status)}">${A.statusLabel(row.status)}</span></div>`).join('') || empty('No payment history.', 'fa-receipt')}</div></div><div class="app-card"><h3>Support Requests</h3>${supportRows.map(row => `<div class="metric-row"><span>${esc(row.subject)}<small>${A.formatDateTime(row.created_at)}</small></span><span class="status-pill ${A.statusClass(row.status)}">${A.statusLabel(row.status)}</span></div>`).join('') || empty('No support requests.', 'fa-headset')}</div><div class="app-card"><div class="app-card-head"><h3>Recent Activity</h3>${profile.email_verified ? '' : `<button class="app-btn small outline" data-resend-verification="${id}">Resend Verification</button>`}<button class="app-btn small gold" data-manage-access="${id}">Manage Access</button></div>${activities.map(row => `<div class="activity-item"><div class="activity-icon"><i class="fa-solid fa-clock-rotate-left"></i></div><div><b>${esc(row.description)}</b><small>${A.formatDateTime(row.created_at)}</small></div></div>`).join('') || empty('No activity recorded yet.', 'fa-clock')}</div>`; A.openModal('userDetailsModal'); }

  function renderAdminNotifications() { const filter = document.getElementById('adminNotificationFilter')?.value || 'all'; const rows = state.notifications.filter(row => filter === 'all' || (filter === 'unread' ? !row.is_read : row.type === filter)); const unread = state.notifications.filter(row => !row.is_read).length; ['adminNotificationCount', 'topPendingCount'].forEach(id => { const element = document.getElementById(id); if (element) element.textContent = unread; }); const list = document.getElementById('adminNotificationsList'); if (!list) return; list.innerHTML = rows.length ? rows.map(row => `<button class="notification-item admin-notification ${row.is_read ? '' : 'unread'} priority-${row.priority}" data-admin-notification="${row.id}"><span class="notification-icon"><i class="fa-solid ${row.type === 'payment' ? 'fa-receipt' : row.type === 'signup' ? 'fa-user-plus' : 'fa-headset'}"></i></span><span><b>${esc(row.title)}</b><small>${esc(row.message)} · ${A.formatDateTime(row.created_at)}</small></span>${row.is_read ? '' : '<i class="fa-solid fa-circle unread-dot"></i>'}</button>`).join('') : empty('No admin notifications in this view.', 'fa-bell'); }
  async function markAdminNotification(id, all = false) { const response = await A.supabase.rpc('admin_mark_notification_read', { p_id: id, p_all: all }); if (response.error) return A.toast(A.friendlyError(response.error), 'error'); await refresh(); }
  async function openAdminNotification(id) { const row = state.notifications.find(item => item.id === id); if (!row) return; if (!row.is_read) await markAdminNotification(id, false); if (row.action_panel) document.querySelector(`[data-goto="${row.action_panel}"]`)?.click(); }

  function filteredEmailQueue() { const query = (document.getElementById('emailSearch')?.value || '').toLowerCase().trim(); const status = document.getElementById('emailStatusFilter')?.value || 'all'; return state.emailQueue.filter(row => (status === 'all' || row.status === status) && (!query || `${row.recipient_email} ${row.template_key} ${row.subject}`.toLowerCase().includes(query))); }
  function renderDelivery() { const counts = {}; state.emailQueue.forEach(row => { counts[row.status] = (counts[row.status] || 0) + 1; }); const kpis = document.getElementById('deliveryKpis'); if (kpis) kpis.innerHTML = [['Pending', counts.pending || 0], ['Processing', counts.processing || 0], ['Sent', counts.sent || 0], ['Failed', counts.failed || 0]].map(([name, value]) => `<div class="app-kpi"><i class="fa-solid fa-envelope"></i><div><b>${value}</b><small>${name} Emails</small></div></div>`).join(''); const body = document.getElementById('emailQueueBody'); if (!body) return; const rows = filteredEmailQueue(); body.innerHTML = rows.length ? rows.map(row => `<tr><td>${esc(row.recipient_email)}</td><td>${esc(row.template_key)}</td><td>${esc(row.subject)}</td><td><span class="status-pill ${A.statusClass(row.status)}">${A.statusLabel(row.status)}</span></td><td>${row.attempts}</td><td>${A.formatDateTime(row.scheduled_at)}</td><td>${esc(row.last_error || '—')}</td><td>${row.status === 'failed' ? `<button class="app-btn small gold" data-retry-email="${row.id}">Retry</button>` : '—'}</td></tr>`).join('') : `<tr><td colspan="8">${empty('Email queue is empty.', 'fa-envelope')}</td></tr>`; }
  async function processEmailQueue() { const button = document.getElementById('processEmailQueue'); A.setLoading(button, true, 'Processing...'); try { const response = await A.supabase.functions.invoke('process-email-queue', { body: { limit: 50, retry_failed: true } }); if (response.error) throw response.error; await refresh(); A.toast(response.data?.message || `${response.data?.sent || 0} email(s) sent.`, 'success'); } catch (error) { A.toast(`Email delivery needs Edge Function configuration: ${A.friendlyError(error)}`, 'error', 6500); } finally { A.setLoading(button, false); } }
  async function retryEmail(id, button) { A.setLoading(button, true, 'Retrying...'); try { const response = await A.supabase.rpc('admin_retry_email', { p_email_id: id }); if (response.error) throw response.error; await refresh(); A.toast('Email moved back to the queue.', 'success'); } catch (error) { A.toast(A.friendlyError(error), 'error'); } finally { A.setLoading(button, false); } }

  function moveCalendar(months) { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + months, 1); renderCalendar(); }
  function calendarEvents() { const rows = []; state.sessions.forEach(row => rows.push({ date: row.starts_at, type: 'class', title: row.title, subtitle: courseById(row.course_id)?.title || 'Course', panel: 'sessions' })); state.courses.forEach(row => { if (row.start_date) rows.push({ date: `${row.start_date}T00:00:00`, type: 'content', title: `${row.title} starts`, panel: 'courses' }); if (row.end_date) rows.push({ date: `${row.end_date}T00:00:00`, type: 'content', title: `${row.title} ends`, panel: 'courses' }); }); ['charts', 'articles', 'announcements'].forEach(key => (window.AdminBase?.state?.[key] || []).forEach(row => { const date = row.publish_at || row.published_at; if (date) rows.push({ date, type: 'content', title: row.title, panel: key }); })); state.profiles.filter(profile => profile.role === 'student' && !profile.lifetime_access && profile.access_expires_at).forEach(profile => rows.push({ date: profile.access_expires_at, type: 'expiry', title: `${profile.full_name || profile.email} access expires`, userId: profile.id, panel: 'students' })); return rows; }
  function renderCalendar() { const root = document.getElementById('adminCalendar'); if (!root) return; const year = calendarCursor.getFullYear(); const month = calendarCursor.getMonth(); document.getElementById('calendarTitle').textContent = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(calendarCursor); const firstDay = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate(); const events = calendarEvents(); const cells = []; for (let i = 0; i < firstDay; i += 1) cells.push('<div class="calendar-cell muted-cell"></div>'); for (let day = 1; day <= days; day += 1) { const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const dayEvents = events.filter(event => new Date(event.date).toLocaleDateString('en-CA') === key); cells.push(`<button class="calendar-cell ${key === new Date().toLocaleDateString('en-CA') ? 'today' : ''}" data-calendar-date="${key}"><b>${day}</b><span class="calendar-dots">${dayEvents.slice(0, 5).map(event => `<i class="${event.type}"></i>`).join('')}</span>${dayEvents.length ? `<small>${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}</small>` : ''}</button>`); } root.innerHTML = `<div class="calendar-weekdays">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div>`; }
  function renderCalendarDay(date) {
    const events = calendarEvents().filter(event => new Date(event.date).toLocaleDateString('en-CA') === date);
    const title = document.getElementById('calendarDayTitle');
    const content = document.getElementById('calendarDayModalContent');
    if (title) title.textContent = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    if (content) content.innerHTML = events.length ? events.map(event => `<button class="activity-item calendar-event-row" ${event.userId ? `data-user-details="${event.userId}"` : `data-goto="${event.panel}"`}><div class="activity-icon ${event.type}"><i class="fa-solid ${event.type === 'class' ? 'fa-video' : event.type === 'expiry' ? 'fa-hourglass-end' : 'fa-calendar-check'}"></i></div><div><b>${esc(event.title)}</b><small>${esc(event.subtitle || '')} · ${A.formatDateTime(event.date)}</small></div></button>`).join('') : empty('No activities on this date.', 'fa-calendar-day');
    A.openModal('calendarDayModal');
  }

  function renderAudit() { const type = document.getElementById('auditType')?.value || 'admin'; const query = (document.getElementById('auditSearch')?.value || '').toLowerCase().trim(); const head = document.getElementById('auditHead'); const body = document.getElementById('auditBody'); if (!head || !body) return; if (type === 'admin') { const rows = state.auditLogs.filter(row => !query || `${row.action} ${row.entity_type} ${JSON.stringify(row.details)}`.toLowerCase().includes(query)); head.innerHTML = '<tr><th>Admin</th><th>Action</th><th>Entity</th><th>Date</th><th>Summary</th></tr>'; body.innerHTML = rows.length ? rows.map(row => `<tr><td>${esc(profileById(row.admin_id)?.full_name || 'System')}</td><td><b>${esc(label(row.action))}</b></td><td>${esc(row.entity_type || '—')}</td><td>${A.formatDateTime(row.created_at)}</td><td><code class="audit-summary">${esc(JSON.stringify(row.details || {}).slice(0, 180))}</code></td></tr>`).join('') : `<tr><td colspan="5">${empty('No admin audit events.', 'fa-shield-halved')}</td></tr>`; } else { const rows = state.activities.filter(row => !query || `${row.description} ${row.activity_type}`.toLowerCase().includes(query)); head.innerHTML = '<tr><th>Student</th><th>Activity</th><th>Entity</th><th>Date</th><th>Details</th></tr>'; body.innerHTML = rows.length ? rows.map(row => `<tr><td><button class="text-link" data-user-details="${row.user_id}">${esc(profileById(row.user_id)?.full_name || 'Student')}</button></td><td><b>${esc(row.description)}</b></td><td>${esc(row.entity_type || '—')}</td><td>${A.formatDateTime(row.created_at)}</td><td><code class="audit-summary">${esc(JSON.stringify(row.details || {}).slice(0, 180))}</code></td></tr>`).join('') : `<tr><td colspan="5">${empty('No user activity events.', 'fa-clock-rotate-left')}</td></tr>`; } }

  function renderSettings() { const general = settingValue('general'); const notifications = settingValue('notifications'); const security = settingValue('security'); const generalForm = document.getElementById('generalSettingsForm'); if (generalForm) { generalForm.elements.brand_name.value = general.brand_name || '24K Excellence'; generalForm.elements.instructor_name.value = general.instructor_name || 'Malik Zameer'; generalForm.elements.timezone.value = general.timezone || 'Asia/Karachi'; } const notificationForm = document.getElementById('notificationSettingsForm'); if (notificationForm) { notificationForm.elements.browser_enabled.checked = notifications.browser_enabled !== false; notificationForm.elements.email_enabled.checked = Boolean(notifications.email_enabled); notificationForm.elements.admin_reauth_minutes.value = security.admin_reauth_minutes || 30; } const health = document.getElementById('systemHealth'); if (health) health.innerHTML = [['Supabase Connection', A.configured], ['V9 Operations SQL', Boolean(state.overview)], ['Admin Role', window.AdminBase?.state?.profile?.role === 'admin'], ['Email Function', Boolean(notifications.email_enabled)]].map(([name, okay]) => `<div class="health-row"><span>${name}</span><span class="status-pill ${okay ? 'ok' : 'warn'}">${okay ? 'Ready' : 'Needs Setup'}</span></div>`).join(''); }
  function settingValue(key) { return state.settings.find(row => row.setting_key === key)?.setting_value || {}; }
  async function saveSetting(key, value, button) { A.setLoading(button, true, 'Saving...'); try { const response = await A.supabase.from('platform_settings').upsert({ setting_key: key, setting_value: value, updated_by: window.AdminBase?.state?.profile?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' }); if (response.error) throw response.error; await refresh(); A.toast('Settings saved successfully.', 'success'); } catch (error) { A.toast(A.friendlyError(error), 'error'); } finally { A.setLoading(button, false); } }
  async function saveGeneralSettings(event) { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); await saveSetting('general', values, event.currentTarget.querySelector('button[type="submit"]')); }
  async function saveNotificationSettings(event) { event.preventDefault(); const form = event.currentTarget; await saveSetting('notifications', { browser_enabled: form.elements.browser_enabled.checked, email_enabled: form.elements.email_enabled.checked }, form.querySelector('button[type="submit"]')); await saveSetting('security', { admin_reauth_minutes: Number(form.elements.admin_reauth_minutes.value || 30) }, form.querySelector('button[type="submit"]')); }

  function renderOperationsDashboard() {
    const students = state.profiles.filter(profile => profile.role === 'student');
    const enrollments = state.enrollments || [];
    const pendingPayments = state.payments.filter(row => ['received', 'under_review'].includes(row.status));
    const approvedPayments = state.payments.filter(row => row.status === 'approved');
    const freeEnrollments = enrollments.filter(row => isFreeCourse(row.course_id)).length;
    const paidEnrollments = enrollments.filter(row => !isFreeCourse(row.course_id)).length;

    const summaryRoot = document.getElementById('adminKpis');
    if (summaryRoot) {
      summaryRoot.className = 'business-summary-grid';
      const cards = [
        { icon: 'fa-users', value: students.length, label: 'Total Users', panel: 'students', tone: 'gold' },
        { icon: 'fa-user-graduate', value: enrollments.length, label: 'Total Enrollments', panel: 'enrollments', tone: 'green' },
        { icon: 'fa-gift', value: freeEnrollments, label: 'Free Enrollments', panel: 'enrollments', tone: 'gold' },
        { icon: 'fa-crown', value: paidEnrollments, label: 'Paid Enrollments', panel: 'enrollments', tone: 'blue' },
        { icon: 'fa-sack-dollar', valueHtml: incomeSummaryHtml(approvedPayments), label: 'Total Income', panel: 'payments', tone: 'green' },
        { icon: 'fa-receipt', value: pendingPayments.length, label: 'Pending Payments', panel: 'payments', tone: 'orange' }
      ];
      summaryRoot.innerHTML = cards.map(card => `<button type="button" class="business-summary-card ${card.tone}" data-goto="${card.panel}"><span class="business-summary-icon"><i class="fa-solid ${card.icon}"></i></span><span class="business-summary-copy">${card.valueHtml || `<b>${card.value}</b>`}<small>${esc(card.label)}</small></span><i class="fa-solid fa-arrow-right business-summary-arrow"></i></button>`).join('');
    }

    renderBusinessAnalytics({ enrollments, freeEnrollments, paidEnrollments, approvedPayments, pendingPayments });
  }

  function isFreeCourse(courseId) {
    const course = courseById(courseId);
    if (!course) return false;
    return course.course_type === 'free' || Number(course.discount_price ?? course.price ?? 0) === 0;
  }

  function paymentCurrency(payment) {
    return String(payment.currency || courseById(payment.course_id)?.currency || 'USD').toUpperCase();
  }

  function incomeTotals(payments) {
    return payments.reduce((totals, payment) => {
      const currency = paymentCurrency(payment);
      totals[currency] = (totals[currency] || 0) + Number(payment.amount || 0);
      return totals;
    }, {});
  }

  function incomeSummaryHtml(payments) {
    const entries = Object.entries(incomeTotals(payments)).filter(([, total]) => Number(total) !== 0).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '<b>0</b>';
    if (entries.length === 1) return `<b>${esc(A.formatMoney(entries[0][1], entries[0][0]))}</b>`;
    return `<b class="multi-money">${entries.slice(0, 2).map(([currency, total]) => `<span>${esc(A.formatMoney(total, currency))}</span>`).join('')}</b>`;
  }

  function renderBusinessAnalytics() {
    const root = document.getElementById('dashboardAnalytics');
    if (!root) return;
    root.innerHTML = '';

    const userEvents = state.profiles
      .filter(profile => profile.role === 'student')
      .map(profile => profile.created_at)
      .filter(Boolean);
    const courseRows = state.enrollments || [];

    try {
      root.insertAdjacentHTML('beforeend', analyticsTrendCard({
        target: 'users',
        eyebrow: 'USERS',
        title: 'User Growth',
        subtitle: 'New student registrations',
        icon: 'fa-users',
        data: userEvents
      }));
    } catch (error) { console.error('User analytics render failed', error); }

    try {
      root.insertAdjacentHTML('beforeend', analyticsTrendCard({
        target: 'courses',
        eyebrow: 'COURSES',
        title: 'Course Enrollments',
        subtitle: 'Free and paid enrollments',
        icon: 'fa-user-graduate',
        data: courseRows
      }));
    } catch (error) { console.error('Course analytics render failed', error); }
  }

  function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function analyticsPeriod(target) {
    const config = analyticsState[target] || analyticsState.users;
    const today = startOfLocalDay(new Date());
    let start;
    let end;

    if (config.range === 'today') {
      start = today; end = addDays(today, 1);
    } else if (config.range === 'yesterday') {
      start = addDays(today, -1); end = today;
    } else if (config.range === 'last_month') {
      start = addDays(today, -29); end = addDays(today, 1);
    } else if (config.range === 'custom' && config.start && config.end) {
      const customStart = new Date(`${config.start}T00:00:00`);
      const customEnd = new Date(`${config.end}T00:00:00`);
      if (!Number.isNaN(customStart.getTime()) && !Number.isNaN(customEnd.getTime()) && customEnd >= customStart) {
        start = customStart; end = addDays(customEnd, 1);
      }
    }

    if (!start || !end) {
      start = addDays(today, -6); end = addDays(today, 1);
    }

    const duration = Math.max(60 * 60 * 1000, end.getTime() - start.getTime());
    return {
      start, end,
      previousStart: new Date(start.getTime() - duration),
      previousEnd: start,
      duration
    };
  }

  function analyticsBuckets(period) {
    const dayMs = 86400000;
    const durationDays = period.duration / dayMs;
    let count = 7;
    if (durationDays <= 2) count = 6;
    else if (durationDays <= 9) count = Math.max(2, Math.round(durationDays));
    else if (durationDays <= 35) count = 6;
    else count = 8;

    const span = period.duration / count;
    return Array.from({ length: count }, (_, index) => {
      const start = new Date(period.start.getTime() + (span * index));
      const end = index === count - 1 ? period.end : new Date(period.start.getTime() + (span * (index + 1)));
      let labelText;
      if (durationDays <= 2) labelText = start.toLocaleTimeString('en-US', { hour: 'numeric' });
      else if (durationDays <= 35) labelText = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      else labelText = start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { start, end, label: labelText, value: 0 };
    });
  }

  function analyticsSeries(events, target) {
    const period = analyticsPeriod(target);
    const buckets = analyticsBuckets(period);
    let current = 0;
    let previous = 0;

    events.forEach(value => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return;
      if (date >= period.start && date < period.end) {
        current += 1;
        const bucket = buckets.find(item => date >= item.start && date < item.end);
        if (bucket) bucket.value += 1;
      } else if (date >= period.previousStart && date < period.previousEnd) {
        previous += 1;
      }
    });

    let change = 0;
    if (previous > 0) change = ((current - previous) / previous) * 100;
    else if (current > 0) change = 100;
    const rounded = Math.round(change * 10) / 10;
    return { period, buckets, current, previous, change: rounded };
  }

  function analyticsEnrollmentSeries(rows, target) {
    const period = analyticsPeriod(target);
    const buckets = analyticsBuckets(period);
    let freeCurrent = 0;
    let paidCurrent = 0;
    let freePrevious = 0;
    let paidPrevious = 0;

    rows.forEach(row => {
      const date = new Date(row.created_at || row.access_started_at || row.updated_at);
      if (Number.isNaN(date.getTime())) return;
      const free = isFreeCourse(row.course_id);
      if (date >= period.start && date < period.end) {
        if (free) freeCurrent += 1; else paidCurrent += 1;
        const bucket = buckets.find(item => date >= item.start && date < item.end);
        if (bucket) bucket.value += 1;
      } else if (date >= period.previousStart && date < period.previousEnd) {
        if (free) freePrevious += 1; else paidPrevious += 1;
      }
    });

    const current = freeCurrent + paidCurrent;
    const previous = freePrevious + paidPrevious;
    let change = 0;
    if (previous > 0) change = ((current - previous) / previous) * 100;
    else if (current > 0) change = 100;
    const rounded = Math.round(change * 10) / 10;
    return {
      period,
      buckets,
      current,
      previous,
      change: rounded,
      freeCurrent,
      paidCurrent,
      freePrevious,
      paidPrevious
    };
  }

  function analyticsPieHtml(series, target) {
    const circumference = 301.593;
    const gid = `analytics-${target}`;

    if (target === 'courses') {
      const free = Math.max(0, Number(series.freeCurrent || 0));
      const paid = Math.max(0, Number(series.paidCurrent || 0));
      const total = free + paid;
      const freePct = total > 0 ? (free / total) * 100 : 0;
      const paidPct = total > 0 ? (paid / total) * 100 : 0;
      const freeLen = total > 0 ? (freePct / 100) * circumference : 0;
      const paidLen = total > 0 ? (paidPct / 100) * circumference : 0;
      const freeGap = freeLen > 8 && paidLen > 0 ? 3.2 : 0;
      const paidGap = paidLen > 8 && freeLen > 0 ? 3.2 : 0;
      const freeDash = Math.max(0, freeLen - freeGap);
      const paidDash = Math.max(0, paidLen - paidGap);
      const paidOffset = -(freeLen + (freeGap ? .8 : 0));
      const zeroMarkup = total <= 0 ? '<div class="analytics-donut-empty"><i class="fa-solid fa-chart-pie"></i><span>No data</span></div>' : '';
      return `<div class="analytics-round-chart professional ${target}" role="img" aria-label="Free and paid course enrollments for the selected period">
        <div class="analytics-donut-shell">
          <svg class="analytics-donut-svg" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="${gid}-free" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#ffd76c"/><stop offset="55%" stop-color="#e3ad20"/><stop offset="100%" stop-color="#d77b2b"/>
              </linearGradient>
              <linearGradient id="${gid}-paid" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#74e49b"/><stop offset="52%" stop-color="#33b96e"/><stop offset="100%" stop-color="#159b8b"/>
              </linearGradient>
              <filter id="${gid}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <circle class="donut-track" cx="60" cy="60" r="48" pathLength="${circumference}"/>
            ${total > 0 ? `<circle class="donut-segment free" cx="60" cy="60" r="48" stroke="url(#${gid}-free)" stroke-dasharray="${freeDash.toFixed(2)} ${(circumference-freeDash).toFixed(2)}" stroke-dashoffset="0" filter="url(#${gid}-glow)"/>` : ''}
            ${paidLen > 0 ? `<circle class="donut-segment paid" cx="60" cy="60" r="48" stroke="url(#${gid}-paid)" stroke-dasharray="${paidDash.toFixed(2)} ${(circumference-paidDash).toFixed(2)}" stroke-dashoffset="${paidOffset.toFixed(2)}"/>` : ''}
          </svg>
          ${zeroMarkup}
          <div class="analytics-donut-center"><b>${total}</b><span>Current Enrollments</span><small>${Math.round(paidPct)}% paid</small></div>
        </div>
        <div class="analytics-pie-legend professional">
          <div><span class="pie-swatch free"></span><span>Free enrollments</span><b>${free}</b><small>${Math.round(freePct)}%</small></div>
          <div><span class="pie-swatch paid"></span><span>Paid enrollments</span><b>${paid}</b><small>${Math.round(paidPct)}%</small></div>
          
        </div>
      </div>`;
    }

    const current = Math.max(0, Number(series.current || 0));
    const previous = Math.max(0, Number(series.previous || 0));
    const total = current + previous;
    const currentPct = total > 0 ? (current / total) * 100 : 0;
    const previousPct = total > 0 ? 100 - currentPct : 0;
    const chartLabel = 'User registrations comparison';
    const currentLen = total > 0 ? (currentPct / 100) * circumference : 0;
    const previousLen = total > 0 ? (previousPct / 100) * circumference : 0;
    const currentGap = currentLen > 8 && previousLen > 0 ? 3.2 : 0;
    const previousGap = previousLen > 8 && currentLen > 0 ? 3.2 : 0;
    const currentDash = Math.max(0, currentLen - currentGap);
    const previousDash = Math.max(0, previousLen - previousGap);
    const previousOffset = -(currentLen + (currentGap ? .8 : 0));
    const zeroMarkup = total <= 0 ? '<div class="analytics-donut-empty"><i class="fa-solid fa-chart-pie"></i><span>No data</span></div>' : '';
    return `<div class="analytics-round-chart professional ${target}" role="img" aria-label="${chartLabel}">
      <div class="analytics-donut-shell">
        <svg class="analytics-donut-svg" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="${gid}-current" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ffd84a"/><stop offset="52%" stop-color="#e7b516"/><stop offset="100%" stop-color="#ef8f1b"/>
            </linearGradient>
            <linearGradient id="${gid}-previous" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#88a6ff"/><stop offset="55%" stop-color="#526fd8"/><stop offset="100%" stop-color="#6d50c9"/>
            </linearGradient>
            <filter id="${gid}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <circle class="donut-track" cx="60" cy="60" r="48" pathLength="${circumference}"/>
          ${total > 0 ? `<circle class="donut-segment current" cx="60" cy="60" r="48" stroke="url(#${gid}-current)" stroke-dasharray="${currentDash.toFixed(2)} ${(circumference-currentDash).toFixed(2)}" stroke-dashoffset="0" filter="url(#${gid}-glow)"/>` : ''}
          ${previousLen > 0 ? `<circle class="donut-segment previous" cx="60" cy="60" r="48" stroke="url(#${gid}-previous)" stroke-dasharray="${previousDash.toFixed(2)} ${(circumference-previousDash).toFixed(2)}" stroke-dashoffset="${previousOffset.toFixed(2)}"/>` : ''}
        </svg>
        ${zeroMarkup}
        <div class="analytics-donut-center"><b>${current}</b><span>Current Users</span><small>${Math.round(currentPct)}%</small></div>
      </div>
      <div class="analytics-pie-legend professional">
        <div><span class="pie-swatch current"></span><span>Selected period</span><b>${current}</b><small>${Math.round(currentPct)}%</small></div>
        <div><span class="pie-swatch previous"></span><span>Previous period</span><b>${previous}</b><small>${Math.round(previousPct)}%</small></div>
        
      </div>
    </div>`;
  }

  function analyticsComparisonText(range) {
    if (range === 'today') return 'vs yesterday';
    if (range === 'yesterday') return 'vs previous day';
    if (range === 'last_week') return 'vs previous 7 days';
    if (range === 'last_month') return 'vs previous 30 days';
    return 'vs previous same period';
  }

  function analyticsTrendCard({ target, eyebrow, title, subtitle, icon, data }) {
    const config = analyticsState[target];
    const series = target === 'courses' ? analyticsEnrollmentSeries(data || [], target) : analyticsSeries(data || [], target);
    const changeTone = series.change > 0 ? 'positive' : series.change < 0 ? 'negative' : 'neutral';
    const changeIcon = series.change > 0 ? 'fa-arrow-trend-up' : series.change < 0 ? 'fa-arrow-trend-down' : 'fa-minus';
    const changeText = `${series.change > 0 ? '+' : ''}${series.change}%`;
    const ranges = [
      ['today', 'Today'], ['yesterday', 'Yesterday'], ['last_week', 'Last Week'], ['last_month', 'Last Month'], ['custom', 'Custom Date']
    ];
    const filterButtons = ranges.map(([range, text]) => `<button type="button" class="analytics-range-btn ${config.range === range ? 'active' : ''}" data-analytics-range data-analytics-target="${target}" data-range="${range}">${text}</button>`).join('');
    const custom = config.range === 'custom' ? `<div class="analytics-custom-range"><label>From<input type="date" value="${attr(config.start)}" data-analytics-custom="${target}-start"></label><label>To<input type="date" value="${attr(config.end)}" data-analytics-custom="${target}-end"></label></div>` : '';
    const labelText = config.range === 'today' ? 'today' : config.range === 'yesterday' ? 'yesterday' : config.range === 'last_month' ? 'last 30 days' : config.range === 'custom' ? 'selected period' : 'last 7 days';
    const detailText = target === 'courses' ? `Free: ${series.freeCurrent || 0} · Paid: ${series.paidCurrent || 0}` : `Previous: ${series.previous}`;
    const compareText = target === 'courses' ? `${analyticsComparisonText(config.range)} · total enrollments` : analyticsComparisonText(config.range);

    return `<section class="analytics-card trend-analytics-card" data-analytics-card="${target}">
      <div class="analytics-head trend-head"><div><span class="analytics-eyebrow">${eyebrow}</span><h3><i class="fa-solid ${icon}"></i> ${title}</h3><p>${subtitle} · ${labelText}</p></div><div class="trend-total"><b>${series.current}</b><small>Total</small></div></div>
      <div class="analytics-range-row">${filterButtons}</div>
      ${custom}
      <div class="analytics-trend-chart round">${analyticsPieHtml(series, target)}</div>
      <div class="analytics-performance-row"><span class="analytics-change ${changeTone}"><i class="fa-solid ${changeIcon}"></i> ${changeText}</span><span>${compareText}</span><small>${detailText}</small></div>
    </section>`;
  }

  function decorateBaseTables() {
    state.support.forEach(row => { const button = document.querySelector(`[data-support-status][data-id="${row.id}"]`); const actions = button?.parentElement; if (actions && !actions.querySelector('[data-support-review]')) actions.insertAdjacentHTML('afterbegin', `<button class="app-btn small gold" data-support-review="${row.id}">Review</button>`); });
  }
  function openSupportReview(id) { const row = state.support.find(item => item.id === id); const form = document.getElementById('supportReviewForm'); if (!row || !form) return; form.reset(); form.elements.request_id.value = id; form.elements.status.value = row.status; form.elements.note.value = row.resolution_note || row.admin_note || ''; document.getElementById('supportReviewSubtitle').textContent = `${profileById(row.student_id)?.full_name || 'Student'} · ${row.category}`; document.getElementById('supportReviewContent').innerHTML = `<b>${esc(row.subject)}</b><p>${esc(row.message)}</p><small>Submitted ${A.formatDateTime(row.created_at)}</small>`; A.openModal('supportReviewModal'); }
  async function saveSupportReview(event) { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const button = form.querySelector('button[type="submit"]'); A.setLoading(button, true, 'Saving...'); try { const response = await A.supabase.rpc('admin_update_support', { p_request_id: values.request_id, p_status: values.status, p_note: values.note || null }); if (response.error) throw response.error; A.closeModal('supportReviewModal'); if (window.AdminBase?.reload) await window.AdminBase.reload(); await refresh(); A.toast('Support request updated successfully.', 'success'); } catch (error) { A.toast(A.friendlyError(error), 'error'); } finally { A.setLoading(button, false); } }

  function renderGlobalSearch() { const input = document.getElementById('adminSearch'); const root = document.getElementById('globalSearchResults'); if (!input || !root) return; const query = input.value.trim().toLowerCase(); if (query.length < 2) { root.classList.add('hidden'); return; } const results = [];
    state.profiles.filter(profile => profile.role === 'student' && `${profile.full_name} ${profile.email} ${profile.whatsapp}`.toLowerCase().includes(query)).slice(0, 5).forEach(profile => results.push({ type: 'User', title: profile.full_name || 'Student', subtitle: profile.email, panel: 'students', id: profile.id, action: 'user' }));
    state.payments.filter(row => `${row.invoice_no} ${row.transaction_reference} ${profileById(row.student_id)?.full_name}`.toLowerCase().includes(query)).slice(0, 5).forEach(row => results.push({ type: 'Payment', title: row.invoice_no || row.transaction_reference, subtitle: profileById(row.student_id)?.full_name || 'Student', panel: 'payments' }));
    state.enquiries.filter(row => `${row.full_name} ${row.email} ${row.whatsapp || ''} ${row.service || ''}`.toLowerCase().includes(query)).slice(0, 5).forEach(row => results.push({ type: 'Enquiry', title: row.full_name, subtitle: row.service || row.email, panel: 'leads' }));
    state.signals.filter(row => `${row.symbol} ${row.notes || ''}`.toLowerCase().includes(query)).slice(0, 5).forEach(row => results.push({ type: 'Signal', title: row.symbol, subtitle: `${row.direction} · ${A.statusLabel(row.status)}`, panel: 'signals' }));
    state.courses.filter(row => `${row.title} ${row.slug}`.toLowerCase().includes(query)).slice(0, 5).forEach(row => results.push({ type: 'Course', title: row.title, subtitle: A.statusLabel(row.status), panel: 'courses' }));
    root.innerHTML = results.length ? results.slice(0, 15).map((row, index) => `<button data-global-result="${index}" data-result-panel="${row.panel}" data-result-action="${row.action || ''}" data-result-id="${row.id || ''}"><span>${esc(row.type)}</span><b>${esc(row.title)}</b><small>${esc(row.subtitle)}</small></button>`).join('') : '<div class="no-search-results">No matching records.</div>'; root._results = results; root.classList.remove('hidden'); }
  function handleGlobalResult(button) { const root = document.getElementById('globalSearchResults'); const row = root?._results?.[Number(button.dataset.globalResult)]; if (!row) return; root.classList.add('hidden'); document.getElementById('adminSearch').value = ''; if (row.action === 'user') openUserDetails(row.id); else document.querySelector(`[data-goto="${row.panel}"]`)?.click(); }

  function exportCsv(name, headers, rows) { downloadText(name, [headers.map(csvCell).join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\n'), 'text/csv'); }
  function exportUsers() { const rows = filteredUsers(); exportCsv('24k-users.csv', ['Name', 'Email', 'WhatsApp', 'Registered', 'Verified', 'Access', 'Expiry', 'Source', 'Reference'], rows.map(profile => [profile.full_name, profile.email, profile.whatsapp, profile.created_at, profile.email_verified, profile.lifetime_access ? 'Lifetime' : effective(profile), profile.access_expires_at, profile.first_source, profile.first_ref])); }
  function exportEnrollments() { exportCsv('24k-enrollments.csv', ['Student', 'Email', 'Course', 'Status', 'Started', 'Expires'], enrollmentRows().map(row => [profileById(row.student_id)?.full_name, profileById(row.student_id)?.email, courseById(row.course_id)?.title, row.status, row.access_started_at, row.access_expires_at])); }
  function exportEnquiries() { exportCsv('24k-enquiries.csv', ['Name','Email','WhatsApp','Service','Source','Reference','Status','Created','Message'], filteredEnquiries().map(row => [row.full_name,row.email,row.whatsapp,row.service,row.source,row.ref_code,row.status,row.created_at,row.message])); }
  function exportLinks() { exportCsv('24k-links.csv', ['Name', 'Reference', 'Source', 'Campaign', 'Clicks', 'Unique', 'Signups', 'Enrollments', 'Conversion'], state.links.map(row => [row.name, row.ref_code, row.source, row.campaign, row.total_clicks, row.unique_visitors, row.signups, row.enrollments, row.conversion_rate])); }
  function exportAudit() { const type = document.getElementById('auditType')?.value || 'admin'; if (type === 'admin') exportCsv('24k-admin-audit.csv', ['Admin', 'Action', 'Entity', 'Date', 'Details'], state.auditLogs.map(row => [profileById(row.admin_id)?.full_name, row.action, row.entity_type, row.created_at, JSON.stringify(row.details)])); else exportCsv('24k-user-activity.csv', ['Student', 'Activity', 'Entity', 'Date', 'Details'], state.activities.map(row => [profileById(row.user_id)?.full_name, row.description, row.entity_type, row.created_at, JSON.stringify(row.details)])); }
  function exportStructure() { exportCsv('24k-course-structure.csv', ['Course', 'Module No', 'Module', 'Lesson No', 'Lesson', 'Type', 'Published'], state.lessons.map(lesson => { const module = state.modules.find(row => row.id === lesson.module_id); return [courseById(lesson.course_id)?.title, module?.module_number, module?.title, lesson.lesson_number, lesson.title, lesson.lesson_type, lesson.is_published]; })); }

  function profileById(id) { return state.profiles.find(row => row.id === id); }
  function courseById(id) { return state.courses.find(row => row.id === id); }

  function subscribeRealtime() { let timer; const reload = () => { clearTimeout(timer); timer = setTimeout(async () => { try { if (window.AdminBase?.reload) await window.AdminBase.reload(); await refresh(); } catch (error) { console.error(error); } }, 400); }; let channel = A.supabase.channel('admin-operations-v9'); ['admin_notifications', 'user_activity_logs', 'email_queue', 'tracking_links', 'enquiries', 'enrollments', 'course_modules', 'course_lessons'].forEach(table => { channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, reload); }); channel.subscribe(); }
})();

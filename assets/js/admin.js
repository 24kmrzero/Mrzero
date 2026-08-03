(async function () {
  const A = window.App;
  const D = window.DEMO_DATA;
  const state = { profile: null, profiles: [], courses: [], sessions: [], sessionLinks: {}, payments: [], signals: [], charts: [], articles: [], announcements: [], resources: [], support: [], methods: [] };
  const result = await A.requireRole('admin');
  if (!result) return;
  state.profile = result.profile;
  A.activateDashboardNavigation();
  document.getElementById('logoutButton').addEventListener('click', A.logout);
  await loadAll();
  renderAll();
  bindEvents();
  subscribeRealtime();
  document.getElementById('pageLoader').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');

  async function loadAll() {
    if (!A.configured) {
      const stored = JSON.parse(localStorage.getItem('k24_demo_admin_data') || 'null');
      state.courses = stored?.courses || structuredClone(D.courses);
      state.sessions = stored?.sessions || structuredClone(D.sessions);
      state.sessionLinks = stored?.sessionLinks || structuredClone(D.sessionLinks);
      state.signals = stored?.signals || structuredClone(D.signals);
      state.charts = stored?.charts || structuredClone(D.charts);
      state.articles = stored?.articles || structuredClone(D.articles);
      state.announcements = stored?.announcements || structuredClone(D.announcements);
      state.resources = stored?.resources || [];
      state.methods = stored?.methods || structuredClone(D.paymentMethods);
      state.payments = JSON.parse(localStorage.getItem('k24_demo_payments') || '[]');
      state.support = JSON.parse(localStorage.getItem('k24_demo_support') || '[]');
      state.profiles = [structuredClone(D.profile)];
      return;
    }
    const sb = A.supabase;
    const responses = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('courses').select('*').order('created_at', { ascending: false }),
      sb.from('course_sessions').select('*').order('starts_at'),
      sb.from('course_session_links').select('*'),
      sb.from('payments').select('*').order('created_at', { ascending: false }),
      sb.from('signals').select('*').order('published_at', { ascending: false }),
      sb.from('charts').select('*').order('published_at', { ascending: false }),
      sb.from('articles').select('*').order('published_at', { ascending: false }),
      sb.from('announcements').select('*').order('published_at', { ascending: false }),
      sb.from('course_resources').select('*').order('created_at', { ascending: false }),
      sb.from('support_requests').select('*').order('created_at', { ascending: false }),
      sb.from('payment_methods').select('*').order('sort_order')
    ]);
    const error = responses.find(r => r.error)?.error;
    if (error) throw error;
    [state.profiles, state.courses, state.sessions, , state.payments, state.signals, state.charts, state.articles, state.announcements, state.resources, state.support, state.methods] = responses.map(r => r.data || []);
    state.sessionLinks = Object.fromEntries((responses[3].data || []).map(row => [row.course_session_id, row.meet_url]));
  }

  function persistDemo() {
    if (A.configured) return;
    localStorage.setItem('k24_demo_admin_data', JSON.stringify({ courses: state.courses, sessions: state.sessions, sessionLinks: state.sessionLinks, signals: state.signals, charts: state.charts, articles: state.articles, announcements: state.announcements, resources: state.resources, methods: state.methods }));
    localStorage.setItem('k24_demo_payments', JSON.stringify(state.payments));
    localStorage.setItem('k24_demo_support', JSON.stringify(state.support));
  }

  function renderAll() {
    populateCourseSelects();
    renderDashboard(); renderSignals(); renderCharts(); renderArticles(); renderAnnouncements(); renderCourses(); renderSessions(); renderResources(); renderPayments(); renderStudents(); renderSupport(); renderMethods();
    const pending = state.payments.filter(p => ['received', 'under_review'].includes(p.status)).length;
    document.getElementById('pendingPaymentCount').textContent = pending;
    document.getElementById('topPendingCount').textContent = pending;
  }

  function renderDashboard() {
    const students = state.profiles.filter(p => p.role === 'student');
    const pending = state.payments.filter(p => ['received', 'under_review'].includes(p.status));
    const revenue = state.payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const activeCourses = state.courses.filter(c => c.status === 'active' && c.is_published).length;
    const upcoming = state.sessions.filter(s => new Date(s.starts_at) >= new Date() && s.status !== 'cancelled');
    const kpis = [
      ['fa-users', students.length, 'Registered Students'], ['fa-hourglass-half', pending.length, 'Payments To Review'],
      ['fa-sack-dollar', A.formatMoney(revenue, 'USD'), 'Approved Revenue'], ['fa-graduation-cap', activeCourses, 'Active Courses'],
      ['fa-video', upcoming.length, 'Upcoming Sessions']
    ];
    document.getElementById('adminKpis').innerHTML = kpis.map(([icon,value,label]) => `<div class="app-kpi"><i class="fa-solid ${icon}"></i><div><b>${value}</b><small>${label}</small></div></div>`).join('');
    document.getElementById('dashboardPayments').innerHTML = pending.length ? pending.slice(0,5).map(p => `<div class="activity-item"><div class="activity-icon"><i class="fa-solid fa-receipt"></i></div><div><b>${A.escapeHtml(profileName(p.student_id))} · ${A.escapeHtml(courseName(p.course_id))}</b><small>${A.escapeHtml(p.invoice_no || '')} · ${A.formatMoney(p.amount, courseCurrency(p.course_id))}</small></div><button class="app-btn small gold" data-review-payment="${p.id}">Review</button></div>`).join('') : empty('No payment currently requires review.', 'fa-circle-check');
    document.getElementById('dashboardSessions').innerHTML = upcoming.length ? upcoming.slice(0,5).map(s => `<div class="activity-item"><div class="activity-icon"><i class="fa-solid fa-video"></i></div><div><b>${A.escapeHtml(s.title)}</b><small>${A.escapeHtml(courseName(s.course_id))} · ${A.formatDateTime(s.starts_at)}</small></div><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></div>`).join('') : empty('No upcoming session.', 'fa-calendar');
  }

  function renderSignals() {
    document.getElementById('signalsBody').innerHTML = state.signals.length ? state.signals.map(s => `<tr><td>${A.formatDateTime(s.published_at)}</td><td><b>${A.escapeHtml(s.symbol)}</b></td><td><span class="direction ${String(s.direction).toLowerCase()}">${A.escapeHtml(s.direction)}</span></td><td>${num(s.entry_from)}${s.entry_to ? ` – ${num(s.entry_to)}` : ''}</td><td>${num(s.stop_loss)}</td><td>${num(s.take_profit_1)}</td><td><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></td><td>${s.result_pips ?? '—'}</td><td><div class="table-actions"><button class="app-btn small outline" data-edit="signal" data-id="${s.id}">Edit</button><button class="app-btn small danger" data-delete="signal" data-id="${s.id}">Delete</button></div></td></tr>`).join('') : `<tr><td colspan="9">${empty('No signals created.', 'fa-bolt')}</td></tr>`;
  }

  function renderCharts() {
    document.getElementById('adminChartsGrid').innerHTML = state.charts.length ? state.charts.map(c => `<article class="content-card"><div class="content-cover ${c.image_url ? 'has-image' : ''}" ${c.image_url ? `style="background-image:url('${attr(c.image_url)}')"` : ''}>${c.image_url ? '' : '<i class="fa-solid fa-chart-line"></i>'}</div><div class="content-body"><div class="course-meta"><span>${A.escapeHtml(c.symbol)}</span><span>${A.escapeHtml(c.timeframe || '')}</span><span class="status-pill ${c.is_published ? 'ok' : 'warn'}">${c.is_published ? 'Published' : 'Draft'}</span></div><h3>${A.escapeHtml(c.title)}</h3><p>${A.escapeHtml(c.summary || '')}</p><div class="card-actions"><button class="app-btn small outline" data-edit="chart" data-id="${c.id}">Edit</button><button class="app-btn small danger" data-delete="chart" data-id="${c.id}">Delete</button></div></div></article>`).join('') : empty('No charts uploaded.', 'fa-chart-line');
  }

  function renderArticles() {
    document.getElementById('adminArticlesGrid').innerHTML = state.articles.length ? state.articles.map(a => `<article class="content-card"><div class="content-cover ${a.cover_url ? 'has-image' : ''}" ${a.cover_url ? `style="background-image:url('${attr(a.cover_url)}')"` : ''}>${a.cover_url ? '' : '<i class="fa-solid fa-newspaper"></i>'}</div><div class="content-body"><div class="course-meta"><span>${A.formatDate(a.published_at)}</span><span class="status-pill ${a.is_published ? 'ok' : 'warn'}">${a.is_published ? 'Published' : 'Draft'}</span></div><h3>${A.escapeHtml(a.title)}</h3><p>${A.escapeHtml(a.excerpt || '')}</p><div class="card-actions"><button class="app-btn small outline" data-edit="article" data-id="${a.id}">Edit</button><button class="app-btn small danger" data-delete="article" data-id="${a.id}">Delete</button></div></div></article>`).join('') : empty('No articles created.', 'fa-newspaper');
  }

  function renderAnnouncements() {
    document.getElementById('adminAnnouncements').innerHTML = state.announcements.length ? state.announcements.map(n => `<article class="announcement ${n.priority === 'important' ? 'important' : ''}"><div class="signal-head"><div><h4>${A.escapeHtml(n.title)}</h4><small>${A.formatDateTime(n.published_at)} · ${n.is_published ? 'Published' : 'Draft'}</small></div><div class="table-actions"><button class="app-btn small outline" data-edit="announcement" data-id="${n.id}">Edit</button><button class="app-btn small danger" data-delete="announcement" data-id="${n.id}">Delete</button></div></div><p>${A.escapeHtml(n.message)}</p></article>`).join('') : empty('No announcements created.', 'fa-bullhorn');
  }

  function renderCourses() {
    document.getElementById('coursesBody').innerHTML = state.courses.length ? state.courses.map(c => `<tr><td><b>${A.escapeHtml(c.title)}</b></td><td>${A.escapeHtml(c.instructor_name || 'Malik Zameer')}</td><td>${A.formatMoney(c.price, c.currency)}</td><td><span class="status-pill ${A.statusClass(c.status)}">${A.statusLabel(c.status)}</span></td><td>${A.formatDate(c.start_date)}</td><td>${c.is_published ? 'Yes' : 'No'}</td><td><div class="table-actions"><button class="app-btn small outline" data-edit="course" data-id="${c.id}">Edit</button><button class="app-btn small danger" data-delete="course" data-id="${c.id}">Delete</button></div></td></tr>`).join('') : `<tr><td colspan="7">${empty('No courses created.', 'fa-graduation-cap')}</td></tr>`;
  }

  function renderSessions() {
    document.getElementById('sessionsBody').innerHTML = state.sessions.length ? state.sessions.map(s => `<tr><td>${s.session_number}</td><td>${A.escapeHtml(courseName(s.course_id))}</td><td><b>${A.escapeHtml(s.title)}</b><br><small>${A.escapeHtml(s.topic || '')}</small></td><td>${A.formatDateTime(s.starts_at)}</td><td>${s.duration_minutes || 90} min</td><td><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></td><td>${state.sessionLinks[s.id] ? '<span class="status-pill ok">Added</span>' : '<span class="status-pill warn">Missing</span>'}</td><td><div class="table-actions"><button class="app-btn small outline" data-edit="session" data-id="${s.id}">Edit</button><button class="app-btn small danger" data-delete="session" data-id="${s.id}">Delete</button></div></td></tr>`).join('') : `<tr><td colspan="8">${empty('No Google Meet sessions scheduled.', 'fa-video')}</td></tr>`;
  }

  function renderResources() {
    document.getElementById('adminResources').innerHTML = state.resources.length ? state.resources.map(r => `<div class="resource-row"><div><b>${A.escapeHtml(r.title)}</b><small class="muted" style="display:block">${A.escapeHtml(courseName(r.course_id))}${r.course_session_id ? ` · Session ${state.sessions.find(s => s.id === r.course_session_id)?.session_number || ''}` : ''} · ${A.escapeHtml(r.file_name || '')}</small></div><button class="app-btn small danger" data-delete="resource" data-id="${r.id}">Delete</button></div>`).join('') : empty('No optional course resource uploaded.', 'fa-folder-open');
  }

  function renderPayments() {
    const query = document.getElementById('paymentSearch')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('paymentStatusFilter')?.value || 'all';
    const rows = state.payments.filter(p => (status === 'all' || p.status === status) && (!query || `${p.invoice_no} ${p.transaction_reference} ${profileName(p.student_id)} ${courseName(p.course_id)}`.toLowerCase().includes(query)));
    document.getElementById('adminPaymentsBody').innerHTML = rows.length ? rows.map(p => `<tr><td><b>${A.escapeHtml(p.invoice_no || 'Pending')}</b></td><td>${A.escapeHtml(profileName(p.student_id))}<br><small>${A.escapeHtml(profileEmail(p.student_id))}</small></td><td>${A.escapeHtml(courseName(p.course_id))}</td><td>${A.formatMoney(p.amount, courseCurrency(p.course_id))}</td><td>${A.escapeHtml(p.payment_method_name || '—')}</td><td>${A.escapeHtml(p.transaction_reference || '—')}</td><td>${A.formatDateTime(p.created_at)}</td><td><span class="status-pill ${A.statusClass(p.status)}">${A.statusLabel(p.status)}</span></td><td><div class="table-actions">${p.receipt_path ? `<button class="app-btn small outline" data-view-receipt="${p.id}">Receipt</button>` : ''}<button class="app-btn small gold" data-review-payment="${p.id}">Review</button></div></td></tr>`).join('') : `<tr><td colspan="9">${empty('No payments match this filter.', 'fa-receipt')}</td></tr>`;
  }

  function renderStudents() {
    const students = state.profiles.filter(p => p.role === 'student');
    document.getElementById('studentsBody').innerHTML = students.length ? students.map(p => `<tr><td><b>${A.escapeHtml(p.full_name || 'Student')}</b></td><td>${A.escapeHtml(p.email || '')}</td><td>${A.escapeHtml(p.whatsapp || '—')}</td><td>${A.escapeHtml(p.country || '—')}</td><td>${A.escapeHtml(p.experience || '—')}</td><td>${A.formatDate(p.created_at)}</td></tr>`).join('') : `<tr><td colspan="6">${empty('No registered students.', 'fa-users')}</td></tr>`;
  }

  function renderSupport() {
    document.getElementById('supportBody').innerHTML = state.support.length ? state.support.map(s => `<tr><td>${A.escapeHtml(profileName(s.student_id))}</td><td>${A.escapeHtml(s.category)}</td><td><b>${A.escapeHtml(s.subject)}</b></td><td>${A.escapeHtml(s.message)}</td><td>${A.formatDateTime(s.created_at)}</td><td><span class="status-pill ${A.statusClass(s.status)}">${A.statusLabel(s.status)}</span></td><td><div class="table-actions">${s.status !== 'resolved' ? `<button class="app-btn small green" data-support-status="resolved" data-id="${s.id}">Resolve</button>` : ''}<button class="app-btn small outline" data-support-status="open" data-id="${s.id}">Reopen</button></div></td></tr>`).join('') : `<tr><td colspan="7">${empty('No support requests.', 'fa-headset')}</td></tr>`;
  }

  function renderMethods() {
    document.getElementById('methodsBody').innerHTML = state.methods.length ? state.methods.map(m => `<tr><td><b>${A.escapeHtml(m.name)}</b></td><td>${A.escapeHtml(m.account_title || '')}</td><td>${A.escapeHtml(m.account_number || '')}</td><td>${A.escapeHtml(m.instructions || '')}</td><td><span class="status-pill ${m.is_active ? 'ok' : 'warn'}">${m.is_active ? 'Active' : 'Inactive'}</span></td><td><div class="table-actions"><button class="app-btn small outline" data-edit="method" data-id="${m.id}">Edit</button><button class="app-btn small danger" data-delete="method" data-id="${m.id}">Delete</button></div></td></tr>`).join('') : `<tr><td colspan="6">${empty('No payment method configured.', 'fa-building-columns')}</td></tr>`;
  }

  function populateCourseSelects() {
    const options = state.courses.map(c => `<option value="${c.id}">${A.escapeHtml(c.title)}</option>`).join('');
    document.getElementById('sessionCourseSelect').innerHTML = options;
    document.getElementById('resourceCourseSelect').innerHTML = options;
    updateResourceSessionOptions();
  }

  function bindEvents() {
    document.querySelectorAll('[data-toggle-form]').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.toggleForm)?.classList.add('open')));
    document.querySelectorAll('[data-cancel-form]').forEach(btn => btn.addEventListener('click', () => { const box = document.getElementById(btn.dataset.cancelForm); box?.classList.remove('open'); box?.querySelector('form')?.reset(); }));
    document.getElementById('resourceCourseSelect').addEventListener('change', updateResourceSessionOptions);
    document.getElementById('paymentStatusFilter').addEventListener('change', renderPayments);
    document.getElementById('paymentSearch').addEventListener('input', renderPayments);
    document.getElementById('adminSearch').addEventListener('input', event => {
      const q = event.currentTarget.value.trim().toLowerCase();
      document.querySelectorAll('.panel.on tbody tr, .panel.on article.content-card, .panel.on .announcement, .panel.on .resource-row').forEach(row => row.classList.toggle('hidden', q && !row.textContent.toLowerCase().includes(q)));
    });

    document.getElementById('signalForm').addEventListener('submit', saveSignal);
    document.getElementById('chartForm').addEventListener('submit', saveChart);
    document.getElementById('articleForm').addEventListener('submit', saveArticle);
    document.getElementById('announcementForm').addEventListener('submit', saveAnnouncement);
    document.getElementById('courseForm').addEventListener('submit', saveCourse);
    document.getElementById('sessionForm').addEventListener('submit', saveSession);
    document.getElementById('resourceForm').addEventListener('submit', saveResource);
    document.getElementById('methodForm').addEventListener('submit', saveMethod);
    document.getElementById('paymentReviewForm').addEventListener('submit', reviewPayment);

    document.body.addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit]'); if (edit) editRecord(edit.dataset.edit, edit.dataset.id);
      const del = event.target.closest('[data-delete]'); if (del) await deleteRecord(del.dataset.delete, del.dataset.id, del);
      const review = event.target.closest('[data-review-payment]'); if (review) openPaymentReview(review.dataset.reviewPayment);
      const receipt = event.target.closest('[data-view-receipt]'); if (receipt) await viewReceipt(receipt.dataset.viewReceipt);
      const support = event.target.closest('[data-support-status]'); if (support) await updateSupport(support.dataset.id, support.dataset.supportStatus, support);
    });
  }

  async function saveSignal(event) {
    event.preventDefault(); const f = event.currentTarget, v = formValues(f), id = v.id || A.uid();
    const row = { id, symbol: v.symbol.toUpperCase(), direction: v.direction, entry_from: n(v.entry_from), entry_to: n(v.entry_to), stop_loss: n(v.stop_loss), take_profit_1: n(v.take_profit_1), take_profit_2: n(v.take_profit_2), take_profit_3: n(v.take_profit_3), status: v.status, result_pips: n(v.result_pips), notes: v.notes, is_published: checked(f,'is_published'), published_at: new Date().toISOString(), created_by: state.profile.id };
    await save('signals', 'signals', row, v.id, f, 'Signal saved.');
  }

  async function saveChart(event) {
    event.preventDefault(); const f = event.currentTarget, v = formValues(f), id = v.id || A.uid(); let imageUrl = v.existing_image_url || '';
    const file = f.elements.image.files[0];
    if (file) imageUrl = await uploadPublic(file, `charts/${id}`);
    const row = { id, title: v.title, symbol: v.symbol.toUpperCase(), timeframe: v.timeframe, summary: v.summary, image_url: imageUrl, is_published: checked(f,'is_published'), published_at: new Date().toISOString(), created_by: state.profile.id };
    await save('charts', 'charts', row, v.id, f, 'Chart saved.');
  }

  async function saveArticle(event) {
    event.preventDefault(); const f = event.currentTarget, v = formValues(f), id = v.id || A.uid(); let coverUrl = v.existing_cover_url || '';
    const file = f.elements.cover.files[0]; if (file) coverUrl = await uploadPublic(file, `articles/${id}`);
    const row = { id, title: v.title, slug: slugify(v.title), excerpt: v.excerpt, content: v.content, cover_url: coverUrl, is_published: checked(f,'is_published'), published_at: new Date().toISOString(), created_by: state.profile.id };
    await save('articles', 'articles', row, v.id, f, 'Article saved.');
  }

  async function saveAnnouncement(event) {
    event.preventDefault(); const f = event.currentTarget, v = formValues(f), id = v.id || A.uid();
    const row = { id, title: v.title, message: v.message, priority: v.priority, is_published: checked(f,'is_published'), published_at: new Date().toISOString(), created_by: state.profile.id };
    await save('announcements', 'announcements', row, v.id, f, 'Announcement saved.');
  }

  async function saveCourse(event) {
    event.preventDefault(); const f = event.currentTarget, v = formValues(f), id = v.id || A.uid();
    const row = { id, title: v.title, slug: slugify(v.title), description: v.description, instructor_name: v.instructor_name || 'Malik Zameer', price: Number(v.price || 0), currency: v.currency, status: v.status, access_days: n(v.access_days), start_date: v.start_date || null, end_date: v.end_date || null, is_published: checked(f,'is_published'), created_by: state.profile.id };
    await save('courses', 'courses', row, v.id, f, 'Course saved.');
  }

  async function saveSession(event) {
    event.preventDefault(); const f = event.currentTarget, v = formValues(f), id = v.id || A.uid(); const button = f.querySelector('button[type="submit"]'); A.setLoading(button,true,'Saving...');
    try {
      const row = { id, course_id: v.course_id, session_number: Number(v.session_number), title: v.title, topic: v.topic, starts_at: pktToIso(v.starts_at), duration_minutes: Number(v.duration_minutes || 90), status: v.status, created_by: state.profile.id };
      if (!A.configured) {
        upsertLocal(state.sessions, row); state.sessionLinks[id] = v.meet_url; persistDemo();
      } else {
        const { error } = v.id ? await A.supabase.from('course_sessions').update(omit(row,'id')).eq('id', id) : await A.supabase.from('course_sessions').insert(row); if (error) throw error;
        const { error: linkError } = await A.supabase.from('course_session_links').upsert({ course_session_id: id, meet_url: v.meet_url, updated_by: state.profile.id }, { onConflict: 'course_session_id' }); if (linkError) throw linkError;
        await loadAll();
      }
      f.reset(); f.elements.id.value=''; document.getElementById('sessionFormBox').classList.remove('open'); renderAll(); A.toast('Google Meet session saved securely.','success');
    } catch(error){A.toast(error.message || 'Could not save session.','error');}
    finally{A.setLoading(button,false);}
  }

  async function saveResource(event) {
    event.preventDefault(); const f=event.currentTarget,v=formValues(f),file=f.elements.file.files[0],button=f.querySelector('button[type="submit"]'); if(!file)return A.toast('Choose a file.','error'); A.setLoading(button,true,'Uploading...');
    try { const id=A.uid(), path=`${v.course_id}/${id}/${A.fileSafeName(file.name)}`; const row={id,course_id:v.course_id,course_session_id:v.course_session_id||null,title:v.title,description:v.description,file_path:path,file_name:file.name,mime_type:file.type,file_size:file.size,created_by:state.profile.id,created_at:new Date().toISOString()};
      if(!A.configured){state.resources.unshift(row);persistDemo();}
      else {const upload=await A.supabase.storage.from('course-resources').upload(path,file,{contentType:file.type});if(upload.error)throw upload.error;const {error}=await A.supabase.from('course_resources').insert(omit(row,'created_at'));if(error){await A.supabase.storage.from('course-resources').remove([path]);throw error;}await loadAll();}
      f.reset();document.getElementById('resourceFormBox').classList.remove('open');renderAll();A.toast('Course resource uploaded.','success');
    } catch(error){A.toast(error.message||'Upload failed.','error');} finally{A.setLoading(button,false);}
  }

  async function saveMethod(event) {
    event.preventDefault();const f=event.currentTarget,v=formValues(f),id=v.id||A.uid();const row={id,name:v.name,account_title:v.account_title,account_number:v.account_number,instructions:v.instructions,sort_order:Number(v.sort_order||0),is_active:checked(f,'is_active')};
    await save('payment_methods','methods',row,v.id,f,'Payment method saved.');
  }

  async function save(table, stateKey, row, existingId, form, message) {
    const button=form.querySelector('button[type="submit"]');A.setLoading(button,true,'Saving...');
    try { if(!A.configured){upsertLocal(state[stateKey],row);persistDemo();}else{const {error}=existingId?await A.supabase.from(table).update(omit(row,'id')).eq('id',row.id):await A.supabase.from(table).insert(row);if(error)throw error;await loadAll();}form.reset();if(form.elements.id)form.elements.id.value='';form.closest('.admin-form-box')?.classList.remove('open');renderAll();A.toast(message,'success');}
    catch(error){A.toast(error.message||'Could not save record.','error');}finally{A.setLoading(button,false);}
  }

  function editRecord(type,id){
    const map={signal:['signals','signalForm','signalFormBox'],chart:['charts','chartForm','chartFormBox'],article:['articles','articleForm','articleFormBox'],announcement:['announcements','announcementForm','announcementFormBox'],course:['courses','courseForm','courseFormBox'],session:['sessions','sessionForm','sessionFormBox'],method:['methods','methodForm','methodFormBox']};
    const [key,formId,boxId]=map[type]||[];if(!key)return;const row=state[key].find(x=>x.id===id);if(!row)return;const f=document.getElementById(formId);f.reset();Object.entries(row).forEach(([k,val])=>{const el=f.elements[k];if(!el)return;if(el.type==='checkbox')el.checked=Boolean(val);else if(k==='starts_at')el.value=isoToPktInput(val);else el.value=val??'';});
    if(type==='chart')f.elements.existing_image_url.value=row.image_url||'';if(type==='article')f.elements.existing_cover_url.value=row.cover_url||'';if(type==='session')f.elements.meet_url.value=state.sessionLinks[id]||'';
    document.getElementById(boxId).classList.add('open');document.getElementById(boxId).scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function deleteRecord(type,id,button){
    if(!confirm('Delete this record? This action cannot be undone.'))return;A.setLoading(button,true,'Deleting...');
    const map={signal:['signals','signals'],chart:['charts','charts'],article:['articles','articles'],announcement:['announcements','announcements'],course:['courses','courses'],session:['course_sessions','sessions'],resource:['course_resources','resources'],method:['payment_methods','methods']};const [table,key]=map[type]||[];
    try {const row=state[key].find(x=>x.id===id);if(!A.configured){state[key]=state[key].filter(x=>x.id!==id);if(type==='session')delete state.sessionLinks[id];persistDemo();}
      else {if(type==='resource'&&row?.file_path)await A.supabase.storage.from('course-resources').remove([row.file_path]);const {error}=await A.supabase.from(table).delete().eq('id',id);if(error)throw error;await loadAll();}renderAll();A.toast('Record deleted.','success');
    }catch(error){A.toast(error.message||'Delete failed.','error');}finally{A.setLoading(button,false);}
  }

  function openPaymentReview(id){const p=state.payments.find(x=>x.id===id);if(!p)return;const f=document.getElementById('paymentReviewForm');f.reset();f.elements.payment_id.value=id;f.elements.status.value=p.status==='approved'?'approved':p.status==='declined'?'declined':'under_review';f.elements.admin_note.value=p.admin_note||'';document.getElementById('reviewPaymentSummary').innerHTML=`<b>${A.escapeHtml(p.invoice_no||'')}</b><br>${A.escapeHtml(profileName(p.student_id))} · ${A.escapeHtml(courseName(p.course_id))}<br>${A.formatMoney(p.amount,courseCurrency(p.course_id))} · Ref: ${A.escapeHtml(p.transaction_reference||'—')}`;A.openModal('paymentReviewModal');}

  async function reviewPayment(event){event.preventDefault();const f=event.currentTarget,v=formValues(f),button=f.querySelector('button[type="submit"]');if(v.status==='declined'&&!v.admin_note.trim())return A.toast('Decline reason is required.','error');A.setLoading(button,true,'Saving decision...');
    try{if(!A.configured){const p=state.payments.find(x=>x.id===v.payment_id);p.status=v.status;p.admin_note=v.admin_note;p.reviewed_at=new Date().toISOString();persistDemo();}
      else{const {error}=await A.supabase.rpc('admin_review_payment',{p_payment_id:v.payment_id,p_status:v.status,p_admin_note:v.admin_note||null});if(error)throw error;await loadAll();}
      A.closeModal('paymentReviewModal');renderAll();A.toast(v.status==='approved'?'Payment approved and course unlocked.':'Payment status updated.','success');
    }catch(error){A.toast(error.message||'Could not update payment.','error');}finally{A.setLoading(button,false);}
  }

  async function viewReceipt(id){const p=state.payments.find(x=>x.id===id);if(!p?.receipt_path)return;if(!A.configured)return A.toast('Demo receipt preview is unavailable.','warning');const {data,error}=await A.supabase.storage.from('payment-receipts').createSignedUrl(p.receipt_path,180);if(error)return A.toast(error.message,'error');window.open(data.signedUrl,'_blank','noopener');}
  async function updateSupport(id,status,button){A.setLoading(button,true,'Updating...');try{if(!A.configured){const row=state.support.find(x=>x.id===id);row.status=status;persistDemo();}else{const {error}=await A.supabase.from('support_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await loadAll();}renderAll();A.toast('Support request updated.','success');}catch(error){A.toast(error.message,'error');}finally{A.setLoading(button,false);}}
  async function uploadPublic(file,prefix){if(file.size>8*1024*1024)throw new Error('Image must be 8 MB or smaller.');if(!A.configured)return URL.createObjectURL(file);const path=`${prefix}/${Date.now()}-${A.fileSafeName(file.name)}`;const {error}=await A.supabase.storage.from('content-assets').upload(path,file,{contentType:file.type});if(error)throw error;return A.supabase.storage.from('content-assets').getPublicUrl(path).data.publicUrl;}
  function updateResourceSessionOptions(){const courseId=document.getElementById('resourceCourseSelect').value;document.getElementById('resourceSessionSelect').innerHTML='<option value="">General Course Resource</option>'+state.sessions.filter(s=>s.course_id===courseId).map(s=>`<option value="${s.id}">Session ${s.session_number}: ${A.escapeHtml(s.title)}</option>`).join('');}

  function subscribeRealtime(){
    if(!A.configured)return;
    let timer;
    const refresh=()=>{clearTimeout(timer);timer=setTimeout(async()=>{try{await loadAll();renderAll();}catch(error){console.error('Realtime refresh failed',error);}},350);};
    A.supabase.channel('admin-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'payments'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'support_requests'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},refresh)
      .subscribe();
  }

  function formValues(form){return Object.fromEntries(new FormData(form).entries());}
  function checked(form,name){return Boolean(form.elements[name]?.checked);}
  function upsertLocal(arr,row){const i=arr.findIndex(x=>x.id===row.id);if(i>=0)arr[i]={...arr[i],...row};else arr.unshift(row);}
  function omit(obj,...keys){return Object.fromEntries(Object.entries(obj).filter(([k])=>!keys.includes(k)));}
  function slugify(text){return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString().slice(-5);}
  function n(value){return value===''||value===null||value===undefined?null:Number(value);}
  function num(value){return value===null||value===undefined?'—':Number(value).toLocaleString('en-US',{maximumFractionDigits:5});}
  function pktToIso(value){return new Date(`${value}:00+05:00`).toISOString();}
  function isoToPktInput(value){if(!value)return'';const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));return parts.replace(' ','T');}
  function profileName(id){return state.profiles.find(p=>p.id===id)?.full_name||'Student';}
  function profileEmail(id){return state.profiles.find(p=>p.id===id)?.email||'';}
  function courseName(id){return state.courses.find(c=>c.id===id)?.title||'Course';}
  function courseCurrency(id){return state.courses.find(c=>c.id===id)?.currency||'USD';}
  function empty(text,icon){return `<div class="empty-state"><i class="fa-solid ${icon}"></i>${A.escapeHtml(text)}</div>`;}
  function attr(value){return A.escapeHtml(value).replace(/`/g,'&#96;');}
})().catch(error=>{console.error(error);window.App?.toast(error.message||'Could not load admin panel.','error');document.getElementById('pageLoader')?.classList.add('hidden');document.getElementById('adminApp')?.classList.remove('hidden');});

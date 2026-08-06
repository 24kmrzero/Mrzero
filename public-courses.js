(async function () {
  const grid = document.getElementById('publicCoursesGrid');
  if (!grid) return;
  const cfg = window.APP_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    grid.innerHTML = empty('Course catalogue is temporarily unavailable.');
    return;
  }

  const client = window.__trackingSupabase || window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const { data, error } = await client.from('courses').select('*').eq('is_published', true).order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    grid.innerHTML = empty('Could not load courses. Please refresh the page.');
    return;
  }
  const courses = data || [];
  grid.innerHTML = courses.length ? courses.map(courseCard).join('') : empty('No course is currently open for enrollment.');

  function courseCard(course) {
    const effectivePrice = course.discount_price !== null && course.discount_price !== undefined ? Number(course.discount_price) : Number(course.price || 0);
    const isFree = course.course_type === 'free' || effectivePrice === 0;
    const params = new URLSearchParams(location.search);
    params.set('course', course.slug);
    const target = isFree ? `free-course/?${params.toString()}` : `sign-up/?${params.toString()}`;
    const status = label(course.status || 'upcoming');
    const price = isFree ? '100% FREE' : money(effectivePrice, course.currency);
    const regular = !isFree && course.discount_price !== null && Number(course.discount_price) < Number(course.price) ? `<small class="public-course-old-price">${money(course.price, course.currency)}</small>` : '';
    return `<article class="big public-course-card reveal ${isFree ? 'free' : ''}">
      <span class="chip ${isFree ? 'beg' : 'prem'}">${isFree ? 'Free Course' : 'Paid Course'}</span>
      <div class="public-course-image ${course.thumbnail_url ? 'has-image' : ''}">${course.thumbnail_url ? `<img src="${attr(course.thumbnail_url)}" alt="${attr(course.title)}" loading="lazy" decoding="async">` : '<i class="fa-solid fa-graduation-cap"></i>'}<span class="public-course-status">${escapeHtml(status)}</span></div>
      <div class="big-head"><div><h3>${escapeHtml(course.title)}</h3><p class="big-sub">— Instructor: ${escapeHtml(course.instructor_name || 'Malik Zameer')}</p><p class="big-desc">${escapeHtml(course.short_description || course.description || '')}</p></div></div>
      <div class="public-course-facts"><span><i class="fa-solid fa-video"></i> Live Google Meet Classes</span><span><i class="fa-solid fa-list-check"></i> Structured Modules & Lessons</span><span><i class="fa-solid fa-calendar"></i> ${course.start_date ? date(course.start_date) : 'Schedule announced by Admin'}</span></div>
      <div class="public-course-price">${regular}<strong>${price}</strong><small>${isFree ? 'NO PAYMENT REQUIRED' : 'PAYMENT APPROVAL REQUIRED'}</small></div>
      ${course.enrollment_open ? `<a href="${attr(target)}" class="btn ${isFree ? 'btn-green' : 'btn-yellow'} btn-block">${isFree ? 'Enroll in Free Course' : 'Enroll & Submit Payment'} <i class="fa-solid fa-arrow-right"></i></a>` : '<button class="btn btn-block" disabled>Enrollment Closed</button>'}
    </article>`;
  }

  function empty(text) {
    return `<div class="public-course-loading"><i class="fa-solid fa-graduation-cap"></i><p>${escapeHtml(text)}</p></div>`;
  }
  function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
  function attr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
  function label(value) { return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase()); }
  function money(value, currency = 'USD') { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value)); } catch { return `${currency} ${Number(value).toFixed(2)}`; } }
  function date(value) { return new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(value)); }
})().catch(error => {
  console.error(error);
  const grid = document.getElementById('publicCoursesGrid');
  if (grid) grid.innerHTML = '<div class="public-course-loading"><i class="fa-solid fa-circle-exclamation"></i><p>Could not load courses.</p></div>';
});

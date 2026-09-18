(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const form = document.getElementById('freeEnrollmentForm');
  const button = document.getElementById('enrollSubmit');
  const success = document.getElementById('enrollSuccess');
  const notice = document.getElementById('linkNotice');
  const toastEl = document.getElementById('toast');
  const params = new URLSearchParams(location.search);

  function toast(message, type = 'info') {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = `show ${type}`;
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => { toastEl.className = ''; }, 4200);
  }

  function setLoading(on) {
    if (!button) return;
    button.disabled = on;
    button.innerHTML = on
      ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Creating Your Account...</span>'
      : '<span>Complete Free Enrollment</span><i class="fa-solid fa-arrow-right"></i>';
  }

  function trackingContext() {
    const t = window.Tracking?.context?.() || {};
    return {
      ref: String(t.ref || params.get('ref') || '').trim(),
      source: String(t.source || params.get('source') || '').trim(),
      campaign: String(t.campaign || params.get('campaign') || '').trim(),
      visitor_id: String(t.visitorId || '').trim(),
      course_slug: String(params.get('course') || params.get('course_slug') || '').trim()
    };
  }

  const initial = trackingContext();
  if (!initial.ref && notice) {
    notice.hidden = false;
    notice.textContent = 'This enrollment page must be opened from an active 24K MR ZERO registration link.';
    if (button) button.disabled = true;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return toast('Enrollment service is not configured.', 'error');

    const data = Object.fromEntries(new FormData(form));
    if (String(data.website || '').trim()) return;

    const fullName = String(data.full_name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const whatsapp = String(data.whatsapp || '').trim();
    const context = trackingContext();

    if (!context.ref) return toast('Please open this page using your official registration link.', 'error');
    if (fullName.length < 2) return toast('Please enter your full name.', 'error');
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Please enter a valid email address.', 'error');
    if (whatsapp.replace(/\D/g, '').length < 7) return toast('Please enter your active WhatsApp number with country code.', 'error');

    setLoading(true);
    try {
      const response = await fetch(`${cfg.SUPABASE_URL}/functions/v1/free-course-enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          whatsapp,
          ref_code: context.ref,
          visitor_id: context.visitor_id || null,
          course_slug: context.course_slug || null,
          accepted_terms: true,
          terms_version: cfg.TERMS_VERSION || '2026-08-03',
          risk_version: cfg.RISK_VERSION || '2026-08-03'
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not complete enrollment.');

      await window.Tracking?.record?.('signup', { course_id: payload.course_id || null, flow: 'tracked_free_enrollment' }).catch(() => {});
      form.hidden = true;
      if (success) success.hidden = false;
      toast('Enrollment completed. Check your email to set your password.', 'success');
      history.replaceState(null, '', '/free-course/');
    } catch (error) {
      console.error(error);
      toast(error?.message || 'Could not complete enrollment. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  });
})();

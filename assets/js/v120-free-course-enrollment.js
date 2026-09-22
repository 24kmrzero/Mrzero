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

  function managerGreeting(manager) {
    const rawName = String(manager?.display_name || 'your manager').trim();
    if (/^(sir|miss|ms\.?|mrs\.?)\s+/i.test(rawName)) return rawName;
    const salutation = String(manager?.salutation || '').trim();
    return salutation ? `${salutation} ${rawName}` : rawName;
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


  async function hydrateLinkDetails() {
    const context = trackingContext();
    if (!context.ref || !window.Tracking?.resolve) return;
    try {
      const link = await window.Tracking.resolve(context.ref);
      if (!link) return;
      const title = String(link.course_title || '24K Free Course').trim();
      const ct = document.getElementById('enrollCourseTitle');
      if (ct) ct.textContent = title;
      const pill = document.getElementById('enrollBatchPill');
      if (pill) pill.innerHTML = `FREE COURSE ENROLLMENT <span>•</span> ${String(link.course_slug || 'CURRENT BATCH').replace(/[-_]+/g,' ').toUpperCase()}`;
      document.title = `${title} Enrollment | 24K MR ZERO`;
    } catch (_) {}
  }

  const initial = trackingContext();
  hydrateLinkDetails();
  if (initial.ref) {
    setTimeout(() => {
      try { window.Tracking?.record?.('form_opened', { course_slug: initial.course_slug || null }, initial.ref); } catch (_) {}
    }, 250);
  }

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

      form.hidden = true;
      if (success) {
        success.hidden = false;
        const manager = payload.manager || {};
        if (manager.whatsapp) {
          const managerName = String(manager.display_name || 'your manager');
          const greetingName = managerGreeting(manager);
          const batch = String(payload.batch_name || payload.course_title || 'the course');
          const clientId = String(payload.client_id || '').trim();
          const lines = [
            `Hello ${greetingName},`,
            `Maine ${batch} mein enrollment complete kar li hai.`,
            clientId ? `Mera Client ID: ${clientId}` : '',
            'Kindly confirm kar dein.'
          ].filter(Boolean);
          const text = lines.join('\n');
          const digits = String(manager.whatsapp).replace(/\D/g, '');
          const href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
          const old = success.querySelector('.manager-connect');
          if (old) old.remove();
          const safeManager = greetingName.replace(/[<>&"']/g,'');
          const safeClient = clientId.replace(/[<>&"']/g,'');
          success.insertAdjacentHTML('beforeend', `<div class="manager-connect"><p>Enrollment complete. You are being connected to <b>${safeManager}</b>.</p><div class="manager-details"><div><small>Client ID</small><b>${safeClient || 'Generated'}</b></div><div><small>Assigned Manager</small><b>${safeManager}</b></div></div><a class="manager-whatsapp" href="${href}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Open WhatsApp</a></div>`);

          let routed = false;
          const recordRoute = async () => {
            if (routed) return;
            routed = true;
            try {
              await window.Tracking?.record?.(
                'whatsapp_routed',
                {
                  course_id: payload.course_id || null,
                  manager_id: manager.team_id || null,
                  enrollment_id: payload.enrollment_id || null
                },
                context.ref
              );
            } catch (_) {}
          };

          success.querySelector('.manager-whatsapp')?.addEventListener('click', () => { recordRoute(); });

          // User requested PipSePaisa-style automatic handoff.
          // WhatsApp still requires the user to press Send; websites cannot silently send a WhatsApp message.
          setTimeout(async () => {
            if (document.visibilityState !== 'visible') return;
            await recordRoute();
            window.location.href = href;
          }, 1400);
        }
      }
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

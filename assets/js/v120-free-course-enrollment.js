(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const form = document.getElementById('freeEnrollmentForm');
  const button = document.getElementById('enrollSubmit');
  const success = document.getElementById('enrollSuccess');
  const notice = document.getElementById('linkNotice');
  const toastEl = document.getElementById('toast');
  const params = new URLSearchParams(location.search);
  let linkReady = false;
  let formOpenedRecorded = false;

  function toast(message, type = 'info') {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = `show ${type}`;
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => { toastEl.className = ''; }, 4200);
  }

  function setLoading(on) {
    if (!button) return;
    button.disabled = on || !linkReady;
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
      ref: String(params.get('ref') || t.ref || '').trim(),
      source: String(t.source || params.get('source') || '').trim(),
      campaign: String(t.campaign || params.get('campaign') || '').trim(),
      visitor_id: String(t.visitorId || '').trim(),
      course_slug: String(params.get('course') || params.get('course_slug') || '').trim()
    };
  }


  async function recordFormOpened(link) {
    if (formOpenedRecorded || !link?.ref_code) return;
    try {
      const eventId = await window.Tracking?.record?.('form_opened', {
        course_id: link.course_id || null,
        course_slug: link.course_slug || null,
        batch_id: link.batch_id || null
      }, link.ref_code);
      if (eventId) formOpenedRecorded = true;
    } catch (_) {}
  }

  async function hydrateLinkDetails(attempt = 0) {
    const context = trackingContext();
    if (!context.ref) return false;
    try {
      let link = null;
      if (window.Tracking?.resolve) link = await window.Tracking.resolve(context.ref);
      if (!link && window.supabase?.createClient && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
        const fallback = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
        const res = await fallback.rpc('resolve_tracking_link', { p_ref_code: context.ref.toLowerCase() });
        if (!res.error) link = res.data;
      }
      if (!link?.course_id || !link?.course_title) throw new Error('Course details not found.');
      if (link.course_enrollment_open === false || ['cancelled','completed'].includes(String(link.course_status||'').toLowerCase())) throw new Error('Enrollment for this course is currently closed.');
      if (link.batch_id && link.batch_enrollment_open === false) throw new Error('Enrollment for the current batch is currently closed.');
      const title = String(link.course_title).trim();
      const ct = document.getElementById('enrollCourseTitle');
      if (ct) ct.textContent = title;
      const pill = document.getElementById('enrollBatchPill');
      if (pill) {
        const batchLabel = link.batch_name || (link.batch_number ? `BATCH ${link.batch_number}` : 'CURRENT BATCH');
        pill.innerHTML = `FREE COURSE ENROLLMENT <span>•</span> ${String(batchLabel).toUpperCase()}`;
      }
      document.title = `${title} Enrollment | 24K MR ZERO`;
      linkReady = true;
      if (button) button.disabled = false;
      if (notice) notice.hidden = true;
      await recordFormOpened(link);
      return true;
    } catch (error) {
      const closed=/currently closed/i.test(String(error?.message||''));
      if (!closed && attempt < 2) {
        setTimeout(() => hydrateLinkDetails(attempt + 1), 350 * (attempt + 1));
      } else {
        linkReady = false;
        if (button) button.disabled = true;
        if (notice) {
          notice.hidden = false;
          notice.textContent = closed ? String(error.message) : 'Could not load this course link. Please reopen the official enrollment link.';
        }
      }
      return false;
    }
  }

  const initial = trackingContext();
  hydrateLinkDetails();
  window.addEventListener('DOMContentLoaded', () => hydrateLinkDetails(), { once:true });

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
    if (!linkReady) return toast('Course details are still loading. Please try again in a moment.', 'error');
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

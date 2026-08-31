(async function () {
  'use strict';
  const { configured, supabase, toast, setLoading, openModal, closeModal, friendlyError, cfg } = window.App;
  const tracking = window.Tracking;
  async function audit(action,status='success',details={},token='') { try { await fetch(`${cfg.SUPABASE_URL}/functions/v1/audit-event`, { method:'POST', headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY,...(token?{'Authorization':`Bearer ${token}`}:{})}, body:JSON.stringify({action,status,actor_email:details.email||null,details}) }); } catch {} }
  if (!configured || !supabase) {
    toast('Website setup is incomplete. Add Supabase URL and publishable key in assets/js/config.js.', 'error');
    document.querySelectorAll('form button[type="submit"]').forEach(button => button.disabled = true);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const tabs = [...document.querySelectorAll('[data-auth-tab]')];
  const forms = [...document.querySelectorAll('[data-auth-form]')];
  const activateTab = key => {
    tabs.forEach(item => item.classList.toggle('on', item.dataset.authTab === key));
    forms.forEach(form => form.classList.toggle('on', form.dataset.authForm === key));
  };
  const cleanAuthPath = key => key === 'signup' ? '/sign-up/' : '/sign-in/';
  const switchStudentTab = key => {
    activateTab(key);
    const next = cleanAuthPath(key);
    if (window.location.pathname !== next) history.replaceState(null, '', `${next}${window.location.search || ''}`);
    document.title = key === 'signup' ? 'Sign Up | 24K Excellence' : 'Sign In | 24K Excellence';
  };
  tabs.forEach(tab => tab.addEventListener('click', () => switchStudentTab(tab.dataset.authTab)));
  const pathTab = /\/sign-up\/?$/i.test(window.location.pathname) ? 'signup' : 'student-login';
  const requestedTab = params.get('tab');
  switchStudentTab(tabs.some(tab => tab.dataset.authTab === requestedTab) ? requestedTab : pathTab);

  const reason = params.get('reason');
  if (reason === 'student-required') toast('Please sign in with a student account.', 'info');

  const checkEmailUrl = () => '/check-email/';
  const studentHome = () => '/student/';
  const studentCourses = () => '/student/courses/';

  function safeDestination(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin) return '';
      return `${url.pathname}${url.search}${url.hash}`;
    } catch { return ''; }
  }

  async function getProfileWithRetry(userId) {
    let lastError = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try { return await window.App.getProfile(userId); }
      catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 250 + attempt * 150));
      }
    }
    throw lastError || new Error('Student profile is not ready yet.');
  }

  async function finishStudentLogin(user, profile = null) {
    profile = profile || await getProfileWithRetry(user.id);
    await tracking?.record('login').catch(() => {});
    const {data:auditSession}=await supabase.auth.getSession(); await audit('student_login','success',{email:user.email||''},auditSession.session?.access_token||'');
    try {
      await supabase.rpc('record_user_activity', {
        p_activity_type: 'login',
        p_description: 'Student signed in',
        p_entity_type: 'profile',
        p_entity_id: profile?.id || null,
        p_details: {}
      });
    } catch (error) { console.warn('Activity log skipped:', error?.message || error); }

    const intent = tracking?.context().courseIntent || profile?.pending_course_slug || null;
    if (intent) {
      try {
        const { data, error } = await supabase.rpc('complete_pending_course_intent', { p_course_slug: intent });
        if (error) throw error;
        if (data?.status === 'enrolled') {
          await tracking?.record('enrollment', { course_id: data.course_id, course_slug: intent || profile?.pending_course_slug || '' }).catch(() => {});
          tracking?.clearCourseIntent();
          sessionStorage.setItem('24k_open_course_id', data.course_id);
          window.location.replace(studentCourses());
          return;
        }
        if (data?.status === 'payment_required') {
          sessionStorage.setItem('24k_open_course_id', data.course_id);
          tracking?.clearCourseIntent();
          window.location.replace(studentCourses());
          return;
        }
      } catch (error) { console.warn('Course intent completion failed:', error?.message || error); }
    }

    const destination = safeDestination(tracking?.context().destination);
    if (destination) tracking?.clearDestination();
    window.location.replace(destination || studentHome());
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    try {
      const profile = await getProfileWithRetry(sessionData.session.user.id);
      if (profile.role !== 'student') {
        await supabase.auth.signOut();
        toast('This page accepts student accounts only.', 'error');
      } else {
        await finishStudentLogin(sessionData.session.user, profile);
        return;
      }
    } catch (error) {
      console.error(error);
      await supabase.auth.signOut().catch(() => {});
    }
  }

  document.getElementById('studentLoginForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const email = String(values.get('email') || '').trim().toLowerCase();
    const password = String(values.get('password') || '');
    setLoading(button, true, 'Signing in...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await getProfileWithRetry(data.user.id);
      if (profile.role !== 'student') {
        await supabase.auth.signOut();
        throw new Error('This account is not registered as a student account.');
      }
      await finishStudentLogin(data.user, profile);
    } catch (error) {
      await audit('login_failed','failed',{email,scope:'student'});
      toast(friendlyError(error, 'Student login failed.'), 'error');
      setLoading(button, false);
    }
  });

  document.getElementById('signupForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form).entries());
    const context = tracking?.context() || {};
    const email = String(values.email || '').trim().toLowerCase();
    setLoading(button, true, 'Creating account...');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: String(values.password || ''),
        options: {
          // This is only a fallback if mandatory Supabase confirmation is accidentally left ON.
          // Normal V9.46 flow uses an immediate session and application-level verification later.
          emailRedirectTo: `${window.location.origin}/sign-in/`,
          data: {
            full_name: String(values.full_name || '').trim(),
            whatsapp: String(values.whatsapp || '').trim(),
            country: String(values.country || '').trim(),
            accepted_terms: true,
            terms_version: cfg.TERMS_VERSION,
            risk_version: cfg.RISK_VERSION,
            first_ref: context.ref || null,
            first_source: context.source || null,
            first_campaign: context.campaign || null,
            visitor_id: context.visitorId || null,
            course_intent: context.courseIntent || null
          }
        }
      });
      if (error) throw error;
      await audit('student_signup','success',{email},data.session?.access_token||'');
      form.reset();

      if (data.session?.user) {
        await tracking?.record('signup').catch(() => {});
        const profile = await getProfileWithRetry(data.session.user.id);
        toast('Account created successfully. Verify your email later from the Student Panel.', 'success');
        await finishStudentLogin(data.session.user, profile);
        return;
      }

      // Safe fallback when Supabase mandatory Confirm Email is still enabled.
      sessionStorage.setItem('24k_pending_signup_email', email);
      localStorage.setItem('24k_pending_signup_email', email);
      toast('Account created. Supabase email confirmation is still enabled.', 'warning');
      window.location.replace(checkEmailUrl());
    } catch (error) {
      await audit('signup_attempt','failed',{email,scope:'student'});
      toast(friendlyError(error, 'Could not create student account.'), 'error');
      setLoading(button, false);
    }
  });

  document.getElementById('forgotPasswordLink')?.addEventListener('click', event => {
    event.preventDefault(); openModal('forgotModal');
  });
  document.getElementById('forgotForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const email = String(new FormData(form).get('email') || '').trim().toLowerCase();
    setLoading(button, true, 'Sending...');
    try {
      sessionStorage.setItem('24k_recovery_kind', 'student');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/`
      });
      if (error) throw error;
      toast('Student password reset link sent.', 'success');
      closeModal('forgotModal'); form.reset();
    } catch (error) { toast(friendlyError(error, 'Could not send reset link.'), 'error'); }
    finally { setLoading(button, false); }
  });
})();

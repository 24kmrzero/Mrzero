(async function () {
  'use strict';
  const { configured, supabase, toast, setLoading, openModal, closeModal, friendlyError, cfg } = window.App;
  const tracking = window.Tracking;
  async function audit(action,status='success',details={},token='') { try { await fetch(`${cfg.SUPABASE_URL}/functions/v1/audit-event`, { method:'POST', headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY,...(token?{'Authorization':`Bearer ${token}`}:{})}, body:JSON.stringify({action,status,actor_email:details.email||null,details}) }); } catch {} }
  if (!configured || !supabase) {
    toast('Website authentication setup is incomplete. Please contact support.', 'error');
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
  if (params.get('verified') === '1') toast('Email verified successfully. You can sign in now.', 'success');

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
    // Deliver any queued transactional emails that belong to this student (welcome, approvals, reminders, etc.).
    try { await supabase.functions.invoke('process-email-queue', { body: { limit: 10, retry_failed: true } }); }
    catch (error) { console.warn('Queued email delivery skipped:', error?.message || error); }

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
      const response = await supabase.functions.invoke('auth-email', {
        body: {
          action: 'signup',
          email,
          password: String(values.password || ''),
          metadata: {
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
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      await audit('student_signup','success',{email});
      form.reset();
      sessionStorage.setItem('24k_pending_signup_email', email);
      localStorage.setItem('24k_pending_signup_email', email);
      toast('Account created. A verification email has been sent. Check Inbox and Spam.', 'success');
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
      const response = await supabase.functions.invoke('auth-email', { body: { action: 'password_reset', email } });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      toast('If an account exists for this email, a secure password reset link has been sent. Check Inbox and Spam.', 'success');
      closeModal('forgotModal'); form.reset();
    } catch (error) {
      console.error('Password reset email failed:', error);
      toast(friendlyError(error, 'Could not send reset link.'), 'error');
    } finally { setLoading(button, false); }
  });

})();

(async function () {
  const { configured, supabase, toast, setLoading, openModal, closeModal, friendlyError, cfg } = window.App;
  const tracking = window.Tracking;
  if (!configured || !supabase) {
    toast('Website setup is incomplete. Add Supabase URL and publishable key in assets/js/config.js.', 'error');
    document.querySelectorAll('form button[type="submit"]').forEach(button => button.disabled = true);
    return;
  }

  const tabs = [...document.querySelectorAll('[data-auth-tab]')];
  const forms = [...document.querySelectorAll('[data-auth-form]')];
  const activateTab = key => {
    tabs.forEach(item => item.classList.toggle('on', item.dataset.authTab === key));
    forms.forEach(form => form.classList.toggle('on', form.dataset.authForm === key));
  };
  tabs.forEach(tab => tab.addEventListener('click', () => activateTab(tab.dataset.authTab)));

  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get('tab');
  if (tabs.some(tab => tab.dataset.authTab === requestedTab)) activateTab(requestedTab);

  const isConfirmed = user => Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const checkEmailUrl = email => `check-email.html?email=${encodeURIComponent(email || '')}`;

  function safeDestination(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin) return '';
      const base = new URL('.', window.location.href).pathname;
      if (!url.pathname.startsWith(base)) return '';
      return `${url.pathname}${url.search}${url.hash}`.replace(base, '');
    } catch { return ''; }
  }

  async function finishStudentLogin(user, profile = null) {
    if (!isConfirmed(user)) {
      await supabase.auth.signOut();
      window.location.replace(checkEmailUrl(user.email));
      return;
    }
    await tracking?.record('login');
    const intent = tracking?.context().courseIntent || profile?.pending_course_slug || null;
    try {
        const { data, error } = await supabase.rpc('complete_pending_course_intent', { p_course_slug: intent });
        if (error) throw error;
        if (data?.status === 'enrolled') {
          await tracking?.record('enrollment', { course_id: data.course_id, course_slug: intent || profile?.pending_course_slug || '' });
          tracking?.clearCourseIntent();
          sessionStorage.setItem('24k_open_course_id', data.course_id);
          window.location.replace(`student-dashboard.html#courses`);
          return;
        }
        if (data?.status === 'payment_required') {
          sessionStorage.setItem('24k_open_course_id', data.course_id);
          tracking?.clearCourseIntent();
          window.location.replace(`student-dashboard.html#courses`);
          return;
        }
      } catch (error) {
        console.warn('Course intent completion failed:', error.message || error);
      }
    const destination = safeDestination(tracking?.context().destination);
    if (destination) tracking?.clearDestination();
    window.location.replace(destination || 'student-dashboard.html');
  }

  const adminLoginRequested = requestedTab === 'admin-login' || params.get('mode') === 'admin';
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    try {
      const profile = await window.App.getProfile(sessionData.session.user.id);
      if (adminLoginRequested) {
        if (profile.role === 'admin') {
          window.location.replace('admin-dashboard.html');
          return;
        }
        // A student session must never bounce an explicit Admin Login request
        // back to the Student Panel. Close it and let Admin credentials be entered.
        await supabase.auth.signOut();
        activateTab('admin-login');
        toast('Student session closed. Enter your Admin credentials.', 'info');
      } else {
        if (profile.role === 'admin') window.location.replace('admin-dashboard.html');
        else await finishStudentLogin(sessionData.session.user, profile);
        return;
      }
    } catch (error) {
      console.error(error);
      if (adminLoginRequested) {
        await supabase.auth.signOut().catch(() => {});
        activateTab('admin-login');
      }
    }
  }

  async function handleLogin(form, expectedRole) {
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const email = String(values.get('email') || '').trim().toLowerCase();
    const password = String(values.get('password') || '');
    setLoading(button, true, 'Signing in...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (/confirm|verified/i.test(error.message || '')) window.location.href = checkEmailUrl(email);
        throw error;
      }
      const profile = await window.App.getProfile(data.user.id);
      if (profile.role !== expectedRole) {
        await supabase.auth.signOut();
        throw new Error(expectedRole === 'admin' ? 'This account does not have Admin access.' : 'Please use the Admin tab for this account.');
      }
      if (expectedRole === 'admin') window.location.replace('admin-dashboard.html');
      else await finishStudentLogin(data.user, profile);
    } catch (error) {
      toast(friendlyError(error, 'Login failed.'), 'error');
      setLoading(button, false);
    }
  }

  document.getElementById('studentLoginForm')?.addEventListener('submit', event => {
    event.preventDefault(); handleLogin(event.currentTarget, 'student');
  });
  document.getElementById('adminLoginForm')?.addEventListener('submit', event => {
    event.preventDefault(); handleLogin(event.currentTarget, 'admin');
  });

  document.getElementById('signupForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form).entries());
    const context = tracking?.context() || {};
    const email = String(values.email).trim().toLowerCase();
    setLoading(button, true, 'Creating account...');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: String(values.password),
        options: {
          emailRedirectTo: new URL('login.html?tab=student-login', window.location.href).href,
          data: {
            full_name: String(values.full_name).trim(),
            whatsapp: String(values.whatsapp).trim(),
            country: String(values.country).trim(),
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
      form.reset();
      if (data.session && isConfirmed(data.user)) {
        await tracking?.record('signup');
        toast('Account created successfully.', 'success');
        const profile = await window.App.getProfile(data.user.id);
        await finishStudentLogin(data.user, profile);
      } else {
        localStorage.setItem('24k_pending_signup_email', email);
        window.location.replace(checkEmailUrl(email));
      }
    } catch (error) {
      toast(friendlyError(error, 'Could not create account.'), 'error');
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('reset-password.html', window.location.href).href
      });
      if (error) throw error;
      toast('Password reset link sent.', 'success');
      closeModal('forgotModal'); form.reset();
    } catch (error) { toast(friendlyError(error, 'Could not send reset link.'), 'error'); }
    finally { setLoading(button, false); }
  });
})();

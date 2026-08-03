(async function () {
  const { configured, supabase, toast, setLoading, openModal, closeModal, cfg } = window.App;
  if (!configured || !supabase) {
    toast('Website setup is incomplete. Add Supabase URL and anon key in assets/js/config.js.', 'error');
    document.querySelectorAll('form button[type="submit"]').forEach(button => button.disabled = true);
    return;
  }

  const tabs = [...document.querySelectorAll('[data-auth-tab]')];
  const forms = [...document.querySelectorAll('[data-auth-form]')];
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(item => item.classList.toggle('on', item === tab));
    forms.forEach(form => form.classList.toggle('on', form.dataset.authForm === tab.dataset.authTab));
  }));

  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  const requestedButton = tabs.find(tab => tab.dataset.authTab === requestedTab);
  if (requestedButton) requestedButton.click();

  if (configured) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      try {
        const profile = await window.App.getProfile(data.session.user.id);
        window.location.replace(profile.role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html');
        return;
      } catch (error) { console.error(error); }
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
      if (error) throw error;
      const profile = await window.App.getProfile(data.user.id);
      if (profile.role !== expectedRole) {
        await supabase.auth.signOut();
        throw new Error(expectedRole === 'admin' ? 'This account does not have admin access.' : 'Please use the Admin tab for this account.');
      }
      window.location.replace(expectedRole === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html');
    } catch (error) {
      toast(error.message || 'Login failed.', 'error');
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
    setLoading(button, true, 'Creating account...');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: String(values.email).trim().toLowerCase(),
        password: String(values.password),
        options: {
          emailRedirectTo: new URL('login.html', window.location.href).href,
          data: {
            full_name: String(values.full_name).trim(),
            whatsapp: String(values.whatsapp).trim(),
            country: String(values.country).trim(),
            accepted_terms: true,
            terms_version: cfg.TERMS_VERSION,
            risk_version: cfg.RISK_VERSION
          }
        }
      });
      if (error) throw error;
      form.reset();
      if (data.session) {
        toast('Account created successfully.', 'success');
        setTimeout(() => window.location.href = 'student-dashboard.html', 500);
      } else {
        toast('Account created. Check your email to confirm your account.', 'success');
        tabs[0].click();
      }
    } catch (error) {
      toast(error.message || 'Could not create account.', 'error');
    } finally { setLoading(button, false); }
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
    } catch (error) { toast(error.message || 'Could not send reset link.', 'error'); }
    finally { setLoading(button, false); }
  });
})();

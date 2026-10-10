(async function () {
  const A = window.App;
  async function audit(action,status='success',details={},token=''){try{await fetch(`${A.cfg.SUPABASE_URL}/functions/v1/audit-event`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','apikey':A.cfg.SUPABASE_ANON_KEY,...(token?{'Authorization':`Bearer ${token}`}:{})},body:JSON.stringify({action,status,actor_email:details.email||null,details})});}catch{}}
  if (!A.configured || !A.supabase) {
    A.toast('Admin authentication setup is incomplete. Please contact support.', 'error');
    document.querySelectorAll('form button[type="submit"]').forEach(button => button.disabled = true);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('reason') === 'admin-required') A.toast('Please sign in with an authorized Admin account.', 'info');
  if (params.get('reason') === 'api-auth-unavailable') A.toast('Database API authentication is temporarily unavailable (PGRST303). Login credentials are valid; please try again shortly.', 'error', 10000);

  // Attach the submit handler BEFORE restoring an old session. A broken or
  // expired refresh token must never block a fresh password login.
  let loginInProgress = false;
  document.getElementById('adminLoginForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (loginInProgress) return;
    loginInProgress = true;
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const email = String(values.get('email') || '').trim().toLowerCase();
    const password = String(values.get('password') || '');
    A.setLoading(button, true, 'Signing in securely...');
    try {
      const { data, error } = await A.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.user || !data?.session?.access_token) throw new Error('Sign in did not return an active session. Please retry.');

      let profile;
      try {
        profile = await A.getProfile(data.user.id);
      } catch (firstError) {
        // A PGRST303 means PostgREST rejected the JWT claims even though Auth
        // accepted it. The core profile method already retried this token.
        // Refreshing JWT immediately would restart the issued-at race.
        if (String(firstError?.code || '').toUpperCase() === 'PGRST303') throw firstError;
        console.warn('[24K Admin] First profile check failed, verifying session.', firstError?.message || firstError);
        const verified = await A.supabase.auth.getUser();
        if (verified.error || verified.data?.user?.id !== data.user.id) {
          const refreshed = await A.supabase.auth.refreshSession();
          if (refreshed.error || !refreshed.data?.session?.user ||
              refreshed.data.session.user.id !== data.user.id) {
            throw verified.error || refreshed.error || firstError;
          }
        }
        profile = await A.getProfile(data.user.id);
      }
      if (!['admin','super_admin'].includes(profile?.role) || (profile?.status && profile.status !== 'active')) {
        await A.supabase.auth.signOut({scope:'local'});
        throw new Error('This account is not authorized for Admin access.');
      }

      // Logging is best-effort, and must not hold up the Admin redirect.
      void audit('admin_login','success',{email},data.session.access_token);
      A.toast('Admin login successful.', 'success');
      window.location.replace('/admin/');
    } catch (error) {
      void audit('login_failed','failed',{email,scope:'admin'});
      A.toast(A.friendlyError(error, 'Admin login failed.'), 'error');
      A.setLoading(button, false);
      loginInProgress = false;
    }
  });

  // Reuse an existing valid Admin session when possible. A stale session must
  // not sign out a new login that starts while this async check is running.
  void (async () => {
    try {
      const { data: sessionData, error } = await A.supabase.auth.getSession();
      if (error || loginInProgress || !sessionData?.session?.user) return;
      const profile = await A.getProfile(sessionData.session.user.id);
      if (loginInProgress) return;
      if (['admin','super_admin'].includes(profile?.role) && (!profile.status || profile.status === 'active')) {
        window.location.replace('/admin/');
        return;
      }
      if (!loginInProgress) {
        await A.supabase.auth.signOut({scope:'local'});
        A.toast('This account does not have Admin access.', 'error');
      }
    } catch (error) {
      // A failed check of a previous session is not a failed password login.
      // The submit button is already active so the user can sign in again.
      console.warn('[24K Admin] Saved session check skipped:', error?.message || error);
    }
  })();

  document.getElementById('adminForgotPasswordLink')?.addEventListener('click', event => {
    event.preventDefault(); A.openModal('adminForgotModal');
  });

  document.getElementById('adminForgotForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const email = String(new FormData(form).get('email') || '').trim().toLowerCase();
    A.setLoading(button, true, 'Sending...');
    try {
      sessionStorage.setItem('24k_recovery_kind', 'admin');
      const response = await A.supabase.functions.invoke('auth-email', { body: { action: 'password_reset', email } });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      A.toast('If this Admin account exists, a secure password reset link has been sent. Check Inbox and Spam.', 'success');
      A.closeModal('adminForgotModal');
    } catch (error) {
      console.error('Admin password reset email failed:', error);
      A.toast(A.friendlyError(error, 'Could not send Admin reset link.'), 'error');
    } finally {
      A.setLoading(button, false);
    }
  });

})();

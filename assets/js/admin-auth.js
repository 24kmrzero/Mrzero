(async function () {
  const A = window.App;
  if (!A.configured || !A.supabase) {
    A.toast('Website setup is incomplete. Configure Supabase before using Admin Login.', 'error');
    document.querySelectorAll('form button[type="submit"]').forEach(button => button.disabled = true);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('reason') === 'admin-required') A.toast('Please sign in with an authorized Admin account.', 'info');

  const { data: sessionData } = await A.supabase.auth.getSession();
  if (sessionData.session?.user) {
    try {
      const profile = await A.getProfile(sessionData.session.user.id);
      if (profile.role === 'admin') {
        window.location.replace('/admin/');
        return;
      }
      await A.supabase.auth.signOut();
      A.toast('This account does not have Admin access.', 'error');
    } catch (error) {
      console.error(error);
      await A.supabase.auth.signOut().catch(() => {});
    }
  }

  document.getElementById('adminLoginForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const email = String(values.get('email') || '').trim().toLowerCase();
    const password = String(values.get('password') || '');
    A.setLoading(button, true, 'Signing in securely...');
    try {
      const { data, error } = await A.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await A.getProfile(data.user.id);
      if (profile.role !== 'admin') {
        await A.supabase.auth.signOut();
        throw new Error('This account is not authorized for Admin access.');
      }
      A.toast('Admin login successful.', 'success');
      window.location.replace('/admin/');
    } catch (error) {
      A.toast(A.friendlyError(error, 'Admin login failed.'), 'error');
      A.setLoading(button, false);
    }
  });

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
      const { error } = await A.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/`
      });
      if (error) throw error;
      A.toast('Admin password reset link sent.', 'success');
      A.closeModal('adminForgotModal');
    } catch (error) {
      A.toast(A.friendlyError(error, 'Could not send Admin reset link.'), 'error');
    } finally {
      A.setLoading(button, false);
    }
  });
})();

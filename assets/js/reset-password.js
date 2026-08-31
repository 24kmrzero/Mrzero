(async function () {
  'use strict';

  const A = window.App || {};
  const sb = A.supabase;
  const title = document.getElementById('resetTitle');
  const lead = document.getElementById('resetLead');
  const spinner = document.getElementById('resetSpinner');
  const status = document.getElementById('resetStatus');
  const form = document.getElementById('resetPasswordForm');
  const actions = document.getElementById('resetActions');
  const requestNewLink = document.getElementById('requestNewLink');
  const submit = document.getElementById('resetSubmit');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');

  let accountRole = sessionStorage.getItem('24k_recovery_kind') || '';

  function decode(value) {
    try { return decodeURIComponent(String(value || '').replace(/\+/g, ' ')); }
    catch { return String(value || ''); }
  }

  function authErrorFromUrl() {
    const search = new URLSearchParams(location.search);
    const hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    const error = hash.get('error') || search.get('error') || '';
    const code = hash.get('error_code') || search.get('error_code') || '';
    const description = hash.get('error_description') || search.get('error_description') || '';
    return error || code || description ? { error, code, description: decode(description) } : null;
  }

  function showError(message) {
    spinner?.classList.add('reset-hidden');
    form?.classList.add('reset-hidden');
    actions?.classList.remove('reset-hidden');
    status.className = 'reset-status error show';
    status.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i><span></span>';
    status.querySelector('span').textContent = message;
    title.textContent = 'Reset link expired or invalid';
    lead.textContent = 'For security, password recovery links can only be used for a limited time and only once.';
    requestNewLink.href = accountRole === 'student' ? '/sign-in/' : '/admin-login/';
  }

  function showReady(role) {
    accountRole = role || accountRole || 'student';
    sessionStorage.setItem('24k_recovery_kind', accountRole);
    spinner?.classList.add('reset-hidden');
    actions?.classList.add('reset-hidden');
    form?.classList.remove('reset-hidden');
    title.textContent = accountRole === 'admin' ? 'Set a new Admin password' : 'Set a new password';
    lead.textContent = accountRole === 'admin'
      ? 'Enter a new password for your authorized Admin account.'
      : 'Enter a new password for your student account.';
  }

  if (!A.configured || !sb) {
    showError('Password recovery is unavailable because the website authentication configuration is incomplete.');
    return;
  }

  const urlError = authErrorFromUrl();
  if (urlError) {
    showError(urlError.description || 'This recovery link is invalid or has expired. Please request a new one.');
    return;
  }

  async function resolveSession() {
    let { data, error } = await sb.auth.getSession();
    if (!error && data?.session?.user) return data.session;

    const code = new URLSearchParams(location.search).get('code');
    if (code) {
      const exchanged = await sb.auth.exchangeCodeForSession(code);
      if (!exchanged.error && exchanged.data?.session?.user) return exchanged.data.session;
    }

    return await new Promise(resolve => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        subscription?.unsubscribe?.();
        resolve(null);
      }, 2500);
      const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
        if (settled || !session?.user) return;
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          settled = true;
          clearTimeout(timeout);
          listener?.subscription?.unsubscribe?.();
          resolve(session);
        }
      });
      const subscription = listener?.subscription;
    });
  }

  try {
    const session = await resolveSession();
    if (!session?.user) {
      showError('This recovery link is no longer valid. Please request a new password reset email.');
      return;
    }

    let role = accountRole;
    try {
      const profile = await A.getProfile(session.user.id);
      if (profile?.role === 'admin') role = 'admin';
      else if (profile?.role === 'student') role = 'student';
    } catch (error) {
      console.warn('Could not resolve recovery account role:', error?.message || error);
    }
    showReady(role || 'student');

    // Remove one-time auth tokens/code from the visible address bar after the session is established.
    history.replaceState(null, '', '/reset-password/');
  } catch (error) {
    console.error(error);
    showError(A.friendlyError ? A.friendlyError(error, 'Could not validate this password recovery link.') : (error?.message || 'Could not validate this password recovery link.'));
    return;
  }

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const password = String(newPassword.value || '');
    const confirm = String(confirmPassword.value || '');
    status.className = 'reset-status';

    if (password.length < 8) {
      status.className = 'reset-status error show';
      status.textContent = 'Password must be at least 8 characters.';
      return;
    }
    if (password !== confirm) {
      status.className = 'reset-status error show';
      status.textContent = 'Both password fields must match.';
      return;
    }

    if (A.setLoading) A.setLoading(submit, true, 'Updating password...');
    else submit.disabled = true;

    try {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;

      status.className = 'reset-status success show';
      status.innerHTML = '<i class="fa-solid fa-circle-check"></i><span>Password updated successfully. Redirecting to login...</span>';
      form.classList.add('reset-hidden');
      sessionStorage.removeItem('24k_recovery_kind');
      await sb.auth.signOut().catch(() => {});

      setTimeout(() => {
        location.replace(accountRole === 'admin' ? '/admin-login/?reason=password-reset' : '/sign-in/?reason=password-reset');
      }, 1200);
    } catch (error) {
      status.className = 'reset-status error show';
      status.textContent = A.friendlyError ? A.friendlyError(error, 'Could not update password.') : (error?.message || 'Could not update password.');
      if (A.setLoading) A.setLoading(submit, false);
      else submit.disabled = false;
    }
  });
})();

(function () {
  'use strict';

  const THEME_KEY = '24k-excellence-theme';

  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; }
    catch { return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; }
  }

  function applyTheme(theme, persist = true) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    if (persist) {
      try { localStorage.setItem(THEME_KEY, next); } catch {}
    }
    const light = next === 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#F6F7F9' : '#0A0A0A');
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
      button.setAttribute('title', light ? 'Switch to dark theme' : 'Switch to light theme');
      button.innerHTML = `<i class="fa-solid ${light ? 'fa-moon' : 'fa-sun'}"></i>`;
      button.classList.toggle('is-light', light);
    });
    document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: next } }));
    return next;
  }

  function initTheme() {
    applyTheme(currentTheme(), false);
    if (document.documentElement.dataset.themeBound) return;
    document.documentElement.dataset.themeBound = '1';
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-theme-toggle]');
      if (!button) return;
      event.preventDefault();
      applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
    });
  }

  initTheme();

  const cfg = window.APP_CONFIG || {};
  const configured = Boolean(
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !String(cfg.SUPABASE_URL).includes('YOUR_') &&
    !String(cfg.SUPABASE_ANON_KEY).includes('YOUR_')
  );

  const authScope = document.documentElement.dataset.authScope || 'student';
  let projectRef = '24k';
  try { projectRef = new URL(cfg.SUPABASE_URL).hostname.split('.')[0] || '24k'; } catch {}
  const authStorageKey = authScope === 'admin'
    ? `sb-${projectRef}-admin-auth-token`
    : `sb-${projectRef}-auth-token`;

  let supabase = null;
  if (configured && window.supabase?.createClient) {
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {
        storageKey: authStorageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  const formatMoney = (amount, currency = 'USD') => {
    if (Number(amount) === 0) return 'Free';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));
    } catch {
      return `${currency} ${Number(amount || 0).toFixed(2)}`;
    }
  };

  const formatDate = (value, options = {}) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', ...options
    }).format(date);
  };

  const formatDateTime = (value, timeZone = cfg.DEFAULT_TIMEZONE || 'Asia/Karachi') => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone
    }).format(date);
  };

  const effectiveAccessStatus = profile => {
    if (!profile) return 'locked';
    if (profile.role === 'admin') return 'active';
    if (profile.email_verified === false) return 'pending';
    if (['locked', 'suspended', 'pending'].includes(profile.status)) return profile.status;
    if (profile.lifetime_access) return 'active';
    const now = new Date();
    const expiry = profile.access_expires_at ? new Date(profile.access_expires_at) : null;
    const grace = profile.grace_expires_at ? new Date(profile.grace_expires_at) : null;
    if (!expiry) return profile.status || 'active';
    if (expiry > now) return 'active';
    if (grace && grace > now) return 'grace';
    return 'expired';
  };

  const statusLabel = value => ({
    initiated: 'Payment Started', received: 'Receipt Received', pending: 'Pending Approval', grace: 'Grace Active',
    locked: 'Locked', expired: 'Expired', suspended: 'Suspended', under_review: 'Under Review',
    approved: 'Approved', declined: 'Declined', resubmission_required: 'New Receipt Required',
    upcoming: 'Upcoming', active: 'Active', live: 'Live Now', completed: 'Completed',
    cancelled: 'Cancelled', archived: 'Archived', open: 'Open', in_progress: 'In Progress',
    resolved: 'Resolved', closed: 'Closed',
    tp_hit: 'TP Hit', tp1_hit: 'TP1 Hit', tp2_hit: 'TP2 Hit', tp3_hit: 'TP3 Hit',
    tp4_hit: 'TP4 Hit', sl_hit: 'SL Hit', breakeven: 'Breakeven',
    breakeven_hit: 'Breakeven Hit', manually_closed: 'Closed Manually',
    market: 'Market', limit: 'Limit', stop: 'Stop', draft: 'Draft', published: 'Published',
    processing: 'Processing', sent: 'Sent', failed: 'Failed', lifetime: 'Lifetime'
  })[value] || String(value || '').replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());

  const statusClass = value => {
    if (['approved', 'active', 'live', 'completed', 'tp_hit', 'tp1_hit', 'tp2_hit', 'tp3_hit', 'tp4_hit', 'published', 'resolved', 'sent'].includes(value)) return 'ok';
    if (['declined', 'sl_hit', 'cancelled', 'locked', 'expired', 'suspended', 'failed'].includes(value)) return 'bad';
    if (['initiated', 'received', 'under_review', 'resubmission_required', 'upcoming', 'breakeven', 'breakeven_hit', 'manually_closed', 'draft', 'pending', 'grace', 'in_progress', 'processing'].includes(value)) return 'warn';
    return 'neutral';
  };

  function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
    const raw = String(error?.message || error || '').trim();
    const lower = raw.toLowerCase();
    if (!raw) return fallback;
    if (lower.includes('permission denied') || lower.includes('row-level security') || lower.includes('rls')) return 'Your account does not have permission for this action. Please refresh or contact support.';
    if (lower.includes('jwt') || lower.includes('session') || lower.includes('not authenticated')) return 'Your session has expired. Please sign in again.';
    if (lower.includes('duplicate') || lower.includes('unique constraint')) return 'This record already exists. Please review the duplicate information.';
    if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('load failed')) return 'Network connection failed. Check your internet and try again.';
    if (lower.includes('storage') && lower.includes('policy')) return 'File upload permission is not configured correctly.';
    if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.';
    if (lower.includes('email not confirmed')) return 'Please verify your email before signing in.';
    if (lower.includes('rate limit')) return 'Too many attempts. Please wait a few minutes and try again.';
    return raw.length > 180 ? fallback : raw;
  }

  function toast(message, type = 'info', duration = 3800) {
    let element = document.getElementById('appToast');
    if (!element) {
      element = document.createElement('div');
      element.id = 'appToast';
      element.className = 'app-toast';
      element.setAttribute('role', 'status');
      element.setAttribute('aria-live', 'polite');
      document.body.appendChild(element);
    }
    element.className = `app-toast show ${type}`;
    element.textContent = message;
    clearTimeout(element._timer);
    element._timer = setTimeout(() => element.classList.remove('show'), duration);
  }

  function setLoading(button, loading, text = 'Please wait...') {
    if (!button) return;
    if (loading) {
      if (!button.dataset.original) button.dataset.original = button.innerHTML;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(text)}`;
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      if (button.dataset.original) {
        button.innerHTML = button.dataset.original;
        delete button.dataset.original;
      }
    }
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => modal.querySelector('input:not([type="hidden"]),select,textarea,button')?.focus(), 40);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.app-modal.open')) document.body.classList.remove('modal-open');
  }

  function ensureConfirmModal() {
    if (document.getElementById('appConfirmModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="app-modal" id="appConfirmModal" aria-hidden="true">
        <div class="app-modal-card confirm-card">
          <div class="app-modal-head"><div><h3 id="appConfirmTitle">Confirm Action</h3><small id="appConfirmSubtitle" class="muted"></small></div><button class="modal-close" type="button" data-close-modal="appConfirmModal"><i class="fa-solid fa-xmark"></i></button></div>
          <div class="app-modal-body"><div class="confirm-icon" id="appConfirmIcon"><i class="fa-solid fa-circle-question"></i></div><p id="appConfirmMessage"></p><label class="confirm-input-wrap hidden" id="appConfirmInputWrap"><span id="appConfirmInputLabel">Reason</span><textarea id="appConfirmInput"></textarea></label></div>
          <div class="app-modal-foot"><button class="app-btn outline" type="button" id="appConfirmCancel">Cancel</button><button class="app-btn gold" type="button" id="appConfirmAccept">Confirm</button></div>
        </div>
      </div>`);
  }

  function confirmAction(options = {}) {
    ensureConfirmModal();
    const {
      title = 'Confirm Action', message = 'Are you sure?', subtitle = '',
      confirmText = 'Confirm', danger = false, requireText = false,
      inputLabel = 'Reason', inputPlaceholder = '', initialValue = ''
    } = options;
    const modal = document.getElementById('appConfirmModal');
    const accept = document.getElementById('appConfirmAccept');
    const cancel = document.getElementById('appConfirmCancel');
    const inputWrap = document.getElementById('appConfirmInputWrap');
    const input = document.getElementById('appConfirmInput');
    document.getElementById('appConfirmTitle').textContent = title;
    document.getElementById('appConfirmSubtitle').textContent = subtitle;
    document.getElementById('appConfirmMessage').textContent = message;
    document.getElementById('appConfirmInputLabel').textContent = inputLabel;
    input.placeholder = inputPlaceholder;
    input.value = initialValue;
    inputWrap.classList.toggle('hidden', !requireText);
    accept.textContent = confirmText;
    accept.className = `app-btn ${danger ? 'danger' : 'gold'}`;
    document.getElementById('appConfirmIcon').className = `confirm-icon ${danger ? 'danger' : ''}`;
    openModal('appConfirmModal');

    return new Promise(resolve => {
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        cleanup();
        closeModal('appConfirmModal');
        resolve(result);
      };
      const onAccept = () => {
        const text = input.value.trim();
        if (requireText && !text) {
          input.focus();
          toast(`${inputLabel} is required.`, 'error');
          return;
        }
        finish({ confirmed: true, text });
      };
      const onCancel = () => finish({ confirmed: false, text: '' });
      const onBackdrop = event => { if (event.target === modal) onCancel(); };
      const onKey = event => { if (event.key === 'Escape') onCancel(); };
      const cleanup = () => {
        accept.removeEventListener('click', onAccept);
        cancel.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
      };
      accept.addEventListener('click', onAccept);
      cancel.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

  document.addEventListener('click', event => {
    const closer = event.target.closest('[data-close-modal]');
    if (closer) closeModal(closer.dataset.closeModal);
    if (event.target.classList.contains('app-modal') && event.target.id !== 'appConfirmModal') closeModal(event.target.id);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const modal = [...document.querySelectorAll('.app-modal.open')].pop();
    if (modal && modal.id !== 'appConfirmModal') closeModal(modal.id);
  });

  function activateDashboardNavigation() {
    const side = document.getElementById('side');
    const open = key => {
      const links = [...document.querySelectorAll('[data-panel]')];
      const panels = [...document.querySelectorAll('.panel')];
      if (!panels.some(panel => panel.id === `p-${key}`)) return false;
      links.forEach(link => link.classList.toggle('on', link.dataset.panel === key));
      panels.forEach(panel => panel.classList.toggle('on', panel.id === `p-${key}`));
      side?.classList.remove('open');
      if (history.replaceState) history.replaceState(null, '', `#${key}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.dispatchEvent(new CustomEvent('panel:open', { detail: { key } }));
      return true;
    };

    if (!document.documentElement.dataset.navBound) {
      document.documentElement.dataset.navBound = '1';
      document.addEventListener('click', event => {
        const target = event.target.closest('[data-panel],[data-goto]');
        if (!target) return;
        const key = target.dataset.panel || target.dataset.goto;
        if (open(key)) event.preventDefault();
      });
    }

    document.getElementById('burger')?.addEventListener('click', () => side?.classList.toggle('open'));
    const initial = location.hash.replace('#', '');
    if (initial) setTimeout(() => open(initial), 0);
    return open;
  }

  async function getCurrentUser() {
    if (!configured || !supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key in assets/js/config.js.');

    // Read the persisted local session first. This prevents a normal page refresh
    // from being treated as a logout while Supabase is restoring/refreshing tokens.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError && !/session.*missing/i.test(sessionError.message || '')) throw sessionError;
    if (!sessionData?.session?.user) return null;

    // Validate with the server when possible. If the network/token refresh is briefly
    // unavailable, keep the valid persisted user instead of forcing a logout.
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const message = String(error.message || '');
      if (/session.*missing|refresh token.*not found|invalid refresh token/i.test(message)) return null;
      console.warn('Session validation temporarily unavailable; using persisted session:', message);
      return sessionData.session.user;
    }
    return data?.user || sessionData.session.user;
  }

  async function getProfile(userId) {
    if (!configured || !supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key in assets/js/config.js.');
    try { await supabase.rpc('sync_current_access_status'); } catch (error) { console.warn('Access status sync skipped:', error?.message || error); }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  }

  async function requireRole(role) {
    const loginUrl = role === 'admin' ? 'admin-login.html' : 'login.html?tab=student-login';
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No active session');
      const profile = await getProfile(user.id);
      if (profile.role !== role) {
        await supabase.auth.signOut().catch(() => {});
        const reason = role === 'admin' ? 'admin-required' : 'student-required';
        window.location.replace(`${loginUrl}${loginUrl.includes('?') ? '&' : '?'}reason=${reason}`);
        return null;
      }
      return { user, profile };
    } catch (error) {
      console.error(error);
      window.location.replace(loginUrl);
      return null;
    }
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    window.location.replace(authScope === 'admin' ? 'admin-login.html' : 'login.html');
  }

  async function hashFile(file) {
    if (!file?.arrayBuffer || !window.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  const fileSafeName = name => String(name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  window.App = {
    cfg, configured, supabase, authScope, authStorageKey, escapeHtml, formatMoney, formatDate, formatDateTime,
    statusLabel, statusClass, effectiveAccessStatus, friendlyError, toast, setLoading,
    openModal, closeModal, confirmAction, activateDashboardNavigation,
    currentTheme, applyTheme, initTheme,
    getCurrentUser, getProfile, requireRole, logout, hashFile, fileSafeName, uid
  };
})();

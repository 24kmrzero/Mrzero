(function () {
  const cfg = window.APP_CONFIG || {};
  const configured = Boolean(
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes('YOUR_') && !cfg.SUPABASE_ANON_KEY.includes('YOUR_')
  );
  let supabase = null;
  if (configured && window.supabase?.createClient) {
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[ch]);

  const formatMoney = (amount, currency = 'USD') => {
    if (Number(amount) === 0) return 'Free';
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount)); }
    catch { return `${currency} ${Number(amount).toFixed(2)}`; }
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
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      hour12: true, timeZone
    }).format(date);
  };

  const statusLabel = value => ({
    received: 'Receipt Received', under_review: 'Under Review', approved: 'Approved', declined: 'Declined',
    upcoming: 'Upcoming', active: 'Active', live: 'Live Now', completed: 'Completed', cancelled: 'Cancelled',
    tp_hit: 'TP Hit', sl_hit: 'SL Hit', breakeven: 'Breakeven', closed: 'Closed', draft: 'Draft', published: 'Published'
  })[value] || String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  const statusClass = value => {
    if (['approved', 'active', 'live', 'completed', 'tp_hit', 'published'].includes(value)) return 'ok';
    if (['declined', 'sl_hit', 'cancelled'].includes(value)) return 'bad';
    if (['received', 'under_review', 'upcoming', 'breakeven', 'draft'].includes(value)) return 'warn';
    return 'neutral';
  };

  function toast(message, type = 'info') {
    let el = document.getElementById('appToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'appToast';
      el.className = 'app-toast';
      document.body.appendChild(el);
    }
    el.className = `app-toast show ${type}`;
    el.textContent = message;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function setLoading(button, loading, text = 'Please wait...') {
    if (!button) return;
    if (loading) {
      button.dataset.original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(text)}`;
    } else {
      button.disabled = false;
      if (button.dataset.original) button.innerHTML = button.dataset.original;
    }
  }

  function openModal(id) {
    document.getElementById(id)?.classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
    if (!document.querySelector('.app-modal.open')) document.body.classList.remove('modal-open');
  }
  document.addEventListener('click', event => {
    const closer = event.target.closest('[data-close-modal]');
    if (closer) closeModal(closer.dataset.closeModal);
    if (event.target.classList.contains('app-modal')) closeModal(event.target.id);
  });

  function activateDashboardNavigation() {
    const side = document.getElementById('side');
    const links = [...document.querySelectorAll('[data-panel]')];
    const panels = [...document.querySelectorAll('.panel')];
    const open = key => {
      links.forEach(link => link.classList.toggle('on', link.dataset.panel === key));
      panels.forEach(panel => panel.classList.toggle('on', panel.id === `p-${key}`));
      side?.classList.remove('open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.dispatchEvent(new CustomEvent('panel:open', { detail: { key } }));
    };
    links.forEach(link => link.addEventListener('click', event => {
      event.preventDefault(); open(link.dataset.panel);
    }));
    document.querySelectorAll('[data-goto]').forEach(button => button.addEventListener('click', event => {
      event.preventDefault(); open(button.dataset.goto);
    }));
    document.getElementById('burger')?.addEventListener('click', () => side?.classList.toggle('open'));
    return open;
  }

  async function getCurrentUser() {
    if (!configured) {
      const role = localStorage.getItem('k24_demo_role');
      if (!role) return null;
      return { id: role === 'admin' ? 'admin-demo' : window.DEMO_DATA.profile.id, email: role === 'admin' ? 'admin@24kexcellence.com' : window.DEMO_DATA.profile.email };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async function getProfile(userId) {
    if (!configured) {
      const role = localStorage.getItem('k24_demo_role') || 'student';
      return role === 'admin'
        ? { id: 'admin-demo', full_name: 'Administrator', email: 'admin@24kexcellence.com', role: 'admin' }
        : window.DEMO_DATA.profile;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  }

  async function requireRole(role) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No active session');
      const profile = await getProfile(user.id);
      if (profile.role !== role) {
        window.location.replace(profile.role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html');
        return null;
      }
      return { user, profile };
    } catch (error) {
      console.error(error);
      window.location.replace(role === 'admin' ? 'login.html?tab=admin-login' : 'login.html?tab=student-login');
      return null;
    }
  }

  async function logout() {
    if (configured) await supabase.auth.signOut();
    localStorage.removeItem('k24_demo_role');
    window.location.replace('login.html');
  }

  const fileSafeName = name => String(name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  window.App = {
    cfg, configured, supabase, escapeHtml, formatMoney, formatDate, formatDateTime,
    statusLabel, statusClass, toast, setLoading, openModal, closeModal,
    activateDashboardNavigation, getCurrentUser, getProfile, requireRole, logout,
    fileSafeName, uid
  };
})();

(function () {
  'use strict';

  function setMobileActive(key) {
    document.querySelectorAll('.student-mobile-nav [data-goto]').forEach(function (button) {
      var active = button.getAttribute('data-goto') === key;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function initials(value) {
    return String(value || 'Member').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0); }).join('').toUpperCase() || 'M';
  }

  function syncMemberIdentity(state) {
    if (!state || !state.profile) return;
    var name = state.profile.full_name || 'Member';
    var nameEl = document.getElementById('sideMemberName');
    var avatarEl = document.getElementById('sideMemberAvatar');
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = initials(name);
  }

  document.addEventListener('panel:open', function (event) {
    if (event && event.detail && event.detail.key) setMobileActive(event.detail.key);
  });

  window.addEventListener('24k:student-base-updated', function (event) {
    syncMemberIdentity(event.detail);
  });

  document.addEventListener('DOMContentLoaded', function () {
    setMobileActive('dashboard');
    if (window.StudentBase && window.StudentBase.state) syncMemberIdentity(window.StudentBase.state);
  });
})();

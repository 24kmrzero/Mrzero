(function () {
  'use strict';

  // This file is intentionally temporary. It only neutralizes the legacy
  // visual access-lock layer while access rules are being redesigned.
  window.__24K_TEMP_OPEN_ACCESS__ = true;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function unlockNavigation(root) {
    var scope = root || document;
    var allowedPanels = new Set(['dashboard','signals','charts','articles','courses','notifications','payments','announcements','profile','support']);

    scope.querySelectorAll('[data-panel],[data-goto]').forEach(function (el) {
      var key = el.getAttribute('data-panel') || el.getAttribute('data-goto') || '';
      if (!allowedPanels.has(key)) return;
      el.classList.remove('disabled','locked','is-locked','access-locked','restricted');
      el.removeAttribute('disabled');
      el.removeAttribute('aria-disabled');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('opacity');
      el.style.removeProperty('filter');
    });
  }

  function cleanLegacyAccessUi(root) {
    var scope = root || document;

    // Hide the old Access Status section/nav for this temporary open-access phase.
    scope.querySelectorAll('a,[data-panel],[data-goto]').forEach(function (el) {
      var key = normalizeText(el.getAttribute('data-panel') || el.getAttribute('data-goto'));
      var text = normalizeText(el.textContent);
      if (key === 'access' || key === 'access-status' || text === 'access status') {
        el.classList.add('temp-access-hidden');
      }
    });
    scope.querySelectorAll('section[id*="access"],section[data-panel*="access"]').forEach(function (el) {
      el.classList.add('temp-access-hidden');
    });

    // Remove only legacy lock warnings; payment status messages elsewhere remain intact.
    scope.querySelectorAll('.notice,.alert,[role="alert"],.access-banner,.access-warning').forEach(function (el) {
      var text = normalizeText(el.textContent);
      if (
        text.includes('protected content is locked') ||
        text.includes('protected content stays limited') ||
        text.includes('access is pending approval') ||
        text.includes('course access will unlock only after admin approval')
      ) {
        el.classList.add('temp-access-hidden');
      }
    });

    // Defensive cleanup if the legacy layer paints items as disabled after realtime refreshes.
    scope.querySelectorAll('.app-nav a').forEach(function (el) {
      var text = normalizeText(el.textContent);
      if (['signals','charts','articles','courses','notifications','payments','announcements','profile','support','dashboard'].some(function (name) { return text.startsWith(name); })) {
        el.classList.remove('disabled','locked','is-locked','access-locked','restricted');
        el.removeAttribute('disabled');
        el.removeAttribute('aria-disabled');
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('opacity');
        el.style.removeProperty('filter');
      }
    });
  }

  function apply() {
    document.body && document.body.classList.add('student-open-access');
    unlockNavigation(document);
    cleanLegacyAccessUi(document);
  }

  var scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      apply();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }

  var observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','disabled','aria-disabled','style'] });
  window.addEventListener('24k:student-base-updated', scheduleApply);
  window.addEventListener('load', scheduleApply);
})();

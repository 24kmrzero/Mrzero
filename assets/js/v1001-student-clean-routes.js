(function () {
  'use strict';
  if (window.__24K_V1001_CLEAN_ROUTES__) return;
  window.__24K_V1001_CLEAN_ROUTES__ = '10.01';

  var ROUTES = {
    dashboard: '/student/',
    courses: '/student/courses/',
    signals: '/student/signals/',
    charts: '/student/charts/',
    articles: '/student/articles/',
    updates: '/student/updates/',
    profile: '/student/profile/'
  };

  var SECTION_ALIASES = {
    home: 'dashboard',
    student: 'dashboard',
    dashboard: 'dashboard',
    course: 'courses',
    courses: 'courses',
    signal: 'signals',
    signals: 'signals',
    chart: 'charts',
    charts: 'charts',
    article: 'articles',
    articles: 'articles',
    payment: 'courses',
    payments: 'courses',
    update: 'updates',
    updates: 'updates',
    notification: 'updates',
    notifications: 'updates',
    profile: 'profile',
    account: 'profile'
  };

  var busy = false;
  var cleanTimer = 0;

  function normalizeSection(value) {
    value = String(value || '').toLowerCase().replace(/^#/, '').replace(/^\/+|\/+$/g, '').trim();
    return SECTION_ALIASES[value] || (ROUTES[value] ? value : '');
  }

  function sectionFromPath(pathname) {
    var path = String(pathname || '').toLowerCase().replace(/\/+$/, '/');
    if (path === '/student/' || path === '/student/index.html' || path === '/student/dashboard/' || path === '/student/dashboard/index.html') return 'dashboard';
    var match = path.match(/^\/student\/(courses|signals|charts|articles|updates|profile)(?:\/|\/index\.html)?$/);
    if (match) return normalizeSection(match[1]);
    if (/\/student-dashboard\.html$/.test(path)) return normalizeSection(location.hash) || 'dashboard';
    return '';
  }

  function sectionFromUrl(urlLike) {
    try {
      var u = new URL(urlLike, location.href);
      if (u.origin !== location.origin) return '';
      var byPath = sectionFromPath(u.pathname);
      var byHash = normalizeSection(u.hash);
      return byHash || byPath;
    } catch (_) {
      return '';
    }
  }

  function cleanUrl(section) {
    return ROUTES[section] || ROUTES.dashboard;
  }

  function dispatchSection(section) {
    section = normalizeSection(section) || 'dashboard';
    var oldURL = location.href;
    var shellHash = section === 'dashboard' ? '#dashboard' : '#' + section;
    var shellURL = '/student/' + shellHash;

    // The Student application already understands its hash router. Put the URL on
    // the one known-good /student/ shell for the routing event, then clean it again.
    history.replaceState({ __24kStudentRoute: true, section: section }, '', shellURL);

    try {
      window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: oldURL, newURL: location.href }));
    } catch (_) {
      try { window.dispatchEvent(new Event('hashchange')); } catch (__) {}
    }
    try { window.dispatchEvent(new CustomEvent('24k:navigate', { detail: { panel: section, section: section } })); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('24k:student-route', { detail: { section: section } })); } catch (_) {}

    clearTimeout(cleanTimer);
    cleanTimer = window.setTimeout(function () {
      history.replaceState({ __24kStudentRoute: true, section: section }, '', cleanUrl(section));
      busy = false;
    }, 80);
  }

  function navigate(section, push) {
    section = normalizeSection(section);
    if (!section || busy) return false;
    busy = true;

    var target = cleanUrl(section);
    if (push !== false && location.pathname !== target) {
      // Keep browser Back/Forward useful: add a new entry, then route in-place.
      history.pushState({ __24kStudentRoute: true, section: section }, '', target);
    }
    dispatchSection(section);
    return true;
  }

  function sectionFromElement(el) {
    if (!el) return '';
    var href = el.getAttribute && el.getAttribute('href');
    var fromHref = href ? sectionFromUrl(href) : '';
    if (fromHref) return fromHref;

    var attrs = [
      el.getAttribute && el.getAttribute('data-panel'),
      el.getAttribute && el.getAttribute('data-page'),
      el.getAttribute && el.getAttribute('data-view'),
      el.getAttribute && el.getAttribute('data-route'),
      el.getAttribute && el.getAttribute('data-section'),
      el.getAttribute && el.getAttribute('data-target')
    ];
    for (var i = 0; i < attrs.length; i++) {
      var s = normalizeSection(attrs[i]);
      if (s) return s;
    }

    var text = String(el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    var exact = {
      dashboard: 'dashboard', courses: 'courses', signals: 'signals', charts: 'charts',
      articles: 'articles', updates: 'updates', profile: 'profile'
    };
    return exact[text] || '';
  }

  function rewriteStudentLinks() {
    var links;
    try { links = document.querySelectorAll('a[href]'); } catch (_) { return; }
    Array.prototype.forEach.call(links, function (a) {
      var section = sectionFromUrl(a.getAttribute('href'));
      if (!section) return;
      a.setAttribute('href', cleanUrl(section));
      a.setAttribute('data-v1001-student-section', section);
    });
  }

  // Capture before existing link handlers can trigger a hard navigation/reload.
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented && event.button !== 0) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var el = event.target && event.target.closest ? event.target.closest('a,button,[role="button"]') : null;
    if (!el) return;
    var section = el.getAttribute('data-v1001-student-section') || sectionFromElement(el);
    if (!section) return;

    // Only hijack Student navigation. Do not touch action buttons inside page content.
    var href = el.getAttribute && el.getAttribute('href');
    var looksLikeStudentNav = !!(href && sectionFromUrl(href));
    if (!looksLikeStudentNav) {
      var navParent = el.closest && el.closest('nav,aside,[class*="sidebar" i],[class*="navigation" i],[class*="menu" i]');
      if (!navParent) return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    navigate(section, true);
  }, true);

  window.addEventListener('popstate', function () {
    var section = sectionFromPath(location.pathname) || normalizeSection(location.hash) || 'dashboard';
    busy = true;
    dispatchSection(section);
  });

  function initialSync() {
    rewriteStudentLinks();
    var section = sectionFromPath(location.pathname) || normalizeSection(location.hash) || 'dashboard';
    // If this is the working /student/ shell with a requested hash, let the app
    // process it and then expose the clean path without reloading.
    if (normalizeSection(location.hash)) {
      window.setTimeout(function () {
        history.replaceState({ __24kStudentRoute: true, section: section }, '', cleanUrl(section));
      }, 250);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialSync, { once: true });
  else initialSync();
  window.addEventListener('load', function () { rewriteStudentLinks(); }, { once: true });
  window.addEventListener('24k:student-base-updated', rewriteStudentLinks);

  try {
    new MutationObserver(function () { rewriteStudentLinks(); }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}
})();

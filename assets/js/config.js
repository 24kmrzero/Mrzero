window.APP_CONFIG = {
  SUPABASE_URL: 'https://jsmthmmkafgvzzcjjihp.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_4NT_9rswuHlVNBXaoyBtaQ_Uk11zqu5',
  SITE_URL: 'https://www.24kmrzero.com',
  DEFAULT_FREE_COURSE_SLUG: 'free-course',
  DEFAULT_TIMEZONE: 'Asia/Karachi',
  SUPPORT_WHATSAPP: '601113019068',
  SUPPORT_EMAIL: '24kmrzero@gmail.com',
  RISK_VERSION: '1.0',
  TERMS_VERSION: '1.0'
};

/*
 * 24K Student auth lock recovery — v9.96
 *
 * Chromium's Web Locks can leave Supabase Auth waiting forever. This is a
 * silent failure: getSession/signIn can simply never resolve. The Student
 * portal is especially sensitive because it performs several auth/data calls
 * while booting and can create more than one client during route transitions.
 *
 * Student/Login only:
 *   1. force a function-scoped (no navigator.locks) auth lock;
 *   2. reuse one Supabase client per page so duplicate clients cannot compete;
 *   3. defer onAuthStateChange application work out of the auth notification;
 *   4. preserve every existing auth option/storage key supplied by the app.
 *
 * Admin is deliberately untouched.
 */
(function install24KStudentAuthLockRecovery() {
  'use strict';

  var path = String((window.location && window.location.pathname) || '').toLowerCase();
  var isAdmin = path.indexOf('/admin') !== -1 || path.indexOf('admin-login') !== -1;
  var isStudent = !isAdmin && (
    path.indexOf('/student') !== -1 ||
    path.endsWith('/student-dashboard.html') ||
    path.endsWith('/login.html') ||
    path.endsWith('/sign-in/') ||
    path.endsWith('/sign-up/')
  );

  if (!isStudent) return;

  var root = window.supabase;
  if (!root || typeof root.createClient !== 'function') return;
  if (root.createClient.__24kV996) return;

  var nativeCreateClient = root.createClient;
  var singleton = null;
  var singletonUrl = '';
  var singletonKey = '';

  // Supabase Auth accepts a custom LockFunc. Running fn directly avoids a
  // zombie/orphaned navigator.locks entry blocking getSession/signIn forever.
  function noNavigatorLock(_name, _acquireTimeout, fn) {
    return Promise.resolve().then(fn);
  }

  function deferAuthCallbacks(client) {
    try {
      var auth = client && client.auth;
      if (!auth || typeof auth.onAuthStateChange !== 'function' || auth.__24kV996Deferred) return;

      var nativeOnAuthStateChange = auth.onAuthStateChange.bind(auth);
      auth.onAuthStateChange = function (callback) {
        if (typeof callback !== 'function') return nativeOnAuthStateChange(callback);

        return nativeOnAuthStateChange(function (event, session) {
          // Do not await application Supabase calls inside the auth notification.
          window.setTimeout(function () {
            try {
              var result = callback(event, session);
              if (result && typeof result.catch === 'function') {
                result.catch(function (error) {
                  console.error('[24K Student auth callback]', error);
                });
              }
            } catch (error) {
              console.error('[24K Student auth callback]', error);
            }
          }, 0);
        });
      };
      auth.__24kV996Deferred = true;
    } catch (error) {
      console.error('[24K Student auth callback guard]', error);
    }
  }

  function guardedCreateClient(url, key, options) {
    var urlText = String(url || '');
    var keyText = String(key || '');

    // Reuse the same client in this page context. Multiple GoTrueClient
    // instances against the same persisted session can race during init.
    if (singleton && urlText === singletonUrl && keyText === singletonKey) {
      return singleton;
    }

    var source = options && typeof options === 'object' ? options : {};
    var next = {};
    Object.keys(source).forEach(function (k) { next[k] = source[k]; });

    var authSource = source.auth && typeof source.auth === 'object' ? source.auth : {};
    var auth = {};
    Object.keys(authSource).forEach(function (k) { auth[k] = authSource[k]; });

    // Preserve current storageKey/storage/persistSession/autoRefreshToken/etc.
    // Only replace the lock implementation.
    auth.lock = noNavigatorLock;
    next.auth = auth;

    var client = nativeCreateClient.call(root, url, key, next);
    deferAuthCallbacks(client);

    singleton = client;
    singletonUrl = urlText;
    singletonKey = keyText;
    window.__24K_STUDENT_SUPABASE_CLIENT__ = client;
    return client;
  }

  try {
    Object.defineProperty(guardedCreateClient, '__24kV996', { value: true });
  } catch (_) {
    guardedCreateClient.__24kV996 = true;
  }

  root.createClient = guardedCreateClient;
  window.__24K_STUDENT_AUTH_HOTFIX__ = '9.96';
})();

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
 * 24K Student auth deadlock guard (v9.95)
 *
 * Supabase warns against doing awaited Supabase work directly inside an
 * onAuthStateChange callback because the auth client can be holding its own
 * internal auth lock while the callback runs. If that callback makes another
 * auth/database call, the next call can wait forever and the Student app stays
 * on "Loading your student account...".
 *
 * The Student code is left untouched. We only wrap the client factory before
 * core.js/student.js create their client, and defer auth callbacks to the next
 * event-loop turn so they run after Supabase releases the auth notification.
 */
(function install24KStudentAuthDeadlockGuard() {
  'use strict';

  var path = String((window.location && window.location.pathname) || '').toLowerCase();
  var isStudentPortal =
    path.indexOf('/student') !== -1 ||
    path.endsWith('/student-dashboard.html') ||
    path.endsWith('/login.html') ||
    path.endsWith('/sign-in/') ||
    path.endsWith('/sign-up/');

  // Never modify the dedicated Admin portal/auth flow.
  if (!isStudentPortal || path.indexOf('/admin') !== -1 || path.indexOf('admin-login') !== -1) return;

  var supabaseRoot = window.supabase;
  if (!supabaseRoot || typeof supabaseRoot.createClient !== 'function') return;
  if (supabaseRoot.createClient.__24kStudentAuthDeadlockGuard) return;

  var nativeCreateClient = supabaseRoot.createClient;

  function guardedCreateClient() {
    var client = nativeCreateClient.apply(supabaseRoot, arguments);

    try {
      var auth = client && client.auth;
      if (auth && typeof auth.onAuthStateChange === 'function' && !auth.__24kDeferredAuthCallbacks) {
        var nativeOnAuthStateChange = auth.onAuthStateChange.bind(auth);

        auth.onAuthStateChange = function (callback) {
          if (typeof callback !== 'function') {
            return nativeOnAuthStateChange(callback);
          }

          return nativeOnAuthStateChange(function (event, session) {
            // Important: return immediately to Supabase. Run app work only after
            // the auth notification/lock has been released.
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

        auth.__24kDeferredAuthCallbacks = true;
      }
    } catch (error) {
      console.error('[24K Student auth guard]', error);
    }

    return client;
  }

  try {
    Object.defineProperty(guardedCreateClient, '__24kStudentAuthDeadlockGuard', {
      value: true,
      enumerable: false
    });
  } catch (_) {
    guardedCreateClient.__24kStudentAuthDeadlockGuard = true;
  }

  supabaseRoot.createClient = guardedCreateClient;
  window.__24K_STUDENT_AUTH_HOTFIX__ = '9.95';
})();

(function () {
  'use strict';

  const PREFIX = '24k_';
  const get = key => localStorage.getItem(PREFIX + key);
  const set = (key, value) => {
    if (value !== null && value !== undefined && value !== '') {
      localStorage.setItem(PREFIX + key, String(value));
    }
  };
  const params = new URLSearchParams(location.search);

  let visitorId = get('visitor_id');
  if (!visitorId) {
    visitorId = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    set('visitor_id', visitorId);
  }

  const incomingRef = String(params.get('ref') || '').trim().toLowerCase();
  const isFirstTouch = Boolean(incomingRef && !get('ref'));

  // Preserve marketing first-touch, but clicks themselves are always recorded
  // against the link that was actually opened.
  if (isFirstTouch) {
    set('ref', incomingRef);
    if (params.get('source')) set('source', params.get('source').trim());
    if (params.get('campaign')) set('campaign', params.get('campaign').trim());
    set('first_path', location.pathname + location.search);
    set('first_touch_at', new Date().toISOString());
  }

  const explicitCourseIntent = params.get('course') || params.get('course_slug');
  if (explicitCourseIntent) set('course_intent', explicitCourseIntent.trim());

  const destination = params.get('destination');
  if (destination) set('destination', destination);

  const context = () => ({
    ref: get('ref') || '',
    source: get('source') || '',
    campaign: get('campaign') || '',
    visitorId,
    courseIntent: get('course_intent') || '',
    destination: get('destination') || ''
  });

  async function initStandaloneClient() {
    if (window.App?.supabase || window.__trackingSupabase) return;
    const cfg = window.APP_CONFIG || {};
    if (window.supabase?.createClient && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
      window.__trackingSupabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
  }

  function client() {
    return window.App?.supabase || window.__trackingSupabase || null;
  }

  async function resolve(refCode) {
    const sb = client();
    const ref = String(refCode || '').trim().toLowerCase();
    if (!sb || !ref) return null;
    try {
      const { data, error } = await sb.rpc('resolve_tracking_link', { p_ref_code: ref });
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.warn('24K link resolution skipped:', error?.message || error);
      return null;
    }
  }

  async function record(eventType, metadata = {}, refOverride = '') {
    const ref = String(refOverride || get('ref') || '').trim().toLowerCase();
    const sb = client();
    if (!ref || !sb) return null;
    try {
      const { data, error } = await sb.rpc('record_tracking_event', {
        p_ref_code: ref,
        p_event_type: eventType,
        p_visitor_id: visitorId,
        p_path: location.pathname,
        p_metadata: metadata || {}
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('24K tracking event skipped:', error?.message || error);
      return null;
    }
  }

  function clearCourseIntent() { localStorage.removeItem(PREFIX + 'course_intent'); }
  function clearDestination() { localStorage.removeItem(PREFIX + 'destination'); }

  window.Tracking = { context, record, resolve, get, set, clearCourseIntent, clearDestination, visitorId };
  initStandaloneClient().catch(error => console.warn('24K tracking client init skipped:', error?.message || error));

  window.addEventListener('DOMContentLoaded', async () => {
    await initStandaloneClient();

    if (incomingRef) {
      const link = await resolve(incomingRef);

      // Source/campaign are authoritative in Link Manager, not dependent on
      // whether somebody copied a long or short URL.
      if (isFirstTouch && link) {
        if (link.source) set('source', link.source);
        if (link.campaign) set('campaign', link.campaign);
      }

      // Course intent is an action intent, so a later course-specific link may
      // legitimately replace an older course intent without changing attribution.
      if (link?.course_slug) set('course_intent', link.course_slug);

      await record('click', {
        source: link?.source || params.get('source') || null,
        campaign: link?.campaign || params.get('campaign') || null,
        course_id: link?.course_id || null,
        course_slug: link?.course_slug || null
      }, incomingRef);
    }
  });
})();

(function () {
  const PREFIX = '24k_';
  const get = key => localStorage.getItem(PREFIX + key);
  const set = (key, value) => { if (value !== null && value !== undefined && value !== '') localStorage.setItem(PREFIX + key, String(value)); };
  const params = new URLSearchParams(location.search);

  let visitorId = get('visitor_id');
  if (!visitorId) {
    visitorId = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    set('visitor_id', visitorId);
  }

  // First-touch attribution: never overwrite an earlier valid referral.
  const incomingRef = params.get('ref');
  if (incomingRef && !get('ref')) {
    set('ref', incomingRef.trim());
    set('source', (params.get('source') || 'direct').trim());
    set('campaign', (params.get('campaign') || '').trim());
    set('first_path', location.pathname + location.search);
    set('first_touch_at', new Date().toISOString());
  }

  const courseIntent = params.get('course') || params.get('course_slug');
  if (courseIntent) set('course_intent', courseIntent.trim());
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

  async function record(eventType, metadata = {}) {
    const ref = get('ref');
    const sb = window.App?.supabase || window.__trackingSupabase;
    if (!ref || !sb) return null;
    try {
      const { data, error } = await sb.rpc('record_tracking_event', {
        p_ref_code: ref,
        p_event_type: eventType,
        p_visitor_id: visitorId,
        p_path: location.pathname,
        p_metadata: metadata
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('24K tracking event skipped:', error.message || error);
      return null;
    }
  }

  async function initStandaloneClient() {
    if (window.App?.supabase || window.__trackingSupabase) return;
    const cfg = window.APP_CONFIG || {};
    if (window.supabase?.createClient && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
      window.__trackingSupabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
  }

  function clearCourseIntent() { localStorage.removeItem(PREFIX + 'course_intent'); }
  function clearDestination() { localStorage.removeItem(PREFIX + 'destination'); }

  window.Tracking = { context, record, get, set, clearCourseIntent, clearDestination, visitorId };
  window.addEventListener('DOMContentLoaded', async () => {
    await initStandaloneClient();
    if (incomingRef) await record('click', { source: params.get('source'), campaign: params.get('campaign') });
  });
})();

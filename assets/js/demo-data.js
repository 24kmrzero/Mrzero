window.DEMO_DATA = (() => {
  const courseId = '11111111-1111-4111-8111-111111111111';
  const freeCourseId = '22222222-2222-4222-8222-222222222222';
  const studentId = '33333333-3333-4333-8333-333333333333';
  return {
    profile: {
      id: studentId,
      full_name: 'Demo Student',
      email: 'student@24kexcellence.com',
      whatsapp: '+92 300 1234567',
      country: 'Pakistan',
      experience: 'Beginner',
      role: 'student'
    },
    courses: [
      {
        id: courseId,
        title: 'Advanced Price Action Trading Mastery',
        slug: 'advanced-price-action-trading-mastery',
        description: 'Live Google Meet course for serious traders who want structured price-action training.',
        instructor_name: 'Malik Zameer',
        price: 149,
        currency: 'USD',
        status: 'active',
        is_published: true,
        start_date: '2026-08-10',
        end_date: '2026-09-10',
        access_days: 90
      },
      {
        id: freeCourseId,
        title: 'Forex Trading Basic Course',
        slug: 'forex-trading-basic-course',
        description: 'A beginner-friendly introduction to Forex trading fundamentals.',
        instructor_name: 'Malik Zameer',
        price: 0,
        currency: 'USD',
        status: 'upcoming',
        is_published: true,
        start_date: '2026-09-01',
        end_date: null,
        access_days: null
      }
    ],
    sessions: [
      {
        id: '44444444-4444-4444-8444-444444444441', course_id: courseId, session_number: 1,
        title: 'Forex Market Foundations', topic: 'Market structure, sessions and trading terminology',
        starts_at: '2026-08-10T21:00:00+05:00', duration_minutes: 90, status: 'upcoming'
      },
      {
        id: '44444444-4444-4444-8444-444444444442', course_id: courseId, session_number: 2,
        title: 'Price Action Framework', topic: 'Support, resistance and clean chart reading',
        starts_at: '2026-08-12T21:00:00+05:00', duration_minutes: 90, status: 'upcoming'
      },
      {
        id: '44444444-4444-4444-8444-444444444443', course_id: courseId, session_number: 3,
        title: 'Risk and Trade Management', topic: 'Position sizing, invalidation and execution discipline',
        starts_at: '2026-08-15T21:00:00+05:00', duration_minutes: 90, status: 'upcoming'
      }
    ],
    sessionLinks: {
      '44444444-4444-4444-8444-444444444441': 'https://meet.google.com/demo-class-one',
      '44444444-4444-4444-8444-444444444442': 'https://meet.google.com/demo-class-two',
      '44444444-4444-4444-8444-444444444443': 'https://meet.google.com/demo-class-three'
    },
    enrollments: [],
    payments: [],
    paymentMethods: [
      { id: 'pm-bank', name: 'Bank Transfer', account_title: '24K Excellence', account_number: 'Add from Admin Panel', instructions: 'Transfer the exact course amount and upload a clear receipt.', is_active: true },
      { id: 'pm-wallet', name: 'Local Wallet', account_title: '24K Excellence', account_number: 'Add from Admin Panel', instructions: 'Include your registered email in the payment reference.', is_active: true }
    ],
    signals: [
      { id: 's1', symbol: 'XAUUSD', direction: 'BUY', entry_from: 3345.00, entry_to: 3347.00, stop_loss: 3338.00, take_profit_1: 3355.00, take_profit_2: 3362.00, take_profit_3: 3370.00, status: 'active', notes: 'Wait for confirmation inside the entry zone.', published_at: '2026-08-03T08:00:00+05:00', is_published: true, result_pips: null },
      { id: 's2', symbol: 'EURUSD', direction: 'SELL', entry_from: 1.1740, entry_to: 1.1750, stop_loss: 1.1780, take_profit_1: 1.1700, take_profit_2: 1.1675, take_profit_3: null, status: 'tp_hit', notes: 'Completed at TP2.', published_at: '2026-08-01T12:00:00+05:00', is_published: true, result_pips: 65 },
      { id: 's3', symbol: 'GBPUSD', direction: 'BUY', entry_from: 1.3210, entry_to: 1.3220, stop_loss: 1.3175, take_profit_1: 1.3260, take_profit_2: null, take_profit_3: null, status: 'sl_hit', notes: 'Setup invalidated.', published_at: '2026-07-30T14:00:00+05:00', is_published: true, result_pips: -35 },
      { id: 's4', symbol: 'USDJPY', direction: 'SELL', entry_from: 149.20, entry_to: 149.35, stop_loss: 149.75, take_profit_1: 148.70, take_profit_2: null, take_profit_3: null, status: 'breakeven', notes: 'Closed at breakeven.', published_at: '2026-07-28T09:00:00+05:00', is_published: true, result_pips: 0 }
    ],
    charts: [
      { id: 'c1', title: 'Gold Intraday Structure', symbol: 'XAUUSD', timeframe: 'H1', summary: 'Price is reacting from a key demand zone; confirmation is required before execution.', image_url: '', published_at: '2026-08-03T07:30:00+05:00', is_published: true },
      { id: 'c2', title: 'EURUSD Weekly Outlook', symbol: 'EURUSD', timeframe: 'H4', summary: 'Liquidity remains above the recent swing high while the broader structure stays balanced.', image_url: '', published_at: '2026-08-02T11:00:00+05:00', is_published: true }
    ],
    articles: [
      { id: 'a1', title: 'Why Risk Management Comes Before Strategy', excerpt: 'A practical framework for protecting capital before searching for profits.', content: 'Successful trading starts with survival. Define risk before entry, use a fixed invalidation point, and avoid increasing exposure after losses.', cover_url: '', published_at: '2026-08-02T10:00:00+05:00', is_published: true },
      { id: 'a2', title: 'How to Prepare for a Live Trading Session', excerpt: 'A simple checklist for disciplined preparation and cleaner decisions.', content: 'Review the calendar, mark key levels, define acceptable risk, and write down the conditions that must be present before a trade.', cover_url: '', published_at: '2026-07-31T10:00:00+05:00', is_published: true }
    ],
    announcements: [
      { id: 'n1', title: 'Course schedule published', message: 'The first three Google Meet sessions are now visible. Approved students will see the Join button.', priority: 'important', published_at: '2026-08-03T09:00:00+05:00', is_published: true },
      { id: 'n2', title: 'Payment receipt reminder', message: 'Upload a clear receipt with your transaction reference to avoid approval delays.', priority: 'normal', published_at: '2026-08-02T09:00:00+05:00', is_published: true }
    ],
    resources: []
  };
})();

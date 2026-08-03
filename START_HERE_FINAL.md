# 24K Excellence — Signal Automation V7

This package is already configured with the production Supabase Project URL and browser Publishable Key.

## Only one new SQL is required

The older production SQL rollout is already complete. Do not run the old files again.

Run only:

`supabase-final/06_SIGNAL_AUTOMATION_AND_HISTORY.sql`

This patch is safe to re-run and includes the table grants that fix `permission denied for table profiles`.

## Correct order

1. Supabase Dashboard → SQL Editor → New query.
2. Open `06_SIGNAL_AUTOMATION_AND_HISTORY.sql`.
3. Copy the complete file and click **Run**.
4. Confirm the two verification result rows appear.
5. Upload the contents of this folder to the root of GitHub repository `Mrzero`.
6. Replace the existing website files.
7. Wait 1–3 minutes for GitHub Pages.
8. Hard refresh with `Ctrl + F5`.

## URLs

- Admin Login: `https://24kmrzero.github.io/Mrzero/admin-login.html`
- Admin Dashboard: `https://24kmrzero.github.io/Mrzero/admin-dashboard.html`
- Student Login: `https://24kmrzero.github.io/Mrzero/login.html`
- Student Dashboard: `https://24kmrzero.github.io/Mrzero/student-dashboard.html`

## Signal workflow

Admin creates a signal with searchable pair selection, BUY/SELL, Market/Limit/Stop, entry or zone, SL, TP1–TP3, optional TP4, notes and audience.

After publish, Admin uses **Update** to:

- Move SL to Breakeven
- Mark TP1, TP2, TP3 or TP4 Hit
- Mark SL Hit
- Mark Breakeven Hit
- Close Trade Manually
- Cancel Signal

The system calculates pips/points and R:R automatically. Admin can override the result when needed. Every meaningful action is saved in Signal History and appears through Supabase Realtime.

## Notifications

Realtime in-app notifications and browser alerts are included. Students can click **Enable Live Alerts**. These browser alerts work while the dashboard is open or running in a browser tab. True background push when the website is fully closed requires a separate OneSignal/FCM provider setup later.

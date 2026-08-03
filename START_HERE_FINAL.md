# V6 Configuration Status

This package is already configured with the production Supabase Project URL and browser Publishable Key. The production SQL rollout has already been completed, so no additional SQL is required for this upload.

# 24K Excellence — Final Production Setup

## Pehle kya run karna hai
Supabase SQL Editor mein `supabase-final` folder ki files isi order mein run karein:

1. `01_REMOVE_DEMO_DATA.sql`
2. `02_PRODUCTION_SCHEMA_RLS_STORAGE.sql`
3. Supabase Authentication > Users mein `24kmrzero@gmail.com` create karein aur email confirm karein.
4. `03_MAKE_ADMIN.sql`
5. `04_VERIFY_PRODUCTION_SETUP.sql`

`04_VERIFY...` ke result mein admin row ka role `admin` aur status `active` hona chahiye.

## Website config
`assets/js/config.js` open karein aur ye 2 placeholders replace karein:

- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`

Values Supabase Dashboard > Project Settings > API se milengi.

## Supabase Auth URLs
Authentication > URL Configuration:

- Site URL: `https://24kmrzero.github.io/Mrzero/`
- Redirect URL: `https://24kmrzero.github.io/Mrzero/**`

## GitHub upload
Is folder ke andar ki tamam files repository `Mrzero` ke root mein upload karein. Extra outer folder upload na karein.

Required root files:

- `index.html`
- `login.html`
- `student-dashboard.html`
- `admin-login.html`
- `admin-dashboard.html`
- `assets/`
- `app.css`
- `styles.css`
- `.nojekyll`

## Final URLs

- Landing: `https://24kmrzero.github.io/Mrzero/`
- Student Login: `https://24kmrzero.github.io/Mrzero/login.html`
- Admin Login: `https://24kmrzero.github.io/Mrzero/admin-login.html`
- Admin Dashboard: `https://24kmrzero.github.io/Mrzero/admin-dashboard.html`

## Admin mein real data add karne ka order

1. Payment Method
2. Course — Instructor `Malik Zameer`, status `Upcoming`
3. Course Sessions — topic, date, time, Google Meet link
4. Announcements
5. Signals
6. Charts
7. Articles
8. Optional Course Resources

## Launch se pehle test

- Student signup/login
- Admin login
- Student admin page access blocked
- Receipt upload
- Payment Received / Under Review / Approved / Declined
- Approved payment ke baad course and Meet link unlock
- Pending/declined user ke liye Meet link locked
- Signal publish and performance status
- Chart/article publish
- Announcement display
- Mobile menu and logout

# 24K Excellence — Live Education Platform

A deployable static HTML/CSS/JavaScript platform connected to Supabase Auth, PostgreSQL, Row Level Security and Storage.

## Core services

- Signals with TP/SL/Breakeven performance history
- Admin-published chart analysis
- Trading education articles
- Live Google Meet courses with Malik Zameer
- Receipt-based course payment approval
- Student announcements
- Optional course resources
- Risk Disclaimer and Terms acceptance

## Main files

| File | Purpose |
|---|---|
| `index.html` | Existing landing page, preserved |
| `courses.html` | Public course page |
| `login.html` | Student login, signup and admin login |
| `reset-password.html` | Supabase password reset |
| `student-dashboard.html` | Student portal |
| `admin-dashboard.html` | Full administration portal |
| `app.css` | New app/admin/auth styling |
| `assets/js/config.js` | Supabase credentials and app constants |
| `assets/js/core.js` | Shared auth, modal, formatting and utilities |
| `assets/js/student.js` | Student data and payment/course logic |
| `assets/js/admin.js` | Admin CRUD and approval logic |
| `supabase/` | Full database, RLS, RPC and seed SQL |
| `docs/` | Setup, deployment and test instructions |
| `backup/original-24k-excellence.zip` | Original project backup |

## Demo mode

Until valid Supabase credentials are added, the app uses local demo data.

- Student: `student@24kexcellence.com` / `12345678`
- Admin: `admin@24kexcellence.com` / `admin123`

Demo mode is for UI testing only. Live security begins after Supabase is configured and SQL policies are installed.

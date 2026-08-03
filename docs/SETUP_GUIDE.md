# 24K Excellence — Complete Setup Guide

## A. Database
1. Open Supabase SQL Editor.
2. Run `RUN_FIRST_SUPABASE.sql` from the package root, or `supabase/00_RUN_FIRST_SCHEMA_AND_SEED.sql`.
3. The script safely removes and recreates named policies, including the previously duplicated receipt policy.

## B. Create Admin
1. Open Supabase **Authentication > Users > Add user**.
2. Use email `24kmrzero@gmail.com`.
3. Set a strong password and confirm the email where required.
4. Run `MAKE_ADMIN_24kmrzero.sql`.
5. The verification query must return one row with `role = admin` and `status = active`.

## C. Connect Website
Edit `assets/js/config.js` and insert the Supabase Project URL and public anon key.

## D. Admin Login
Open `admin-login.html`, sign in with `24kmrzero@gmail.com`, and the website will route to `admin-dashboard.html` after confirming the admin role.

## E. Initial Admin Configuration
From Admin Dashboard:
- Add payment methods.
- Add or update courses.
- Set course status to Upcoming, Active or Completed.
- Schedule Google Meet sessions with date, time and private Meet URL.
- Add optional course resources.
- Publish Signals, Charts, Articles and Announcements.
- Review submitted payment receipts and Approve or Decline them.

## F. Course Access Flow
- Unpaid: session schedule visible, Meet link locked.
- Receipt submitted: status Receipt Received/Under Review, Meet link locked.
- Admin Approved: enrollment activates and Meet link unlocks.
- Admin Declined: course remains locked and decline reason is visible.

## G. Deploy
Follow `docs/DEPLOYMENT.md`. Upload every root file and folder together.

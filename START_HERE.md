# START HERE — 24K Excellence

This package is ready to connect to a new Supabase project.

## Required order

1. Open `docs/SETUP_GUIDE.md` and complete every step.
2. Run `supabase/00_RUN_FIRST_SCHEMA_AND_SEED.sql` in Supabase SQL Editor.
3. Create the admin Auth user, then run `supabase/03_make_admin.sql` after replacing the email.
4. Copy Supabase Project URL and anon public key into `assets/js/config.js`.
5. Add your real payment account details in Admin Panel > Payment Methods.
6. Add real Google Meet links in Admin Panel > Google Meet Sessions.
7. Run the tests in `docs/TEST_CHECKLIST.md`.
8. Deploy all files together; do not remove the `assets`, `docs` or `supabase` folders.

The landing page `index.html` was preserved. Student, admin, authentication and backend flows were rebuilt.

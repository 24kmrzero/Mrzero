# V9.1 Dedicated Authentication Portals

- Student Login and Sign Up remain together on `login.html`.
- The Student page contains no Admin tab, Admin form, or Admin prompt.
- Admin Login is a separate page at `admin-login.html`.
- Admin password reset is separate at `admin-reset-password.html`.
- Student and Admin Supabase sessions use different storage keys, so both can remain logged in independently in the same browser.
- Student credentials cannot enter the Admin portal, and Admin credentials cannot enter the Student portal.
- Admin dashboard guards redirect only to the dedicated Admin Login page.
- Student dashboard guards redirect only to the Student Login page.
- No SQL changes are required.

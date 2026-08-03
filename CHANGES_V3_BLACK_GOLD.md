# 24K Excellence V3 — Black & Gold Rebuild

## Preserved
- Original `index.html`, `styles.css`, `script.js` and landing-page assets remain byte-for-byte unchanged.
- Existing Supabase student/admin/payment/course functionality remains included.

## Theme rebuilt
- Student Dashboard changed to the original premium black, gold and red 24K theme.
- Admin Dashboard changed to the same premium black, gold and red theme.
- Login, Signup, Password Reset, Terms, Privacy and Risk Disclaimer changed to the same dark theme.
- Cards, tables, forms, filters, modals, status badges and mobile layouts were restyled consistently.

## Admin route issue fixed
- `admin-dashboard.html` is present at repository root.
- Added `admin-login.html` for direct Admin Login.
- Added `admin.html` as an alias.
- Added `admin/index.html` as a backup `/admin/` route.
- Added `.nojekyll` for GitHub Pages.
- Direct Admin Dashboard without a session now opens the Admin Login tab instead of silently treating the visitor as a demo student.
- Admin email is prefilled as `24kmrzero@gmail.com`.

## Supabase included
- Corrected idempotent run-first SQL.
- Duplicate storage-policy cleanup is included.
- Ready admin promotion SQL for `24kmrzero@gmail.com`.
- Root copies: `RUN_FIRST_SUPABASE.sql` and `MAKE_ADMIN_24kmrzero.sql`.

## Validation performed
- JavaScript syntax checked.
- HTML asset references checked.
- Duplicate HTML IDs checked.
- CSS brace/critical-token validation checked.
- Required GitHub route files checked.
- Original landing-page file integrity checked.

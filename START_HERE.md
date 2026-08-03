# START HERE — 24K Excellence V3 Black & Gold

This package preserves the original 24K Excellence landing page and applies the same premium black, gold and red theme to Student Login, Student Dashboard and Admin Dashboard.

## 1. Supabase setup

1. Run `supabase/00_RUN_FIRST_SCHEMA_AND_SEED.sql` once in Supabase SQL Editor.
2. In Supabase Dashboard open **Authentication > Users > Add user**.
3. Create `24kmrzero@gmail.com` with a strong password.
4. Run `supabase/03_make_admin.sql`.
5. Verify the result shows `role = admin` and `status = active`.
6. Put the Supabase Project URL and **anon public key** in `assets/js/config.js`.

## 2. GitHub Pages upload

Upload **every file and folder from this ZIP to the root of the `Mrzero` repository**. Do not upload only the HTML files and do not place the package inside an extra folder.

Required root files include:

- `index.html`
- `login.html`
- `student-dashboard.html`
- `admin-dashboard.html`
- `admin.html`
- `admin-login.html`
- `app.css`
- `styles.css`
- `assets/`
- `.nojekyll`

After GitHub Pages updates, use:

- Website: `https://24kmrzero.github.io/Mrzero/`
- Student Login: `https://24kmrzero.github.io/Mrzero/login.html`
- Admin Login: `https://24kmrzero.github.io/Mrzero/admin-login.html`
- Admin Panel direct: `https://24kmrzero.github.io/Mrzero/admin-dashboard.html`
- Backup Admin route: `https://24kmrzero.github.io/Mrzero/admin/`

GitHub file names are case-sensitive. Keep `admin-dashboard.html` exactly in lowercase.

## 3. Important admin access rule

Opening the direct Admin Panel without a valid admin session redirects to the Admin Login tab. A Student account cannot enter the Admin Panel.

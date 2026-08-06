# 24K Excellence V9 — Complete Setup

## 1. Database upgrade

Never rerun old production/schema/seed/admin files.

- When SQL 06 and 07 already succeeded, run only `supabase-final/08_DEEP_AUDIT_OPERATIONS_FIXES.sql`.
- If either file was never completed, run only the missing file(s) in numerical order and finish with SQL 08.

After SQL 08, confirm the result:

`V9 deep-audit operations patch installed successfully.`

## 2. GitHub Pages deployment

Extract the ZIP and upload the contents of the extracted folder directly to the `Mrzero` repository root. The repository root must contain `index.html`, `login.html`, `student-dashboard.html`, `admin-dashboard.html`, `assets/`, `admin/`, clean-route folders and `.nojekyll`.

Wait for GitHub Pages deployment, then hard refresh.

## 3. Supabase Auth URLs

Site URL:

`https://24kmrzero.github.io/Mrzero/`

Allowed redirect URL:

`https://24kmrzero.github.io/Mrzero/**`

During testing, Confirm Email may remain disabled. Before launch, enable it and test signup, Check Your Email, verification, login and retained course intent.

## 4. Admin account

Admin email: `24kmrzero@gmail.com`

The corresponding Auth user must exist and its `profiles.role` must be `admin`.

Admin login URL:

`https://24kmrzero.github.io/Mrzero/admin-login.html`

## 5. Content setup order

1. Payment methods
2. Courses
3. Modules and lessons
4. Live sessions and private Google Meet links
5. Optional resources
6. Announcements
7. Signals
8. Charts
9. Articles
10. Tracking links

## 6. Payment test

Use a separate Student account. Submit a receipt, review it from Admin, approve it and confirm the enrollment/Meet link unlock. Also test Declined and New Receipt Required states.

## 7. Email delivery

Supabase Auth handles verification and password reset. Custom course/payment/class emails use the included `supabase/functions/process-email-queue/` Edge Function. Configure server-side provider secrets only; never put secret/service-role keys in website JavaScript or GitHub.

## 8. Security notes

The browser uses only the Supabase publishable key. RLS and security-definer Admin RPCs protect data/actions. Payment receipts, course resources and Google Meet links remain private. Test with both Student and Admin accounts after every database-policy change.

# 24K Excellence Complete Platform V8

## What this build contains

- Public black-and-gold website with dynamic course catalogue
- Clean GitHub Pages routes: `/courses`, `/sign-in`, `/sign-up`, `/free-course`, `/charts`, `/articles`
- Signup, email-verification screen, login, forgot/reset password and logout
- First-touch referral tracking that survives signup, verification, login and enrollment
- User Panel: Dashboard, Signals, Charts, Articles, Courses, progress, Payments, Announcements, Notifications, Access Status, Profile and Support
- Admin Panel: Signals, Charts, Articles, Announcements, Courses, Google Meet sessions, optional resources, course modules/lessons, enrollments, payment approvals, users/access, link tracking, delivery queue and support
- No Mentor Panel

## Database run order

Do not run old production files again.

1. Run `supabase-final/06_SIGNAL_AUTOMATION_AND_HISTORY.sql` only when it was not already completed.
2. Run `supabase-final/07_PLATFORM_WORKFLOWS_LINKS_ACCESS_COURSES.sql` once.

The V8 patch is rerunnable and contains no demo content.

## Email verification during testing

Email confirmation can remain disabled during testing. Before launch, enable Confirm Email in Supabase Authentication settings and keep these URL settings:

- Site URL: `https://24kmrzero.github.io/Mrzero/`
- Redirect URL: `https://24kmrzero.github.io/Mrzero/**`

The signup flow already opens `check-email.html` when confirmation is required, and preserves the course/referral intent.

## GitHub Pages deployment

Extract the ZIP and upload the contents directly to the repository root. Do not upload an extra outer folder.

The repository root must directly contain:

- `index.html`
- `courses.html`
- `login.html`
- `check-email.html`
- `student-dashboard.html`
- `admin-dashboard.html`
- `assets/`
- `sign-in/`, `sign-up/`, `free-course/`, `courses/`, `charts/`, `articles/`
- `.nojekyll`

Configured project values are already in `assets/js/config.js`.

## First real Admin setup

1. Sign in at `/admin-login.html`.
2. Add Payment Methods.
3. Create a free or paid Course.
4. Upload a course thumbnail.
5. Set Instructor to Malik Zameer.
6. Set status and enrollment availability.
7. Create Modules in sequence.
8. Create Lessons in sequence and link live lessons to Google Meet sessions.
9. Schedule sessions with date, PKT time and private Meet link.
10. Add optional resources.
11. Publish announcements, signals, charts and articles.

## Free-course flow

Use a link such as:

`https://24kmrzero.github.io/Mrzero/free-course/?course=YOUR-COURSE-SLUG`

The course slug remains stored through signup and email confirmation. After verified login, a valid free course enrolls automatically and opens in the Student Panel.

## Paid-course flow

Student opens a paid course, submits the receipt and sees Receipt Received / Under Review. Admin reviews the private receipt, then approves or declines it. Approval creates or activates the enrollment; Google Meet links remain protected by database policies until active access exists.

## Link Manager

Admin selects destination, reference/team member, source and campaign. The generated URL records clicks and unique visitors. First-touch reference is saved through signup, verification, login and first course enrollment. Link statistics include total clicks, unique visitors, signups, enrollments, conversion and last activity.

## User access

Admin can lock/unlock, set days, set exact expiry, extend time, add grace time, reset, create a PIN or give lifetime access. Bulk extension skips lifetime users. Access checks use database policies and expiry dates, not only hidden frontend buttons.

## Custom transactional email delivery

Supabase Auth handles signup verification and password-reset messages. Course, payment and live-class messages are placed in `email_queue` with deduplication.

To send those queued emails:

1. Deploy `supabase/functions/process-email-queue`.
2. Add `RESEND_API_KEY`, `EMAIL_FROM` and `SITE_URL` secrets.
3. Press **Process Queue Now** in Admin → Delivery Center.

Do not place a service-role/secret API key in `assets/js/config.js`.

## Final test checklist

- New account with confirmation OFF
- New account with confirmation ON and Check Your Email screen
- Forgot/reset password
- Admin page blocked for students
- Locked/unverified user cannot read protected Signals/Charts/Articles
- Free-course link intent survives verification/login
- Paid receipt submission, Admin review, approval and Meet-link unlock
- Declined payment displays reason
- Signal publish/update/history and no duplicate cards
- Module/lesson sequence and progress
- Link click → signup → enrollment attribution
- User access expiry and lifetime-user bulk exclusion
- Mobile menu, modals, images and tables

# 24K Excellence V9 — Deep Audit Release Notes

## High-impact defects fixed

- Fixed missing `authenticated` API privileges that could produce `permission denied for table profiles` and similar failures.
- Fixed Student notification functions and read/unread behavior.
- Fixed initialization-order problems in V8 extension scripts.
- Preserved dedicated Admin Login behavior when a Student session is already active.
- Replaced raw database errors with safer user-facing messages.
- Added missing database/RPC support behind Admin UI controls that were previously incomplete.
- Reduced duplicate payment, enrollment-email and content-notification risks.

## Admin operations improvements

- Urgent work cards for payments, expiries, support, enquiries and notifications
- Global search across users, payments and content
- Improved Students table, filters, bulk access actions and selected-user messaging
- Detailed user drawer with access, enrollments, payments, support and activity
- Payment full review modal, private receipt preview, duplicate warning, approve/decline/resubmission
- Course modules and ordered lessons
- Enrollment management and live-session calendar
- Link Manager analytics and attributed users
- Admin notification center, Delivery Center and Activity Logs
- Website Enquiries panel
- Platform Settings panel
- Branded confirmation modals and clearer success/error messages
- CSV exports and responsive mobile Admin navigation

## Student improvements

- Stable dashboard initialization and responsive navigation
- Signals, history, pips/points and realtime updates
- Charts, Articles and image-safe cards
- Ordered course modules/lessons and progress controls
- Approved-only private Google Meet links and resources
- Payment receipt submission/resubmission with hashing and duplicate protection
- Announcements and notification read/unread controls
- Access/expiry, profile and support workflows

## Public website

- Contact/enquiry form now saves to Supabase
- Clean routes and referral/course-intent tracking preserved
- Correct legal/contact links and improved error handling
- Lazy loading remains enabled for non-critical images

## Not included

- No Mentor Panel
- No Attendance system
- No Signal Copy/WhatsApp Copy button
- PipSePaisa automatic signal sync remains deferred
- True closed-browser push notifications require a separately configured provider such as OneSignal/FCM
- Custom enrollment/payment/live-class email delivery requires deployment of the included Edge Function and provider secrets

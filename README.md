# 24K Excellence V9 — Deep Audit Production Build

GitHub Pages + Supabase platform containing the public website, Student Panel and one Admin Panel.

## Main scope

- Black-and-gold 24K branding and responsive layouts
- Student authentication, email-verification flow, profile, access and expiry
- Admin-managed Signals, Charts, Articles, Courses, Google Meet sessions and optional resources
- Free/paid enrollment, private receipt upload, duplicate-payment warning and approval workflow
- Signal automation/history, TP/SL/Breakeven controls and performance statistics
- Announcements, Student notifications, Admin notifications and email delivery queue
- Users, access/grace/lifetime/PIN, enrollments, website enquiries and Link Manager
- Course modules, lessons, sequence and progress
- Audit/activity logs, scheduled publishing, global Admin search and CSV exports
- No Mentor Panel
- No Attendance system
- No Signal Copy / WhatsApp Copy button

Start with `START_HERE_V9.txt`, then read `docs/V9_COMPLETE_SETUP.md` and `docs/TEST_CHECKLIST_V9.md`.


## V9.1 Authentication Separation

- Student access: `login.html` (Student Login + Sign Up only)
- Admin access: `admin-login.html` (Admin Login only)
- Student and Admin sessions use separate browser storage keys and can stay logged in independently.
- No database/SQL update is required for V9.1.

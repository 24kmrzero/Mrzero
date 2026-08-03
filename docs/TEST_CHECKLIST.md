# Pre-Launch Test Checklist

Use separate browser profiles for Admin and Student.

## Authentication

- [ ] Student signup creates Auth user and `profiles` row.
- [ ] Terms, Privacy and Risk acceptance rows are recorded.
- [ ] Student login opens Student Panel.
- [ ] Admin login opens Admin Panel.
- [ ] Student cannot open Admin Panel.
- [ ] Password reset email redirects to `reset-password.html`.
- [ ] Logout clears session.

## Payments

- [ ] Admin payment method appears in student form.
- [ ] Student can upload JPG/PNG/WEBP/PDF receipt up to 5 MB.
- [ ] Receipt is private and not publicly accessible.
- [ ] Payment appears as Receipt Received.
- [ ] Admin can open receipt.
- [ ] Under Review status appears for student.
- [ ] Decline requires a reason and keeps course locked.
- [ ] Approve creates enrollment and unlocks course.
- [ ] Another student cannot view the receipt.

## Google Meet course

- [ ] Upcoming course status is visible.
- [ ] Session title, topic, date and time are visible while locked.
- [ ] Unpaid student cannot retrieve `course_session_links` through Supabase API.
- [ ] Approved student can see Join Google Meet.
- [ ] Meet link opens in a new tab.
- [ ] Admin can edit date/time/link/status.
- [ ] Cancelled session displays Cancelled.
- [ ] Optional resource is hidden from unpaid student and downloadable by approved student.

## Content

- [ ] Admin can create/edit/delete Signal.
- [ ] Signal TP/SL/Breakeven status updates performance summary.
- [ ] Admin can upload Chart image.
- [ ] Admin can publish Article.
- [ ] Admin can publish Announcement.
- [ ] Student search and filters work.
- [ ] Risk modal appears before Signals when not previously accepted.

## Responsive and regression

- [ ] Landing page appearance remains unchanged.
- [ ] Courses page works.
- [ ] Login, Student and Admin pages work on desktop.
- [ ] Sidebar opens/closes on mobile.
- [ ] Tables scroll horizontally on small screens.
- [ ] No browser console errors.
- [ ] No service-role key appears in source files.

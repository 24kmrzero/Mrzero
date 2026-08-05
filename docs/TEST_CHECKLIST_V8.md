# 24K Excellence V8 Test Checklist

## Database

- [ ] If V7 SQL 06 was never completed, run `06_SIGNAL_AUTOMATION_AND_HISTORY.sql`
- [ ] Run `07_PLATFORM_WORKFLOWS_LINKS_ACCESS_COURSES.sql`
- [ ] Confirm the final verification row says the V8 platform patch is installed
- [ ] Do not rerun older production SQL files

## Authentication

- [ ] Signup with email confirmation disabled during testing
- [ ] Signup with email confirmation enabled before launch
- [ ] Check Your Email screen appears when confirmation is required
- [ ] Verified/unverified state appears correctly in Admin
- [ ] Forgot password and reset password work
- [ ] Student cannot access Admin pages
- [ ] Logout clears the session

## Clean routes and attribution

- [ ] `/courses` opens the public course catalogue
- [ ] `/sign-in` opens Student Login
- [ ] `/sign-up` opens Signup
- [ ] `/free-course?course=SLUG&ref=CODE` keeps course/referral intent
- [ ] `/charts` and `/articles` preserve the intended destination
- [ ] Link Manager records clicks, unique visitors, signups and enrollments
- [ ] First-touch source survives verification and login

## Signals

- [ ] Gold, Silver and BTC are pinned first
- [ ] USD pairs appear before cross pairs
- [ ] BUY/SELL and Market/Limit/Stop work
- [ ] Entry zone, SL, TP1–TP3 and optional TP4 save correctly
- [ ] Pips/points and R:R preview calculate correctly
- [ ] Move SL to Breakeven keeps the signal active
- [ ] TP1/TP2 progress updates without closing
- [ ] Final target, SL, Breakeven Hit, Manual Close and Cancel close correctly
- [ ] Closed signals stay in history
- [ ] Signal appears only once in Student Panel
- [ ] No Copy/WhatsApp Copy button appears

## Courses and payments

- [ ] Free course intent auto-enrolls after verified login
- [ ] Existing user auto-enrolls without a second enrollment click
- [ ] Paid user can upload a private receipt
- [ ] Receipt Received / Under Review / Approved / Declined states display
- [ ] Decline reason displays and receipt can be resubmitted
- [ ] Approval creates/activates enrollment
- [ ] Private Google Meet link remains locked until active enrollment
- [ ] Modules and lessons open in Admin-defined sequence
- [ ] Course progress saves and restores
- [ ] Optional resources work when Admin adds them

## Access and Admin

- [ ] Lock/unlock works
- [ ] Set days and exact expiry work
- [ ] Extend and grace time work
- [ ] Reset and new PIN work
- [ ] Lifetime access works
- [ ] Bulk extension skips lifetime users
- [ ] Expired users lose protected access through RLS/date checks
- [ ] Admin Dashboard KPIs match database records

## Content and delivery

- [ ] Chart images show without unnecessary crop
- [ ] Article cover and details display correctly
- [ ] Announcements and notifications update in realtime
- [ ] Course/payment/live-class email queue deduplicates repeat actions
- [ ] Optional Edge Function processes email queue successfully

## Responsive and regression

- [ ] Desktop Student Panel
- [ ] Desktop Admin Panel
- [ ] Mobile menu and modals
- [ ] No page blink or duplicate cards
- [ ] Lazy-loaded noncritical images
- [ ] Landing hero image loads with priority

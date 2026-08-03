# Complete Supabase Setup Guide

## 1. Create the Supabase project

1. Create a new Supabase project.
2. Save the database password securely.
3. Open **Project Settings > API**.
4. Copy the **Project URL** and **anon public key**.
5. Never place the service-role key in website files.

## 2. Run the database SQL

Open **SQL Editor > New query**, paste the complete contents of:

`supabase/00_RUN_FIRST_SCHEMA_AND_SEED.sql`

Run it once. It creates:

- Profiles and Auth trigger
- Courses and Google Meet sessions
- Private session-link table
- Payments and automatic enrollments
- Signals, Charts, Articles and Announcements
- Course Resources and Support Requests
- Terms acceptance and Admin audit log
- Row Level Security policies
- Private payment-receipt and course-resource buckets
- Public chart/article image bucket
- Payment approval and free-enrollment RPC functions

## 3. Configure Authentication

In **Authentication > Providers > Email**:

- Enable Email provider.
- For immediate testing, you may disable email confirmation temporarily.
- For production, enable email confirmation and configure a custom SMTP provider.

In **Authentication > URL Configuration** add your deployed URLs, for example:

- Site URL: `https://yourdomain.com`
- Redirect URLs:
  - `https://yourdomain.com/login.html`
  - `https://yourdomain.com/reset-password.html`
  - Your local test URL, such as `http://localhost:8080/**`

## 4. Create the admin account

1. Go to **Authentication > Users > Add user**.
2. Create the admin with a strong password.
3. Open `supabase/03_make_admin.sql`.
4. Replace `REPLACE_WITH_ADMIN_EMAIL` with the exact admin email.
5. Run the SQL and verify the returned profile has role `admin`.

Do not allow normal users to sign up as admins.

## 5. Add credentials to the website

Edit `assets/js/config.js`:

```js
SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
SUPABASE_ANON_KEY: 'YOUR_REAL_ANON_PUBLIC_KEY',
```

After both values are replaced, demo mode turns off automatically.

## 6. Configure real operational data

Log in to Admin Panel and complete:

1. **Payment Methods**: replace all placeholder bank/wallet details.
2. **Courses**: confirm price, currency, dates, status and access days.
3. **Google Meet Sessions**: add the real private Google Meet link for each class.
4. **Announcements**: publish class and payment notices.
5. **Signals / Charts / Articles**: add real content.
6. **Course Resources**: upload PDFs/notes only when required.

## 7. Payment and course access flow

1. Student signs up and accepts Terms, Privacy and Risk Disclaimer.
2. Student selects a paid course.
3. Student sees the payment method configured by Admin.
4. Student uploads a private receipt and transaction reference.
5. Status becomes **Receipt Received**.
6. Admin opens the receipt and marks it Under Review, Approved or Declined.
7. Approval runs `admin_review_payment`, creates/updates the enrollment and unlocks the course.
8. Student can then read the private Google Meet URL and approved course resources.
9. A declined payment remains locked and displays the Admin reason.

## 8. Google Meet security model

`course_sessions` stores public schedule information: title, topic, date and time.

`course_session_links` stores the private Meet URL. Its RLS policy returns a row only when:

- the user is an Admin, or
- the logged-in student has an active approved enrollment for that course.

This prevents a locked student from retrieving the Meet link through browser inspection or a direct API request.

## 9. Storage security

- `payment-receipts`: private; student uploads inside their own user-ID folder; only that student and Admin can read it.
- `course-resources`: private; only Admin and approved enrolled students can read files.
- `content-assets`: public; used for published chart and article images.

## 10. Production recommendations

- Enable email confirmation and custom SMTP.
- Use strong admin passwords and MFA where available.
- Replace all placeholder contact/payment details.
- Review legal wording with a qualified professional for your country.
- Keep Supabase database backups enabled.
- Test RLS using two separate student accounts before launch.

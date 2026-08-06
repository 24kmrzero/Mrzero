# Supabase Setup — V9 Deep Audit

## Exact upgrade order

Do not run old production/schema/seed/admin SQL again.

- If `06_SIGNAL_AUTOMATION_AND_HISTORY.sql` already succeeded, do not rerun it.
- If `07_PLATFORM_WORKFLOWS_LINKS_ACCESS_COURSES.sql` already succeeded, do not rerun it.
- Run the new patch: `08_DEEP_AUDIT_OPERATIONS_FIXES.sql`.

If 06 or 07 never completed, run only the missing file(s) in numerical order before 08.

## What SQL 08 adds/fixes

- Required API privileges while preserving RLS
- Payment receipt hashing, duplicate detection and resubmission
- Secure Admin payment-review RPC and automatic enrollment access
- Scheduled content and audience-aware notifications
- Student notification read/unread functions
- Admin notification center and user activity records
- Website enquiry backend
- Support, bulk messaging, bulk-user and email-retry RPCs
- Audit logs, platform settings and Admin operations overview
- Realtime tables required by the new dashboards

SQL 08 does not insert demo signals, courses, students, payments, charts or articles.

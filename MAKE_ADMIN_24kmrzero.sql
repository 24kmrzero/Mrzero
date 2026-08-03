-- 24K Excellence: promote the existing Supabase Auth user to Admin.
-- First create this user in Supabase Dashboard > Authentication > Users:
-- Email: 24kmrzero@gmail.com
-- Set a strong password and mark email as confirmed if required.

update public.profiles
set role = 'admin',
    full_name = '24K Administrator',
    status = 'active',
    updated_at = now()
where lower(email) = lower('24kmrzero@gmail.com');

-- Verification: this must return one row with role = admin.
select id, email, full_name, role, status
from public.profiles
where lower(email) = lower('24kmrzero@gmail.com');

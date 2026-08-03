-- =============================================================
-- 24K EXCELLENCE — DATABASE, AUTH, RLS, RPC AND STORAGE
-- Run this entire file in Supabase SQL Editor on a NEW project.
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Core tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default 'Student',
  whatsapp text,
  country text,
  experience text,
  role text not null default 'student' check (role in ('student','admin')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  instructor_name text not null default 'Malik Zameer',
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'USD',
  status text not null default 'upcoming' check (status in ('draft','upcoming','active','completed','archived')),
  start_date date,
  end_date date,
  access_days integer check (access_days is null or access_days > 0),
  thumbnail_url text,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  session_number integer not null check (session_number > 0),
  title text not null,
  topic text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 90 check (duration_minutes >= 15),
  status text not null default 'upcoming' check (status in ('upcoming','live','completed','cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, session_number)
);

-- Meet links are deliberately separated from public session metadata.
create table if not exists public.course_session_links (
  course_session_id uuid primary key references public.course_sessions(id) on delete cascade,
  meet_url text not null check (meet_url ~* '^https://meet\.google\.com/'),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  course_session_id uuid references public.course_sessions(id) on delete set null,
  title text not null,
  description text,
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_title text,
  account_number text,
  instructions text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  payment_method_name text,
  transaction_reference text not null,
  receipt_path text not null,
  student_note text,
  status text not null default 'received' check (status in ('received','under_review','approved','declined')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  access_started_at timestamptz not null default now(),
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, course_id)
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  direction text not null check (direction in ('BUY','SELL')),
  entry_from numeric,
  entry_to numeric,
  stop_loss numeric,
  take_profit_1 numeric,
  take_profit_2 numeric,
  take_profit_3 numeric,
  status text not null default 'active' check (status in ('active','tp_hit','sl_hit','breakeven','closed')),
  result_pips numeric,
  notes text,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.charts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  symbol text not null,
  timeframe text,
  summary text,
  image_url text,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  cover_url text,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  priority text not null default 'normal' check (priority in ('normal','important')),
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('terms','privacy','risk_disclaimer')),
  version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  unique(user_id, document_type, version)
);

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Helpful indexes ----------
create index if not exists idx_payments_student on public.payments(student_id, created_at desc);
create index if not exists idx_payments_status on public.payments(status, created_at desc);
create index if not exists idx_enrollments_student on public.enrollments(student_id, status);
create index if not exists idx_sessions_course on public.course_sessions(course_id, starts_at);
create index if not exists idx_signals_published on public.signals(is_published, published_at desc);
create index if not exists idx_support_student on public.support_requests(student_id, created_at desc);

-- ---------- Shared helper functions ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.has_active_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments e
    where e.student_id = auth.uid()
      and e.course_id = p_course_id
      and e.status = 'active'
      and (e.access_expires_at is null or e.access_expires_at > now())
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_payment_invoice()
returns trigger language plpgsql as $$
begin
  if new.invoice_no is null then
    new.invoice_no := '24K-' || to_char(now(), 'YYYYMM') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

-- ---------- Auth profile creation ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_terms text;
  v_risk text;
begin
  v_terms := coalesce(new.raw_user_meta_data->>'terms_version', '2026-08-03');
  v_risk := coalesce(new.raw_user_meta_data->>'risk_version', '2026-08-03');

  insert into public.profiles (id, email, full_name, whatsapp, country, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'whatsapp',
    new.raw_user_meta_data->>'country',
    'student'
  )
  on conflict (id) do nothing;

  if coalesce((new.raw_user_meta_data->>'accepted_terms')::boolean, false) then
    insert into public.terms_acceptances(user_id, document_type, version)
    values (new.id, 'terms', v_terms), (new.id, 'privacy', v_terms), (new.id, 'risk_disclaimer', v_risk)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Sync users that existed before running this SQL.
insert into public.profiles(id, email, full_name, role)
select u.id, u.email, coalesce(nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1)), 'student'
from auth.users u
on conflict (id) do nothing;

-- ---------- Update / invoice triggers ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','courses','course_sessions','payment_methods','payments','enrollments','signals','charts','articles','announcements','support_requests']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', t, t);
  end loop;
end $$;

drop trigger if exists trg_payment_invoice on public.payments;
create trigger trg_payment_invoice before insert on public.payments
for each row execute procedure public.set_payment_invoice();

-- ---------- Business RPCs ----------
create or replace function public.enroll_free_course(p_course_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_course from public.courses where id = p_course_id and is_published = true;
  if not found then raise exception 'Course not found'; end if;
  if v_course.price <> 0 then raise exception 'This course requires payment'; end if;

  insert into public.enrollments(student_id, course_id, status, access_expires_at)
  values (auth.uid(), p_course_id, 'active', case when v_course.access_days is null then null else now() + make_interval(days => v_course.access_days) end)
  on conflict (student_id, course_id) do update set
    status = 'active', access_started_at = now(),
    access_expires_at = excluded.access_expires_at, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_review_payment(p_payment_id uuid, p_status text, p_admin_note text default null)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
  v_course public.courses;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('under_review','approved','declined') then raise exception 'Invalid payment status'; end if;
  if p_status = 'declined' and coalesce(trim(p_admin_note),'') = '' then raise exception 'Decline reason is required'; end if;

  update public.payments
  set status = p_status,
      admin_note = p_admin_note,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_payment_id
  returning * into v_payment;
  if not found then raise exception 'Payment not found'; end if;

  if p_status = 'approved' then
    select * into v_course from public.courses where id = v_payment.course_id;
    insert into public.enrollments(student_id, course_id, payment_id, status, access_started_at, access_expires_at)
    values (
      v_payment.student_id, v_payment.course_id, v_payment.id, 'active', now(),
      case when v_course.access_days is null then null else now() + make_interval(days => v_course.access_days) end
    )
    on conflict (student_id, course_id) do update set
      payment_id = excluded.payment_id,
      status = 'active',
      access_started_at = now(),
      access_expires_at = excluded.access_expires_at,
      updated_at = now();
  end if;

  insert into public.admin_audit_logs(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'payment_' || p_status, 'payment', p_payment_id, jsonb_build_object('note', p_admin_note));
  return v_payment;
end;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_active_course_access(uuid) to authenticated;
grant execute on function public.enroll_free_course(uuid) to authenticated;
grant execute on function public.admin_review_payment(uuid,text,text) to authenticated;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_sessions enable row level security;
alter table public.course_session_links enable row level security;
alter table public.course_resources enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
alter table public.enrollments enable row level security;
alter table public.signals enable row level security;
alter table public.charts enable row level security;
alter table public.articles enable row level security;
alter table public.announcements enable row level security;
alter table public.support_requests enable row level security;
alter table public.terms_acceptances enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Remove old policies safely before recreation.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('profiles','courses','course_sessions','course_session_links','course_resources','payment_methods','payments','enrollments','signals','charts','articles','announcements','support_requests','terms_acceptances','admin_audit_logs')
  loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = 'student');
create policy profiles_admin_all on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy courses_student_read on public.courses for select to authenticated using (is_published = true or public.is_admin());
create policy courses_admin_write on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy sessions_student_read on public.course_sessions for select to authenticated using (exists(select 1 from public.courses c where c.id=course_id and c.is_published=true) or public.is_admin());
create policy sessions_admin_write on public.course_sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy session_links_approved_read on public.course_session_links for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.course_sessions s
    where s.id = course_session_id and public.has_active_course_access(s.course_id)
  )
);
create policy session_links_admin_write on public.course_session_links for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy resources_approved_read on public.course_resources for select to authenticated using (public.is_admin() or public.has_active_course_access(course_id));
create policy resources_admin_write on public.course_resources for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy methods_active_read on public.payment_methods for select to authenticated using (is_active = true or public.is_admin());
create policy methods_admin_write on public.payment_methods for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy payments_own_read on public.payments for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy payments_own_insert on public.payments for insert to authenticated with check (student_id = auth.uid() and status = 'received');
create policy payments_admin_write on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy enrollments_own_read on public.enrollments for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy enrollments_admin_write on public.enrollments for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy signals_read on public.signals for select to authenticated using (is_published = true or public.is_admin());
create policy signals_admin_write on public.signals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy charts_read on public.charts for select to authenticated using (is_published = true or public.is_admin());
create policy charts_admin_write on public.charts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy articles_read on public.articles for select to authenticated using (is_published = true or public.is_admin());
create policy articles_admin_write on public.articles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy announcements_read on public.announcements for select to authenticated using (is_published = true or public.is_admin());
create policy announcements_admin_write on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy support_own_read on public.support_requests for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy support_own_insert on public.support_requests for insert to authenticated with check (student_id = auth.uid());
create policy support_admin_write on public.support_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy terms_own_read on public.terms_acceptances for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy terms_own_insert on public.terms_acceptances for insert to authenticated with check (user_id = auth.uid());
create policy audit_admin_read on public.admin_audit_logs for select to authenticated using (public.is_admin());

-- ---------- Storage buckets ----------
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-receipts','payment-receipts',false,5242880,array['image/png','image/jpeg','image/webp','application/pdf']),
  ('course-resources','course-resources',false,20971520,null),
  ('content-assets','content-assets',true,8388608,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies
-- Make this section safe to rerun after a partial/previous execution.
drop policy if exists "receipt owner upload" on storage.objects;
drop policy if exists "receipt owner or admin read" on storage.objects;
drop policy if exists "receipt admin delete" on storage.objects;
drop policy if exists "resource admin upload" on storage.objects;
drop policy if exists "resource approved read" on storage.objects;
drop policy if exists "resource admin update" on storage.objects;
drop policy if exists "resource admin delete" on storage.objects;
drop policy if exists "content public read" on storage.objects;
drop policy if exists "content admin upload" on storage.objects;
drop policy if exists "content admin update" on storage.objects;
drop policy if exists "content admin delete" on storage.objects;

create policy "receipt owner upload" on storage.objects for insert to authenticated with check (
  bucket_id='payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "receipt owner or admin read" on storage.objects for select to authenticated using (
  bucket_id='payment-receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
create policy "receipt admin delete" on storage.objects for delete to authenticated using (bucket_id='payment-receipts' and public.is_admin());

create policy "resource admin upload" on storage.objects for insert to authenticated with check (bucket_id='course-resources' and public.is_admin());
create policy "resource approved read" on storage.objects for select to authenticated using (
  bucket_id='course-resources' and (
    public.is_admin() or public.has_active_course_access(((storage.foldername(name))[1])::uuid)
  )
);
create policy "resource admin update" on storage.objects for update to authenticated using (bucket_id='course-resources' and public.is_admin()) with check (bucket_id='course-resources' and public.is_admin());
create policy "resource admin delete" on storage.objects for delete to authenticated using (bucket_id='course-resources' and public.is_admin());

create policy "content public read" on storage.objects for select to public using (bucket_id='content-assets');
create policy "content admin upload" on storage.objects for insert to authenticated with check (bucket_id='content-assets' and public.is_admin());
create policy "content admin update" on storage.objects for update to authenticated using (bucket_id='content-assets' and public.is_admin()) with check (bucket_id='content-assets' and public.is_admin());
create policy "content admin delete" on storage.objects for delete to authenticated using (bucket_id='content-assets' and public.is_admin());

-- ---------- Realtime (optional but enabled for live dashboard updates) ----------
do $$ begin
  alter publication supabase_realtime add table public.signals;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.charts;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.articles;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.announcements;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.payments;
exception when duplicate_object then null; end $$;
-- 24K Excellence starter content. Run after 01_schema_and_security.sql.

insert into public.courses (
  id, title, slug, description, instructor_name, price, currency, status,
  start_date, end_date, access_days, is_published
) values
(
  '11111111-1111-4111-8111-111111111111',
  'Advanced Price Action Trading Mastery',
  'advanced-price-action-trading-mastery',
  'Live Google Meet course for serious traders who want structured price-action training.',
  'Malik Zameer', 149, 'USD', 'upcoming', '2026-08-10', '2026-09-10', 90, true
),
(
  '22222222-2222-4222-8222-222222222222',
  'Forex Trading Basic Course',
  'forex-trading-basic-course',
  'A beginner-friendly introduction to Forex trading fundamentals.',
  'Malik Zameer', 0, 'USD', 'upcoming', '2026-09-01', null, null, true
)
on conflict (id) do update set
  title=excluded.title, description=excluded.description, instructor_name=excluded.instructor_name,
  price=excluded.price, currency=excluded.currency, status=excluded.status,
  start_date=excluded.start_date, end_date=excluded.end_date, access_days=excluded.access_days,
  is_published=excluded.is_published;

insert into public.course_sessions(id, course_id, session_number, title, topic, starts_at, duration_minutes, status)
values
('44444444-4444-4444-8444-444444444441','11111111-1111-4111-8111-111111111111',1,'Forex Market Foundations','Market structure, sessions and trading terminology','2026-08-10 21:00:00+05',90,'upcoming'),
('44444444-4444-4444-8444-444444444442','11111111-1111-4111-8111-111111111111',2,'Price Action Framework','Support, resistance and clean chart reading','2026-08-12 21:00:00+05',90,'upcoming'),
('44444444-4444-4444-8444-444444444443','11111111-1111-4111-8111-111111111111',3,'Risk and Trade Management','Position sizing, invalidation and execution discipline','2026-08-15 21:00:00+05',90,'upcoming')
on conflict (id) do update set title=excluded.title, topic=excluded.topic, starts_at=excluded.starts_at, duration_minutes=excluded.duration_minutes, status=excluded.status;

-- Google Meet links are intentionally NOT seeded. Add real links from Admin Panel.

insert into public.payment_methods(name, account_title, account_number, instructions, sort_order, is_active)
select 'Bank Transfer','24K Excellence','REPLACE WITH BANK ACCOUNT','Transfer the exact course amount and upload a clear receipt.',1,true
where not exists (select 1 from public.payment_methods where name='Bank Transfer');

insert into public.payment_methods(name, account_title, account_number, instructions, sort_order, is_active)
select 'Local Wallet','24K Excellence','REPLACE WITH WALLET NUMBER','Add your registered email in the payment reference.',2,true
where not exists (select 1 from public.payment_methods where name='Local Wallet');

insert into public.announcements(title,message,priority,is_published,published_at)
select 'Course schedule published','Upcoming class dates are visible. Google Meet links unlock after admin payment approval.','important',true,now()
where not exists (select 1 from public.announcements where title='Course schedule published');

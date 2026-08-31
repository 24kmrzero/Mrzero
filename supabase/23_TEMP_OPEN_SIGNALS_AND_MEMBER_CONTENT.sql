-- 24K Excellence V9.53
-- TEMPORARY OPEN MEMBER CONTENT FIX
-- Purpose: while the final access model is postponed, signed-in students
-- (except suspended accounts) can read all published member content/signals.
-- This does NOT grant Admin/write permissions and does NOT open payment records.

begin;

create or replace function public.has_platform_access()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (p.role = 'student' and coalesce(p.status,'active') <> 'suspended')
      )
  );
$$;

grant execute on function public.has_platform_access() to authenticated;

-- During temporary open access, signal audience labels do not lock students.
-- Unpublished signals remain hidden by RLS.
create or replace function public.has_signal_audience_access(p_audience text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.has_platform_access();
$$;

grant execute on function public.has_signal_audience_access(text) to authenticated;

-- Recreate signal read policies explicitly so old access policies cannot keep
-- Pending/Unverified students from seeing published signals.
drop policy if exists signals_read on public.signals;
create policy signals_read
on public.signals
for select
to authenticated
using (
  public.is_admin()
  or (is_published = true and public.has_platform_access())
);

drop policy if exists signal_updates_read on public.signal_updates;
create policy signal_updates_read
on public.signal_updates
for select
to authenticated
using (
  public.is_admin()
  or (
    public.has_platform_access()
    and exists (
      select 1
      from public.signals s
      where s.id = signal_id
        and s.is_published = true
    )
  )
);

-- Keep API SELECT privileges explicit. RLS remains authoritative.
grant select on public.signals, public.signal_updates to authenticated;

commit;

-- Verification only: these rows are not modified.
select
  count(*) filter (where is_published = true) as published_signals,
  count(*) filter (where is_published = true and closed_at is null) as published_open_signals,
  count(*) filter (where is_published = false) as unpublished_signals
from public.signals;

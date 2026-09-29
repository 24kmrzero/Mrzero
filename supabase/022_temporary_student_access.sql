-- 24K Excellence v9.50
-- TEMPORARY OPEN STUDENT ACCESS
-- Purpose: while the final access model is being redesigned, every signed-in
-- non-suspended student may read all published member content and published
-- course session links/resources. Payment records and Admin permissions are NOT opened.
-- Safe to replace later with the final access rules.

begin;

-- Platform-wide member access no longer depends on email verification, expiry,
-- grace or Pending status during this temporary phase.
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

-- All published courses are temporarily available to signed-in students.
-- Existing RLS policies for course_session_links, course_resources, lessons and
-- storage that call this helper automatically inherit the temporary open rule.
create or replace function public.has_active_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.has_platform_access()
    and exists(
      select 1
      from public.courses c
      where c.id = p_course_id
        and c.is_published = true
    );
$$;

grant execute on function public.has_active_course_access(uuid) to authenticated;

-- Defensive read policies for current production tables. They do not expose
-- unpublished courses and do not grant any write access.
drop policy if exists temp_open_session_links_read on public.course_session_links;
create policy temp_open_session_links_read
on public.course_session_links
for select
to authenticated
using (
  exists (
    select 1
    from public.course_sessions s
    join public.courses c on c.id = s.course_id
    where s.id = course_session_id
      and c.is_published = true
      and public.has_platform_access()
  )
);

drop policy if exists temp_open_course_resources_read on public.course_resources;
create policy temp_open_course_resources_read
on public.course_resources
for select
to authenticated
using (
  public.has_platform_access()
  and exists (
    select 1 from public.courses c
    where c.id = course_id and c.is_published = true
  )
);

-- Private course-resource files: signed-in members can download them during
-- the temporary open-access phase. Payment receipts remain private/unchanged.
drop policy if exists temp_open_course_resource_files_read on storage.objects;
create policy temp_open_course_resource_files_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-resources'
  and public.has_platform_access()
);

-- If the optional course_lessons table exists, add a temporary SELECT policy.
do $$
begin
  if to_regclass('public.course_lessons') is not null then
    execute 'drop policy if exists temp_open_course_lessons_read on public.course_lessons';
    execute $policy$
      create policy temp_open_course_lessons_read
      on public.course_lessons
      for select
      to authenticated
      using (
        public.has_platform_access()
        and is_published = true
        and exists (select 1 from public.courses c where c.id = course_id and c.is_published = true)
      )
    $policy$;
  end if;
end $$;

commit;

select '24K v9.50 temporary student access is OPEN for signed-in non-suspended students' as result;

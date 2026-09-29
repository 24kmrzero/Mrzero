-- V9.15: include every current course session and Google Meet link in
-- free-enrollment and paid-approval emails. Existing tables/RLS remain unchanged.

create or replace function public.course_email_schedule(p_course_id uuid)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'session_number', s.session_number,
        'title', s.title,
        'topic', coalesce(s.topic,''),
        'starts_at', s.starts_at,
        'duration_minutes', coalesce(s.duration_minutes,90),
        'meet_url', coalesce(l.meet_url,'')
      ) order by s.session_number, s.starts_at
    ),
    '[]'::jsonb
  )
  from public.course_sessions s
  left join public.course_session_links l on l.course_session_id=s.id
  where s.course_id=p_course_id
    and s.status<>'cancelled';
$$;

create or replace function public.queue_enrollment_email()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_email text; v_course text; v_sessions jsonb;
begin
  if new.status<>'active' then return new; end if;
  if tg_op='UPDATE' and old.status='active' then return new; end if;

  select email into v_email from public.profiles where id=new.student_id;
  select title into v_course from public.courses where id=new.course_id;
  v_sessions:=public.course_email_schedule(new.course_id);

  update public.user_attributions
  set first_enrollment_at=coalesce(first_enrollment_at,now()),updated_at=now()
  where user_id=new.student_id;

  insert into public.tracking_events(link_id,ref_code,event_type,visitor_id,user_id,path,metadata)
  select link_id,ref_code,'enrollment',visitor_id,new.student_id,'/courses',jsonb_build_object('course_id',new.course_id)
  from public.user_attributions where user_id=new.student_id
  on conflict do nothing;

  insert into public.notifications(user_id,audience,type,title,message,entity_type,entity_id,action_url)
  values(new.student_id,'all_students','course','Course enrollment confirmed',
    'You are enrolled in '||coalesce(v_course,'the course')||'. Google Meet links are available in your Student Panel.',
    'course',new.course_id,'student-dashboard.html#courses');

  if v_email is not null then
    insert into public.email_queue(recipient_user_id,recipient_email,template_key,subject,payload,dedupe_key)
    values(
      new.student_id,v_email,'course_enrollment','Course enrollment confirmed',
      jsonb_build_object('course',v_course,'sessions',v_sessions),
      'enrollment:'||new.student_id||':'||new.course_id
    )
    on conflict(dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enrollment_email on public.enrollments;
create trigger trg_enrollment_email
after insert or update of status on public.enrollments
for each row execute procedure public.queue_enrollment_email();

create or replace function public.queue_payment_email_and_notification()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_email text; v_course text; v_title text; v_message text; v_sessions jsonb;
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    select email into v_email from public.profiles where id=new.student_id;
    select title into v_course from public.courses where id=new.course_id;
    v_sessions:=case when new.status='approved' then public.course_email_schedule(new.course_id) else '[]'::jsonb end;
    v_title:=case new.status when 'received' then 'Payment receipt received' when 'approved' then 'Payment approved' when 'declined' then 'Payment declined' else 'Payment under review' end;
    v_message:=case new.status when 'approved' then 'Your payment was approved and course access is now open.' when 'declined' then 'Your payment was declined. Please review the Admin note.' else 'Your payment status is '||replace(new.status,'_',' ')||'.' end;

    insert into public.notifications(user_id,audience,type,title,message,entity_type,entity_id,action_url)
    values(new.student_id,'all_students','payment',v_title,v_message,'payment',new.id,'student-dashboard.html#payments');

    if v_email is not null then
      insert into public.email_queue(recipient_user_id,recipient_email,template_key,subject,payload,dedupe_key)
      values(
        new.student_id,v_email,'payment_'||new.status,v_title,
        jsonb_build_object('course',v_course,'invoice',new.invoice_no,'status',new.status,'admin_note',new.admin_note,'sessions',v_sessions),
        'payment:'||new.id||':'||new.status
      )
      on conflict(dedupe_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_email_notification on public.payments;
create trigger trg_payment_email_notification
after insert or update of status on public.payments
for each row execute procedure public.queue_payment_email_and_notification();

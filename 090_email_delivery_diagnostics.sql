-- Latest delivery results
select id,recipient_email,template_key,subject,status,attempts,scheduled_at,sent_at,last_error,created_at
from public.email_queue
order by created_at desc
limit 100;

-- Counts by status/template
select template_key,status,count(*) as total,max(created_at) as latest
from public.email_queue
group by template_key,status
order by template_key,status;

-- Stuck/failed only
select id,recipient_email,template_key,status,attempts,last_error,created_at
from public.email_queue
where status in ('pending','failed','processing')
order by created_at desc;

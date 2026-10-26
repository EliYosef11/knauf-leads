-- שיפורים 26.10.2026: מעקב מסירה של התראות, וזיהוי כפילויות מהטופס הציבורי.

-- מעקב מסירה: עד היום כשל בשליחת מייל היה שקוף לגמרי — הליד נשמר ואיש לא ידע
-- שהנציג לא קיבל הודעה.
alter table public.leads add column if not exists notified_at  timestamptz;
alter table public.leads add column if not exists notify_error text;

create index if not exists leads_notify_error_idx on public.leads (notify_error)
  where notify_error is not null;

-- בדיקת כפילות עבור הטופס הציבורי. אורח אינו רשאי לקרוא לידים, ולכן הבדיקה
-- עוברת דרך פונקציה שמחזירה רק את מה שצריך כדי להציג אזהרה — בלי לחשוף נתונים.
create or replace function public.lead_already_exists(p_phone text, p_event_id text default null)
returns table (exists_already boolean, assigned_to text, created_date timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select true,
         l.assigned_to,
         l.created_date
  from public.leads l
  where regexp_replace(coalesce(l.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') <> ''
    and (
      (p_event_id is not null and l.event_id = p_event_id)
      or (p_event_id is null and l.created_date > now() - interval '24 hours')
    )
  order by l.created_date desc
  limit 1;
$$;

grant execute on function public.lead_already_exists(text, text) to anon, authenticated;

-- הגנה מפני הצפה בטופס הציבורי. הטופס פתוח לאינטרנט וכל אחד יכול לפנות ישירות
-- ל-API, ולכן החסימה יושבת במסד ולא בדפדפן. זו הגנה מפני הצפה בלבד — הגנת בוטים
-- מלאה (Turnstile) תתווסף כשהאתר יעבור ל-Cloudflare.
create or replace function public.guard_lead_flood()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  same_phone_recent integer;
  total_last_minute integer;
begin
  select count(*) into same_phone_recent
  from public.leads
  where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = regexp_replace(coalesce(new.phone, ''), '\D', '', 'g')
    and created_date > now() - interval '30 seconds';

  if same_phone_recent > 0 then
    raise exception 'duplicate submission: same phone within 30 seconds'
      using errcode = 'check_violation';
  end if;

  select count(*) into total_last_minute
  from public.leads
  where created_date > now() - interval '1 minute';

  if total_last_minute >= 30 then
    raise exception 'too many leads created in the last minute'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_lead_flood on public.leads;
create trigger guard_lead_flood
  before insert on public.leads
  for each row execute function public.guard_lead_flood();

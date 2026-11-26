-- 26.11.2026 — רק נציג פעיל או אדמין מקבל הרשאות, גם אם הצליח להתחבר.
--     node scripts/run-sql.mjs supabase/membership.sql
--
-- הפרצה: can_login() נבדקת רק באתר. ההרשמה ב-Supabase Auth פתוחה (היא חייבת להיות —
-- כניסה ראשונה של נציג היא "הרשמה"), ולכן מי שפנה ישירות ל-API של Auth עם כתובת משלו
-- קיבל קוד וסשן של authenticated. המדיניות עד היום נתנה לכל authenticated לקרוא כנסים
-- ונציגים וליצור לידים (שגם שולחים מייל לנציג). מעכשיו כל ההרשאות של נציג תלויות
-- ב-is_member(), שנבדקת בשרת מול הטבלאות בכל בקשה.
--
-- אותה בדיקה סוגרת גם נציג שהושבת (is_active = false) והסשן שלו עדיין חי במכשיר.

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.representatives r
    where lower(r.email) = lower(auth.jwt() ->> 'email') and r.is_active
  ) or exists (
    select 1 from public.admins a where lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;
revoke execute on function public.is_member() from public, anon;
grant  execute on function public.is_member() to authenticated;

-- יצירת ליד, וקריאת כנסים ונציגים (הטופס צריך אותם)
drop policy if exists rep_create_leads on public.leads;
create policy rep_create_leads on public.leads
  for insert to authenticated with check (public.is_member());

drop policy if exists read_events on public.events;
create policy read_events on public.events
  for select to authenticated using (public.is_member());

drop policy if exists read_representatives on public.representatives;
create policy read_representatives on public.representatives
  for select to authenticated using (public.is_member());

-- הלידים של הנציג והשיחה עליהם: rep_can_see_lead משמשת את המדיניות של leads ושל lead_notes
create or replace function public.rep_can_see_lead(p_assigned_email text, p_status text, p_last_touch timestamptz)
returns boolean
language sql
stable
as $$
  select public.is_member()
     and lower(p_assigned_email) = lower(public.current_email())
     and not (p_status = 'טופל' and p_last_touch < now() - interval '6 months');
$$;

drop policy if exists update_own_or_admin_leads on public.leads;
create policy update_own_or_admin_leads on public.leads
  for update to authenticated
  using (public.is_admin() or public.rep_can_see_lead(assigned_email, status, coalesce(updated_date, created_date)))
  with check (public.is_admin() or (public.is_member() and lower(assigned_email) = lower(public.current_email())));

-- בדיקת הכפילות בטופס חושפת שם נציג ותאריך לפי מספר טלפון — לחברים בלבד
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
  where public.is_member()
    and regexp_replace(coalesce(l.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') <> ''
    and (
      (p_event_id is not null and l.event_id = p_event_id)
      or (p_event_id is null and l.created_date > now() - interval '24 hours')
    )
  order by l.created_date desc
  limit 1;
$$;

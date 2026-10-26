-- מדיניות RLS מלאה — שלב 2 של ההגירה.
--
-- מודל ההרשאות:
--   אורח (anon)         — קורא כנסים ונציגים כדי למלא את הטופס, ויוצר ליד. לא קורא לידים.
--   נציג (מחובר)        — קורא ומעדכן רק לידים שה-assigned_email שלהם הוא המייל שלו.
--   אדמין (ברשימה)      — הכל.
--
-- זיהוי האדמינים בטבלת public.admins. הפונקציה is_admin() היא security definer
-- כדי שתוכל לקרוא את הטבלה הזו גם כשה-RLS עליה סגור.

create table if not exists public.admins (
  email    text primary key,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;

insert into public.admins (email) values ('elicomusic@gmail.com') on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.email = (auth.jwt() ->> 'email'));
$$;

create or replace function public.current_email()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'email';
$$;

-- לידים ------------------------------------------------------------------------
drop policy if exists anon_create_leads        on public.leads;
drop policy if exists public_create_leads      on public.leads;
drop policy if exists read_own_or_admin_leads  on public.leads;
drop policy if exists update_own_or_admin_leads on public.leads;
drop policy if exists admin_delete_leads       on public.leads;

-- הטופס בכנס חייב לעבוד בלי התחברות
create policy public_create_leads on public.leads
  for insert to anon, authenticated with check (true);

create policy read_own_or_admin_leads on public.leads
  for select to authenticated
  using (public.is_admin() or assigned_email = public.current_email());

create policy update_own_or_admin_leads on public.leads
  for update to authenticated
  using (public.is_admin() or assigned_email = public.current_email())
  with check (public.is_admin() or assigned_email = public.current_email());

create policy admin_delete_leads on public.leads
  for delete to authenticated using (public.is_admin());

-- כנסים ונציגים: קריאה פתוחה (הטופס הציבורי צריך אותם), כתיבה לאדמין בלבד ----------
drop policy if exists anon_read_events          on public.events;
drop policy if exists anon_read_representatives on public.representatives;
drop policy if exists read_events               on public.events;
drop policy if exists admin_write_events        on public.events;
drop policy if exists read_representatives      on public.representatives;
drop policy if exists admin_write_representatives on public.representatives;

create policy read_events on public.events
  for select to anon, authenticated using (true);
create policy admin_write_events on public.events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy read_representatives on public.representatives
  for select to anon, authenticated using (true);
create policy admin_write_representatives on public.representatives
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- קמפיינים והגדרות התראות: אדמין בלבד -------------------------------------------
drop policy if exists admin_campaigns on public.campaigns;
drop policy if exists admin_settings  on public.notification_settings;

create policy admin_campaigns on public.campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy admin_settings on public.notification_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 19.10.2026 — התחברות רק לנציגים רשומים, וניהול אדמינים מהממשק
-- ============================================================

-- השוואות מייל חסינות לאותיות גדולות/קטנות. בטבלת הנציגים יש כתובת שנשמרה
-- כ-Hagay.karadi@... בעוד שההתחברות מנרמלת לאותיות קטנות — בלי lower() הנציג
-- הזה היה מתחבר ולא רואה אף ליד.
drop policy if exists read_own_or_admin_leads   on public.leads;
drop policy if exists update_own_or_admin_leads on public.leads;

create policy read_own_or_admin_leads on public.leads
  for select to authenticated
  using (public.is_admin() or lower(assigned_email) = lower(public.current_email()));

create policy update_own_or_admin_leads on public.leads
  for update to authenticated
  using (public.is_admin() or lower(assigned_email) = lower(public.current_email()))
  with check (public.is_admin() or lower(assigned_email) = lower(public.current_email()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- מי רשאי בכלל לבקש קוד כניסה: נציג פעיל או אדמין. נקראת לפני שליחת הקוד.
create or replace function public.can_login(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.representatives r
    where lower(r.email) = lower(p_email) and r.is_active
  ) or exists (
    select 1 from public.admins a where lower(a.email) = lower(p_email)
  );
$$;

grant execute on function public.can_login(text) to anon, authenticated;

-- ניהול האדמינים ממסך ההגדרות
drop policy if exists admins_read  on public.admins;
drop policy if exists admins_write on public.admins;

create policy admins_read on public.admins
  for select to authenticated using (public.is_admin());

create policy admins_write on public.admins
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.admins (email) values
  ('eli.yosef@knauf.com'),
  ('keren.shay@knauf.com')
on conflict do nothing;

-- ============================================================
-- 26.10.2026 — הטופס דורש התחברות: אורח לא קורא ולא כותב כלום
-- ============================================================
-- עד היום הטופס בכנס היה פתוח, ולכן אורח יכול היה ליצור ליד ולקרוא כנסים ונציגים.
-- מעכשיו הנציג מתחבר לפני שהוא מזין ליד, ואורח נשאר רק עם can_login (כדי לבקש קוד).
-- הפונקציות (meta-webhook, התראות, גיבוי) עובדות עם מפתח השירות ולא מושפעות.

drop policy if exists public_create_leads on public.leads;
drop policy if exists rep_create_leads    on public.leads;
create policy rep_create_leads on public.leads
  for insert to authenticated with check (true);

drop policy if exists read_events on public.events;
create policy read_events on public.events
  for select to authenticated using (true);

drop policy if exists read_representatives on public.representatives;
create policy read_representatives on public.representatives
  for select to authenticated using (true);

-- בדיקת הכפילות בטופס — רק למחובר. חייבים לשלול גם מ-public, שמקבל execute כברירת מחדל.
revoke execute on function public.lead_already_exists(text, text) from public, anon;
grant  execute on function public.lead_already_exists(text, text) to authenticated;

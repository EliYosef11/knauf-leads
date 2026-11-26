-- 26.11.2026 — יומן כניסות: מי נכנס למערכת ומתי, לצפייה במסך הניהול.
--     node scripts/run-sql.mjs supabase/login-log.sql
--
-- שני סוגי רשומות:
--   login — הזדהות בקוד (או בכניסה הישירה של מצב החירום)
--   visit — פתיחת האפליקציה עם סשן קיים. הסשן נשמר שבועות, כך שבלי זה נציג שנכנס
--           כל יום היה מופיע ביומן פעם אחת בלבד.
-- הכתובת נלקחת מה-JWT בשרת, כך שאי אפשר לרשום כניסה בשם מישהו אחר.

create table if not exists public.login_log (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  email   text not null,
  kind    text not null default 'login',
  device  text
);
create index if not exists login_log_at_idx    on public.login_log (at desc);
create index if not exists login_log_email_idx on public.login_log (lower(email), at desc);

alter table public.login_log enable row level security;

-- קריאה לאדמין בלבד. אין מדיניות כתיבה: רושמים רק דרך log_login().
drop policy if exists admin_read_login_log on public.login_log;
create policy admin_read_login_log on public.login_log
  for select to authenticated using (public.is_admin());

create or replace function public.log_login(p_kind text default 'login', p_device text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_kind  text := case when p_kind = 'visit' then 'visit' else 'login' end;
begin
  if v_email is null then return; end if;

  -- רענון דף אינו כניסה חדשה: ביקור נרשם לכל היותר פעם בשעה למשתמש,
  -- והזדהות כפולה (לחיצה כפולה) לכל היותר פעם בדקה.
  if exists (
    select 1 from public.login_log l
    where lower(l.email) = v_email
      and l.at > now() - case when v_kind = 'visit' then interval '1 hour' else interval '1 minute' end
  ) then
    return;
  end if;

  insert into public.login_log (email, kind, device)
  values (v_email, v_kind, left(p_device, 40));
end;
$$;

revoke execute on function public.log_login(text, text) from public, anon;
grant  execute on function public.log_login(text, text) to authenticated;

-- שמירה: 6 חודשים (LOGIN_LOG_MONTHS ב-src/lib/privacy.js). זה מידע על עובדים,
-- ואין סיבה להחזיק אותו מעבר למה שצריך למעקב שוטף.
create or replace function public.purge_login_log(p_months integer default 6)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.login_log where at < now() - make_interval(months => p_months);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke execute on function public.purge_login_log(integer) from public, anon, authenticated;

select cron.unschedule('login-log-retention')
  where exists (select 1 from cron.job where jobname = 'login-log-retention');
select cron.schedule('login-log-retention', '10 3 * * *', $$ select public.purge_login_log(6); $$);

-- ============================================================
-- 26.11.2026 — ניסיונות כניסה שנכשלו (לזיהוי ניסיון פריצה)
-- ============================================================
-- סוגים נוספים ב-kind:
--   denied       — בקשת קוד לכתובת שאינה רשומה כנציג/אדמין (נרשם בשרת, בתוך can_login)
--   code_request — בקשת קוד לכתובת רשומה. המסך מציג אותה כחשודה רק אם לא באה אחריה כניסה
--   bad_code     — הוזן קוד שגוי או שפג תוקפו (מדווח מהדפדפן אחרי ש-Auth דחה את הקוד)
-- לניסיונות האלה נשמרת גם כתובת ה-IP. לכניסות מוצלחות לא — אין בה צורך.
--
-- מגבלה ידועה: מי שפונה ישירות ל-API של Supabase Auth ולא דרך האתר אינו עובר כאן.
-- ניסיונות כאלה מופיעים רק ב-Auth logs בלוח הבקרה של Supabase.

alter table public.login_log add column if not exists ip text;
create index if not exists login_log_kind_idx on public.login_log (kind, at desc);

-- הפונקציות האלה פתוחות לאורח, ולכן מוגנות מהצפה: אותה כתובת+סוג פעם בדקה,
-- ולכל היותר 300 רשומות כשל בשעה בסך הכול. תקלה ברישום לעולם לא מפילה את הכניסה.
create or replace function public.record_login_attempt(p_email text, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text;
  v_headers json;
  v_ip      text;
begin
  -- הכול בתוך הגוף ולא ב-declare: חריגה בהצהרות אינה נתפסת ב-exception שלמטה
  v_email   := left(lower(trim(coalesce(p_email, ''))), 200);
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip      := left(coalesce(v_headers ->> 'cf-connecting-ip',
                             trim(split_part(v_headers ->> 'x-forwarded-for', ',', 1))), 60);

  if v_email = '' or p_kind not in ('denied', 'code_request', 'bad_code') then return; end if;

  if exists (
    select 1 from public.login_log l
    where l.email = v_email and l.kind = p_kind and l.at > now() - interval '1 minute'
  ) then return; end if;

  if (select count(*) from public.login_log l
      where l.kind in ('denied', 'code_request', 'bad_code') and l.at > now() - interval '1 hour') >= 300 then
    return;
  end if;

  insert into public.login_log (email, kind, ip) values (v_email, p_kind, nullif(v_ip, ''));
exception when others then
  null;
end;
$$;
revoke execute on function public.record_login_attempt(text, text) from public, anon, authenticated;

-- can_login נקראת לפני כל שליחת קוד — כאן נרשמת הבקשה. הלוגיקה עצמה לא השתנתה
-- (נציג פעיל או אדמין); הפונקציה הפכה ל-volatile רק כדי שתוכל לכתוב ליומן.
create or replace function public.can_login(p_email text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := exists (
    select 1 from public.representatives r
    where lower(r.email) = lower(p_email) and r.is_active
  ) or exists (
    select 1 from public.admins a where lower(a.email) = lower(p_email)
  );
  perform public.record_login_attempt(p_email, case when v_allowed then 'code_request' else 'denied' end);
  return v_allowed;
end;
$$;
grant execute on function public.can_login(text) to anon, authenticated;

-- קוד שגוי: הדפדפן מדווח אחרי ש-Supabase Auth דחה את הקוד
create or replace function public.log_failed_code(p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  select public.record_login_attempt(p_email, 'bad_code');
$$;
revoke execute on function public.log_failed_code(text) from public;
grant  execute on function public.log_failed_code(text) to anon, authenticated;

-- log_login: מניעת הכפילות סופרת רק כניסות מוצלחות — אחרת בקשת הקוד שנרשמה
-- רגע לפני ההזדהות הייתה בולעת את רשומת הכניסה עצמה.
create or replace function public.log_login(p_kind text default 'login', p_device text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_kind  text := case when p_kind = 'visit' then 'visit' else 'login' end;
begin
  if v_email is null then return; end if;

  if exists (
    select 1 from public.login_log l
    where lower(l.email) = v_email
      and l.kind in ('login', 'visit')
      and l.at > now() - case when v_kind = 'visit' then interval '1 hour' else interval '1 minute' end
  ) then
    return;
  end if;

  insert into public.login_log (email, kind, device)
  values (v_email, v_kind, left(p_device, 40));
end;
$$;

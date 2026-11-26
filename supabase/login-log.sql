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

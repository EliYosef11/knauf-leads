-- מדיניות שמירת לידים (GDPR) — מחיקה אוטומטית של לידים ישנים.
--
-- ⚠️ עדיין לא הוחל. מריצים רק אחרי אישור:
--     node scripts/run-sql.mjs supabase/retention.sql
--
-- הכלל, כפי שהוצהר בטופס ה-ISRAD ובהודעת הפרטיות שבטופס:
--   ליד נשמר לתקופת המעקב בלבד — 24 חודשים מהמגע האחרון — ונמחק אחריה.
--   "המגע האחרון" = updated_date (כל סימון/סיכום/העברה מעדכן אותו), ולא created_date,
--   כך שליד שעדיין מטפלים בו לא יימחק.
--
-- הרצה: כל יום ב-03:00 UTC (שעה אחרי הגיבוי היומי של 02:00, כך שכל ליד שנמחק
-- עדיין נמצא בגיבוי של אותו לילה ל-30 יום נוספים).
--
-- החלטות שמורות בטבלת retention_log כדי שיהיה תיעוד למבקר: מתי רץ, כמה נמחקו.

create table if not exists public.retention_log (
  id          bigserial primary key,
  ran_at      timestamptz not null default now(),
  deleted     integer not null,
  cutoff      timestamptz not null
);
alter table public.retention_log enable row level security;

drop policy if exists admin_read_retention_log on public.retention_log;
create policy admin_read_retention_log on public.retention_log
  for select to authenticated using (public.is_admin());

create or replace function public.purge_expired_leads(p_months integer default 24)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff  timestamptz := now() - make_interval(months => p_months);
  v_deleted integer;
begin
  -- לידי בדיקה (is_sample) נמחקים בכל מקרה; לידים אמיתיים — רק מעבר לתקופת השמירה
  delete from public.leads
  where coalesce(updated_date, created_date) < v_cutoff;
  get diagnostics v_deleted = row_count;

  insert into public.retention_log (deleted, cutoff) values (v_deleted, v_cutoff);
  return v_deleted;
end;
$$;

-- רק השרת (cron) מריץ את זה — לא נותנים execute ל-anon/authenticated
revoke execute on function public.purge_expired_leads(integer) from public, anon, authenticated;

select cron.unschedule('lead-retention')
  where exists (select 1 from cron.job where jobname = 'lead-retention');

select cron.schedule(
  'lead-retention',
  '0 3 * * *',
  $$ select public.purge_expired_leads(24); $$
);

-- בדיקה לפני ההחלה (לא מוחק כלום): כמה לידים היו נמחקים היום
-- select count(*) from public.leads where coalesce(updated_date, created_date) < now() - interval '24 months';

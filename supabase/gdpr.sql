-- 10.11.2026 — GDPR: מגבלת שמירה, הסכמה לדיוור, וצמצום גישת נציגים ללידים ישנים.
--     node scripts/run-sql.mjs supabase/gdpr.sql
-- (כולל את supabase/retention.sql, שעד היום לא הוחל.)

-- ── 1. מגבלת שמירה: 24 חודשים מהמגע האחרון ──────────────────────────────────
-- "המגע האחרון" = updated_date (כל סימון/הודעה/העברה מאפסים אותו), לא created_date,
-- כך שליד שעדיין מטפלים בו לא נמחק. רץ ב-03:00 UTC — שעה אחרי הגיבוי היומי, כך שכל
-- ליד שנמחק נמצא בגיבוי של אותו לילה ל-30 יום נוספים (זה מה שכתוב בהודעת הפרטיות).
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
  delete from public.leads
  where coalesce(updated_date, created_date) < v_cutoff;
  get diagnostics v_deleted = row_count;
  insert into public.retention_log (deleted, cutoff) values (v_deleted, v_cutoff);
  return v_deleted;
end;
$$;
revoke execute on function public.purge_expired_leads(integer) from public, anon, authenticated;

select cron.unschedule('lead-retention')
  where exists (select 1 from cron.job where jobname = 'lead-retention');
select cron.schedule('lead-retention', '0 3 * * *', $$ select public.purge_expired_leads(24); $$);

-- ── 2. הסכמה לדיוור שיווקי ──────────────────────────────────────────────────
-- בסיס החוקי לליד הוא אינטרס לגיטימי (חזרה למי שפנה). דיוור שיווקי דורש הסכמה נפרדת —
-- נאספת בתיבת סימון בטופס. ברירת המחדל false; נשמר גם מתי ניתנה.
alter table public.leads add column if not exists marketing_consent    boolean not null default false;
alter table public.leads add column if not exists marketing_consent_at timestamptz;

create or replace function public.stamp_marketing_consent()
returns trigger
language plpgsql
as $$
begin
  if new.marketing_consent and (tg_op = 'INSERT' or not coalesce(old.marketing_consent, false)) then
    new.marketing_consent_at := now();
  elsif not new.marketing_consent then
    new.marketing_consent_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists stamp_marketing_consent on public.leads;
create trigger stamp_marketing_consent
  before insert or update of marketing_consent on public.leads
  for each row execute function public.stamp_marketing_consent();

-- ── 3. גישת נציג: רק למה שהוא צריך ─────────────────────────────────────────
-- ליד שסומן "טופל" לפני יותר מ-6 חודשים כבר לא נחוץ לנציג לעבודה השוטפת — רק מנהל
-- רואה אותו (עד למחיקה האוטומטית ב-24 חודשים). ליד פתוח נשאר גלוי לנציג תמיד.
create or replace function public.rep_can_see_lead(p_assigned_email text, p_status text, p_last_touch timestamptz)
returns boolean
language sql
stable
as $$
  select lower(p_assigned_email) = lower(public.current_email())
     and not (p_status = 'טופל' and p_last_touch < now() - interval '6 months');
$$;

drop policy if exists read_own_or_admin_leads   on public.leads;
drop policy if exists update_own_or_admin_leads on public.leads;

create policy read_own_or_admin_leads on public.leads
  for select to authenticated
  using (public.is_admin() or public.rep_can_see_lead(assigned_email, status, coalesce(updated_date, created_date)));

create policy update_own_or_admin_leads on public.leads
  for update to authenticated
  using (public.is_admin() or public.rep_can_see_lead(assigned_email, status, coalesce(updated_date, created_date)))
  with check (public.is_admin() or lower(assigned_email) = lower(public.current_email()));

-- אותו כלל לשיחה על הליד
drop policy if exists notes_read  on public.lead_notes;
drop policy if exists notes_write on public.lead_notes;
create policy notes_read on public.lead_notes
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.leads l where l.id = lead_id
      and public.rep_can_see_lead(l.assigned_email, l.status, coalesce(l.updated_date, l.created_date))));
create policy notes_write on public.lead_notes
  for insert to authenticated
  with check (public.is_admin() or exists (
    select 1 from public.leads l where l.id = lead_id
      and public.rep_can_see_lead(l.assigned_email, l.status, coalesce(l.updated_date, l.created_date))));

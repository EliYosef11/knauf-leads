-- 4.11.2026 — מי הזין את הליד, ושיחה על כל ליד במקום שדה סיכום יחיד.
--
-- מאז 26.10 כל הזנה נעשית ממשתמש מחובר, ולכן אפשר סוף-סוף לדעת מי הקליד.
-- הנתונים ההיסטוריים: 55 הלידים מ-Base44 נוצרו בלי התחברות (created_by='anonymous'),
-- ו-47 הלידים מ-28.10 עד היום נוצרו לפני שהטריגר הזה היה קיים — אצלם זה לא ידוע.
-- לא ממציאים: מציגים "הוזן ע"י" רק כשבאמת יודעים.

-- ── מי הזין ──────────────────────────────────────────────────────────────────
-- מזהים את המזין לפי המייל שב-JWT (לא ממה שהלקוח שולח — אי אפשר לזייף).
-- שם הנציג נלקח מטבלת הנציגים; אם אין רשומה (אדמין שאינו נציג) — נשאר המייל.
create or replace function public.set_lead_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_name  text;
begin
  if v_email is null or v_email = '' then
    return new;   -- מפתח שירות (ייבוא, Meta, בדיקות) — אין מזין אנושי
  end if;
  select r.name into v_name from public.representatives r where lower(r.email) = v_email limit 1;
  new.created_by_id := v_email;
  new.created_by    := coalesce(v_name, v_email);
  return new;
end;
$$;

drop trigger if exists set_lead_author on public.leads;
create trigger set_lead_author
  before insert on public.leads
  for each row execute function public.set_lead_author();

-- ── שיחה על הליד ─────────────────────────────────────────────────────────────
create table if not exists public.lead_notes (
  id           bigserial primary key,
  lead_id      text not null references public.leads(id) on delete cascade,
  author_email text,
  author_name  text,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id, created_at);

alter table public.lead_notes enable row level security;

-- מי רואה/כותב: בדיוק מי שרואה את הליד — הנציג המשויך או אדמין
drop policy if exists notes_read  on public.lead_notes;
drop policy if exists notes_write on public.lead_notes;
drop policy if exists notes_admin_delete on public.lead_notes;

create policy notes_read on public.lead_notes
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.leads l
               where l.id = lead_id and lower(l.assigned_email) = lower(public.current_email()))
  );

create policy notes_write on public.lead_notes
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (select 1 from public.leads l
               where l.id = lead_id and lower(l.assigned_email) = lower(public.current_email()))
  );

create policy notes_admin_delete on public.lead_notes
  for delete to authenticated using (public.is_admin());

-- הכותב נקבע בשרת מה-JWT, לא ממה שהלקוח שולח
create or replace function public.set_note_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_name  text;
begin
  if v_email is not null and v_email <> '' then
    select r.name into v_name from public.representatives r where lower(r.email) = v_email limit 1;
    new.author_email := v_email;
    new.author_name  := coalesce(v_name, v_email);
  end if;
  new.body := btrim(new.body);
  if new.body = '' then
    raise exception 'empty note' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists set_note_author on public.lead_notes;
create trigger set_note_author
  before insert on public.lead_notes
  for each row execute function public.set_note_author();

-- lead_summary נשאר לתאימות (ייצוא CSV, דוחות): מחזיק את כל השיחה כטקסט, בסדר כרונולוגי.
-- הכתיבה אליו היא רק דרך השיחה — הטופס הישן של "סיכום" הוסר מהממשק.
create or replace function public.sync_lead_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead text := coalesce(new.lead_id, old.lead_id);
begin
  update public.leads l
     set lead_summary = (
           select string_agg(
                    to_char(n.created_at at time zone 'Asia/Jerusalem', 'DD/MM/YYYY HH24:MI')
                    || ' ' || coalesce(n.author_name, '') || ': ' || n.body,
                    E'\n' order by n.created_at)
           from public.lead_notes n where n.lead_id = v_lead),
         updated_date = now()
   where l.id = v_lead;
  return null;
end;
$$;

drop trigger if exists sync_lead_summary on public.lead_notes;
create trigger sync_lead_summary
  after insert or delete on public.lead_notes
  for each row execute function public.sync_lead_summary();

-- ── הגירה: סיכומים קיימים הופכים להודעה הראשונה בשיחה ───────────────────────
-- הכותב של שדה הסיכום הישן היה תמיד הנציג המשויך (רק הוא ראה את השדה), ולכן
-- ההודעה מיוחסת לו, בתאריך העדכון האחרון של הליד.
alter table public.lead_notes disable trigger set_note_author;
alter table public.lead_notes disable trigger sync_lead_summary;

insert into public.lead_notes (lead_id, author_email, author_name, body, created_at)
select l.id, lower(l.assigned_email), l.assigned_to, btrim(l.lead_summary), coalesce(l.updated_date, l.created_date)
from public.leads l
where coalesce(btrim(l.lead_summary), '') <> ''
  and not exists (select 1 from public.lead_notes n where n.lead_id = l.id);

alter table public.lead_notes enable trigger set_note_author;
alter table public.lead_notes enable trigger sync_lead_summary;

-- 'anonymous' מ-Base44 = לא ידוע; לא מציגים
update public.leads set created_by = null, created_by_id = null where created_by = 'anonymous';

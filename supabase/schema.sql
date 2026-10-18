-- סכמת Knauf Leads ב-Supabase — שלב 0 של ההגירה מ-Base44.
-- מתורגם מ-base44/entities/*.jsonc, עם שמירה על המזהים המקוריים (text) כדי ש-event_id
-- בלידים ימשיך להצביע על הכנס הנכון אחרי הייבוא.
--
-- הערה על ערכי enum: בסכמה של Base44 היו ערכים ישנים ("אדריכל"), אבל בנתונים האמיתיים
-- יש צורות אחרות ("אדריכל/ית") וגם מחרוזת ריקה. לכן השדות כאן הם text בלי CHECK —
-- אימות ערכים ייעשה בשכבת האפליקציה ולא יפיל ייבוא של נתונים קיימים.

create table if not exists public.events (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  event_date    date not null,
  event_end_date date,
  location      text,
  notes         text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text,
  created_by_id text,
  is_sample     boolean not null default false
);

create table if not exists public.representatives (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  email         text,
  role_title    text,
  is_active     boolean not null default true,
  sort_order    numeric,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text,
  created_by_id text,
  is_sample     boolean not null default false
);

create table if not exists public.campaigns (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  source        text,
  form_id       text,
  is_active     boolean,
  notes         text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text,
  created_by_id text,
  is_sample     boolean not null default false
);

create table if not exists public.notification_settings (
  id                  text primary key default gen_random_uuid()::text,
  label               text,
  notification_emails text[] not null default '{}',
  is_active           boolean not null default false,
  reminder_days       integer default 7,
  created_date        timestamptz not null default now(),
  updated_date        timestamptz not null default now(),
  created_by          text,
  created_by_id       text,
  is_sample           boolean not null default false
);

create table if not exists public.leads (
  id               text primary key default gen_random_uuid()::text,
  full_name        text not null,
  phone            text not null,
  email            text,
  company          text,
  city             text,
  role             text,
  project_handling text,
  interests        text[] not null default '{}',
  event_id         text references public.events(id) on delete set null,
  event_name       text,
  campaign_id      text references public.campaigns(id) on delete set null,
  campaign_name    text,
  lead_source      text not null default 'כנס',
  rep_notes        text,
  assigned_to      text,
  assigned_email   text,
  lead_summary     text,
  is_quality       boolean not null default false,
  crm_entered      boolean not null default false,
  status           text not null default 'טרם טופל',
  transfer_log     jsonb not null default '[]'::jsonb,
  reminder_log     jsonb not null default '[]'::jsonb,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text,
  created_by_id    text,
  is_sample        boolean not null default false
);

create index if not exists leads_assigned_email_idx on public.leads (assigned_email);
create index if not exists leads_event_id_idx       on public.leads (event_id);
create index if not exists leads_status_idx         on public.leads (status);
create index if not exists leads_created_date_idx   on public.leads (created_date desc);
create index if not exists events_event_date_idx    on public.events (event_date desc);

-- עדכון אוטומטי של updated_date בכל UPDATE (ב-Base44 זה היה מובנה)
create or replace function public.touch_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['events','representatives','campaigns','notification_settings','leads'] loop
    execute format('drop trigger if exists touch_updated_date on public.%I', t);
    execute format(
      'create trigger touch_updated_date before update on public.%I
         for each row execute function public.touch_updated_date()', t);
  end loop;
end $$;

-- RLS דולק על הכל ובלי מדיניות — כלומר מפתח הדפדפן (publishable) לא יכול לקרוא או לכתוב כלום.
-- הייבוא נעשה עם secret key שעוקף RLS. המדיניות בפועל תיכתב בשלב 2 של ההגירה,
-- יחד עם ההתחברות: יצירה פתוחה לטופס הציבורי, קריאה לאדמין או לנציג שהליד משויך אליו.
alter table public.events                enable row level security;
alter table public.representatives       enable row level security;
alter table public.campaigns             enable row level security;
alter table public.notification_settings enable row level security;
alter table public.leads                 enable row level security;

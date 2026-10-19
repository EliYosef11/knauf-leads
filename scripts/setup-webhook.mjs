#!/usr/bin/env node
/**
 * מחבר את הטריגר "ליד חדש → מייל לנציג" ואת התזכורת היומית.
 *
 *   node scripts/setup-webhook.mjs
 *
 * ב-Base44 זה היה Workflow על יצירת Lead ועוד אחד מתוזמן. כאן:
 *   טריגר AFTER INSERT על leads → קריאת pg_net ל-Edge Function
 *   pg_cron יומי ב-06:00 UTC → אותה פונקציה של התזכורות
 *
 * מפתח השירות נשמר כהגדרת מסד (app.service_key) ולא נכתב לקוד או ל-git;
 * הסקריפט מרכיב את ה-SQL מקומית ושולח אותו דרך ה-Management API.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const url = env('VITE_SUPABASE_URL');
const ref = new URL(url).hostname.split('.')[0];
const serviceKey = env('SUPABASE_SECRET_KEY');

const sql = `
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- הגדרות מסד לא ניתנות לשינוי בהרשאות שלנו, ולכן הסודות יושבים בסכמה פרטית
-- שאינה חשופה ב-API (רק public ו-graphql_public חשופות), ונקראים ע"י הטריגר בלבד.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.config (
  key   text primary key,
  value text not null
);
revoke all on private.config from anon, authenticated;

insert into private.config (key, value) values
  ('service_key', '${serviceKey}'),
  ('functions_url', '${url}/functions/v1')
on conflict (key) do update set value = excluded.value;

create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $fn$
declare
  base_url text := (select value from private.config where key = 'functions_url');
  key      text := (select value from private.config where key = 'service_key');
begin
  perform net.http_post(
    url     := base_url || '/send-lead-notification',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || key),
    body    := jsonb_build_object('record', jsonb_build_object('id', new.id))
  );
  return new;
end;
$fn$;

drop trigger if exists on_lead_created on public.leads;
create trigger on_lead_created
  after insert on public.leads
  for each row execute function public.notify_new_lead();

select cron.unschedule('daily-lead-reminders')
  where exists (select 1 from cron.job where jobname = 'daily-lead-reminders');

select cron.schedule(
  'daily-lead-reminders',
  '0 6 * * *',
  $cron$
  select net.http_post(
    url     := (select value from private.config where key = 'functions_url') || '/send-reminder-email',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || (select value from private.config where key = 'service_key')),
    body    := '{}'::jsonb
  );
  $cron$
);
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env('SUPABASE_ACCESS_TOKEN')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`נכשל (${res.status}):`);
  console.error(body.slice(0, 1500));
  process.exit(1);
}

console.log('הטריגר והתזכורת הוגדרו על', ref);
console.log(body.slice(0, 300));

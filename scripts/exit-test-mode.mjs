#!/usr/bin/env node
/**
 * יציאה ממצב הבדיקות: מחזיר את תפוצת ההתראות המקורית, מוחק את נציג הבדיקה
 * ואת כל הלידים שסומנו is_sample. ראה TESTING.md.
 *
 *   node scripts/exit-test-mode.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const url = env('VITE_SUPABASE_URL');
const key = env('SUPABASE_SECRET_KEY');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const original = JSON.parse(readFileSync(join(root, 'backups/notification-settings-original.json'), 'utf8'))[0];

await fetch(`${url}/rest/v1/notification_settings?id=eq.${original.id}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    notification_emails: original.notification_emails,
    is_active: original.is_active,
    reminder_days: original.reminder_days,
  }),
});

await fetch(`${url}/rest/v1/representatives?id=eq.rep-test-sandbox`, { method: 'DELETE', headers });
await fetch(`${url}/rest/v1/leads?is_sample=eq.true`, { method: 'DELETE', headers });

const settings = await (await fetch(`${url}/rest/v1/notification_settings?select=notification_emails,is_active,reminder_days`, { headers })).json();
const reps = await (await fetch(`${url}/rest/v1/representatives?select=id`, { headers })).json();
const leads = await (await fetch(`${url}/rest/v1/leads?select=id`, { headers })).json();

console.log('תפוצת התראות:', JSON.stringify(settings));
console.log('נציגים:', reps.length, '| לידים:', leads.length);

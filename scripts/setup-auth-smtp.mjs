#!/usr/bin/env node
/**
 * מגדיר את Supabase Auth לשלוח את קודי ההתחברות דרך חשבון ה-Gmail של המערכת,
 * באותה סיסמת אפליקציה שהפונקציות משתמשות בה.
 *
 *   node scripts/setup-auth-smtp.mjs
 *
 * בלי זה, קודי ההתחברות יוצאים מהשרת המשותף של Supabase שמוגבל לכמה הודעות בשעה —
 * מה שלא מספיק ל-19 נציגים. הסודות נקראים מ-.env.local ולא מודפסים.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const ref = new URL(env('VITE_SUPABASE_URL')).hostname.split('.')[0];
const address = env('GMAIL_ADDRESS');

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${env('SUPABASE_ACCESS_TOKEN')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    smtp_admin_email: address,
    smtp_host: 'smtp.gmail.com',
    smtp_port: '465',
    smtp_user: address,
    smtp_pass: env('GMAIL_APP_PASSWORD'),
    smtp_sender_name: 'KNAUF Leads',
    // Gmail מגביל קצב; דקה בין הודעות לאותה כתובת מספיקה בהחלט לנציגים
    smtp_max_frequency: 60,
  }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`נכשל (${res.status}):`);
  console.error(body.slice(0, 1200));
  process.exit(1);
}

const config = JSON.parse(body);
console.log('הוגדר:', {
  host: config.smtp_host,
  port: config.smtp_port,
  sender: config.smtp_admin_email,
  name: config.smtp_sender_name,
  passwordSet: Boolean(config.smtp_pass),
});

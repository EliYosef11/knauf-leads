#!/usr/bin/env node
/**
 * משווה את מה שיושב ב-Supabase מול הגיבוי של Base44, שדה-שדה.
 *
 *   node scripts/verify-supabase-import.mjs [path/to/prod-export.json]
 *
 * יוצא עם קוד 1 אם נמצא הבדל — כדי שאפשר יהיה להריץ את זה גם ברגע המעבר לאוויר.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function env(name) {
  for (const file of ['.env.local', '.env']) {
    try {
      const m = readFileSync(join(root, file), 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'));
      if (m) return m[1].trim();
    } catch {
      // אין קובץ
    }
  }
  return process.env[name] || null;
}

const SUPABASE_URL = env('VITE_SUPABASE_URL');
const SECRET = env('SUPABASE_SECRET_KEY');

const backupPath =
  process.argv[2] ||
  join(root, 'backups', readdirSync(join(root, 'backups')).filter(f => f.startsWith('prod-export')).sort().pop());
const backup = JSON.parse(readFileSync(backupPath, 'utf8'));

async function fetchAll(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

const sameDay = (a, b) => !a === !b && (!a || String(a).slice(0, 10) === String(b).slice(0, 10));
const sameArray = (a, b) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
const sameText = (a, b) => (a ?? '') === (b ?? '');

const checks = [
  ['events', 'Event', { name: sameText, event_date: sameDay, location: sameText }],
  ['representatives', 'Representative', { name: sameText, email: sameText, role_title: sameText }],
  ['notification_settings', 'NotificationSettings', { label: sameText, notification_emails: sameArray }],
  ['leads', 'Lead', {
    full_name: sameText, phone: sameText, email: sameText, company: sameText, city: sameText,
    role: sameText, status: sameText, assigned_email: sameText, assigned_to: sameText,
    rep_notes: sameText, interests: sameArray, event_id: sameText, created_date: sameDay,
  }],
];

let problems = 0;

for (const [table, entity, fields] of checks) {
  const rows = await fetchAll(table);
  const source = backup[entity] || [];
  const byId = new Map(rows.map(r => [r.id, r]));

  if (rows.length !== source.length) {
    console.log(`❌ ${table}: ${rows.length} שורות ב-Supabase מול ${source.length} בגיבוי`);
    problems++;
  }

  let mismatches = 0;
  for (const src of source) {
    const got = byId.get(src.id);
    if (!got) {
      console.log(`❌ ${table}: חסרה שורה ${src.id}`);
      problems++;
      continue;
    }
    for (const [field, equal] of Object.entries(fields)) {
      if (!equal(got[field], src[field])) {
        console.log(`❌ ${table}/${src.id} שדה ${field}: "${src[field]}" → "${got[field]}"`);
        mismatches++;
        problems++;
      }
    }
  }
  if (mismatches === 0 && rows.length === source.length) {
    console.log(`✅ ${table}: ${rows.length} שורות, כל השדות שנבדקו זהים`);
  }
}

// בדיקת שלמות קישורים: כל event_id בליד חייב להצביע על כנס קיים
const leads = await fetchAll('leads');
const eventIds = new Set((await fetchAll('events')).map(e => e.id));
const orphans = leads.filter(l => l.event_id && !eventIds.has(l.event_id));
if (orphans.length) {
  console.log(`❌ ${orphans.length} לידים מצביעים על כנס שלא קיים`);
  problems++;
} else {
  const linked = leads.filter(l => l.event_id).length;
  console.log(`✅ קישורי כנסים: ${linked} מתוך ${leads.length} לידים משויכים לכנס קיים`);
}

console.log(problems === 0 ? '\nהכול תקין.' : `\nנמצאו ${problems} בעיות.`);
process.exit(problems === 0 ? 0 : 1);

#!/usr/bin/env node
/**
 * ייבוא הנתונים מהגיבוי של Base44 ל-Supabase (שלב 0 של ההגירה).
 *
 *   node scripts/import-to-supabase.mjs [path/to/prod-export.json]
 *
 * ברירת מחדל: קובץ ה-prod-export האחרון בתיקיית backups/.
 * דורש ב-.env.local:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SECRET_KEY   ← מפתח secret (עוקף RLS). לעולם לא נכנס ל-git.
 *
 * הסקריפט אידמפוטנטי: הכתיבה היא upsert לפי id, כך שהרצה חוזרת מעדכנת ולא מכפילה.
 * המזהים המקוריים של Base44 נשמרים, ולכן event_id בלידים ממשיך להצביע על הכנס הנכון.
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
      // אין קובץ — ממשיכים
    }
  }
  return process.env[name] || null;
}

const SUPABASE_URL = env('VITE_SUPABASE_URL');
const SECRET = env('SUPABASE_SECRET_KEY');

if (!SUPABASE_URL || !SECRET) {
  console.error('חסר VITE_SUPABASE_URL או SUPABASE_SECRET_KEY ב-.env.local');
  process.exit(1);
}

const backupPath =
  process.argv[2] ||
  join(root, 'backups', readdirSync(join(root, 'backups')).filter(f => f.startsWith('prod-export')).sort().pop());

const data = JSON.parse(readFileSync(backupPath, 'utf8'));
console.log(`מייבא מתוך ${backupPath}`);

// PostgREST דורש שכל האובייקטים בהכנסה מרובה יכילו בדיוק את אותם מפתחות, ולכן כל שורה
// נבנית עם כל השדות. שדה חסר מקבל את ברירת המחדל שלו — null לעמודות שמרשות זאת,
// והערך שהיה ב-Base44 לעמודות NOT NULL (למשל lead_source שמופיע רק בחלק מהלידים).
const meta = { id: null, created_date: null, updated_date: null, created_by: null, created_by_id: null, is_sample: false };

const pick = (row, defaults) => {
  const out = {};
  for (const [f, fallback] of Object.entries({ ...defaults, ...meta })) {
    out[f] = row[f] === undefined || row[f] === null ? fallback : row[f];
  }
  return out;
};

const eventIds = new Set((data.Event || []).map(e => e.id));
const campaignIds = new Set((data.Campaign || []).map(c => c.id));

const tables = [
  ['events', (data.Event || []).map(r =>
    pick(r, { name: null, event_date: null, event_end_date: null, location: null, notes: null }))],
  ['representatives', (data.Representative || []).map(r =>
    pick(r, { name: null, email: null, role_title: null, is_active: true, sort_order: null }))],
  ['campaigns', (data.Campaign || []).map(r =>
    pick(r, { name: null, source: null, form_id: null, is_active: null, notes: null }))],
  ['notification_settings', (data.NotificationSettings || []).map(r =>
    pick(r, { label: null, notification_emails: [], is_active: false, reminder_days: 7 }))],
  ['leads', (data.Lead || []).map(r => {
    const row = pick(r, {
      full_name: null, phone: null, email: null, company: null, city: null, role: null,
      project_handling: null, interests: [], event_id: null, event_name: null,
      campaign_id: null, campaign_name: null, lead_source: 'כנס', rep_notes: null,
      assigned_to: null, assigned_email: null, lead_summary: null, is_quality: false,
      crm_entered: false, status: 'טרם טופל', transfer_log: [], reminder_log: [],
    });
    // מפתח זר שאינו קיים בגיבוי — מאפסים ושומרים את השם הטקסטואלי
    if (row.event_id && !eventIds.has(row.event_id)) row.event_id = null;
    if (row.campaign_id && !campaignIds.has(row.campaign_id)) row.campaign_id = null;
    return row;
  })],
];

async function upsert(table, rows) {
  if (rows.length === 0) {
    console.log(`${table}: אין שורות`);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SECRET,
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation,count=exact',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  const written = await res.json();
  console.log(`${table}: ${written.length} שורות`);
}

for (const [table, rows] of tables) await upsert(table, rows);
console.log('הייבוא הסתיים.');

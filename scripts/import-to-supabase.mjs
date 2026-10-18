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

const meta = ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'is_sample'];
const pick = (row, fields) => {
  const out = {};
  for (const f of [...fields, ...meta]) if (row[f] !== undefined && row[f] !== null) out[f] = row[f];
  return out;
};

const eventIds = new Set((data.Event || []).map(e => e.id));
const campaignIds = new Set((data.Campaign || []).map(c => c.id));

const tables = [
  ['events', (data.Event || []).map(r => pick(r, ['name', 'event_date', 'event_end_date', 'location', 'notes']))],
  ['representatives', (data.Representative || []).map(r => pick(r, ['name', 'email', 'role_title', 'is_active', 'sort_order']))],
  ['campaigns', (data.Campaign || []).map(r => pick(r, ['name', 'source', 'form_id', 'is_active', 'notes']))],
  ['notification_settings', (data.NotificationSettings || []).map(r => pick(r, ['label', 'notification_emails', 'is_active', 'reminder_days']))],
  ['leads', (data.Lead || []).map(r => {
    const row = pick(r, [
      'full_name', 'phone', 'email', 'company', 'city', 'role', 'project_handling', 'interests',
      'event_id', 'event_name', 'campaign_id', 'campaign_name', 'lead_source', 'rep_notes',
      'assigned_to', 'assigned_email', 'lead_summary', 'is_quality', 'crm_entered', 'status',
      'transfer_log', 'reminder_log',
    ]);
    // מפתח זר שאינו קיים בגיבוי — מנקים אותו ושומרים את השם הטקסטואלי
    if (row.event_id && !eventIds.has(row.event_id)) delete row.event_id;
    if (row.campaign_id && !campaignIds.has(row.campaign_id)) delete row.campaign_id;
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

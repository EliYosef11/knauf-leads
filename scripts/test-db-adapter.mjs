#!/usr/bin/env node
/**
 * בדיקת שכבת הנתונים (src/api/dbFactory.js) מול Supabase האמיתי.
 *
 *   node scripts/test-db-adapter.mjs
 *
 * בודק שהסמנטיקה של Base44 נשמרה: מיון יורד/עולה, הגבלת כמות, שוויון,
 * אופרטור $lte, ומחזור חיים מלא של רשומה (create → update → delete).
 * כל הכתיבות נעשות על רשומת בדיקה זמנית שנמחקת בסוף, ולא נוגעות בלידים האמיתיים.
 *
 * רץ עם SUPABASE_SECRET_KEY כי RLS עדיין נעול בלי מדיניות (עד שלב 2).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createDb } from '../src/api/dbFactory.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const db = createDb(createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), {
  auth: { persistSession: false },
}));

let failures = 0;
const check = (name, condition, detail = '') => {
  console.log(`${condition ? '✅' : '❌'} ${name}${detail && !condition ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
};

// --- קריאה: מיון, הגבלה, סינון -------------------------------------------------
const leadsDesc = await db.Lead.list('-created_date', 500);
check('Lead.list מחזיר את כל 55 הלידים', leadsDesc.length === 55, `התקבלו ${leadsDesc.length}`);

const dates = leadsDesc.map(l => new Date(l.created_date).getTime());
check('מיון יורד לפי created_date', dates.every((d, i) => i === 0 || dates[i - 1] >= d));

const repsAsc = await db.Representative.list('sort_order', 200);
const orders = repsAsc.map(r => r.sort_order ?? 0);
check('מיון עולה לפי sort_order', orders.every((o, i) => i === 0 || orders[i - 1] <= o));

const limited = await db.Lead.list('-created_date', 5);
check('הגבלת כמות (limit)', limited.length === 5, `התקבלו ${limited.length}`);

const activeReps = await db.Representative.filter({ is_active: true }, 'sort_order', 100);
check('סינון שוויון is_active', activeReps.length > 0 && activeReps.every(r => r.is_active === true));

const today = new Date().toISOString().split('T')[0];
const pastEvents = await db.Event.filter({ event_date: { $lte: today } }, '-event_date', 50);
check('אופרטור $lte על תאריכים', pastEvents.every(e => e.event_date <= today) && pastEvents.length > 0,
  `${pastEvents.length} כנסים עד ${today}`);

const sampleLead = leadsDesc.find(l => (l.interests || []).length > 0);
check('מערך תחומי עניין חוזר כמערך', Array.isArray(sampleLead?.interests));
check('טקסט בעברית נשמר', /[֐-׿]/.test(sampleLead?.full_name || sampleLead?.status || ''));

const byRep = await db.Lead.filter({ assigned_to: leadsDesc[0].assigned_to }, '-created_date', 500);
check('סינון לידים לפי נציג', byRep.length > 0 && byRep.every(l => l.assigned_to === leadsDesc[0].assigned_to));

// --- כתיבה: מחזור חיים מלא על רשומת בדיקה --------------------------------------
const created = await db.Lead.create({
  full_name: 'בדיקת מערכת — למחיקה',
  phone: '000-0000000',
  interests: ['תקרות'],
  status: 'טרם טופל',
  is_sample: true,
});
check('create מחזיר את הרשומה עם id', Boolean(created?.id));
check('create שומר ברירות מחדל', created.lead_source === 'כנס' && created.is_quality === false);

const updated = await db.Lead.update(created.id, { status: 'טופל', rep_notes: 'עודכן בבדיקה' });
check('update מחזיר את הרשומה המעודכנת', updated.status === 'טופל' && updated.rep_notes === 'עודכן בבדיקה');
check('טריגר updated_date פועל', new Date(updated.updated_date) >= new Date(created.updated_date));

const fetched = await db.Lead.get(created.id);
check('get לפי מזהה', fetched.id === created.id);

await db.Lead.delete(created.id);
const after = await db.Lead.filter({ id: created.id });
check('delete מסיר את הרשומה', after.length === 0);

const finalCount = (await db.Lead.list('-created_date', 500)).length;
check('מספר הלידים חזר ל-55 אחרי הניקוי', finalCount === 55, `התקבלו ${finalCount}`);

// --- הרשאות: מה שאורח (מפתח הדפדפן) יכול ולא יכול ------------------------------
const anon = createDb(createClient(env('VITE_SUPABASE_URL'), env('VITE_SUPABASE_PUBLISHABLE_KEY'), {
  auth: { persistSession: false },
}));

check('אורח קורא כנסים (הטופס צריך אותם)', (await anon.Event.list()).length === 13);
check('אורח קורא נציגים', (await anon.Representative.list('sort_order', 100)).length === 19);
check('אורח לא קורא לידים', (await anon.Lead.list('-created_date', 500)).length === 0);

// הטופס בכנס חייב לעבוד בלי התחברות — וזה גם המסלול שבו insert...returning נחסם ע"י RLS
const anonLead = await anon.Lead.create({
  full_name: 'בדיקת הרשאות — למחיקה',
  phone: '000-0000000',
  assigned_email: 'nobody@example.com',
  is_sample: true,
});
check('אורח יוצר ליד דרך הטופס', Boolean(anonLead?.full_name));

const written = (await db.Lead.filter({ full_name: 'בדיקת הרשאות — למחיקה' })).at(0);
check('הליד שנוצר אכן נשמר במסד', Boolean(written));
if (written) await db.Lead.delete(written.id);

check('אין כפילויות ומספר הלידים נשאר 55', (await db.Lead.list('-created_date', 500)).length === 55);

console.log(failures === 0 ? '\nכל הבדיקות עברו.' : `\n${failures} בדיקות נכשלו.`);
process.exit(failures === 0 ? 0 : 1);

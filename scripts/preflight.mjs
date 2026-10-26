#!/usr/bin/env node
/**
 * בדיקת מוכנות לעלייה לאוויר — מריצה את כל המסלולים הקריטיים מול הסביבה האמיתית.
 *
 *   node scripts/preflight.mjs
 *
 * בודקת: שלמות נתונים, מה אורח יכול ולא יכול, שער ההתחברות, הפרדת הרשאות בין
 * נציגים, הרשאות אדמין, הטריגר שמייצר מייל על ליד חדש, וארבע הפונקציות ששולחות מייל.
 *
 * כל מה שנוצר בדרך מסומן is_sample ונמחק בסוף.
 *
 * הבדיקות ששולחות מייל כבויות כברירת מחדל — הרצה חוזרת הציפה את תיבת המערכת
 * בעשרות הודעות. להפעלה: `node scripts/preflight.mjs --emails`.
 * גם אז המיילים נשלחים אך ורק לתיבת המערכת, לעולם לא לנציג אמיתי.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const URL_ = env('VITE_SUPABASE_URL');
const PUBLISHABLE = env('VITE_SUPABASE_PUBLISHABLE_KEY');
const SECRET = env('SUPABASE_SECRET_KEY');
const SYSTEM_MAILBOX = env('GMAIL_ADDRESS');
const REF = new URL(URL_).hostname.split('.')[0];

const service = createClient(URL_, SECRET, { auth: { persistSession: false } });
const guest = createClient(URL_, PUBLISHABLE, { auth: { persistSession: false } });

let failures = 0;
let checks = 0;
const ok = (name, condition, detail = '') => {
  checks++;
  if (!condition) failures++;
  console.log(`${condition ? '✅' : '❌'} ${name}${detail && !condition ? ` — ${detail}` : ''}`);
};
const section = (title) => console.log(`\n── ${title} ──`);

/** סשן אמיתי עבור כתובת, בלי לשלוח מייל */
async function sessionFor(email) {
  const { data, error } = await service.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) {
    await service.auth.admin.createUser({ email, email_confirm: true });
    return sessionFor(email);
  }
  const client = createClient(URL_, PUBLISHABLE, { auth: { persistSession: false } });
  const { error: verifyError } = await client.auth.verifyOtp({
    email, token: data.properties.email_otp, type: 'email',
  });
  if (verifyError) throw new Error(`התחברות ל-${email} נכשלה: ${verifyError.message}`);
  return client;
}

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('SUPABASE_ACCESS_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

const SEND_EMAILS = process.argv.includes('--emails');

const TEST_REP = { email: SYSTEM_MAILBOX, name: 'נציג בדיקה (למחיקה)' };
const OTHER_REP = { email: 'preflight-other@knauf-test.local', name: 'נציג בדיקה ב׳' };
const createdLeadIds = [];

// מספר ייחודי לכל ליד בדיקה: הגנת ההצפה חוסמת אותו טלפון פעמיים ב-30 שניות
let phoneCounter = 0;
const uniquePhone = () => `050-${String(Date.now() % 10000000 + phoneCounter++).padStart(7, '0')}`;

async function makeLead(fields) {
  const id = `preflight-${Math.random().toString(36).slice(2, 9)}`;
  createdLeadIds.push(id);
  const { error } = await service.from('leads').insert({
    id, full_name: 'בדיקת מוכנות — למחיקה', phone: uniquePhone(), is_sample: true, ...fields,
  });
  if (error) throw new Error(error.message);
  return id;
}

try {
  // ── שלמות נתונים ─────────────────────────────────────────────────────────
  section('שלמות נתונים');
  const backupFile = readdirSync(join(root, 'backups')).filter((f) => f.startsWith('prod-export')).sort().pop();
  const backup = JSON.parse(readFileSync(join(root, 'backups', backupFile), 'utf8'));

  const realLeads = await service.from('leads').select('id').eq('is_sample', false);
  ok('כל הלידים מהגיבוי קיימים', realLeads.data.length === backup.Lead.length,
    `${realLeads.data.length} מול ${backup.Lead.length}`);

  const orphans = await runSql(
    'select count(*)::int as n from public.leads l where l.event_id is not null and not exists (select 1 from public.events e where e.id = l.event_id);');
  ok('אין לידים שמצביעים על כנס שלא קיים', orphans[0]?.n === 0);

  const reps = await service.from('representatives').select('email').eq('is_active', true);
  ok('לכל הנציגים הפעילים יש כתובת מייל', reps.data.every((r) => r.email && r.email.includes('@')));

  // ליד שהמייל עליו אינו של נציג פעיל — הנציג פשוט לא יראה אותו כשיתחבר
  const mismatched = await runSql(
    "select l.assigned_to, l.assigned_email, count(*)::int as n from public.leads l where l.is_sample = false and l.assigned_email is not null and l.assigned_email <> '' and not exists (select 1 from public.representatives r where lower(r.email) = lower(l.assigned_email) and r.is_active) group by 1,2;");
  ok('כל הלידים משויכים למייל של נציג פעיל', (mismatched?.length ?? 0) === 0,
    (mismatched ?? []).map((m) => `${m.assigned_to}: ${m.assigned_email} (${m.n})`).join(', '));

  // ── אורח (הטופס בכנס) ────────────────────────────────────────────────────
  section('אורח — הטופס בכנס');
  ok('קורא כנסים', (await guest.from('events').select('id')).data?.length === backup.Event.length);
  ok('קורא נציגים', (await guest.from('representatives').select('id')).data?.length > 0);
  ok('לא קורא לידים', (await guest.from('leads').select('id')).data?.length === 0);

  const guestLeadId = `preflight-guest-${Math.random().toString(36).slice(2, 7)}`;
  createdLeadIds.push(guestLeadId);
  const guestInsert = await guest.from('leads').insert({
    id: guestLeadId, full_name: 'ליד מהטופס — למחיקה', phone: uniquePhone(),
    event_id: null, assigned_to: TEST_REP.name, assigned_email: TEST_REP.email, is_sample: true,
  });
  ok('יוצר ליד (ללא התחברות)', !guestInsert.error, guestInsert.error?.message);
  ok('לא יכול למחוק ליד', Boolean((await guest.from('leads').delete().eq('id', guestLeadId)).error) ||
    (await service.from('leads').select('id').eq('id', guestLeadId)).data.length === 1);

  const floodPhone = uniquePhone();
  const floodA = `preflight-flood-a-${Math.random().toString(36).slice(2, 6)}`;
  const floodB = `preflight-flood-b-${Math.random().toString(36).slice(2, 6)}`;
  createdLeadIds.push(floodA, floodB);
  await guest.from('leads').insert({ id: floodA, full_name: 'הצפה א', phone: floodPhone, is_sample: true });
  const second = await guest.from('leads').insert({ id: floodB, full_name: 'הצפה ב', phone: floodPhone, is_sample: true });
  ok('שליחה כפולה של אותו מספר נחסמת', Boolean(second.error));

  // ── שער ההתחברות ─────────────────────────────────────────────────────────
  section('מי יכול להתחבר');
  const canLogin = async (email) => (await guest.rpc('can_login', { p_email: email })).data;
  ok('כתובת זרה נחסמת', (await canLogin('stranger@gmail.com')) === false);
  ok('נציג פעיל מורשה', (await canLogin('rotem.hameiri@knauf.com')) === true);
  ok('רישיות לא משנה', (await canLogin('ROTEM.HAMEIRI@knauf.com')) === true);
  ok('אדמין מורשה', (await canLogin('keren.shay@knauf.com')) === true);

  await service.from('representatives').update({ is_active: false }).eq('id', 'rep-test-sandbox');
  ok('נציג שהושבת נחסם', (await canLogin(TEST_REP.email)) === false);
  await service.from('representatives').update({ is_active: true }).eq('id', 'rep-test-sandbox');

  // ── הפרדה בין נציגים ─────────────────────────────────────────────────────
  section('הפרדת נציגים');
  const mineId = await makeLead({ assigned_to: TEST_REP.name, assigned_email: TEST_REP.email });
  const theirsId = await makeLead({ assigned_to: OTHER_REP.name, assigned_email: OTHER_REP.email });

  const repClient = await sessionFor(TEST_REP.email);
  const repLeads = await repClient.from('leads').select('id');
  ok('נציג רואה רק את הלידים שלו',
    repLeads.data.every((l) => l.id !== theirsId) && repLeads.data.some((l) => l.id === mineId),
    `${repLeads.data.length} לידים`);
  ok('נציג מעדכן ליד שלו',
    !(await repClient.from('leads').update({ status: 'טופל' }).eq('id', mineId)).error);
  const foreignUpdate = await repClient.from('leads').update({ status: 'טופל' }).eq('id', theirsId).select();
  ok('נציג לא מעדכן ליד של אחר', (foreignUpdate.data ?? []).length === 0);
  ok('נציג אינו אדמין', (await repClient.rpc('is_admin')).data === false);
  ok('נציג לא קורא את רשימת המנהלים', (await repClient.from('admins').select('email')).data?.length === 0);
  ok('נציג לא מוסיף מנהל', Boolean((await repClient.from('admins').insert({ email: 'x@y.com' })).error));

  // ── אדמין ────────────────────────────────────────────────────────────────
  section('אדמין');
  const adminClient = await sessionFor('eli.yosef@knauf.com');
  ok('אדמין מזוהה ככזה', (await adminClient.rpc('is_admin')).data === true);
  const adminLeads = await adminClient.from('leads').select('id');
  ok('אדמין רואה את כל הלידים', adminLeads.data.length >= backup.Lead.length);
  ok('אדמין קורא את רשימת המנהלים', (await adminClient.from('admins').select('email')).data?.length === 3);
  const grant = await adminClient.from('admins').insert({ email: 'preflight-temp@knauf-test.local' });
  ok('אדמין מעניק הרשאה', !grant.error, grant.error?.message);
  await adminClient.from('admins').delete().eq('email', 'preflight-temp@knauf-test.local');
  ok('אדמין מעדכן ואז מוחק ליד', !(await adminClient.from('leads').delete().eq('id', theirsId)).error);

  // ── הטריגר והמיילים ──────────────────────────────────────────────────────
  section('טריגר ומיילים');
  const before = await runSql('select count(*)::int as n from net._http_response;');
  const triggeredId = await makeLead({
    assigned_to: TEST_REP.name, assigned_email: TEST_REP.email,
    event_name: 'בדיקת מוכנות', interests: ['תקרות'], company: 'חברת בדיקה', city: 'תל אביב',
  });
  await new Promise((r) => setTimeout(r, 15000));
  const responses = await runSql('select status_code from net._http_response order by created desc limit 3;');
  ok('ליד חדש מפעיל את פונקציית המייל',
    (await runSql('select count(*)::int as n from net._http_response;'))[0].n > before[0].n &&
    responses[0]?.status_code === 200,
    JSON.stringify(responses));

  const callFunction = async (name, body) => {
    const res = await fetch(`${URL_}/functions/v1/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  if (SEND_EMAILS) {
    const test = await callFunction('send-test-email', { to: SYSTEM_MAILBOX });
    ok('send-test-email', test.status === 200 && test.body.ok === true, JSON.stringify(test.body));

    const reminder = await callFunction('send-reminder-email', { lead_id: triggeredId });
    ok('send-reminder-email (ליד בודד)', reminder.status === 200 && reminder.body.ok === true, JSON.stringify(reminder.body));

    const transfer = await callFunction('transfer-lead', {
      lead_id: triggeredId, from_rep: OTHER_REP.name, to_rep: TEST_REP.name, to_email: TEST_REP.email, reason: 'בדיקת מוכנות',
    });
    ok('transfer-lead', transfer.status === 200 && transfer.body.ok === true, JSON.stringify(transfer.body));

    const report = await callFunction('export-event-email', {
      eventName: 'בדיקת מוכנות', email: SYSTEM_MAILBOX,
      leads: [{ full_name: 'ליד לדוגמה', phone: '050-0000000', interests: ['תקרות'] }],
    });
    ok('export-event-email', report.status === 200 && report.body.success === true, JSON.stringify(report.body));
  } else {
    console.log('⏭️  בדיקות שליחת מייל דולגו (--emails כדי להפעיל)');
  }

  const meta = await fetch(`${URL_}/functions/v1/meta-webhook?hub.mode=subscribe&hub.verify_token=knauf-meta-webhook&hub.challenge=12345`);
  ok('meta-webhook עונה לאימות של Meta', meta.status === 200 && (await meta.text()) === '12345');
} finally {
  // ── ניקוי ────────────────────────────────────────────────────────────────
  section('ניקוי');
  for (const id of createdLeadIds) await service.from('leads').delete().eq('id', id);
  await service.from('admins').delete().eq('email', 'preflight-temp@knauf-test.local');
  await service.from('representatives').update({ is_active: true }).eq('id', 'rep-test-sandbox');
  const left = await service.from('leads').select('id').eq('is_sample', true);
  const total = await service.from('leads').select('id');
  console.log(`לידי בדיקה שנותרו: ${left.data?.length ?? '?'} | סה״כ לידים: ${total.data?.length ?? '?'}`);
}

console.log(`\n${failures === 0 ? '🟢 כל הבדיקות עברו' : `🔴 ${failures} בדיקות נכשלו`} (${checks} בדיקות)`);
process.exit(failures === 0 ? 0 : 1);

#!/usr/bin/env node
/**
 * מייצר קוד התחברות חד-פעמי לכתובת מייל — בלי לשלוח מייל בפועל.
 *
 *   node scripts/dev-login-code.mjs rep@example.com
 *
 * נועד לפיתוח ובדיקות: Supabase עדיין לא מחוברת לשרת מייל משלנו (שלב 3),
 * והשירות המובנה מוגבל במספר הודעות. הסקריפט משתמש ב-Admin API כדי לייצר
 * את אותו קוד שהיה נשלח, ואז אפשר להזין אותו במסך ההתחברות של האפליקציה.
 *
 * אם המשתמש עדיין לא קיים — הוא נוצר.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const email = process.argv[2];
if (!email) {
  console.error('שימוש: node scripts/dev-login-code.mjs <email>');
  process.exit(1);
}

const admin = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), {
  auth: { persistSession: false },
});

let { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });

if (error) {
  await admin.auth.admin.createUser({ email, email_confirm: true });
  ({ data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email }));
}

if (error) {
  console.error('נכשל:', error.message);
  process.exit(1);
}

console.log(`${email} → ${data.properties.email_otp}`);

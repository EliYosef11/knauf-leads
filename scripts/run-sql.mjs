#!/usr/bin/env node
/**
 * מריץ קובץ SQL מול הפרויקט ב-Supabase, דרך ה-Management API.
 *
 *   node scripts/run-sql.mjs supabase/schema.sql
 *   node scripts/run-sql.mjs supabase/policies.sql --project-ref <ref>
 *
 * דורש SUPABASE_ACCESS_TOKEN ב-.env.local. ברירת המחדל לפרויקט היא זה שב-VITE_SUPABASE_URL,
 * כך שאותו קובץ מריץ תמיד על הסביבה שהאפליקציה המקומית מדברת איתה.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const file = process.argv[2];
if (!file) {
  console.error('שימוש: node scripts/run-sql.mjs <file.sql> [--project-ref <ref>]');
  process.exit(1);
}

const flagIndex = process.argv.indexOf('--project-ref');
const projectRef = flagIndex > -1
  ? process.argv[flagIndex + 1]
  : new URL(env('VITE_SUPABASE_URL')).hostname.split('.')[0];

const query = readFileSync(join(root, file), 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env('SUPABASE_ACCESS_TOKEN')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const body = await res.text();

if (!res.ok) {
  console.error(`נכשל (${res.status}) על ${projectRef}:`);
  console.error(body.slice(0, 1500));
  process.exit(1);
}

console.log(`${file} → ${projectRef}: הורץ בהצלחה`);
if (body && body !== '[]') console.log(body.slice(0, 500));

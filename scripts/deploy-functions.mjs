#!/usr/bin/env node
/**
 * פורס את כל ה-Edge Functions לפרויקט שב-.env.local.
 *
 *   npm run functions:deploy            # הכל
 *   npm run functions:deploy -- transfer-lead send-test-email
 *
 * meta-webhook נפרסת ללא אימות JWT, כי Meta קוראת לה ישירות.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const ref = new URL(env('VITE_SUPABASE_URL')).hostname.split('.')[0];
const PUBLIC_FUNCTIONS = new Set(['meta-webhook']);

const requested = process.argv.slice(2);
const all = readdirSync(join(root, 'supabase/functions'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name);

const functions = requested.length > 0 ? requested : all;

for (const fn of functions) {
  const args = ['supabase', 'functions', 'deploy', fn, '--project-ref', ref];
  if (PUBLIC_FUNCTIONS.has(fn)) args.push('--no-verify-jwt');

  process.stdout.write(`${fn.padEnd(24)} `);
  try {
    execFileSync('npx', args, {
      cwd: root,
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: env('SUPABASE_ACCESS_TOKEN') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log('נפרסה' + (PUBLIC_FUNCTIONS.has(fn) ? ' (ציבורית)' : ''));
  } catch (error) {
    console.log('נכשלה');
    console.error(String(error.stderr || error.stdout || error.message).slice(0, 400));
    process.exitCode = 1;
  }
}

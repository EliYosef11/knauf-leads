#!/usr/bin/env node
/**
 * מזריע את מסד הנתונים של סביבת הפיתוח המקומית בנתוני דמו.
 *
 * הבקאנד המקומי של `base44 dev` מחזיק DB בזיכרון בלבד — כל הנתונים נמחקים
 * בכל הפעלה מחדש. לכן מריצים את הסקריפט הזה אחרי כל `npx base44 dev`:
 *
 *   npm run seed
 *
 * הסקריפט אידמפוטנטי: ישות שכבר יש בה שורות — מדלגים עליה.
 * המקור: scripts/seed-data.json (מייל הנציגים מוחלף בכתובות בדיקה).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const BACKEND = process.env.BASE44_LOCAL_BACKEND || 'http://localhost:4400';

function readAppId() {
  if (process.env.VITE_BASE44_APP_ID) return process.env.VITE_BASE44_APP_ID;
  for (const file of ['.env.local', '.env']) {
    try {
      const match = readFileSync(join(root, file), 'utf8').match(/^VITE_BASE44_APP_ID=(.+)$/m);
      if (match) return match[1].trim();
    } catch {
      // קובץ לא קיים — ממשיכים לבא בתור
    }
  }
  try {
    const appFile = readFileSync(join(root, 'base44/.app.jsonc'), 'utf8');
    const match = appFile.match(/"id"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
  } catch {
    // אין קובץ קישור
  }
  return null;
}

const appId = readAppId();
if (!appId) {
  console.error('לא נמצא app id. ודא ש-.env.local או base44/.app.jsonc קיימים.');
  process.exit(1);
}

const api = `${BACKEND}/api/apps/${appId}/entities`;

async function request(method, path, body) {
  const res = await fetch(`${api}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function seed(entity, rows) {
  const existing = await request('GET', entity);
  if (existing.length > 0) {
    console.log(`${entity}: דילוג (כבר יש ${existing.length} שורות)`);
    return;
  }
  for (const row of rows) await request('POST', entity, row);
  console.log(`${entity}: נוצרו ${rows.length} שורות`);
}

const data = JSON.parse(readFileSync(join(__dirname, 'seed-data.json'), 'utf8'));

try {
  await fetch(`${api}/Event`);
} catch {
  console.error(`אין מענה מהבקאנד המקומי ב-${BACKEND}. הרץ קודם: npx base44 dev`);
  process.exit(1);
}

for (const entity of ['Event', 'Representative', 'NotificationSettings', 'Lead']) {
  await seed(entity, data[entity]);
}
console.log('סביבת הפיתוח מוכנה.');

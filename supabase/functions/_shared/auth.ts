/**
 * מי קורא לפונקציה — נבדק בתוך הפונקציה עצמה (26.11.2026).
 *
 * אימות ה-JWT של Supabase בשער רק מוודא שהטוקן תקף, לא שהוא שייך למישהו מורשה.
 * ההרשמה ב-Auth פתוחה (כניסה ראשונה של נציג היא "הרשמה"), ולכן בלי הבדיקה הזו כל מי
 * שהשיג סשן יכול היה לשלוח מיילים מתיבת המערכת או להעביר ליד — הפונקציות רצות עם
 * מפתח השירות ועוקפות RLS.
 *
 * שלושה סוגי קוראים:
 *   service — הטריגר על leads וה-cron (pg_net), שמזדהים במפתח השירות
 *   admin   — משתמש מחובר שרשום ב-public.admins
 *   member  — אדמין, או נציג פעיל ב-public.representatives
 */

import { serviceClient } from './db.ts';
import { json } from './http.ts';

export interface Caller {
  service: boolean;
  email: string | null;
  isAdmin: boolean;
  isMember: boolean;
}

const NOBODY: Caller = { service: false, email: null, isAdmin: false, isMember: false };

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

/** השוואה בזמן קבוע, כדי שמשך התגובה לא יסגיר כמה תווים מהמפתח נכונים */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * האם הטוקן הוא מפתח שירות: public.admins סגורה ב-RLS לכל מי שאינו אדמין מחובר, ולכן
 * רק מפתח שעוקף RLS מקבל ממנה שורות כשהוא משמש גם כ-apikey. מפתח anon מקבל רשימה ריקה,
 * וטוקן של משתמש אינו מתקבל כ-apikey כלל.
 */
async function hasServiceAccess(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/admins?select=email&limit=1`, {
      headers: { apikey: token, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function identify(req: Request): Promise<Caller> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NOBODY;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceKey && sameSecret(token, serviceKey)) {
    return { service: true, email: null, isAdmin: true, isMember: true };
  }

  // הטוקן נבדק מול שרת ה-Auth, לא מפוענח מקומית
  const client = serviceClient();
  const { data, error } = await client.auth.getUser(token);
  const email = normalize(data?.user?.email);
  if (error || !email) {
    // לא משתמש. ייתכן שזה מפתח שירות שאינו זהה תו-בתו למה שהוזרק לפונקציה (המפתח שהטריגר
    // וה-cron שומרים ב-private.config) — בודקים מה הוא מסוגל לעשות בפועל.
    return (await hasServiceAccess(token)) ? { service: true, email: null, isAdmin: true, isMember: true } : NOBODY;
  }

  // הטבלאות קטנות (עשרות שורות), והשוואה בקוד חסינה לאותיות גדולות בכתובת
  const [admins, reps] = await Promise.all([
    client.from('admins').select('email'),
    client.from('representatives').select('email').eq('is_active', true),
  ]);
  const isAdmin = (admins.data ?? []).some((row) => normalize(row.email) === email);
  const isMember = isAdmin || (reps.data ?? []).some((row) => normalize(row.email) === email);

  return { service: false, email, isAdmin, isMember };
}

export function forbidden(): Response {
  return json({ error: 'forbidden' }, { status: 403 });
}

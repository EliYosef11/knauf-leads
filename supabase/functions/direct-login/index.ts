/**
 * כניסה ישירה בלי קוד למייל — מצב חירום.
 *
 * הופעל ב-28.10.2026 באמצע כנס, כשהנציגים לא קיבלו את מיילי הקוד. כל מי שמזין
 * כתובת שרשומה כנציג פעיל (או אדמין) מקבל סשן מיד, בלי אימות של הבעלות על המייל.
 *
 * ⚠️ זה מוריד את רמת האבטחה: מי שיודע את כתובת המייל של נציג יכול להיכנס בשמו.
 * לכן המצב נשלט בסוד DIRECT_LOGIN — כשהוא לא "on" הפונקציה מחזירה 403 והלקוח
 * חוזר למסלול הרגיל של קוד למייל. לכבות: למחוק את הסוד (או לשים off) ולפרוס מחדש.
 *
 * המימוש: אותו מנגנון של scripts/dev-login-code.mjs — generateLink עם מפתח השירות
 * מחזיר את ה-OTP, והלקוח מאמת אותו מול Supabase Auth ומקבל סשן אמיתי. ה-RLS
 * וההרשאות בשרת לא משתנים.
 */

import { serviceClient } from '../_shared/db.ts';
import { preflight, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if ((Deno.env.get('DIRECT_LOGIN') ?? '').toLowerCase() !== 'on') {
    return json({ ok: false, error: 'direct login is disabled' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (!email.includes('@')) return json({ ok: false, error: 'invalid email' }, { status: 400 });

    const client = serviceClient();

    // רק נציג פעיל או אדמין — אותה בדיקה שהמסלול הרגיל עושה לפני שליחת קוד
    const { data: allowed, error: canError } = await client.rpc('can_login', { p_email: email });
    if (canError) throw new Error(canError.message);
    if (allowed !== true) return json({ ok: false, error: 'not a registered representative' }, { status: 403 });

    let link = await client.auth.admin.generateLink({ type: 'magiclink', email });
    if (link.error) {
      // משתמש שעוד לא נכנס אף פעם — יוצרים אותו (כמו shouldCreateUser במסלול הרגיל)
      const created = await client.auth.admin.createUser({ email, email_confirm: true });
      if (created.error && !created.error.message.includes('already')) throw new Error(created.error.message);
      link = await client.auth.admin.generateLink({ type: 'magiclink', email });
      if (link.error) throw new Error(link.error.message);
    }

    return json({ ok: true, email, token: link.data.properties.email_otp });
  } catch (error) {
    return json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
});

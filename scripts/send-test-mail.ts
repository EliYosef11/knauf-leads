/**
 * בדיקת שליחת מייל מקומית, באותו מודול שהפונקציות בענן משתמשות בו.
 *
 *   deno run --allow-env --allow-read --allow-net scripts/send-test-mail.ts [נמען]
 *
 * ברירת המחדל שולחת לחשבון של המערכת עצמו, כדי שבדיקה לא תגיע לאף אחד אחר.
 * קורא את GMAIL_ADDRESS ו-GMAIL_APP_PASSWORD מ-.env.local.
 */

import { sendMail } from '../supabase/functions/_shared/mailer.ts';

const env = await Deno.readTextFile(new URL('../.env.local', import.meta.url));
for (const line of env.split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) Deno.env.set(match[1], match[2].trim());
}

const to = Deno.args[0] || Deno.env.get('GMAIL_ADDRESS')!;

console.log(`שולח מ-${Deno.env.get('GMAIL_ADDRESS')} אל ${to} ...`);

await sendMail({
  to,
  subject: 'בדיקת שליחה — מערכת הלידים החדשה',
  html: `<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:Arial,sans-serif;background:#eef2f7;padding:24px;" dir="rtl">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dde3ec;">
      <div style="background:#0ea5e9;padding:24px 28px;">
        <p style="margin:0;font-size:11px;color:#e0f2fe;letter-spacing:3px;">KNAUF ISRAEL</p>
        <p style="margin:8px 0 0 0;font-size:20px;font-weight:700;color:#fff;">בדיקת שליחה</p>
      </div>
      <div style="padding:24px 28px;color:#1e293b;font-size:14px;line-height:1.6;">
        אם המייל הזה הגיע — מנגנון השליחה של המערכת החדשה עובד,
        והוא יוצא מאותה כתובת שממנה יצאו המיילים עד היום.
      </div>
    </div>
  </body></html>`,
});

console.log('נשלח.');

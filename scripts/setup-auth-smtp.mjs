#!/usr/bin/env node
/**
 * מגדיר את Supabase Auth: שליחה דרך חשבון ה-Gmail של המערכת, תבנית מייל בעברית
 * שמציגה את **הקוד** (ולא קישור), ומגבלת קצב סבירה.
 *
 *   node scripts/setup-auth-smtp.mjs
 *
 * בלי זה, קודי ההתחברות יוצאים מהשרת המשותף של Supabase שמוגבל לכמה הודעות בשעה —
 * מה שלא מספיק ל-19 נציגים. הסודות נקראים מ-.env.local ולא מודפסים.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = (name) => (envFile.match(new RegExp(`^${name}=(.+)$`, 'm')) || [])[1]?.trim();

const ref = new URL(env('VITE_SUPABASE_URL')).hostname.split('.')[0];

// עיצוב תואם לשאר המיילים של המערכת: כותרת כחולה, עברית, RTL
const LOGIN_CODE_TEMPLATE = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,sans-serif;" dir="rtl">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;padding:36px 16px;">
  <tr><td align="center">
    <table width="460" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dde3ec;">
      <tr>
        <td style="background:#0ea5e9;padding:26px 32px;">
          <p style="margin:0;font-size:11px;color:#e0f2fe;letter-spacing:3px;">KNAUF ISRAEL</p>
          <p style="margin:8px 0 0 0;font-size:20px;font-weight:700;color:#ffffff;">כניסה למערכת הלידים</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 8px 32px;text-align:center;">
          <p style="margin:0 0 18px 0;font-size:14px;color:#475569;">הזן את הקוד הבא במסך ההתחברות:</p>
          <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:10px;color:#0f1c2e;direction:ltr;">{{ .Token }}</p>
          <p style="margin:18px 0 0 0;font-size:12px;color:#94a3b8;">הקוד תקף לשעה אחת וניתן לשימוש פעם אחת.</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f4f7fb;border-top:1px solid #dde3ec;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">אם לא ביקשת להתחבר, אפשר להתעלם מהמייל הזה.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
const address = env('GMAIL_ADDRESS');

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${env('SUPABASE_ACCESS_TOKEN')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    smtp_admin_email: address,
    smtp_host: 'smtp.gmail.com',
    smtp_port: '465',
    smtp_user: address,
    smtp_pass: env('GMAIL_APP_PASSWORD'),
    smtp_sender_name: 'KNAUF Leads',
    // Gmail מגביל קצב; דקה בין הודעות לאותה כתובת מספיקה בהחלט לנציגים
    smtp_max_frequency: 60,

    // ברירת המחדל של Supabase היא 2 מיילים לשעה לכל הפרויקט — חסם מיותר ברגע
    // שיש SMTP משלנו. Gmail מתיר מאות ביום, ו-19 נציגים רחוקים מזה.
    rate_limit_email_sent: 100,
    mailer_otp_length: 6,

    // האפליקציה מבקשת קוד, לא קישור. ברירת המחדל שולחת קישור שמפנה ל-site_url
    // ולכן נשבר בכל סביבה שאינה הפרודקשן. התבנית כאן מציגה את הקוד עצמו.
    mailer_subjects_magic_link: 'קוד הכניסה שלך למערכת הלידים',
    mailer_templates_magic_link_content: LOGIN_CODE_TEMPLATE,
    // 28.10.2026: נציג שנכנס בפעם הראשונה הוא "הרשמה" מבחינת Supabase ומקבל תבנית
    // אחרת — ברירת המחדל באנגלית עם קישור, שסינון הדואר של קנאוף זורק. אותה תבנית
    // של קוד גם כאן, וגם להזמנה ליתר ביטחון.
    mailer_subjects_confirmation: 'קוד הכניסה שלך למערכת הלידים',
    mailer_templates_confirmation_content: LOGIN_CODE_TEMPLATE,
    mailer_subjects_invite: 'קוד הכניסה שלך למערכת הלידים',
    mailer_templates_invite_content: LOGIN_CODE_TEMPLATE,

    site_url: 'https://knauf-il-leads.com',
    uri_allow_list: 'http://localhost:5173,http://localhost:5173/**,https://knauf-il-leads.com/**',
  }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`נכשל (${res.status}):`);
  console.error(body.slice(0, 1200));
  process.exit(1);
}

const config = JSON.parse(body);
console.log('הוגדר:', {
  host: config.smtp_host,
  port: config.smtp_port,
  sender: config.smtp_admin_email,
  name: config.smtp_sender_name,
  passwordSet: Boolean(config.smtp_pass),
  rateLimitPerHour: config.rate_limit_email_sent,
  otpLength: config.mailer_otp_length,
  templateShowsCode: config.mailer_templates_magic_link_content.includes('{{ .Token }}'),
  signupTemplateShowsCode: config.mailer_templates_confirmation_content.includes('{{ .Token }}'),
  signupSubject: config.mailer_subjects_confirmation,
});

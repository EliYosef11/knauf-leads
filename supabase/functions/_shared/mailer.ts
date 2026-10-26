/**
 * שליחת מייל מחשבון ה-Gmail הייעודי של המערכת.
 *
 * ב-Base44 השליחה עברה דרך ה-connector שלה (ה-refresh token היה מוחזק אצלם).
 * כאן אנחנו שולחים ישירות מאותה כתובת דרך SMTP של Gmail עם סיסמת אפליקציה,
 * כך שכתובת השולח שהנציגים מכירים נשארת בדיוק אותה כתובת.
 *
 * ההודעה נבנית ב-_shared/smtp.ts ולא בספריית צד שלישי — ראה שם את הסיבה
 * (כותרות בעברית נשברו ל-`=?utf-8?Q?=d7...` בתיבה של הנמען).
 *
 * סודות (Edge Function secrets):
 *   GMAIL_ADDRESS       כתובת החשבון, למשל knauf.il.leads@gmail.com
 *   GMAIL_APP_PASSWORD  סיסמת אפליקציה בת 16 תווים מחשבון Google (דורש אימות דו-שלבי)
 *   MAIL_FROM_NAME      אופציונלי, שם התצוגה. ברירת מחדל: KNAUF Leads
 */

import { sendViaSmtp, encodeHeader } from './smtp.ts';

export interface Mail {
  to: string;
  subject: string;
  html: string;
  cc?: string | string[] | null;
}

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`חסר סוד בהגדרות הפונקציה: ${name}`);
  return value;
}

export function senderAddress(): string {
  return required('GMAIL_ADDRESS');
}

export async function sendMail({ to, subject, html, cc }: Mail): Promise<void> {
  const address = required('GMAIL_ADDRESS');
  const displayName = Deno.env.get('MAIL_FROM_NAME') ?? 'KNAUF Leads';
  const ccList = Array.isArray(cc) ? cc : cc ? [cc] : [];

  await sendViaSmtp(
    {
      hostname: 'smtp.gmail.com',
      port: 465,
      username: address,
      password: required('GMAIL_APP_PASSWORD'),
    },
    {
      from: `${encodeHeader(displayName)} <${address}>`,
      to,
      cc: ccList,
      subject,
      html,
    },
  );
}

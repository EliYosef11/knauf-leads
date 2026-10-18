/**
 * שליחת מייל מחשבון ה-Gmail הייעודי של המערכת.
 *
 * ב-Base44 השליחה עברה דרך ה-connector שלה (ה-refresh token היה מוחזק אצלם).
 * כאן אנחנו שולחים ישירות מאותה כתובת דרך SMTP של Gmail עם סיסמת אפליקציה,
 * כך שכתובת השולח שהנציגים מכירים נשארת בדיוק אותה כתובת.
 *
 * סודות (Edge Function secrets):
 *   GMAIL_ADDRESS       כתובת החשבון, למשל knauf.leads@gmail.com
 *   GMAIL_APP_PASSWORD  סיסמת אפליקציה בת 16 תווים מחשבון Google (דורש אימות דו-שלבי)
 *   MAIL_FROM_NAME      אופציונלי, שם התצוגה. ברירת מחדל: KNAUF Leads
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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
  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: address, password: required('GMAIL_APP_PASSWORD') },
    },
  });

  const ccList = Array.isArray(cc) ? cc : cc ? [cc] : [];

  try {
    await client.send({
      from: `${Deno.env.get('MAIL_FROM_NAME') ?? 'KNAUF Leads'} <${address}>`,
      to,
      cc: ccList.length > 0 ? ccList : undefined,
      subject,
      html,
      // נמענים בעברית/RTL — denomailer מקודד את הכותרות ב-UTF-8 לבד
    });
  } finally {
    await client.close();
  }
}

/**
 * מייל בדיקה ממסך ההגדרות — מוודא שהחיבור לחשבון ה-Gmail עובד.
 * הועבר מ-base44/functions/sendTestEmail. תוכן המייל זהה;
 * הנמען ניתן להעברה בגוף הבקשה, וברירת המחדל נשארה כפי שהייתה.
 */

import { sendMail, senderAddress } from '../_shared/mailer.ts';
import { testEmailHtml } from '../_shared/templates/testEmail.ts';

const DEFAULT_RECIPIENT = 'eli.yosef@knauf.com';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const to: string = body?.to || DEFAULT_RECIPIENT;

    await sendMail({
      to,
      subject: 'ליד חדש - כנס בנייה ישראל 2026 - ישראל ישראלי (בדיקה)',
      html: testEmailHtml,
    });

    return Response.json({ ok: true, from: senderAddress(), to });
  } catch (error) {
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
});

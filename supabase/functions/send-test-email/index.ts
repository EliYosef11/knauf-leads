/**
 * מייל בדיקה ממסך ההגדרות — מוודא שהחיבור לחשבון ה-Gmail עובד.
 * הועבר מ-base44/functions/sendTestEmail. תוכן המייל זהה;
 * הנמען ניתן להעברה בגוף הבקשה, וברירת המחדל נשארה כפי שהייתה.
 */

import { sendMail, senderAddress } from '../_shared/mailer.ts';
import { testEmailHtml } from '../_shared/templates/testEmail.ts';
import { preflight, json } from '../_shared/http.ts';
import { identify, forbidden } from '../_shared/auth.ts';

const DEFAULT_RECIPIENT = 'eli.yosef@knauf.com';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    // אדמין או מפתח השירות (טריגר / cron) בלבד
    const caller = await identify(req);
    if (!caller.isAdmin) return forbidden();

    const body = await req.json().catch(() => ({}));
    const to: string = body?.to || DEFAULT_RECIPIENT;

    await sendMail({
      to,
      subject: 'ליד חדש - כנס בנייה ישראל 2026 - ישראל ישראלי (בדיקה)',
      html: testEmailHtml,
    });

    return json({ ok: true, from: senderAddress(), to });
  } catch (error) {
    return json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
});

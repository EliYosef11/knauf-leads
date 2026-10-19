/**
 * שליחת דוח לידים של כנס למייל. הועבר מ-base44/functions/exportEventEmail.
 *
 * שינוי אחד לעומת המקור: שם הדוח נשלח דרך שירות המייל של Base44
 * (`integrations.Core.SendEmail`), וכאן הוא יוצא מחשבון ה-Gmail של המערכת,
 * כמו שאר המיילים — כלומר שולח אחיד לכל ההתכתבות של המערכת.
 */

import { sendMail } from '../_shared/mailer.ts';
import { eventReportHtml } from '../_shared/templates/eventReport.ts';
import { preflight, json } from '../_shared/http.ts';

interface ExportLead {
  full_name?: string;
  phone?: string;
  email?: string;
  company?: string;
  city?: string;
  role?: string;
  interests?: string[];
  assigned_to?: string;
  rep_notes?: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const { eventName, email, leads } = await req.json().catch(() => ({}));

    if (!eventName || !email || !leads?.length) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rows = (leads as ExportLead[]).map((l) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 12px;font-weight:600;">${l.full_name || ''}</td>
        <td style="padding:10px 12px;direction:ltr;">${l.phone || ''}</td>
        <td style="padding:10px 12px;direction:ltr;">${l.email || ''}</td>
        <td style="padding:10px 12px;">${l.company || ''}</td>
        <td style="padding:10px 12px;">${l.city || ''}</td>
        <td style="padding:10px 12px;">${l.role || ''}</td>
        <td style="padding:10px 12px;">${(l.interests || []).join(', ')}</td>
        <td style="padding:10px 12px;">${l.assigned_to || ''}</td>
        <td style="padding:10px 12px;max-width:200px;font-size:12px;color:#6b7280;">${l.rep_notes || ''}</td>
      </tr>
    `).join('');

    await sendMail({
      to: email,
      subject: `דוח לידים – ${eventName} (${leads.length} לידים)`,
      html: eventReportHtml(eventName, leads, rows),
    });

    return json({ success: true });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 500 });
  }
});

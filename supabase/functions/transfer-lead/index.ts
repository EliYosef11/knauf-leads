/**
 * העברת ליד בין נציגים + מייל יידוע לנציג המקבל.
 * הועבר מ-base44/functions/transferLead. אותה לוגיקה: מעדכנים את השיוך,
 * מוסיפים רשומה ל-transfer_log, ורק אם יש כתובת מייל — שולחים הודעה.
 */

import { serviceClient, type Lead } from '../_shared/db.ts';
import { sendMail } from '../_shared/mailer.ts';
import { transferHtml } from '../_shared/templates/transfer.ts';

Deno.serve(async (req) => {
  try {
    const client = serviceClient();
    const { lead_id, from_rep, to_rep, to_email, reason } = await req.json().catch(() => ({}));

    if (!lead_id || !from_rep || !to_rep) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: lead } = await client.from('leads').select('*').eq('id', lead_id).single<Lead>();
    if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

    const existingLog = Array.isArray(lead.transfer_log) ? lead.transfer_log : [];
    const updatedLog = [...existingLog, {
      from_rep,
      to_rep,
      reason: reason || '',
      date: new Date().toISOString(),
    }];

    const { error } = await client.from('leads').update({
      assigned_to: to_rep,
      assigned_email: to_email || '',
      transfer_log: updatedLog,
    }).eq('id', lead_id);
    if (error) throw new Error(error.message);

    if (to_email) {
      const interestsText = Array.isArray(lead.interests) && lead.interests.length
        ? lead.interests.join(', ')
        : '—';

      await sendMail({
        to: to_email,
        subject: `ליד הועבר אליך: ${lead.full_name || 'ללא שם'}`,
        html: transferHtml(
          lead as unknown as Record<string, string | undefined>,
          from_rep,
          to_rep,
          reason || '',
          interestsText,
        ),
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

/**
 * תזכורת על לידים שלא טופלו. הועבר מ-base44/functions/sendReminderEmail.
 *
 * שני מצבים, כמו קודם:
 *   { lead_id }  — תזכורת ידנית לליד אחד (כפתור במסך הניהול)
 *   {}           — ריצה מתוזמנת (pg_cron): כל הלידים ב"טרם טופל" שעברו את מספר הימים
 *                  שמוגדר בהגדרות, ושעוד לא קיבלו תזכורת מתוזמנת.
 */

import { serviceClient, type Lead } from '../_shared/db.ts';
import { sendMail } from '../_shared/mailer.ts';
import { reminderHtml } from '../_shared/templates/reminder.ts';

const interestsOf = (lead: Lead) =>
  Array.isArray(lead.interests) && lead.interests.length ? lead.interests.join(', ') : '&mdash;';

const asTemplateLead = (lead: Lead) => lead as unknown as Record<string, string | undefined>;

Deno.serve(async (req) => {
  try {
    const client = serviceClient();
    const body = await req.json().catch(() => ({}));

    const logReminder = async (lead: Lead, triggeredBy: string) => {
      const existing = Array.isArray(lead.reminder_log) ? lead.reminder_log : [];
      await client
        .from('leads')
        .update({ reminder_log: [...existing, { sent_at: new Date().toISOString(), triggered_by: triggeredBy }] })
        .eq('id', lead.id);
    };

    // תזכורת ידנית
    if (body?.lead_id) {
      const { data: lead } = await client.from('leads').select('*').eq('id', body.lead_id).single<Lead>();
      if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });
      if (!lead.assigned_email) return Response.json({ ok: false, reason: 'no assigned_email' });

      await sendMail({
        to: lead.assigned_email,
        subject: `תזכורת: ליד ממתין לטיפול - ${lead.full_name || 'ללא שם'}`,
        html: reminderHtml(asTemplateLead(lead), '?', interestsOf(lead)),
      });
      await logReminder(lead, 'manual');
      return Response.json({ ok: true });
    }

    // ריצה מתוזמנת
    const { data: settings } = await client.from('notification_settings').select('*').limit(1);
    const reminderDays = settings?.[0]?.reminder_days ?? 7;

    const { data: untreated } = await client.from('leads').select('*').eq('status', 'טרם טופל');
    const cutoff = Date.now() - reminderDays * 24 * 60 * 60 * 1000;

    const overdue = (untreated ?? []).filter((lead: Lead) => {
      if (!lead.assigned_email) return false;
      // תזכורת מתוזמנת נשלחת פעם אחת בלבד לכל ליד
      const log = Array.isArray(lead.reminder_log) ? lead.reminder_log : [];
      if (log.some((entry) => entry.triggered_by === 'scheduled')) return false;
      return new Date(lead.created_date ?? 0).getTime() < cutoff;
    });

    if (overdue.length === 0) return Response.json({ ok: true, sent: 0 });

    const results: { to: string; lead?: string; ok: boolean; error?: string }[] = [];

    for (const lead of overdue) {
      const daysOld = Math.floor((Date.now() - new Date(lead.created_date ?? 0).getTime()) / 86_400_000);
      try {
        await sendMail({
          to: lead.assigned_email!,
          subject: `תזכורת: ליד ממתין לטיפול ${daysOld} ימים - ${lead.full_name || 'ללא שם'}`,
          html: reminderHtml(asTemplateLead(lead), daysOld, interestsOf(lead)),
        });
        await logReminder(lead, 'scheduled');
        results.push({ to: lead.assigned_email!, lead: lead.full_name, ok: true });
      } catch (error) {
        results.push({ to: lead.assigned_email!, lead: lead.full_name, ok: false, error: (error as Error).message });
      }
    }

    return Response.json({ ok: true, sent: results.filter((r) => r.ok).length, results });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

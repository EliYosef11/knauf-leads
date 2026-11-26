/**
 * מייל "ליד חדש" לנציג המשויך — הפונקציה המרכזית של המערכת.
 * הועברה מ-base44/functions/sendLeadNotification. הלוגיקה והמייל זהים;
 * מה שהשתנה הוא מקור הנתונים (Supabase במקום entities) ואופן השליחה (SMTP במקום connector).
 *
 * מופעלת ע"י Database Webhook על INSERT בטבלת leads, ושולחת:
 *   אל  — lead.assigned_email
 *   עותק — כתובות התפוצה ממסך ההגדרות (ללא כפילות של הנמען הראשי)
 */

import { serviceClient, notificationEmails, type Lead } from '../_shared/db.ts';
import { sendMail } from '../_shared/mailer.ts';
import { newLeadHtml } from '../_shared/templates/newLead.ts';
import { preflight, json } from '../_shared/http.ts';
import { identify, forbidden } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    // אדמין או מפתח השירות (טריגר / cron) בלבד
    const caller = await identify(req);
    if (!caller.isAdmin) return forbidden();

    const client = serviceClient();
    const body = await req.json().catch(() => ({}));

    // נתמך גם Database Webhook (record) וגם קריאה ידנית עם מזהה
    const leadId: string | undefined = body?.record?.id ?? body?.lead_id ?? body?.event?.entity_id;
    if (!leadId) return json({ error: 'Missing lead id' }, { status: 400 });

    const { data: lead } = await client.from('leads').select('*').eq('id', leadId).single<Lead>();
    if (!lead) return json({ error: 'Lead not found' }, { status: 404 });

    // הנמען נקבע מול טבלת הנציגים ולא מתוך הליד:
    //   1. הטופס ציבורי, ולכן כל אחד יכול לשלוח assigned_email שרירותי — בלי הבדיקה הזו
    //      המערכת הופכת לשרת דיוור פתוח שמוען בשם KNAUF.
    //   2. בנתונים יש לידים שהמייל עליהם אינו תואם לרשומת הנציג (שגיאת הקלדה היסטורית),
    //      והתאמה לפי השם מחזירה אותם למסלול הנכון.
    const { data: activeReps } = await client
      .from('representatives')
      .select('name, email')
      .eq('is_active', true);

    const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

    const byEmail = (activeReps ?? []).find((r) => normalize(r.email) === normalize(lead.assigned_email));
    const byName = (activeReps ?? []).find((r) => normalize(r.name) === normalize(lead.assigned_to));
    const recipient = byEmail ?? byName;

    const fail = async (reason: string, status: number) => {
      await client.from('leads').update({ notify_error: reason }).eq('id', leadId);
      return json({ ok: false, error: reason, lead_id: leadId }, { status });
    };

    if (!recipient?.email) {
      return fail('assigned_email does not belong to an active representative', 422);
    }

    const mainTo = recipient.email;
    const correctedFrom = byEmail ? null : lead.assigned_email ?? null;

    const ccList = (await notificationEmails(client)).filter((e) => e !== mainTo);

    const createdDate = lead.created_date ? new Date(lead.created_date) : new Date();
    const formattedDate = createdDate.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

    const interestsText = Array.isArray(lead.interests) && lead.interests.length
      ? lead.interests.join(', ')
      : '—';

    const eventPart = lead.event_name ? ` - ${lead.event_name}` : '';
    const subject = `ליד חדש${eventPart} - ${lead.full_name || 'ללא שם'}`;

    const rows: ([string, string] | null)[] = [
      ['שם מלא', lead.full_name || '—'],
      ['טלפון', lead.phone || '—'],
      ['דוא"ל', lead.email || '—'],
      ['חברה', lead.company || '—'],
      ['עיר', lead.city || '—'],
      ['תפקיד', lead.role || '—'],
      lead.project_handling ? ['טיפול בפרויקט', lead.project_handling] : null,
      ['תחומי עניין', interestsText],
      lead.rep_notes ? ['הערות', lead.rep_notes] : null,
      lead.assigned_to ? ['לטיפול', lead.assigned_to] : null,
      ['תאריך', formattedDate],
    ];

    const tableRows = (rows.filter(Boolean) as [string, string][]).map(([label, value]) =>
      `<tr><td style="padding:7px 20px 7px 0;color:#94a3b8;white-space:nowrap;vertical-align:top;font-family:'Heebo',Arial,sans-serif;font-size:13px;font-weight:500;">${label}</td><td style="padding:7px 0;color:#1e293b;font-family:'Heebo',Arial,sans-serif;font-weight:600;font-size:13px;">${String(value).replace(/\n/g, '<br>')}</td></tr>`
    ).join('');

    try {
      await sendMail({
        to: mainTo,
        cc: ccList.length > 0 ? ccList : null,
        subject,
        html: newLeadHtml(lead, tableRows),
      });
    } catch (sendError) {
      return fail((sendError as Error).message, 502);
    }

    // סימון הצלחה על הליד, כדי שמסך הניהול יוכל להראות מה לא נשלח
    await client
      .from('leads')
      .update({ notified_at: new Date().toISOString(), notify_error: null })
      .eq('id', leadId);

    return json({ ok: true, to: mainTo, cc: ccList, corrected_from: correctedFrom });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 500 });
  }
});

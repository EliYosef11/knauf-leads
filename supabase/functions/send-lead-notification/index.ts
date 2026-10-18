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

Deno.serve(async (req) => {
  try {
    const client = serviceClient();
    const body = await req.json().catch(() => ({}));

    // נתמך גם Database Webhook (record) וגם קריאה ידנית עם מזהה
    const leadId: string | undefined = body?.record?.id ?? body?.lead_id ?? body?.event?.entity_id;
    if (!leadId) return Response.json({ error: 'Missing lead id' }, { status: 400 });

    const { data: lead } = await client.from('leads').select('*').eq('id', leadId).single<Lead>();
    if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

    const mainTo = lead.assigned_email;
    if (!mainTo) return Response.json({ ok: false, error: 'No assigned email for lead' }, { status: 400 });

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

    await sendMail({
      to: mainTo,
      cc: ccList.length > 0 ? ccList : null,
      subject,
      html: newLeadHtml(lead, tableRows),
    });

    return Response.json({ ok: true, to: mainTo, cc: ccList });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

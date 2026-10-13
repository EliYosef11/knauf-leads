import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function encodeSubject(subject) {
    const encoded = btoa(unescape(encodeURIComponent(subject)));
    return `=?UTF-8?B?${encoded}?=`;
}

function buildRawEmail({ from, to, subject, html }) {
    const boundary = 'boundary_' + Math.random().toString(36).slice(2);
    const encodedSubject = encodeSubject(subject);
    const message = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${encodedSubject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        btoa(unescape(encodeURIComponent(html))),
        '',
        `--${boundary}--`,
    ].join('\r\n');
    return btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function buildReminderHtml(lead, daysOld) {
    const interestsText = Array.isArray(lead.interests) && lead.interests.length
        ? lead.interests.join(', ')
        : '&mdash;';
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;" dir="rtl">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f9;">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="background-color:#d97706; padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#fef3c7; letter-spacing:2px;">KNAUF &bull; תזכורת ליד</td>
              </tr>
              <tr>
                <td style="font-family:Arial, Helvetica, sans-serif; font-size:24px; font-weight:bold; color:#ffffff; padding-top:8px;">${lead.full_name || 'ללא שם'}</td>
              </tr>
              ${lead.event_name ? `<tr><td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#fef3c7; padding-top:4px;">${lead.event_name}</td></tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Warning banner -->
        <tr>
          <td style="padding:20px 32px 4px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:#fef3c7; border:1px solid #fde68a; padding:14px 18px;">
                  <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#92400e;">הליד לא טופל כבר <strong>${daysOld} ימים</strong>. נא לחזור אליו בהקדם.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Lead details -->
        <tr>
          <td style="padding:8px 32px 24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#64748b; width:130px;">טלפון</td><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a2540;"><a href="tel:${lead.phone || ''}" style="color:#005fa3; text-decoration:none;">${lead.phone || '&mdash;'}</a></td></tr>
              <tr><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#64748b;">דוא"ל</td><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a2540;">${lead.email ? `<a href="mailto:${lead.email}" style="color:#005fa3; text-decoration:none;">${lead.email}</a>` : '&mdash;'}</td></tr>
              <tr><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#64748b;">חברה</td><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a2540;">${lead.company || '&mdash;'}</td></tr>
              <tr><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#64748b;">עיר</td><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a2540;">${lead.city || '&mdash;'}</td></tr>
              <tr><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#64748b;">תפקיד</td><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a2540;">${lead.role || '&mdash;'}</td></tr>
              <tr><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#64748b; vertical-align:top;">תחומי עניין</td><td style="padding:9px 0; border-bottom:1px solid #f1f5f9; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a2540;">${interestsText}</td></tr>
              ${lead.assigned_to ? `<tr><td style="padding:9px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#64748b;">לטיפול</td><td style="padding:9px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; color:#1a2540;">${lead.assigned_to}</td></tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Instructions -->
        <tr>
          <td style="background-color:#eef6ff; border-top:2px solid #005fa3; padding:24px 32px;">
            <p style="margin:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; color:#005fa3;">כיצד לסכם ולטפל בליד</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#1a2540; padding:4px 0;">1. צרו קשר עם הליד בהקדם האפשרי (רצוי תוך 24 שעות)</td></tr>
              <tr><td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#1a2540; padding:4px 0;">2. זהו את הצורך המרכזי ותחומי העניין שלו</td></tr>
              <tr><td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#1a2540; padding:4px 0;">3. הציגו פתרון מתאים מתוצרי KNAUF</td></tr>
              <tr><td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#1a2540; padding:4px 0;">4. סכמו את השיחה/הפגישה ועדכנו את המערכת</td></tr>
              <tr><td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#1a2540; padding:4px 0;">5. עדכנו סטטוס ל"טופל" לאחר ביצוע הפנייה</td></tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 32px; text-align:center;">
            <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#94a3b8;">הודעה אוטומטית ממערכת הלידים של KNAUF</p>
            <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#cbd5e1;">אין להשיב למייל זה</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json().catch(() => ({}));

        // Manual trigger for a specific lead (from button in UI)
        if (body.lead_id) {
            const lead = await base44.asServiceRole.entities.Lead.get(body.lead_id);
            if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });
            if (!lead.assigned_email) return Response.json({ ok: false, reason: 'no assigned_email' });

            const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
            const subject = `תזכורת: ליד ממתין לטיפול - ${lead.full_name || 'ללא שם'}`;
            const html = buildReminderHtml(lead, '?');
            const raw = buildRawEmail({ from: 'KNAUF Leads <me>', to: lead.assigned_email, subject, html });

            const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw })
            });

            if (!gmailRes.ok) {
                const err = await gmailRes.json();
                return Response.json({ ok: false, error: err.error?.message }, { status: 500 });
            }
            // Log reminder sent time
            const existing = Array.isArray(lead.reminder_log) ? lead.reminder_log : [];
            await base44.asServiceRole.entities.Lead.update(body.lead_id, {
                reminder_log: [...existing, { sent_at: new Date().toISOString(), triggered_by: 'manual' }]
            });
            return Response.json({ ok: true });
        }

        // Scheduled: find all untreated leads older than configured days
        const settingsList = await base44.asServiceRole.entities.NotificationSettings.list();
        const reminderDays = settingsList[0]?.reminder_days ?? 7;
        const allLeads = await base44.asServiceRole.entities.Lead.filter({ status: 'טרם טופל' });
        const cutoff = Date.now() - reminderDays * 24 * 60 * 60 * 1000;

        const overdueLeads = allLeads.filter(l => {
            if (!l.assigned_email) return false;
            // Skip leads that already received a scheduled reminder (one-time only)
            const reminderLog = Array.isArray(l.reminder_log) ? l.reminder_log : [];
            const alreadyReminded = reminderLog.some(entry => entry.triggered_by === 'scheduled');
            if (alreadyReminded) return false;
            const created = new Date(l.created_date).getTime();
            return created < cutoff;
        });

        if (overdueLeads.length === 0) return Response.json({ ok: true, sent: 0 });

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
        const results = [];

        for (const lead of overdueLeads) {
            const daysOld = Math.floor((Date.now() - new Date(lead.created_date).getTime()) / (1000 * 60 * 60 * 24));
            const subject = `תזכורת: ליד ממתין לטיפול ${daysOld} ימים - ${lead.full_name || 'ללא שם'}`;
            const html = buildReminderHtml(lead, daysOld);
            const raw = buildRawEmail({ from: 'KNAUF Leads <me>', to: lead.assigned_email, subject, html });

            const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw })
            });

            if (gmailRes.ok) {
                results.push({ to: lead.assigned_email, lead: lead.full_name, ok: true });
                const existing = Array.isArray(lead.reminder_log) ? lead.reminder_log : [];
                await base44.asServiceRole.entities.Lead.update(lead.id, {
                    reminder_log: [...existing, { sent_at: new Date().toISOString(), triggered_by: 'scheduled' }]
                });
            } else {
                const err = await gmailRes.json();
                results.push({ to: lead.assigned_email, lead: lead.full_name, ok: false, error: err.error?.message });
            }
        }

        return Response.json({ ok: true, sent: results.length, results });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
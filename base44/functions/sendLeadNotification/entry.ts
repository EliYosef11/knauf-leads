import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function encodeSubject(subject) {
    const encoded = btoa(unescape(encodeURIComponent(subject)));
    return `=?UTF-8?B?${encoded}?=`;
}

function buildRawEmail({ from, to, cc, subject, html }) {
    const boundary = 'boundary_' + Math.random().toString(36).slice(2);
    const encodedSubject = encodeSubject(subject);

    const headers = [
        `From: ${from}`,
        `To: ${to}`,
    ];
    if (cc) headers.push(`Cc: ${cc}`);
    headers.push(`Subject: ${encodedSubject}`);

    const message = [
        ...headers,
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

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const body = await req.json();
        const leadId = body?.event?.entity_id;

        if (!leadId) {
            return Response.json({ error: 'Missing lead id' }, { status: 400 });
        }

        const lead = await base44.asServiceRole.entities.Lead.get(leadId);
        if (!lead) {
            return Response.json({ error: 'Lead not found' }, { status: 404 });
        }

        // Load CC emails from NotificationSettings
        const settingsList = await base44.asServiceRole.entities.NotificationSettings.list();
        const notifSettings = settingsList[0];
        const ccEmails = (notifSettings?.is_active && Array.isArray(notifSettings?.notification_emails))
            ? notifSettings.notification_emails
            : [];

        const mainTo = lead.assigned_email;
        if (!mainTo) {
            return Response.json({ ok: false, error: 'No assigned email for lead' }, { status: 400 });
        }
        // CC = all notification emails excluding the main recipient
        const ccList = ccEmails.filter(e => e !== mainTo);
        const cc = ccList.length > 0 ? ccList.join(', ') : null;

        const createdDate = lead.created_date ? new Date(lead.created_date) : new Date();
        const formattedDate = createdDate.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

        const interestsText = Array.isArray(lead.interests) && lead.interests.length
            ? lead.interests.join(', ')
            : '—';

        const eventPart = lead.event_name ? ` - ${lead.event_name}` : '';
        const subject = `ליד חדש${eventPart} - ${lead.full_name || 'ללא שם'}`;

        const rows = [
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
        ].filter(Boolean);

        const tableRows = rows.map(([label, value]) =>
            `<tr><td style="padding:7px 20px 7px 0;color:#94a3b8;white-space:nowrap;vertical-align:top;font-family:'Heebo',Arial,sans-serif;font-size:13px;font-weight:500;">${label}</td><td style="padding:7px 0;color:#1e293b;font-family:'Heebo',Arial,sans-serif;font-weight:600;font-size:13px;">${String(value).replace(/\n/g, '<br>')}</td></tr>`
        ).join('');

        const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Heebo',Arial,sans-serif;font-size:14px;color:#1e293b;" dir="rtl">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;padding:36px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dde3ec;">

      <!-- Header -->
      <tr>
        <td style="background:#0ea5e9;padding:28px 32px 24px 32px;">
          <p style="margin:0;font-family:'Heebo',Arial,sans-serif;font-size:11px;color:#e0f2fe;letter-spacing:3px;text-transform:uppercase;font-weight:500;">KNAUF ISRAEL</p>
          <p style="margin:8px 0 0 0;font-family:'Heebo',Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">ליד חדש התקבל</p>
          ${lead.event_name ? `<p style="margin:5px 0 0 0;font-family:'Heebo',Arial,sans-serif;font-size:14px;color:#e0f2fe;font-weight:400;">${lead.event_name}</p>` : ''}
        </td>
      </tr>

      <!-- Lead details -->
      <tr>
        <td style="padding:28px 32px 12px 32px;">
          <p style="margin:0 0 16px 0;font-family:'Heebo',Arial,sans-serif;font-size:12px;font-weight:700;color:#1a3558;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #e8edf4;padding-bottom:10px;">פרטי הליד</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${tableRows}
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#e8edf4;"></div></td></tr>

      <!-- Steps -->
      <tr>
        <td style="padding:20px 32px 28px 32px;">
          <p style="margin:0 0 14px 0;font-family:'Heebo',Arial,sans-serif;font-size:12px;font-weight:700;color:#1a3558;letter-spacing:1.5px;text-transform:uppercase;">שלבי טיפול</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;white-space:nowrap;width:24px;vertical-align:top;">1.</td><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;">צרו קשר בהקדם (רצוי תוך 24 שעות)</td></tr>
            <tr><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;white-space:nowrap;width:24px;vertical-align:top;">2.</td><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;">זהו את הצורך ותחומי העניין</td></tr>
            <tr><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;white-space:nowrap;width:24px;vertical-align:top;">3.</td><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;">הציגו פתרון מתאים מתוצרי KNAUF</td></tr>
            <tr><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;white-space:nowrap;width:24px;vertical-align:top;">4.</td><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;">סכמו את השיחה ועדכנו את המערכת</td></tr>
            <tr><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;white-space:nowrap;width:24px;vertical-align:top;">5.</td><td style="padding:5px 0;font-family:'Heebo',Arial,sans-serif;font-size:13px;color:#475569;line-height:1.5;">עדכנו סטטוס ל"טופל" לאחר ביצוע הפנייה</td></tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f4f7fb;border-top:1px solid #dde3ec;padding:16px 32px;text-align:center;">
          <p style="margin:0 0 6px 0;font-family:'Heebo',Arial,sans-serif;font-size:11px;color:#94a3b8;letter-spacing:0.5px;">הודעה אוטומטית ממערכת הלידים של KNAUF</p>
          <p style="margin:0;font-family:'Heebo',Arial,sans-serif;font-size:11px;color:#cbd5e1;">אין להשיב למייל זה</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>

</body>
</html>`;

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

        const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const profile = await profileRes.json();
        const senderEmail = profile.emailAddress || 'me';

        const raw = buildRawEmail({
            from: `KNAUF Leads <${senderEmail}>`,
            to: mainTo,
            cc,
            subject,
            html
        });

        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw })
        });

        if (!gmailRes.ok) {
            const err = await gmailRes.json();
            return Response.json({ ok: false, error: err.error?.message || 'Gmail API error' }, { status: 500 });
        }

        return Response.json({ ok: true, to: mainTo, cc });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

        const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const profile = await profileRes.json();
        const senderEmail = profile.emailAddress || 'me';

        const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,sans-serif;" dir="rtl">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;padding:36px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dde3ec;">
      <tr>
        <td style="background:#0ea5e9;padding:28px 32px 24px 32px;">
          <p style="margin:0;font-size:11px;color:#e0f2fe;letter-spacing:3px;text-transform:uppercase;">KNAUF ISRAEL</p>
          <p style="margin:8px 0 0 0;font-size:22px;font-weight:700;color:#ffffff;">ליד חדש התקבל</p>
          <p style="margin:5px 0 0 0;font-size:14px;color:#e0f2fe;">כנס בנייה ישראל 2026</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 12px 32px;">
          <p style="margin:0 0 16px 0;font-size:12px;font-weight:700;color:#1a3558;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #e8edf4;padding-bottom:10px;">פרטי הליד</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:7px 20px 7px 0;color:#94a3b8;font-size:13px;font-weight:500;white-space:nowrap;">שם מלא</td><td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:13px;">ישראל ישראלי (בדיקה)</td></tr>
            <tr><td style="padding:7px 20px 7px 0;color:#94a3b8;font-size:13px;font-weight:500;white-space:nowrap;">טלפון</td><td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:13px;">050-0000000</td></tr>
            <tr><td style="padding:7px 20px 7px 0;color:#94a3b8;font-size:13px;font-weight:500;white-space:nowrap;">חברה</td><td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:13px;">חברת בדיקה בע"מ</td></tr>
            <tr><td style="padding:7px 20px 7px 0;color:#94a3b8;font-size:13px;font-weight:500;white-space:nowrap;">תפקיד</td><td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:13px;">אדריכל</td></tr>
            <tr><td style="padding:7px 20px 7px 0;color:#94a3b8;font-size:13px;font-weight:500;white-space:nowrap;">תחומי עניין</td><td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:13px;">תקרות, לוחות</td></tr>
            <tr><td style="padding:7px 20px 7px 0;color:#94a3b8;font-size:13px;font-weight:500;white-space:nowrap;">לטיפול</td><td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:13px;">אלי יוסף</td></tr>
          </table>
        </td>
      </tr>
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#e8edf4;"></div></td></tr>
      <tr>
        <td style="padding:20px 32px 28px 32px;text-align:center;">
          <p style="margin:0 0 14px 0;font-size:13px;color:#475569;">לטיפול בליד ועדכון הסטטוס, היכנס למערכת:</p>
          <a href="https://knauf-il-leads.com/my-leads" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">כניסה למערכת הלידים</a>
        </td>
      </tr>
      <tr>
        <td style="background:#f4f7fb;border-top:1px solid #dde3ec;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">הודעה אוטומטית ממערכת הלידים של KNAUF — מייל בדיקה</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

        const raw = buildRawEmail({
            from: `KNAUF Leads <${senderEmail}>`,
            to: 'eli.yosef@knauf.com',
            subject: 'ליד חדש - כנס בנייה ישראל 2026 - ישראל ישראלי (בדיקה)',
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
            return Response.json({ ok: false, error: err.error?.message }, { status: 500 });
        }

        return Response.json({ ok: true, from: senderEmail, to: 'eli.yosef@knauf.com' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
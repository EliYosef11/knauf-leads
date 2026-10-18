// תבנית המייל "ליד חדש" — הועתקה מילה במילה מהפונקציה שרצה היום ב-Base44,
// כדי שהמייל שהנציגים מקבלים יישאר זהה לחלוטין.

export function newLeadHtml(lead: { event_name?: string }, tableRows: string): string {
  return `<!DOCTYPE html>
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
}

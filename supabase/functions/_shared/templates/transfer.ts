// תבנית שהועתקה מילה במילה מהפונקציה שרצה ב-Base44, כדי שהמייל יישאר זהה.

export function transferHtml(lead: Record<string, string | undefined>, fromRep: string, toRep: string, reason: string, interestsText: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; background:#f4f6f9; margin:0; padding:24px;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%); color:#ffffff; padding:28px 32px;">
      <div style="font-size:13px; letter-spacing:2px; opacity:0.9;">KNAUF • העברת ליד</div>
      <div style="font-size:24px; font-weight:700; margin-top:8px;">${lead.full_name || 'ללא שם'}</div>
      ${lead.event_name ? `<div style="font-size:14px; opacity:0.9; margin-top:4px;">${lead.event_name}</div>` : ''}
    </div>
    <div style="padding:28px 32px;">
      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px 18px; margin-bottom:20px; color:#1e40af; font-size:15px;">
        📋 הליד הועבר אליך מ<strong> ${fromRep}</strong>. מעתה אתה הנציג המטפל.
      </div>
      ${reason ? `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; margin-bottom:20px; color:#334155; font-size:14px;">
        <strong>סיבת ההעברה:</strong><br/>${reason}
      </div>` : ''}
      <table style="width:100%; border-collapse:collapse; font-size:15px; color:#1a2540;">
        <tr><td style="padding:10px 0; color:#64748b; width:130px;">טלפון</td><td style="padding:10px 0; font-weight:600;"><a href="tel:${lead.phone || ''}" style="color:#005fa3; text-decoration:none;">${lead.phone || '—'}</a></td></tr>
        <tr><td style="padding:10px 0; color:#64748b;">דוא"ל</td><td style="padding:10px 0; font-weight:600;">${lead.email ? `<a href="mailto:${lead.email}" style="color:#005fa3; text-decoration:none;">${lead.email}</a>` : '—'}</td></tr>
        <tr><td style="padding:10px 0; color:#64748b;">חברה</td><td style="padding:10px 0; font-weight:600;">${lead.company || '—'}</td></tr>
        <tr><td style="padding:10px 0; color:#64748b;">עיר</td><td style="padding:10px 0; font-weight:600;">${lead.city || '—'}</td></tr>
        <tr><td style="padding:10px 0; color:#64748b;">תפקיד</td><td style="padding:10px 0; font-weight:600;">${lead.role || '—'}</td></tr>
        <tr><td style="padding:10px 0; color:#64748b; vertical-align:top;">תחומי עניין</td><td style="padding:10px 0; font-weight:600;">${interestsText}</td></tr>
      </table>
    </div>
    <div style="padding:16px 32px; background:#f8fafc; color:#94a3b8; font-size:12px; text-align:center;">
      הודעה אוטומטית ממערכת הלידים של KNAUF
    </div>
  </div>
</body>
</html>`;
}

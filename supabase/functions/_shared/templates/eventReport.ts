// תבנית שהועתקה מילה במילה מהפונקציה שרצה ב-Base44, כדי שהמייל יישאר זהה.

export function eventReportHtml(eventName: string, leads: unknown[], rows: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#f9fafb; margin:0; padding:0; direction:rtl; }
  .container { max-width:900px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg,#0099d8,#005b9a); padding:32px 40px; color:#fff; }
  .header h1 { margin:0 0 4px; font-size:22px; font-weight:700; }
  .header p { margin:0; opacity:0.85; font-size:14px; }
  .meta { padding:20px 40px; background:#f0f7ff; border-bottom:1px solid #dbeafe; }
  .meta-item { display:inline-block; margin-left:24px; font-size:13px; color:#374151; }
  .meta-item strong { color:#0066b3; }
  .table-wrap { padding:24px 40px 32px; overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  thead tr { background:#0099d8; color:#fff; }
  thead th { padding:11px 12px; text-align:right; font-weight:600; white-space:nowrap; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  .footer { padding:20px 40px; text-align:center; color:#9ca3af; font-size:12px; border-top:1px solid #f3f4f6; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>דוח לידים – ${eventName}</h1>
    <p>נוצר ב-${new Date().toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
  </div>
  <div class="meta">
    <span class="meta-item">כנס: <strong>${eventName}</strong></span>
    <span class="meta-item">סה"כ לידים: <strong>${leads.length}</strong></span>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>שם מלא</th>
          <th>טלפון</th>
          <th>דוא"ל</th>
          <th>חברה</th>
          <th>עיר</th>
          <th>תפקיד</th>
          <th>תחומי עניין</th>
          <th>לטיפול</th>
          <th>הערות</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">KNAUF • דוח לידים • מידע עסקי חסוי<br><span style="color:#d1d5db;">אין להשיב למייל זה</span></div>
</div>
</body>
</html>`;
}

/**
 * תור שמירה מקומי ללידים שלא הצליחו להישלח.
 *
 * בכנסים הקליטה גרועה, וליד שנכשל בשליחה פשוט נעלם — הנציג מגלה רק אחר כך,
 * אם בכלל. כאן הליד נשמר במכשיר ונשלח שוב אוטומטית כשהחיבור חוזר.
 *
 * השמירה היא ב-localStorage של אותו מכשיר בלבד, ולכן זו רשת ביטחון לדקות-שעות,
 * לא אחסון. כל פריט נושא חותמת זמן כדי שנדע אם משהו תקוע.
 */

const KEY = 'knauf_pending_leads';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // מצב פרטי או אחסון מלא — אין מה לעשות חוץ מלא לקרוס
  }
}

export function pendingCount() {
  return read().length;
}

export function enqueue(lead) {
  const items = read();
  items.push({ lead, savedAt: new Date().toISOString(), key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  write(items);
  return items.length;
}

/**
 * מנסה לשלוח שוב את מה שממתין. מחזיר כמה נשלחו.
 * פריט שנכשל שוב נשאר בתור; פריט שנדחה ע"י השרת (שגיאת נתונים ולא רשת) מוסר,
 * כי ניסיון חוזר רק יתקע את התור.
 */
export async function flushQueue(createLead) {
  const items = read();
  if (items.length === 0) return 0;

  const remaining = [];
  let sent = 0;

  for (const item of items) {
    try {
      await createLead(item.lead);
      sent++;
    } catch (error) {
      const isNetwork = error?.message?.includes('fetch') || error?.message?.includes('Network') || !navigator.onLine;
      if (isNetwork) remaining.push(item);
    }
  }

  write(remaining);
  return sent;
}

/**
 * הגדרות פרטיות (GDPR) — מקור אחד לאמת לממשק, להודעת הפרטיות ולחישובי השמירה.
 * הערכים כאן חייבים להתאים ל-supabase/gdpr.sql (24 חודשים, 03:00 UTC) ולמחזור הגיבויים (30 יום).
 */

export const RETENTION_MONTHS = 24;          // מחיקה אוטומטית — חודשים מהמגע האחרון בליד
export const BACKUP_RETENTION_DAYS = 30;     // כמה זמן ליד מחוק עוד קיים בגיבוי
export const REP_VISIBILITY_MONTHS = 6;      // ליד "טופל" ישן מזה גלוי למנהל בלבד
export const PRIVACY_CONTACT_EMAIL = 'keren.shay@knauf.com';   // הממונה על פניות פרטיות
export const PRIVACY_POLICY_URL = 'https://knauf.com/he-IL/privacy-policy';

/** מתי הליד יימחק אוטומטית: המגע האחרון + תקופת השמירה */
export function deletionDate(lead) {
  const last = lead?.updated_date || lead?.created_date;
  if (!last) return null;
  const d = new Date(last);
  d.setMonth(d.getMonth() + RETENTION_MONTHS);
  return d;
}

/** "בעוד 23 חודשים" / "בעוד 12 ימים" / "היום" */
export function timeUntil(date, lang = 'he') {
  if (!date) return '';
  const ms = date.getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 0) return lang === 'he' ? 'היום' : 'today';
  if (days < 45) return lang === 'he' ? `בעוד ${days} ימים` : `in ${days} days`;
  const months = Math.round(days / 30.4);
  return lang === 'he' ? `בעוד ${months} חודשים` : `in ${months} months`;
}

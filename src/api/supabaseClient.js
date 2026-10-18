import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // נופלים מוקדם ובברור — בלי זה כל קריאה תיכשל בהמשך עם שגיאת רשת סתומה
  throw new Error('חסרים VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY ב-.env.local');
}

export const supabase = createClient(url, key);

// נוחות לפיתוח בלבד: מאפשר לבדוק התחברות והרשאות מתוך הקונסול של הדפדפן.
// לא נכלל בבילד לייצור.
if (import.meta.env.DEV) {
  window.__supabase = supabase;
}

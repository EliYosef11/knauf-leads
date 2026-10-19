/**
 * התחברות מעל Supabase Auth.
 *
 * השיטה: קוד חד-פעמי למייל (OTP). נבחרה על פני Google OAuth כי היא לא דורשת
 * הקמת פרויקט ב-Google Cloud, והנציגים ממילא מזוהים לפי כתובת המייל שלהם —
 * אותה כתובת שיושבת ב-`representatives.email` וב-`leads.assigned_email`,
 * וזה מה שמדיניות ה-RLS בשרת בודקת.
 */

import { supabase } from './supabaseClient';

/**
 * הודעות שגיאה מובנות. בלי זה המשתמש רואה "שליחה נכשלה" גם כשהסיבה פשוטה
 * וניתנת לתיקון — כתובת שגויה, או יותר מדי ניסיונות ברצף.
 */
const MESSAGES = {
  email_address_invalid: 'כתובת המייל אינה תקינה. בדוק אותה ונסה שוב.',
  over_email_send_rate_limit: 'נשלחו יותר מדי קודים. המתן דקה ונסה שוב.',
  over_request_rate_limit: 'יותר מדי ניסיונות. המתן דקה ונסה שוב.',
  otp_expired: 'הקוד פג תוקף. בקש קוד חדש.',
  signup_disabled: 'הרשמה סגורה במערכת. פנה למנהל.',
  validation_failed: 'כתובת המייל אינה תקינה. בדוק אותה ונסה שוב.',
};

function describe(error, fallback) {
  const known = MESSAGES[error.code];
  if (known) return new Error(known);
  if (error.status === 429) return new Error(MESSAGES.over_email_send_rate_limit);
  // משאירים את הטקסט המקורי בסוגריים כדי שתקלה לא מוכרת תהיה ניתנת לאיתור
  return new Error(`${fallback} (${error.message})`);
}

export const auth = {
  async currentSession() {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },

  onChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session ?? null));
    return () => data.subscription.unsubscribe();
  },

  /** נבדק בשרת: האם הכתובת רשומה כנציג פעיל או כאדמין */
  async canLogin(email) {
    const { data, error } = await supabase.rpc('can_login', { p_email: email.trim().toLowerCase() });
    if (error) return true; // לא חוסמים בגלל תקלת רשת — ההרשאות בשרת ממילא מגינות
    return data === true;
  },

  async sendCode(email) {
    if (!(await auth.canLogin(email))) {
      throw new Error('הכתובת הזו אינה רשומה כנציג במערכת. פנה למנהל המערכת.');
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) throw describe(error, 'שליחת הקוד נכשלה.');
  },

  async verifyCode(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    if (error) throw describe(error, 'הקוד שגוי או פג תוקף.');
    return data.session;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  /** נבדק בשרת מול טבלת admins, לא בצד הלקוח */
  async isAdmin() {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) return false;
    return data === true;
  },
};

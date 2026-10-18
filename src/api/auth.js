/**
 * התחברות מעל Supabase Auth.
 *
 * השיטה: קוד חד-פעמי למייל (OTP). נבחרה על פני Google OAuth כי היא לא דורשת
 * הקמת פרויקט ב-Google Cloud, והנציגים ממילא מזוהים לפי כתובת המייל שלהם —
 * אותה כתובת שיושבת ב-`representatives.email` וב-`leads.assigned_email`,
 * וזה מה שמדיניות ה-RLS בשרת בודקת.
 */

import { supabase } from './supabaseClient';

export const auth = {
  async currentSession() {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },

  onChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session ?? null));
    return () => data.subscription.unsubscribe();
  },

  async sendCode(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
  },

  async verifyCode(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    if (error) throw new Error(error.message);
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

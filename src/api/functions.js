/**
 * קריאה לפונקציות השרת (Supabase Edge Functions).
 *
 * שומר על אותה חתימה שהייתה ל-`base44.functions.invoke(name, body)` ומחזיר
 * `{ data, error }` כמו קודם, כדי שקוד המסכים לא ישתנה.
 * שמות הפונקציות ב-Supabase הם kebab-case, ולכן יש מיפוי מהשמות הישנים.
 */

import { supabase } from './supabaseClient';

const NAMES = {
  sendLeadNotification: 'send-lead-notification',
  sendReminderEmail: 'send-reminder-email',
  sendTestEmail: 'send-test-email',
  transferLead: 'transfer-lead',
  exportEventEmail: 'export-event-email',
  metaWebhook: 'meta-webhook',
};

export async function invokeFunction(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(NAMES[name] ?? name, { body });
  return { data, error };
}

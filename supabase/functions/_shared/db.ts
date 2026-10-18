/**
 * לקוח Supabase בהרשאות שירות, לשימוש בתוך Edge Functions.
 * מקביל ל-`base44.asServiceRole` שהיה בפונקציות של Base44 — עוקף RLS,
 * כי הפונקציות צריכות לקרוא לידים של כל הנציגים כדי לשלוח להם מיילים.
 *
 * SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY מוזרקים אוטומטית לכל Edge Function.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

export interface Lead {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  company?: string;
  city?: string;
  role?: string;
  project_handling?: string;
  interests?: string[];
  event_name?: string;
  rep_notes?: string;
  assigned_to?: string;
  assigned_email?: string;
  status?: string;
  created_date?: string;
  reminder_log?: { sent_at: string; triggered_by: string }[];
  transfer_log?: { from_rep?: string; to_rep?: string; reason?: string; date?: string }[];
}

/** כתובות התפוצה ממסך ההגדרות, בדיוק כמו ב-Base44: רק כשההתראות פעילות */
export async function notificationEmails(client: SupabaseClient): Promise<string[]> {
  const { data } = await client.from('notification_settings').select('*').limit(1);
  const settings = data?.[0];
  return settings?.is_active && Array.isArray(settings?.notification_emails)
    ? settings.notification_emails
    : [];
}

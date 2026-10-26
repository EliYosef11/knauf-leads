/**
 * גיבוי יומי של כל הנתונים לקובץ JSON ב-Supabase Storage.
 *
 * עד היום הגיבוי היחיד היה ייצוא ידני מ-18.10. התוכנית החינמית של Supabase
 * לא כוללת שחזור לנקודת זמן, ולכן זה קו ההגנה היחיד מפני מחיקה בטעות.
 *
 * רץ מ-pg_cron ב-02:00 UTC, ושומר 30 ימים אחורה.
 */

import { serviceClient } from '../_shared/db.ts';
import { preflight, json } from '../_shared/http.ts';

const BUCKET = 'backups';
const TABLES = ['leads', 'events', 'representatives', 'campaigns', 'notification_settings', 'admins'];
const KEEP_DAYS = 30;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const client = serviceClient();
    const snapshot: Record<string, unknown[]> = {};

    for (const table of TABLES) {
      const { data, error } = await client.from(table).select('*');
      if (error) throw new Error(`${table}: ${error.message}`);
      snapshot[table] = data ?? [];
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const path = `knauf-leads-${stamp}.json`;

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(path, JSON.stringify({ created_at: new Date().toISOString(), tables: snapshot }, null, 2), {
        contentType: 'application/json',
        upsert: true,
      });
    if (uploadError) throw new Error(uploadError.message);

    // ניקוי גיבויים ישנים
    const { data: files } = await client.storage.from(BUCKET).list();
    const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
    const stale = (files ?? [])
      .filter((file) => new Date(file.created_at ?? Date.now()).getTime() < cutoff)
      .map((file) => file.name);
    if (stale.length > 0) await client.storage.from(BUCKET).remove(stale);

    return json({
      ok: true,
      path,
      rows: Object.fromEntries(Object.entries(snapshot).map(([table, rows]) => [table, rows.length])),
      removed_old: stale.length,
    });
  } catch (error) {
    return json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
});

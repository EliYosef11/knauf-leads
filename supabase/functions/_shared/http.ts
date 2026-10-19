/**
 * כותרות CORS ועזר תשובה.
 *
 * פונקציות שנקראות מהדפדפן חייבות לענות גם על בקשת ה-preflight (OPTHONS)
 * ולהחזיר כותרות CORS, אחרת הדפדפן חוסם את הקריאה עוד לפני שהיא יוצאת.
 * הגישה עצמה מוגנת באימות ה-JWT של Supabase, ולכן מקור הבקשה פתוח.
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** מחזיר תשובת preflight כשצריך, אחרת null */
export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

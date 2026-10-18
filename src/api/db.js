import { supabase } from './supabaseClient';
import { createDb } from './dbFactory';

// מופע הדפדפן. הלוגיקה עצמה יושבת ב-dbFactory כדי שסקריפטים ב-Node
// (למשל scripts/test-db-adapter.mjs) יוכלו להריץ אותה מול לקוח אחר.
export const db = createDb(supabase);

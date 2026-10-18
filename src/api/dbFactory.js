/**
 * שכבת הגישה לנתונים מעל Supabase.
 *
 * חושפת בכוונה את אותו ממשק שהיה ל-entities של Base44 — list / filter / create / update / delete —
 * כדי שקוד המסכים יישאר כפי שהוא וההגירה לא תיגע בעיצוב או בלוגיקה.
 *
 *   db.Lead.filter({ assigned_to: 'דני' }, '-created_date', 500)
 *   db.Event.filter({ event_date: { $lte: today } }, '-event_date', 50)
 *
 * תרגום מהסמנטיקה של Base44:
 *   מיון  '-created_date' → created_date יורד, 'name' → name עולה
 *   אופרטורים $lte $lt $gte $gt $ne $in → המקבילים ב-PostgREST
 */

const TABLES = {
  Lead: 'leads',
  Event: 'events',
  Representative: 'representatives',
  Campaign: 'campaigns',
  NotificationSettings: 'notification_settings',
};

const DEFAULT_LIMIT = 1000;
const DEFAULT_SORT = '-created_date';

const OPERATORS = {
  $lte: 'lte',
  $lt: 'lt',
  $gte: 'gte',
  $gt: 'gt',
  $ne: 'neq',
  $in: 'in',
};

function applySort(query, sort) {
  if (!sort) return query;
  const descending = sort.startsWith('-');
  return query.order(descending ? sort.slice(1) : sort, { ascending: !descending });
}

function applyFilter(query, criteria = {}) {
  for (const [field, value] of Object.entries(criteria)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [operator, operand] of Object.entries(value)) {
        const method = OPERATORS[operator];
        if (!method) throw new Error(`אופרטור לא נתמך בשאילתה: ${operator}`);
        query = method === 'in' ? query.in(field, operand) : query[method](field, operand);
      }
    } else {
      query = query.eq(field, value);
    }
  }
  return query;
}

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

function entity(client, table) {
  const select = async (criteria, sort = DEFAULT_SORT, limit = DEFAULT_LIMIT) => {
    let query = client.from(table).select('*');
    query = applyFilter(query, criteria);
    query = applySort(query, sort);
    return unwrap(await query.limit(limit));
  };

  return {
    table,
    list: (sort, limit) => select({}, sort, limit),
    filter: (criteria, sort, limit) => select(criteria, sort, limit),
    get: async (id) => unwrap(await client.from(table).select('*').eq('id', id).single()),
    create: async (data) => unwrap(await client.from(table).insert(data).select().single()),
    update: async (id, data) =>
      unwrap(await client.from(table).update(data).eq('id', id).select().single()),
    delete: async (id) => {
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    },
  };
}

export function createDb(client) {
  return Object.fromEntries(
    Object.entries(TABLES).map(([name, table]) => [name, entity(client, table)]),
  );
}

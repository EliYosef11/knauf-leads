# Knauf Leads — מערכת לידים לכנסים

אפליקציית React/Vite בעברית (RTL) לאיסוף לידים בכנסים עבור קנאוף ישראל.
נבנתה במקור ב-Base44 Builder, הוצאה לקוד מקומי ב-18.10.2026, והועברה ל-Supabase ב-19.10.2026.

## איפה הדברים עומדים

| | |
|---|---|
| אתר חי (production) | https://knauf-il-leads.com — **עדיין מוגש מ-Base44**, עם הקוד הישן |
| הקוד כאן | רץ במלואו על Supabase, בלי שום תלות ב-Base44 |
| Supabase | `knauf-leads-eu`, ref `eoaxsmjjthkktlhbuenl`, פרנקפורט (eu-central-1) |
| נשאר לעשות | שלב 4 (פריסה והעברת הדומיין) ושלב 5 (סגירת Base44) — ראה [MIGRATION.md](MIGRATION.md) |

פרויקט Supabase ישן בסידני (`jiuyfjhvyixgysmknpuf`) עדיין קיים ויימחק בסוף ההגירה;
אפליקציית Base44 המקורית (`6a15a08fdeebfd8254f3814d`) היא זו שמשרתת את האתר החי.

## הרצה מקומית

```bash
npm run dev      # Vite על 5173, מדבר ישירות עם Supabase
```

אין יותר בקאנד מקומי ואין `base44 dev`. `.env.local` (מחוץ ל-git) מחזיק את
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, ואת הסודות של הסקריפטים:
`SUPABASE_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`, `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD`.

## ארכיטקטורה

- **Frontend**: React 18 + Vite + Tailwind + shadcn/ui (`src/components/ui/*` — קוד ספרייה,
  לא לערוך סתם) + framer-motion + react-router + TanStack Query.
- **Backend**: Supabase — Postgres עם RLS, Auth, ו-Edge Functions ב-Deno.
- `src/api/db.js` — נתונים. חושף את אותו ממשק שהיה ל-`base44.entities.X`
  (`list` / `filter` / `get` / `create` / `update` / `delete`); הלוגיקה ב-`dbFactory.js`
  מקבלת לקוח בהזרקה כדי שאפשר יהיה לבדוק אותה מ-Node.
- `src/api/auth.js` + `src/lib/AuthContext.jsx` — התחברות בקוד חד-פעמי למייל.
- `src/api/functions.js` — קריאה ל-Edge Functions, עם מיפוי מהשמות הישנים.
- `base44/` — **עותק ייחוס בלבד** של המקור. שום קוד חי לא מייבא ממנה.

### טבלאות
`leads`, `events`, `representatives`, `campaigns`, `notification_settings`, `admins`.
המזהים הם ה-ids המקוריים של Base44 (text), כך ש-`leads.event_id` ממשיך להצביע נכון.
שדות ה-enum בעברית הם text חופשי — הנתונים האמיתיים מכילים ערכים שלא היו בסכמה
של Base44 (`אדריכל/ית` מול `אדריכל`), ו-CHECK היה מפיל את הייבוא.

### מסכים (`src/pages/`)
| נתיב | מי נכנס | תיאור |
|---|---|---|
| `/` | כולם, ללא התחברות | טופס הליד בכנס (mobile-first) |
| `/my-leads` | נציג מחובר | הלידים שלו בלבד; אדמין רואה רשימת נציגים לבחירה |
| `/admin` | אדמין | לוח ניהול, טבלת לידים, ייצוא |
| `/events` `/representatives` `/campaigns` `/settings` | אדמין | ניהול |

### הרשאות (RLS) — [supabase/policies.sql](supabase/policies.sql)
- אורח: קורא `events` ו-`representatives` (הטופס צריך אותם), יוצר `leads`. **לא קורא לידים.**
- נציג מחובר: קורא ומעדכן רק לידים שה-`assigned_email` שלהם שווה למייל שלו.
- אדמין (שורה ב-`public.admins`): הכל. הבדיקה היא `is_admin()` בשרת, לעולם לא בצד הלקוח.
- **מי בכלל יכול להתחבר:** `can_login(email)` מחזירה true רק לנציג פעיל או לאדמין.
  `auth.sendCode` קוראת לה לפני שליחת הקוד, כך שכתובת שאינה במערכת לא מקבלת מייל כלל.
  אין הרשמה — הנציגים כבר רשומים, ומקבלים קוד לכתובת שרשומה להם.
- כל השוואות המייל הן `lower()` משני הצדדים: בטבלת הנציגים יש כתובת שנשמרה עם אות גדולה
  (`Hagay.karadi@`) וההתחברות מנרמלת לאותיות קטנות — בלי זה הנציג הזה היה נכנס ולא רואה כלום.
- ניהול האדמינים נעשה ממסך ההגדרות (`AdminAccessCard`), ומנהל אינו יכול להסיר את עצמו.

`db.X.create()` נופל חזרה להוספה בלי `select()` כש-RLS חוסם קריאה — בלי זה שליחת הטופס
הציבורי נשברת עם שגיאה `42501`.

### פונקציות (`supabase/functions/`)
| פונקציה | תפקיד |
|---|---|
| `send-lead-notification` | **הליבה** — טריגר על INSERT ל-`leads` שולח מייל לנציג + CC לתפוצה |
| `send-reminder-email` | `{lead_id}` לתזכורת ידנית, או ריק לריצת ה-cron היומית |
| `transfer-lead` | העברת ליד בין נציגים + מייל יידוע |
| `export-event-email` | דוח לידים של כנס למייל |
| `send-test-email` | בדיקת חיבור המייל ממסך ההגדרות |
| `meta-webhook` | לידים מ-Meta Lead Ads. **ציבורית** (`--no-verify-jwt`) |

תבניות ה-HTML ב-`_shared/templates/` הועתקו תו-בתו מ-Base44 — לא לשכתב אותן בלי סיבה,
הנציגים רגילים למייל הזה.

### מיילים, טריגרים ותזמון
הכל יוצא מ-`knauf.il.leads@gmail.com` דרך SMTP עם סיסמת אפליקציה (`_shared/mailer.ts`),
כולל קודי ההתחברות של Supabase Auth. הטריגר על `leads` והתזכורת היומית (06:00 UTC)
מוגדרים ב-`scripts/setup-webhook.mjs` ומשתמשים ב-pg_net ו-pg_cron; מפתח השירות יושב
בטבלה בסכמה `private` שאינה חשופה ב-API.

## סקריפטים

```bash
npm run functions:deploy              # פריסת כל הפונקציות (meta-webhook אוטומטית ציבורית)
node scripts/run-sql.mjs <file.sql>   # הרצת SQL דרך ה-Management API
node scripts/setup-webhook.mjs        # טריגר ליד חדש + cron יומי
node scripts/setup-auth-smtp.mjs      # מיילי ההתחברות דרך Gmail
node scripts/import-to-supabase.mjs   # ייבוא/סנכרון מהגיבוי (upsert לפי id)
node scripts/verify-supabase-import.mjs  # השוואה שדה-שדה מול הגיבוי
node scripts/test-db-adapter.mjs      # 22 בדיקות לשכבת הנתונים ולהרשאות
node scripts/dev-login-code.mjs <email>  # קוד התחברות בלי לשלוח מייל
deno run --allow-env --allow-read --allow-net scripts/send-test-mail.ts  # בדיקת שליחה
```

`backups/prod-export-YYYY-MM-DD.json` — ייצוא מלא מהפרודקשן של Base44 (55 לידים, 13 כנסים,
19 נציגים). התיקייה ב-`.gitignore` כי יש בה פרטים אישיים.

## כללים ואזהרות

- **לשמור על העיצוב 1:1** מול האתר החי. אומת ב-18.10.2026 ואחרי כל שלב מאז.
- ⚠️ `send-reminder-email` ללא פרמטרים שולח לכל הנציגים האמיתיים עם לידים פתוחים,
  ותפוצת ההתראות כוללת את `keren.shay@knauf.com`. לפני בדיקה — לכבות `is_active`
  ב-`notification_settings` ולהחזיר אחרי, או לקרוא עם `lead_id` של ליד בדיקה.
- `reminder_days` בפרודקשן הוא 2, לא 7 כפי שכתוב בקוד הישן.
- לידים מ-Meta משויכים אוטומטית לקרן שי, ומיפוי התפקידים שם משתמש בערכים הישנים
  (`קבלן` ולא `קבלן/ית`) — פער ידוע שלא יושר בכוונה.
- טקסטים דו-לשוניים ב-`src/lib/i18n.js` (יש כפתור EN בממשק).

# Knauf Leads — מערכת לידים לכנסים

אפליקציית React/Vite בעברית (RTL) לאיסוף לידים בכנסים עבור קנאוף ישראל.
נבנתה במקור ב-Base44 Builder, הוצאה לקוד מקומי ב-18.10.2026, והועברה ל-Supabase ב-19.10.2026.

## איפה הדברים עומדים (עדכון 24.11.2026)

| | |
|---|---|
| אתר חי (production) | https://knauf-il-leads.com — המערכת החדשה, מ-26.10.2026 |
| קוד | GitHub (פרטי): `EliYosef11/knauf-leads`. עבודה ממחשב אחר — ראה [SETUP.md](SETUP.md) |
| אירוח | Netlify (אתר `knauf-leads`), תעודת Let's Encrypt מתחדשת |
| Supabase | `knauf-leads-eu`, ref `eoaxsmjjthkktlhbuenl`, פרנקפורט (eu-central-1) |
| גיבוי חם | https://knauf-il-leads.base44.app — המערכת הישנה, עדיין חיה. **אפשר לסגור** (שבועות יציבים) |
| cron | גיבוי יומי 02:00 UTC · תזכורות 06:00 UTC · מחיקת לידים ישנים (24 חודשים) 03:00 UTC — כולם דולקים |
| כניסה | קוד למייל (מתג החירום `DIRECT_LOGIN` כבוי) |
| **פתוח: חסימה במחשבי קנאוף** | Zscaler חוסם את הדומיין (טיקט RITM0913163). CIS (Marcos Gutierrez, `Sec.Advisory@knauf.com`) אישר ב-24.11 **חריגה זמנית ל-6 חודשים בלבד** (עד 25.05.2027), לא ללא הגבלה. ה-ISRAD עודכן בהתאם (סעיפים 1, 5, 6, 8). הצעדים: להחתים את הטופס (מנכ"ל/מיופה כוח) → לשלוח למרקוס + פינג ב-Teams → עם המסמך החתום לבקש מצוות Zscaler לפתוח. **בתוך 6 החודשים:** לרשום את המערכת רשמית ב-IT, או לעבור לפתרון הלידים של Knauf Digital. החבילה ב-[ISRA-submission/](ISRA-submission/) |
| **פתוח: Gmail** | תיבת ההתראות היא חשבון Gmail צרכני בלי DPA — להחליף בתיבה/ממסר של קנאוף כש-CIS ינחו |

פרויקט Supabase ישן בסידני (`jiuyfjhvyixgysmknpuf`) עדיין קיים ויימחק בסוף ההגירה;
אפליקציית Base44 המקורית (`6a15a08fdeebfd8254f3814d`) היא הגיבוי החם.

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
`leads`, `events`, `representatives`, `campaigns`, `notification_settings`, `admins`, `lead_notes`, `login_log`.
- **יומן כניסות** (`login_log`, [supabase/login-log.sql](supabase/login-log.sql), 26.11.2026): מי נכנס ומתי. נכתב רק דרך
  `log_login()` (המייל מה-JWT בשרת): `login` = הזדהות בקוד, `visit` = פתיחת האפליקציה עם סשן קיים (לכל היותר
  פעם בשעה למשתמש). קריאה לאדמין בלבד. נמחק אחרי 6 חודשים (cron `login-log-retention` 03:10 UTC,
  `LOGIN_LOG_MONTHS` ב-`privacy.js`).
  **ניסיונות שנכשלו** (עם IP): `denied` = בקשת קוד לכתובת לא רשומה, `code_request` = בקשת קוד לכתובת רשומה
  (שתיהן נרשמות בתוך `can_login`, שהפכה ל-volatile), `bad_code` = קוד שגוי (`log_failed_code`, מדווח מהדפדפן).
  מוגן מהצפה (פעם בדקה לכתובת+סוג, 300 בשעה בסך הכול). **לא רואה** פנייה ישירה ל-API של Supabase Auth.
  `scripts/preflight.mjs` קורא ל-`can_login` ולכן משאיר רשומות ביומן.
- **מי הזין** (4.11.2026): טריגר `set_lead_author` ממלא `created_by`/`created_by_id` מה-JWT בכל
  INSERT מחובר. לידים ישנים (Base44 + 28.10–3.11) — לא ידוע, ולא מציגים.
- **שיחה על ליד** (`lead_notes`, [supabase/notes.sql](supabase/notes.sql)): כל עדכון הוא הודעה עם
  כותב (נקבע בשרת) ותאריך. `leads.lead_summary` נשאר רק לתאימות (ייצוא CSV) ומסונכרן מהשיחה
  בטריגר — **לא כותבים אליו ישירות**. הסיכומים הישנים הוגרו כהודעה ראשונה על שם הנציג המשויך.
המזהים הם ה-ids המקוריים של Base44 (text), כך ש-`leads.event_id` ממשיך להצביע נכון.
שדות ה-enum בעברית הם text חופשי — הנתונים האמיתיים מכילים ערכים שלא היו בסכמה
של Base44 (`אדריכל/ית` מול `אדריכל`), ו-CHECK היה מפיל את הייבוא.

### מסכים (`src/pages/`)
| נתיב | מי נכנס | תיאור |
|---|---|---|
| `/` | נציג מחובר | טופס הליד בכנס (mobile-first). **דורש התחברות מ-26.10.2026** — אורח מופנה ל-`/login` וחוזר לטופס אחרי הכניסה. שדה "לטיפול" נבחר במפורש (אין ברירת מחדל — ליד שמוזן עבור חבר לצוות היה נוחת על הלא-נכון) |
| `/my-leads` | נציג מחובר | הלידים שלו בלבד — גם אדמין רואה כאן רק את שלו (לכל הלידים יש `/admin`). תצוגה מפורטת/רשימה (נשמר ב-localStorage). **סיור מודרך** (`components/tour/QuickTour`) נפתח בכניסה הראשונה לכל משתמש במכשיר (`knauf_tour_my_leads_v1:<email>`), עם "אל תציג שוב" וכפתור ? לפתיחה חוזרת |
| `/admin` | אדמין | לוח ניהול, טבלת לידים, ייצוא |
| `/events` `/representatives` `/campaigns` `/settings` | אדמין | ניהול |
| `/login-log` | אדמין | יומן כניסות — סיכום לפי משתמש (כולל נציגים שלא נכנסו אף פעם) ורשימת כל הכניסות |

### GDPR — [supabase/gdpr.sql](supabase/gdpr.sql), [src/lib/privacy.js](src/lib/privacy.js), [docs/processors.md](docs/processors.md)
- **מחיקה אוטומטית** 24 חודשים מהמגע האחרון (`updated_date`), cron `lead-retention` 03:00 UTC, יומן ב-`retention_log`.
  המנהל רואה בפרטי הליד את תאריך המחיקה והספירה לאחור. ליד מחוק נשאר בגיבוי עד 30 יום.
- **הסכמה לדיוור** — תיבת סימון בטופס → `marketing_consent` + `marketing_consent_at` (טריגר). בלי הסכמה
  הלידים משמשים רק למעקב על הפנייה עצמה.
- **נציג רואה ליד "טופל" רק 6 חודשים** (`rep_can_see_lead`), אחר כך מנהל בלבד. ליד פתוח — תמיד.
- **ממונה פרטיות:** קרן שי (`PRIVACY_CONTACT_EMAIL`), מופיעה בהודעת הפרטיות בטופס.
- הקבועים (24/30/6) חייבים להתאים בין `privacy.js` ל-`gdpr.sql`.

### הרשאות (RLS) — [supabase/policies.sql](supabase/policies.sql)
- אורח: **כלום.** לא קורא כנסים/נציגים/לידים ולא יוצר ליד; רק `can_login` כדי לבקש קוד. (עד 26.10 הטופס היה פתוח לכולם.)
- נציג מחובר: קורא `events` ו-`representatives` (הטופס צריך אותם), יוצר `leads` — גם עבור נציג אחר.
- נציג מחובר: קורא ומעדכן רק לידים שה-`assigned_email` שלהם שווה למייל שלו — ולא לידים שטופלו לפני יותר מ-6 חודשים (ראו GDPR).
- אדמין (שורה ב-`public.admins`): הכל. הבדיקה היא `is_admin()` בשרת, לעולם לא בצד הלקוח.
- **מי בכלל יכול להתחבר:** `can_login(email)` מחזירה true רק לנציג פעיל או לאדמין.
  `auth.sendCode` קוראת לה לפני שליחת הקוד, כך שכתובת שאינה במערכת לא מקבלת מייל כלל.
  אין הרשמה — הנציגים כבר רשומים, ומקבלים קוד לכתובת שרשומה להם.
- כל השוואות המייל הן `lower()` משני הצדדים: בטבלת הנציגים יש כתובת שנשמרה עם אות גדולה
  (`Hagay.karadi@`) וההתחברות מנרמלת לאותיות קטנות — בלי זה הנציג הזה היה נכנס ולא רואה כלום.
- ניהול האדמינים נעשה מכפתור "מנהל" בכל שורה במסך הנציגים (`RepresentativesManager`), ומנהל אינו יכול להסיר את עצמו.

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

### כניסה ישירה בלי קוד — מצב חירום (28.10.2026) — **כבוי מ-10.11.2026**
פונקציית `direct-login` מנפיקה סשן לכל כתובת שרשומה כנציג פעיל/אדמין, בלי מייל. נשלטת
בסוד `DIRECT_LOGIN` (on/off): כשהיא כבויה הפונקציה מחזירה 403 ו-`auth.sendCode` חוזר
לקוד במייל. **להדליק רק בזמן כנס ואם המייל נופל** — כל מי שיודע מייל של נציג נכנס בשמו.
**כל תבניות המייל של Auth** (קוד, הרשמה, הזמנה, איפוס, שינוי מייל) הן תבנית הקוד העברית
בלי שום קישור — `setup-auth-smtp.mjs` מדפיס `anyTemplateHasLink: false` כאימות.
```bash
npx supabase secrets set DIRECT_LOGIN=off --project-ref eoaxsmjjthkktlhbuenl   # לכבות (אין צורך לפרוס מחדש)
```
הסיבה המקורית למצב החירום הייתה באג: נציג שנכנס **בפעם הראשונה** הוא "הרשמה" מבחינת
Supabase ומקבל את תבנית ה-confirmation, שהייתה ברירת המחדל באנגלית עם קישור — ומערכת
הדואר של קנאוף זרקה אותה. `scripts/setup-auth-smtp.mjs` מגדיר עכשיו את תבנית הקוד
העברית גם ל-confirmation ול-invite. תוקן ואומת ב-28.10.

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
  **ה-cron של התזכורות כבוי עד העלייה לאוויר** — מפעילים אותו עם
  `node scripts/setup-webhook.mjs --reminders`. הגיבוי היומי (02:00) דולק תמיד.
- ⚠️ **מערכת הדואר של קנאוף מסננת מיילים עם קישורים.** אין קישורי http באף תבנית,
  וגם מייל קוד ההתחברות הוא קוד בלבד. לא להוסיף קישורים למיילים שיוצאים לנציגים.
- הטופס חסום מפני הצפה בטריגר `guard_lead_flood`: אותו טלפון פעמיים ב-30 שניות,
  או יותר מ-30 לידים בדקה, נדחים. לחיצה כפולה מוצגת לנציג כהצלחה.
- `reminder_days` בפרודקשן הוא 2, לא 7 כפי שכתוב בקוד הישן.
- לידים מ-Meta משויכים אוטומטית לקרן שי, ומיפוי התפקידים שם משתמש בערכים הישנים
  (`קבלן` ולא `קבלן/ית`) — פער ידוע שלא יושר בכוונה.
- טקסטים דו-לשוניים ב-`src/lib/i18n.js` (יש כפתור EN בממשק).

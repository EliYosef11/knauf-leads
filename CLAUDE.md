# Knauf Leads — מערכת לידים לכנסים

אפליקציית React/Vite בעברית (RTL) לאיסוף לידים בכנסים עבור קנאוף ישראל.
נבנתה במקור ב-Base44 Builder, והוצאה לקוד מקומי ב-18.10.2026 באמצעות `base44 eject`.

## סטטוס ומבנה הפריסה

| מה | איפה |
|---|---|
| אתר חי (production) | https://knauf-il-leads.com — מוגש מאפליקציית Base44 המקורית |
| App ID מקורי (production, עם הנתונים האמיתיים) | `6a15a08fdeebfd8254f3814d` |
| App ID של העותק לפיתוח (נוצר ע"י eject, DB ריק) | `6ad47fcc77c4c459a5387e96` — נמצא ב-`.env.local` ו-`base44/.app.jsonc` |

⚠️ **הקוד המקומי מחובר לעותק, לא ל-production.** כל פיתוח כאן לא נוגע בלידים האמיתיים.
לפני כל מעבר/סנכרון לכיוון production — לגבות נתונים קודם.

## הרצה מקומית

```bash
npx base44 dev     # בקאנד מקומי על 4400 + Vite על 5173, פרוקסי /api → localhost:4400
npm run seed       # בטרמינל שני — מזריע נתוני דמו
```

`npm run dev` לבדו **לא מספיק** — כל קריאות ה-API יחזירו 404 בלי הבקאנד המקומי.

**ה-DB המקומי יושב בזיכרון ונמחק בכל הפעלה מחדש של `base44 dev`.**
לכן יש `npm run seed` (`scripts/seed-dev.mjs` + `scripts/seed-data.json`) שמזריע 13 כנסים,
19 נציגים, הגדרות התראות ו-4 לידים לדוגמה. הסקריפט אידמפוטנטי — מדלג על ישות שכבר מאוכלסת.
שמות הנציגים אמיתיים אך **כתובות המייל שלהם הוחלפו בכתובות בדיקה** (`example.com`) כדי שבדיקה
מקומית לא תשלח מייל לנציג אמיתי. הלידים ב-seed מומצאים — אין בקוד נתונים אישיים אמיתיים.

### מגבלה: backend functions לא רצות על המק הזה
Deno מותקן (`~/.deno/bin/deno`, צריך להיות ב-PATH לפני `base44 dev`), אבל ריצת הפונקציות
המקומית משתמשת ב-`workerd` שדורש macOS 13+. על macOS 12.7.6 כאן זה נכשל:
`dyld: Symbol not found ... workerd` → הפונקציה מחזירה `write EPIPE` / 500.
**לכן בדיקת פונקציות נעשית מול אפליקציית העותק ב-Base44** (`npx base44 functions deploy <name>`),
לא מקומית. שאר הפיתוח (UI, entities, זרימות נתונים) עובד מקומית ללא בעיה.

### גיבויים
`backups/prod-export-YYYY-MM-DD.json` — ייצוא מלא של הנתונים מפרודקשן (ב-18.10.2026: 55 לידים,
13 כנסים, 19 נציגים, הגדרות). התיקייה ב-`.gitignore` כי יש בה פרטים אישיים של לידים אמיתיים.
לייצוא מחודש:

```bash
export PATH="$HOME/.deno/bin:$PATH"
npx base44 exec --app-id 6a15a08fdeebfd8254f3814d < script.ts   # script.ts מדפיס JSON
```

## ארכיטקטורה

- **Frontend**: React 18 + Vite + Tailwind + shadcn/ui (`src/components/ui/*` — קוד ספרייה, לא לערוך סתם) + framer-motion + react-router + TanStack Query.
- **Backend**: Base44 — entities (DB), auth, backend functions (Deno), connectors, workflows.
- **SDK**: `@base44/sdk` דרך `src/api/base44Client.js`; `serverUrl: ''` כלומר קריאות יחסיות ל-`/api`.

### Entities (`base44/entities/`)
`Lead`, `Event`, `Representative`, `Campaign`, `NotificationSettings`, `User`.
שדות ה-Lead בעברית (role, interests, status הם enums בעברית — לא לשנות ערכים בלי מיגרציית נתונים).

### Pages (`src/pages/`)
| נתיב | קומפוננטה | תיאור |
|---|---|---|
| `/` | LeadForm | טופס הליד הציבורי (mobile-first), משויך אוטומטית לכנס לפי תאריך |
| `/my-leads` | MyLeads | הלידים של הנציג המחובר |
| `/admin` | AdminDashboard | לוח ניהול + טבלת לידים + ייצוא |
| `/events` | EventsManager | ניהול כנסים |
| `/representatives` | RepresentativesManager | ניהול נציגים |
| `/campaigns` | CampaignsManager | קמפיינים (לידים מ-Meta) |
| `/settings` | Settings | כתובות תפוצה להתראות (NotificationSettings) |

### Backend functions (`base44/functions/`)
| פונקציה | תפקיד |
|---|---|
| `sendLeadNotification` | **הליבה**: על כל יצירת Lead שולחת מייל HTML בעברית לנציג המשויך (`assigned_email`) + CC לכתובות מ-NotificationSettings |
| `sendReminderEmail` | תזכורת יומית (cron `0 6 * * *`) על לידים שטרם טופלו 7 ימים |
| `transferLead` | העברת ליד בין נציגים + מייל ליידוע |
| `exportEventEmail` | שליחת טבלת לידים של כנס למייל |
| `sendTestEmail` | בדיקת חיבור Gmail ממסך ההגדרות |
| `metaWebhook` | קליטת לידים מ-Meta Lead Ads (verify token: `META_VERIFY_TOKEN`, ברירת מחדל `knauf-meta-webhook`) |

### שליחת מיילים — התלות המרכזית ב-Base44
כל המיילים נשלחים דרך **Gmail API** עם OAuth connector של Base44 (`base44/connectors/gmail.jsonc`, scope `gmail.send`):

```js
const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
// POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
```

ה-refresh token של חשבון ה-Gmail הייעודי מוחזק אצל Base44. בהגירה מלאה החוצה צריך להחליף את זה
ב-Google OAuth client עצמאי, או ב-SMTP/Resend.

### Workflows (`base44/workflows/`)
שני workflows מהגרים מ-automations ישנים: טריגר על יצירת Lead → `sendLeadNotification`,
ו-cron יומי → `sendReminderEmail`. באפליקציית העותק הן נכשלו ב-deploy
(`409 workflows_enabled` — האפליקציה החדשה משתמשת ב-Workflows ולכן automations ישנים חסומים).
הגדרות ה-`automations` שנשארו בתוך `function.jsonc` הן שאריות legacy עם `is_active: false`.

## מצב האבטחה

**תוקן בקוד, טרם נפרס (18.10.2026):** `AdminGuard` עבר לאימות אמיתי מול Base44 —
לא מחובר מקבל כפתור התחברות, מחובר ללא `role === 'admin'` מקבל "אין הרשאת גישה".
שער הסיסמה הקשיחה וה-`sessionStorage.admin_unlocked` הוסרו.
בפרודקשן `elicomusic@gmail.com` הוא היחיד הרשום ובעל `role: admin`, כך שהוא ייכנס כרגיל;
כל אדמין נוסף צריך משתמש עם `role: admin` בדשבורד של Base44.

⚠️ **האתר החי עדיין מריץ את הגרסה הישנה** — ההחלטה (18.10.2026) הייתה לא לפרוס עד שיהיה
תיקון שלם. כלומר הסיסמה החשופה בבאנדל עדיין פעילה בפרודקשן.

**פתוח במכוון (החלטת המשתמש, 18.10.2026):**
`/my-leads` ללא שום הגנה — בוחרים נציג מרשימה ורואים את כל הלידים שלו (שם, טלפון, מייל, הערות),
ואפשר לעבור בין כל הנציגים. בנוסף אין RLS על אף entity (אין מפתח `rls` בקבצי `base44/entities/`)
ו-`requiresAuth: false` ב-`src/api/base44Client.js`, כך שהנתונים נגישים גם ישירות דרך ה-API.

הסיבה המבנית: המערכת תוכננה ללא התחברות לנציגים, ולכן השרת לא יודע מי מולו ואי אפשר להגדיר
RLS בלי לשבור את מסך הנציגים. הפתרון המוצע כשיוחלט: חשבונות Google לנציגים, ואז
`"read": { "$or": [ { "user_condition": { "role": "admin" } }, { "assigned_email": "{{user.email}}" } ] }`
על entity `Lead`, עם `"create": true` כדי שהטופס הציבורי ימשיך לעבוד.

## כללי עבודה בפרויקט

- **לשמור על העיצוב 1:1** מול האתר החי. אומת ב-18.10.2026: הרנדור המקומי זהה לפרודקשן.
- הטופס והמסכים RTL בעברית; טקסטים דו-לשוניים ב-`src/lib/i18n.js` (יש כפתור EN).
- לא לשנות ערכי enum בעברית ב-entities בלי לחשוב על נתונים קיימים.
- `src/components/ui/` זה shadcn — לשנות רק בכוונה.

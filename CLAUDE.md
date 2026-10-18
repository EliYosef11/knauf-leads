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
npx base44 dev
```

מריץ בקאנד Base44 מקומי על 4400 + Vite על 5173 עם פרוקסי `/api → localhost:4400`.
`npm run dev` לבדו **לא מספיק** — כל קריאות ה-API יחזירו 404 בלי הבקאנד המקומי.

הרצת backend functions מקומית דורשת Deno (לא מותקן כרגע במכונה).

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

## כללי עבודה בפרויקט

- **לשמור על העיצוב 1:1** מול האתר החי. אומת ב-18.10.2026: הרנדור המקומי זהה לפרודקשן.
- הטופס והמסכים RTL בעברית; טקסטים דו-לשוניים ב-`src/lib/i18n.js` (יש כפתור EN).
- לא לשנות ערכי enum בעברית ב-entities בלי לחשוב על נתונים קיימים.
- `src/components/ui/` זה shadcn — לשנות רק בכוונה.

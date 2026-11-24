# עבודה על הפרויקט מכל מחשב

הקוד חי ב-GitHub (ריפו פרטי). כל מה שלא בקוד — הסודות — יושב ב-`.env.local` שאינו ב-git,
ולכן בכל מחשב חדש יוצרים אותו פעם אחת. הכול השאר (`CLAUDE.md`, הסקריפטים, התיעוד) מגיע עם ה-clone.

## אפשרות א' — Claude Code באינטרנט (בלי להתקין כלום)

1. https://claude.ai/code → התחבר → חבר את חשבון GitHub (EliYosef11) ובחר את הריפו `knauf-leads`.
2. בהגדרות הסביבה (Environment) הוסף את משתני הסביבה מתוך `.env.example` עם הערכים האמיתיים
   (הם נשמרים מוצפנים אצל Anthropic, לא בריפו).
3. פותחים שיחה על הריפו — Claude קורא את `CLAUDE.md` ויודע איפה הכול עומד.

מגבלה: אין דפדפן מקומי ואין גישה ל-Chrome שלך — פריסה, SQL, בדיקות ומיילים עובדים (הכול דרך API),
אבל "תראה לי את המסך" יהיה דרך צילומי מסך של סביבת הענן.

## אפשרות ב' — מחשב אחר עם Claude Code (Mac/Windows)

```bash
git clone git@github.com:EliYosef11/knauf-leads.git     # או https://github.com/EliYosef11/knauf-leads.git
cd knauf-leads
npm install
cp .env.example .env.local      # ולמלא את הערכים
npm run dev                     # http://localhost:5173
```

קוד התחברות בלי מייל (לבדיקות): `node scripts/dev-login-code.mjs eli.yosef@knauf.com`

## מאיפה לוקחים כל סוד

| משתנה | איפה |
|---|---|
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase → פרויקט `knauf-leads-eu` → Project Settings → API Keys |
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens → Generate new token |
| `GMAIL_APP_PASSWORD` | חשבון knauf.il.leads@gmail.com → ניהול חשבון → אבטחה → סיסמאות לאפליקציות (דורש אימות דו-שלבי) |
| `NETLIFY_AUTH_TOKEN` | https://app.netlify.com/user/applications → New access token |

מומלץ לשמור את כל הערכים במנהל סיסמאות (למשל 1Password / Bitwarden) כרשומה אחת "Knauf Leads – .env.local",
ואז במחשב חדש זו הדבקה אחת.

## מה לא עובר ב-git (בכוונה)

- `.env.local` — סודות.
- `backups/` — ייצוא הנתונים מ-Base44, יש בו פרטים אישיים. לא צריך אותו לעבודה שוטפת; הגיבוי היומי
  האמיתי יושב ב-Supabase Storage (`backups` bucket, 30 יום).
- `node_modules/`, `dist/` — נבנים מחדש.

## פקודות שימושיות (מכל מחשב)

```bash
npm run build && npx netlify deploy --prod --dir=dist --site=$NETLIFY_SITE_ID --auth=$NETLIFY_AUTH_TOKEN   # פריסה
node scripts/run-sql.mjs <file.sql>       # SQL על הפרודקשן
node scripts/preflight.mjs                # 32 בדיקות מוכנות
npm run functions:deploy                  # פריסת Edge Functions
```

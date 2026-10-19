# מצב בדיקות — לפני העלייה לאוויר

נקבע ב-19.10.2026 כדי שאפשר יהיה לבדוק את המערכת בלי להטריד אף אחד.

## מה שונה כרגע מהמצב הסופי

| | בבדיקות | צריך לחזור לפני עלייה |
|---|---|---|
| תפוצת התראות (`notification_settings.notification_emails`) | `knauf.il.leads@gmail.com` | `keren.shay@knauf.com` |
| נציג `נציג בדיקה (למחיקה)` (id `rep-test-sandbox`) | קיים, מייל של תיבת המערכת | למחוק |
| לידי בדיקה שייווצרו | `is_sample: true` | למחוק |

הערכים המקוריים שמורים ב-`backups/notification-settings-original.json`.

## שחזור לפני העלייה לאוויר

```bash
node scripts/exit-test-mode.mjs
```

מחזיר את תפוצת ההתראות, מוחק את נציג הבדיקה ואת כל הלידים שסומנו `is_sample`,
ומדפיס את המצב כדי לאמת.

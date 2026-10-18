#!/bin/bash
# לוקח את סיסמת האפליקציה של Gmail מלוח ההעתקה ושומר אותה ב-.env.local המקומי.
# הסיסמה לא עוברת בצ'אט ולא נכנסת ל-git.
cd "$(dirname "$0")/.." || exit 1

raw="$(pbpaste)"
clean="$(printf '%s' "$raw" | tr -d '[:space:]')"

if [ ${#clean} -ne 16 ]; then
  echo "❌ לוח ההעתקה לא מכיל סיסמת אפליקציה (ציפיתי ל-16 תווים, התקבלו ${#clean})."
  echo "   צור אחת ב-https://myaccount.google.com/apppasswords והעתק אותה, ואז הרץ שוב."
  echo
  echo "אפשר לסגור את החלון הזה."
  exit 1
fi

grep -v -e '^GMAIL_APP_PASSWORD=' -e '^GMAIL_ADDRESS=' .env.local > .env.local.tmp 2>/dev/null
mv .env.local.tmp .env.local
printf 'GMAIL_ADDRESS=knauf.il.leads@gmail.com\nGMAIL_APP_PASSWORD=%s\n' "$clean" >> .env.local

echo "✅ הסיסמה נשמרה ב-.env.local. אפשר לחזור לצ'אט."
echo
echo "אפשר לסגור את החלון הזה."

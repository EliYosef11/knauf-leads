#!/bin/bash
# לוקח מלוח ההעתקה את ה-Personal Access Token של Netlify ושומר אותו ב-.env.local.
# הטוקן לא עובר בצ'אט ולא נכנס ל-git.
cd "$(dirname "$0")/.." || exit 1

k="$(pbpaste | tr -d '[:space:]')"

if [ ${#k} -lt 20 ]; then
  echo "❌ לוח ההעתקה לא מכיל טוקן (ציפיתי למחרוזת ארוכה, התקבלו ${#k} תווים)."
  echo "   צור טוקן ב-https://app.netlify.com/user/applications#personal-access-tokens, העתק, והרץ שוב."
else
  grep -v '^NETLIFY_AUTH_TOKEN=' .env.local > .env.local.tmp 2>/dev/null
  mv .env.local.tmp .env.local
  printf 'NETLIFY_AUTH_TOKEN=%s\n' "$k" >> .env.local
  echo "✅ הטוקן נשמר. אפשר לחזור לצ'אט."
fi
echo
echo "אפשר לסגור את החלון הזה."

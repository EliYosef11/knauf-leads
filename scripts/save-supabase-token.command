#!/bin/bash
# לוקח מלוח ההעתקה את ה-Access Token של Supabase ושומר אותו ב-.env.local המקומי.
# הטוקן לא עובר בצ'אט ולא נכנס ל-git.
cd "$(dirname "$0")/.." || exit 1

k="$(pbpaste | tr -d '[:space:]')"

case "$k" in
  sbp_*)
    grep -v '^SUPABASE_ACCESS_TOKEN=' .env.local > .env.local.tmp 2>/dev/null
    mv .env.local.tmp .env.local
    printf 'SUPABASE_ACCESS_TOKEN=%s\n' "$k" >> .env.local
    echo "✅ הטוקן נשמר. אפשר לחזור לצ'אט."
    ;;
  *)
    echo "❌ לוח ההעתקה לא מכיל טוקן (מתחיל ב-sbp_)."
    echo "   צור אחד ב-https://supabase.com/dashboard/account/tokens, העתק, והרץ שוב."
    ;;
esac
echo
echo "אפשר לסגור את החלון הזה."

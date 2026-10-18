#!/bin/bash
# לוקח את מפתח ה-secret של Supabase מלוח ההעתקה ושומר אותו ב-.env.local המקומי.
# המפתח לא עובר דרך הצ'אט ולא נכנס ל-git.
cd "$(dirname "$0")/.." || exit 1
k="$(pbpaste)"
case "$k" in
  sb_secret_*)
    grep -v '^SUPABASE_SECRET_KEY=' .env.local > .env.local.tmp 2>/dev/null
    mv .env.local.tmp .env.local
    printf 'SUPABASE_SECRET_KEY=%s\n' "$k" >> .env.local
    echo "✅ המפתח נשמר ב-.env.local. אפשר לחזור לצ'אט."
    ;;
  *)
    echo "❌ לוח ההעתקה לא מכיל מפתח secret."
    echo "   היכנס ל-Supabase → Settings → API Keys → Secret keys → כפתור ההעתקה, ואז הרץ שוב."
    ;;
esac
echo
echo "אפשר לסגור את החלון הזה."

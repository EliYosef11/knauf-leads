import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/hooks/useLang';
import { db } from '@/api/db';

/**
 * "שלום, <שם>" + התנתקות למשתמש מחובר, או קישור התחברות לאורח.
 * מוצג בראש כל המסכים, כולל טופס הליד הציבורי.
 *
 * השם נלקח מרשומת הנציג לפי המייל המחובר (השוואה חסינת רישיות — יש במערכת
 * כתובת שנשמרה עם אות גדולה); אם אין רשומה כזו, מוצגת הכתובת עצמה.
 */

const T = {
  he: { hello: 'שלום', logout: 'התנתק', login: 'התחבר' },
  en: { hello: 'Hello', logout: 'Sign out', login: 'Sign in' },
};

export default function UserBadge({ className = '' }) {
  const { isAuthenticated, isLoadingAuth, email, logout } = useAuth();
  const { lang } = useLang();
  const t = T[lang] || T.he;

  const { data: reps = [] } = useQuery({
    queryKey: ['reps-active'],
    queryFn: () => db.Representative.filter({ is_active: true }, 'sort_order', 200),
    enabled: isAuthenticated,
  });

  if (isLoadingAuth) return null;

  const base = 'inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white ' +
    'transition-all px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm active:scale-95';

  if (!isAuthenticated) {
    return (
      <Link to="/login" className={`${base} ${className}`}>
        <LogIn className="w-3.5 h-3.5" />
        <span>{t.login}</span>
      </Link>
    );
  }

  const name = reps.find((r) => (r.email || '').toLowerCase() === (email || '').toLowerCase())?.name || email;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-xs text-white/70 max-w-[7.5rem] sm:max-w-[11rem] truncate" title={email}>
        {t.hello}, {name}
      </span>
      <button type="button" onClick={logout} className={base}>
        <LogOut className="w-3.5 h-3.5" />
        <span>{t.logout}</span>
      </button>
    </div>
  );
}

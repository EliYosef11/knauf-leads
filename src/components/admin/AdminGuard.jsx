import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLang } from '@/hooks/useLang';
import LoginCard from '@/components/auth/LoginCard';

const T = {
  he: {
    title: 'כניסה לניהול',
    subtitle: 'הזן את כתובת המייל שלך ונשלח אליך קוד',
    deniedTitle: 'אין הרשאת גישה',
    deniedSubtitle: 'החשבון המחובר אינו מורשה לאזור הניהול. פנה למנהל המערכת.',
    logout: 'התנתקות',
    back: 'חזרה לטופס',
  },
  en: {
    title: 'Admin Access',
    subtitle: 'Enter your email address and we will send you a code',
    deniedTitle: 'Access denied',
    deniedSubtitle: 'This account is not authorized for the admin area. Contact your system administrator.',
    logout: 'Sign out',
    back: 'Back to form',
  },
};

export default function AdminGuard({ children }) {
  const { isAuthenticated, isAdmin, isLoadingAuth, email, logout } = useAuth();
  const { lang } = useLang();
  const t = T[lang] || T.he;

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginCard title={t.title} subtitle={t.subtitle} />;
  }

  // מחובר אך אינו אדמין. גם אם מישהו יעקוף את המסך הזה, ה-RLS בשרת לא יחזיר לו נתונים.
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-secondary/30">
        <div className="text-center max-w-sm w-full bg-card p-8 rounded-3xl shadow-sm border border-border">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold">{t.deniedTitle}</h1>
          <p className="mt-2 text-muted-foreground text-sm mb-4">{t.deniedSubtitle}</p>
          {email && <p className="text-xs text-muted-foreground mb-4" dir="ltr">{email}</p>}
          <Button variant="outline" className="w-full h-12" onClick={logout}>{t.logout}</Button>
          <div className="mt-6 pt-6 border-t border-border">
            <Link to="/">
              <Button variant="ghost" className="w-full text-muted-foreground h-12">{t.back}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

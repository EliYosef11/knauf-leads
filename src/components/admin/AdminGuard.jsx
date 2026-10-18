import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ShieldAlert, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLang } from '@/hooks/useLang';

const T = {
  he: {
    title: 'כניסה לניהול',
    subtitle: 'התחבר עם חשבון המנהל כדי להמשיך',
    submit: 'התחברות',
    back: 'חזרה לטופס',
    deniedTitle: 'אין הרשאת גישה',
    deniedSubtitle: 'החשבון המחובר אינו מורשה לאזור הניהול. פנה למנהל המערכת.',
    logout: 'התנתקות',
  },
  en: {
    title: 'Admin Access',
    subtitle: 'Sign in with an admin account to continue',
    submit: 'Sign in',
    back: 'Back to form',
    deniedTitle: 'Access denied',
    deniedSubtitle: 'This account is not authorized for the admin area. Contact your system administrator.',
    logout: 'Sign out',
  }
};

function GuardCard({ icon, title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-secondary/30">
      <div className="text-center max-w-sm w-full bg-card p-8 rounded-3xl shadow-sm border border-border">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
          {icon}
        </div>
        <h1 className="text-2xl font-display font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground text-sm mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export default function AdminGuard({ children }) {
  const { user, isLoadingAuth, isLoadingPublicSettings, navigateToLogin, logout } = useAuth();
  const { lang } = useLang();
  const t = T[lang] || T.he;

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // לא מחובר — הפניה להתחברות של Base44 (אין שער סיסמה בצד הלקוח)
  if (!user) {
    return (
      <GuardCard icon={<Lock className="w-8 h-8 text-primary" />} title={t.title} subtitle={t.subtitle}>
        <Button type="button" className="w-full h-12" onClick={navigateToLogin}>
          {t.submit}
        </Button>
        <div className="mt-6 pt-6 border-t border-border">
          <Link to="/">
            <Button variant="ghost" className="w-full text-muted-foreground h-12">{t.back}</Button>
          </Link>
        </div>
      </GuardCard>
    );
  }

  // מחובר אך ללא הרשאת אדמין
  if (user.role !== 'admin') {
    return (
      <GuardCard
        icon={<ShieldAlert className="w-8 h-8 text-primary" />}
        title={t.deniedTitle}
        subtitle={t.deniedSubtitle}
      >
        {user.email && <p className="text-xs text-muted-foreground mb-4" dir="ltr">{user.email}</p>}
        <Button variant="outline" className="w-full h-12" onClick={() => logout()}>
          {t.logout}
        </Button>
        <div className="mt-6 pt-6 border-t border-border">
          <Link to="/">
            <Button variant="ghost" className="w-full text-muted-foreground h-12">{t.back}</Button>
          </Link>
        </div>
      </GuardCard>
    );
  }

  return children;
}

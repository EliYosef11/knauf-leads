import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ShieldAlert, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { useLang } from '@/hooks/useLang';

const T = {
  he: {
    title: 'כניסה לניהול',
    subtitle: 'הזן סיסמת מנהל כדי להמשיך',
    placeholder: 'סיסמה...',
    error: 'סיסמה שגויה, נסה שוב',
    submit: 'כניסה',
    back: 'חזרה לטופס',
  },
  en: {
    title: 'Admin Access',
    subtitle: 'Enter admin password to continue',
    placeholder: 'Password...',
    error: 'Incorrect password, please try again',
    submit: 'Enter',
    back: 'Back to form',
  }
};

export default function AdminGuard({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { lang } = useLang();
  const t = T[lang] || T.he;

  useEffect(() => {
    if (sessionStorage.getItem('admin_unlocked') === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === 'Orbond11') {
      sessionStorage.setItem('admin_unlocked', 'true');
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if ((!user || user.role !== 'admin') && !isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-secondary/30">
        <div className="text-center max-w-sm w-full bg-card p-8 rounded-3xl shadow-sm border border-border">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold">{t.title}</h1>
          <p className="mt-2 text-muted-foreground text-sm mb-6">{t.subtitle}</p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              placeholder={t.placeholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center h-12"
              dir="ltr"
            />
            {error && <p className="text-xs text-destructive">{t.error}</p>}
            <Button type="submit" className="w-full h-12">{t.submit}</Button>
          </form>
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
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { auth } from '@/api/auth';

/**
 * מצב ההתחברות של האפליקציה, מעל Supabase Auth.
 *
 * האפליקציה ציבורית כברירת מחדל — טופס הליד בכנס עובד בלי התחברות.
 * ההתחברות נדרשת רק כדי *לראות* לידים: אדמין רואה הכל, נציג רואה את שלו.
 * ההרשאה עצמה נאכפת בשרת (RLS), וה-UI רק משקף אותה.
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const refreshRole = useCallback(async (activeSession) => {
    setIsAdmin(activeSession ? await auth.isAdmin() : false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const current = await auth.currentSession();
      if (cancelled) return;
      setSession(current);
      // סשן ששוחזר מהמכשיר — נרשם ביומן הכניסות כביקור (השרת מגביל לפעם בשעה)
      if (current) auth.logLogin('visit');
      await refreshRole(current);
      if (!cancelled) setIsLoadingAuth(false);
    })();

    const unsubscribe = auth.onChange(async (next) => {
      setSession(next);
      await refreshRole(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshRole]);

  const logout = async () => {
    await auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  const user = session?.user ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        email: user?.email ?? null,
        isAuthenticated: Boolean(user),
        isAdmin,
        isLoadingAuth,
        sendCode: auth.sendCode,
        verifyCode: auth.verifyCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

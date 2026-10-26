import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import LoginCard from '@/components/auth/LoginCard';

/**
 * מסך התחברות (`/login`). מגיעים אליו מכפתור ההתחברות, או אוטומטית מכל מסך
 * שדורש משתמש מחובר (כולל הטופס). ברגע שיש סשן — חוזרים לאן שהמשתמש ניסה להגיע.
 */
export default function Login() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, isLoadingAuth, navigate, from]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <LoginCard />;
}

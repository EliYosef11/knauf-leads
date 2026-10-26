import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * שער התחברות למסכים שדורשים משתמש מחובר — כולל טופס הליד עצמו.
 *
 * הטופס היה פתוח לכולם מאז Base44 (הנציג בכנס לא היה מתחבר). מ-26.10.2026 הוא
 * דורש התחברות, כדי שרק נציגים רשומים יוכלו להזין לידים ואף אחד מבחוץ לא יגיע
 * אליו. ההגנה האמיתית היא ב-RLS (אורח לא יכול ליצור ליד); כאן רק מפנים למסך
 * ההתחברות וזוכרים לאן לחזור אחריו.
 *
 * ה-AuthProvider כבר ממתין לשחזור הסשן לפני שמרנדרים את הראוטר, ולכן אין כאן
 * מצב ביניים שמהבהב.
 */
export default function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

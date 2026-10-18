-- מדיניות RLS — שלב 1 של ההגירה.
--
-- המינימום שנדרש כדי שהטופס הציבורי בכנס יעבוד בדיוק כמו היום:
-- אורח (מפתח הדפדפן, תפקיד anon) יכול לקרוא את רשימת הכנסים והנציגים כדי למלא את הטופס,
-- ולהוסיף ליד — אבל לא לקרוא, לעדכן או למחוק לידים קיימים.
--
-- כלומר, בניגוד למצב היום ב-Base44, טבלת הלידים אינה פתוחה לקריאה לאף אחד.
-- מסכי הניהול והנציגים יקבלו הרשאות קריאה בשלב 2, מול משתמש מחובר:
--   קריאה לאדמין על הכל, ולנציג רק על לידים שמשויכים למייל שלו.

drop policy if exists anon_read_events on public.events;
create policy anon_read_events on public.events
  for select to anon using (true);

drop policy if exists anon_read_representatives on public.representatives;
create policy anon_read_representatives on public.representatives
  for select to anon using (true);

drop policy if exists anon_create_leads on public.leads;
create policy anon_create_leads on public.leads
  for insert to anon with check (true);

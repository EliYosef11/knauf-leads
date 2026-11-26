import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, History, Loader2, Smartphone, Monitor, KeyRound, RotateCw, Users, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import AdminGuard from '../components/admin/AdminGuard';
import KnaufLogo from '../components/lead-form/KnaufLogo';
import { useLang } from '../hooks/useLang';
import { translations } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import UserBadge from '@/components/auth/UserBadge';
import { LOGIN_LOG_MONTHS } from '@/lib/privacy';

/**
 * יומן כניסות — מי נכנס למערכת ומתי (supabase/login-log.sql).
 * אדמין בלבד: ה-RLS על login_log מחזיר שורות רק ל-is_admin().
 */
export default function LoginLog() {
  return (
    <AdminGuard>
      <LoginLogContent />
    </AdminGuard>
  );
}

const formatWhen = (iso) => format(new Date(iso), 'dd/MM/yyyy HH:mm');

function LoginLogContent() {
  const { lang, toggle } = useLang();
  const t = translations[lang];
  const [selected, setSelected] = useState('all');

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['login-log'],
    queryFn: () => db.LoginLog.filter({ kind: { $in: ['login', 'visit'] } }, '-at', 1000),
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['login-log-attempts'],
    queryFn: () => db.LoginLog.filter({ kind: { $in: ['denied', 'bad_code', 'code_request'] } }, '-at', 1000),
  });

  // מה נחשב "נכשל": כתובת לא רשומה, קוד שגוי, וקוד שנשלח לכתובת רשומה בלי שבאה אחריו
  // כניסה תוך שעה (תוקף הקוד). בקשה מרבע השעה האחרונה עוד לא נספרת — אולי הקוד בדרך.
  const failures = useMemo(() => {
    const HOUR = 3_600_000;
    const logins = entries.filter((entry) => entry.kind === 'login');
    return attempts.filter((attempt) => {
      if (attempt.kind !== 'code_request') return true;
      const sent = new Date(attempt.at).getTime();
      if (Date.now() - sent < HOUR / 4) return false;
      return !logins.some((login) => {
        const at = new Date(login.at).getTime();
        return login.email.toLowerCase() === attempt.email.toLowerCase() && at >= sent && at - sent <= HOUR;
      });
    });
  }, [attempts, entries]);

  const recentFailures = failures.filter((attempt) => Date.now() - new Date(attempt.at).getTime() < 86_400_000).length;
  const failureLabel = (kind) =>
    kind === 'denied' ? t.loginLogKindDenied : kind === 'bad_code' ? t.loginLogKindBadCode : t.loginLogKindUnused;

  const { data: reps = [] } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => db.Representative.list('name'),
  });

  // שם הנציג לפי המייל. ההשוואה באותיות קטנות — בטבלת הנציגים יש כתובת עם אות גדולה.
  const nameByEmail = useMemo(() => {
    const map = new Map();
    reps.forEach((rep) => rep.email && map.set(rep.email.toLowerCase(), rep.name));
    return map;
  }, [reps]);
  const displayName = (email) => nameByEmail.get(email.toLowerCase()) || email;

  // שורה לכל משתמש: נציגים פעילים (גם מי שלא נכנס אף פעם) + כל מי שמופיע ביומן
  const summary = useMemo(() => {
    const rows = new Map();
    reps.filter((rep) => rep.is_active && rep.email).forEach((rep) => {
      rows.set(rep.email.toLowerCase(), { email: rep.email.toLowerCase(), last: null, count: 0 });
    });
    entries.forEach((entry) => {
      const key = entry.email.toLowerCase();
      const row = rows.get(key) || { email: key, last: null, count: 0 };
      row.count += 1;
      if (!row.last || entry.at > row.last) row.last = entry.at;
      rows.set(key, row);
    });
    return [...rows.values()].sort((a, b) => (b.last || '').localeCompare(a.last || ''));
  }, [entries, reps]);

  const visible = selected === 'all' ? entries : entries.filter((entry) => entry.email.toLowerCase() === selected);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir={t.dir} style={{ background: 'linear-gradient(180deg, #003D7A 0%, #003D7A 35%, #005ba8 55%, #007bc4 75%, #009FE3 100%)' }}>
      <header className="bg-transparent">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <KnaufLogo />
            <div className="hidden sm:block w-px h-8 bg-white/20" />
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-white">{t.loginLogTitle}</h1>
              <p className="text-xs text-white/70">{t.loginLogSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserBadge />
            <LangToggle lang={lang} onToggle={toggle} />
            <Link to="/admin">
              <Button variant="outline" size="sm" className="gap-1.5 text-white border-white/30 hover:bg-white/10">
                <ArrowRight className="w-4 h-4" />
                <span className="hidden sm:inline">{t.backToAdmin}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-2xl px-5 py-4 text-sm text-red-900" dir="ltr">
            {error.message}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">{t.loginLogSummary}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-start font-medium py-2 pe-3 sm:pe-4">{t.loginLogUser}</th>
                  <th className="text-start font-medium py-2 pe-3 sm:pe-4">{t.loginLogLastSeen}</th>
                  <th className="text-start font-medium py-2">{t.loginLogCount}</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr
                    key={row.email}
                    onClick={() => setSelected(row.email)}
                    className="border-b border-border/60 last:border-0 cursor-pointer hover:bg-secondary/50"
                  >
                    <td className="py-2.5 pe-3 sm:pe-4">
                      <div className="font-medium">{displayName(row.email)}</div>
                      <div className="text-xs text-muted-foreground"><span dir="ltr">{row.email}</span></div>
                    </td>
                    <td className="py-2.5 pe-3 sm:pe-4 whitespace-nowrap">
                      {row.last ? <span dir="ltr">{formatWhen(row.last)}</span> : <span className="text-muted-foreground">{t.loginLogNever}</span>}
                    </td>
                    <td className="py-2.5">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">{t.loginLogEntries}</h2>
            </div>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-56 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.loginLogAllUsers}</SelectItem>
                {summary.map((row) => (
                  <SelectItem key={row.email} value={row.email}>{displayName(row.email)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              {t.loginLogEmpty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-start font-medium py-2 pe-3 sm:pe-4">{t.loginLogWhen}</th>
                    <th className="text-start font-medium py-2 pe-3 sm:pe-4">{t.loginLogUser}</th>
                    <th className="text-start font-medium py-2 pe-3 sm:pe-4">{t.loginLogKind}</th>
                    <th className="text-start font-medium py-2">{t.loginLogDevice}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pe-3 sm:pe-4 whitespace-nowrap"><span dir="ltr">{formatWhen(entry.at)}</span></td>
                      <td className="py-2.5 pe-3 sm:pe-4">
                        <div className="font-medium">{displayName(entry.email)}</div>
                        <div className="hidden sm:block text-xs text-muted-foreground"><span dir="ltr">{entry.email}</span></div>
                      </td>
                      <td className="py-2.5 pe-3 sm:pe-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5" title={entry.kind === 'visit' ? t.loginLogKindVisit : t.loginLogKindLogin}>
                          {entry.kind === 'visit'
                            ? <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
                            : <KeyRound className="w-3.5 h-3.5 text-primary" />}
                          <span className="hidden sm:inline">{entry.kind === 'visit' ? t.loginLogKindVisit : t.loginLogKindLogin}</span>
                        </span>
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        {entry.device && (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            {entry.device === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{entry.device === 'mobile' ? t.loginLogMobile : t.loginLogDesktop}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              <h2 className="font-display font-semibold text-lg">{t.loginLogFailedTitle}</h2>
            </div>
            {recentFailures > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                {t.loginLogFailedRecent(recentFailures)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t.loginLogFailedDesc}</p>

          {failures.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              {t.loginLogFailedEmpty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-start font-medium py-2 pe-3 sm:pe-4">{t.loginLogWhen}</th>
                    <th className="text-start font-medium py-2 pe-3 sm:pe-4">{t.loginLogAddress}</th>
                    <th className="text-start font-medium py-2 pe-3 sm:pe-4">{t.loginLogKind}</th>
                    <th className="text-start font-medium py-2">{t.loginLogIp}</th>
                  </tr>
                </thead>
                <tbody>
                  {failures.map((attempt) => (
                    <tr key={attempt.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pe-3 sm:pe-4 whitespace-nowrap"><span dir="ltr">{formatWhen(attempt.at)}</span></td>
                      <td className="py-2.5 pe-3 sm:pe-4">
                        {nameByEmail.has(attempt.email.toLowerCase()) && (
                          <div className="font-medium">{displayName(attempt.email)}</div>
                        )}
                        <div className="text-xs text-muted-foreground"><span dir="ltr">{attempt.email}</span></div>
                      </td>
                      <td className="py-2.5 pe-3 sm:pe-4">
                        <span className={attempt.kind === 'code_request' ? 'text-muted-foreground' : 'text-destructive font-medium'}>
                          {failureLabel(attempt.kind)}
                        </span>
                      </td>
                      <td className="py-2.5 whitespace-nowrap text-muted-foreground"><span dir="ltr">{attempt.ip || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-white/80 text-center">{t.loginLogRetention(LOGIN_LOG_MONTHS)}</p>
      </main>
    </div>
  );
}

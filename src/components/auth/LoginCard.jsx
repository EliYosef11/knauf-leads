import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/hooks/useLang';

/**
 * כרטיס ההתחברות — שני שלבים: כתובת מייל, ואז הקוד בן 6 הספרות שנשלח אליה.
 * העיצוב זהה לכרטיס שער הסיסמה שהיה כאן קודם (אותו כרטיס, אותו אייקון, אותם מרווחים).
 */

const T = {
  he: {
    title: 'כניסה למערכת',
    subtitleEmail: 'הזן את כתובת המייל שלך ונשלח אליך קוד',
    subtitleCode: 'הזן את הקוד בן 6 הספרות שנשלח אל',
    emailPlaceholder: 'you@knauf.co.il',
    codePlaceholder: '000000',
    send: 'שלח קוד',
    verify: 'כניסה',
    back: 'חזרה לטופס',
    changeEmail: 'שינוי כתובת',
    sending: 'שולח...',
    errorSend: 'שליחת הקוד נכשלה. בדוק את הכתובת ונסה שוב.',
    errorVerify: 'הקוד שגוי או פג תוקף. נסה שוב.',
  },
  en: {
    title: 'Sign in',
    subtitleEmail: 'Enter your email address and we will send you a code',
    subtitleCode: 'Enter the 6-digit code sent to',
    emailPlaceholder: 'you@knauf.co.il',
    codePlaceholder: '000000',
    send: 'Send code',
    verify: 'Sign in',
    back: 'Back to form',
    changeEmail: 'Change address',
    sending: 'Sending...',
    errorSend: 'Could not send the code. Check the address and try again.',
    errorVerify: 'That code is wrong or expired. Try again.',
  },
};

export default function LoginCard({ title, subtitle }) {
  const { sendCode, verifyCode } = useAuth();
  const { lang } = useLang();
  const t = T[lang] || T.he;

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await sendCode(email);
      setCodeSent(true);
    } catch (sendError) {
      setError(sendError.message || t.errorSend);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await verifyCode(email, code);
    } catch (verifyError) {
      setError(verifyError.message || t.errorVerify);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-secondary/30">
      <div className="text-center max-w-sm w-full bg-card p-8 rounded-3xl shadow-sm border border-border">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold">{title || t.title}</h1>
        <p className="mt-2 text-muted-foreground text-sm mb-6">
          {codeSent ? `${t.subtitleCode} ${email}` : subtitle || t.subtitleEmail}
        </p>

        {codeSent ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t.codePlaceholder}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center h-12 tracking-[0.5em]"
              dir="ltr"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-12" disabled={busy || code.length < 6}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t.verify}
            </Button>
            <button
              type="button"
              onClick={() => { setCodeSent(false); setCode(''); setError(''); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t.changeEmail}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <Input
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-center h-12"
              dir="ltr"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-12" disabled={busy || !email.includes('@')}>
              {busy ? t.sending : t.send}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <Link to="/">
            <Button variant="ghost" className="w-full text-muted-foreground h-12">{t.back}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

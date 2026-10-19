import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invokeFunction } from '@/api/functions';
import { db } from '@/api/db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowRight, Mail, Plus, X, Loader2, Check, Bell } from 'lucide-react';
import AdminGuard from '../components/admin/AdminGuard';
import KnaufLogo from '../components/lead-form/KnaufLogo';
import { useLang } from '../hooks/useLang';
import { translations } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import AdminAccessCard from '@/components/admin/AdminAccessCard';
import UserBadge from '@/components/auth/UserBadge';

export default function Settings() {
  return (
    <AdminGuard>
      <SettingsContent />
    </AdminGuard>
  );
}

function SettingsContent() {
  const [settings, setSettings] = useState(null);
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [reminderDays, setReminderDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [remindersSent, setRemindersSent] = useState(null);

  const sendRemindersNow = async () => {
    setSendingReminders(true);
    setRemindersSent(null);
    const res = await invokeFunction('sendReminderEmail', {});
    setSendingReminders(false);
    setRemindersSent(res.data?.sent ?? 0);
    setTimeout(() => setRemindersSent(null), 5000);
  };

  const { lang, toggle } = useLang();
  const t = translations[lang];

  useEffect(() => {
    (async () => {
      const list = await db.NotificationSettings.list();
      if (list.length > 0) {
        setSettings(list[0]);
        setEmails(list[0].notification_emails || []);
        setIsActive(list[0].is_active !== false);
        setReminderDays(list[0].reminder_days ?? 7);
      }
      setLoading(false);
    })();
  }, []);

  const addEmail = () => {
    const e = newEmail.trim();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (emails.includes(e)) return;
    setEmails([...emails, e]);
    setNewEmail('');
  };

  const removeEmail = (e) => setEmails(emails.filter(x => x !== e));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const payload = { notification_emails: emails, is_active: isActive, label: 'התראות לידים', reminder_days: Number(reminderDays) || 7 };
    if (settings?.id) {
      await db.NotificationSettings.update(settings.id, payload);
    } else {
      const created = await db.NotificationSettings.create(payload);
      setSettings(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir={t.dir} style={{ background: 'linear-gradient(180deg, #003D7A 0%, #003D7A 35%, #005ba8 55%, #007bc4 75%, #009FE3 100%)' }}>
      <header className="bg-transparent">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <KnaufLogo />
            <div className="hidden sm:block w-px h-8 bg-white/20" />
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-white">{t.settingsTitle}</h1>
              <p className="text-xs text-white/70">{t.settingsSubtitle}</p>
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

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <AdminAccessCard />

        <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-lg">{t.emailAlertsTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t.emailAlertsDesc}</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">{t.emailListTitle}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t.emailListDesc}</p>

          <div className="flex gap-2 mb-5">
            <Input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              placeholder="name@company.com"
              dir="ltr"
              className="h-11"
              type="email"
            />
            <Button onClick={addEmail} className="h-11 px-4">
              <Plus className="w-4 h-4 ml-1" />
              {t.addEmailBtn}
            </Button>
          </div>

          {emails.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              {t.noEmails}
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map(email => (
                <div key={email} className="flex items-center justify-between px-4 py-3 bg-secondary/60 rounded-xl">
                  <span dir="ltr" className="font-medium text-sm">{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="w-7 h-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">{t.remindersTitle}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t.remindersDesc}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm font-medium">{t.reminderAfterLabel}</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={reminderDays}
              onChange={e => setReminderDays(e.target.value)}
              className="w-20 text-center"
              dir="ltr"
            />
            <span className="text-sm text-muted-foreground">{t.reminderDaysLabel}</span>
            <div className="flex items-center gap-2 mr-auto">
              {remindersSent !== null && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  {remindersSent === 0 ? t.reminderNoneLabel : t.reminderSentLabel(remindersSent)}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={sendRemindersNow} disabled={sendingReminders} className="gap-2">
                {sendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                {t.sendRemindersNow}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
              <Check className="w-4 h-4" />
              {t.savedSettings}
            </span>
          )}
          <Button onClick={save} disabled={saving} className="h-11 px-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.saveSettings}
          </Button>
        </div>
      </main>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Lock, Star, Search, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

import InterestSelector from '../components/lead-form/InterestSelector';
import SuccessOverlay from '../components/lead-form/SuccessOverlay';
import { translations } from '../lib/i18n';
import { useLang } from '../hooks/useLang';
import LangToggle from '../components/LangToggle';

const EMPTY = {
  full_name: '',
  phone: '',
  email: '',
  company: '',
  city: '',
  role: '',
  interests: [],
  rep_notes: '',
  assigned_to: '',
  project_handling: '',
  is_quality: false
};

export default function LeadForm() {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [error, setError] = useState('');
  const { lang, toggle: toggleLang } = useLang();
  const t = translations[lang];

  // Find today's event automatically (including multi-day events)
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: allEvents = [] } = useQuery({
    queryKey: ['events-today', today],
    queryFn: () => base44.entities.Event.filter({ event_date: { $lte: today } }, '-event_date', 50)
  });
  // Pick an event that started on or before today, and ends on or after today
  const currentEvent = allEvents.find(ev => {
    const endDate = (ev.event_end_date && ev.event_end_date.trim()) ? ev.event_end_date : ev.event_date;
    return ev.event_date <= today && endDate >= today;
  });

  // Active representatives
  const { data: reps = [] } = useQuery({
    queryKey: ['reps-active'],
    queryFn: () => base44.entities.Representative.filter({ is_active: true }, 'sort_order', 100)
  });

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  // When language changes, reset interests (they are language-specific labels)
  const handleLangChange = () => {
    toggleLang();
    setForm((prev) => ({ ...prev, interests: [], role: '' }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError(t.errorRequired);
      return;
    }
    if (!form.assigned_to) {
      setError(t.errorRep);
      return;
    }
    setSubmitting(true);
    try {
      const assignedRep = reps.find((r) => r.name === form.assigned_to);
      await base44.entities.Lead.create({
        ...form,
        event_name: currentEvent?.name || 'ליד כללי',
        event_id: currentEvent?.id || '',
        assigned_email: assignedRep?.email || ''
      });
      setSuccess(true);
    } catch (err) {
      setError(t.errorGeneral);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!success) return;
    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setForm(EMPTY);
          setSuccess(false);
          setSubmitting(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#009FE3' }} dir={t.dir}>
      {/* Top bar with admin link */}
      <div className="absolute top-2 left-2 right-2 z-30 flex justify-between">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-all px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm shadow-md active:scale-95">
          <Lock className="w-4 h-4" />
          <span>{t.adminLink}</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <LangToggle lang={lang} onToggle={handleLangChange} />
          <Link
            to="/my-leads"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-all px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm shadow-md active:scale-95">
            <span>{t.myLeadsLink}</span>
          </Link>
        </div>
      </div>

      {/* Centered logo header */}
      <header className="pt-16 sm:pt-20 pb-2 px-5">
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-2">
          <div className="flex items-end justify-center gap-4">
            <img
              src="https://media.base44.com/images/public/6a15a08fdeebfd8254f3814d/25e6708d9_KNAUFLogo2024WhitesRGB.png"
              alt="KNAUF"
              className="h-20 sm:h-28 w-auto object-contain" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
            {currentEvent ? currentEvent.name : t.generalLead}
          </h1>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onSubmit={handleSubmit}
          dir={t.dir}
          className="space-y-7 bg-white border border-white/20 rounded-3xl p-6 sm:p-8 shadow-lg">
          
          <div className="space-y-5">
            <Field label={t.fullName} required>
              <Input
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                placeholder={t.fullNamePlaceholder}
                className="h-12 text-base"
                autoComplete="off" />
            </Field>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label={t.phone} required>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder={t.phonePlaceholder}
                  className="h-12 text-base"
                  autoComplete="off" />
              </Field>
              <Field label={t.email} required>
                <Input
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="h-12 text-base"
                  autoComplete="off"
                  dir="ltr" />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label={t.company}>
                <Input
                  value={form.company}
                  onChange={(e) => update('company', e.target.value)}
                  placeholder={t.companyPlaceholder}
                  className="h-12 text-base"
                  autoComplete="off" />
              </Field>
              <Field label={t.city}>
                <Input
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder={t.cityPlaceholder}
                  className="h-12 text-base"
                  autoComplete="off" />
              </Field>
            </div>

            <Field label={t.role}>
              <Select value={form.role} onValueChange={(v) => update('role', v)}>
                <SelectTrigger className="h-12 text-base text-right" dir={t.dir}>
                  <SelectValue placeholder={t.rolePlaceholder} />
                </SelectTrigger>
                <SelectContent dir={t.dir}>
                  {t.roles.map((r) =>
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t.projectHandling}>
              <Input
                value={form.project_handling}
                onChange={(e) => update('project_handling', e.target.value)}
                placeholder={t.projectHandlingPlaceholder}
                className="h-12 text-base"
                autoComplete="off" />
            </Field>
          </div>

          <div className="h-px bg-border/70" />

          <Field label={t.interests}>
            <InterestSelector
              value={form.interests}
              onChange={(v) => update('interests', v)}
              options={t.interestOptions}
              otherLabel={t.interestOther} />
          </Field>

          <div className="h-px bg-border/70" />

          <Field label={t.assignedTo} required>
            <RepSearchSelect
              reps={reps}
              value={form.assigned_to}
              onChange={(v) => update('assigned_to', v)}
              placeholder={t.assignedToPlaceholder}
              dir={t.dir}
            />
          </Field>

          <Field label={t.notes}>
            <div className="relative">
              <Textarea
                value={form.rep_notes}
                onChange={(e) => update('rep_notes', e.target.value)}
                placeholder={t.notesPlaceholder}
                className="min-h-[110px] text-base resize-none" />
              <button
                type="button"
                onClick={() => update('is_quality', !form.is_quality)}
                className={`absolute bottom-2 ${t.dir === 'rtl' ? 'left-2' : 'right-2'} p-1.5 rounded-lg transition-all ${form.is_quality ? 'text-amber-400' : 'text-transparent'}`}
                tabIndex={-1}
              >
                <Star className={`w-5 h-5 ${form.is_quality ? 'fill-amber-400 stroke-amber-400' : 'stroke-muted-foreground/30'}`} />
              </button>
            </div>
          </Field>

          {error &&
            <div className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
              {error}
            </div>
          }

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]">
            {submitting ?
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                {t.saving}
              </> :
              <>
                <Send className="w-5 h-5 ml-2" />
                {t.save}
              </>
            }
          </Button>
        </motion.form>

        <p className="text-center text-xs text-white/60 mt-8">
          {t.footer}
        </p>
        <div className="mt-8 flex justify-center">
          <img
            src="https://media.base44.com/images/public/6a15a08fdeebfd8254f3814d/7144d8e9b_KNAUFStatementWhitesRGB1Line.png"
            alt="KNAUF - Build on us"
            className="h-12 sm:h-16 w-auto object-contain opacity-90" />
        </div>
      </main>

      <AnimatePresence>
        {success && <SuccessOverlay countdown={countdown} />}
      </AnimatePresence>
    </div>
  );
}

function RepSearchSelect({ reps, value, onChange, placeholder, dir }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const filtered = reps.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = reps.find(r => r.name === value);

  return (
    <div className="relative" ref={ref} dir={dir}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 rounded-lg border border-input bg-secondary/30">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 py-2 text-sm bg-transparent outline-none"
                placeholder="חיפוש נציג..."
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">לא נמצאו תוצאות</div>
            ) : (
              filtered.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onChange(r.name); setOpen(false); }}
                  className={`w-full text-start px-4 py-3 text-sm hover:bg-secondary/60 transition-colors flex items-center justify-between ${value === r.name ? 'bg-secondary font-semibold' : ''}`}
                >
                  <span>{r.name}</span>
                  {r.role_title && <span className="text-xs text-muted-foreground">{r.role_title}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-3">
      <Label className="text-lg sm:text-xl font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive mr-1">*</span>}
      </Label>
      {children}
    </div>
  );
}
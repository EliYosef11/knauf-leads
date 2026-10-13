import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowRight, Calendar, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import AdminGuard from '../components/admin/AdminGuard';
import KnaufLogo from '../components/lead-form/KnaufLogo';
import { useLang } from '../hooks/useLang';
import { translations } from '../lib/i18n';
import LangToggle from '../components/LangToggle';

export default function EventsManager() {
  return (
    <AdminGuard>
      <EventsContent />
    </AdminGuard>
  );
}

function EventsContent() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventEndDate, setEventEndDate] = useState('');
  const [multiDay, setMultiDay] = useState(false);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});

  const { lang, toggle } = useLang();
  const t = translations[lang];

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 200),
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const createEvent = async (e) => {
    e.preventDefault();
    if (!name.trim() || !eventDate) return;
    setSaving(true);
    await base44.entities.Event.create({ name: name.trim(), event_date: eventDate, event_end_date: multiDay && eventEndDate ? eventEndDate : null, location: location.trim() });
    setName(''); setLocation(''); setEventEndDate(''); setMultiDay(false);
    queryClient.invalidateQueries({ queryKey: ['events'] });
    setSaving(false);
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setEditFields({ name: ev.name, event_date: ev.event_date, event_end_date: ev.event_end_date || '', location: ev.location || '' });
  };

  const saveEdit = async () => {
    if (!editFields.name.trim() || !editFields.event_date) return;
    await base44.entities.Event.update(editingId, { name: editFields.name.trim(), event_date: editFields.event_date, event_end_date: editFields.event_end_date || null, location: editFields.location.trim() });
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const removeEvent = async (id) => {
    if (!confirm(t.deleteEventConfirm)) return;
    await base44.entities.Event.delete(id);
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  return (
    <div className="min-h-screen" dir={t.dir} style={{ background: 'linear-gradient(180deg, #003D7A 0%, #003D7A 35%, #005ba8 55%, #007bc4 75%, #009FE3 100%)' }}>
      <header className="bg-transparent">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <KnaufLogo size="sm" />
            <div className="hidden sm:block w-px h-8 bg-white/20" />
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-white">{t.eventsTitle}</h1>
              <p className="text-xs text-white/70">{t.eventsSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <form onSubmit={createEvent} className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">{t.createEvent}</h2>
          </div>
          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4 space-y-1.5">
              <Label className="text-xs">{t.eventName}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.eventNamePlaceholder} className="h-11" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">{multiDay ? 'תאריך התחלה' : t.eventDate}</Label>
              <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="h-11" />
            </div>
            {multiDay && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">תאריך סיום</Label>
                <Input type="date" value={eventEndDate} min={eventDate} onChange={e => setEventEndDate(e.target.value)} className="h-11" />
              </div>
            )}
            <div className={`${multiDay ? 'sm:col-span-2' : 'sm:col-span-3'} space-y-1.5`}>
              <Label className="text-xs">{t.eventLocation}</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={t.eventLocationPlaceholder} className="h-11" />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <Button type="submit" disabled={saving || !name.trim()} className="h-11 w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" id="multiDay" checked={multiDay} onChange={e => setMultiDay(e.target.checked)} className="w-4 h-4 accent-primary cursor-pointer" />
            <label htmlFor="multiDay" className="text-xs text-muted-foreground cursor-pointer select-none">כנס מרובה ימים</label>
          </div>
        </form>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : events.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{t.noEvents}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">{t.eventDate}</th>
                  <th className="px-5 py-3 font-semibold">{t.eventName}</th>
                  <th className="px-5 py-3 font-semibold">{t.eventLocation}</th>
                  <th className="px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map(ev => {
                  const endDate = ev.event_end_date || ev.event_date;
                  const isToday = ev.event_date <= today && endDate >= today;
                  const isPast = endDate < today;
                  const isEditing = editingId === ev.id;
                  return (
                    <tr key={ev.id} className={isToday ? 'bg-primary/10 border-r-4 border-primary' : isPast ? 'opacity-60' : ''}>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <Input type="date" value={editFields.event_date} onChange={e => setEditFields(f => ({ ...f, event_date: e.target.value }))} className="h-8 w-36" />
                            <Input type="date" value={editFields.event_end_date} min={editFields.event_date} onChange={e => setEditFields(f => ({ ...f, event_end_date: e.target.value }))} className="h-8 w-36" placeholder="תאריך סיום" />
                          </div>
                        ) : (
                          <>
                            {format(new Date(ev.event_date), 'dd/MM/yyyy')}
                            {ev.event_end_date && ev.event_end_date !== ev.event_date && (
                              <span className="text-muted-foreground"> — {format(new Date(ev.event_end_date), 'dd/MM/yyyy')}</span>
                            )}
                            {isToday ? (
                              <span className="mr-2 inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">{t.todayBadge}</span>
                            ) : isPast ? (
                              <span className="mr-2 inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-muted text-muted-foreground">{t.pastBadge}</span>
                            ) : (
                              <span className="mr-2 inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">{t.upcomingBadge}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold">
                        {isEditing ? (
                          <Input value={editFields.name} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))} className="h-8" />
                        ) : ev.name}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {isEditing ? (
                          <Input value={editFields.location} onChange={e => setEditFields(f => ({ ...f, location: e.target.value }))} className="h-8" />
                        ) : (ev.location || '—')}
                      </td>
                      <td className="px-5 py-3.5 text-left">
                        <div className="flex items-center gap-1 justify-end">
                          {isEditing ? (
                            <>
                              <button onClick={saveEdit} className="text-green-600 hover:text-green-700 p-1 rounded-md"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-md"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(ev)} className="text-muted-foreground hover:text-primary p-1 rounded-md"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => removeEvent(ev.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-md"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
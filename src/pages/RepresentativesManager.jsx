import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { db } from '@/api/db';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, Users, Plus, Trash2, Loader2, Check, GripVertical, Pencil, X, ShieldCheck } from 'lucide-react';
import AdminGuard from '../components/admin/AdminGuard';
import KnaufLogo from '../components/lead-form/KnaufLogo';
import { useLang } from '../hooks/useLang';
import { translations } from '../lib/i18n';
import LangToggle from '../components/LangToggle';

export default function RepresentativesManager() {
  return (
    <AdminGuard>
      <RepsContent />
    </AdminGuard>
  );
}

function RepsContent() {
  const queryClient = useQueryClient();
  const { email: myEmail } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [localReps, setLocalReps] = useState(null);

  const { lang, toggle } = useLang();
  const t = translations[lang];

  const { data: reps = [], isLoading } = useQuery({
    queryKey: ['reps-all'],
    queryFn: () => db.Representative.list('sort_order', 200),
  });

  // מי מהנציגים הוא גם מנהל. הרשימה היא טבלת `admins`; הבדיקה בפועל נעשית בשרת
  // (`is_admin()`), כך שכיבוי ההרשאה מסיר גישה מיידית גם למי שמחובר כרגע.
  const { data: admins = [] } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admins').select('email');
      if (error) throw new Error(error.message);
      return data.map((row) => row.email.toLowerCase());
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ repEmail, shouldBeAdmin }) => {
      const { error } = shouldBeAdmin
        ? await supabase.from('admins').insert({ email: repEmail })
        : await supabase.from('admins').delete().eq('email', repEmail);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admins'] }),
  });

  // Sync localReps from server only when localReps is null (initial load or after add/delete)
  useEffect(() => {
    if (reps.length > 0 && localReps === null) {
      setLocalReps(reps);
    }
  }, [reps, localReps]);

  const displayReps = localReps ?? reps;

  const addRep = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const maxOrder = displayReps.reduce((m, r) => Math.max(m, r.sort_order || 0), 0);
    const newRep = await db.Representative.create({
      name: name.trim(),
      email: email.trim(),
      role_title: roleTitle.trim(),
      is_active: true,
      sort_order: maxOrder + 1
    });
    setName(''); setEmail(''); setRoleTitle('');
    setLocalReps(prev => [...(prev ?? []), newRep]);
    queryClient.invalidateQueries({ queryKey: ['reps-active'] });
    setSaving(false);
  };

  const updateRep = async (id, patch) => {
    await db.Representative.update(id, patch);
    setLocalReps(prev => prev ? prev.map(r => r.id === id ? { ...r, ...patch } : r) : null);
    queryClient.invalidateQueries({ queryKey: ['reps-active'] });
  };

  const removeRep = async (id) => {
    if (!confirm(t.deleteRepConfirm)) return;
    await db.Representative.delete(id);
    setLocalReps(prev => prev ? prev.filter(r => r.id !== id) : null);
    queryClient.invalidateQueries({ queryKey: ['reps-active'] });
  };

  const onDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(displayReps);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setLocalReps(reordered);
    // Only update reps whose sort_order actually changed
    const updates = reordered
      .map((rep, idx) => ({ rep, newOrder: idx + 1 }))
      .filter(({ rep, newOrder }) => rep.sort_order !== newOrder);
    for (const { rep, newOrder } of updates) {
      await db.Representative.update(rep.id, { sort_order: newOrder });
    }
    queryClient.invalidateQueries({ queryKey: ['reps-active'] });
  };

  return (
    <div className="min-h-screen" dir={t.dir} style={{ background: 'linear-gradient(180deg, #003D7A 0%, #003D7A 35%, #005ba8 55%, #007bc4 75%, #009FE3 100%)' }}>
      <header className="bg-transparent">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <KnaufLogo size="sm" />
            <div className="hidden sm:block w-px h-8 bg-white/20" />
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-white">{t.repsTitle}</h1>
              <p className="text-xs text-white/70">{t.repsSubtitle}</p>
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
        <form onSubmit={addRep} className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">{t.addRep}</h2>
          </div>
          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4 space-y-1.5">
              <Label className="text-xs">{t.repName}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.repNamePlaceholder} className="h-11" />
            </div>
            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-xs">תפקיד</Label>
              <Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="למשל: מנהל אזור" className="h-11" />
            </div>
            <div className="sm:col-span-4 space-y-1.5">
              <Label className="text-xs">{t.repEmail}</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder={t.repEmailPlaceholder} dir="ltr" className="h-11" />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <Button type="submit" disabled={saving || !name.trim()} className="h-11 w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </form>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : displayReps.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{t.noReps}</div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="reps-list">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-border">
                    {displayReps.map((rep, index) => (
                      <Draggable key={rep.id} draggableId={rep.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? 'bg-muted shadow-lg' : ''}
                          >
                            <RepRow
                              rep={rep}
                              onUpdate={updateRep}
                              onRemove={removeRep}
                              isAdmin={admins.includes((rep.email || '').toLowerCase())}
                              // מנהל לא מסיר את עצמו — אחרת אפשר להישאר בלי אף מנהל
                              isSelf={(rep.email || '').toLowerCase() === (myEmail || '').toLowerCase()}
                              adminPending={toggleAdmin.isPending}
                              onToggleAdmin={(shouldBeAdmin) =>
                                toggleAdmin.mutate({ repEmail: rep.email.toLowerCase(), shouldBeAdmin })
                              }
                              t={t}
                              dragHandleProps={provided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </main>
    </div>
  );
}

function RepRow({ rep, onUpdate, onRemove, isAdmin, isSelf, adminPending, onToggleAdmin, t, dragHandleProps }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(rep.name || '');
  const [email, setEmail] = useState(rep.email || '');
  const [roleTitle, setRoleTitle] = useState(rep.role_title || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveEdit = async () => {
    setSaving(true);
    await onUpdate(rep.id, { name: name.trim(), email: email.trim(), role_title: roleTitle.trim() });
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 1500);
  };

  const cancelEdit = () => {
    setName(rep.name || '');
    setEmail(rep.email || '');
    setRoleTitle(rep.role_title || '');
    setEditing(false);
  };

  return (
    <div className="p-4 sm:p-5">
      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t.repName}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תפקיד</Label>
              <Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="למשל: מנהל אזור" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.repEmail}</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="h-9 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1">
              <X className="w-3.5 h-3.5" /> ביטול
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={saving || !name.trim()} className="gap-1">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} שמירה
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div {...dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="font-semibold text-foreground">{rep.name}</div>
            {rep.role_title && <div className="text-xs text-muted-foreground mt-0.5">{rep.role_title}</div>}
            {rep.email && <div className="text-xs text-muted-foreground" dir="ltr">{rep.email}</div>}
          </div>
          {saved && <Check className="w-4 h-4 text-primary shrink-0" />}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Switch
                checked={rep.is_active !== false}
                onCheckedChange={(v) => onUpdate(rep.id, { is_active: v })}
              />
              <span className="text-xs text-muted-foreground">{t.activeLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => onToggleAdmin(!isAdmin)}
              disabled={isSelf || adminPending || !rep.email}
              title={isSelf ? t.adminSelfHint : !rep.email ? t.adminNoEmailHint : undefined}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isAdmin
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.adminLabel}
            </button>
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary p-1.5 rounded-md">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onRemove(rep.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-md">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
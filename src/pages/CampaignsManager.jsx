import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';

const EMPTY = { name: '', source: 'פייסבוק', form_id: '', notes: '', is_active: true };

export default function CampaignsManager() {
  return (
    <AdminGuard>
      <CampaignsContent />
    </AdminGuard>
  );
}

function CampaignsContent() {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => db.Campaign.list('name', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.Campaign.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); setAdding(false); setForm(EMPTY); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.Campaign.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.Campaign.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const startEdit = (c) => { setEditing(c.id); setForm({ name: c.name, source: c.source || 'פייסבוק', form_id: c.form_id || '', notes: c.notes || '', is_active: c.is_active ?? true }); };

  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">קמפיינים</h1>
          <p className="text-muted-foreground text-sm mt-1">ניהול קמפיינים מ-Meta (פייסבוק / אינסטגרם)</p>
        </div>
        <Button onClick={() => { setAdding(true); setForm(EMPTY); }} className="gap-2">
          <Plus className="w-4 h-4" /> קמפיין חדש
        </Button>
      </div>

      {/* Add Form */}
      {adding && (
        <CampaignForm
          form={form}
          setForm={setForm}
          onSave={() => createMutation.mutate(form)}
          onCancel={() => setAdding(false)}
          isSaving={createMutation.isPending}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">אין קמפיינים עדיין</div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="border border-border rounded-xl p-4 bg-card">
              {editing === c.id ? (
                <CampaignForm
                  form={form}
                  setForm={setForm}
                  onSave={() => updateMutation.mutate({ id: c.id, data: form })}
                  onCancel={() => setEditing(null)}
                  isSaving={updateMutation.isPending}
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'פעיל' : 'לא פעיל'}</Badge>
                      <Badge variant="outline">{c.source || 'פייסבוק'}</Badge>
                    </div>
                    {c.form_id && (
                      <p className="text-xs text-muted-foreground">Form ID: <span dir="ltr">{c.form_id}</span></p>
                    )}
                    {c.notes && <p className="text-sm text-muted-foreground">{c.notes}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignForm({ form, setForm, onSave, onCancel, isSaving }) {
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-semibold">שם הקמפיין</label>
          <Input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="לדוגמה: קמפיין קיץ 2025" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">מקור</label>
          <Select value={form.source} onValueChange={v => upd('source', v)}>
            <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="פייסבוק">פייסבוק</SelectItem>
              <SelectItem value="אינסטגרם">אינסטגרם</SelectItem>
              <SelectItem value="אחר">אחר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold">Meta Form ID <span className="font-normal text-muted-foreground">(לשיוך אוטומטי של לידים)</span></label>
        <Input value={form.form_id} onChange={e => upd('form_id', e.target.value)} placeholder="1234567890" dir="ltr" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold">הערות</label>
        <Input value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="הערות אופציונליות" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}><X className="w-4 h-4 ml-1" />ביטול</Button>
        <Button onClick={onSave} disabled={isSaving || !form.name}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Check className="w-4 h-4 ml-1" />}שמור
        </Button>
      </div>
    </div>
  );
}
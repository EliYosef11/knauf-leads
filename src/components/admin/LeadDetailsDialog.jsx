import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Check, X, Loader2, Star, CheckCircle2, Clock, Trash2, Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { db } from '@/api/db';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import InterestSelector from '../lead-form/InterestSelector';

const ROLES = ["אדריכל/ית", "קבלן/ית", "מפקח/ית", "יזם/ית", "מעצב/ת פנים", "מהנדס/ת", "מנהל/ת פרויקט", "יועץ/ת", "פרטי", "אחר"];

export default function LeadDetailsDialog({ lead, onClose, t = {} }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const queryClient = useQueryClient();

  const { data: representatives = [] } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => db.Representative.filter({ is_active: true }, 'sort_order', 100),
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        full_name: lead.full_name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        company: lead.company || '',
        city: lead.city || '',
        role: lead.role || '',
        project_handling: lead.project_handling || '',
        interests: lead.interests || [],
        assigned_to: lead.assigned_to || '',
        rep_notes: lead.rep_notes || ''
      });
      setIsEditing(false);
      setConfirmDelete(false);
      setIsDeleting(false);
    }
  }, [lead]);

  if (!lead) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await db.Lead.update(lead.id, formData);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const update = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleSendReminder = async () => {
    setIsSendingReminder(true);
    try {
      await base44.functions.invoke('sendReminderEmail', { lead_id: lead.id });
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 3000);
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await db.Lead.delete(lead.id);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    onClose();
  };

  return (
    <Dialog open={!!lead} onOpenChange={(o) => {
      if (!o) {
        setIsEditing(false);
        onClose();
      }
    }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div>
            <DialogTitle className="text-2xl font-display">{lead.full_name}</DialogTitle>
            {lead.created_date && (
              <p className="text-sm text-muted-foreground mt-1">
                {t.createdLabel || 'נוצר'}: {(() => { const s = String(lead.created_date); const d = new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z'); return d.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); })()}
              </p>
            )}
          </div>
          {!isEditing && (
            <div className="flex gap-2 ml-6">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-destructive self-center">{t.confirmDeleteMsg || 'בטוח/ה?'}</span>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (t.deleteBtn || 'מחק')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>{t.cancelBtn || 'ביטול'}</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4" />
                    {t.editBtn || 'ערוך'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="w-4 h-4" />
                    {t.deleteBtn || 'מחק'}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogHeader>

        {!isEditing ? (
          // View Mode
          <div className="space-y-4 mt-2 text-sm">
            <Row label={t.labelPhone || 'טלפון'} value={lead.phone} dir="ltr" />
            <Row label={t.labelEmail || 'דוא״ל'} value={lead.email} dir="ltr" />
            <Row label={t.labelCompany || 'חברה'} value={lead.company} />
            <Row label={t.labelCity || 'עיר'} value={lead.city} />
            <Row label={t.labelRole || 'תפקיד'} value={lead.role} />
            <Row label={t.labelProjectHandling || 'טיפול בפרויקט'} value={lead.project_handling} />
            <Row label={t.labelEvent || 'כנס'} value={lead.event_name} />
            <Row label={t.labelAssigned || 'לטיפול'} value={lead.assigned_to} />
            {lead.interests?.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-2">{t.labelInterests || 'תחומי עניין'}</div>
                <div className="flex flex-wrap gap-1.5">
                  {lead.interests.map(i => <Badge key={i} variant="secondary">{i}</Badge>)}
                </div>
              </div>
            )}
            {lead.rep_notes && (
              <div>
                <div className="text-muted-foreground mb-2">{t.labelRepNotes || 'הערות נציג'}</div>
                <div className="p-4 rounded-xl bg-secondary/60 whitespace-pre-wrap leading-relaxed">
                  {lead.rep_notes}
                </div>
              </div>
            )}
            {lead.lead_summary && (
              <div>
                <div className="text-muted-foreground mb-2">{t.labelMeetingSummary || 'סיכום שיחה / פגישה'}</div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 whitespace-pre-wrap leading-relaxed">
                  {lead.lead_summary}
                </div>
              </div>
            )}
            {Array.isArray(lead.reminder_log) && lead.reminder_log.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-2">היסטוריית תזכורות</div>
                <div className="space-y-1.5">
                  {lead.reminder_log.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-900">
                      <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>תזכורת נשלחה לנציג</span>
                      <span className="mr-auto text-xs text-amber-500 font-normal" dir="ltr">
                        {(() => { const d = new Date(entry.sent_at); return d.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); })()}
                      </span>
                      {entry.triggered_by === 'manual' && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">ידני</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(lead.transfer_log) && lead.transfer_log.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-2">היסטוריית העברות</div>
                <div className="space-y-2">
                  {lead.transfer_log.map((entry, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-900">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{entry.from_rep}</span>
                        <span className="text-blue-400">→</span>
                        <span>{entry.to_rep}</span>
                        {entry.date && (
                          <span className="mr-auto text-xs text-blue-400 font-normal">
                            {(() => { const d = new Date(entry.date); return d.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); })()}
                          </span>
                        )}
                      </div>
                      {entry.reason && <div className="mt-1 text-blue-700 text-xs">{entry.reason}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-1 items-center">
              {lead.is_quality && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{t.labelQualityLead || 'ליד איכותי'}
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                lead.status === 'טופל'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-secondary border-border text-muted-foreground'
              }`}>
                {lead.status === 'טופל' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {lead.status === 'טופל' ? (t.statusDone || 'טופל') : (t.statusPending || 'טרם טופל')}
              </span>
              {lead.status !== 'טופל' && lead.assigned_email && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-2 text-xs ${reminderSent ? 'text-green-600 border-green-300' : 'text-amber-600 border-amber-300 hover:bg-amber-50'}`}
                  onClick={handleSendReminder}
                  disabled={isSendingReminder}
                >
                  {isSendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  {reminderSent ? 'תזכורת נשלחה!' : 'שלח תזכורת לנציג'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t.fullName || 'שם מלא'}</label>
                <Input value={formData.full_name} onChange={e => update('full_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t.labelPhone || 'טלפון'}</label>
                <Input value={formData.phone} onChange={e => update('phone', e.target.value)} dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t.labelEmail || 'דוא״ל'}</label>
                <Input value={formData.email} onChange={e => update('email', e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t.labelRole || 'תפקיד'}</label>
                <Select value={formData.role} onValueChange={v => update('role', v)}>
                  <SelectTrigger className="text-right" dir="rtl">
                    <SelectValue placeholder={t.selectRolePlaceholder || 'בחר תפקיד'} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t.labelCompany || 'חברה'}</label>
                <Input value={formData.company} onChange={e => update('company', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t.labelCity || 'עיר'}</label>
                <Input value={formData.city} onChange={e => update('city', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{t.labelProjectHandling || 'טיפול בפרויקט'}</label>
              <Input value={formData.project_handling} onChange={e => update('project_handling', e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{t.labelAssigned || 'לטיפול'}</label>
              <Select value={formData.assigned_to} onValueChange={v => update('assigned_to', v)}>
                <SelectTrigger className="text-right" dir="rtl">
                  <SelectValue placeholder={t.labelRepNamePlaceholder || 'בחר נציג'} />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {representatives.map(r => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-semibold">{t.labelInterests || 'תחומי עניין'}</label>
              <InterestSelector value={formData.interests} onChange={v => update('interests', v)} />
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-semibold">{t.labelRepNotes || 'הערות נציג'}</label>
              <Textarea 
                value={formData.rep_notes} 
                onChange={e => update('rep_notes', e.target.value)} 
                className="min-h-[100px] resize-none"
              />
            </div>
            
            <DialogFooter className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                <X className="w-4 h-4 ml-2" />
                {t.cancelBtn || 'ביטול'}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Check className="w-4 h-4 ml-2" />}
                {t.saveChangesBtn || 'שמור שינויים'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, dir }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground" dir={dir}>{value}</span>
    </div>
  );
}
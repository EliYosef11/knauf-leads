import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowRight, Star, CheckCircle2, Clock, Loader2, Phone, Mail, Cloud, Download, ArrowLeftRight, LayoutList, Rows3 } from 'lucide-react';
import { format } from 'date-fns';
import KnaufLogo from '../components/lead-form/KnaufLogo';
import { useLang } from '../hooks/useLang';
import { translations } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import TransferLeadDialog from '../components/lead-form/TransferLeadDialog';
import LeadThread from '../components/lead-form/LeadThread';
import { useAuth } from '@/lib/AuthContext';
import LoginCard from '@/components/auth/LoginCard';
import UserBadge from '@/components/auth/UserBadge';

function MyLeadsContent() {
  const { email } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterQuality, setFilterQuality] = useState('all');
  const [filterCrm, setFilterCrm] = useState('all');
  // 'detailed' = כרטיסים (ברירת מחדל), 'list' = רשימה קומפקטית כמו במסך הניהול
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('knauf_my_leads_view') === 'list' ? 'list' : 'detailed'; }
    catch { return 'detailed'; }
  });
  const [openLead, setOpenLead] = useState(null);
  const setViewPersisted = (v) => {
    setView(v);
    try { localStorage.setItem('knauf_my_leads_view', v); } catch { /* מצב פרטי */ }
  };

  const { lang, toggle } = useLang();
  const t = translations[lang];

  const { data: reps = [] } = useQuery({
    queryKey: ['reps-active'],
    queryFn: () => db.Representative.filter({ is_active: true }, 'sort_order', 100),
  });

  // הנציג המחובר מזוהה לפי המייל שלו — אין בחירה מרשימה, גם לא למנהל
  const myRep = useMemo(
    () => reps.find(r => (r.email || '').toLowerCase() === (email || '').toLowerCase()),
    [reps, email],
  );
  const myName = myRep?.name || '';

  const { data: allLeads = [], isLoading } = useQuery({
    queryKey: ['my-leads', email],
    queryFn: () => db.Lead.list('-created_date', 500),
    enabled: Boolean(email),
  });

  // ה-RLS כבר מגביל נציג ללידים שלו; למנהל הוא מחזיר הכל, ולכן מסננים כאן
  // כדי שגם מנהל יראה במסך הזה רק את הלידים המשויכים אליו
  const leads = useMemo(
    () => allLeads.filter(l => (l.assigned_email || '').toLowerCase() === (email || '').toLowerCase()),
    [allLeads, email],
  );

  const availableEvents = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.event_name).filter(Boolean))).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (selectedEvent !== 'all' && l.event_name !== selectedEvent) return false;
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (filterQuality === 'quality' && !l.is_quality) return false;
      if (filterQuality === 'not_quality' && l.is_quality) return false;
      if (filterCrm === 'crm' && !l.crm_entered) return false;
      if (filterCrm === 'not_crm' && l.crm_entered) return false;
      return true;
    });
  }, [leads, selectedEvent, filterStatus, filterQuality, filterCrm]);

  const exportToCsv = () => {
    const headers = ['שם מלא', 'טלפון', 'מייל', 'חברה', 'עיר', 'תפקיד', 'כנס', 'סטטוס', 'איכותי', 'CRM', 'תאריך יצירה', 'סיכום'];
    const rows = filtered.map(l => [
      l.full_name, l.phone, l.email, l.company, l.city, l.role,
      l.event_name, l.status,
      l.is_quality ? 'כן' : 'לא',
      l.crm_entered ? 'כן' : 'לא',
      l.created_date ? format(new Date(l.created_date), 'dd/MM/yyyy') : '',
      l.lead_summary || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${myName || email}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" dir={t.dir} style={{ background: 'linear-gradient(180deg, #003D7A 0%, #003D7A 35%, #005ba8 55%, #007bc4 75%, #009FE3 100%)' }}>
      <header className="bg-transparent">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <KnaufLogo />
            <div className="hidden sm:block w-px h-8 bg-white/20" />
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight text-white">{t.myLeadsTitle}</h1>
              <p className="text-xs text-white/70">{t.myLeadsSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserBadge />
            <LangToggle lang={lang} onToggle={toggle} />
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 text-white border-white/30 hover:bg-white/10">
                <ArrowRight className="w-4 h-4" />
                <span>{t.toForm}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* סרגל סינון בשורה אחת. שם הנציג הוסר — הוא רואה רק את שלו ממילא.
            הערכים עצמם ("כל הכנסים", "כל הסטטוסים") משמשים כתווית, אז אין צורך בכותרות. */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 flex flex-col gap-2">
          {/* שורת הפקדים: סינון, ייצוא, ואחריהם מתג התצוגה */}
          <div className="flex flex-wrap items-center gap-2">
            {availableEvents.length > 0 && (
              <>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="h-9 w-auto min-w-[7.5rem] text-sm" dir="rtl">
                    <SelectValue placeholder={t.allEventsPlaceholder} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">{t.allEventsPlaceholder}</SelectItem>
                    {availableEvents.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 w-auto min-w-[6.5rem] text-sm" dir="rtl">
                    <SelectValue placeholder={t.allStatuses} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="טרם טופל">{t.statusPending}</SelectItem>
                    <SelectItem value="טופל">{t.statusDone}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterQuality} onValueChange={setFilterQuality}>
                  <SelectTrigger className="h-9 w-auto min-w-[6.5rem] text-sm" dir="rtl">
                    <SelectValue placeholder={t.qualityLead} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">{t.qualityLead}</SelectItem>
                    <SelectItem value="quality">{t.qualityOnly}</SelectItem>
                    <SelectItem value="not_quality">{t.notQuality}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCrm} onValueChange={setFilterCrm}>
                  <SelectTrigger className="h-9 w-auto min-w-[6.5rem] text-sm" dir="rtl">
                    <SelectValue placeholder={t.crmEntered} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">{t.crmEntered}</SelectItem>
                    <SelectItem value="crm">{t.crmYes}</SelectItem>
                    <SelectItem value="not_crm">{t.crmNo}</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            {leads.length > 0 && (
              <Button onClick={exportToCsv} variant="outline" size="sm" className="gap-1.5 h-9">
                <Download className="w-3.5 h-3.5" />
                {t.exportCsv}
              </Button>
            )}
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setViewPersisted('detailed')}
                title={t.viewDetailed}
                className={`flex items-center gap-1.5 px-2.5 h-9 text-xs font-medium transition-colors ${
                  view === 'detailed' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-secondary'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.viewDetailed}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewPersisted('list')}
                title={t.viewList}
                className={`flex items-center gap-1.5 px-2.5 h-9 text-xs font-medium transition-colors border-s border-border ${
                  view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-secondary'
                }`}
              >
                <Rows3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.viewList}</span>
              </button>
            </div>
          </div>

          {/* הסיכום מתחת לסינון */}
          {leads.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{t.totalLabel}: <strong className="text-foreground">{filtered.length}</strong></span>
              <span>{t.qualityLabel}: <strong className="text-amber-500">{filtered.filter(l => l.is_quality).length}</strong></span>
              <span>{t.doneLabel}: <strong className="text-green-600">{filtered.filter(l => l.status === 'טופל').length}</strong></span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl text-muted-foreground">
            {t.noLeads}
          </div>
        ) : view === 'list' ? (
          <MyLeadsList leads={filtered} t={t} onSelect={setOpenLead} />
        ) : (
          <div className="space-y-3">
            {filtered.map(lead => (
              <LeadCard key={lead.id} lead={lead} t={t} selectedRep={myName} />
            ))}
          </div>
        )}
      </main>

      {/* ברשימה — לחיצה על שורה פותחת את אותו כרטיס מלא (עריכה + שיחה) */}
      <Dialog open={!!openLead} onOpenChange={(o) => !o && setOpenLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
          {openLead && <LeadCard lead={openLead} t={t} selectedRep={myName} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** רשימה קומפקטית של הלידים של הנציג — אותו רעיון כמו טבלת המנהל, בלי עמודת "לטיפול". */
function MyLeadsList({ leads, t, onSelect }) {
  return (
    <div className="overflow-hidden border border-border rounded-2xl bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-auto" dir="rtl">
          <thead className="bg-secondary/40">
            <tr className="text-right text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-3 font-semibold w-1 whitespace-nowrap">{t.colStatus || 'טיפול'}</th>
              <th className="px-3 py-3 font-semibold">{t.colFullName || 'שם מלא'}</th>
              <th className="px-1 py-3 font-semibold">{t.colCompany || 'חברה'}</th>
              <th className="px-3 py-3 font-semibold hidden sm:table-cell">{t.filterByEvent || 'כנס'}</th>
              <th className="px-3 py-3 font-semibold w-1 whitespace-nowrap">{t.colQuality || 'איכותי'}</th>
              <th className="px-3 py-3 font-semibold w-1 whitespace-nowrap">{t.colCrm || 'CRM'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map(lead => (
              <tr
                key={lead.id}
                onClick={() => onSelect(lead)}
                className="hover:bg-secondary/40 transition-colors cursor-pointer"
              >
                <td className="px-3 py-3.5 w-1 whitespace-nowrap">
                  {lead.status === 'טופל' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />{t.statusDone || 'טופל'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" />{t.statusPending || 'טרם טופל'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3.5 font-semibold text-foreground">{lead.full_name || '—'}</td>
                <td className="px-1 py-3.5 text-foreground/80">{lead.company || '—'}</td>
                <td className="px-3 py-3.5 text-muted-foreground text-xs hidden sm:table-cell">{lead.event_name || '—'}</td>
                <td className="px-3 py-3.5 w-1 whitespace-nowrap">
                  {lead.is_quality && (
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  )}
                </td>
                <td className="px-3 py-3.5 w-1 whitespace-nowrap">
                  {lead.crm_entered && (
                    <span className="inline-flex items-center gap-1 text-xs text-white bg-blue-600 border border-blue-600 px-2 py-0.5 rounded-full">
                      <Cloud className="w-3 h-3" />CRM
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadCard({ lead, t, selectedRep }) {
  const queryClient = useQueryClient();
  const [showTransfer, setShowTransfer] = useState(false);

  const update = async (data) => {
    await db.Lead.update(lead.id, data);
    queryClient.invalidateQueries({ queryKey: ['my-leads'] });
  };

  const toggleQuality = () => update({ is_quality: !lead.is_quality });
  const toggleStatus = () => update({ status: lead.status === 'טופל' ? 'טרם טופל' : 'טופל' });

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
       <div className="flex-1">
         <div className="flex items-center gap-2 flex-wrap">
           <span className="font-semibold text-foreground text-base">{lead.full_name}</span>
           {lead.role && <Badge variant="secondary" className="text-xs">{lead.role}</Badge>}
           {lead.company && <span className="text-sm text-muted-foreground">• {lead.company}</span>}
         </div>
         <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm text-muted-foreground">
           {lead.phone && (
             <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline" dir="ltr">
               <Phone className="w-3.5 h-3.5" />{lead.phone}
             </a>
           )}
           {lead.email && (
             <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-primary hover:underline" dir="ltr">
               <Mail className="w-3.5 h-3.5" />{lead.email}
             </a>
           )}
           {lead.city && <span className="text-sm text-muted-foreground">{lead.city}</span>}
           {lead.event_name && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{lead.event_name}</span>}
           <span className="text-xs">{lead.created_date ? format(new Date(lead.created_date), 'dd/MM/yyyy') : ''}</span>
           {lead.created_by && (
             <span className="text-[11px] text-muted-foreground/80">{t.enteredBy} {lead.created_by}</span>
           )}
         </div>


       </div>

       <div className="w-full flex flex-col gap-2">
         <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">עדכן את הליד:</div>
         <div className="flex items-center gap-2 flex-wrap">
           <button
             onClick={toggleQuality}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
               lead.is_quality
                 ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                 : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-amber-300'
             }`}
           >
             <Star className={`w-3.5 h-3.5 ${lead.is_quality ? 'fill-amber-400 text-amber-400' : ''}`} />
             {t.qualityLead}
           </button>
           <button
             onClick={() => update({ crm_entered: !lead.crm_entered })}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
               lead.crm_entered
                 ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                 : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-400'
             }`}
           >
             <Cloud className="w-3.5 h-3.5" />
             {lead.crm_entered ? 'CRM' : t.crmEntered}
           </button>
           <button
             onClick={toggleStatus}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
               lead.status === 'טופל'
                 ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                 : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-green-300'
             }`}
           >
             {lead.status === 'טופל' ? (
               <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" />{t.statusDone}</>
             ) : (
               <><Clock className="w-3.5 h-3.5" />{t.statusPending}</>
             )}
           </button>
           <button
             onClick={() => setShowTransfer(true)}
             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary hover:text-primary cursor-pointer"
           >
             <ArrowLeftRight className="w-3.5 h-3.5" />
             {t.transferLead || 'העבר ליד'}
           </button>
         </div>
       </div>
      </div>
      {showTransfer && (
        <TransferLeadDialog
          lead={lead}
          currentRep={selectedRep}
          open={showTransfer}
          onClose={() => setShowTransfer(false)}
          onTransferred={() => queryClient.invalidateQueries({ queryKey: ['my-leads'] })}
        />
      )}

      {(lead.interests || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lead.interests.map(i => (
            <Badge key={i} variant="secondary" className="text-sm font-medium px-3 py-1">{i}</Badge>
          ))}
        </div>
      )}

      {lead.project_handling && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">טיפול בפרויקט</p>
          <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap">{lead.project_handling}</p>
        </div>
      )}

      {lead.rep_notes && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">הערות מהכנס</p>
          <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{lead.rep_notes}</p>
        </div>
      )}

      {Array.isArray(lead.transfer_log) && lead.transfer_log.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">הערות העברת ליד</p>
          {lead.transfer_log.map((entry, idx) => (
            <div key={idx} className="text-sm text-blue-900">
              <div className="flex items-center gap-1.5 font-medium">
                <span dir="ltr">{entry.from_rep}</span>
                        <span className="text-blue-400">←</span>
                        <span dir="ltr">{entry.to_rep}</span>
                {entry.date && (
                  <span className="mr-auto text-xs text-blue-500 font-normal">
                    {(() => { const d = new Date(entry.date); return d.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); })()}
                  </span>
                )}
              </div>
              {entry.reason && <p className="text-blue-700 text-xs mt-0.5">{entry.reason}</p>}
            </div>
          ))}
        </div>
      )}

      <LeadThread leadId={lead.id} onChanged={() => queryClient.invalidateQueries({ queryKey: ['my-leads'] })} />
    </div>
  );
}

export default function MyLeads() {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginCard />;
  }

  return <MyLeadsContent />;
}

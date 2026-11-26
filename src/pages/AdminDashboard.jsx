import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Settings, ArrowRight, Users, Calendar, TrendingUp, Loader2, UserCog, Star, CalendarDays, FileText, FileSpreadsheet, History } from 'lucide-react';
import { format, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { jsPDF } from 'jspdf';

import AdminGuard from '../components/admin/AdminGuard';
import LeadsTable from '../components/admin/LeadsTable';
import LeadDetailsDialog from '../components/admin/LeadDetailsDialog';
import KnaufLogo from '../components/lead-form/KnaufLogo';
import { useLang } from '../hooks/useLang';
import { translations } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import UserBadge from '@/components/auth/UserBadge';
import { AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <DashboardContent />
    </AdminGuard>
  );
}

function DashboardContent() {
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedRep, setSelectedRep] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (name) => setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));

  const isFiltering = search || fromDate || toDate || selectedEvent !== 'all' || selectedRep !== 'all' || selectedStatus !== 'all';
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { lang, toggle } = useLang();
  const t = translations[lang];

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => db.Lead.list('-created_date', 500),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => db.Event.list(),
  });



  const availableEvents = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.event_name).filter(Boolean))).sort();
  }, [leads]);

  const availableReps = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.assigned_to).filter(Boolean))).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (selectedEvent !== 'all' && l.event_name !== selectedEvent) return false;
      if (selectedRep !== 'all' && l.assigned_to !== selectedRep) return false;
      if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
      if (fromDate) {
        const from = startOfDay(new Date(fromDate));
        if (l.created_date && isBefore(new Date(l.created_date), from)) return false;
      }
      if (toDate) {
        const to = endOfDay(new Date(toDate));
        if (l.created_date && isAfter(new Date(l.created_date), to)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          l.full_name, l.phone, l.email, l.company, l.city, l.role, l.event_name, l.assigned_to,
          ...(l.interests || [])
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, fromDate, toDate, selectedEvent, selectedRep, selectedStatus]);

  useEffect(() => {
    if (isFiltering) {
      const groupKeys = Array.from(new Set(filtered.map(l => l.event_name || '—')));
      setOpenGroups(prev => {
        const next = { ...prev };
        groupKeys.forEach(key => { next[key] = true; });
        return next;
      });
    }
  }, [filtered, isFiltering]);

  // כנס שמכסה את היום — בלעדיו כל ליד נקלט כ"ליד כללי" בלי שיוך
  const todayISO = format(new Date(), 'yyyy-MM-dd');
  const eventToday = useMemo(
    () => events.find((ev) => {
      const end = (ev.event_end_date && ev.event_end_date.trim()) ? ev.event_end_date : ev.event_date;
      return ev.event_date <= todayISO && end >= todayISO;
    }),
    [events, todayISO],
  );

  // לידים שההתראה עליהם נכשלה — הנציג לא יודע שיש לו ליד
  const failedNotifications = useMemo(
    () => leads.filter((lead) => lead.notify_error),
    [leads],
  );

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const todayCount = filtered.filter(l => l.created_date && isAfter(new Date(l.created_date), today)).length;
    const events = new Set(filtered.map(l => l.event_name).filter(Boolean));
    const quality = filtered.filter(l => l.is_quality).length;
    return { total: filtered.length, today: todayCount, events: events.size, quality };
  }, [filtered]);

  const exportCSV = () => {
    const headers = ['שם מלא', 'טלפון', 'דוא"ל', 'חברה', 'עיר', 'תפקיד', 'תחומי עניין', 'כנס', 'לטיפול', 'סטטוס', 'ליד איכותי', 'הוזן ב-CRM', 'תאריך'];
    const rows = filtered.map(l => [
      l.full_name || '', l.phone || '', l.email || '', l.company || '', l.city || '',
      l.role || '', (l.interests || []).join('; '),
      l.event_name || '', l.assigned_to || '',
      l.status || '', l.is_quality ? 'כן' : 'לא', l.crm_entered ? 'כן' : 'לא',
      l.created_date ? format(new Date(l.created_date), 'dd/MM/yyyy HH:mm') : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knauf-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Use built-in font with Unicode support via UTF-8 encoding
    doc.setFont('helvetica');

    const cols = ['שם מלא', 'טלפון', 'חברה', 'עיר', 'תפקיד', 'כנס', 'לטיפול', 'סטטוס', 'תאריך'];
    const colWidths = [38, 28, 35, 22, 25, 38, 28, 18, 24];
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 10;
    let y = 20;

    // Title
    doc.setFontSize(14);
    doc.setTextColor(0, 61, 122);
    const title = `KNAUF Leads - ${format(new Date(), 'dd/MM/yyyy')} (${filtered.length})`;
    doc.text(title, pageW / 2, y, { align: 'center' });
    y += 10;

    // Header row
    doc.setFontSize(8);
    doc.setFillColor(0, 61, 122);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, pageW - margin * 2, 8, 'F');

    // Draw headers RTL (right to left)
    let xPos = pageW - margin;
    cols.forEach((col, i) => {
      xPos -= colWidths[i];
      doc.text(col, xPos + colWidths[i] - 1, y + 5.5, { align: 'right' });
    });
    y += 8;

    // Data rows
    doc.setTextColor(30, 37, 64);
    filtered.forEach((l, rowIdx) => {
      if (y > 185) {
        doc.addPage();
        y = 15;
      }
      const rowData = [
        l.full_name || '', l.phone || '', l.company || '', l.city || '',
        l.role || '', l.event_name || '', l.assigned_to || '',
        l.status || '',
        l.created_date ? format(new Date(l.created_date), 'dd/MM/yy') : ''
      ];

      if (rowIdx % 2 === 0) {
        doc.setFillColor(240, 246, 255);
        doc.rect(margin, y, pageW - margin * 2, 7, 'F');
      }

      doc.setFontSize(7.5);
      xPos = pageW - margin;
      rowData.forEach((val, i) => {
        xPos -= colWidths[i];
        const text = String(val).substring(0, 22);
        doc.text(text, xPos + colWidths[i] - 1, y + 4.5, { align: 'right' });
      });
      y += 7;
    });

    doc.save(`knauf-leads-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setExportMenuOpen(false);
  };

  return (
    <div className="min-h-screen" dir={t.dir} style={{ background: 'linear-gradient(180deg, #003D7A 0%, #003D7A 35%, #005ba8 55%, #007bc4 75%, #009FE3 100%)' }}>
      <header className="bg-transparent">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <KnaufLogo />
            <div className="hidden sm:block w-px h-8 bg-white/20" />
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight text-white">{t.dashboardTitle}</h1>
              <p className="text-xs text-white/70">{t.dashboardSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <UserBadge />
            <LangToggle lang={lang} onToggle={toggle} />
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-white hover:bg-white/10">
                <ArrowRight className="w-4 h-4" />
                <span>{t.toForm}</span>
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline" size="sm" className="gap-1.5 text-white border-white/30 hover:bg-white/10">
                <Calendar className="w-4 h-4" />
                <span>{t.events}</span>
              </Button>
            </Link>
            <Link to="/representatives">
              <Button variant="outline" size="sm" className="gap-1.5 text-white border-white/30 hover:bg-white/10">
                <UserCog className="w-4 h-4" />
                <span>{t.representatives}</span>
              </Button>
            </Link>
            <Link to="/login-log">
              <Button variant="outline" size="sm" className="gap-1.5 text-white border-white/30 hover:bg-white/10">
                <History className="w-4 h-4" />
                <span>{t.loginLog}</span>
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline" size="sm" className="gap-1.5 text-white border-white/30 hover:bg-white/10">
                <Settings className="w-4 h-4" />
                <span>{t.settings}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {!eventToday && (
          <Link to="/events" className="block">
            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-900">
                {t.noEventToday}
              </p>
            </div>
          </Link>
        )}

        {failedNotifications.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-2xl px-5 py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-900">
              {t.failedNotifications(failedNotifications.length)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label={t.totalLeads} value={stats.total} />
          <StatCard icon={TrendingUp} label={t.todayLeads} value={stats.today} accent />
          <StatCard icon={Calendar} label={t.activeEvents} value={stats.events} />
          <StatCard icon={Star} label={t.qualityLeads} value={stats.quality} gold />
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="h-11" dir="rtl">
                  <SelectValue placeholder={t.allEvents} />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">{t.allEvents}</SelectItem>
                  {availableEvents.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Select value={selectedRep} onValueChange={setSelectedRep}>
                <SelectTrigger className="h-11" dir="rtl">
                  <SelectValue placeholder={t.allReps} />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">{t.allReps}</SelectItem>
                  {availableReps.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-11" dir="rtl">
                  <SelectValue placeholder={t.allStatuses} />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">{t.allStatuses}</SelectItem>
                  <SelectItem value="טרם טופל">{t.statusPending}</SelectItem>
                  <SelectItem value="טופל">{t.statusDone}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-4 relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-11 pr-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`h-11 w-11 shrink-0 px-0 ${(fromDate || toDate) ? 'ring-1 ring-primary border-primary text-primary' : ''}`}
                onClick={() => setDateFilterOpen(v => !v)}
                title={t.dateFilter}
              >
                <CalendarDays className="w-4 h-4" />
              </Button>
              <div className="relative" ref={exportRef}>
                <Button
                  onClick={() => setExportMenuOpen(v => !v)}
                  disabled={filtered.length === 0}
                  className="h-11 w-11 shrink-0 px-0"
                  title="הורד"
                >
                  <Download className="w-4 h-4" />
                </Button>
                {exportMenuOpen && (
                  <div className="absolute left-0 top-13 mt-1 w-44 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden" dir="rtl">
                    <button
                      onClick={exportCSV}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-secondary transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      ייצוא CSV
                    </button>
                    <button
                      onClick={exportPDF}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-secondary transition-colors border-t border-border"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      ייצוא PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {dateFilterOpen && (
            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-11" />
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-11" />
            </div>
          )}

          {(search || fromDate || toDate || selectedEvent !== 'all' || selectedRep !== 'all' || selectedStatus !== 'all') && (
            <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span>{t.showingOf(filtered.length, leads.length)}</span>
              <button
                onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setSelectedEvent('all'); setSelectedRep('all'); setSelectedStatus('all'); setDateFilterOpen(false); }}
                className="text-primary hover:underline font-medium"
              >
                {t.clearFilter}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : (
          <LeadsTable leads={filtered} onSelect={setSelectedLead} t={t} events={events} openGroups={openGroups} onToggleGroup={toggleGroup} dir={t.dir} />
        )}
      </main>

      <LeadDetailsDialog lead={selectedLead} onClose={() => setSelectedLead(null)} t={t} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, gold }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 ${accent ? 'ring-1 ring-primary/20' : ''} ${gold ? 'ring-1 ring-amber-200' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl sm:text-3xl font-display font-bold">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-primary text-primary-foreground' : gold ? 'bg-amber-50 text-amber-500' : 'bg-secondary text-foreground/70'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
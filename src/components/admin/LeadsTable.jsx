import React, { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { FileText, Star, CheckCircle2, Clock, Cloud, ChevronDown, ChevronLeft } from 'lucide-react';

export default function LeadsTable({ leads, onSelect, t, events = [], openGroups = {}, onToggleGroup, dir = 'rtl' }) {
  const [openDays, setOpenDays] = useState({});
  const toggleDay = (key) => setOpenDays(prev => ({ ...prev, [key]: !prev[key] }));
  const isDayOpen = (key) => openDays[key] !== false; // default open

  const isOpen = (name) => openGroups[name] === true;

  if (leads.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-border rounded-2xl">
        <p className="text-muted-foreground">{t?.noLeadsFilter || 'לא נמצאו לידים התואמים לסינון'}</p>
      </div>
    );
  }

  // Build a map of event name -> event object (to know if multi-day)
  const eventMap = events.reduce((acc, e) => { acc[e.name] = e; return acc; }, {});

  // Group leads by event_name first
  const byEvent = leads.reduce((acc, lead) => {
    const key = lead.event_name || '—';
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {});

  // Sort event groups: most recent first (by earliest lead created_date in group)
  const eventNames = Object.keys(byEvent).sort((a, b) => {
    const latestA = Math.max(...byEvent[a].map(l => l.created_date ? new Date(l.created_date).getTime() : 0));
    const latestB = Math.max(...byEvent[b].map(l => l.created_date ? new Date(l.created_date).getTime() : 0));
    return latestB - latestA;
  });

  return (
    <div className="space-y-6">
      {eventNames.map(eventName => {
        const groupLeads = byEvent[eventName];
        const ev = eventMap[eventName];
        const isMultiDay = ev && ev.event_end_date && ev.event_end_date !== ev.event_date;

        // For multi-day: sub-group by day
        const byDay = groupLeads.reduce((acc, lead) => {
          const day = lead.created_date ? format(new Date(lead.created_date), 'yyyy-MM-dd') : 'unknown';
          if (!acc[day]) acc[day] = [];
          acc[day].push(lead);
          return acc;
        }, {});
        const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

        return (
          <div key={eventName} className="overflow-hidden border border-border rounded-2xl bg-card">
            {/* Main event header */}
            <button
              onClick={() => onToggleGroup(eventName)}
              className="w-full bg-secondary/80 px-5 py-3 flex items-center justify-between border-b border-border hover:bg-secondary transition-colors"
            >
              <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                {isOpen(eventName)
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
                {eventName}
                {ev?.event_date && (
                  <>
                    <span className="mx-1 text-border">|</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      {new Date(ev.event_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                      {isMultiDay && ` — ${new Date(ev.event_end_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })}`}
                    </span>
                  </>
                )}
              </span>
              <span className="text-xs text-muted-foreground bg-background border border-border rounded-full px-2.5 py-0.5">
                {groupLeads.length} {t?.leadsCount || 'לידים'}
              </span>
            </button>

            {isOpen(eventName) && (
              <div>
                {isMultiDay ? (
                  // Multi-day: show sub-groups per day
                  days.map(day => {
                    const dayKey = `${eventName}||${day}`;
                    const dayLeads = byDay[day];
                    const displayDate = day !== 'unknown'
                      ? new Date(day).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })
                      : '';
                    return (
                      <div key={day}>
                        <button
                          onClick={() => toggleDay(dayKey)}
                          className="w-full px-7 py-2.5 flex items-center justify-between bg-secondary/40 hover:bg-secondary/60 transition-colors border-b border-border/60"
                        >
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                           {isDayOpen(dayKey)
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronLeft className="w-3.5 h-3.5" />}
                            {t?.dayLabel || 'יום'} {displayDate}
                          </span>
                          <span className="text-xs text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5">
                            {dayLeads.length} {t?.leadsCount || 'לידים'}
                          </span>
                        </button>
                        {isDayOpen(dayKey) && (
                          <div className="overflow-x-auto">
                             <LeadsRows leads={dayLeads} onSelect={onSelect} t={t} dir={dir} />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Single-day: show directly
                  <div className="overflow-x-auto">
                    <LeadsRows leads={groupLeads} onSelect={onSelect} t={t} dir={dir} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LeadsRows({ leads, onSelect, t, dir = 'rtl' }) {
  return (
    <table className="w-full text-sm table-auto" dir={dir}>
      <thead className="bg-secondary/40">
        <tr className={`${dir === 'ltr' ? 'text-left' : 'text-right'} text-xs uppercase tracking-wider text-muted-foreground`}>
          <th className="px-3 py-3 font-semibold w-1 whitespace-nowrap">{t?.colStatus || 'טיפול'}</th>
          <th className="px-3 py-3 font-semibold max-w-[140px]">{t?.colFullName || 'שם מלא'}</th>
          <th className="px-1 py-3 font-semibold max-w-[120px]">{t?.colCompany || 'חברה'}</th>
          <th className="px-5 py-3 font-semibold">{t?.colRole || 'תפקיד'}</th>
          <th className="px-5 py-3 font-semibold">{t?.colAssigned || 'לטיפול'}</th>
          <th className="px-3 py-3 font-semibold w-1 whitespace-nowrap">{t?.colQuality || 'איכותי'}</th>
          <th className="px-3 py-3 font-semibold w-1 whitespace-nowrap">{t?.colCrm || 'CRM'}</th>
          <th className="px-3 py-3 font-semibold w-1 whitespace-nowrap"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {leads.map(lead => (
          <tr key={lead.id} className="hover:bg-secondary/40 transition-colors">
            <td className="px-3 py-4 w-1 whitespace-nowrap">
              {lead.status === 'טופל' ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />{t?.statusDone || 'טופל'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />{t?.statusPending || 'טרם טופל'}
                </span>
              )}
            </td>
            <td className="px-3 py-4 font-semibold text-foreground max-w-[140px] truncate">{lead.full_name || '—'}</td>
            <td className="px-1 py-4 text-foreground/80 max-w-[120px] truncate">{lead.company || '—'}</td>
            <td className="px-5 py-4">
              {lead.role ? <Badge variant="secondary">{lead.role}</Badge> : '—'}
            </td>
            <td className="px-5 py-4 text-foreground/80">{lead.assigned_to || '—'}</td>
            <td className="px-3 py-4 w-1 whitespace-nowrap">
              {lead.is_quality && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{t?.colQuality || 'איכותי'}
                </span>
              )}
            </td>
            <td className="px-3 py-4 w-1 whitespace-nowrap">
              {lead.crm_entered && (
                <span className="inline-flex items-center gap-1 text-xs text-white bg-blue-600 border border-blue-600 px-2 py-0.5 rounded-full">
                  <Cloud className="w-3 h-3" />CRM
                </span>
              )}
            </td>
            <td className="px-3 py-4 w-1 whitespace-nowrap">
              <button
                onClick={() => onSelect(lead)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <FileText className="w-3.5 h-3.5" />
                {lead.lead_summary ? (t?.summaryLabel || 'סיכום') : (t?.notesLabel || 'הערות')}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
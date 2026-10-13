import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

export default function ExportEventDialog({ open, onClose, leads }) {
  const [selectedEvent, setSelectedEvent] = useState('');

  // Build unique event list from leads
  const events = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      if (l.event_name && !map[l.event_name]) map[l.event_name] = l.event_name;
    });
    return Object.values(map).sort();
  }, [leads]);

  const eventLeads = useMemo(() => {
    if (!selectedEvent) return [];
    return leads.filter(l => l.event_name === selectedEvent);
  }, [leads, selectedEvent]);

  const buildCSV = (rows) => {
    const headers = ['שם מלא', 'טלפון', 'דוא"ל', 'חברה', 'עיר', 'תפקיד', 'תחומי עניין', 'לטיפול', 'הערות', 'תאריך'];
    const data = rows.map(l => [
      l.full_name || '',
      l.phone || '',
      l.email || '',
      l.company || '',
      l.city || '',
      l.role || '',
      (l.interests || []).join('; '),
      l.assigned_to || '',
      (l.rep_notes || '').replace(/\n/g, ' '),
      l.created_date ? format(new Date(l.created_date), 'dd/MM/yyyy HH:mm') : ''
    ]);
    return [headers, ...data]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  };

  const handleDownload = () => {
    if (!eventLeads.length) return;
    const csv = buildCSV(eventLeads);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knauf-${selectedEvent}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייצוא לידים לפי כנס</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Event selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">בחר כנס</label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="בחר כנס לייצוא" />
              </SelectTrigger>
              <SelectContent>
                {events.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEvent && (
              <p className="text-xs text-muted-foreground">
                נמצאו <strong>{eventLeads.length}</strong> לידים לכנס זה
              </p>
            )}
          </div>

          {selectedEvent && eventLeads.length > 0 && (
            <div className="rounded-xl border border-border p-4 space-y-2">
              <div className="font-semibold text-sm">הורדה כ-CSV</div>
              <p className="text-xs text-muted-foreground">קובץ אקסל / CSV עם כל הלידים של הכנס</p>
              <Button onClick={handleDownload} variant="outline" className="w-full gap-2 h-10">
                <Download className="w-4 h-4" />
                הורד CSV
              </Button>
            </div>
          )}

          {selectedEvent && eventLeads.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">אין לידים לכנס זה</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
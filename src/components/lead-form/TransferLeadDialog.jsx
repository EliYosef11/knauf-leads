import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeftRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/api/functions';
import { db } from '@/api/db';

export default function TransferLeadDialog({ lead, currentRep, open, onClose, onTransferred }) {
  const [targetRep, setTargetRep] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: reps = [] } = useQuery({
    queryKey: ['reps-active'],
    queryFn: () => db.Representative.filter({ is_active: true }, 'sort_order', 100),
  });

  const availableReps = reps.filter(r => r.name !== currentRep);
  const selectedRepObj = reps.find(r => r.name === targetRep);

  const handleTransfer = async () => {
    if (!targetRep) return;
    setLoading(true);
    await invokeFunction('transferLead', {
      lead_id: lead.id,
      from_rep: currentRep,
      to_rep: targetRep,
      to_email: selectedRepObj?.email || '',
      reason
    });
    setLoading(false);
    onTransferred();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            העברת ליד
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">מעביר את הליד של <strong>{lead.full_name}</strong></p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">העבר לנציג</label>
            <Select value={targetRep} onValueChange={setTargetRep}>
              <SelectTrigger dir="rtl">
                <SelectValue placeholder="בחר נציג..." />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {availableReps.map(r => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">סיבת ההעברה</label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="תאר את הסיבה להעברת הליד..."
              className="min-h-[90px] resize-none text-sm"
            />
          </div>
        </div>
        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>ביטול</Button>
          <Button onClick={handleTransfer} disabled={!targetRep || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ArrowLeftRight className="w-4 h-4 ml-2" />}
            העבר ליד
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
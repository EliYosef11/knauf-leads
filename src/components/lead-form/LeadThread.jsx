import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/hooks/useLang';

/**
 * השיחה על ליד: רצף הודעות עם שם הכותב ותאריך/שעה, ושדה להוספת הודעה.
 * מחליף את שדה "סיכום שיחה" היחיד — עכשיו כל עדכון הוא הודעה נפרדת ורואים מי כתב מה ומתי.
 *
 * הכותב נקבע בשרת (טריגר set_note_author מה-JWT), לא נשלח מכאן.
 * מי שרואה את הליד (הנציג המשויך / אדמין) רואה וכותב — אותו RLS.
 */

const T = {
  he: {
    title: 'סיכום שיחה / פגישה',
    hint: 'יש לציין שמות פרויקטים',
    placeholder: 'כתוב עדכון על הליד...',
    send: 'הוסף',
    empty: 'עדיין אין עדכונים על הליד הזה',
    you: 'אתה',
  },
  en: {
    title: 'Meeting / Call Summary',
    hint: 'Please include project names',
    placeholder: 'Write an update about this lead...',
    send: 'Add',
    empty: 'No updates on this lead yet',
    you: 'you',
  },
};

export function formatStamp(value) {
  const s = String(value);
  const d = new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z');
  return d.toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function LeadThread({ leadId, onChanged, compact = false }) {
  const { email } = useAuth();
  const { lang } = useLang();
  const t = T[lang] || T.he;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['lead-notes', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_notes')
        .select('id, author_name, author_email, body, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: Boolean(leadId),
  });

  const add = useMutation({
    mutationFn: async (body) => {
      const { error } = await supabase.from('lead_notes').insert({ lead_id: leadId, body });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['lead-notes', leadId] });
      onChanged?.();
    },
  });

  const isMine = (note) => (note.author_email || '').toLowerCase() === (email || '').toLowerCase();

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.title}</label>
        {!compact && <p className="text-xs text-muted-foreground mt-0.5">{t.hint}</p>}
      </div>

      {isLoading ? (
        <div className="py-3 text-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" /></div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
          <MessageSquare className="w-3.5 h-3.5" />{t.empty}
        </p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pe-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed border ${
                isMine(note) ? 'bg-primary/5 border-primary/15' : 'bg-secondary/60 border-border'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-0.5">
                <span className="text-xs font-semibold text-foreground truncate">
                  {note.author_name || note.author_email || '—'}
                  {isMine(note) && <span className="text-muted-foreground font-normal"> ({t.you})</span>}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0" dir="ltr">{formatStamp(note.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-foreground">{note.body}</p>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); if (draft.trim()) add.mutate(draft.trim()); }}
        className="flex items-end gap-2"
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.placeholder}
          className="min-h-[64px] text-sm resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && draft.trim()) add.mutate(draft.trim());
          }}
        />
        <Button type="submit" size="sm" className="gap-1.5 h-9" disabled={add.isPending || !draft.trim()}>
          {add.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {t.send}
        </Button>
      </form>
      {add.isError && <p className="text-xs text-destructive">{add.error.message}</p>}
    </div>
  );
}

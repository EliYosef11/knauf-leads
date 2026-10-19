import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { db } from '@/api/db';
import { useLang } from '@/hooks/useLang';

/**
 * בחירת הנציגים שיש להם גישה לאזור הניהול.
 * הרשימה היא טבלת `admins`; הבדיקה בפועל נעשית בשרת (`is_admin()`), כך שכיבוי
 * המתג מסיר גישה מיידית גם למי שמחובר כרגע.
 *
 * מנהל לא יכול להסיר את עצמו — אחרת אפשר להישאר בלי אף מנהל.
 */

const T = {
  he: {
    title: 'גישה לאזור הניהול',
    desc: 'נציגים עם גישה רואים את כל הלידים ויכולים לנהל כנסים, נציגים והגדרות.',
    you: 'אתה',
    empty: 'אין נציגים פעילים',
  },
  en: {
    title: 'Admin access',
    desc: 'Representatives with access see every lead and can manage events, reps and settings.',
    you: 'you',
    empty: 'No active representatives',
  },
};

export default function AdminAccessCard() {
  const { email } = useAuth();
  const { lang } = useLang();
  const t = T[lang] || T.he;
  const queryClient = useQueryClient();

  const { data: reps = [], isLoading: loadingReps } = useQuery({
    queryKey: ['reps-active'],
    queryFn: () => db.Representative.filter({ is_active: true }, 'sort_order', 200),
  });

  const { data: admins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admins').select('email');
      if (error) throw new Error(error.message);
      return data.map((row) => row.email.toLowerCase());
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ repEmail, shouldBeAdmin }) => {
      const { error } = shouldBeAdmin
        ? await supabase.from('admins').insert({ email: repEmail })
        : await supabase.from('admins').delete().eq('email', repEmail);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admins'] }),
  });

  const isAdminEmail = (repEmail) => admins.includes((repEmail || '').toLowerCase());
  const isSelf = (repEmail) => (repEmail || '').toLowerCase() === (email || '').toLowerCase();

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">{t.title}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t.desc}</p>

      {loadingReps || loadingAdmins ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : reps.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {reps.map((rep) => (
            <div key={rep.id} className="flex items-center justify-between px-4 py-3 bg-secondary/60 rounded-xl">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {rep.name}
                  {isSelf(rep.email) && <span className="text-xs text-muted-foreground"> ({t.you})</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate" dir="ltr">{rep.email}</p>
              </div>
              <Switch
                checked={isAdminEmail(rep.email)}
                disabled={isSelf(rep.email) || toggle.isPending || !rep.email}
                onCheckedChange={(checked) =>
                  toggle.mutate({ repEmail: rep.email.toLowerCase(), shouldBeAdmin: checked })
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

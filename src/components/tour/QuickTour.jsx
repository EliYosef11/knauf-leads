import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * סיור מודרך קצר: מדגיש אלמנט אחד בכל שלב (לפי `data-tour="..."`) ומציג בועה עם הסבר.
 *
 * בלי ספרייה חיצונית — ההדגשה היא ריבוע עם box-shadow ענק שמחשיך את כל השאר,
 * והבועה ממוקמת מתחת/מעל האלמנט לפי המקום הפנוי. שלב בלי `target` מוצג במרכז.
 * שלבים שהאלמנט שלהם לא קיים במסך (למשל אין לידים) מדולגים.
 */

const PAD = 8;

function useTargetRect(selector, step) {
  const [rect, setRect] = useState(null);
  useLayoutEffect(() => {
    if (!selector) { setRect(null); return undefined; }
    const el = document.querySelector(`[data-tour="${selector}"]`);
    if (!el) { setRect(null); return undefined; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    // אחרי הגלילה החלקה המיקום משתנה — מודדים כמה פעמים
    measure();
    const timers = [150, 350, 600].map((ms) => setTimeout(measure, ms));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selector, step]);
  return rect;
}

export default function QuickTour({ open, steps, onClose, t }) {
  // רק שלבים שהיעד שלהם קיים
  const visibleSteps = useMemo(
    () => (open ? steps.filter((s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`)) : []),
    [open, steps],
  );
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => { if (open) setIndex(0); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(dontShowAgain); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, dontShowAgain]);

  const current = visibleSteps[index];
  const rect = useTargetRect(current?.target, index);

  if (!open || !current) return null;

  const isLast = index === visibleSteps.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(360, vw - 24);

  // מיקום הבועה: מתחת ליעד אם יש מקום, אחרת מעליו; בלי יעד — במרכז
  let cardStyle;
  if (rect) {
    const below = rect.top + rect.height + PAD + 12;
    const fitsBelow = below + 220 < vh;
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - cardW / 2, vw - cardW - 12));
    cardStyle = fitsBelow
      ? { top: below, left, width: cardW }
      : { bottom: vh - (rect.top - PAD - 12), left, width: cardW };
  } else {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: cardW };
  }

  return (
    <div className="fixed inset-0 z-[100]" dir="rtl" aria-modal="true" role="dialog">
      {rect ? (
        <div
          className="absolute rounded-xl ring-2 ring-white/90 transition-all duration-200"
          style={{
            top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0, 20, 50, 0.72)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(0,20,50,0.72)]" />
      )}

      <div className="absolute bg-card text-foreground rounded-2xl shadow-2xl border border-border p-5" style={cardStyle}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display font-bold text-base leading-snug">{current.title}</h3>
          <button type="button" onClick={() => onClose(dontShowAgain)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label={t.close}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{current.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground tabular-nums">{index + 1} / {visibleSteps.length}</span>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setIndex(index - 1)}>
                <ChevronRight className="w-3.5 h-3.5" />{t.back}
              </Button>
            )}
            {isLast ? (
              <Button size="sm" className="h-8" onClick={() => onClose(dontShowAgain)}>{t.finish}</Button>
            ) : (
              <Button size="sm" className="h-8 gap-1" onClick={() => setIndex(index + 1)}>
                {t.next}<ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {isLast && (
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            {t.dontShowAgain}
          </label>
        )}
      </div>
    </div>
  );
}

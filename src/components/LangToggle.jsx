import React from 'react';

export default function LangToggle({ lang, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white transition-all px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm shadow-md active:scale-95"
    >
      {lang === 'he' ? '🇺🇸 EN' : '🇮🇱 עב'}
    </button>
  );
}
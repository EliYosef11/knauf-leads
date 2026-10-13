import React from 'react';
import { Check } from 'lucide-react';

export default function InterestSelector({ value = [], onChange, options, otherLabel }) {
  const toggle = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  const mainOptions = (options || []).filter(opt => opt !== otherLabel);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {mainOptions.map(opt => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`group relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
              selected
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-background text-foreground border-border hover:border-primary/40 hover:bg-secondary'
            }`}
          >
            {selected && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
            <span>{opt}</span>
          </button>
        );
      })}
      {/* "Other" - full width last row */}
      <button
        type="button"
        onClick={() => toggle(otherLabel)}
        className={`group relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 col-span-2 sm:col-span-3 ${
          value.includes(otherLabel)
            ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
            : 'bg-background text-foreground border-border hover:border-primary/40 hover:bg-secondary'
        }`}
      >
        {value.includes(otherLabel) && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
        <span>{otherLabel}</span>
      </button>
    </div>
  );
}
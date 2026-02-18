import React, { useState, useEffect, useRef } from 'react';

export default function TeamAutocomplete({
  value,
  onChange,
  teams,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  teams: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? teams.filter((t) => t.toLowerCase().includes(value.toLowerCase()))
    : teams;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map((team) => (
            <button
              key={team}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-primary-50 transition-colors ${
                team.toLowerCase() === value.toLowerCase() ? 'bg-primary-50 font-semibold text-primary-700' : 'text-gray-700'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(team); setOpen(false); }}
            >
              {team}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

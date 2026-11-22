import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatLabel = (month, year, language) => `${(language === 'en' ? MONTHS_EN : MONTHS_ES)[month - 1]} ${year}`;

function MiniSelect({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg bg-[#162238] border border-[#284567] px-2 py-2 text-sm"
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 max-h-44 overflow-auto rounded-lg border border-[#284567] bg-[#162238] shadow-xl">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 ${o.value === value ? 'text-amber-300 bg-amber-400/10' : 'text-slate-200'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const MonthYearPicker = ({ month, year, onChange, label, className = '' }) => {
  const { t, language } = usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 3 + i);
  const names = language === 'en' ? MONTHS_EN : MONTHS_ES;
  const monthOptions = names.map((name, i) => ({ value: i + 1, label: name }));
  const yearOptions = years.map((y) => ({ value: y, label: String(y) }));

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && (
        <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-xl bg-[#162238] border border-[#284567] px-3 py-2.5 text-sm text-slate-100 hover:border-amber-400/50 transition-colors"
      >
        <span className="truncate">{formatLabel(month, year, language)}</span>
        <Calendar size={16} className="text-amber-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 top-full w-full min-w-[220px] rounded-xl border border-[#284567] bg-[#0f2543] p-3 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            <MiniSelect label={t('common.month')} value={month} options={monthOptions} onChange={(v) => onChange(v, year)} />
            <MiniSelect label={t('common.year')} value={year} options={yearOptions} onChange={(v) => onChange(month, v)} />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full py-2 rounded-lg bg-amber-400/90 text-slate-900 text-sm font-semibold"
          >
            {t('common.confirm')}
          </button>
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker;

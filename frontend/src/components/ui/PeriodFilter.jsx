import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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

function MonthYearSelects({ month, year, onChange }) {
  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 3 + i);
  const monthOptions = MONTHS.map((name, i) => ({ value: i + 1, label: name }));
  const yearOptions = years.map((y) => ({ value: y, label: String(y) }));

  return (
    <div className="grid grid-cols-2 gap-2">
      <MiniSelect label="Mes" value={month} options={monthOptions} onChange={(v) => onChange(v, year)} />
      <MiniSelect label="Año" value={year} options={yearOptions} onChange={(v) => onChange(month, v)} />
    </div>
  );
}

export default function PeriodFilter({
  mode = 'single', // single | range
  month,
  year,
  onChange,
  startMonth,
  startYear,
  endMonth,
  endYear,
  onChangeStart,
  onChangeEnd,
  defaultMonth,
  defaultYear,
  defaultStartMonth,
  defaultStartYear,
  defaultEndMonth,
  defaultEndYear,
  label = 'Período',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const isFiltered =
    mode === 'range'
      ? startMonth !== defaultStartMonth ||
        startYear !== defaultStartYear ||
        endMonth !== defaultEndMonth ||
        endYear !== defaultEndYear
      : month !== defaultMonth || year !== defaultYear;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-600/60 bg-slate-800/40 text-slate-200 hover:text-amber-300 hover:border-amber-400/40 transition-colors"
        aria-label={label}
        title={label}
      >
        <Filter size={16} />
        {isFiltered && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[#0f2543]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[#284567] bg-[#0f2543] p-4 shadow-xl space-y-3">
          {mode === 'range' ? (
            <>
              <div>
                <p className="text-xs text-slate-400 mb-2 font-medium">Desde</p>
                <MonthYearSelects month={startMonth} year={startYear} onChange={onChangeStart} />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2 font-medium">Hasta</p>
                <MonthYearSelects month={endMonth} year={endYear} onChange={onChangeEnd} />
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>
              <MonthYearSelects month={month} year={year} onChange={onChange} />
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-2 rounded-lg bg-amber-400/90 text-slate-900 text-sm font-semibold"
          >
            Listo
          </button>
        </div>
      )}
    </div>
  );
}

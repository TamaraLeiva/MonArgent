import { useEffect, useRef, useState } from 'react';
import { Filter } from 'lucide-react';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function MonthYearSelects({ month, year, onChange }) {
  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 3 + i);
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Mes</p>
        <select
          value={month}
          onChange={(e) => onChange(Number(e.target.value), year)}
          className="w-full rounded-lg bg-[#162238] border border-[#284567] px-2 py-2 text-sm"
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Año</p>
        <select
          value={year}
          onChange={(e) => onChange(month, Number(e.target.value))}
          className="w-full rounded-lg bg-[#162238] border border-[#284567] px-2 py-2 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
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

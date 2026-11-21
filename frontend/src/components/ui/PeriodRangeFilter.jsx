import { useEffect, useRef, useState } from 'react';
import { Filter } from 'lucide-react';
import MonthYearPicker from './MonthYearPicker';

export default function PeriodRangeFilter({
  startMonth,
  startYear,
  endMonth,
  endYear,
  onChangeStart,
  onChangeEnd,
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
    startMonth !== defaultStartMonth ||
    startYear !== defaultStartYear ||
    endMonth !== defaultEndMonth ||
    endYear !== defaultEndYear;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600/60 bg-slate-800/40 text-slate-200 hover:text-amber-300 hover:border-amber-400/40 transition-colors text-sm"
        aria-label={label}
        title={label}
      >
        <Filter size={16} />
        <span>{label}</span>
        {isFiltered && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[#0f2543]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[#284567] bg-[#0f2543] p-4 shadow-xl space-y-3">
          <MonthYearPicker
            label="Desde"
            month={startMonth}
            year={startYear}
            onChange={onChangeStart}
          />
          <MonthYearPicker
            label="Hasta"
            month={endMonth}
            year={endYear}
            onChange={onChangeEnd}
          />
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Botón “?” + panel chico de ayuda (popover glass / tono agua).
 */
export default function HelpTip({
  title,
  body = [],
  align = 'right',
  className = '',
  panelClassName = '',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 12;
    const panelWidth = Math.min(296, window.innerWidth - margin * 2);
    let left = align === 'left' ? rect.left : rect.right - panelWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
    const top = Math.min(rect.bottom + 8, window.innerHeight - 120);
    setPanelStyle({ position: 'fixed', top, left, width: panelWidth, zIndex: 90 });
  }, [align]);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  const paragraphs = Array.isArray(body) ? body : [body];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-transparent bg-transparent text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 dark:border-cyan-400/25 dark:bg-cyan-950/30 dark:backdrop-blur-sm dark:text-slate-300 dark:hover:text-amber-300 dark:hover:border-amber-400/35 transition-colors"
        aria-label={ariaLabel || `Ayuda: ${title}`}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <HelpCircle size={15} strokeWidth={2.2} />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={title}
          style={panelStyle}
          className={`rounded-2xl border border-slate-200 bg-white/95 dark:border-cyan-200/20 dark:bg-cyan-950/45 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,20,40,0.2)] dark:shadow-[0_12px_40px_rgba(0,20,40,0.35)] p-3.5 ring-1 ring-black/5 dark:ring-white/10 ${panelClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-300/95 mb-2 pr-1">{title}</p>
          <div className="space-y-2 max-h-[min(50vh,20rem)] overflow-y-auto">
            {paragraphs.filter(Boolean).map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-xs text-slate-700 dark:text-slate-200/90 leading-relaxed whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

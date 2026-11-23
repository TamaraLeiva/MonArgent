import { Moon, Sun } from 'lucide-react';

/**
 * Language, currency, FX and theme controls. Reused by the desktop header
 * (next to the mood face) and the mobile header row.
 */
export default function HeaderControls({
  language,
  currency,
  theme,
  fx,
  onToggleLanguage,
  onToggleCurrency,
  onToggleTheme,
  onRefreshFx,
  t,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-center gap-1.5 sm:gap-2 ${className}`}>
      <button
        type="button"
        onClick={onToggleLanguage}
        className="min-w-[40px] h-9 px-2 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-amber-300 hover:bg-white/5 transition-colors"
        title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
        aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      >
        {language === 'es' ? 'ES' : 'EN'}
      </button>
      <button
        type="button"
        onClick={onToggleCurrency}
        className="min-w-[44px] h-9 px-2 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-amber-300 hover:bg-white/5 transition-colors"
        title={currency === 'ARS' ? t('currency.dollar') : t('currency.peso')}
        aria-label={currency === 'ARS' ? t('currency.dollar') : t('currency.peso')}
      >
        {currency === 'ARS' ? '$' : 'US$'}
      </button>
      {currency === 'USD' && (
        <button
          type="button"
          onClick={onRefreshFx}
          className="inline-flex items-center h-9 px-2 rounded-lg text-[10px] text-slate-400 hover:text-amber-300 hover:bg-white/5 transition-colors whitespace-nowrap max-w-[140px] sm:max-w-none"
          title={fx?.error ? 'Sin cotización, mostrando ARS. Click para reintentar.' : `Cotización oficial DolarAPI${fx?.updatedAt ? ` · ${new Date(fx.updatedAt).toLocaleString('es-AR')}` : ''}. Click para actualizar.`}
        >
          {fx?.loading ? 'Cotizando...' : fx?.rate ? `US$1=$${Math.round(fx.rate).toLocaleString('es-AR')}` : 'Sin cotización'}
        </button>
      )}
      <button
        type="button"
        onClick={onToggleTheme}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-amber-300 hover:bg-white/5 transition-colors"
        title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}

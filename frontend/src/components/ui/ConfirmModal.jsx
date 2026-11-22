import AppModal from './AppModal';
import { usePreferences } from '../../context/PreferencesContext';

/**
 * Confirmación centrada con el mismo diseño que AppModal (reemplazo de window.confirm).
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loading = false,
  danger = false,
}) {
  const { t } = usePreferences();
  const resolvedTitle = title ?? t('confirm.title');
  const resolvedConfirm = confirmLabel ?? t('confirm.accept');
  const resolvedCancel = cancelLabel ?? t('confirm.cancel');
  return (
    <AppModal open={open} onClose={loading ? undefined : onClose} title={resolvedTitle} zIndex="z-[60]">
      <p className="text-sm text-slate-300 text-center leading-relaxed mb-5 whitespace-pre-line">
        {message}
      </p>
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {resolvedCancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 disabled:opacity-50 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            danger
              ? 'bg-red-500 hover:bg-red-400 text-white'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
          }`}
        >
          {loading ? '...' : resolvedConfirm}
        </button>
      </div>
    </AppModal>
  );
}

import { useCallback, useState } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';
import { usePreferences } from '../context/PreferencesContext';

/**
 * Reemplazo async de window.confirm con el modal de la app.
 * const { askConfirm, confirmDialog } = useConfirmDialog();
 * if (!(await askConfirm({ title, message, danger: true }))) return;
 */
export default function useConfirmDialog() {
  const { t } = usePreferences();
  const [state, setState] = useState(null);

  const askConfirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({
        title: options.title || t('confirm.title'),
        message: options.message || t('confirm.message'),
        confirmLabel: options.confirmLabel || t('confirm.accept'),
        cancelLabel: options.cancelLabel || t('confirm.cancel'),
        danger: Boolean(options.danger),
        resolve,
      });
    });
  }, [t]);

  const handleClose = () => {
    state?.resolve(false);
    setState(null);
  };

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const confirmDialog = (
    <ConfirmModal
      open={Boolean(state)}
      title={state?.title}
      message={state?.message}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      danger={state?.danger}
      onClose={handleClose}
      onConfirm={handleConfirm}
    />
  );

  return { askConfirm, confirmDialog };
}

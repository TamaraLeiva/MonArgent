import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { formatPeso } from '../../utils/format';
import { payViaMpAlias } from '../../utils/mercadoPagoPay';
import { usePreferences } from '../../context/PreferencesContext';
const GuestPayPage = () => {
  const { t } = usePreferences();
  const [params] = useSearchParams();
  const alias = params.get('alias') || '';
  const creditor = params.get('to') || 'el cobrador';
  const amount = params.get('amount');
  const group = params.get('group') || 'gastos grupales';
  const status = params.get('status');
  const formattedAmount = amount != null && !Number.isNaN(Number(amount)) ? formatPeso(amount, { decimals: 2 }) : null;

  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!alias || opened) return;
    setOpened(true);
    payViaMpAlias(alias, creditor, amount)
      .then(() => setCopied(true))
      .catch(() => {});
  }, [alias, creditor, amount, opened]);

  const copyAlias = async () => {    if (!alias) return;
    try {
      await payViaMpAlias(alias, creditor, amount);
      setCopied(true);
    } catch {
      setCopied(true);
    }
  };

  const openMercadoPago = () => {
    payViaMpAlias(alias, creditor, amount).catch(() => {});
  };
  const statusMessage = {
    ok: t('pay.registeredOk'),
    pending: t('pay.pending'),
    error: t('pay.error'),
  }[status];

  return (
    <AuthLayout
      title={t('pay.title')}
      subtitle={group ? t('pay.group', { group }) : undefined}
      footer={
        <p className="text-sm text-on-surface-variant">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-primary hover:underline">
            {t('auth.login')}
          </Link>
        </p>
      }
    >
      {statusMessage && (
        <p className="text-sm text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2">
          {statusMessage}
        </p>
      )}

      {formattedAmount ? (
        <div className="text-center space-y-1">
          <p className="text-on-surface-variant text-sm">{t('pay.amountToTransfer')}</p>
          <p className="text-3xl font-semibold text-primary">{formattedAmount}</p>
          <p className="text-on-surface-variant text-sm">{t('pay.to', { name: creditor })}</p>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant text-center">
          {t('pay.checkAmount')}
        </p>
      )}

      {alias && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
          <p className="text-xs text-on-surface-variant uppercase tracking-wide">{t('pay.mpAlias')}</p>
          <p className="text-lg font-amount break-all">{alias}</p>
          <button
            type="button"
            onClick={copyAlias}
            className="w-full rounded-lg border border-primary/40 text-primary py-2 text-sm hover:bg-primary/10 transition-colors"
          >
            {copied ? t('pay.aliasCopied') : t('pay.copyAlias')}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={openMercadoPago}
          className="w-full rounded-lg bg-primary text-slate-900 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {t('pay.openMp')}
        </button>
        <p className="text-xs text-on-surface-variant text-center">
          {t('pay.mpHint')}
        </p>
      </div>

      <div className="pt-2 border-t border-white/10 space-y-2">
        <p className="text-sm text-on-surface-variant text-center">
          {t('pay.registerPrompt')}
        </p>
        <Link
          to="/register"
          className="block w-full text-center rounded-lg border border-white/20 py-2 text-sm hover:bg-white/5 transition-colors"
        >
          {t('pay.createFree')}
        </Link>
      </div>
    </AuthLayout>
  );
};

export default GuestPayPage;

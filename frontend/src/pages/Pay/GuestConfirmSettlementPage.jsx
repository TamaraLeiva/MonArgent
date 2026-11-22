import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import api from '../../services/api';
import { usePreferences } from '../../context/PreferencesContext';

export default function GuestConfirmSettlementPage() {
  const { t } = usePreferences();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('pay.invalidLink'));
      return;
    }

    api.post('/public/groups/guest-settlements/confirm', { token })
      .then((response) => {
        setStatus('ok');
        setMessage(response.data?.message || t('pay.confirmedOk'));
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.response?.data?.message || t('pay.confirmError'));
      });
  }, [token]);

  return (
    <AuthLayout
      title={t('pay.confirmTitle')}
      subtitle={t('pay.confirmSubtitle')}
      footer={(
        <p className="text-sm text-on-surface-variant">
          {t('pay.wantSeeGroups')}{' '}
          <Link to="/register" className="text-primary hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      )}
    >
      {status === 'loading' && (
        <p className="text-sm text-slate-300 text-center">{t('pay.confirming')}</p>
      )}
      {status === 'ok' && (
        <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-center">
          {message}
        </p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-center">
          {message}
        </p>
      )}
    </AuthLayout>
  );
}

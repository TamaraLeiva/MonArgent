import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import { usePreferences } from '../../context/PreferencesContext';

const ForgotPasswordPage = () => {
  const { requestPasswordReset } = useAuth();
  const { t } = usePreferences();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || t('auth.forgotError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      backTo="/login"
      backLabel={t('auth.backToLogin')}
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
            {t('auth.email')}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            className="w-full rounded-lg input-recessed border-none focus:ring-1 focus:ring-primary text-on-surface px-4 py-3 transition-all placeholder:text-surface-container-highest"
          />
        </div>

        {errorMsg && (
          <div className="bg-error-container/20 border border-error/30 text-error text-label-sm px-4 py-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary-container text-on-primary-container font-title-md py-4 rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>{t('auth.sending')}</span>
            </>
          ) : (
            t('auth.sendCode')
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;

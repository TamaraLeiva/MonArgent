import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { getErrorMessage } from '../../utils/apiErrors';
import { usePreferences } from '../../context/PreferencesContext';


const inputCls =
  'w-full rounded-xl bg-[#0a1525] border border-[#243a5c] text-white px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/30 transition';

const LoginPage = () => {
  const { login } = useAuth();
  const { t } = usePreferences();


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (error) {
      setErrorMsg(getErrorMessage(error, t('auth.loginError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      showBrand
      footer={(
        <p>
          {t('auth.loginFooterTerms')}{' '}
          <Link to="/terminos" className="text-slate-300 hover:text-white underline underline-offset-2 transition-colors">
            {t('auth.termsLink')}
          </Link>
          {' '}{t('auth.and')}{' '}
          <Link to="/privacidad" className="text-slate-300 hover:text-white underline underline-offset-2 transition-colors">
            {t('auth.privacyLink')}
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">{t('auth.email')}</label>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            className={inputCls}
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm text-slate-400">{t('auth.password')}</label>

            <Link
              to="/forgot-password"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              {t('auth.forgot')}

            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputCls} pr-12`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-amber-400 transition-colors"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/25 px-4 py-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-amber-400 to-[#E8B923] text-slate-900 font-semibold py-3.5 rounded-xl shadow-[0_4px_24px_rgba(232,185,35,0.25)] hover:brightness-110 active:scale-[0.99] transition-all flex justify-center items-center gap-2 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>{t('auth.loggingIn')}</span>
            </>
          ) : (
            t('auth.login')
          )}
        </button>
      </form>

      <div className="flex items-center gap-3 mt-6">
        <div className="h-px flex-1 bg-[#243a5c]" />
        <span className="w-7 h-7 rounded-full border border-[#243a5c] flex items-center justify-center text-[10px] text-slate-500">
          {t('auth.or')}
        </span>
        <div className="h-px flex-1 bg-[#243a5c]" />
      </div>

      <p className="text-center auth-footer-link mt-5">
        {t('auth.noAccountPrompt')}{' '}
        <Link to="/register" className="text-amber-400 font-semibold hover:text-amber-300 transition-colors">
          {t('auth.registerHere')}
        </Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import { usePreferences } from '../../context/PreferencesContext';

const ResetPasswordPage = () => {
  const { resetPassword, resendPasswordResetCode } = useAuth();
  const { t } = usePreferences();

  const [code, setCode] = useState(new Array(6).fill(''));
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const inputRefs = useRef([]);
  const userEmail = localStorage.getItem('user_email_for_password_reset') || '';

  useEffect(() => {
    if (!userEmail) return;
    inputRefs.current[0]?.focus();
  }, [userEmail]);

  if (!userEmail) {
    return (
      <AuthLayout title={t('auth.recoverAccess')} subtitle={t('auth.noRecovery')}>
        <div className="text-center space-y-4">
          <Link to="/forgot-password" className="text-primary hover:underline font-medium">
            {t('auth.requestCode')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const handleChange = (element, index) => {
    const value = element.value;
    if (Number.isNaN(Number(value))) return;

    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setErrorMsg(t('auth.codeDigits'));
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ code: fullCode, password, passwordConfirm });
    } catch (error) {
      setErrorMsg(error.response?.data?.message || t('auth.invalidCode'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsResending(true);
    try {
      await resendPasswordResetCode();
      setSuccessMsg(t('auth.newCodeSent'));
    } catch (error) {
      setErrorMsg(error.response?.data?.message || t('auth.resendError'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      backTo="/forgot-password"
      backLabel={t('auth.changeEmail')}
      title={t('auth.resetTitle')}
      subtitle={(
        <>
          {t('auth.resetSubtitle')}{' '}
          <span className="text-on-surface font-medium break-all">{userEmail}</span>
        </>
      )}
      icon={(
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 text-primary">
          <KeyRound size={28} />
        </div>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              value={digit}
              ref={(el) => { inputRefs.current[index] = el; }}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-12 h-14 input-recessed border-none text-center text-xl font-bold text-on-surface rounded-lg outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          ))}
        </div>

        <div>
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
            {t('auth.newPassword')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.minChars')}
              className="w-full rounded-lg input-recessed border-none focus:ring-1 focus:ring-primary text-on-surface px-4 py-3 pr-12 transition-all placeholder:text-surface-container-highest"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
            {t('auth.repeatPassword')}
          </label>
          <div className="relative">
            <input
              type={showPasswordConfirm ? 'text' : 'password'}
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder={t('auth.repeatPassword')}
              className="w-full rounded-lg input-recessed border-none focus:ring-1 focus:ring-primary text-on-surface px-4 py-3 pr-12 transition-all placeholder:text-surface-container-highest"
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-primary transition-colors"
            >
              {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-error-container/20 border border-error/30 text-error text-label-sm px-4 py-3 rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-label-sm px-4 py-3 rounded-lg text-center">
            {successMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary-container text-on-primary-container font-title-md py-4 rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : t('auth.resetPassword')}
        </button>
      </form>

      <div className="text-center">
        <p className="font-label-sm text-on-surface-variant">
          {t('auth.didntGetEmail')}{' '}
          <button
            type="button"
            disabled={isResending}
            onClick={handleResend}
            className="text-primary font-bold hover:underline bg-transparent border-none outline-none cursor-pointer"
          >
            {isResending ? t('auth.resending') : t('auth.resendCode')}
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;

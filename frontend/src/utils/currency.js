import { getCurrencyCode, getCurrencySymbol, getNumberLocale } from './preferencesStore';
import { getUsdArsRate } from './fxStore';

/**
 * Monto input helpers. Internamente "centavos" (dígitos) en la moneda de display.
 * Cuando currency=USD y hay rate, display es USD; el storage base sigue siendo ARS.
 */

export function sanitizeAmountDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function displayConfig() {
  const code = getCurrencyCode();
  if (code === 'USD') {
    const rate = getUsdArsRate();
    if (rate) return { symbol: 'US$', locale: 'en-US', rate, code: 'USD' };
  }
  return { symbol: '$', locale: getNumberLocale(), rate: null, code: 'ARS' };
}

export function formatAmountFromDigits(digits) {
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  if (Number.isNaN(cents)) return '';
  const value = cents / 100;
  const { symbol, locale } = displayConfig();
  return `${symbol}${value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Convierte monto base (ARS) a dígitos de display. */
export function digitsFromNumericAmount(amount) {
  if (amount == null || amount === '') return '';
  let num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
  if (Number.isNaN(num)) return '';
  const { code, rate } = displayConfig();
  if (code === 'USD' && rate) num = num / rate;
  return String(Math.round(num * 100));
}

/** Devuelve monto en moneda de display. */
export function parseAmountDigits(digits) {
  if (!digits) return NaN;
  const cents = parseInt(digits, 10);
  if (Number.isNaN(cents)) return NaN;
  return cents / 100;
}

/** Convierte monto de display a ARS base para persistir. */
export function toBaseAmount(displayAmount) {
  const num = Number(displayAmount);
  if (!Number.isFinite(num)) return NaN;
  const { code, rate } = displayConfig();
  if (code === 'USD' && rate) return num * rate;
  return num;
}

/** Convierte ARS base a display. */
export function fromBaseAmount(baseAmount) {
  const num = Number(baseAmount);
  if (!Number.isFinite(num)) return NaN;
  const { code, rate } = displayConfig();
  if (code === 'USD' && rate) return num / rate;
  return num;
}



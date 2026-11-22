import { getCurrencyCode, getCurrencySymbol, getNumberLocale } from './preferencesStore';
import { getUsdArsRate } from './fxStore';


/**
 * Interpreta un monto numérico o texto en formatos AR/US.
 * Evita el clásico parseFloat("19.800") === 19.8
 */
export function parseMoney(value) {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return value;

  const raw = String(value)
    .trim()
    .replace(/^(US\$|U\$S|ARS|\$)\s?/i, '')
    .replace(/\s/g, '');
  if (!raw) return NaN;

  // US miles: 19,800 o 19,800.50
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) {
    return parseFloat(raw.replace(/,/g, ''));
  }

  // AR con decimales: 19.800,50 o 19,80
  if (raw.includes(',')) {
    return parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  }

  // AR solo miles: 19.800 o 1.234.567
  if (/^-?\d{1,3}(\.\d{3})+$/.test(raw)) {
    return parseFloat(raw.replace(/\./g, ''));
  }

  return parseFloat(raw);
}

export function formatPeso(amount, { decimals = 0 } = {}) {
  const code = getCurrencyCode();
  const symbol = getCurrencySymbol();
  if (amount == null || amount === '') return `${symbol}0`;
  let num = parseMoney(amount);
  if (Number.isNaN(num)) return `${symbol}0`;

  let displaySymbol = symbol;
  let displayDecimals = decimals;
  let locale = getNumberLocale();

  if (code === 'USD') {
    const rate = getUsdArsRate();
    if (rate) {
      num = num / rate;
      displaySymbol = 'US$';
      displayDecimals = Math.max(decimals, 2);
      locale = 'en-US';
    } else {
      // No rate yet: fall back to ARS to avoid showing wrong numbers.
      displaySymbol = '$';
      locale = 'es-AR';
    }
  }

  const formatted = Math.abs(num).toLocaleString(locale, {
    minimumFractionDigits: displayDecimals,
    maximumFractionDigits: displayDecimals,
  });
  return `${displaySymbol}${formatted}`;
}


export function formatPesoSigned(amount, type) {
  const prefix = type === 'EXPENSE' ? '- ' : type === 'INCOME' ? '+ ' : '';
  const num = parseMoney(amount);
  return `${prefix}${formatPeso(Math.abs(Number.isNaN(num) ? 0 : num))}`;
}

/** Balance con signo separado del símbolo: `- $600` */
export function formatPesoBalance(amount) {
  const num = parseMoney(amount);
  const safe = Number.isNaN(num) ? 0 : num;
  const sign = safe >= 0 ? '+ ' : '- ';
  return `${sign}${formatPeso(Math.abs(safe))}`;
}


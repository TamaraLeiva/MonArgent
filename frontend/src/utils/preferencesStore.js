const STORAGE_KEY = 'monargent:preferences';

const DEFAULTS = {
  theme: 'dark',
  currency: 'ARS', // ARS | USD
  language: 'es', // es | en
};

let state = { ...DEFAULTS };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      currency: parsed.currency === 'USD' ? 'USD' : 'ARS',
      language: parsed.language === 'en' ? 'en' : 'es',
    };
  } catch {
    state = { ...DEFAULTS };
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

load();

export function getPreferences() {
  return state;
}

export function setPreferences(next) {
  state = { ...state, ...next };
  persist();
  return state;
}

export function getCurrencySymbol() {
  return state.currency === 'USD' ? 'US$' : '$';
}

export function getNumberLocale() {
  return state.language === 'en' ? 'en-US' : 'es-AR';
}

export function getCurrencyCode() {
  return state.currency;
}

export function getLanguage() {
  return state.language;
}


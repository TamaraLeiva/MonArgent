const CACHE_KEY = 'monargent:fx-usd-oficial';
const TTL_MS = 30 * 60 * 1000;
const URL = 'https://dolarapi.com/v1/dolares/oficial';

let state = {
  rate: null, // ARS per 1 USD (venta)
  updatedAt: null,
  source: 'oficial',
  loading: false,
  error: null,
};

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.rate && parsed?.updatedAt) {
      state = { ...state, rate: Number(parsed.rate), updatedAt: parsed.updatedAt, error: null };
    }
  } catch {
    // ignore
  }
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      rate: state.rate,
      updatedAt: state.updatedAt,
      source: state.source,
    }));
  } catch {
    // ignore
  }
}

loadCache();

export function getFxState() {
  return state;
}

export function getUsdArsRate() {
  return state.rate;
}

export function isFxStale() {
  if (!state.updatedAt) return true;
  return Date.now() - new Date(state.updatedAt).getTime() > TTL_MS;
}

export async function refreshFxRate({ force = false } = {}) {
  if (state.loading) return state;
  if (!force && state.rate && !isFxStale()) return state;
  state = { ...state, loading: true, error: null };
  try {
    const res = await fetch(URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`FX ${res.status}`);
    const data = await res.json();
    const rate = Number(data?.venta);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid FX rate');
    state = {
      rate,
      updatedAt: data.fechaActualizacion || new Date().toISOString(),
      source: data.casa || 'oficial',
      loading: false,
      error: null,
    };
    saveCache();
  } catch (error) {
    state = { ...state, loading: false, error: error.message || 'FX error' };
  }
  return state;
}

export function convertArsToUsd(arsAmount) {
  const rate = getUsdArsRate();
  const num = Number(arsAmount);
  if (!Number.isFinite(num) || !rate) return NaN;
  return num / rate;
}

export function convertUsdToArs(usdAmount) {
  const rate = getUsdArsRate();
  const num = Number(usdAmount);
  if (!Number.isFinite(num) || !rate) return NaN;
  return num * rate;
}

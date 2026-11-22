import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPreferences, setPreferences as persistPreferences } from '../utils/preferencesStore';
import { translate } from '../i18n/translations';
import { getFxState, refreshFxRate } from '../utils/fxStore';


const PreferencesContext = createContext(null);

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => getPreferences());
  const [fx, setFx] = useState(() => getFxState());

  useEffect(() => {
    applyTheme(prefs.theme);
    document.documentElement.lang = prefs.language === 'en' ? 'en' : 'es';
  }, [prefs.theme, prefs.language]);

  useEffect(() => {
    let active = true;
    refreshFxRate().then((next) => {
      if (active) setFx({ ...next });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (prefs.currency !== 'USD') return;
    let active = true;
    refreshFxRate().then((next) => {
      if (active) setFx({ ...next });
    });
    return () => { active = false; };
  }, [prefs.currency]);


  const update = useCallback((patch) => {
    setPrefs(() => {
      const next = persistPreferences(patch);
      applyTheme(next.theme);
      document.documentElement.lang = next.language === 'en' ? 'en' : 'es';
      return { ...next };
    });
  }, []);

  const toggleTheme = useCallback(() => {
    update({ theme: prefs.theme === 'dark' ? 'light' : 'dark' });
  }, [prefs.theme, update]);

  const toggleCurrency = useCallback(() => {
    update({ currency: prefs.currency === 'ARS' ? 'USD' : 'ARS' });
  }, [prefs.currency, update]);

  const toggleLanguage = useCallback(() => {
    update({ language: prefs.language === 'es' ? 'en' : 'es' });
  }, [prefs.language, update]);

  const t = useCallback((key, vars) => translate(prefs.language, key, vars), [prefs.language]);

  const value = useMemo(
    () => ({
      ...prefs,
      fx,
      refreshFxRate: async () => setFx({ ...(await refreshFxRate({ force: true })) }),
      updatePreferences: update,
      toggleTheme,
      toggleCurrency,
      toggleLanguage,
      t,
    }),
    [prefs, fx, update, toggleTheme, toggleCurrency, toggleLanguage, t]
  );


  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return ctx;
}

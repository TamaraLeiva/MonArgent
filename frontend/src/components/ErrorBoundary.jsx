import React from 'react';
import { translate } from '../i18n/translations';
import { getLanguage } from '../utils/preferencesStore';

/**
 * Catches render errors so a single broken page does not blank the whole app.
 * Place it inside the router but around the routes to keep navigation alive.
 */
export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[render]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const lang = getLanguage();
      return (
        <div
          role="alert"
          className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <h2 className="text-lg font-semibold text-slate-100">
            {translate(lang, 'error.title')}
          </h2>
          <p className="text-sm text-slate-400 max-w-sm">
            {translate(lang, 'error.message')}
          </p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-emerald-400 px-5 py-2.5 font-semibold text-slate-900 hover:opacity-90"
            onClick={() => window.location.reload()}
          >
            {translate(lang, 'error.reload')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

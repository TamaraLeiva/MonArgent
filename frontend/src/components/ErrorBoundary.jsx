import React from 'react';

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
      return (
        <div
          role="alert"
          className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <h2 className="text-lg font-semibold text-slate-100">
            Algo salió mal en esta pantalla
          </h2>
          <p className="text-sm text-slate-400 max-w-sm">
            Tus datos están a salvo. Recargá para volver a intentar.
          </p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-emerald-400 px-5 py-2.5 font-semibold text-slate-900 hover:opacity-90"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

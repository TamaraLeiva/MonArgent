import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { TransactionProvider } from './context/TransactionContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const { language, currency } = usePreferences();
  return (
    <ErrorBoundary>
      <div key={`${language}-${currency}`} className="contents">
        <AppRoutes />
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <PreferencesProvider>
        <AuthProvider>
          <TransactionProvider>
            <AppContent />
          </TransactionProvider>
        </AuthProvider>
      </PreferencesProvider>
    </BrowserRouter>
  );
}



export default App;

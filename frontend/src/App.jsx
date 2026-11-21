import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TransactionProvider } from './context/TransactionContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TransactionProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </TransactionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './features/auth/AuthProvider';
import { supabase } from './features/auth/supabase-client';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider client={supabase.auth}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);

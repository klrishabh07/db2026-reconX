// TICKET-ADV111 — Entry point; mounts <App /> inside ThemeProvider + Router.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from '@context/ThemeContext.jsx';
import { AuthProvider } from '@context/AuthContext.jsx';
import './styles/global.css';
import { TradeStreamProvider } from './context/TradeStreamProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TradeStreamProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        </TradeStreamProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

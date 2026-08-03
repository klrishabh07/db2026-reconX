// TICKET-ADV122 — Lazy + Suspense for route-based code splitting.
// TICKET-ADV124 — theme toggle wired to ThemeContext.
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { withErrorBoundary } from '@components/withErrorBoundary.jsx';
import { useAuth } from '@context/AuthContext.jsx';
import { useTheme } from '@context/ThemeContext.jsx';

// Each page import is wrapped in React.lazy() so Vite emits a separate
// chunk per route. The <Suspense> fallback shows while the chunk downloads.
const Dashboard = lazy(() => import('@pages/Dashboard.jsx'));
const Trades    = lazy(() => import('@pages/Trades.jsx'));
const AddTrade  = lazy(() => import('@pages/AddTrade.jsx'));
const Login     = lazy(() => import('@pages/Login.jsx'));

function App() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <header className="layout__header">
        <h1>ReconX</h1>
        <nav className="layout__nav">
          <Link to="/">Dashboard</Link>
          <Link to="/trades">Trades</Link>
          <Link to="/trades/new">Add trade</Link>
        </nav>
        {/* TICKET-ADV124 — theme toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          style={{ marginLeft: 'auto' }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {user && (
          <button type="button" onClick={handleLogout}>
            Sign out
          </button>
        )}
      </header>
      <main className="layout__main">
        <Suspense fallback={<div className="loader">Loading…</div>}>
          <Routes>
            <Route path="/login"      element={<Login />} />
            <Route path="/"           element={<Dashboard />} />
            <Route path="/trades"     element={<Trades />} />
            <Route path="/trades/new" element={<AddTrade />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default withErrorBoundary(App);

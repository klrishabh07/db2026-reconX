# Day 8 — Solved Files Guide
### Topic: React SPA — Hooks, HOCs, Context, Forms, Tests (ADV111–ADV125)

> **Day 8 replaces the Day-7 static dashboard with a real React app.**
> Read this top-to-bottom before you touch a single file.

---

## What Day 8 is about

Day 7 built a static HTML dashboard. Day 8 tears it down and rebuilds
it as a Vite + React SPA with JWT authentication, live trade feed,
paginated trade table, a validated form, and RTL tests.

```
BEFORE Day 8 (Day 7 output)     AFTER Day 8
──────────────────────────────   ────────────────────────────────────
Static HTML in static-dashboard  React SPA at localhost:5173
No login / auth flow             Login form → JWT → protected routes
No state management              AuthContext + ThemeContext
Vanilla JS in sse.js             useTradeStream() hook
No form validation               react-hook-form + Yup schema
No tests                         Vitest + RTL tests (npm test)
```

---

## React component tree

```
<App>  (withErrorBoundary HOC wrapping)
  │
  ├── <header>
  │     ├── <nav> (Dashboard / Trades / Add trade links)
  │     ├── <ThemeToggle> (🌙 / ☀️ button)
  │     └── <LogoutButton> (visible when logged in)
  │
  └── <Suspense fallback="Loading…">
        │
        ├── /login      ─► <Login>  (public)
        ├── /           ─► <Dashboard>  (withAuth HOC)
        ├── /trades     ─► <Trades>     (withAuth HOC)
        └── /trades/new ─► <AddTrade>   (withAuth HOC)

Context providers (wrap the entire tree in main.jsx):
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <App />
```

---

## Auth flow — login to protected page

```
User types email + password
          │
          ▼
    Login.jsx — api.login(email, password)
          │
          │  POST /api/auth/login
          │
          ▼
    Backend returns { token, role }
          │
          ▼
    AuthContext.login(token, role)
    ├── sessionStorage.setItem('reconx-token', token)
    └── setUser({ token, role })
          │
          ▼
    navigate('/')  ─►  <Dashboard>
          │
          │  withAuth HOC checks:
          │    const { user } = useAuth()
          │    if (!user) return <Navigate to="/login" />
          │
          ▼
    Dashboard renders  ✓
          │
          ▼
    Every api.xxx() call:
    authHeaders() reads sessionStorage → Authorization: Bearer <token>
```

---

## Custom hooks — what they do

```
┌─────────────────────────────────────────────────────────────┐
│  useWebSocket(url)                              ADV115       │
│  Opens WS, reconnects with exponential backoff              │
│  Backoff: 500ms → 1s → 2s → 4s → 8s → max 30s             │
│  Returns: { data, status, send }                            │
├─────────────────────────────────────────────────────────────┤
│  useTradeStream()                               ADV116       │
│  EventSource to /api/v1/trades/stream                       │
│  Prepends new trades, caps buffer at 200                    │
│  Returns: { trades[], isConnected }                         │
├─────────────────────────────────────────────────────────────┤
│  useDebouncedSearch(query, delay=300)           ADV117       │
│  Delays updating `debounced` until user stops typing        │
│  Prevents a fetch on every keystroke                        │
│  Returns: debounced string                                  │
├─────────────────────────────────────────────────────────────┤
│  useInfiniteScroll(loadMore)                    ADV118       │
│  IntersectionObserver watches a sentinel <div>              │
│  Calls loadMore() when it scrolls into view                 │
│  Returns: sentinelRef (attach to the bottom element)        │
└─────────────────────────────────────────────────────────────┘
```

---

## What this folder ships

| File | Ticket(s) | What it implements |
|------|-----------|--------------------|
| `frontend/vite.config.js`              | ADV111  | Path aliases + proxy to `localhost:8081` |
| `frontend/src/main.jsx`                | ADV111  | Root render with ThemeProvider + AuthProvider + BrowserRouter |
| `frontend/src/App.jsx`                 | ADV122, ADV124 | Lazy routes, Suspense, error boundary, theme toggle, logout |
| `frontend/src/styles/global.css`       | —       | CSS tokens, dark theme, component styles |
| `frontend/src/context/AuthContext.jsx` | ADV112  | JWT persisted in sessionStorage; `useAuth()` hook |
| `frontend/src/context/ThemeContext.jsx`| ADV124  | Dark/light toggle; syncs `data-theme` + localStorage |
| `frontend/src/components/withAuth.jsx` | ADV112  | HOC: redirects to `/login` if no JWT |
| `frontend/src/components/withErrorBoundary.jsx` | ADV113 | HOC: catches render errors; "Try again" button |
| `frontend/src/components/DataTable.jsx`| ADV114  | Compound component: `Header` / `Body` / `Pagination` subcomponents |
| `frontend/src/components/__tests__/DataTable.test.jsx` | ADV125 | RTL: column render + sort-click assertions |
| `frontend/src/hooks/useWebSocket.js`   | ADV115  | WS with exponential-backoff reconnect; `cancelledRef` cleanup guard |
| `frontend/src/hooks/useTradeStream.js` | ADV116  | EventSource SSE; caps buffer at 200 trades |
| `frontend/src/hooks/useDebouncedSearch.js` | ADV117 | Debounced copy of query; `clearTimeout` cleanup |
| `frontend/src/hooks/useInfiniteScroll.js`  | ADV118 | IntersectionObserver sentinel; stable `loadMoreRef` |
| `frontend/src/services/apiService.js`  | ADV072, ADV112–114, ADV121, ADV123 | Fetch wrapper + auth headers + all 8 endpoints |
| `frontend/src/pages/Dashboard.jsx`     | ADV116, ADV120 | SSE feed + `useMemo` portfolio value / stats |
| `frontend/src/pages/Login.jsx`         | ADV072  | Email/password → JWT → AuthContext → redirect |
| `frontend/src/pages/Trades.jsx`        | ADV114, ADV117 | DataTable + debounced status filter + pagination |
| `frontend/src/pages/AddTrade.jsx`      | ADV123  | react-hook-form + Yup schema for all 8 trade fields |

---

## Before you copy — what you should observe

Open `frontend/src/hooks/useTradeStream.js` in your editor:

```js
export function useTradeStream(url = '/api/v1/trades/stream') {
  const [trades, setTrades] = useState([]);
  const [isConnected, setConnected] = useState(false);
  // TODO: subscribe to EventSource here
  return { trades, isConnected };
}
```

Start the frontend and login:

```bash
cd frontend && npm run dev
# Open http://localhost:5173
```

The Dashboard loads but shows **0 trades** and **SSE: disconnected**.
The Trades page shows an empty table. The Add Trade form submits but
throws `Error: TICKET-ADV072 not implemented`. Those are the gaps
this folder fills in.

---

## Copy the solved files

### Mac / Linux

```bash
# From the project root — one-shot overlay
cp -R day8-solved-files/frontend/ frontend/
cd frontend && npm install
```

### Windows (Command Prompt)

```cmd
xcopy /E /Y day8-solved-files\frontend\ frontend\
cd frontend
npm install
```

### Windows (PowerShell)

```powershell
Copy-Item -Recurse -Force day8-solved-files\frontend\* frontend\
cd frontend
npm install
```

> `npm install` is only needed once (or after `package.json` changes).
> If `node_modules` is already there and nothing changed, skip it.

---

## Run the project

You need **two terminals** — one for the backend, one for Vite.

### Terminal 1 — backend (Mac / Linux)

```bash
cd backend
./mvnw spring-boot:run
# Runs on http://localhost:8081/api
```

### Terminal 1 — backend (Windows)

```cmd
cd backend
mvnw.cmd spring-boot:run
```

### Terminal 2 — Vite dev server (all platforms)

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

> **Why does Vite proxy the requests?** The React app runs on port 5173
> and the backend on 8081. The browser would block `fetch` calls to a
> different port (CORS). Vite's dev server forwards any request that
> starts with `/api` to `http://localhost:8081` — so the frontend just
> calls `/api/v1/trades` and it works seamlessly.

---

## What to observe AFTER copying

### Observation 1 — Login works

Open http://localhost:5173/login. Enter `admin@db.com` / `admin123`.
You are redirected to `/` (Dashboard). Open DevTools → Application →
Session Storage — you see `reconx-token` and `reconx-role` stored.

Now reload the page. You stay on Dashboard (not redirected to login)
because `AuthProvider` reads from sessionStorage on init.

### Observation 2 — Protected routes redirect

Open an Incognito window and visit http://localhost:5173/trades
directly (without logging in). You are immediately redirected to
`/login`. This is `withAuth` doing its job.

### Observation 3 — SSE live feed

Stay on the Dashboard. Open a new tab, go to Swagger UI
(http://localhost:8081/api/swagger-ui.html), authorize with your JWT,
and POST a new trade. Switch back to the Dashboard tab — the new trade
appears in the stat cards (trades count increments, portfolio value
updates) because `useTradeStream` is pushing it live.

### Observation 4 — Debounced search

Go to `/trades`. In the status filter input, type `MAT` quickly —
watch DevTools → Network. Only **one** fetch fires after you stop
typing (after 300ms), not one per character. That is `useDebouncedSearch`.

### Observation 5 — Theme toggle

Click the 🌙 button in the header. The entire app switches to dark
mode (same CSS token mechanism as Day 7). Reload — dark mode is
preserved (stored in localStorage).

### Observation 6 — Form validation

Go to `/trades/new`. Click **Submit** without filling in any fields.
Every required field shows its error message instantly — the form
does NOT submit to the server. Fill in the `tradeRef` field with
`abc` (wrong format). The Yup regex error shows:
`Format: AAA-YYYYMMDD-NNNN`.

### Observation 7 — Error boundary

Open DevTools Console. Run:

```js
throw new Error("test boundary")
```

Instead of a blank white page you see the error fallback with a
**Try again** button. Click it and the app recovers.

### Run the RTL tests

```bash
cd frontend
npm test
```

Expected output:

```
✓ <DataTable> renders columns and rows
✓ <DataTable> invokes onSortChange when a header is clicked

Test Files  1 passed (1)
Tests       2 passed (2)
```

---

## Ticket checklist

| # | Ticket | Before | After |
|---|--------|--------|-------|
| ADV111 | Vite path aliases | Relative `../../` imports everywhere | `@hooks/`, `@components/`, `@context/` etc. |
| ADV112 | `withAuth` HOC | Renders component regardless of auth | Redirects to `/login` if no JWT |
| ADV112 | `AuthContext` | `user` is always `null` | Reads sessionStorage on init; `login()`/`logout()` works |
| ADV113 | `withErrorBoundary` | White blank page on error | Error fallback + "Try again" button |
| ADV114 | `DataTable` compound component | Header is empty; body renders nothing | Sortable header buttons + rows + prev/next pagination |
| ADV115 | `useWebSocket` | Returns `{data:null, status:'connecting'}` always | Real WS with exponential-backoff reconnect |
| ADV116 | `useTradeStream` | Returns empty `trades[]` always | Live SSE trades prepended and capped at 200 |
| ADV117 | `useDebouncedSearch` | Returns `query` unchanged immediately | Debounced by 300ms; clears timer on unmount |
| ADV118 | `useInfiniteScroll` | Does nothing | IntersectionObserver fires `loadMore()` when sentinel visible |
| ADV119 | `React.memo` | Every parent re-render re-renders all rows | Memoised rows skip render if props unchanged |
| ADV120 | `useMemo` stats | Values always 0 | Portfolio value + matched + break counts derived from trades |
| ADV121 | `useCallback` on handlers | New function reference every render | Stable reference; memo children don't re-render |
| ADV122 | `React.lazy` + `Suspense` | All code in one bundle | 4 separate route bundles; `<Suspense>` shows "Loading…" |
| ADV123 | react-hook-form + Yup | No validation; form always submits | 8-field schema; per-field errors on blur |
| ADV124 | `ThemeContext` | `toggle()` is a no-op | Dark/light toggle + `data-theme` + localStorage |
| ADV125 | RTL tests | TODOs in test file — 0 assertions | 2 passing tests with real assertions |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm run dev` shows module not found `@hooks/...` | Path aliases are in `vite.config.js`. Run `cp -R day8-solved-files/frontend/vite.config.js frontend/` and restart Vite |
| Login returns 404 | Backend not running, or proxy target is wrong. `vite.config.js` must point to `localhost:8081` |
| Login returns 401 "Invalid credentials" | Wrong email/password. Seeded users are in `008-seed.xml`. Default: `admin@db.com` / `admin123` |
| Dashboard shows "SSE: disconnected" | Backend is not running. Start it in Terminal 1 |
| `npm test` fails with "Cannot find module @testing-library/jest-dom" | Run `npm install` again |
| `useEffect` fires twice in dev | React 18 StrictMode intentionally double-invokes effects. Add cleanup (`return () => sse.close()`) so it is idempotent |
| CORS error in browser console | Vite proxy is not running. Make sure you started Vite (`npm run dev`) and are on port 5173, not opening the HTML file directly |
| Port 5173 in use | Vite auto-picks the next free port. Check its startup output |
| Port 8081 in use (Mac/Linux) | `lsof -i :8081` then `kill <PID>` |
| Port 8081 in use (Windows) | `netstat -ano \| findstr :8081` then `taskkill /PID <PID> /F` |
| Theme resets to light on reload | `localStorage` is being cleared. Check browser settings (private/incognito mode) |

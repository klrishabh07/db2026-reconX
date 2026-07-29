// TICKET-ADV104 / ADV105 — EventSource live feed with prepend + slide-in animation + capped feed
(function () {
  const STREAM_URL = '/api/v1/trades/stream';
  const MAX_FEED = 50;
  const feed = document.getElementById('trade-feed');
  const statusEl = document.getElementById('connection-status');
  if (!feed) return;

  let sse = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function makeCard(trade) {
    const el = document.createElement('article');
    el.className = 'trade-card trade-card--' + String(trade.status || '').toLowerCase();
    el.innerHTML = `
      <strong>${trade.tradeRef}</strong>
      <span> ${trade.symbol} </span>
      <span> qty=${trade.qty} </span>
      <span> price=${trade.price} </span>
      <span> [${trade.status}]</span>`;
    return el;
  }

  function prependTrade(trade) {
    const el = makeCard(trade);
    // Use a modifier to retrigger animation reliably
    el.classList.add('trade-card--new');
    feed.prepend(el);
    // force reflow for animation replay
    void el.offsetWidth;
    el.classList.remove('trade-card--new');
    el.classList.add('trade-card');

    // cap feed
    while (feed.children.length > MAX_FEED) {
      feed.removeChild(feed.lastElementChild);
    }
  }

  // Demo fallback when EventSource isn't available (or for static preview)
  const demoEvents = [
    { tradeRef: 'EQU-20260603-0001', symbol: 'SAP.DE',  qty: 1000, price: 125.50, status: 'MATCHED' },
    { tradeRef: 'FX-20260603-0001',  symbol: 'EUR/USD', qty: 1000000, price: 1.0852, status: 'PENDING' },
    { tradeRef: 'EQU-20260603-0002', symbol: 'AAPL',    qty: 500,  price: 178.20, status: 'BREAK' },
  ];

  function runDemo() {
    setStatus('Demo');
    demoEvents.forEach((e, i) => setTimeout(() => prependTrade(e), 600 * i));
  }

  function connect() {
    if (!window.EventSource) {
      runDemo();
      return;
    }

    try {
      sse = new EventSource(STREAM_URL);
    } catch (err) {
      console.warn('EventSource failed to construct', err);
      runDemo();
      return;
    }

    sse.onopen = () => setStatus('Live');
    sse.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        prependTrade(data);
      } catch (e) {
        console.warn('Failed to parse SSE message', e);
      }
    };
    sse.onerror = () => setStatus('Reconnecting…');
  }

  // Wire up lifecycle
  connect();
  window.addEventListener('beforeunload', () => { sse?.close(); });

})();

// TICKET-ADV106 — Advanced data table: sortable columns, resizable columns,
//                 frozen header (handled by CSS position:sticky on thead th).
(function () {
  'use strict';

  const table = document.getElementById('trades-table');
  const tbody = document.getElementById('trades-tbody');
  if (!table || !tbody) return;

  let rows = []; // canonical data array — all sorting operates on this, not the DOM

  // ── Render ──────────────────────────────────────────────────────────────────
  function renderRows() {
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;opacity:0.5">No trades found.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      return '<tr>' +
        '<td>' + esc(r.tradeRef)   + '</td>' +
        '<td>' + esc(r.symbol)     + '</td>' +
        '<td>' + esc(r.quantity)   + '</td>' +
        '<td>' + esc(r.price)      + '</td>' +
        '<td>' + esc(r.status)     + '</td>' +
        '<td>' + esc(r.tradeDate)  + '</td>' +
        '</tr>';
    }).join('');
  }

  function esc(v) {
    return v == null ? '' : String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Sortable columns ────────────────────────────────────────────────────────
  table.querySelectorAll('thead th').forEach(function (th) {
    th.addEventListener('click', function (e) {
      // Ignore clicks on the resize handle — they're for dragging, not sorting.
      if (e.target.classList.contains('resize-handle')) return;

      var col  = th.dataset.col;
      var type = th.dataset.type || 'string';
      // Toggle: if this column is already sorted ascending, flip to descending.
      var current = th.getAttribute('aria-sort');
      var dir = current === 'ascending' ? 'descending' : 'ascending';

      // Clear aria-sort on all columns, then set it only on the clicked one.
      table.querySelectorAll('thead th').forEach(function (o) {
        o.removeAttribute('aria-sort');
      });
      th.setAttribute('aria-sort', dir);
      // Keep data-dir in sync so subsequent clicks can read it.
      th.dataset.dir = dir;

      var mult = dir === 'ascending' ? 1 : -1;
      rows.sort(function (a, b) {
        var av = a[col], bv = b[col];
        if (type === 'number') return (Number(av) - Number(bv)) * mult;
        return String(av == null ? '' : av)
          .localeCompare(String(bv == null ? '' : bv)) * mult;
      });
      renderRows();
    });
  });

  // ── Resizable columns ───────────────────────────────────────────────────────
  table.querySelectorAll('.resize-handle').forEach(function (handle) {
    handle.addEventListener('mousedown', function (e) {
      e.preventDefault(); // prevent text selection during drag
      var th = handle.closest('th');
      var startX     = e.clientX;
      var startWidth = th.offsetWidth;

      // Attach move + up listeners to DOCUMENT, not the handle.
      // This keeps the drag working even when the cursor leaves the handle.
      function onMove(ev) {
        var newWidth = startWidth + (ev.clientX - startX);
        if (newWidth > 60) th.style.width = newWidth + 'px'; // enforce 60 px minimum
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });

  // ── Initial data load ───────────────────────────────────────────────────────
  // Hits the trades REST endpoint from Day 5 (/api/v1/trades?size=200).
  // If no backend is running the catch block populates demo rows so the
  // sort and resize behaviours are still demonstrable.
  fetch('/api/v1/trades?size=200')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      // PagedResponse wraps trades in a .items array; plain array also accepted.
      rows = data.items || data;
      renderRows();
    })
    .catch(function () {
      // Demo fallback when backend is not running.
      rows = [
        { tradeRef: 'EQU-20260603-0001', symbol: 'SAP.DE',  quantity: 1000,    price: 125.50, status: 'MATCHED',   tradeDate: '2026-06-03' },
        { tradeRef: 'FX-20260603-0001',  symbol: 'EUR/USD', quantity: 1000000, price: 1.0852, status: 'PENDING',   tradeDate: '2026-06-03' },
        { tradeRef: 'EQU-20260603-0002', symbol: 'AAPL',    quantity: 500,     price: 178.20, status: 'BREAK',     tradeDate: '2026-06-03' },
        { tradeRef: 'EQU-20260604-0001', symbol: 'MSFT',    quantity: 750,     price: 320.10, status: 'MATCHED',   tradeDate: '2026-06-04' },
        { tradeRef: 'EQU-20260604-0002', symbol: 'AMZN',    quantity: 200,     price: 185.50, status: 'UNMATCHED', tradeDate: '2026-06-04' },
        { tradeRef: 'EQU-20260605-0001', symbol: 'TSLA',    quantity: 300,     price: 245.80, status: 'MATCHED',   tradeDate: '2026-06-05' },
      ];
      renderRows();
    });
})();

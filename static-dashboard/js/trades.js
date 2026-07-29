// TICKET-ADV106 — Sortable, resizable table with sticky header (frozen header)
(function () {
  function toNumber(v) { const n = parseFloat(String(v).replace(/,/g, '')); return Number.isFinite(n) ? n : v; }

  function initTable(table) {
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;

    // Make header sticky via CSS class (handled in stylesheet)

    // Add resize handles
    Array.from(thead.querySelectorAll('th')).forEach((th, index) => {
      const handle = th.querySelector('.col-resize-handle');
      if (!handle) return;
      handle.style.cursor = 'col-resize';
      let startX, startWidth;
      handle.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = th.offsetWidth;
        document.documentElement.classList.add('col-resizing');
        function onMove(ev) {
          const dx = ev.clientX - startX;
          th.style.width = Math.max(40, startWidth + dx) + 'px';
        }
        function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.documentElement.classList.remove('col-resizing'); }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
      });
    });

    // Sort on header click
    Array.from(thead.querySelectorAll('th')).forEach((th, colIndex) => {
      th.style.userSelect = 'none';
      let direction = 1; // 1 = asc, -1 = desc
      th.addEventListener('click', (e) => {
        // Ignore clicks on the resize handle
        if (e.target.classList && e.target.classList.contains('col-resize-handle')) return;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
          const aText = a.children[colIndex].textContent.trim();
          const bText = b.children[colIndex].textContent.trim();
          const aVal = toNumber(aText);
          const bVal = toNumber(bText);
          if (aVal === bVal) return 0;
          return aVal > bVal ? direction : -direction;
        });
        rows.forEach(r => tbody.appendChild(r));
        direction = -direction; // toggle
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('trades-table');
    if (table) initTable(table);
  });
})();

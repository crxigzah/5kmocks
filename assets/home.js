(function () {
  const grid = document.getElementById('grid');
  const filters = document.getElementById('filters');
  const search = document.getElementById('search');
  let vendor = 'All';

  const history = loadHistory();

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem('5kmocks.history') || '[]'); }
    catch (e) { return []; }
  }

  function bestFor(id) {
    const runs = history.filter(h => h.cert === id && h.mode === 'exam');
    if (!runs.length) return null;
    return runs.reduce((a, b) => (b.pct > a.pct ? b : a));
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const list = CERTS.filter(c =>
      (vendor === 'All' || c.vendor === vendor) &&
      (!q || [c.name, c.code, c.vendor, c.blurb].join(' ').toLowerCase().includes(q))
    );
    if (!list.length) { grid.innerHTML = '<div class="empty">No exams match that search.</div>'; return; }
    grid.innerHTML = list.map(c => {
      const n = (MOCKS.banks[c.id] || []).length;
      const best = bestFor(c.id);
      const badge = best
        ? `<span class="best ${best.passed ? 'pass' : 'fail'}">Best ${best.pct}%</span>`
        : '';
      return `<a class="card" href="exam.html?cert=${c.id}">
        <div class="card-top">
          <span class="vendor"><i style="background:${c.colour}"></i>${esc(c.vendor)}</span>
          ${badge || `<span class="code">${esc(c.code)}</span>`}
        </div>
        <h3>${esc(c.name)}</h3>
        <p>${esc(c.blurb)}</p>
        <div class="meta"><span>${n} questions</span><span>${esc(c.level)}</span><span>Real exam: ${c.real.minutes} min</span></div>
      </a>`;
    }).join('');
  }

  const vendors = ['All', ...new Set(CERTS.map(c => c.vendor))];
  filters.innerHTML = vendors.map(v => `<button class="chip${v === 'All' ? ' on' : ''}" data-v="${esc(v)}">${esc(v)}</button>`).join('');
  filters.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    vendor = b.dataset.v;
    filters.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
    render();
  });
  search.addEventListener('input', render);

  document.getElementById('statCerts').textContent = CERTS.length;
  document.getElementById('statQs').textContent = Object.values(MOCKS.banks).reduce((a, b) => a + b.length, 0);
  document.getElementById('statTaken').textContent = history.length;
  document.getElementById('yr').textContent = new Date().getFullYear();
  render();
})();

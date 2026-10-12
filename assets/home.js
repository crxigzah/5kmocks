(function () {
  const grid = document.getElementById('grid');
  const filters = document.getElementById('filters');
  const levels = document.getElementById('levels');
  const search = document.getElementById('search');
  let vendor = 'All';
  let level = 'All levels';

  let history = loadHistory();

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
      (level === 'All levels' || c.level === level) &&
      (!q || [c.name, c.code, c.vendor, c.blurb, c.level].join(' ').toLowerCase().includes(q))
    ).sort((a, b) => !!a.retired - !!b.retired);
    if (!list.length) { grid.innerHTML = '<div class="empty">No exams match that search.</div>'; return; }
    grid.innerHTML = list.map(c => {
      const n = (MOCKS.banks[c.id] || []).length;
      const best = bestFor(c.id);
      const badge = c.retired
        ? `<span class="best retired">${esc(c.retired)}</span>`
        : best
          ? `<span class="best ${best.passed ? 'pass' : 'fail'}">Best ${best.pct}%</span>`
          : '';
      return `<a class="card${c.retired ? ' is-retired' : ''}" href="#exam-${c.id}">
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

  // Easiest first, so "Fundamentals" sits next to "All levels".
  const levelOrder = ['Fundamentals', 'Entry', 'Foundation', 'Intermediate', 'Associate'];
  const levelList = ['All levels', ...new Set(CERTS.map(c => c.level))].sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b));
  levels.innerHTML = levelList.map(v => `<button class="chip${v === 'All levels' ? ' on' : ''}" data-v="${esc(v)}">${esc(v)}</button>`).join('');
  levels.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    level = b.dataset.v;
    levels.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
    render();
  });
  search.addEventListener('input', render);

  document.getElementById('statCerts').textContent = CERTS.filter(c => !c.retired).length;
  document.getElementById('statQs').textContent = Object.values(MOCKS.banks).reduce((a, b) => a + b.length, 0);
  document.getElementById('yr').textContent = new Date().getFullYear();

  // ---------- Router ----------
  // One page, two views: the catalogue, and an exam at #exam-<id>.
  // Hash routing keeps it working as a plain static site with no server rules.
  const home = document.getElementById('home');
  const app = document.getElementById('app');
  const baseTitle = document.title;
  let current = location.hash;
  let skip = false;

  function showHome() {
    history = loadHistory();
    document.getElementById('statTaken').textContent = history.length;
    MockExam.close();
    app.hidden = true;
    home.hidden = false;
    document.title = baseTitle;
    render();
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }

  function route() {
    const m = location.hash.match(/^#exam-([a-z0-9]+)$/);
    current = location.hash;
    if (m) {
      home.hidden = true;
      app.hidden = false;
      MockExam.open(m[1]);
      window.scrollTo(0, 0);
    } else {
      showHome();
    }
  }

  window.addEventListener('hashchange', () => {
    if (skip) { skip = false; return; }
    if (MockExam.inProgress() && location.hash !== current) {
      // Put the address back while we ask, so a cancel leaves the exam as it was.
      const target = location.hash;
      skip = true;
      location.hash = current;
      MockExam.confirmLeave().then(yes => {
        if (!yes) return;
        MockExam.close();
        location.hash = target;
      });
      return;
    }
    route();
  });

  route();
})();

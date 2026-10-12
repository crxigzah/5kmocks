// Exam engine. Flow: lobby -> exam (timed or practice) -> results/review.
// Question shape in /data/<id>.js: { d: domain, q: text, o: [options], a: index | [indices], e: explanation }
(function () {
  const app = document.getElementById('app');
  let cert = null;
  const HISTORY_KEY = '5kmocks.history';
  const LETTERS = 'ABCDEFGH';

  let bank = [];
  let S = null;         // current session state
  let tick = null;      // timer interval

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const answerSet = q => (Array.isArray(q.a) ? q.a : [q.a]);
  const isMulti = q => Array.isArray(q.a) && q.a.length > 1;
  const NUM_WORDS = ['', 'one', 'two', 'three', 'four'];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveHistory(entry) {
    try {
      const h = loadHistory();
      h.unshift(entry);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 200)));
    } catch (e) { /* storage blocked: history just won't persist */ }
  }

  function fmtTime(secs) {
    secs = Math.max(0, Math.round(secs));
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  // In-page replacement for confirm(): resolves true if the user picks the
  // primary action. Native dialogs are blocked in some embedded viewers.
  function ask(message, okLabel) {
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'modal-back';
      back.innerHTML = `<div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="askMsg">
        <p id="askMsg">${esc(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-sm" data-r="0">Cancel</button>
          <button class="btn btn-primary btn-sm" data-r="1">${esc(okLabel)}</button>
        </div></div>`;
      const done = r => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(r); };
      const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
      back.addEventListener('click', e => {
        const b = e.target.closest('[data-r]');
        if (b) done(b.dataset.r === '1');
        else if (e.target === back) done(false);
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(back);
      back.querySelector('[data-r="1"]').focus();
    });
  }

  // ---------- Entry points (called by the router in home.js) ----------
  window.MockExam = {
    open(id) {
      cert = CERTS.find(c => c.id === id);
      S = null;
      if (!cert) {
        app.innerHTML = `<div class="lobby panel"><h1>Exam not found</h1><p class="lead">That exam doesn't exist (yet).</p><a class="btn btn-primary" href="#exams">Back to all exams</a></div>`;
        return;
      }
      document.title = `${cert.code} ${cert.name} Mock | 5kmocks`;
      bank = MOCKS.banks[cert.id] || [];
      lobby();
    },
    // True while a timed or practice run is underway and unsubmitted.
    inProgress() { return !!(S && !S.done); },
    confirmLeave() { return ask('Leave this attempt? Your progress will be lost.', 'Leave'); },
    close() { clearInterval(tick); S = null; window.onbeforeunload = null; }
  };

  // ---------- Lobby ----------
  function lobby() {
    clearInterval(tick);
    S = null;
    window.onbeforeunload = null;
    const full = Math.min(bank.length, cert.real.questions);
    const sizes = [...new Set([10, 20, 40, full].filter(n => n <= bank.length))].sort((a, b) => a - b);
    const domains = [...new Set(bank.map(q => q.d))];
    const hist = loadHistory().filter(h => h.cert === cert.id).slice(0, 8);
    let mode = 'exam';

    app.innerHTML = `
      <div class="lobby">
        <div class="panel">
          <span class="vendor"><i style="background:${cert.colour}"></i>${esc(cert.vendor)} &middot; ${esc(cert.code)}</span>
          <h1>${esc(cert.name)}</h1>
          <p class="lead">${esc(cert.blurb)}</p>
          ${cert.retired ? (() => {
            const next = CERTS.find(c => c.id === cert.successor);
            return `<div class="retired-banner">${esc(cert.code)} is retired (${esc(cert.retired.replace(/^Retired /, ''))}).${next ? ` If you're booking an exam, practise <a href="#exam-${next.id}">${esc(next.code)} ${esc(next.name)}</a> instead.` : ''}</div>`;
          })() : ''}
          <div class="facts">
            <div class="fact"><span>Question bank</span><b>${bank.length} questions</b></div>
            <div class="fact"><span>Real exam</span><b>~${cert.real.questions} Qs / ${cert.real.minutes} min</b></div>
            <div class="fact"><span>Real pass mark</span><b>${esc(cert.real.passLabel)}</b></div>
            <div class="fact"><span>Our pass line</span><b>${cert.real.pass}%</b></div>
          </div>
          <div class="modes" id="modes">
            <button class="mode on" data-m="exam"><b>Exam mode</b><span>Timed at the real exam's pace. Answers revealed at the end.</span></button>
            <button class="mode" data-m="practice"><b>Practice mode</b><span>Untimed. See the answer and explanation after each question.</span></button>
          </div>
          <div class="opts-row">
            <label>Questions
              <select id="size">${sizes.map(n => `<option value="${n}"${n === full ? ' selected' : ''}>${n}${n === full ? ' (full mock)' : ''}</option>`).join('')}</select>
            </label>
            <label>Domain
              <select id="domain"><option value="">All domains</option>${domains.map(d => `<option>${esc(d)}</option>`).join('')}</select>
            </label>
            <span id="timeInfo"></span>
          </div>
          <button class="btn btn-primary" id="start">Start</button>
          ${cert.note ? `<p class="note">${esc(cert.note)}</p>` : ''}
          <p class="note">These are original questions written to match the exam objectives, not real exam questions. CompTIA and Microsoft use scaled scoring, so our pass line is an approximation.</p>
        </div>
        ${hist.length ? `
        <div class="panel history">
          <h3>Your recent attempts</h3>
          <table><tr><th>Date</th><th>Mode</th><th>Questions</th><th>Score</th></tr>
          ${hist.map(h => `<tr><td>${new Date(h.date).toLocaleDateString('en-GB')}</td><td>${h.mode === 'exam' ? 'Exam' : 'Practice'}</td><td>${h.n}</td>
            <td style="color:${h.passed ? 'var(--teal)' : 'var(--red)'};font-weight:700">${h.pct}%</td></tr>`).join('')}
          </table>
        </div>` : ''}
      </div>`;

    const sizeEl = document.getElementById('size');
    const domEl = document.getElementById('domain');
    const timeInfo = document.getElementById('timeInfo');

    function poolSize() { return domEl.value ? bank.filter(q => q.d === domEl.value).length : bank.length; }
    function update() {
      const n = Math.min(+sizeEl.value, poolSize());
      timeInfo.textContent = mode === 'exam'
        ? `${n} questions, ${minutesFor(n)} min on the clock`
        : `${n} questions, no timer`;
    }
    document.getElementById('modes').addEventListener('click', e => {
      const b = e.target.closest('.mode'); if (!b) return;
      mode = b.dataset.m;
      document.querySelectorAll('.mode').forEach(x => x.classList.toggle('on', x === b));
      update();
    });
    sizeEl.addEventListener('change', update);
    domEl.addEventListener('change', update);
    update();

    document.getElementById('start').onclick = () => {
      let pool = domEl.value ? bank.filter(q => q.d === domEl.value) : bank;
      pool = shuffle(pool).slice(0, Math.min(+sizeEl.value, pool.length));
      start(pool, mode);
    };
  }

  function minutesFor(n) {
    return Math.max(5, Math.round(cert.real.minutes / cert.real.questions * n));
  }

  // ---------- Exam ----------
  function start(pool, mode) {
    S = {
      mode,
      items: pool.map(q => ({ q, order: shuffle(q.o.map((_, i) => i)) })),
      answers: pool.map(() => []),
      checked: pool.map(() => false),   // practice mode: answer locked in
      flags: new Set(),
      i: 0,
      started: Date.now(),
      deadline: mode === 'exam' ? Date.now() + minutesFor(pool.length) * 60000 : null
    };
    window.onbeforeunload = () => 'Your exam is in progress.';
    if (S.deadline) {
      tick = setInterval(() => {
        const left = (S.deadline - Date.now()) / 1000;
        const t = document.getElementById('timer');
        if (t) { t.textContent = fmtTime(left); t.classList.toggle('low', left < 300); }
        if (left <= 0) finish(true);
      }, 500);
    }
    renderQ();
  }

  function renderQ() {
    const { items, answers, i } = S;
    const it = items[i], q = it.q, multi = isMulti(q);
    const sel = answers[i];
    const locked = S.mode === 'practice' && S.checked[i];
    const correct = answerSet(q);
    const answeredCount = answers.filter(a => a.length).length;

    const opts = it.order.map((oi, pos) => {
      let cls = '';
      if (locked) {
        if (correct.includes(oi)) cls = 'right';
        else if (sel.includes(oi)) cls = 'wrong';
      } else if (sel.includes(oi)) cls = 'sel';
      return `<button class="ans ${cls}" data-oi="${oi}" ${locked ? 'disabled' : ''}><span class="key">${LETTERS[pos]}</span><span>${esc(q.o[oi])}</span></button>`;
    }).join('');

    let explain = '';
    if (locked) {
      const ok = sameSet(sel, correct);
      explain = `<div class="explain ${ok ? 'ok' : 'bad'}"><b class="verdict">${ok ? 'Correct.' : 'Not quite.'}</b> ${esc(q.e)}</div>`;
    }

    const needCheck = S.mode === 'practice' && multi && !locked;
    const last = i === items.length - 1;

    app.innerHTML = `
      <div class="exam">
        <div class="panel">
          <div class="exam-bar">
            <span class="title">${esc(cert.code)} &middot; ${S.mode === 'exam' ? 'Exam mode' : 'Practice mode'}</span>
            ${S.deadline ? `<span class="timer" id="timer">${fmtTime((S.deadline - Date.now()) / 1000)}</span>` : ''}
          </div>
          <div class="progress"><div style="width:${(answeredCount / items.length) * 100}%"></div></div>
          <div class="qnum"><span>Question ${i + 1} of ${items.length}</span><span class="dom">${esc(q.d)}</span></div>
          <div class="qtext">${esc(q.q)}</div>
          ${multi ? `<div class="qhint">Choose ${NUM_WORDS[correct.length] || correct.length}.</div>` : ''}
          <div class="answers" id="answers">${opts}</div>
          ${explain}
          <div class="exam-nav">
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost btn-sm" id="prev" ${i === 0 ? 'disabled' : ''}>&larr; Back</button>
              <button class="btn btn-ghost btn-sm flag-btn ${S.flags.has(i) ? 'on' : ''}" id="flag">${S.flags.has(i) ? 'Flagged' : 'Flag'}</button>
            </div>
            <div style="display:flex;gap:8px">
              ${needCheck ? `<button class="btn btn-outline btn-sm" id="check" ${sel.length !== correct.length ? 'disabled' : ''}>Check answer</button>` : ''}
              ${last
                ? `<button class="btn btn-primary btn-sm" id="submit">${S.mode === 'exam' ? 'Submit exam' : 'Finish'}</button>`
                : `<button class="btn btn-primary btn-sm" id="next">Next &rarr;</button>`}
            </div>
          </div>
        </div>
        <aside class="panel side">
          <h4>Questions</h4>
          <div class="dots">${items.map((_, k) => dotHtml(k)).join('')}</div>
          <div class="legend"><span>${answeredCount} answered &middot; ${S.flags.size} flagged</span><span>Keys: A-E select, &larr; &rarr; move, F flag</span></div>
          <button class="btn btn-outline btn-sm" style="width:100%" id="submit2">${S.mode === 'exam' ? 'Submit exam' : 'Finish practice'}</button>
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" id="quit">Quit</button>
        </aside>
      </div>`;

    document.getElementById('answers').onclick = e => {
      const b = e.target.closest('.ans'); if (!b || b.disabled) return;
      choose(+b.dataset.oi);
    };
    bind('prev', () => go(i - 1));
    bind('next', () => go(i + 1));
    bind('flag', toggleFlag);
    bind('check', () => { S.checked[i] = true; renderQ(); });
    bind('submit', confirmSubmit);
    bind('submit2', confirmSubmit);
    bind('quit', () => ask('Quit this attempt? Your progress will be lost.', 'Quit').then(yes => { if (yes) lobby(); }));
    document.querySelector('.dots').onclick = e => {
      const d = e.target.closest('.dot'); if (d) go(+d.dataset.k);
    };
  }

  function dotHtml(k) {
    const cls = ['dot'];
    if (k === S.i) cls.push('cur');
    if (S.flags.has(k)) cls.push('flag');
    if (S.mode === 'practice' && S.checked[k]) cls.push(sameSet(S.answers[k], answerSet(S.items[k].q)) ? 'r' : 'w');
    else if (S.answers[k].length) cls.push('done');
    return `<button class="${cls.join(' ')}" data-k="${k}">${k + 1}</button>`;
  }

  function bind(id, fn) { const el = document.getElementById(id); if (el) el.onclick = fn; }

  function choose(oi) {
    const i = S.i, q = S.items[i].q;
    if (S.mode === 'practice' && S.checked[i]) return;
    let sel = S.answers[i];
    if (isMulti(q)) {
      const need = answerSet(q).length;
      if (sel.includes(oi)) sel = sel.filter(x => x !== oi);
      else { sel = sel.concat(oi); if (sel.length > need) sel.shift(); }
    } else {
      sel = [oi];
      if (S.mode === 'practice') S.checked[i] = true;
    }
    S.answers[i] = sel;
    renderQ();
  }

  function toggleFlag() {
    S.flags.has(S.i) ? S.flags.delete(S.i) : S.flags.add(S.i);
    renderQ();
  }

  function go(k) {
    if (k < 0 || k >= S.items.length) return;
    S.i = k;
    renderQ();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function confirmSubmit() {
    const blank = S.answers.filter(a => !a.length).length;
    const msg = blank
      ? `You have ${blank} unanswered question${blank > 1 ? 's' : ''}${S.flags.size ? ` and ${S.flags.size} flagged` : ''}. Submit anyway?`
      : (S.flags.size ? `You still have ${S.flags.size} flagged question${S.flags.size > 1 ? 's' : ''}. Submit anyway?` : 'Submit and see your results?');
    ask(msg, 'Submit').then(yes => { if (yes) finish(false); });
  }

  document.addEventListener('keydown', e => {
    if (!S || S.done || app.hidden || document.querySelector('.modal-back') || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toUpperCase();
    const pos = LETTERS.indexOf(k);
    const order = S.items[S.i].order;
    if (pos > -1 && pos < order.length) { choose(order[pos]); return; }
    if (k >= '1' && k <= '8' && +k <= order.length) { choose(order[+k - 1]); return; }
    if (e.key === 'ArrowRight') go(S.i + 1);
    else if (e.key === 'ArrowLeft') go(S.i - 1);
    else if (k === 'F') toggleFlag();
  });

  function sameSet(a, b) {
    return a.length === b.length && a.every(x => b.includes(x));
  }

  // ---------- Results ----------
  function finish(timedOut) {
    if (S.done) return;
    S.done = true;
    clearInterval(tick);
    window.onbeforeunload = null;
    const secs = (Date.now() - S.started) / 1000;
    const results = S.items.map((it, k) => ({ it, k, sel: S.answers[k], ok: sameSet(S.answers[k], answerSet(it.q)) }));
    const right = results.filter(r => r.ok).length;
    const pct = Math.round(right / results.length * 100);
    const passed = pct >= cert.real.pass;

    saveHistory({ cert: cert.id, mode: S.mode, pct, passed, n: results.length, right, secs: Math.round(secs), date: Date.now() });

    const byDom = {};
    results.forEach(r => {
      const d = r.it.q.d;
      byDom[d] = byDom[d] || { right: 0, total: 0 };
      byDom[d].total++; if (r.ok) byDom[d].right++;
    });
    const domRows = Object.entries(byDom).sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total);
    const weakest = domRows.find(([, v]) => v.right / v.total < cert.real.pass / 100);
    const ringCol = passed ? 'var(--teal)' : 'var(--red)';
    const wrong = results.filter(r => !r.ok);

    app.innerHTML = `
      <div class="result">
        <div class="panel">
          <div class="score-ring">
            <div class="ring" style="background:conic-gradient(${ringCol} ${pct * 3.6}deg, var(--border) 0)"><div><span><b>${pct}%</b><br>${right} / ${results.length}</span></div></div>
            <div>
              <div class="verdict-big ${passed ? 'pass' : 'fail'}">${passed ? 'Pass' : 'Not yet'}</div>
              <p style="color:var(--muted)">${esc(cert.code)} ${esc(cert.name)} &middot; pass line ${cert.real.pass}% &middot; ${fmtTime(secs)} taken${timedOut ? ' (time ran out)' : ''}</p>
              <p style="color:var(--muted);margin-top:6px">${passed
                ? (pct >= 90 ? "That's comfortably over the line. Keep scores like this up across a couple of full mocks and you're ready to book." : "Over the line, but not by much. Get a few more full mocks above the line before booking the real thing.")
                : (weakest ? `Biggest gap: <b style="color:var(--text)">${esc(weakest[0])}</b>. Go through the explanations below, then retry the ones you missed.` : 'Go through the explanations below, then retry the ones you missed.')}</p>
            </div>
          </div>
          <h3 style="font-size:16px;margin-bottom:6px">By domain</h3>
          <div class="bars">
            ${domRows.map(([d, v]) => {
              const p = Math.round(v.right / v.total * 100);
              return `<div class="bar-row"><span>${esc(d)}</span><div class="bar"><div style="width:${p}%;background:${p >= cert.real.pass ? 'var(--teal)' : 'var(--red)'}"></div></div><span style="text-align:right">${v.right}/${v.total}</span></div>`;
            }).join('')}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${wrong.length ? `<button class="btn btn-primary" id="retryWrong">Practise the ${wrong.length} I got wrong</button>` : ''}
            <button class="btn btn-outline" id="again">New attempt</button>
            <a class="btn btn-ghost" href="#exams">All exams</a>
          </div>
        </div>
        <div class="panel" style="margin-top:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <h3 style="font-size:18px">Review answers</h3>
            <div class="tabs" id="tabs">
              <button class="chip on" data-f="wrong">Wrong (${wrong.length})</button>
              <button class="chip" data-f="flag">Flagged (${S.flags.size})</button>
              <button class="chip" data-f="all">All (${results.length})</button>
            </div>
          </div>
          <div class="review-list" id="review"></div>
        </div>
      </div>`;

    function renderReview(f) {
      const list = results.filter(r => f === 'all' || (f === 'wrong' && !r.ok) || (f === 'flag' && S.flags.has(r.k)));
      document.getElementById('review').innerHTML = list.length ? list.map(r => {
        const q = r.it.q, correct = answerSet(q);
        return `<div class="review-item ${r.ok ? 'ok' : 'bad'}">
          <div class="qnum"><span>Q${r.k + 1}</span><span class="dom">${esc(q.d)}</span>${r.sel.length ? '' : '<span style="color:var(--red)">Not answered</span>'}</div>
          <div class="q">${esc(q.q)}</div>
          <ul>${r.it.order.map(oi => `<li class="${correct.includes(oi) ? 'c' : r.sel.includes(oi) ? 'x' : ''}">${correct.includes(oi) ? '&#10003; ' : r.sel.includes(oi) ? '&#10007; ' : '&nbsp;&nbsp; '}${esc(q.o[oi])}</li>`).join('')}</ul>
          <div class="e">${esc(q.e)}</div>
        </div>`;
      }).join('') : '<div class="empty">Nothing here.</div>';
    }
    document.getElementById('tabs').onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      document.querySelectorAll('#tabs .chip').forEach(x => x.classList.toggle('on', x === b));
      renderReview(b.dataset.f);
    };
    renderReview(wrong.length ? 'wrong' : 'all');
    if (!wrong.length) document.querySelectorAll('#tabs .chip').forEach(x => x.classList.toggle('on', x.dataset.f === 'all'));

    bind('again', lobby);
    bind('retryWrong', () => start(shuffle(wrong.map(r => r.it.q)), 'practice'));
    window.scrollTo({ top: 0 });
  }
})();

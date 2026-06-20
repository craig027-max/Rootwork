/* ============================================================
   Root Rush — quiz mode for Word Roots
   Renders into #quizStage. Driven by window.ROOTS / TIERS / PALETTES.
   Question types: meaning-of-root · root-for-meaning · word-from-root
   ============================================================ */
(function () {
  "use strict";
  const ROOTS = window.ROOTS, TIERS = window.TIERS, PALETTES = window.PALETTES;
  const ROUND = 10;
  const BEST_KEY = 'wordRootsRushBest';

  const quiz   = document.getElementById('quiz');
  const stage  = document.getElementById('quizStage');
  if (!quiz || !stage) return;

  let best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) {}

  let tier = 0;          // 0 = all tiers
  let questions = [];
  let qi = 0, score = 0, streak = 0, maxStreak = 0, correct = 0, answered = false;

  // ── helpers ─────────────────────────────────────────────
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function sampleUnique(arr, n, exclude) {
    const seen = new Set((exclude || []).map(x => x.toLowerCase()));
    const out = [];
    for (const v of shuffle(arr)) { const k = v.toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push(v); if (out.length >= n) break; }
    return out;
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const mult = () => Math.min(8, Math.max(1, streak));
  function palOf(d) { return PALETTES[d.pal] || PALETTES.green; }

  // ── question builder ────────────────────────────────────
  function buildQuestion(d) {
    const types = ['mean', 'root', 'word'];
    const type = rnd(types);
    let prompt, correctLabel, distract;

    if (type === 'mean') {
      correctLabel = d.mean;
      const pool = ROOTS.filter(r => r.mean.toLowerCase() !== correctLabel.toLowerCase()).map(r => r.mean);
      distract = sampleUnique(pool, 3, [correctLabel]);
      prompt = { q: 'What does this root mean?', big: d.root, say: d.say, sub: 'from ' + d.org };
    } else if (type === 'root') {
      correctLabel = d.root;
      const pool = ROOTS.filter(r => r.root.toLowerCase() !== d.root.toLowerCase() && r.mean.toLowerCase() !== d.mean.toLowerCase()).map(r => r.root);
      distract = sampleUnique(pool, 3, [correctLabel]);
      prompt = { q: 'Which root carries this meaning?', big: cap(d.mean), say: '', sub: d.alt };
    } else {
      correctLabel = rnd(d.words).w;
      const core = d.root.toLowerCase();
      const pool = [];
      ROOTS.forEach(r => { if (r === d) return; r.words.forEach(w => { if (!w.w.toLowerCase().includes(core)) pool.push(w.w); }); });
      distract = sampleUnique(pool, 3, [correctLabel]);
      prompt = { q: 'Which word is built from this root?', big: d.root, say: d.say, sub: 'means “' + d.mean + '”' };
    }

    const opts = shuffle([{ label: correctLabel, ok: true }, ...distract.map(x => ({ label: x, ok: false }))]);
    return { d, type, prompt, opts };
  }

  function makeRound() {
    let avail = ROOTS.slice();
    if (tier > 0) avail = avail.filter(r => r.t === tier);
    const chosen = shuffle(avail).slice(0, Math.min(ROUND, avail.length));
    questions = chosen.map(buildQuestion);
    qi = 0; score = 0; streak = 0; maxStreak = 0; correct = 0;
  }

  // ── screens ─────────────────────────────────────────────
  function setAccent(d) {
    const P = palOf(d);
    stage.style.setProperty('--qc', P.c1rgb);
    stage.style.setProperty('--qgrad', P.grad);
  }

  function screenStart() {
    stage.style.setProperty('--qgrad', 'linear-gradient(135deg,#34e0a6,#22c3e6,#5b8def)');
    stage.style.setProperty('--qc', '52,224,166');
    const chips = ['All tiers'].concat(TIERS.map(t => t.n));
    stage.innerHTML =
      '<div class="q-card q-start">' +
        '<div class="q-eyebrow"><span class="dot"></span> Root Rush</div>' +
        '<h2 class="q-title">Test your <span class="g">roots.</span></h2>' +
        '<p class="q-sub">' + ROOTS.length + ' roots. ' + ROUND + ' questions a round. Build a combo — every right answer in a row multiplies your score up to <b>8×</b>.</p>' +
        '<div class="q-lvl-label">Choose your level</div>' +
        '<div class="q-chips" id="qChips">' +
          chips.map((c, i) => '<button class="q-chip' + (i === tier ? ' on' : '') + '" data-t="' + i + '">' + c + '</button>').join('') +
        '</div>' +
        '<button class="q-go" id="qGo">Start round ›</button>' +
        '<div class="q-best">Best score · <b>' + best.toLocaleString() + '</b></div>' +
      '</div>';
    stage.querySelector('#qChips').addEventListener('click', (e) => {
      const b = e.target.closest('.q-chip'); if (!b) return;
      tier = parseInt(b.dataset.t, 10);
      stage.querySelectorAll('.q-chip').forEach(c => c.classList.toggle('on', c === b));
    });
    stage.querySelector('#qGo').addEventListener('click', () => { makeRound(); renderQuestion(); });
  }

  function renderQuestion() {
    answered = false;
    const Q = questions[qi];
    setAccent(Q.d);
    const m = mult();
    stage.innerHTML =
      '<div class="q-card q-play">' +
        '<div class="q-hud">' +
          '<span class="q-count">Q ' + (qi + 1) + ' / ' + questions.length + '</span>' +
          '<span class="q-combo' + (streak >= 2 ? ' live' : '') + '" id="qCombo">' + (streak >= 2 ? '🔥 ' + streak + ' streak · ' + m + '×' : 'Combo ready') + '</span>' +
          '<span class="q-score" id="qScore">' + score.toLocaleString() + '</span>' +
        '</div>' +
        '<div class="q-prog"><span style="width:' + (qi / questions.length * 100) + '%"></span></div>' +
        '<div class="q-ask">' + Q.prompt.q + '</div>' +
        '<div class="q-prompt">' +
          '<div class="q-big">' + Q.prompt.big + '</div>' +
          (Q.prompt.say ? '<div class="q-say">' + Q.prompt.say + '</div>' : '') +
          (Q.prompt.sub ? '<div class="q-psub">' + Q.prompt.sub + '</div>' : '') +
        '</div>' +
        '<div class="q-options" id="qOpts">' +
          Q.opts.map((o, i) => '<button class="q-opt" data-i="' + i + '"><span class="q-key">' + (i + 1) + '</span><span class="q-lbl">' + o.label + '</span></button>').join('') +
        '</div>' +
        '<div class="q-foot" id="qFoot"></div>' +
      '</div>';
    stage.querySelector('#qOpts').addEventListener('click', (e) => {
      const b = e.target.closest('.q-opt'); if (!b) return;
      answer(parseInt(b.dataset.i, 10));
    });
  }

  function answer(i) {
    if (answered) return; answered = true;
    const Q = questions[qi];
    const opt = Q.opts[i];
    const btns = stage.querySelectorAll('.q-opt');
    btns.forEach((b, idx) => {
      b.classList.add('done');
      if (Q.opts[idx].ok) b.classList.add('correct');
      else if (idx === i) b.classList.add('wrong');
    });

    const foot = stage.querySelector('#qFoot');
    if (opt.ok) {
      streak++; maxStreak = Math.max(maxStreak, streak);
      const gained = 100 * mult();
      score += gained;
      correct++;
      stage.querySelector('#qScore').textContent = score.toLocaleString();
      const combo = stage.querySelector('#qCombo');
      combo.classList.add('live');
      combo.textContent = '🔥 ' + streak + ' streak · ' + mult() + '×';
      foot.innerHTML = '<span class="q-fb good">+' + gained.toLocaleString() + (mult() > 1 ? ' &nbsp;·&nbsp; ' + mult() + '× combo' : '') + '</span>' + nextBtn();
    } else {
      streak = 0;
      const right = Q.opts.find(o => o.ok).label;
      foot.innerHTML = '<span class="q-fb bad">Nope — it’s <b>' + right + '</b></span>' + nextBtn();
    }
    stage.querySelector('#qNext').addEventListener('click', advance);
  }

  function nextBtn() {
    return '<button class="q-next" id="qNext">' + (qi + 1 >= questions.length ? 'See results ›' : 'Next ›') + '</button>';
  }

  function advance() {
    if (qi + 1 >= questions.length) { screenResult(); return; }
    qi++; renderQuestion();
  }

  function screenResult() {
    const total = questions.length;
    const pct = total ? correct / total : 0;
    let grade = 'D', stars = 1;
    if (pct >= 1)        { grade = 'S'; stars = 5; }
    else if (pct >= 0.9) { grade = 'A'; stars = 4; }
    else if (pct >= 0.75){ grade = 'B'; stars = 3; }
    else if (pct >= 0.6) { grade = 'C'; stars = 2; }
    else                 { grade = 'D'; stars = 1; }

    const isBest = score > best;
    if (isBest) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }

    stage.style.setProperty('--qgrad', grade === 'S' ? 'linear-gradient(135deg,#ffc24d,#ff5c6b)' : 'linear-gradient(135deg,#34e0a6,#22c3e6,#5b8def)');
    stage.style.setProperty('--qc', grade === 'S' ? '255,194,77' : '52,224,166');

    const starRow = '★★★★★☆☆☆☆☆'.slice(5 - stars, 10 - stars);
    stage.innerHTML =
      '<div class="q-card q-result">' +
        '<div class="q-eyebrow"><span class="dot"></span> ' + (tier === 0 ? 'All tiers' : TIERS[tier - 1].n) + '</div>' +
        '<div class="q-grade">' + grade + '</div>' +
        '<div class="q-stars">' + starRow + '</div>' +
        '<div class="q-result-score">' + score.toLocaleString() + (isBest ? ' <span class="q-newbest">NEW BEST</span>' : '') + '</div>' +
        '<div class="q-stats">' +
          '<div><b>' + correct + '/' + total + '</b><span>correct</span></div>' +
          '<div><b>' + maxStreak + '×</b><span>best streak</span></div>' +
          '<div><b>' + Math.round(pct * 100) + '%</b><span>accuracy</span></div>' +
        '</div>' +
        '<div class="q-actions">' +
          '<button class="q-go" id="qAgain">Play again ›</button>' +
          '<button class="q-ghost" id="qLevel">Change level</button>' +
        '</div>' +
      '</div>';
    stage.querySelector('#qAgain').addEventListener('click', () => { makeRound(); renderQuestion(); });
    stage.querySelector('#qLevel').addEventListener('click', screenStart);
  }

  // ── open / close / keys ─────────────────────────────────
  function open() { quiz.classList.add('open'); screenStart(); }
  function close() { quiz.classList.remove('open'); stage.innerHTML = ''; }

  window.addEventListener('keydown', (e) => {
    if (!quiz.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (!answered && /^[1-4]$/.test(e.key)) {
      const b = stage.querySelector('.q-opt[data-i="' + (parseInt(e.key, 10) - 1) + '"]');
      if (b) { e.preventDefault(); answer(parseInt(e.key, 10) - 1); }
    } else if (answered && (e.key === 'Enter' || e.key === ' ')) {
      const n = stage.querySelector('#qNext'); if (n) { e.preventDefault(); n.click(); }
    }
  }, true);

  window.RootRush = { open: open, close: close };
})();

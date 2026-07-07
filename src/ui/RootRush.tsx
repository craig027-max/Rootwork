import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { PALETTES, ROOTS, TIERS, rootId, isRootOpenable, type Root } from '../data/roots';
import type { RunResult } from '../core/stats';

/**
 * Root Rush — the full-screen jewel-themed quiz overlay, ported from the design
 * package (rootwork/ui_kits/rootwork-app/roots-quiz.js). Three question types,
 * combo scoring up to 8×, per-question jewel re-theming, and a graded result
 * screen. Runs only over roots the learner can actually open (Tier 1 free;
 * everything once entitled) and banks stars / accuracy / XP / streak via the
 * store (core/stats) exactly once per finished run.
 */

const ROUND = 10;
const MAX_MULT = 8;
const AUTO_ADVANCE_MS = 900;

/** Mirrors the store's private stats key scheme (src/app/store.ts `statsKey`).
 * store.ts is being edited concurrently, so best-score persistence writes the
 * freshly-recorded stats blob (plus bestScore) back to the same slot here. */
const STATS_STORAGE_PREFIX = 'wondral:stats:v1:';

// ── question building ─────────────────────────────────────────

/** Near-identical meanings that must never appear as rival tiles. */
const SYNONYM_GROUPS: string[][] = [
  ['great', 'huge', 'large'],
  ['feeling', 'feel'],
  ['born', 'birth'],
  ['war', 'fight'],
  ['believe', 'faith'],
  ['lead', 'leader'],
];

const SYNONYM_CANON = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYM_CANON.set(word, group[0]!);
}

/** Canonical form for dedupe: lowercase, synonym groups collapse to one key. */
function canon(label: string): string {
  const k = label.trim().toLowerCase();
  return SYNONYM_CANON.get(k) ?? k;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function rnd<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Draw up to `n` labels that are canonically unique against `exclude` AND each
 * other (fixes the design bug where two tiles could both read "life"). Pools
 * are tried in order, so a tier-scoped pool can fall back to the wider one.
 */
function sampleUnique(pools: readonly string[][], n: number, exclude: readonly string[]): string[] {
  const seen = new Set(exclude.map(canon));
  const out: string[] = [];
  for (const pool of pools) {
    for (const v of shuffle(pool)) {
      const k = canon(v);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(v);
      if (out.length >= n) return out;
    }
  }
  return out;
}

type QuestionType = 'mean' | 'root' | 'word';

interface Option {
  label: string;
  ok: boolean;
}

interface Question {
  root: Root;
  type: QuestionType;
  ask: string;
  big: string;
  say?: string;
  sub?: string;
  opts: Option[];
}

/**
 * Build one question about root `d`. Distractors come from `scoped` (the tiers
 * the player selected AND can access), topping up from `all` (every openable
 * root) only if the scoped pool runs dry.
 */
function buildQuestion(d: Root, scoped: readonly Root[], all: readonly Root[]): Question {
  const type = rnd<QuestionType>(['mean', 'root', 'word']);

  if (type === 'mean') {
    const pools = [scoped, all].map((set) => set.filter((r) => r !== d).map((r) => r.mean));
    const distract = sampleUnique(pools, 3, [d.mean]);
    return {
      root: d,
      type,
      ask: 'What does this root mean?',
      big: d.root,
      say: d.say,
      sub: `from ${d.org}`,
      opts: shuffle([{ label: d.mean, ok: true }, ...distract.map((label) => ({ label, ok: false }))]),
    };
  }

  if (type === 'root') {
    // Exclude roots whose meaning collides with the prompt (canonically), so a
    // second "correct" root can never appear as a distractor.
    const pools = [scoped, all].map((set) =>
      set.filter((r) => r !== d && canon(r.mean) !== canon(d.mean)).map((r) => r.root),
    );
    const distract = sampleUnique(pools, 3, [d.root]);
    return {
      root: d,
      type,
      ask: 'Which root carries this meaning?',
      big: cap(d.mean),
      sub: d.alt,
      opts: shuffle([{ label: d.root, ok: true }, ...distract.map((label) => ({ label, ok: false }))]),
    };
  }

  const correctWord = rnd(d.words).w;
  const core = d.root.toLowerCase();
  const pools = [scoped, all].map((set) => {
    const words: string[] = [];
    for (const r of set) {
      if (r === d) continue;
      for (const w of r.words) {
        if (!w.w.toLowerCase().includes(core)) words.push(w.w);
      }
    }
    return words;
  });
  const distract = sampleUnique(pools, 3, [correctWord]);
  return {
    root: d,
    type,
    ask: 'Which word is built from this root?',
    big: d.root,
    say: d.say,
    sub: `means “${d.mean}”`,
    opts: shuffle([{ label: correctWord, ok: true }, ...distract.map((label) => ({ label, ok: false }))]),
  };
}

// ── accent (jewel re-theming) ─────────────────────────────────

interface Accent {
  qc: string;
  qgrad: string;
}

/** Brand accent for the start screen / non-S results (jade hero gradient). */
const HERO_ACCENT: Accent = { qc: 'var(--jewel-jade-rgb)', qgrad: 'var(--gradient-hero)' };
/** Grade-S celebration accent — gold over --gradient-fire, as the package. */
const FIRE_ACCENT: Accent = { qc: '255,194,77', qgrad: 'var(--gradient-fire)' };

function accentStyle(a: Accent): CSSProperties {
  return { '--qc': a.qc, '--qgrad': a.qgrad } as CSSProperties;
}

// ── best score persistence ────────────────────────────────────

/**
 * Bank a new best combo score onto the persisted stats blob. The store's
 * recordQuizRun doesn't carry the combo score (store.ts is off-limits in this
 * change), so after the run is recorded we merge bestScore into the store's
 * freshly-saved stats and re-persist to the same localStorage slot.
 * Returns true when `score` is a new best.
 */
function persistBestScore(score: number): boolean {
  const s = useWondralStore.getState();
  const prev = s.stats.bestScore ?? 0;
  if (score <= prev) return false;
  const stats = { ...s.stats, bestScore: score };
  useWondralStore.setState({ stats });
  try {
    localStorage.setItem(STATS_STORAGE_PREFIX + (s.activeStudentId ?? 'anon'), JSON.stringify(stats));
  } catch {
    // ignore quota / privacy errors — the in-memory best still applies
  }
  return true;
}

// ── component ─────────────────────────────────────────────────

type Phase = 'start' | 'play' | 'result';

export function RootRush() {
  const entitled = useEntitledForDisplay();
  const setView = useWondralStore((s) => s.setView);
  const recordQuizRun = useWondralStore((s) => s.recordQuizRun);
  const bestScore = useWondralStore((s) => s.stats.bestScore ?? 0);

  const [phase, setPhase] = useState<Phase>('start');
  const [tier, setTier] = useState(0); // 0 = all (accessible) tiers
  const [runSeed, setRunSeed] = useState(0); // fresh question set per run
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [newBestScore, setNewBestScore] = useState(false);
  const recordedRunRef = useRef(-1); // runSeed of the last banked run

  // Every root the learner may open (Tier 1 free; all once entitled) — the
  // quiz never touches locked content, for prompts or distractors.
  const pool = useMemo(() => ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)), [entitled]);
  const avail = useMemo(() => (tier > 0 ? pool.filter((r) => r.t === tier) : pool), [pool, tier]);

  // Question set for the current run — reseeded by `runSeed` so "Play again"
  // always deals a fresh round.
  const questions = useMemo<Question[]>(() => {
    const chosen = shuffle(avail).slice(0, Math.min(ROUND, avail.length));
    return chosen.map((d) => buildQuestion(d, avail, pool));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runSeed reshuffles on purpose
  }, [avail, pool, runSeed]);

  const q = questions[qi];
  const answered = picked !== null;
  const answeredCorrect = answered && q ? (q.opts[picked!]?.ok ?? false) : false;
  const isLast = qi + 1 >= questions.length;
  const mult = Math.min(MAX_MULT, Math.max(1, streak));

  function closeQuiz() {
    setView('home');
  }

  function startRun() {
    setRunSeed((s) => s + 1);
    setQi(0);
    setPicked(null);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setResult(null);
    setNewBestScore(false);
    setPhase('play');
  }

  function answer(idx: number) {
    if (picked !== null || phase !== 'play' || !q) return;
    setPicked(idx);
    if (q.opts[idx]?.ok) {
      const nextStreak = streak + 1;
      const m = Math.min(MAX_MULT, Math.max(1, nextStreak));
      setStreak(nextStreak);
      setMaxStreak((x) => Math.max(x, nextStreak));
      setScore((x) => x + 100 * m);
      setCorrectCount((x) => x + 1);
    } else {
      setStreak(0);
    }
  }

  function advance() {
    if (phase !== 'play' || picked === null) return;
    if (!isLast) {
      setPicked(null);
      setQi((x) => x + 1);
      return;
    }
    // End of the round — bank the run exactly once (state already reflects the
    // final answer by the time the Next click / auto-advance timer fires).
    if (recordedRunRef.current !== runSeed) {
      recordedRunRef.current = runSeed;
      const run = recordQuizRun(correctCount, questions.length);
      setResult(run);
      setNewBestScore(persistBestScore(score));
    }
    setPhase('result');
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeQuiz();
      return;
    }
    if (phase !== 'play') return;
    if (picked === null && /^[1-4]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (q && idx < q.opts.length) {
        e.preventDefault();
        answer(idx);
      }
    } else if (picked !== null && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      advance();
    }
  }

  // "Latest closure" refs — synced after every render so the stable listeners
  // and timers below always see fresh state.
  const advanceRef = useRef(advance);
  const keyRef = useRef(handleKey);
  useEffect(() => {
    advanceRef.current = advance;
    keyRef.current = handleKey;
  });

  // Auto-advance after a correct answer (~900ms) so kids aren't clicking Next
  // on every question. Wrong answers keep the explicit Next button so the
  // correct answer can be read. Enter/Space still skips ahead early.
  useEffect(() => {
    if (phase !== 'play' || picked === null || !answeredCorrect) return;
    const t = window.setTimeout(() => advanceRef.current(), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [phase, picked, qi, answeredCorrect]);

  // Keyboard play: 1–4 answers, Enter/Space advances, Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Jewel re-theming: the overlay's --qc / --qgrad follow the current question's
  // palette (card, bloom, options and buttons all recolor per question).
  let accent: Accent = HERO_ACCENT;
  if (phase === 'play' && q) {
    const P = PALETTES[q.root.pal] ?? PALETTES.green!;
    accent = { qc: P.c1rgb, qgrad: P.grad };
  } else if (phase === 'result' && result?.grade === 'S') {
    accent = FIRE_ACCENT;
  }

  // Not enough accessible roots to quiz — graceful fallback.
  if (pool.length < 4) {
    return (
      <div className="q-rush" style={accentStyle(HERO_ACCENT)} role="dialog" aria-modal="true" aria-label="Root Rush">
        <button className="q-x" onClick={closeQuiz} aria-label="Close quiz">✕</button>
        <div className="q-stage">
          <div className="q-card q-empty">
            <div className="q-eyebrow"><span className="dot" /> Root Rush</div>
            <p>Learn a few roots first, then come back for Root Rush.</p>
            <button className="q-go" onClick={closeQuiz}>Back to learning</button>
          </div>
        </div>
      </div>
    );
  }

  const chips = [
    { t: 0, label: 'All tiers', locked: false },
    ...TIERS.map((tt, i) => ({
      t: i + 1,
      label: tt.n,
      // Same free/paid line the home menu enforces (menu.ts / roots gating).
      locked: (i + 1) !== 1 && !entitled,
    })),
  ];

  return (
    <div className="q-rush" style={accentStyle(accent)} role="dialog" aria-modal="true" aria-label="Root Rush">
      <button className="q-x" onClick={closeQuiz} aria-label="Close quiz">✕</button>
      <div className="q-stage">
        {phase === 'start' ? (
          <div className="q-card q-start">
            <div className="q-eyebrow"><span className="dot" /> Root Rush</div>
            <h2 className="q-title">
              Test your <span className="g">roots.</span>
            </h2>
            <p className="q-sub">
              {avail.length} roots. {Math.min(ROUND, avail.length)} questions a round. Build a combo —
              every right answer in a row multiplies your score up to <b>{MAX_MULT}×</b>.
            </p>
            <div className="q-lvl-label">Choose your level</div>
            <div className="q-chips">
              {chips.map((c) =>
                c.locked ? (
                  <button key={c.label} className="q-chip locked" disabled aria-disabled="true" title="Unlock with Premium">
                    🔒 {c.label}
                  </button>
                ) : (
                  <button
                    key={c.label}
                    className={`q-chip${tier === c.t ? ' on' : ''}`}
                    onClick={() => setTier(c.t)}
                  >
                    {c.label}
                  </button>
                ),
              )}
            </div>
            <button className="q-go" onClick={startRun}>Start round ›</button>
            {bestScore > 0 ? (
              <div className="q-best">
                Best score · <b>{bestScore.toLocaleString()}</b>
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === 'play' && q ? (
          <div className="q-card q-play">
            <div className="q-hud">
              <span className="q-count">
                Q {qi + 1} / {questions.length}
              </span>
              <span className={`q-combo${streak >= 2 ? ' live' : ''}`}>
                {streak >= 2 ? `🔥 ${streak} streak · ${mult}×` : 'Combo ready'}
              </span>
              <span className="q-score">{score.toLocaleString()}</span>
            </div>
            <div className="q-prog">
              <span style={{ width: `${(qi / questions.length) * 100}%` }} />
            </div>
            <div className="q-ask">{q.ask}</div>
            <div className="q-prompt">
              <div className="q-big">{q.big}</div>
              {q.say ? <div className="q-say">{q.say}</div> : null}
              {q.sub ? <div className="q-psub">{q.sub}</div> : null}
            </div>
            <div className="q-options">
              {q.opts.map((o, idx) => {
                let cls = 'q-opt';
                if (answered) {
                  cls += ' done';
                  if (o.ok) cls += ' correct';
                  else if (idx === picked) cls += ' wrong';
                }
                return (
                  <button key={o.label} className={cls} onClick={() => answer(idx)}>
                    <span className="q-key">{idx + 1}</span>
                    <span className="q-lbl">{o.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="q-foot">
              {answered && answeredCorrect ? (
                <span className="q-fb good">
                  +{(100 * mult).toLocaleString()}
                  {mult > 1 ? <> &nbsp;·&nbsp; {mult}× combo</> : null}
                </span>
              ) : null}
              {answered && !answeredCorrect ? (
                <>
                  <span className="q-fb bad">
                    Nope — it&rsquo;s <b>{q.opts.find((o) => o.ok)?.label}</b>
                  </span>
                  <button className="q-next" onClick={advance}>
                    {isLast ? 'See results ›' : 'Next ›'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {phase === 'result' && result ? (
          <div className="q-card q-result">
            <div className="q-eyebrow">
              <span className="dot" /> {tier === 0 ? 'All tiers' : TIERS[tier - 1]?.n}
            </div>
            <div className="q-grade" aria-label={`Grade ${result.grade}`}>
              {result.grade}
            </div>
            <div className="q-stars" aria-label={`${result.stars} of 5 stars`}>
              {'★'.repeat(result.stars)}
              {'☆'.repeat(5 - result.stars)}
            </div>
            <div className="q-result-score">
              {score.toLocaleString()}
              {newBestScore ? <span className="q-newbest">NEW BEST</span> : null}
            </div>
            <div className="q-stats">
              <div>
                <b>
                  {correctCount}/{questions.length}
                </b>
                <span>correct</span>
              </div>
              <div>
                <b>{maxStreak}×</b>
                <span>best streak</span>
              </div>
              <div>
                <b>{result.pct}%</b>
                <span>accuracy</span>
              </div>
            </div>
            <div className="q-actions">
              <button className="q-go" onClick={startRun}>Play again ›</button>
              <button className="q-ghost" onClick={() => setPhase('start')}>Change level</button>
              <button className="q-ghost" onClick={closeQuiz}>Done</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

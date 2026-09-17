import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { PALETTES, ROOTS, TIERS, rootId, isRootOpenable } from '../data/roots';
import {
  dailyNextRoot,
  dailySeed,
  localDayKey,
  pickDailyRoots,
  liveDailyResumeQi,
  shuffleWith,
} from '../core/daily';
import { buildRushQuestion, type RushQuestion } from '../core/rush';
import { recapDeckEntry } from '../core/deckFlow';
import {
  homeRushRecapPreview,
  liveRushRecap,
  rushHoldLine,
  rushMissLine,
  rushRecapChipLabel,
  rushRecapFromRun,
  todayRushRecap,
} from '../core/rushRecap';
import type { RunResult } from '../core/stats';
import { Scene } from './Scene';
import { learnedRootToday, listRushMissRemember, rootLabel } from './home/todayProgress';
import { buildModeEmpty, buildRushResultNext, buildRushStart, learnNextAction } from './modes/modeHandoff';

/**
 * Root Rush — the full-screen jewel-themed quiz overlay, ported from the design
 * package (rootwork/ui_kits/rootwork-app/roots-quiz.js). Three question types,
 * combo scoring up to 8×, per-question jewel re-theming, and a graded result
 * screen. Runs only over roots the learner can actually open (Tier 1 free;
 * everything once entitled) and banks stars / accuracy / XP / streak via the
 * store (core/stats) exactly once per finished run.
 *
 * A live Daily mid-run stays named: start peeks Daily · 2 of 5 · Chron ·
 * time and offers Continue Daily · 3 of 5 — same tap Home / result
 * already use. After Daily + a learn, an owned miss is Remember Geo —
 * Play again still starts Rush, but it is not the fat tap over Geo.
 * Continue {learn} stays when Daily / a learn is still open.
 *
 * A correct tap names the meaning (Yes — Chron means time) then keeps
 * the combo auto-advance. A miss names it too (Nope — Chron means time)
 * so the Next dump is not label-only. Result + start recap this run as
 * Remember chips — hits keep ✓, misses stay Missed. Owned roots hold
 * meaning then Home, never Bio → Geo. A correct owned hit banks today's
 * Remember the same way Daily already does.
 */

const ROUND = 10;
const MAX_MULT = 8;
/** Long enough to read Yes — {root} means {meaning}, still auto (no Next dump). */
const AUTO_ADVANCE_MS = 1600;

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

type Phase = 'start' | 'play' | 'result';

export function RootRush() {
  const entitled = useEntitledForDisplay();
  const setView = useWondralStore((s) => s.setView);
  const openRoot = useWondralStore((s) => s.openRoot);
  const recordQuizRun = useWondralStore((s) => s.recordQuizRun);
  const rememberRushHit = useWondralStore((s) => s.rememberRushHit);
  const rushRecap = useWondralStore((s) => s.rushRecap);
  const stats = useWondralStore((s) => s.stats);
  const completed = useWondralStore((s) => s.completedRoots);
  const progress = useWondralStore((s) => s.progress);
  const dailyRun = useWondralStore((s) => s.dailyRun);
  const studentId = useWondralStore((s) => s.activeStudentId);

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
  const [hits, setHits] = useState<boolean[]>([]);
  const hitsRef = useRef<boolean[]>([]);
  const recordedRunRef = useRef(-1); // runSeed of the last banked run

  // Every root the learner may open (Tier 1 free; all once entitled) — the
  // quiz never touches locked content, for prompts or distractors.
  const pool = useMemo(() => ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)), [entitled]);
  const avail = useMemo(() => (tier > 0 ? pool.filter((r) => r.t === tier) : pool), [pool, tier]);
  const day = localDayKey();
  const dailyRoots = useMemo(
    () => pickDailyRoots(pool, dailySeed(day, studentId)),
    [pool, day, studentId],
  );
  const dailyResumeQi = liveDailyResumeQi(
    dailyRun,
    day,
    studentId,
    dailyRoots.length,
    stats.lastDailyDay,
  );
  const dailyNext = dailyNextRoot(dailyRoots, dailyResumeQi);
  const dailyResume = {
    dailyResumeQi,
    dailyTotal: dailyRoots.length,
    dailyNextName: dailyNext?.root,
    dailyNextMean: dailyNext?.mean,
  };
  const dailyDone = stats.lastDailyDay === day;
  const learnedId = learnedRootToday(progress, day);
  const nextLearn = learnNextAction(completed, entitled);
  const rushToday = todayRushRecap(rushRecap, studentId, day);
  const rushMissIds = listRushMissRemember(rushToday, progress, day, {
    exclude: [learnedId, nextLearn.rootId, ...dailyRoots.map((r) => rootId(r))],
  });
  const rushMissId = rushMissIds[0] ?? null;
  const missRemember = {
    rememberMissId: rushMissId,
    rememberMissName: rootLabel(rushMissId).name,
    rememberAlso: rootLabel(rushMissIds[1]).name,
    dailyDone,
    learnedToday: learnedId !== null,
  };

  // Question set for the current run — reseeded by `runSeed` so "Play again"
  // always deals a fresh round.
  const questions = useMemo<RushQuestion[]>(() => {
    const chosen = shuffleWith(avail).slice(0, Math.min(ROUND, avail.length));
    return chosen.map((d) => buildRushQuestion({ root: d, scoped: avail, all: pool }));
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

  function goLearn(id?: string) {
    if (id) openRoot(id);
    else closeQuiz();
  }

  function openRecap(id: string) {
    openRoot(id, { entry: recapDeckEntry(completed.has(id)) });
  }

  function goPrimary(kind: 'learn' | 'home' | 'daily' | 'remember', id?: string) {
    if (kind === 'daily') {
      setView('daily');
      return;
    }
    if (kind === 'remember') {
      if (id) openRoot(id, { entry: 'remember' });
      else closeQuiz();
      return;
    }
    goLearn(id);
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
    setHits([]);
    hitsRef.current = [];
    setPhase('play');
  }

  function answer(idx: number) {
    if (picked !== null || phase !== 'play' || !q) return;
    setPicked(idx);
    const ok = q.opts[idx]?.ok ?? false;
    setHits((prev) => {
      const next = prev.slice();
      next[qi] = ok;
      hitsRef.current = next;
      return next;
    });
    if (ok) {
      const nextStreak = streak + 1;
      const m = Math.min(MAX_MULT, Math.max(1, nextStreak));
      setStreak(nextStreak);
      setMaxStreak((x) => Math.max(x, nextStreak));
      setScore((x) => x + 100 * m);
      setCorrectCount((x) => x + 1);
      rememberRushHit(rootId(q.root));
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
      const recap = rushRecapFromRun(
        questions.map((item, i) => ({ id: rootId(item.root), ok: hitsRef.current[i] === true })),
        { day, studentId },
      );
      const run = recordQuizRun(correctCount, questions.length, score, recap?.roots);
      setResult(run);
      setNewBestScore(Boolean(run.isNewBestScore));
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

  // Auto-advance after a correct answer so kids aren't clicking Next on every
  // question. 1600ms is long enough to read Yes — {root} means {meaning}.
  // Wrong answers keep the explicit Next button so the correct answer can
  // be read. Enter/Space still skips ahead early.
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
    const empty = buildModeEmpty('rush', completed, entitled);
    return (
      <div className="q-rush" style={accentStyle(HERO_ACCENT)} role="dialog" aria-modal="true" aria-label="Root Rush">
        <button className="q-x" onClick={closeQuiz} aria-label="Close quiz">✕</button>
        <div className="q-stage">
          <div className="q-card q-empty">
            <div className="q-eyebrow"><span className="dot" /> Root Rush</div>
            <p>{empty.lead}</p>
            <button className="q-go q-next-learn" onClick={() => goLearn(empty.primary.rootId)}>
              {empty.primary.label}
            </button>
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
  const lastRush = liveRushRecap(rushRecap, studentId);
  const startPeek = homeRushRecapPreview(lastRush, { dailyResume: dailyResumeQi != null });
  const rushStart = buildRushStart({
    ...stats,
    ...dailyResume,
    ...missRemember,
    completed,
    entitled,
  });
  const rushNext = buildRushResultNext(completed, entitled, { ...dailyResume, ...missRemember });

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
            <button className="q-go" onClick={startRun}>
              {rushStart.goLabel}
            </button>
            {rushStart.recap ? (
              <div className="q-best" role="status">
                {rushStart.recap}
              </div>
            ) : null}
            {startPeek.length > 0 ? (
              <div className="q-daily-chips q-rush-recap q-rush-start-recap">
                {startPeek.map((s) => {
                  const owned = completed.has(s.id);
                  return (
                    <button
                      type="button"
                      className={`q-daily-chip${s.ok ? ' is-done' : ' is-miss'}`}
                      key={s.id}
                      onClick={() => openRecap(s.id)}
                      aria-label={rushRecapChipLabel(s.root, owned, s.ok)}
                    >
                      {s.ok ? (
                        <span className="q-done-mark" aria-hidden="true">
                          ✓
                        </span>
                      ) : null}
                      {s.root}
                      <em>{s.mean}</em>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {rushStart.continueDaily && rushStart.waiting ? (
              <button
                type="button"
                className="q-ghost q-daily-continue"
                onClick={() => goPrimary('daily')}
              >
                <span>{rushStart.continueDaily}</span>
                <em>{rushStart.waiting}</em>
              </button>
            ) : rushStart.rememberMiss && rushStart.rememberPeek ? (
              <button
                type="button"
                className="q-ghost q-daily-continue q-rush-remember"
                onClick={() => goPrimary('remember', rushStart.rememberMissId ?? undefined)}
              >
                <span>{rushStart.rememberMiss}</span>
                <em>{rushStart.rememberPeek}</em>
              </button>
            ) : rushStart.waiting ? (
              <div className="q-daily-wait" role="status">
                {rushStart.waiting}
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
            <div className="q-scene">
              <Scene
                scene={q.root.scene}
                pal={(PALETTES[q.root.pal] ?? PALETTES.green!).pal}
              />
            </div>
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
                  {rushHoldLine(q.root.root, q.root.mean, 100 * mult, mult)}
                </span>
              ) : null}
              {answered && !answeredCorrect ? (
                <>
                  <span className="q-fb bad">
                    {rushMissLine(q.root.root, q.root.mean)}
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
            {rushNext.peek ? (
              <div className={`q-daily-wait${rushNext.missWaiting ? ' is-miss' : ''}`} role="status">
                {rushNext.peek}
              </div>
            ) : null}
            <div className="q-daily-chips q-rush-recap" style={{ marginTop: 22 }}>
              {questions.map((item, i) => {
                const id = rootId(item.root);
                const owned = completed.has(id);
                const hit = hits[i] === true;
                return (
                  <button
                    type="button"
                    className={`q-daily-chip${hit ? ' is-done' : ' is-miss'}`}
                    key={`${item.root.root}-${i}`}
                    onClick={() => openRecap(id)}
                    aria-label={rushRecapChipLabel(item.root.root, owned, hit)}
                  >
                    {hit ? (
                      <span className="q-done-mark" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    {item.root.root}
                    <em>{item.root.mean}</em>
                  </button>
                );
              })}
            </div>
            <div className="q-actions">
              {rushNext.dailyResume || rushNext.missWaiting ? (
                <>
                  <button
                    className={`q-go q-next-learn${rushNext.missWaiting ? ' is-miss' : ''}`}
                    onClick={() => goPrimary(rushNext.primary.kind, rushNext.primary.rootId)}
                  >
                    {rushNext.primary.label}
                  </button>
                  <button className="q-ghost" onClick={startRun}>
                    {rushNext.replayLabel}
                  </button>
                </>
              ) : (
                <>
                  <button className="q-go" onClick={startRun}>
                    {rushNext.replayLabel}
                  </button>
                  <button
                    className="q-go q-next-learn"
                    onClick={() => goPrimary(rushNext.primary.kind, rushNext.primary.rootId)}
                  >
                    {rushNext.primary.label}
                  </button>
                </>
              )}
              <button className="q-ghost" onClick={() => setPhase('start')}>
                {rushNext.changeLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

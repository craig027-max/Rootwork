import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { PALETTES, ROOTS, rootId, isRootOpenable, type Root } from '../data/roots';
import { DAILY_COUNT, dailySeed, localDayKey, pickDailyRoots } from '../core/daily';
import { buildRecall, type RecallBeat } from '../core/recall';
import { Scene } from './Scene';
import { buildDailyDone, buildModeEmpty } from './modes/modeHandoff';

const AUTO_ADVANCE_MS = 800;

type Phase = 'start' | 'play' | 'result';

function palOf(root: Root) {
  return PALETTES[root.pal] ?? PALETTES.green!;
}

/**
 * Daily Challenge — five openable roots for today's local date. Kid-fast:
 * scene on screen, one-beat recall, retry on a miss (teach, don't shame).
 * Finishing banks streak/XP via the store; replays the same day are free.
 */
export function DailyChallenge() {
  const entitled = useEntitledForDisplay();
  const setView = useWondralStore((s) => s.setView);
  const openRoot = useWondralStore((s) => s.openRoot);
  const recordDailyComplete = useWondralStore((s) => s.recordDailyComplete);
  const stats = useWondralStore((s) => s.stats);
  const completed = useWondralStore((s) => s.completedRoots);
  const studentId = useWondralStore((s) => s.activeStudentId);

  const day = localDayKey();
  const doneToday = stats.lastDailyDay === day;

  const pool = useMemo(
    () => ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)),
    [entitled],
  );
  const deal = useMemo(
    () => pickDailyRoots(pool, dailySeed(day, studentId)),
    [pool, day, studentId],
  );

  const [phase, setPhase] = useState<Phase>('start');
  const [qi, setQi] = useState(0);
  const [beat, setBeat] = useState<RecallBeat | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const bankedRef = useRef(false);

  const root = deal[qi];
  const answered = picked !== null;
  const answeredCorrect = answered && beat ? (beat.opts[picked!]?.ok ?? false) : false;
  const isLast = qi + 1 >= deal.length;

  function close() {
    setView('home');
  }

  function goLearn(id?: string) {
    if (id) openRoot(id);
    else close();
  }

  function dealBeat(r: Root) {
    setBeat(buildRecall({ root: r, pool, choices: 3 }));
    setPicked(null);
  }

  function startRun() {
    if (!deal[0]) return;
    bankedRef.current = false;
    setQi(0);
    dealBeat(deal[0]);
    setPhase('play');
  }

  function finish() {
    if (!bankedRef.current) {
      bankedRef.current = true;
      recordDailyComplete();
    }
    setPhase('result');
  }

  function answer(idx: number) {
    if (picked !== null || phase !== 'play' || !beat) return;
    setPicked(idx);
  }

  function retry() {
    if (!root) return;
    dealBeat(root);
  }

  function advance() {
    if (phase !== 'play' || picked === null || !answeredCorrect) return;
    if (!isLast) {
      const next = qi + 1;
      setQi(next);
      const n = deal[next];
      if (n) dealBeat(n);
      return;
    }
    finish();
  }

  const advanceRef = useRef(advance);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (phase !== 'play' || !beat) return;
    if (picked === null && /^[1-4]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (idx < beat.opts.length) {
        e.preventDefault();
        answer(idx);
      }
    } else if (picked !== null && !answeredCorrect && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      retry();
    }
  }

  useEffect(() => {
    advanceRef.current = advance;
    keyRef.current = handleKey;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (phase !== 'play' || picked === null || !answeredCorrect) return;
    const t = window.setTimeout(() => advanceRef.current(), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [phase, picked, qi, answeredCorrect]);

  if (deal.length === 0) {
    const empty = buildModeEmpty('daily', completed, entitled);
    return (
      <div className="q-rush q-daily" role="dialog" aria-modal="true" aria-label="Daily Challenge">
        <button className="q-x" onClick={close} aria-label="Close daily">
          ✕
        </button>
        <div className="q-stage">
          <div className="q-card q-empty">
            <div className="q-eyebrow">
              <span className="dot" /> Daily Challenge
            </div>
            <p>{empty.lead}</p>
            <button className="q-go" onClick={() => goLearn(empty.primary.rootId)}>
              {empty.primary.label}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const streakNow = stats.streakCurrent;
  const p = root ? palOf(root) : palOf(deal[0]!);
  const showDoneLanding = (phase === 'start' && doneToday) || phase === 'result';
  const done = buildDailyDone({
    deal,
    streak: stats.streakCurrent,
    justFinished: phase === 'result',
    completed,
    entitled,
  });

  return (
    <div
      className="q-rush q-daily"
      style={{ '--qc': p.c1rgb, '--qgrad': p.grad } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="Daily Challenge"
    >
      <button className="q-x" onClick={close} aria-label="Close daily">
        ✕
      </button>
      <div className="q-stage">
        {phase === 'start' && !doneToday ? (
          <div className="q-card q-start">
            <div className="q-eyebrow">
              <span className="dot" /> Daily Challenge
            </div>
            <h2 className="q-title">
              Today&rsquo;s <span className="g">five.</span>
            </h2>
            <p className="q-sub">
              {deal.length} fresh roots for {day}. See the animation, tap the meaning, keep your
              streak{streakNow > 0 ? ` — you&rsquo;re on 🔥 ${streakNow}` : ''}.
            </p>
            <div className="q-daily-chips">
              {deal.map((r) => (
                <span className="q-daily-chip" key={r.root}>
                  {r.root}
                  <em>{r.mean}</em>
                </span>
              ))}
            </div>
            <button className="q-go" onClick={startRun}>
              {`Start daily · ${Math.min(DAILY_COUNT, deal.length)} roots ›`}
            </button>
          </div>
        ) : null}

        {phase === 'play' && root && beat ? (
          <div className="q-card q-play">
            <div className="q-hud">
              <span className="q-count">
                {qi + 1} / {deal.length}
              </span>
              <span className="q-combo">Daily</span>
              <span className="q-score">{root.root}</span>
            </div>
            <div className="q-prog">
              <span style={{ width: `${(qi / deal.length) * 100}%` }} />
            </div>
            <div className="q-scene">
              <Scene scene={root.scene} pal={p.pal} />
            </div>
            <div className="q-ask">{beat.ask}</div>
            <div className="q-prompt">
              <div className="q-big">{root.root}</div>
              <div className="q-say">{root.say}</div>
              <div className="q-psub">from {root.org}</div>
            </div>
            <div className="q-options">
              {beat.opts.map((o, idx) => {
                let cls = 'q-opt';
                if (answered) {
                  cls += ' done';
                  if (o.ok && answeredCorrect) cls += ' correct';
                  else if (idx === picked && !o.ok) cls += ' wrong';
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
                <span className="q-fb good">Nice — {root.root} is yours.</span>
              ) : null}
              {answered && !answeredCorrect ? (
                <>
                  <span className="q-fb q-teach">{beat.teach}</span>
                  <button className="q-next" onClick={retry}>
                    Try again ›
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {showDoneLanding ? (
          <div className="q-card q-result">
            <div className="q-eyebrow">
              <span className="dot" /> Daily Challenge
            </div>
            <div className="q-grade" aria-label="Daily complete">
              ✓
            </div>
            {done.title ? <h2 className="q-done-title">{done.title}</h2> : null}
            <div className="q-stars" aria-label={done.streakLine}>
              {done.streakLine}
            </div>
            <p className="q-sub" role="status" style={{ margin: '18px auto 0', textAlign: 'center' }}>
              {done.sub}
            </p>
            <div className="q-daily-chips" style={{ marginTop: 22 }}>
              {deal.map((r) => (
                <button
                  type="button"
                  className={`q-daily-chip${done.recapDone ? ' is-done' : ''}`}
                  key={r.root}
                  onClick={() => openRoot(rootId(r))}
                >
                  {done.recapDone ? (
                    <span className="q-done-mark" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                  {r.root}
                  <em>{r.mean}</em>
                </button>
              ))}
            </div>
            <div className="q-actions">
              <button className="q-go q-next-learn" onClick={() => goLearn(done.primary.rootId)}>
                {done.primary.label}
              </button>
              <button className="q-ghost" onClick={startRun}>
                {done.replayLabel}
              </button>
              <button className="q-ghost" onClick={close}>
                {done.homeLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
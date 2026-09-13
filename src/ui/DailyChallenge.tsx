import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { PALETTES, ROOTS, ROOTS_BY_ID, rootId, isRootOpenable, type Root } from '../data/roots';
import {
  DAILY_COUNT,
  afterDailyNextLabel,
  continueDailyLabel,
  dailyHoldContinueLine,
  dailyHoldLine,
  dailyHoldNextLine,
  dailySeed,
  liveDailyResumeQi,
  localDayKey,
  pickDailyRoots,
} from '../core/daily';
import { buildRecall, type RecallBeat } from '../core/recall';
import { Scene } from './Scene';
import { recapDeckEntry } from '../core/deckFlow';
import { buildDailyDone, buildModeEmpty, learnNextAction } from './modes/modeHandoff';

type Phase = 'start' | 'play' | 'result';

function palOf(root: Root) {
  return PALETTES[root.pal] ?? PALETTES.green!;
}

/**
 * Daily Challenge — five openable roots for today's local date. Kid-fast:
 * scene on screen, one-beat recall, retry on a miss (teach, don't shame).
 * A correct tap holds the meaning until Next — no 800ms dump onto Photo —
 * and peeks the next root (Next · Aqua · water) so Next is not unnamed.
 * Leaving mid-run persists the next unanswered root so Home can say
 * Continue Daily · 3 of 5. An owned hit is today's Remember; the first
 * hit banks play-today. Last hold peeks Continue · next learn. Done
 * recap chips open owned roots as Remember — not the Geo quiz loop.
 * Finishing banks Daily XP; replays are free.
 */
export function DailyChallenge() {
  const entitled = useEntitledForDisplay();
  const setView = useWondralStore((s) => s.setView);
  const openRoot = useWondralStore((s) => s.openRoot);
  const recordDailyComplete = useWondralStore((s) => s.recordDailyComplete);
  const saveDailyRun = useWondralStore((s) => s.saveDailyRun);
  const clearDailyRun = useWondralStore((s) => s.clearDailyRun);
  const dailyRun = useWondralStore((s) => s.dailyRun);
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
  const resumeQi = liveDailyResumeQi(dailyRun, day, studentId, deal.length, stats.lastDailyDay);

  const [phase, setPhase] = useState<Phase>(() => (resumeQi != null ? 'play' : 'start'));
  const [qi, setQi] = useState(() => resumeQi ?? 0);
  const [beat, setBeat] = useState<RecallBeat | null>(() => {
    if (resumeQi == null) return null;
    const r = deal[resumeQi];
    return r ? buildRecall({ root: r, pool, choices: 3 }) : null;
  });
  const [picked, setPicked] = useState<number | null>(null);
  const bankedRef = useRef(false);

  const root = deal[qi];
  const resumeRoot = resumeQi != null ? deal[resumeQi] : undefined;
  const answered = picked !== null;
  const answeredCorrect = answered && beat ? (beat.opts[picked!]?.ok ?? false) : false;
  const isLast = qi + 1 >= deal.length;
  const nextHold = !isLast ? deal[qi + 1] : undefined;
  const nextLearn = learnNextAction(completed, entitled);
  const continueHold =
    !nextHold && nextLearn.kind === 'learn' && nextLearn.rootName
      ? dailyHoldContinueLine(
          nextLearn.rootName,
          nextLearn.rootId ? ROOTS_BY_ID[nextLearn.rootId]?.mean : undefined,
        )
      : null;

  function close() {
    setView('home');
  }

  function goLearn(id?: string) {
    if (id) openRoot(id);
    else close();
  }

  function openRecap(r: Root) {
    const id = rootId(r);
    openRoot(id, { entry: recapDeckEntry(completed.has(id)) });
  }

  function dealBeat(r: Root) {
    setBeat(buildRecall({ root: r, pool, choices: 3 }));
    setPicked(null);
  }

  function startRun() {
    const startAt = resumeQi ?? 0;
    const first = deal[startAt];
    if (!first) return;
    bankedRef.current = false;
    setQi(startAt);
    dealBeat(first);
    setPhase('play');
  }

  function bankIfNeeded() {
    if (bankedRef.current || doneToday) return;
    bankedRef.current = true;
    recordDailyComplete();
    clearDailyRun();
  }

  function finish() {
    bankIfNeeded();
    setPhase('result');
  }

  function answer(idx: number) {
    if (picked !== null || phase !== 'play' || !beat) return;
    setPicked(idx);
    const ok = beat.opts[idx]?.ok ?? false;
    if (!ok || doneToday || !root) return;
    const hitId = rootId(root);
    if (qi + 1 >= deal.length) {
      if (!bankedRef.current) {
        bankedRef.current = true;
        recordDailyComplete(hitId);
      }
      return;
    }
    saveDailyRun(qi + 1, hitId);
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
    } else if (picked !== null && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (answeredCorrect) advance();
      else retry();
    }
  }

  useEffect(() => {
    keyRef.current = handleKey;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
              Today&rsquo;s <span className="g">{resumeQi != null ? 'next.' : 'five.'}</span>
            </h2>
            <p className="q-sub">
              {resumeQi != null && resumeRoot
                ? `${resumeQi} of ${deal.length} already yours. Next is ${resumeRoot.root} — ${resumeRoot.mean}.`
                : `${deal.length} fresh roots for ${day}. See the animation, tap the meaning, keep your streak${streakNow > 0 ? ` — you&rsquo;re on 🔥 ${streakNow}` : ''}.`}
            </p>
            <div className="q-daily-chips">
              {(resumeQi != null ? deal.slice(resumeQi) : deal).map((r) => (
                <span className="q-daily-chip" key={r.root}>
                  {r.root}
                  <em>{r.mean}</em>
                </span>
              ))}
            </div>
            <button className="q-go" onClick={startRun}>
              {resumeQi != null
                ? continueDailyLabel(resumeQi, deal.length)
                : `Start daily · ${Math.min(DAILY_COUNT, deal.length)} roots ›`}
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
                <>
                  <div className="q-hold">
                    <span className="q-fb good">{dailyHoldLine(root.root, root.mean)}</span>
                    {nextHold ? (
                      <span className="q-fb q-next-peek">
                        {dailyHoldNextLine(nextHold.root, nextHold.mean)}
                      </span>
                    ) : continueHold ? (
                      <span className="q-fb q-next-peek">{continueHold}</span>
                    ) : null}
                  </div>
                  <button className="q-next" onClick={advance}>
                    {afterDailyNextLabel(isLast)}
                  </button>
                </>
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
                  onClick={() => openRecap(r)}
                  aria-label={`Remember ${r.root}`}
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
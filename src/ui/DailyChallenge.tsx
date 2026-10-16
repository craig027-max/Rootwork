import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { PALETTES, ROOTS, ROOTS_BY_ID, rootId, isRootOpenable, type Root } from '../data/roots';
import {
  DAILY_COUNT,
  afterDailyNextLabel,
  continueDailyLabel,
  dailyHoldContinueLine,
  dailyHoldKeepGoingLine,
  dailyHoldLine,
  dailyHoldNextLine,
  dailyHoldRememberLine,
  dailyRecapChipLabel,
  dailySeed,
  layoutDailyAsked,
  liveDailyResumeQi,
  localDayKey,
  pickDailyRoots,
  stampDailyAsked,
  type DailyAskedChip,
} from '../core/daily';
import { buildRecall, type RecallBeat } from '../core/recall';
import { Scene } from './Scene';
import { findSuccessLine, recapDeckEntry } from '../core/deckFlow';
import { buildBig, buildYesLine, partYesLine, wordYesLine } from '../core/wordParts';
import { questionHudName } from './deck/deckQuizHero';
import { recallAskedChip, todayRushRecap } from '../core/rushRecap';
import {
  buildDailyDone,
  buildModeEmpty,
  learnNextAction,
  overlayCloseLabel,
  rushMissRememberReady,
  type ModeCta,
} from './modes/modeHandoff';
import { learnedRootToday, listRushMissRemember, rootLabel } from './home/todayProgress';
import { samplePeekLabel } from './home/samplePeek';

type Phase = 'start' | 'play' | 'result';

function palOf(root: Root) {
  return PALETTES[root.pal] ?? PALETTES.green!;
}

function askedChipFor(root: Root, beat: RecallBeat): DailyAskedChip {
  const asked = recallAskedChip(root, beat);
  return { root: root.root, title: asked.title, sub: asked.sub };
}

/**
 * Daily Challenge — five openable roots for today's local date. Kid-fast:
 * scene on screen, one-beat recall, retry on a miss (teach, don't shame).
 * Try again asks that same question again — not a different word.
 * A correct tap holds the meaning until Next — no 800ms dump onto Photo —
 * and peeks the next root (Next · Aqua · water) so Next is not unnamed.
 * Leaving mid-run persists the next unanswered root so Home can say
 * Continue Daily · 3 of 5. An owned hit is today's Remember; the first
 * hit banks play-today. Last hold peeks Continue · next learn — or Keep
 * going when today's learn is already done. Done copy recaps today's
 * five — not a fresh-start pitch. Recap chips Remember owned roots and
 * Meet unowned ones — not the Geo quiz loop. The done fat tap matches
 * Today: Continue {learn}, Keep going, Rush, or Remember {miss} when
 * a Rush miss is still waiting. Last hold peeks that same Remember —
 * Keep going must not sit over Geo. Done title / Home Daily lead
 * match that same name — Done for today / Streak banked / the giant
 * ✓ must not sit over Geo. Home Daily now matches — Daily / DONE /
 * Done for today / the 🔥 streak must not sit over Geo. Daily peek
 * chips now match — today's five ✓ / Chron / Photo / Aqua must
 * not sit over Geo under a Remember title. Overlay eyebrows now
 * match — Daily Challenge must not sit over Geo under that same
 * title. Rush peek chips now match — last-run Photo ✓ / Bio ✓
 * must not sit over Geo under that same title. Overlay close
 * now matches — Close daily must not sit over Geo under
 * that same title. Daily Home ghost now matches —
 * Home must not sit over Geo under that same title.
 * Rush / Deck Home now matches — Home → must not
 * sit over Geo under that same title.
 * The result list names the question — Biography, not Bio / life.
 * Opening Daily again today keeps that list. Remember chips stay
 * on the root. Home still names the five roots.
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
  const rushRecap = useWondralStore((s) => s.rushRecap);
  const stats = useWondralStore((s) => s.stats);
  const completed = useWondralStore((s) => s.completedRoots);
  const progress = useWondralStore((s) => s.progress);
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

  const [boot] = useState(() => {
    const resumeAt = resumeQi;
    let nextBeat: RecallBeat | null = null;
    let current: DailyAskedChip | null = null;
    if (resumeAt != null) {
      const r = deal[resumeAt];
      if (r) {
        nextBeat = buildRecall({ root: r, pool, choices: 3 });
        current = askedChipFor(r, nextBeat);
      }
    }
    const saved = dailyRun?.day === day ? dailyRun.asked : undefined;
    return {
      beat: nextBeat,
      asked: layoutDailyAsked(deal.length, {
        saved,
        resumeAt,
        current,
        done: doneToday && resumeAt == null,
      }),
    };
  });
  const [phase, setPhase] = useState<Phase>(() => (resumeQi != null ? 'play' : 'start'));
  const [qi, setQi] = useState(() => resumeQi ?? 0);
  const [beat, setBeat] = useState<RecallBeat | null>(boot.beat);
  const [played, setPlayed] = useState<(DailyAskedChip | null)[]>(boot.asked);
  const [picked, setPicked] = useState<number | null>(null);
  const bankedRef = useRef(false);

  const root = deal[qi];
  const playHud =
    root && beat
      ? questionHudName({
          root: root.root,
          mean: root.mean,
          kind: beat.kind,
          word: beat.word,
          part: beat.part,
          split: beat.split,
        })
      : null;
  const resumeRoot = resumeQi != null ? deal[resumeQi] : undefined;
  const answered = picked !== null;
  const answeredCorrect = answered && beat ? (beat.opts[picked!]?.ok ?? false) : false;
  const isLast = qi + 1 >= deal.length;
  const nextHold = !isLast ? deal[qi + 1] : undefined;
  const nextLearn = learnNextAction(completed, entitled);
  const learnedId = learnedRootToday(progress, day);
  const learnedToday = learnedId !== null;
  const rushToday = todayRushRecap(rushRecap, studentId, day);
  const rushMissIds = listRushMissRemember(rushToday, progress, day, {
    exclude: [learnedId, nextLearn.rootId, ...deal.map((r) => rootId(r))],
  });
  const rushMissId = rushMissIds[0] ?? null;
  const remember = rootLabel(rushMissId);
  const rememberAlso = rootLabel(rushMissIds[1]).name;
  const nextLearnMean = nextLearn.rootId ? ROOTS_BY_ID[nextLearn.rootId]?.mean : undefined;
  const lastHoldMiss = !nextHold
    ? rushMissRememberReady(completed, entitled, {
        rememberMissId: rushMissId,
        rememberMissName: remember.name,
        rememberAlso,
        dailyDone: true,
        learnedToday,
      })
    : null;
  const continueHold = lastHoldMiss
    ? dailyHoldRememberLine(lastHoldMiss.name, remember.mean)
    : !nextHold && nextLearn.kind === 'learn' && nextLearn.rootName
      ? learnedToday
        ? dailyHoldKeepGoingLine(nextLearn.rootName, nextLearnMean)
        : dailyHoldContinueLine(nextLearn.rootName, nextLearnMean)
      : null;

  function close() {
    setView('home');
  }

  function goLearn(id?: string) {
    if (id) openRoot(id);
    else close();
  }

  function goPrimary(cta: ModeCta) {
    if (cta.kind === 'rush') {
      setView('quiz');
      return;
    }
    if (cta.kind === 'daily') {
      setView('daily');
      return;
    }
    if (cta.kind === 'remember' && cta.rootId) {
      openRoot(cta.rootId, { entry: 'remember' });
      return;
    }
    goLearn(cta.rootId);
  }

  function openRecap(r: Root) {
    const id = rootId(r);
    openRoot(id, { entry: recapDeckEntry(completed.has(id)) });
  }

  function dealBeat(r: Root, index: number, opts?: { reset?: boolean }) {
    const next = buildRecall({ root: r, pool, choices: 3 });
    const chip = askedChipFor(r, next);
    setBeat(next);
    setPicked(null);
    setPlayed((prev) => stampDailyAsked(opts?.reset ? [] : prev, index, chip, deal.length));
  }

  function startRun() {
    const startAt = resumeQi ?? 0;
    const first = deal[startAt];
    if (!first) return;
    bankedRef.current = false;
    setQi(startAt);
    dealBeat(first, startAt, { reset: true });
    setPhase('play');
  }

  function bankIfNeeded() {
    if (bankedRef.current || doneToday) return;
    bankedRef.current = true;
    clearDailyRun();
    recordDailyComplete(undefined, played);
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
    const nextAsked = stampDailyAsked(played, qi, askedChipFor(root, beat), deal.length);
    setPlayed(nextAsked);
    if (qi + 1 >= deal.length) {
      if (!bankedRef.current) {
        bankedRef.current = true;
        recordDailyComplete(hitId, nextAsked);
      }
      return;
    }
    saveDailyRun(qi + 1, hitId, nextAsked);
  }

  function retry() {
    setPicked(null);
  }

  function advance() {
    if (phase !== 'play' || picked === null || !answeredCorrect) return;
    if (!isLast) {
      const next = qi + 1;
      setQi(next);
      const n = deal[next];
      if (n) dealBeat(n, next);
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
        <button className="q-x" onClick={close} aria-label={overlayCloseLabel('daily')}>
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
    learnedToday,
    rememberMissId: rushMissId,
    rememberMissName: remember.name,
    rememberAlso,
  });
  const showAsked =
    showDoneLanding && !done.missWaiting && played.some((chip) => Boolean(chip?.title));

  return (
    <div
      className="q-rush q-daily"
      style={{ '--qc': p.c1rgb, '--qgrad': p.grad } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={done.missWaiting && showDoneLanding ? 'Remember' : 'Daily Challenge'}
    >
      <button
        className={`q-x${done.missWaiting && showDoneLanding ? ' is-miss' : ''}`}
        onClick={close}
        aria-label={done.missWaiting && showDoneLanding ? done.closeLabel : overlayCloseLabel('daily')}
      >
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
              <span
                className={`q-score${playHud?.quiz ? ' is-quiz' : ''}${playHud?.long ? ' is-long' : ''}`}
              >
                {playHud?.name ?? root.root}
              </span>
            </div>
            <div className="q-prog">
              <span style={{ width: `${(qi / deal.length) * 100}%` }} />
            </div>
            <div className="q-scene">
              <Scene scene={root.scene} pal={p.pal} />
            </div>
            <div
              className={`q-ask${beat.kind === 'gloss' ? ' is-gloss' : ''}${
                beat.kind === 'part' ? ' is-part' : ''
              }${beat.kind === 'build' ? ' is-build' : ''}`}
            >
              {beat.ask}
            </div>
            <div className="q-prompt">
              <div
                className={`q-big${beat.kind === 'gloss' ? ' is-gloss' : ''}${
                  beat.kind === 'part' ? ' is-part' : ''
                }${beat.kind === 'build' ? ' is-build' : ''}${
                  (beat.kind === 'gloss' && (beat.word?.length ?? 0) >= 14) ||
                  (beat.kind === 'part' && (beat.part?.length ?? 0) >= 9) ||
                  (beat.kind === 'build' && buildBig(beat.split ?? '').length >= 14)
                    ? ' is-long'
                    : ''
                }`}
              >
                {beat.kind === 'gloss' && beat.word
                  ? beat.word
                  : beat.kind === 'part' && beat.part
                    ? beat.part
                    : beat.kind === 'build' && beat.split
                      ? buildBig(beat.split)
                      : root.root}
              </div>
              {beat.kind === 'gloss' ? (
                <div className="q-psub">
                  from {root.root} · {root.mean}
                </div>
              ) : beat.kind === 'part' && beat.word ? (
                <div className="q-psub">in {beat.word}</div>
              ) : beat.kind === 'build' ? null : (
                <>
                  <div className="q-say">{root.say}</div>
                  <div className="q-psub">from {root.org}</div>
                </>
              )}
            </div>
            <div className="q-options">
              {beat.opts.map((o, idx) => {
                let cls = 'q-opt';
                if (beat.kind === 'gloss') cls += ' is-gloss';
                if (answered) {
                  cls += ' done';
                  if (o.ok) cls += ' correct';
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
                    <span
                      className={`q-fb good${beat.kind === 'gloss' ? ' is-gloss' : ''}${
                        beat.kind === 'build' ? ' is-build' : ''
                      }${beat.kind === 'word' ? ' is-word' : ''}`}
                    >
                      {beat.kind === 'part' && beat.part && beat.partMean
                        ? partYesLine(beat.part, beat.partMean)
                        : beat.kind === 'gloss' && beat.word && beat.gloss
                          ? findSuccessLine(beat.word, beat.gloss)
                          : beat.kind === 'build' && beat.word && beat.split
                            ? buildYesLine(beat.word, beat.split)
                            : beat.kind === 'word' && beat.word
                              ? wordYesLine(beat.word, beat.split)
                              : dailyHoldLine(root.root, root.mean)}
                    </span>
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
            <div className={`q-eyebrow${done.missWaiting ? ' is-miss' : ''}`}>
              <span className="dot" /> {done.eyebrow}
            </div>
            {done.celebrateDone ? (
              <div className="q-grade" aria-label="Daily complete">
                ✓
              </div>
            ) : null}
            {done.title ? (
              <h2 className={`q-done-title${done.missWaiting ? ' is-miss' : ''}`}>{done.title}</h2>
            ) : null}
            {done.streakLine ? (
              <div className={`q-stars${done.missWaiting ? ' is-miss' : ''}`} aria-label={done.streakLine}>
                {done.streakLine}
              </div>
            ) : null}
            <p className="q-sub" role="status" style={{ margin: '18px auto 0', textAlign: 'center' }}>
              {done.sub}
            </p>
            {done.peek ? (
              <div className={`q-daily-wait${done.missWaiting ? ' is-miss' : ''}`} role="status">
                {done.peek}
              </div>
            ) : null}
            <div
              className={`q-daily-chips${showAsked ? ' q-daily-asked' : ''}`}
              style={{ marginTop: 22 }}
            >
              {done.recap.map((chip, i) => {
                const r = ROOTS.find((root) => root.root === chip.root);
                if (!r) return null;
                const chipMiss = chip.ok === false;
                const asked = showAsked ? played.find((item) => item?.root === r.root) : null;
                const title = asked?.title || r.root;
                const sub = asked?.sub || chip.mean || r.mean;
                return (
                  <button
                    type="button"
                    className={`q-daily-chip${done.recapDone && !chipMiss ? ' is-done' : ''}${
                      chipMiss ? ' is-miss' : ''
                    }${title.length >= 14 ? ' is-long' : ''}`}
                    key={`${r.root}-${i}`}
                    onClick={() => openRecap(r)}
                    aria-label={
                      chipMiss
                        ? samplePeekLabel('remember', r.root, { ok: false })
                        : dailyRecapChipLabel(title, completed.has(rootId(r)))
                    }
                  >
                    {done.recapDone && !chipMiss ? (
                      <span className="q-done-mark" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    {chipMiss ? (
                      <span className="q-done-mark is-miss" aria-hidden="true">
                        !
                      </span>
                    ) : null}
                    {title}
                    {sub ? <em>{sub}</em> : null}
                  </button>
                );
              })}
            </div>
            <div className="q-actions">
              <button
                className={`q-go q-next-learn${done.missWaiting ? ' is-miss' : ''}`}
                onClick={() => goPrimary(done.primary)}
              >
                {done.primary.label}
              </button>
              <button className="q-ghost" onClick={startRun}>
                {done.replayLabel}
              </button>
              <button
                className={`q-ghost${done.missWaiting ? ' is-miss' : ''}`}
                onClick={close}
              >
                {done.homeLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
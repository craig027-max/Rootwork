import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import {
  ROOTS,
  ROOTS_BY_ID,
  TIERS,
  PALETTES,
  rootId,
  isRootOpenable,
  neighborOpenable,
  type Root,
} from '../data/roots';
import {
  afterCorrectRecall,
  afterHearNextTap,
  afterYesNextLabel,
  allowManualStep,
  allowNextRootTap,
  allowWinNextTap,
  clipListening,
  commitCorrectAdvance,
  isLessonStudying,
  showExampleWords,
  winLineOnCard,
  type AfterCorrectRecall,
} from '../core/deckFlow';
import { buildRecall, type RecallBeat } from '../core/recall';
import {
  hearBeatChips,
  hearBeatIndex,
  hearBeatLabels,
  hearBeatSplits,
} from '../core/hearBeats';
import {
  currentClipTime,
  hasActiveClip,
  isClipPlaying,
  speakRoot,
  speakYes,
  stopSpeaking,
  whenCurrentClipEnds,
} from '../core/speak';
import { hasChosenMode, isNextPlayHome } from './home/menu';
import { paletteVars } from './components/styleVars';
import { Scene } from './Scene';
import { SCENE_EMOJI } from './scenes';
import { Badge } from './components/Badge';
import { Button } from './components/Button';
import { DeckNav } from './deck/DeckNav';
import { RootIndex } from './deck/RootIndex';
import { splitForOpenWord, toggleOpenWord } from './wordSplit';

function palOf(root: Root) {
  return PALETTES[root.pal] ?? PALETTES.green!;
}

/** Render an example word with its root letters wrapped in the jewel-gradient .hl span. */
function highlight(word: string, hl: string): ReactNode {
  if (!hl) return word;
  const i = word.toLowerCase().indexOf(hl.toLowerCase());
  if (i < 0) return word;
  return (
    <>
      {word.slice(0, i)}
      <span className="hl">{word.slice(i, i + hl.length)}</span>
      {word.slice(i + hl.length)}
    </>
  );
}

export function Deck() {
  const currentRootId = useWondralStore((s) => s.currentRootId);
  const completed = useWondralStore((s) => s.completedRoots);
  const stats = useWondralStore((s) => s.stats);
  const completeRoot = useWondralStore((s) => s.completeRoot);
  const openRoot = useWondralStore((s) => s.openRoot);
  const closeRoot = useWondralStore((s) => s.closeRoot);
  const dismissCelebration = useWondralStore((s) => s.dismissCelebration);
  const setView = useWondralStore((s) => s.setView);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const deckEntry = useWondralStore((s) => s.deckEntry);
  const correctAdvance = useWondralStore((s) => s.correctAdvance);
  const beginCorrectAdvance = useWondralStore((s) => s.beginCorrectAdvance);
  const entitled = useEntitledForDisplay();

  const [indexOpen, setIndexOpen] = useState(false);
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [hearFinished, setHearFinished] = useState(false);
  const [listening, setListening] = useState(false);
  const [listenKind, setListenKind] = useState<'hear' | 'yes' | null>(null);
  const [hearBeat, setHearBeat] = useState<0 | 1 | 2>(0);
  const hearGen = useRef(0);
  const [recall, setRecall] = useState<{
    beat: RecallBeat;
    picked: number | null;
    win: string | null;
    rootId: string;
  } | null>(null);
  const pool = useMemo(
    () => ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)),
    [entitled],
  );
  const poolRef = useRef(pool);
  poolRef.current = pool;

  function fireAdvance(dest: AfterCorrectRecall) {
    // Cut leftover Yes audio so Geo/Photo cannot speak over Bio.
    if (isClipPlaying()) stopSpeaking();
    useWondralStore.getState().clearCorrectAdvance();
    const next = commitCorrectAdvance(dest);
    if (next.kind === 'open') useWondralStore.getState().openRoot(next.id, { entry: next.entry });
    else useWondralStore.getState().closeRoot();
  }

  useEffect(() => {
    setOpenWord(null);
    hearGen.current += 1;
    setHearFinished(false);
    setListening(false);
    setListenKind(null);
    setHearBeat(0);
  }, [currentRootId]);

  useEffect(() => {
    if (!listening || listenKind !== 'hear' || !currentRootId) return;
    const opened = ROOTS_BY_ID[currentRootId];
    if (!opened) return;
    const splits = hearBeatSplits(opened.root);
    if (!splits) return;
    const gen = hearGen.current;
    const tick = () => {
      if (hearGen.current !== gen) return;
      const t = currentClipTime();
      if (t == null) return;
      setHearBeat(hearBeatIndex(t, splits));
    };
    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [listening, listenKind, currentRootId]);

  useLayoutEffect(() => {
    const opened = currentRootId ? ROOTS_BY_ID[currentRootId] : undefined;
    if (!opened || !currentRootId) {
      setRecall(null);
      return;
    }
    const live = useWondralStore.getState().correctAdvance;
    if (live && live.fromId === currentRootId) {
      setRecall((prev) =>
        prev?.win && prev.rootId === currentRootId
          ? prev
          : {
              beat: prev?.beat ?? { kind: 'mean', ask: '', opts: [], teach: '' },
              picked: prev?.picked ?? 0,
              win: live.dest.line,
              rootId: currentRootId,
            },
      );
      return;
    }
    if (deckEntry === 'recall') {
      setRecall((prev) =>
        prev && prev.rootId === currentRootId
          ? prev
          : {
              beat: buildRecall({ root: opened, pool: poolRef.current, choices: 3 }),
              picked: null,
              win: null,
              rootId: currentRootId,
            },
      );
      return;
    }
    setRecall(null);
  }, [currentRootId, deckEntry]);

  const root = currentRootId ? ROOTS_BY_ID[currentRootId] : undefined;
  if (!root) {
    return (
      <div className="ww-center ww-stack">
        <p className="ww-muted">No root selected.</p>
        <Button onClick={closeRoot}>Back to home</Button>
      </div>
    );
  }

  const id = rootId(root);
  const openable = isRootOpenable(id, entitled);
  const p = palOf(root);

  // Guard: should never open a locked root, but if reached, never dead-end —
  // show the upgrade path instead of the content.
  if (!openable) {
    return (
      <div className="ww-center ww-stack">
        <Badge variant="outline">🔒 Premium root</Badge>
        <h1 className="text-gradient-hero">{root.root}</h1>
        <p className="ww-muted">This root is part of the full curriculum.</p>
        <div className="ww-row">
          <Button onClick={requestUpgrade}>Go Premium</Button>
          <Button variant="ghost" onClick={closeRoot}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const done = completed.has(id);
  const position = ROOTS.findIndex((r) => rootId(r) === id) + 1;
  const tierName = TIERS[root.t - 1]?.n ?? 'Starter';
  const lang = root.org.split(' ')[0];
  const emoji = SCENE_EMOJI[root.scene] ?? '🔤';
  const lesson = { recall, currentRootId: id, entry: deckEntry, correctAdvance };
  const winLine = winLineOnCard(lesson);
  const won = Boolean(winLine);
  const studying = isLessonStudying(lesson);
  const examples = showExampleWords(lesson);
  const nextPlay = isNextPlayHome(completed, entitled, { choseMode: hasChosenMode(stats) });
  const nextTap = afterHearNextTap({
    nextPlay,
    hearFinished,
    entry: deckEntry,
    won,
  });
  const card = root;
  const hearBeats =
    listenKind === 'hear' && hearBeatSplits(card.root)
      ? hearBeatChips(hearBeatLabels(card.root, card.say), hearBeat)
      : null;
  const listen = clipListening(listening, hearBeats, listenKind === 'yes');
  const quizRecall = recall && recall.rootId === id && !won ? recall : null;
  const openSplit = splitForOpenWord(root.words, openWord);

  function go(dir: 1 | -1) {
    if (!allowManualStep(useWondralStore.getState().correctAdvance)) return;
    if (dir === 1 && !allowNextRootTap(useWondralStore.getState().correctAdvance, listening)) {
      return;
    }
    const next = neighborOpenable(id, dir, entitled);
    if (next) openRoot(next);
    else if (dir === 1) closeRoot();
  }

  function onWinNext() {
    if (!allowWinNextTap(useWondralStore.getState().correctAdvance, listening)) return;
    const live = useWondralStore.getState().correctAdvance;
    const dest = live?.dest ?? afterCorrectRecall(id, entitled);
    fireAdvance(dest);
  }

  function watchCurrentClip(markHearFinished: boolean, kind: 'hear' | 'yes') {
    const gen = ++hearGen.current;
    if (!hasActiveClip()) {
      setListening(false);
      setListenKind(null);
      return;
    }
    setListening(true);
    setListenKind(kind);
    setHearBeat(0);
    void whenCurrentClipEnds().then(() => {
      if (hearGen.current !== gen) return;
      setListening(false);
      setListenKind(null);
      if (markHearFinished) setHearFinished(true);
    });
  }

  function onHear() {
    speakRoot(card.root, card.say);
    watchCurrentClip(true, 'hear');
  }

  function startRecall() {
    if (listen.disableKnowThis) return;
    setRecall({
      beat: buildRecall({ root: card, pool, choices: 3 }),
      picked: null,
      win: null,
      rootId: id,
    });
  }

  function pickRecall(idx: number) {
    if (!recall || recall.rootId !== id || recall.picked !== null || recall.win) return;
    const opt = recall.beat.opts[idx];
    if (opt?.ok) {
      // Don't setRecall(null) — that parked kids on a ✓ Learned card
      // hunting for Next. Quiet Yes line stays on this card until Next;
      // that tap opens neighborOpenable(+1) as recall so Geo never
      // flashes the examples screen.
      completeRoot(id, { celebrate: false });
      dismissCelebration();
      const dest = afterCorrectRecall(id, entitled);
      beginCorrectAdvance(id, dest);
      setRecall({ beat: recall.beat, picked: idx, win: dest.line, rootId: id });
      // User gesture — play the baked Yes line now. Missing clip: silent.
      speakYes(card.root, card.mean);
      watchCurrentClip(true, 'yes');
      return;
    }
    setRecall({ ...recall, picked: idx });
  }

  return (
    <>
      <div className="ww-deck-wrap">
        <article className="ww-card2" style={paletteVars(p.c1rgb, p.grad)}>
          <div className="ww-strip">
            <button type="button" className="ww-deck-back" onClick={closeRoot}>
              ← All roots
            </button>
            <span className="badge2" aria-hidden="true">
              {emoji}
            </span>
            <span className="title">Wondral Words</span>
            <span className="tier">
              Tier {root.t} · {tierName}
            </span>
            <span className="count">
              Card {String(position).padStart(2, '0')} / {ROOTS.length}
            </span>
          </div>

          <div className="ww-hero">
            <div className="ww-scene2">
              <Scene scene={root.scene} pal={p.pal} />
              <span className="ww-caption">
                {studying ? `${emoji} watch the scene` : `${emoji} ${root.mean} — ${root.alt}`}
              </span>
            </div>
            <div className="ww-hero-text">
              <span className="ww-eyebrow2">
                <span className="ww-eyebrow-dot" aria-hidden="true" /> {lang} Root
              </span>
              <div className="ww-root">{root.root}</div>
              <div className="ww-pron">
                <button
                  type="button"
                  className={`ww-hear${listen.hearActive ? ' is-listening' : ''}`}
                  aria-label={`Hear ${root.root}`}
                  aria-pressed={listen.hearActive}
                  onClick={onHear}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M4 9v6h4l5 4V5L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM16 6.3a7 7 0 0 1 0 11.4v-2.2a5 5 0 0 0 0-7z"
                    />
                  </svg>
                </button>
                <span>
                  {root.say} &nbsp;·&nbsp; <span className="origin">from {root.org}</span>
                </span>
              </div>
              {listen.line ? (
                <div className="ww-listen" role="status" aria-live="polite">
                  <p className="ww-listen-line">{listen.line}</p>
                  {listen.beats ? (
                    <p className="ww-listen-beats">
                      {listen.beats.map((beat) => (
                        <span
                          key={beat.kind}
                          className={`ww-listen-beat${beat.active ? ' is-now' : ''}`}
                        >
                          {beat.label}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="ww-means">
                <span className="arrow" aria-hidden="true">
                  →
                </span>
                <span className="word">{studying ? '?' : root.mean}</span>
                <span className="alt">{studying ? 'prove you know it' : root.alt}</span>
              </div>
              {studying ? (
                <p className="ww-lead2">Look at the scene. Then tap what {root.root} means — or which word it builds.</p>
              ) : (
                /* `lead` is static, authored curriculum content (only our own <b>
                    tags in roots.data.ts) — never user input, so no XSS surface. */
                <p className="ww-lead2" dangerouslySetInnerHTML={{ __html: root.lead }} />
              )}
            </div>
          </div>

          {examples ? (
            <div className="ww-examples">
              <div className="ww-words">
                {root.words.map((w) => (
                  <button
                    type="button"
                    className={`ww-word${openWord === w.w ? ' is-open' : ''}`}
                    key={w.w}
                    title={`${w.b} — ${w.d}`}
                    aria-expanded={openWord === w.w}
                    aria-controls="ww-word-split"
                    onClick={() => setOpenWord((cur) => toggleOpenWord(cur, w.w))}
                  >
                    <span className="ico" aria-hidden="true">
                      {w.i}
                    </span>
                    <div className="ww-word-body">
                      <h3>{highlight(w.w, w.hl)}</h3>
                      <p>{w.d}</p>
                    </div>
                  </button>
                ))}
              </div>
              {openSplit ? (
                <p className="ww-word-split" id="ww-word-split">
                  {openSplit}
                </p>
              ) : null}
              {/* Phone chips hide per-word glosses; keep one readable root meaning. */}
              <p className="ww-mean-line">
                <strong>{root.root}</strong> means {root.mean}
              </p>
            </div>
          ) : null}

          {quizRecall ? (
            <div className="ww-recall">
              <div className="ww-recall-ask">{quizRecall.beat.ask}</div>
              <div className="ww-recall-opts">
                {quizRecall.beat.opts.map((o, idx) => {
                  let cls = 'ww-recall-opt';
                  if (quizRecall.picked !== null) {
                    cls += ' done';
                    if (idx === quizRecall.picked && !o.ok) cls += ' wrong';
                  }
                  return (
                    <button key={o.label} type="button" className={cls} onClick={() => pickRecall(idx)}>
                      <span className="k">{idx + 1}</span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {quizRecall.picked !== null ? (
                <div className="ww-recall-teach">
                  <p>{quizRecall.beat.teach}</p>
                  <Button onClick={startRecall}>Try again — you've got this</Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {won ? (
            <div
              className={`ww-recall ww-recall-win${listen.yesNow ? ' is-now' : ''}`}
              role="status"
              aria-live="polite"
            >
              <p className={listen.yesNow ? 'is-now' : undefined}>{winLine}</p>
            </div>
          ) : null}

          <div className="ww-card-actions">
            {won ? (
              <Button
                onClick={onWinNext}
                disabled={!allowWinNextTap(correctAdvance, listening)}
                block
                size="lg"
              >
                {afterYesNextLabel(correctAdvance?.dest ?? afterCorrectRecall(id, entitled))}
              </Button>
            ) : done ? (
              <Badge variant="solid" jewel="jade">
                ✓ Learned
              </Badge>
            ) : quizRecall ? (
              <span className="ww-muted">One tap. No shame if you miss — we'll show you.</span>
            ) : (
              <Button
                onClick={startRecall}
                disabled={listen.disableKnowThis}
                block={!nextTap.showNextRoot}
                size={!nextTap.showNextRoot ? 'lg' : 'md'}
              >
                I know this ✓
              </Button>
            )}
            {won || !nextTap.showNextRoot ? null : (
              <Button variant="ghost" onClick={() => go(1)} disabled={listen.disableNextRoot}>
                Next root →
              </Button>
            )}
          </div>
        </article>
      </div>

      <DeckNav
        rootLabel={root.root}
        meaning={studying ? '?' : root.mean}
        tierName={tierName}
        position={position}
        total={ROOTS.length}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        onQuiz={() => setView('quiz')}
        onIndex={() => setIndexOpen(true)}
        showRush={nextTap.showRush}
        showNext={nextTap.showNextRoot}
        nextDisabled={listen.disableNextRoot}
      />

      {indexOpen ? (
        <RootIndex
          entitled={entitled}
          onPick={(pickId) => {
            if (!allowNextRootTap(useWondralStore.getState().correctAdvance, listening)) return;
            setIndexOpen(false);
            openRoot(pickId);
          }}
          onClose={() => setIndexOpen(false)}
        />
      ) : null}
    </>
  );
}

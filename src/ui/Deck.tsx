import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { afterCorrectRecall, SUCCESS_BEAT_MS } from '../core/deckFlow';
import { buildRecall, type RecallBeat } from '../core/recall';
import { speakRoot } from '../core/speak';
import { paletteVars } from './components/styleVars';
import { Scene } from './Scene';
import { SCENE_EMOJI } from './scenes';
import { Badge } from './components/Badge';
import { Button } from './components/Button';
import { DeckNav } from './deck/DeckNav';
import { RootIndex } from './deck/RootIndex';

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
  const completeRoot = useWondralStore((s) => s.completeRoot);
  const openRoot = useWondralStore((s) => s.openRoot);
  const closeRoot = useWondralStore((s) => s.closeRoot);
  const dismissCelebration = useWondralStore((s) => s.dismissCelebration);
  const setView = useWondralStore((s) => s.setView);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const entitled = useEntitledForDisplay();

  const [indexOpen, setIndexOpen] = useState(false);
  const [recall, setRecall] = useState<{
    beat: RecallBeat;
    picked: number | null;
    win: string | null;
  } | null>(null);
  const pendingAdvance = useRef<ReturnType<typeof afterCorrectRecall> | null>(null);
  const pool = useMemo(
    () => ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)),
    [entitled],
  );

  useEffect(() => {
    setRecall(null);
    pendingAdvance.current = null;
  }, [currentRootId]);

  useEffect(() => {
    if (!recall?.win) return;
    const dest = pendingAdvance.current;
    const t = window.setTimeout(() => {
      if (pendingAdvance.current !== dest) return;
      pendingAdvance.current = null;
      if (dest?.kind === 'next') openRoot(dest.id);
      else closeRoot();
    }, SUCCESS_BEAT_MS);
    return () => window.clearTimeout(t);
  }, [recall?.win, openRoot, closeRoot]);

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
  const won = Boolean(recall?.win);
  const studying = recall !== null;
  const card = root;

  function go(dir: 1 | -1) {
    pendingAdvance.current = null;
    const next = neighborOpenable(id, dir, entitled);
    if (next) openRoot(next);
    else if (dir === 1) closeRoot();
  }

  function startRecall() {
    setRecall({ beat: buildRecall({ root: card, pool, choices: 3 }), picked: null, win: null });
  }

  function pickRecall(idx: number) {
    if (!recall || recall.picked !== null || recall.win) return;
    const opt = recall.beat.opts[idx];
    if (opt?.ok) {
      // Don't setRecall(null) — that parked kids on a ✓ Learned card
      // hunting for Next. Quiet one-line beat, then neighborOpenable(+1).
      completeRoot(id, { celebrate: false });
      dismissCelebration();
      const dest = afterCorrectRecall(id, entitled);
      pendingAdvance.current = dest;
      setRecall({ beat: recall.beat, picked: idx, win: dest.line });
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
                  className="ww-hear"
                  aria-label={`Hear ${root.root}`}
                  onClick={() => speakRoot(root.root, root.say)}
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

          {studying ? null : (
            <div className="ww-words">
              {root.words.map((w) => (
                <div className="ww-word" key={w.w} title={`${w.b} — ${w.d}`}>
                  <span className="ico" aria-hidden="true">
                    {w.i}
                  </span>
                  <div className="ww-word-body">
                    <h3>{highlight(w.w, w.hl)}</h3>
                    <p>{w.d}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recall && !won ? (
            <div className="ww-recall">
              <div className="ww-recall-ask">{recall.beat.ask}</div>
              <div className="ww-recall-opts">
                {recall.beat.opts.map((o, idx) => {
                  let cls = 'ww-recall-opt';
                  if (recall.picked !== null) {
                    cls += ' done';
                    if (idx === recall.picked && !o.ok) cls += ' wrong';
                  }
                  return (
                    <button key={o.label} type="button" className={cls} onClick={() => pickRecall(idx)}>
                      <span className="k">{idx + 1}</span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {recall.picked !== null ? (
                <div className="ww-recall-teach">
                  <p>{recall.beat.teach}</p>
                  <Button onClick={startRecall}>Try again — you've got this</Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {won ? (
            <div className="ww-recall ww-recall-win" role="status" aria-live="polite">
              <p>{recall!.win}</p>
            </div>
          ) : null}

          <div className="ww-card-actions">
            {won ? (
              <span className="ww-card-win-mark" aria-hidden="true">
                ✓
              </span>
            ) : done ? (
              <Badge variant="solid" jewel="jade">
                ✓ Learned
              </Badge>
            ) : recall ? (
              <span className="ww-muted">One tap. No shame if you miss — we'll show you.</span>
            ) : (
              <Button onClick={startRecall}>I know this ✓</Button>
            )}
            <Button variant="ghost" onClick={() => go(1)}>
              Next root →
            </Button>
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
      />

      {indexOpen ? (
        <RootIndex
          entitled={entitled}
          onPick={(pickId) => {
            setIndexOpen(false);
            openRoot(pickId);
          }}
          onClose={() => setIndexOpen(false)}
        />
      ) : null}
    </>
  );
}

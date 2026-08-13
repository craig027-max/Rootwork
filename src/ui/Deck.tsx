import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import {
  ROOTS,
  ROOTS_BY_ID,
  TIERS,
  PALETTES,
  rootId,
  isRootOpenable,
  type Root,
} from '../data/roots';
import { buildRecall, type RecallBeat } from '../core/recall';
import { paletteVars } from './components/styleVars';
import { Scene } from './Scene';
import { Badge } from './components/Badge';
import { Button } from './components/Button';
import { DeckNav } from './deck/DeckNav';
import { RootIndex } from './deck/RootIndex';

/** Emoji used on the strip badge + scene caption, keyed by scene name. */
const SCENE_EMOJI: Record<string, string> = {
  dna: '🧬',
  globe: '🌍',
  light: '☀️',
  waves: '📡',
  draw: '✍️',
  water: '💧',
  heat: '🔥',
  stars: '✨',
  clock: '⏳',
  sound: '🔊',
  eye: '👁️',
  motion: '➡️',
  gear: '⚙️',
  speak: '💬',
  breakx: '💥',
  scale: '🔎',
  people: '👥',
  mind: '🧠',
  heart: '💗',
};

function palOf(root: Root) {
  return PALETTES[root.pal] ?? PALETTES.green!;
}

/** Nearest openable root in a direction (+1 next, -1 prev), skipping locked ones. */
function neighborOpenable(fromId: string, dir: 1 | -1, entitled: boolean): string | null {
  const i = ROOTS.findIndex((r) => rootId(r) === fromId);
  for (let j = i + dir; j >= 0 && j < ROOTS.length; j += dir) {
    const id = rootId(ROOTS[j]!);
    if (isRootOpenable(id, entitled)) return id;
  }
  return null;
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
  const setView = useWondralStore((s) => s.setView);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const entitled = useEntitledForDisplay();

  const [indexOpen, setIndexOpen] = useState(false);
  const [recall, setRecall] = useState<{ beat: RecallBeat; picked: number | null } | null>(null);
  const pool = useMemo(
    () => ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)),
    [entitled],
  );

  useEffect(() => {
    setRecall(null);
  }, [currentRootId]);

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
  const studying = recall !== null;
  const card = root;

  function go(dir: 1 | -1) {
    const next = neighborOpenable(id, dir, entitled);
    if (next) openRoot(next);
  }

  function startRecall() {
    setRecall({ beat: buildRecall({ root: card, pool, choices: 3 }), picked: null });
  }

  function pickRecall(idx: number) {
    if (!recall || recall.picked !== null) return;
    const opt = recall.beat.opts[idx];
    if (opt?.ok) {
      completeRoot(id);
      setRecall(null);
      return;
    }
    setRecall({ ...recall, picked: idx });
  }

  return (
    <>
      <div className="ww-deck-wrap">
        <button type="button" className="ww-deck-back" onClick={closeRoot}>
          ← All roots
        </button>

        <article className="ww-card2" style={paletteVars(p.c1rgb, p.grad)}>
          <div className="ww-strip">
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
            <div className="ww-hero-text">
              <span className="ww-eyebrow2">
                <span className="ww-eyebrow-dot" aria-hidden="true" /> {lang} Root
              </span>
              <div className="ww-root">{root.root}</div>
              <div className="ww-pron">
                {root.say} &nbsp;·&nbsp; <span className="origin">from {root.org}</span>
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
            <div className="ww-scene2">
              <Scene scene={root.scene} pal={p.pal} />
              <span className="ww-caption">
                {studying ? `${emoji} watch the scene` : `${emoji} ${root.mean} — ${root.alt}`}
              </span>
            </div>
          </div>

          {studying ? null : (
            <div className="ww-words">
              {root.words.map((w) => (
                <div className="ww-word" key={w.w}>
                  <span className="ico" aria-hidden="true">
                    {w.i}
                  </span>
                  <h3>{highlight(w.w, w.hl)}</h3>
                  <div className="build">{w.b}</div>
                  <p>{w.d}</p>
                </div>
              ))}
            </div>
          )}

          {recall ? (
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

          <div className="ww-card-actions">
            {done ? (
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

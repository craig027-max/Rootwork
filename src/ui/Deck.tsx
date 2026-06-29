import { useState, type ReactNode } from 'react';
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

  function go(dir: 1 | -1) {
    const next = neighborOpenable(id, dir, entitled);
    if (next) openRoot(next);
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
                <span className="word">{root.mean}</span>
                <span className="alt">{root.alt}</span>
              </div>
              {/* `lead` is static, authored curriculum content (only our own <b>
                  tags in roots.data.ts) — never user input, so no XSS surface. */}
              <p className="ww-lead2" dangerouslySetInnerHTML={{ __html: root.lead }} />
            </div>
            <div className="ww-scene2">
              <Scene scene={root.scene} pal={p.pal} />
              <span className="ww-caption">
                {emoji} {root.mean} — {root.alt}
              </span>
            </div>
          </div>

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

          <div className="ww-card-actions">
            {done ? (
              <Badge variant="solid" jewel="jade">
                ✓ Learned
              </Badge>
            ) : (
              <Button onClick={() => completeRoot(id)}>Mark as learned ✓</Button>
            )}
            <Button variant="ghost" onClick={() => go(1)}>
              Next root →
            </Button>
          </div>
        </article>
      </div>

      <DeckNav
        rootLabel={root.root}
        meaning={root.mean}
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

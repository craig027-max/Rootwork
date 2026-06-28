import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { ROOTS, ROOTS_BY_ID, PALETTES, rootId, isRootOpenable, type Root } from '../data/roots';
import { paletteVars } from './components/styleVars';
import { Scene } from './Scene';
import { Card } from './components/Card';
import { Badge } from './components/Badge';
import { Button } from './components/Button';

function palOf(root: Root) {
  return PALETTES[root.pal] ?? PALETTES.green!;
}

/** Next openable root after the current one (in curriculum order), or null. */
function nextOpenable(fromId: string, entitled: boolean): string | null {
  const i = ROOTS.findIndex((r) => rootId(r) === fromId);
  for (let j = i + 1; j < ROOTS.length; j++) {
    const id = rootId(ROOTS[j]!);
    if (isRootOpenable(id, entitled)) return id;
  }
  return null;
}

export function Deck() {
  const currentRootId = useWondralStore((s) => s.currentRootId);
  const completed = useWondralStore((s) => s.completedRoots);
  const completeRoot = useWondralStore((s) => s.completeRoot);
  const openRoot = useWondralStore((s) => s.openRoot);
  const closeRoot = useWondralStore((s) => s.closeRoot);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const entitled = useEntitledForDisplay();

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
  const done = completed.has(id);
  const next = nextOpenable(id, entitled);

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

  return (
    <div className="ww-deck" style={paletteVars(p.c1rgb, p.grad)}>
      <div className="ww-row" style={{ justifyContent: 'space-between' }}>
        <Button variant="ghost" size="sm" onClick={closeRoot}>
          ← All roots
        </Button>
        {done ? <Badge variant="solid" jewel="jade">✓ Learned</Badge> : null}
      </div>

      <Scene scene={root.scene} pal={p.pal} className="ww-scene" />

      <div className="ww-stack">
        <p className="ww-eyebrow">
          {root.say} · {root.org}
        </p>
        <h1 className="text-gradient" style={{ fontSize: 'var(--fs-display)', lineHeight: 1 }}>
          {root.root}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-lg)' }}>
          means <b>{root.mean}</b> — {root.alt}
        </p>
        {/* `lead` is static, authored curriculum content (only our own <b> tags in
            roots.data.ts) — never user input, so there is no XSS surface here. */}
        <p
          className="ww-muted"
          style={{ fontSize: 'var(--fs-md)' }}
          dangerouslySetInnerHTML={{ __html: root.lead }}
        />
      </div>

      <div className="ww-word-grid">
        {root.words.map((w) => (
          <Card key={w.w} className="ww-stack" style={paletteVars(p.c1rgb, p.grad)}>
            <div className="ww-row">
              <span aria-hidden="true" style={{ fontSize: 24 }}>
                {w.i}
              </span>
              <strong className="text-gradient">{w.w}</strong>
            </div>
            <code className="ww-lock">{w.b}</code>
            <span className="ww-muted">{w.d}</span>
          </Card>
        ))}
      </div>

      <div className="ww-row" style={{ justifyContent: 'space-between' }}>
        {!done ? (
          <Button onClick={() => completeRoot(id)}>Mark as learned ✓</Button>
        ) : (
          <span className="ww-muted">Nice work — this root is in your collection.</span>
        )}
        {next ? (
          <Button variant="ghost" onClick={() => openRoot(next)}>
            Next root →
          </Button>
        ) : (
          <Button variant="ghost" onClick={requestUpgrade}>
            Unlock more →
          </Button>
        )}
      </div>
    </div>
  );
}

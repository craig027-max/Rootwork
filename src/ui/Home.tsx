import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import {
  TIERS,
  PALETTES,
  rootId,
  rootsInTier,
  isRootAccessible,
  resumeRootId,
  type Root,
  type TierNum,
} from '../data/roots';
import { paletteVars } from './components/styleVars';
import { Card } from './components/Card';
import { Badge } from './components/Badge';
import { Button } from './components/Button';

function palOf(root: Root) {
  return PALETTES[root.pal] ?? PALETTES.green!;
}

export function Home() {
  const entitled = useEntitledForDisplay();
  const completed = useWondralStore((s) => s.completedRoots);
  const selectedTier = useWondralStore((s) => s.selectedTier) ?? 1;
  const setSelectedTier = useWondralStore((s) => s.setSelectedTier);
  const openRoot = useWondralStore((s) => s.openRoot);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const setView = useWondralStore((s) => s.setView);

  const resumeId = resumeRootId(completed, entitled);

  function pickRoot(root: Root) {
    const id = rootId(root);
    if (isRootAccessible(id, completed, entitled)) openRoot(id);
    else requestUpgrade();
  }

  function pickTier(t: TierNum) {
    // Tier 1 is always free; a locked tier routes to the upgrade flow.
    if (t === 1 || entitled) setSelectedTier(t);
    else requestUpgrade();
  }

  const shownRoots = rootsInTier(selectedTier as TierNum);

  return (
    <div className="ww-stack">
      <section className="ww-stack" style={{ marginBottom: 8 }}>
        <p className="ww-eyebrow">Etymology, animated</p>
        <h1 className="text-gradient-hero" style={{ maxWidth: 18 + 'ch' }}>
          Learn one root, unlock dozens of words.
        </h1>
        <p className="ww-muted" style={{ maxWidth: '54ch' }}>
          Every root comes alive with a concept scene — see <b>bio</b> as life, <b>aqua</b> as
          water, <b>astro</b> as the stars. Tier 1 is free; the full curriculum has 152 roots.
        </p>
        <div className="ww-row">
          {resumeId ? (
            <Button onClick={() => openRoot(resumeId)}>Continue learning</Button>
          ) : (
            <Button onClick={() => pickRoot(shownRoots[0]!)}>Start with {shownRoots[0]?.root}</Button>
          )}
          <Button variant="ghost" onClick={() => setView('quiz')}>
            🎯 Root Rush
          </Button>
        </div>
      </section>

      <section className="ww-stack">
        <p className="ww-eyebrow">Tiers</p>
        <div className="ww-tier-list">
          {TIERS.map((tier, i) => {
            const t = (i + 1) as TierNum;
            const free = t === 1;
            const locked = !free && !entitled;
            const count = rootsInTier(t).length;
            const isSel = selectedTier === t;
            return (
              <Card
                key={tier.n}
                interactive
                className="ww-tier"
                style={{
                  ...paletteVars('255,206,77', 'var(--gradient-gold)'),
                  outline: isSel ? '2px solid rgba(var(--spark-rgb),0.6)' : 'none',
                }}
                onClick={() => pickTier(t)}
                role="button"
              >
                <strong style={{ fontFamily: 'var(--font-display)' }}>{tier.n}</strong>
                <span className="ww-muted">{tier.sub}</span>
                <span className="ww-tier-meta">
                  {locked ? (
                    <Badge variant="outline">🔒 Locked</Badge>
                  ) : free ? (
                    <Badge variant="solid" jewel="jade">
                      Free
                    </Badge>
                  ) : (
                    <Badge variant="gold">Unlocked</Badge>
                  )}
                  <div className="ww-lock">{count} roots</div>
                </span>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="ww-stack">
        <p className="ww-eyebrow">{TIERS[selectedTier - 1]?.n} roots</p>
        <div className="ww-word-grid">
          {shownRoots.map((root) => {
            const id = rootId(root);
            const accessible = isRootAccessible(id, completed, entitled);
            const done = completed.has(id);
            const p = palOf(root);
            return (
              <Card
                key={id}
                interactive
                className="ww-stack"
                style={paletteVars(p.c1rgb, p.grad)}
                onClick={() => pickRoot(root)}
                role="button"
              >
                <div className="ww-row" style={{ justifyContent: 'space-between' }}>
                  <strong className="text-gradient" style={{ fontSize: 'var(--fs-lg)' }}>
                    {root.root}
                  </strong>
                  {done ? <Badge variant="solid" jewel="jade">✓</Badge> : null}
                  {!accessible ? <Badge variant="outline">🔒</Badge> : null}
                </div>
                <span className="ww-muted">{root.mean}</span>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

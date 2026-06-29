import { useEffect } from 'react';
import {
  ROOTS,
  TIERS,
  PALETTES,
  rootId,
  rootsInTier,
  isRootOpenable,
  type Root,
} from '../../data/roots';
import { paletteVars } from '../components/styleVars';

function palRgb(root: Root): string {
  return (PALETTES[root.pal] ?? PALETTES.green!).c1rgb;
}

/**
 * Full-screen index overlay: every root grouped by tier as jewel-tinted chips.
 * Picking a chip jumps the deck to that card. Locked (paid) roots still appear
 * but are dimmed — opening one routes through the deck's existing upgrade guard.
 */
export function RootIndex({
  entitled,
  onPick,
  onClose,
}: {
  entitled: boolean;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="ww-index"
      role="dialog"
      aria-modal="true"
      aria-label="All roots"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ww-index-inner">
        <div className="ww-index-head">
          <h2>All Roots</h2>
          <span className="sub">
            {ROOTS.length} roots · {TIERS.length} tiers
          </span>
          <button type="button" className="ww-index-x" aria-label="Close index" onClick={onClose}>
            ✕
          </button>
        </div>

        {TIERS.map((tier, ti) => (
          <section className="ww-tier-sec" key={tier.n}>
            <div className="th">
              <span className="n">
                Tier {ti + 1} — {tier.n}
              </span>
              <span className="s">{tier.sub}</span>
              <span className="line" />
            </div>
            <div className="ww-igrid">
              {rootsInTier((ti + 1) as 1 | 2 | 3 | 4 | 5).map((root) => {
                const id = rootId(root);
                const locked = !isRootOpenable(id, entitled);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ww-ichip${locked ? ' lockchip' : ''}`}
                    style={paletteVars(palRgb(root), (PALETTES[root.pal] ?? PALETTES.green!).grad)}
                    onClick={() => onPick(id)}
                  >
                    <div className="ir">
                      {root.root} {locked ? '🔒' : ''}
                    </div>
                    <div className="im">{root.mean}</div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

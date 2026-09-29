import { useEffect } from 'react';
import {
  ROOTS,
  ROOTS_BY_ID,
  TIERS,
  PALETTES,
  rootId,
  rootsInTier,
  isRootOpenable,
  type Root,
} from '../../data/roots';
import { recapDeckEntry } from '../../core/deckFlow';
import { paletteVars } from '../components/styleVars';
import {
  indexChipKind,
  indexChipLabel,
  indexChipMark,
  indexHeading,
  indexRootsMissFirst,
  indexSub,
} from './indexChip';

function palRgb(root: Root): string {
  return (PALETTES[root.pal] ?? PALETTES.green!).c1rgb;
}

/**
 * Full-screen index overlay: every root grouped by tier as jewel-tinted chips.
 * Picking a chip jumps the deck to that card. Owned chips are Remember —
 * hold the meaning, then Home — so Browse / See all cannot dump Bio → Geo.
 * A waiting Rush miss stays Missed Geo — the catalog must not paint a
 * fake ✓ over the same coral miss Home already named. Browse chrome
 * now matches — All Roots / 183 roots / Bio ✓ first must not sit
 * over Geo. Deck strip / nav now matches — Starter / Card 02 /
 * 183 must not sit over that same miss. Locked (paid) roots still
 * appear but are dimmed — opening one routes through the deck's
 * existing upgrade guard.
 */
export function RootIndex({
  entitled,
  completed,
  rememberMissIds,
  onPick,
  onClose,
}: {
  entitled: boolean;
  completed?: ReadonlySet<string>;
  /** Today's unreviewed owned Rush misses — catalog chips stay Missed, not ✓. */
  rememberMissIds?: Iterable<string>;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const missIds = [...(rememberMissIds ?? [])].filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
  const missed = new Set(missIds);
  const missNames = missIds
    .map((id) => ROOTS_BY_ID[id]?.root)
    .filter((name): name is string => Boolean(name));
  const heading = indexHeading(missNames);
  const sub = indexSub(missNames, { rootCount: ROOTS.length, tierCount: TIERS.length });
  const missHero = missNames.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={`ww-index${missHero ? ' is-miss' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ww-index-inner">
        <div className={`ww-index-head${missHero ? ' is-miss' : ''}`}>
          <h2>{heading}</h2>
          <span className="sub">{sub}</span>
          <button type="button" className="ww-index-x" aria-label="Close index" onClick={onClose}>
            ✕
          </button>
        </div>

        {TIERS.map((tier, ti) => {
          const tierRoots = indexRootsMissFirst(
            rootsInTier((ti + 1) as 1 | 2 | 3 | 4 | 5),
            missed,
            rootId,
          );
          return (
            <section className="ww-tier-sec" key={tier.n}>
              <div className="th">
                <span className="n">
                  Tier {ti + 1} — {tier.n}
                </span>
                <span className="s">{tier.sub}</span>
                <span className="line" />
              </div>
              <div className="ww-igrid">
                {tierRoots.map((root) => {
                  const id = rootId(root);
                  const locked = !isRootOpenable(id, entitled);
                  const owned = Boolean(completed?.has(id));
                  const kind = indexChipKind({ missed: missed.has(id), owned, locked });
                  const remember = recapDeckEntry(owned) === 'remember';
                  const mark = indexChipMark(kind);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`ww-ichip${locked ? ' lockchip' : ''}${
                        kind === 'done' ? ' is-done' : ''
                      }${kind === 'miss' ? ' is-miss' : ''}`}
                      style={paletteVars(palRgb(root), (PALETTES[root.pal] ?? PALETTES.green!).grad)}
                      onClick={() => onPick(id)}
                      aria-label={
                        kind === 'miss'
                          ? indexChipLabel(root.root, kind)
                          : remember
                            ? indexChipLabel(root.root, 'done')
                            : root.root
                      }
                    >
                      <div className="ir">
                        {mark ? (
                          <span
                            className={`ww-daily-mark${kind === 'miss' ? ' is-miss' : ''}`}
                            aria-hidden="true"
                          >
                            {mark}
                          </span>
                        ) : null}
                        {root.root} {locked ? '🔒' : ''}
                      </div>
                      <div className="im">{root.mean}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

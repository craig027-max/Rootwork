import { useEffect, useRef, useState } from 'react';
import {
  ROOTS,
  ROOTS_BY_ID,
  TIERS,
  PALETTES,
  rootId,
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
  indexTierHeading,
  indexTiersMissFirst,
  indexTierSub,
} from './indexChip';
import {
  INDEX_SEARCH_PLACEHOLDER,
  buildIndexBrowseSections,
  cleanSearchQuery,
  indexChipHint,
  indexFocusWord,
  indexMatchCount,
  indexRootMatch,
  indexSearchEmptyHint,
  indexSearchEscape,
  indexSearchHeading,
  indexSearchSub,
} from './indexSearch';

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
 * 183 must not sit over that same miss. Browse sections now
 * match — Tier 1 — Starter / everyday roots must not sit over
 * Geo. Deck card / Prev now match — prove you know it /
 * Geo · ? / Prev → Bio must not sit over that same miss.
 * Home list row titles now match — Tier 1 · Starter must
 * not sit over Geo when the sub already says Missed · remember.
 * Locked (paid) roots still appear but are dimmed — opening
 * one routes through the deck's existing upgrade guard.
 * Find matches a root, a meaning, or a school word (biology)
 * so All Roots is not a 183-chip scroll. A word tap opens that
 * word on the card — Biology, not a closed chip / Remember quiz.
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
  onPick: (id: string, focusWord?: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  queryRef.current = query;
  const missIds = [...(rememberMissIds ?? [])].filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
  const missed = new Set(missIds);
  const missNames = missIds
    .map((id) => ROOTS_BY_ID[id]?.root)
    .filter((name): name is string => Boolean(name));
  const searching = Boolean(cleanSearchQuery(query));
  const sections = buildIndexBrowseSections({ query, missed });
  const matchCount = indexMatchCount(sections);
  const heading = searching ? indexSearchHeading() : indexHeading(missNames);
  const sub = searching
    ? indexSearchSub(query, matchCount)
    : indexSub(missNames, { rootCount: ROOTS.length, tierCount: TIERS.length });
  const missHero = !searching && missNames.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (indexSearchEscape(queryRef.current) === 'clear') {
        setQuery('');
        return;
      }
      onClose();
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
          <div className="ww-index-find">
            <input
              id="ww-index-q"
              className="ww-index-q"
              type="search"
              value={query}
              placeholder={INDEX_SEARCH_PLACEHOLDER}
              aria-label={INDEX_SEARCH_PLACEHOLDER}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching ? (
              <button
                type="button"
                className="ww-index-clear"
                aria-label="Clear search"
                onClick={() => setQuery('')}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {searching && matchCount === 0 ? (
          <div className="ww-index-empty" role="status">
            <p>{indexSearchSub(query, 0)}</p>
            <p className="hint">{indexSearchEmptyHint()}</p>
          </div>
        ) : null}

        {indexTiersMissFirst(sections, (section) => section.missNames.length > 0).map(
          ({ t, name, sub: tierSub, roots: tierRoots, missNames: tierMissNames }) => {
            const missSec = !searching && tierMissNames.length > 0;
            const shownRoots = indexRootsMissFirst(tierRoots, missed, rootId);
            return (
            <section className={`ww-tier-sec${missSec ? ' is-miss' : ''}`} key={name}>
              <div className={`th${missSec ? ' is-miss' : ''}`}>
                <span className="n">
                  {indexTierHeading({ t, name, missNames: missSec ? tierMissNames : [] })}
                </span>
                <span className="s">
                  {indexTierSub({ sub: tierSub, missNames: missSec ? tierMissNames : [] })}
                </span>
                <span className="line" />
              </div>
              <div className="ww-igrid">
                {shownRoots.map((root) => {
                  const id = rootId(root);
                  const locked = !isRootOpenable(id, entitled);
                  const owned = Boolean(completed?.has(id));
                  const kind = indexChipKind({ missed: missed.has(id), owned, locked });
                  const remember = recapDeckEntry(owned) === 'remember';
                  const mark = indexChipMark(kind);
                  const match = indexRootMatch(root, query);
                  const hint = indexChipHint(match);
                  const focusWord = indexFocusWord(match);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`ww-ichip${locked ? ' lockchip' : ''}${
                        kind === 'done' ? ' is-done' : ''
                      }${kind === 'miss' ? ' is-miss' : ''}${hint ? ' is-hit' : ''}`}
                      style={paletteVars(palRgb(root), (PALETTES[root.pal] ?? PALETTES.green!).grad)}
                      onClick={() => onPick(id, focusWord ?? undefined)}
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
                      {hint ? <div className="ih">{hint}</div> : null}
                    </button>
                  );
                })}
              </div>
            </section>
            );
          },
        )}
      </div>
    </div>
  );
}

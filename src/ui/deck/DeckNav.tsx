/**
 * Floating bottom navigation pill (ported from the design package deck). Prev /
 * current-label / next, plus Root Rush (🎯) and the index (☰). The centre label
 * also opens the index.
 *
 * After Hear/Yes on the next-Play path, Next and Rush hide so the one tap
 * is I know this or the quiz — same spirit as Home (#28–#30).
 */
export function DeckNav({
  rootLabel,
  meaning,
  tierName,
  position,
  total,
  onPrev,
  onNext,
  onQuiz,
  onIndex,
  showRush = true,
  showNext = true,
}: {
  rootLabel: string;
  meaning: string;
  tierName: string;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onQuiz: () => void;
  onIndex: () => void;
  /** Returning dashboard keeps Rush; next-Play hides it. */
  showRush?: boolean;
  /** After Hear/Yes, hide nav Next so it cannot dump the next root mid-listen. */
  showNext?: boolean;
}) {
  return (
    <nav className="ww-decknav" aria-label="Deck navigation">
      <button type="button" className="ww-nav-btn" aria-label="Previous root" onClick={onPrev}>
        ‹
      </button>
      <button type="button" className="ww-nav-cur" onClick={onIndex} title="Open index">
        <span className="r">
          {rootLabel} <b>· {meaning}</b>
        </span>
        <span className="meta">
          {tierName} · {position} / {total}
        </span>
      </button>
      {showNext ? (
        <button type="button" className="ww-nav-btn" aria-label="Next root" onClick={onNext}>
          ›
        </button>
      ) : null}
      {showRush ? (
        <button type="button" className="ww-nav-btn" aria-label="Play Root Rush" onClick={onQuiz}>
          🎯
        </button>
      ) : null}
      <button type="button" className="ww-nav-btn" aria-label="All roots index" onClick={onIndex}>
        ☰
      </button>
    </nav>
  );
}

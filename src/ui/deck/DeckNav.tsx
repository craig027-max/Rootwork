/**
 * Floating bottom navigation pill (ported from the design package deck). Prev /
 * current-label / next, plus Root Rush (🎯) and the index (☰). The centre label
 * also opens the index.
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
      <button type="button" className="ww-nav-btn" aria-label="Next root" onClick={onNext}>
        ›
      </button>
      <button type="button" className="ww-nav-btn" aria-label="Play Root Rush" onClick={onQuiz}>
        🎯
      </button>
      <button type="button" className="ww-nav-btn" aria-label="All roots index" onClick={onIndex}>
        ☰
      </button>
    </nav>
  );
}

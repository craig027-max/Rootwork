import { deckIndexAria, deckNavMeta } from './deckChrome';

/**
 * Floating bottom navigation pill (ported from the design package deck). Prev /
 * current-label / next, plus Root Rush (🎯) and the index (☰). The centre label
 * also opens the index.
 *
 * After Hear/Yes on the next-Play path, Next and Rush hide so the one tap
 * is I know this or the quiz — same spirit as Home (#28–#30). A waiting
 * Rush miss names Remember · Geo — Starter · 2 / 183 / All roots
 * index must not sit over that same coral miss Browse already named.
 * Prev stays hidden on Remember so Bio teach cannot dump over Geo.
 * Find names Biology in the centre — Bio · life must not sit over the
 * school word they typed. A gloss, piece, or pieces question names
 * that thing — Bio · ? must not sit under Biology.
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
  showPrev = true,
  nextDisabled = false,
  missed = false,
  missName,
  finding = false,
  findWord,
  asked = false,
  fromRoot,
  quizzing = false,
  quizLong = false,
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
  /** Remember visit — hide Prev so Bio teach cannot dump over Geo. */
  showPrev?: boolean;
  /** While a Hear/Yes clip is playing, Next stays visible but closed. */
  nextDisabled?: boolean;
  /** Path-done Rush miss — nav meta is Remember, not Starter / 183. */
  missed?: boolean;
  missName?: string;
  /** Browse school-word tap — nav meta is Find · Biology, not Card 01 / 183. */
  finding?: boolean;
  findWord?: string;
  /** Result chip — from Bio under the school word, and ☰ is not Find. */
  asked?: boolean;
  fromRoot?: string;
  /** Gloss / piece / pieces — centre is that name, and it must fit the pill. */
  quizzing?: boolean;
  quizLong?: boolean;
}) {
  const meta = deckNavMeta({
    missed,
    missName,
    findWord,
    asked,
    fromRoot,
    tierName,
    position,
    total,
  });
  const indexAria = deckIndexAria({ missed, finding: finding && !asked });
  return (
    <nav className={`ww-decknav${missed ? ' is-miss' : ''}`} aria-label="Deck navigation">
      {showPrev ? (
        <button type="button" className="ww-nav-btn" aria-label="Previous root" onClick={onPrev}>
          ‹
        </button>
      ) : null}
      <button
        type="button"
        className={`ww-nav-cur${missed ? ' is-miss' : ''}${finding ? ' is-find' : ''}${
          quizzing ? ' is-quiz' : ''
        }${quizLong ? ' is-long' : ''}`}
        onClick={onIndex}
        title="Open index"
      >
        <span className="r">
          {rootLabel}
          {meaning ? <b> · {meaning}</b> : null}
        </span>
        <span className="meta">{meta}</span>
      </button>
      {showNext ? (
        <button
          type="button"
          className="ww-nav-btn"
          aria-label="Next root"
          disabled={nextDisabled}
          onClick={onNext}
        >
          ›
        </button>
      ) : null}
      {showRush ? (
        <button type="button" className="ww-nav-btn" aria-label="Play Root Rush" onClick={onQuiz}>
          🎯
        </button>
      ) : null}
      <button type="button" className="ww-nav-btn" aria-label={indexAria} onClick={onIndex}>
        ☰
      </button>
    </nav>
  );
}

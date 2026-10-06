import type { RootWord } from '../data/roots.data';

/** Authored morphological split already on the word (`b`). Do not invent pieces. */
export function wordPartSplit(word: Pick<RootWord, 'b'>): string {
  return word.b;
}

/** Tap the open chip again to close; tap another to switch. */
export function toggleOpenWord(current: string | null, tapped: string): string | null {
  return current === tapped ? null : tapped;
}

/** Visible part-split for the open chip, or null when none is selected. */
export function splitForOpenWord(
  words: ReadonlyArray<Pick<RootWord, 'w' | 'b'>>,
  open: string | null,
): string | null {
  if (!open) return null;
  const word = words.find((w) => w.w === open);
  return word ? wordPartSplit(word) : null;
}

/**
 * Browse find tap — open the school word they typed, not a closed chip
 * they have to hunt for. Hint must already live on this card.
 */
export function openWordForFind(
  words: ReadonlyArray<Pick<RootWord, 'w'>>,
  hint?: string | null,
): string | null {
  const want = hint?.replace(/\s+/g, ' ').trim();
  if (!want) return null;
  const folded = want.toLowerCase();
  return words.find((word) => word.w.replace(/\s+/g, ' ').trim().toLowerCase() === folded)?.w ?? null;
}

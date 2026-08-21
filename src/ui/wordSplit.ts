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

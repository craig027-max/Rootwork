import { shortWordDef } from '../core/wordDef';
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
 * Study-card tap leftover: phone chips hide each gloss, and the lesson
 * line still said Bio means life under an open Biology. Name that school
 * word and its authored definition. Do not invent a meaning.
 */
export interface OpenChipLesson {
  word: string;
  gloss: string;
}

export function openChipLesson(word: string, def: string): OpenChipLesson | null {
  const name = word.replace(/\s+/g, ' ').trim();
  const gloss = shortWordDef(def);
  if (!name || !gloss) return null;
  return { word: name, gloss };
}

/** Full lesson line — Biology — The science of living things. */
export function openChipMeanLine(word: string, def: string): string | null {
  const lesson = openChipLesson(word, def);
  if (!lesson) return null;
  return `${lesson.word} — ${lesson.gloss}`;
}

/** Chip name when the gloss paragraph is hidden. Pause between word and meaning. */
export function openChipAria(word: string, def: string): string {
  const lesson = openChipLesson(word, def);
  const name = word.replace(/\s+/g, ' ').trim();
  if (!lesson) return name;
  return `${lesson.word}. ${lesson.gloss}`;
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

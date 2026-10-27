/**
 * The other piece of a school word.
 *
 * Biology is bio (life) + -logy (study of). Root quizzes already ask what
 * the root means and what the whole word means. This asks what the other
 * piece means — only a parenthetical the catalog already wrote. Bare pieces
 * (angle, way, view) and tiny glue glosses (of, do, in) are not questions.
 */
import type { Root } from '../data/roots.data';
import { canon } from './distractors';

export interface WordPiece {
  /** Letters as written, e.g. "-logy" or "graph". */
  letters: string;
  /** Parenthetical meaning, or null when the catalog left it off. */
  mean: string | null;
}

export interface OtherPart {
  word: string;
  split: string;
  letters: string;
  mean: string;
}

const PIECE_RE = /^(-?[A-Za-z]+)\s*(?:\(([^)]+)\))?$/;

/** Glue glosses are shorter than a meaning a kid can choose. */
const MIN_PART_MEAN = 3;

export function parseWordSplit(split: string): WordPiece[] {
  const text = split.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  return text.split(/\s+\+\s+/).map((chunk) => {
    const raw = chunk.trim();
    const match = PIECE_RE.exec(raw);
    if (!match) return { letters: raw, mean: null };
    const mean = match[2]?.replace(/\s+/g, ' ').trim() || null;
    return { letters: match[1]!, mean };
  });
}

function foldLetters(value: string): string {
  return value.replace(/[^a-z]/gi, '').toLowerCase();
}

/** True when this piece is the root under study (hl or the root name). */
export function pieceMatchesRoot(letters: string, root: string, hl: string): boolean {
  const piece = foldLetters(letters);
  if (!piece) return false;
  const highlight = foldLetters(hl);
  if (highlight && piece === highlight) return true;
  const rootLetters = foldLetters(root);
  return rootLetters !== '' && piece === rootLetters;
}

/** A parenthetical long enough to be a real choice. Null when it is not. */
export function usablePartMean(mean: string | null | undefined): string | null {
  const text = mean?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length < MIN_PART_MEAN) return null;
  return text;
}

/**
 * Pieces that are not the root, with an authored meaning that is not the
 * root's own meaning. No invented gloss for a bare piece.
 */
export function otherPartsForRoot(root: Root): OtherPart[] {
  const out: OtherPart[] = [];
  for (const item of root.words) {
    const pieces = parseWordSplit(item.b);
    const rootPieces = pieces.filter((piece) => pieceMatchesRoot(piece.letters, root.root, item.hl));
    if (rootPieces.length < 1) continue;
    for (const piece of pieces) {
      if (rootPieces.includes(piece)) continue;
      const mean = usablePartMean(piece.mean);
      if (!mean) continue;
      if (canon(mean) === canon(root.mean)) continue;
      out.push({
        word: item.w.replace(/\s+/g, ' ').trim(),
        split: item.b.replace(/\s+/g, ' ').trim(),
        letters: piece.letters,
        mean,
      });
    }
  }
  return out;
}

/** Unique authored piece-meanings, for wrong tiles. Includes root-piece glosses. */
export function partMeanLabels(roots: readonly Root[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    for (const item of root.words) {
      for (const piece of parseWordSplit(item.b)) {
        const mean = usablePartMean(piece.mean);
        if (!mean) continue;
        const key = canon(mean);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(mean);
      }
    }
  }
  return out;
}

export function partAsk(word: string, letters: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const part = letters.replace(/\s+/g, ' ').trim();
  if (name && part) return `In ${name}, what does ${part} mean?`;
  if (part) return `What does ${part} mean?`;
  return 'What does the other part mean?';
}

export function partTeach(word: string, letters: string, mean: string, split: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const part = letters.replace(/\s+/g, ' ').trim();
  const spoken = mean.replace(/\s+/g, ' ').trim();
  const built = split.replace(/\s+/g, ' ').trim();
  const head = part && spoken ? `${part} means ${spoken}.` : spoken;
  if (name && built) return `${head} ${name} is built from ${built}.`.trim();
  return head || 'That is the other part.';
}

export function partYesLine(letters: string, mean: string): string {
  const part = letters.replace(/\s+/g, ' ').trim();
  const spoken = mean.replace(/\s+/g, ' ').trim();
  if (!part || !spoken) return 'Yes — you got it.';
  return `Yes — ${part} means ${spoken}.`;
}

export function partMissLine(letters: string, mean: string, word?: string): string {
  const name = word?.replace(/\s+/g, ' ').trim();
  const part = letters.replace(/\s+/g, ' ').trim();
  const spoken = mean.replace(/\s+/g, ' ').trim();
  if (!part || !spoken) return 'Nope — try the next one.';
  if (name) return `Nope — in ${name}, ${part} means ${spoken}.`;
  return `Nope — ${part} means ${spoken}.`;
}

export interface BuildPick {
  word: string;
  split: string;
  /** Other words on this card. A different split, so only one tile is right. */
  siblings: string[];
}

/**
 * Which school word these pieces build. Wrong tiles are the other words
 * on the same card — not Geography next to Biology, which a kid can
 * answer by spotting "bio" and ignoring -logy.
 */
export function buildPicksForRoot(root: Root): BuildPick[] {
  const items = root.words.flatMap((item) => {
    const word = item.w.replace(/\s+/g, ' ').trim();
    const split = item.b.replace(/\s+/g, ' ').trim();
    if (!word || !split) return [];
    if (split.toLowerCase().includes(word.toLowerCase())) return [];
    return [{ word, split }];
  });
  const out: BuildPick[] = [];
  for (const item of items) {
    const siblings: string[] = [];
    const seen = new Set<string>();
    for (const other of items) {
      if (other.word.toLowerCase() === item.word.toLowerCase()) continue;
      if (other.split.toLowerCase() === item.split.toLowerCase()) continue;
      const key = other.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      siblings.push(other.word);
    }
    if (siblings.length < 1) continue;
    out.push({ word: item.word, split: item.split, siblings });
  }
  return out;
}

/** Giant type: the pieces, not the school word and not the root name. */
export function buildBig(split: string): string {
  const letters = parseWordSplit(split)
    .map((piece) => piece.letters)
    .filter(Boolean);
  if (letters.length >= 2) return letters.join(' + ');
  return split.replace(/\s+/g, ' ').trim();
}

/**
 * Question line. Same letters as the giant word — `bio + -logy`, not
 * `bio (life) + -logy (study of)`. The glosses name the word; they
 * belong on the Yes and the miss, after the tap.
 */
export function buildAsk(split: string): string {
  const pieces = buildBig(split)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!pieces) return 'Which word do these pieces build?';
  return `Which word is built from ${pieces}?`;
}

export function buildTeach(word: string, split: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const parts = split.replace(/\s+/g, ' ').trim();
  if (name && parts) return `${name} is built from ${parts}.`;
  return name || parts || 'That word is built from these pieces.';
}

export function buildYesLine(word: string, split: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const parts = split.replace(/\s+/g, ' ').trim();
  if (!name) return 'Yes — you got it.';
  if (!parts) return `Yes — ${name}.`;
  return `Yes — ${name}. Built from ${parts}.`;
}

export function buildMissLine(word: string, split: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const parts = split.replace(/\s+/g, ' ').trim();
  if (!name || !parts) return 'Nope — try the next one.';
  return `Nope — ${parts} builds ${name}.`;
}

/**
 * Which-word beat — the school word they were asked to pick.
 * "Bio means life" is the root hint, not the answer.
 */
export function wordYesLine(word: string, split?: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const parts = split?.replace(/\s+/g, ' ').trim() ?? '';
  if (!name) return 'Yes — you got it.';
  if (!parts) return `Yes — ${name}.`;
  return buildYesLine(name, parts);
}

/** Miss on that same beat — the right word first, then how it is built. */
export function wordMissLine(word: string, split?: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const parts = split?.replace(/\s+/g, ' ').trim() ?? '';
  if (!name) return 'Nope — try the next one.';
  if (!parts) return `Nope — ${name}.`;
  return `Nope — ${name}. Built from ${parts}.`;
}

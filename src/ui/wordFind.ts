/**
 * Browse find leftover after #98 / #99 / #100: the school word is open, so
 * teach that word — not "Bio means life" over Biology. Title / means / nav
 * leftover: Biology and its gloss, not Bio / life sitting over the word.
 * Hear leftover: the speaker under Century names the root (Hear the root
 * Cent), not SENT as if that were how Century sounds.
 *
 * Definitions and other-half roots are authored catalog fields. Do not
 * invent a split or a meaning.
 */
import { findSuccessLine, hearHoldLine } from '../core/deckFlow';
import { shortWordDef } from '../core/wordDef';
import { ROOTS, rootId } from '../data/roots';
import type { RootWord } from '../data/roots.data';

export { findSuccessLine, shortWordDef };

export function wordDefForOpen(
  words: ReadonlyArray<Pick<RootWord, 'w' | 'd'>>,
  open: string | null,
): string | null {
  if (!open) return null;
  const folded = open.replace(/\s+/g, ' ').trim().toLowerCase();
  const word = words.find((item) => item.w.replace(/\s+/g, ' ').trim().toLowerCase() === folded);
  const def = word?.d.replace(/\s+/g, ' ').trim();
  return def || null;
}

/** Mean line on a find card — Biology, not Bio means life. */
export function findMeanLine(word: string, def: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const gloss = shortWordDef(def);
  if (!name) return gloss;
  if (!gloss) return name;
  return `${name} — ${gloss}`;
}

/** Lead on a find card — the authored split they came to see. */
export function findLeadLine(word: string, split: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const parts = split.replace(/\s+/g, ' ').trim();
  if (!name || !parts) return name || parts;
  return `${name} is built from ${parts}.`;
}

export function findMissLine(word: string, def: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  const gloss = shortWordDef(def);
  if (!name || !gloss) return "Nope — that's okay.";
  return `Nope — ${name}: ${gloss}.`;
}

export function findHintLine(word: string): string {
  const name = word.replace(/\s+/g, ' ').trim();
  return name ? `What does ${name} mean? One tap.` : 'What does this word mean? One tap.';
}

export function findKnowLabel(): string {
  return 'I know this word ✓';
}

/** Speaker under a school word — Hear the root, not Hear Century. */
export function wordRootHearLabel(rootName: string): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  return name ? `Hear the root ${name}` : 'Hear the root';
}

/**
 * Pronunciation under a school word. The authored root spelling stays
 * (SENT), prefixed so it cannot read as the word.
 */
export function wordRootSayLine(rootName: string, say: string): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  const sound = say.replace(/\s+/g, ' ').trim();
  if (!name) return sound;
  if (!sound) return `the root ${name}`;
  return `the root ${name} · ${sound}`;
}

/** Mid-clip status on a school word — the clip is the root, not the word. */
export function wordRootListeningLine(): string {
  return 'Hearing the root…';
}

/**
 * After the clip, name the root with the same sound + meaning the root
 * card holds. A bare "sent · hundred" must not sit under Century.
 */
export function wordRootHearHold(rootName: string, say: string, mean: string): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  const held = hearHoldLine(say, mean).replace(/\s+/g, ' ').trim();
  const useful = held === '·' ? '' : held;
  if (!name) return useful;
  if (!useful) return name;
  return `${name} · ${useful}`;
}

/** ← Find opens the catalog with the query still typed — not Home. */
export function findBackOpensIndex(finding: boolean): boolean {
  return finding;
}

export interface WordAlsoRoot {
  id: string;
  root: string;
  mean: string;
}

/**
 * Other catalog roots that also teach this school word (Log for Biology,
 * Phon for Telephone). Same word, other half — not a definition mention.
 */
export function otherRootsForWord(word: string, currentId: string): WordAlsoRoot[] {
  const folded = word.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!folded) return [];
  return ROOTS.filter((root) => {
    if (rootId(root) === currentId) return false;
    return root.words.some((item) => item.w.replace(/\s+/g, ' ').trim().toLowerCase() === folded);
  }).map((root) => ({ id: rootId(root), root: root.root, mean: root.mean }));
}

export function findAlsoTapLabel(rootName: string): string {
  return `Also on ${rootName.replace(/\s+/g, ' ').trim()} →`;
}

/** Locked other half — name it, do not open a paywall. */
export function findAlsoNote(rootName: string, mean: string): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  const gloss = mean.replace(/\s+/g, ' ').trim();
  if (!gloss) return `Also on ${name}`;
  return `Also on ${name} · ${gloss}`;
}

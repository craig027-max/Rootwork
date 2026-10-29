/**
 * Root Rush question builder. Pure — combo math lives in RootRush.tsx.
 *
 * A which-root prompt must not spell the button. "Shape" can sit over
 * Form; "form · figure" cannot. A which-word prompt must not spell the
 * tile either: means "equal" over Equal, PYRE over Pyre, Fort over Fort.
 * A meaning prompt drops a say line that is the tile (AIR-oh over air).
 */

import type { Root } from '../data/roots';
import { shuffleWith } from './daily';
import { canon, pickGlossDistractors, pickMeaningDistractors, pickRootDistractors, pickWordDistractors } from './distractors';
import { glossQuietLine, meaningPrompt, spellsChoice, whichWordPrompt } from './promptFace';
import { quizGloss } from './wordDef';
import { buildAsk, buildBig, buildPicksForRoot, otherPartsForRoot, partAsk, pickPartDistractors } from './wordParts';

export { rushWordHint } from './promptFace';

export type RushQuestionType = 'mean' | 'root' | 'word' | 'gloss' | 'part' | 'build';

export interface RushOption {
  label: string;
  ok: boolean;
}

export interface RushQuestion {
  root: Root;
  type: RushQuestionType;
  ask: string;
  big: string;
  say?: string;
  sub?: string;
  opts: RushOption[];
  /** School word, when type is gloss. `big` is this word — not the root. */
  glossWord?: string;
  gloss?: string;
  /** Other piece, when type is part. `big` is this piece — not the root. */
  part?: string;
  partMean?: string;
  /** School word that piece sits in. */
  partWord?: string;
  /** School word the pieces build. `big` is the pieces — not this word. */
  buildWord?: string;
  buildSplit?: string;
  /** School word this root builds, when type is word. `big` stays the root. */
  word?: string;
  wordSplit?: string;
}

const TYPES: readonly RushQuestionType[] = ['mean', 'root', 'word', 'gloss', 'part', 'build'];

function rndOf<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Root spellings shorter than this hide inside ordinary words (re, in). */
const ROOT_SPELL_MIN = 3;

function foldLetters(value: string): string {
  return value.replace(/[^a-z]/gi, '').toLowerCase();
}

/** True when this hint contains the root the kid is supposed to pick. */
export function spellsRootAnswer(text: string, rootName: string): boolean {
  const root = foldLetters(rootName);
  if (root.length < ROOT_SPELL_MIN) return false;
  const folded = foldLetters(text);
  return folded.includes(root);
}

function altPieces(alt: string): string[] {
  return alt
    .split('·')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function pieceIsRootName(piece: string, names: readonly string[]): boolean {
  const folded = foldLetters(piece);
  if (folded.length < ROOT_SPELL_MIN) return false;
  return names.some((name) => foldLetters(name) === folded);
}

/**
 * Giant word + quiet line for "Which root carries this meaning?".
 * The meaning stays the giant word unless that word spells the root
 * (Equal / Equ). The alt stays the quiet line unless a piece of it
 * spells the root (form · figure) or is itself a root name (form).
 * Null when nothing safe is left to show — deal another question.
 */
export function whichRootFace(
  root: { root: string; mean: string; alt: string },
  rootNames: readonly string[],
): { big: string; sub?: string } | null {
  const mean = root.mean.replace(/\s+/g, ' ').trim();
  const usable = altPieces(root.alt).filter(
    (part) => !spellsRootAnswer(part, root.root) && !pieceIsRootName(part, rootNames),
  );

  if (spellsRootAnswer(mean, root.root)) {
    const face = usable.join(' · ');
    if (!face || spellsRootAnswer(face, root.root)) return null;
    return { big: cap(face) };
  }

  const sub = usable.join(' · ');
  return {
    big: mean ? cap(mean) : root.root,
    ...(sub ? { sub } : {}),
  };
}

function namesIn(pools: readonly (readonly Root[])[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const pool of pools) {
    for (const root of pool) {
      const key = root.root.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(root.root);
    }
  }
  return names;
}

export interface BuildRushQuestionInput {
  root: Root;
  scoped: readonly Root[];
  all: readonly Root[];
  type?: RushQuestionType;
  rng?: () => number;
}

/**
 * Build one question about `root`. Distractors come from `scoped` (the tiers
 * the player selected AND can access), topping up from `all` (every openable
 * root) only if the scoped pool runs dry.
 */
export function buildRushQuestion(input: BuildRushQuestionInput): RushQuestion {
  const { root: d, scoped, all } = input;
  const rng = input.rng ?? Math.random;
  const type: RushQuestionType = input.type ?? rndOf(TYPES, rng);
  const pools = [scoped, all];

  if (type === 'build') {
    const picks = buildPicksForRoot(d);
    if (picks.length > 0) {
      const picked = rndOf(picks, rng);
      const distract = shuffleWith(picked.siblings, rng).slice(0, 2);
      if (distract.length >= 1) {
        return {
          root: d,
          type,
          ask: buildAsk(picked.split),
          big: buildBig(picked.split),
          buildWord: picked.word,
          buildSplit: picked.split,
          opts: shuffleWith(
            [{ label: picked.word, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
            rng,
          ),
        };
      }
    }
  }

  if (type === 'part') {
    const picks = otherPartsForRoot(d);
    if (picks.length > 0) {
      const picked = rndOf(picks, rng);
      const distract = pickPartDistractors(
        [scoped, all],
        3,
        [picked.mean, d.mean],
        rng,
      );
      if (distract.length >= 1) {
        return {
          root: d,
          type,
          ask: partAsk(picked.word, picked.letters),
          big: picked.letters,
          sub: `in ${picked.word}`,
          part: picked.letters,
          partMean: picked.mean,
          partWord: picked.word,
          opts: shuffleWith(
            [{ label: picked.mean, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
            rng,
          ),
        };
      }
    }
  }

  if (type === 'mean') {
    const face = meaningPrompt(d);
    const distract = pickMeaningDistractors(d, pools, 3, rng);
    return {
      root: d,
      type,
      ask: 'What does this root mean?',
      big: d.root,
      ...(face.say ? { say: face.say } : {}),
      ...(face.origin ? { sub: face.origin } : {}),
      opts: shuffleWith(
        [{ label: d.mean, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
        rng,
      ),
    };
  }

  if (type === 'gloss') {
    const picks = d.words.flatMap((item) => {
      const gloss = quizGloss(item.d);
      const word = item.w.replace(/\s+/g, ' ').trim();
      if (!gloss || !word || canon(gloss) === canon(d.mean)) return [];
      return [{ word, gloss }];
    });
    if (picks.length > 0) {
      const picked = rndOf(picks, rng);
      const distract = pickGlossDistractors(d.mean, picked.word, picked.gloss, pools, 3, rng);
      if (distract.length >= 1) {
        return {
          root: d,
          type,
          ask: `What does ${picked.word} mean?`,
          big: picked.word,
          sub: glossQuietLine(d.root, d.mean, picked.gloss),
          glossWord: picked.word,
          gloss: picked.gloss,
          opts: shuffleWith(
            [{ label: picked.gloss, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
            rng,
          ),
        };
      }
    }
  }

  if (type === 'root') {
    const face = whichRootFace(d, namesIn(pools));
    if (face) {
      const distract = pickRootDistractors(d, pools, 3, rng);
      return {
        root: d,
        type,
        ask: 'Which root carries this meaning?',
        big: face.big,
        ...(face.sub ? { sub: face.sub } : {}),
        opts: shuffleWith(
          [{ label: d.root, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
          rng,
        ),
      };
    }
  }

  const safeWords = d.words.filter((item) => !spellsChoice(d.root, item.w));
  const poolWords = safeWords.length > 0 ? safeWords : d.words;
  const pickedWord = rndOf(poolWords, rng);
  const correctWord = pickedWord.w.replace(/\s+/g, ' ').trim();
  const wordSplit = pickedWord.b.replace(/\s+/g, ' ').trim();
  const distract = pickWordDistractors(d, pools, correctWord, 3, rng);
  const face = whichWordPrompt(d, correctWord);
  return {
    root: d,
    type: 'word',
    ask: 'Which word is built from this root?',
    big: face.big,
    ...(face.say ? { say: face.say } : {}),
    ...(face.hint ? { sub: face.hint } : {}),
    word: correctWord,
    wordSplit: wordSplit || undefined,
    opts: shuffleWith(
      [{ label: correctWord, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
      rng,
    ),
  };
}

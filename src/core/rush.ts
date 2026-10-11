/**
 * Root Rush question builder. Pure — combo math lives in RootRush.tsx.
 */

import type { Root } from '../data/roots';
import { shuffleWith } from './daily';
import { canon, pickMeaningDistractors, pickRootDistractors, pickWordDefDistractors, pickWordDistractors } from './distractors';
import { GLOSS_TILE_MAX, quizGloss } from './wordDef';

export type RushQuestionType = 'mean' | 'root' | 'word' | 'gloss';

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
}

const TYPES: readonly RushQuestionType[] = ['mean', 'root', 'word', 'gloss'];

function rndOf<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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

  if (type === 'mean') {
    const distract = pickMeaningDistractors(d, pools, 3, rng);
    return {
      root: d,
      type,
      ask: 'What does this root mean?',
      big: d.root,
      say: d.say,
      sub: `from ${d.org}`,
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
      const distract = pickWordDefDistractors(picked.word, picked.gloss, pools, 3, rng, GLOSS_TILE_MAX);
      if (distract.length >= 1) {
        return {
          root: d,
          type,
          ask: `What does ${picked.word} mean?`,
          big: picked.word,
          sub: `from ${d.root} · ${d.mean}`,
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
    const distract = pickRootDistractors(d, pools, 3, rng);
    return {
      root: d,
      type,
      ask: 'Which root carries this meaning?',
      big: cap(d.mean),
      sub: d.alt,
      opts: shuffleWith(
        [{ label: d.root, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
        rng,
      ),
    };
  }

  const correctWord = rndOf(d.words, rng).w;
  const distract = pickWordDistractors(d, pools, correctWord, 3, rng);
  return {
    root: d,
    type: 'word',
    ask: 'Which word is built from this root?',
    big: d.root,
    say: d.say,
    sub: `means “${d.mean}”`,
    opts: shuffleWith(
      [{ label: correctWord, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
      rng,
    ),
  };
}

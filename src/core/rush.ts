/**
 * Root Rush question builder. Pure — combo math lives in RootRush.tsx.
 */

import type { Root } from '../data/roots';
import { shuffleWith } from './daily';
import { pickMeaningDistractors, pickRootDistractors, pickWordDistractors } from './distractors';

export type RushQuestionType = 'mean' | 'root' | 'word';

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
}

const TYPES: readonly RushQuestionType[] = ['mean', 'root', 'word'];

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
    type,
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

/**
 * One-beat recall questions for Deck ("earn learned") and Daily Challenge.
 *
 * Kept free of I/O so tests can lock: 2–3 choices, one correct, no synonym
 * collisions, a teach-line on a miss (kind, not shame). Root Rush keeps its
 * own question builder — don't share combo math with this.
 */

import { ROOTS, type Root } from '../data/roots';
import { shuffleWith } from './daily';
import { pickMeaningDistractors, pickWordDistractors } from './distractors';

export type RecallKind = 'mean' | 'word';

export interface RecallOption {
  label: string;
  ok: boolean;
}

export interface RecallBeat {
  kind: RecallKind;
  ask: string;
  /** 2–3 shuffled choices, exactly one `ok`. */
  opts: RecallOption[];
  /** Shown after a miss — names the answer, never scolds. */
  teach: string;
}

export interface BuildRecallInput {
  root: Root;
  pool: readonly Root[];
  /** Force a kind (tests); otherwise a coin-flip. */
  kind?: RecallKind;
  rng?: () => number;
  /** 2 or 3 choices. Clamped to what's available. */
  choices?: 2 | 3;
}

/**
 * Build one recall beat about `root`. Distractors come from `pool` (other
 * openable roots), topping up from the full curriculum if the pool is tiny.
 * Never household-object junk — wrong tiles are other roots' meanings/words.
 */
export function buildRecall(input: BuildRecallInput): RecallBeat {
  const { root, pool } = input;
  const rng = input.rng ?? Math.random;
  const want = input.choices ?? 3;
  const kind: RecallKind = input.kind ?? (rng() < 0.5 ? 'mean' : 'word');
  const others = pool.filter((r) => r.root !== root.root);
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const pools = [others, ROOTS];

  if (kind === 'word') {
    const correct = root.words[Math.floor(rng() * root.words.length)]?.w ?? root.root;
    const distract = pickWordDistractors(root, pools, correct, distractCount, rng);
    const opts = shuffleWith(
      [{ label: correct, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
      rng,
    );
    return {
      kind,
      ask: 'Which word is built from this root?',
      opts,
      teach: `${correct} is built from ${root.root} — it means “${root.mean}.”`,
    };
  }

  const distract = pickMeaningDistractors(root, pools, distractCount, rng);
  const opts = shuffleWith(
    [{ label: root.mean, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
    rng,
  );
  const examples = root.words.map((w) => w.w.toLowerCase()).join(', ');
  return {
    kind,
    ask: 'What does this root mean?',
    opts,
    teach: `${root.root} means ${root.mean} — think ${root.alt}. Words like ${examples}.`,
  };
}

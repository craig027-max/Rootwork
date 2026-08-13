/**
 * One-beat recall questions for Deck ("earn learned") and Daily Challenge.
 *
 * Kept free of I/O so tests can lock: 2–3 choices, one correct, no synonym
 * collisions, a teach-line on a miss (kind, not shame). Root Rush keeps its
 * own question builder — don't share combo math with this.
 */

import type { Root } from '../data/roots';
import { shuffleWith } from './daily';

/** Near-identical meanings that must never appear as rival tiles. */
const SYNONYM_GROUPS: string[][] = [
  ['great', 'huge', 'large'],
  ['feeling', 'feel'],
  ['born', 'birth'],
  ['war', 'fight'],
  ['believe', 'faith'],
  ['lead', 'leader'],
  ['see', 'look'],
  ['life', 'living'],
];

const SYNONYM_CANON = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYM_CANON.set(word, group[0]!);
}

function canon(label: string): string {
  const k = label.trim().toLowerCase();
  return SYNONYM_CANON.get(k) ?? k;
}

const FALLBACK_MEANS = ['moon', 'color', 'number', 'shape', 'weather'];
const FALLBACK_WORDS = ['Window', 'Blanket', 'Sandwich', 'Pillow', 'Ladder'];

function sampleUnique(pools: readonly string[][], n: number, exclude: readonly string[]): string[] {
  const seen = new Set(exclude.map(canon));
  const out: string[] = [];
  for (const pool of pools) {
    for (const v of shuffleWith(pool)) {
      const k = canon(v);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(v);
      if (out.length >= n) return out;
    }
  }
  return out;
}

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
 * openable roots), with generic fallbacks if the pool is tiny.
 */
export function buildRecall(input: BuildRecallInput): RecallBeat {
  const { root, pool } = input;
  const rng = input.rng ?? Math.random;
  const want = input.choices ?? 3;
  const kind: RecallKind = input.kind ?? (rng() < 0.5 ? 'mean' : 'word');
  const others = pool.filter((r) => r.root !== root.root);
  const distractCount = Math.max(1, Math.min(want - 1, 2));

  if (kind === 'word') {
    const correct = root.words[Math.floor(rng() * root.words.length)]?.w ?? root.root;
    const core = root.root.toLowerCase();
    const wordPool = others.flatMap((r) =>
      r.words.filter((w) => !w.w.toLowerCase().includes(core)).map((w) => w.w),
    );
    const distract = sampleUnique([wordPool, FALLBACK_WORDS], distractCount, [correct]);
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

  const meanPool = others.map((r) => r.mean);
  const distract = sampleUnique([meanPool, FALLBACK_MEANS], distractCount, [root.mean]);
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

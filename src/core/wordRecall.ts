/**
 * One-beat recall about a school word opened from Browse find.
 *
 * Root recall stays in recall.ts — this asks "What does Biology mean?"
 * so a find visit cannot quiz Bio / life over the word they typed.
 */
import { ROOTS, type Root } from '../data/roots';
import { canon, sampleUnique } from './distractors';
import { shortWordDef } from './wordDef';
import type { RecallBeat } from './recall';
import { shuffleWith } from './daily';

export interface BuildWordRecallInput {
  word: string;
  def: string;
  split: string;
  pool: readonly Root[];
  rng?: () => number;
  choices?: 2 | 3;
}

function collectWordDefs(pools: readonly (readonly Root[])[], skipWord: string): string[] {
  const skip = skipWord.replace(/\s+/g, ' ').trim().toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const pool of pools) {
    for (const root of pool) {
      for (const item of root.words) {
        const name = item.w.replace(/\s+/g, ' ').trim().toLowerCase();
        if (name === skip) continue;
        const gloss = shortWordDef(item.d);
        if (!gloss) continue;
        const key = canon(gloss);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(gloss);
      }
    }
  }
  return out;
}

export function pickWordDefDistractors(
  word: string,
  correct: string,
  pools: readonly (readonly Root[])[],
  n: number,
  rng: () => number = Math.random,
): string[] {
  const labels = collectWordDefs(pools, word);
  return sampleUnique([labels], n, [correct], rng);
}

/** One beat: what the found school word means. Authored defs only. */
export function buildWordRecall(input: BuildWordRecallInput): RecallBeat {
  const rng = input.rng ?? Math.random;
  const want = input.choices ?? 3;
  const word = input.word.replace(/\s+/g, ' ').trim();
  const split = input.split.replace(/\s+/g, ' ').trim();
  const correct = shortWordDef(input.def) || input.def.replace(/\s+/g, ' ').trim();
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const distract = pickWordDefDistractors(word, correct, [input.pool, ROOTS], distractCount, rng);
  const opts = shuffleWith(
    [{ label: correct, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
    rng,
  );
  return {
    kind: 'mean',
    ask: word ? `What does ${word} mean?` : 'What does this word mean?',
    opts,
    teach: word
      ? `${word} — ${correct}.${split ? ` Built from ${split}.` : ''}`
      : `${correct}.`,
  };
}

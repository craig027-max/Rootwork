/**
 * Shared quiz-option picking for Root Rush, Deck recall, and Daily.
 *
 * Combo scoring stays in RootRush — this module only builds labels.
 * Wrong answers should teach: other real curriculum words/meanings, never
 * household junk, and never a word that actually contains the target root.
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

/** Canonical form for dedupe: lowercase, synonym groups collapse to one key. */
export function canon(label: string): string {
  const k = label.trim().toLowerCase();
  return SYNONYM_CANON.get(k) ?? k;
}

/**
 * Draw up to `n` labels that are canonically unique against `exclude` AND each
 * other. Pools are tried in order so a tier-scoped pool can fall back to a
 * wider one.
 */
export function sampleUnique(
  pools: readonly (readonly string[])[],
  n: number,
  exclude: readonly string[],
  rng: () => number = Math.random,
): string[] {
  const seen = new Set(exclude.map(canon));
  const out: string[] = [];
  for (const pool of pools) {
    for (const v of shuffleWith(pool, rng)) {
      const k = canon(v);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(v);
      if (out.length >= n) return out;
    }
  }
  return out;
}

/** True when `word` contains this root's letters — it would be a valid "built from" answer. */
export function wordContainsRoot(word: string, root: string): boolean {
  const w = word.toLowerCase();
  const r = root.trim().toLowerCase();
  if (!r) return false;
  return w.includes(r);
}

export function commonPrefixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/** Tiny Levenshtein for short root strings (Form vs Fort, Photo vs Phon). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j] ?? 0;
  }
  return prev[n] ?? n;
}

/**
 * Higher = better wrong answer for "which word is built from this root?".
 * Near-miss roots (Form/Fort) beat unrelated everyday words (Preview).
 */
export function scoreWordDistractor(
  word: string,
  correct: string,
  targetRoot: string,
  fromRoot?: string,
): number {
  const w = word.toLowerCase();
  const c = correct.toLowerCase();
  const r = targetRoot.toLowerCase();
  let s = 0;

  const prefix = commonPrefixLen(w, r);
  if (prefix >= 3) s += 14;
  else if (prefix >= 2 && r.length >= 4) s += 8;

  if (fromRoot) {
    const d = editDistance(fromRoot.toLowerCase(), r);
    if (d === 1) s += 16;
    else if (d === 2 && r.length >= 4) s += 10;
  }

  s += Math.max(0, 6 - Math.abs(w.length - c.length));

  if (w.length >= 8) s += 3;
  else if (w.length >= 6) s += 1;
  if (w.length <= 4 && prefix < 2) s -= 6;

  if (/(tion|sion|ology|ography|meter|scope|phone|ment|ture|ance|ence|able|graph|cycle)$/i.test(w)) {
    s += 2;
  }

  return s;
}

interface WordPick {
  label: string;
  fromRoot: string;
  score: number;
}

function collectWordPicks(
  target: Root,
  pools: readonly (readonly Root[])[],
  correct: string,
): WordPick[] {
  const seen = new Set<string>([canon(correct)]);
  const out: WordPick[] = [];
  for (const pool of pools) {
    for (const r of pool) {
      if (r.root === target.root) continue;
      for (const w of r.words) {
        if (wordContainsRoot(w.w, target.root)) continue;
        const k = canon(w.w);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({
          label: w.w,
          fromRoot: r.root,
          score: scoreWordDistractor(w.w, correct, target.root, r.root),
        });
      }
    }
  }
  return out;
}

function pickFromScored(scored: WordPick[], n: number, rng: () => number): string[] {
  if (n <= 0 || scored.length === 0) return [];
  const ranked = [...scored].sort(
    (a, b) => b.score - a.score || a.label.localeCompare(b.label),
  );
  const bandSize = Math.min(ranked.length, Math.max(16, n * 6));
  const band = ranked.slice(0, bandSize);
  const shuffled = shuffleWith(band, rng);
  const usedRoots = new Set<string>();
  const out: string[] = [];

  for (const c of shuffled) {
    const rk = c.fromRoot.toLowerCase();
    if (usedRoots.has(rk)) continue;
    usedRoots.add(rk);
    out.push(c.label);
    if (out.length >= n) return out;
  }
  for (const c of shuffled) {
    if (out.includes(c.label)) continue;
    out.push(c.label);
    if (out.length >= n) return out;
  }
  if (out.length >= n) return out;
  for (const c of ranked) {
    if (out.includes(c.label)) continue;
    out.push(c.label);
    if (out.length >= n) return out;
  }
  return out;
}

/**
 * Wrong options for "which word is built from this root?".
 * Every label is a real curriculum example word that does not contain the root.
 */
export function pickWordDistractors(
  target: Root,
  pools: readonly (readonly Root[])[],
  correct: string,
  n: number,
  rng: () => number = Math.random,
): string[] {
  return pickFromScored(collectWordPicks(target, pools, correct), n, rng);
}

/** Wrong options for "what does this root mean?" — other root meanings only. */
export function pickMeaningDistractors(
  target: Root,
  pools: readonly (readonly Root[])[],
  n: number,
  rng: () => number = Math.random,
): string[] {
  const meanPools = pools.map((set) =>
    set.filter((r) => r.root !== target.root).map((r) => r.mean),
  );
  return sampleUnique(meanPools, n, [target.mean], rng);
}

/** Wrong options for "which root carries this meaning?". */
export function pickRootDistractors(
  target: Root,
  pools: readonly (readonly Root[])[],
  n: number,
  rng: () => number = Math.random,
): string[] {
  const rootPools = pools.map((set) =>
    set
      .filter((r) => r.root !== target.root && canon(r.mean) !== canon(target.mean))
      .map((r) => r.root),
  );
  return sampleUnique(rootPools, n, [target.root], rng);
}

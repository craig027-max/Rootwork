/**
 * Daily Challenge — five openable roots, fresh each local calendar day.
 *
 * Pure and Date-injectable so tests can lock the deal without I/O. The store
 * persists completion via `lastDailyDay` on GameStats (local-first, like
 * progress); entitlement filtering happens at the call site with
 * `isRootOpenable`, so free learners only ever see Tier 1.
 */

import type { Root } from '../data/roots';

export const DAILY_COUNT = 5;

/** Local calendar day as YYYY-MM-DD (the same key the streak logic uses). */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Seed string for a learner's daily deal (day + student namespace). */
export function dailySeed(day: string, studentId: string | null): string {
  return `${day}:${studentId ?? 'anon'}`;
}

/** Deterministic 32-bit hash (cyrb53-ish, truncated) for a seed string. */
export function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** Mulberry32 — a tiny seeded PRNG in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle using an injected RNG (defaults to Math.random). */
export function shuffleWith<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/**
 * Pick today's roots from an already-filtered pool (openable roots only).
 * Same seed → same deal; order is the play order.
 */
export function pickDailyRoots(
  pool: readonly Root[],
  seed: string,
  count: number = DAILY_COUNT,
): Root[] {
  if (pool.length === 0 || count <= 0) return [];
  const rng = mulberry32(hashSeed(seed));
  return shuffleWith(pool, rng).slice(0, Math.min(count, pool.length));
}

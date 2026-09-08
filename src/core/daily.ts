/**
 * Daily Challenge — five openable roots, fresh each local calendar day.
 *
 * Pure and Date-injectable so tests can lock the deal without I/O. The store
 * persists completion via `lastDailyDay` on GameStats (local-first, like
 * progress); entitlement filtering happens at the call site with
 * `isRootOpenable`, so free learners only ever see Tier 1.
 *
 * Mid-run resume (`DailyRun`) is also local-first. A kid who banks two of
 * five, then taps Home, must land back on question 3 — not a Start-daily
 * dump. A correct tap holds the meaning until Next (same spirit as Hear /
 * Yes), so Photo cannot slam over Bio.
 */

import type { Root } from '../data/roots';

export const DAILY_COUNT = 5;

/** Home Daily tile peeks this many of today's deal — the challenge stays five. */
export const DAILY_TILE_PREVIEW_COUNT = 3;

/** Name + one-line meaning for the Home Daily tile (first N of today's pick). */
export interface DailyTileLine {
  root: string;
  mean: string;
}

/**
 * Preview today's Daily on Home: the first three of the real pick, in play
 * order. Does not shrink the challenge — `pickDailyRoots` still deals five.
 */
export function dailyTilePreview(
  deal: readonly { root: string; mean: string }[],
  count: number = DAILY_TILE_PREVIEW_COUNT,
): DailyTileLine[] {
  if (deal.length === 0 || count <= 0) return [];
  return deal.slice(0, Math.min(count, deal.length)).map((r) => ({
    root: r.root,
    mean: r.mean,
  }));
}

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

/** In-progress Daily — next unanswered index, namespaced per learner + day. */
export interface DailyRun {
  day: string;
  studentId: string | null;
  /** Next unanswered root (0-based). 0 is a fresh start, not a resume. */
  qi: number;
}

/** Coerce a stored blob into a DailyRun, or drop junk. */
export function parseDailyRun(raw: unknown): DailyRun | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.day)) return null;
  if (o.studentId != null && typeof o.studentId !== 'string') return null;
  if (typeof o.qi !== 'number' || !Number.isInteger(o.qi) || o.qi < 0) return null;
  return { day: o.day, studentId: o.studentId ?? null, qi: o.qi };
}

/**
 * Next unanswered index if this saved run is still today's and they have
 * already banked at least one root. Yesterday, another kid, qi 0, or a
 * finished index must not pretend to be a resume.
 */
export function resumeDailyQi(
  run: DailyRun | null | undefined,
  day: string,
  studentId: string | null,
  total: number,
): number | null {
  if (!run || total <= 0) return null;
  if (run.day !== day) return null;
  if ((run.studentId ?? null) !== (studentId ?? null)) return null;
  if (!Number.isInteger(run.qi) || run.qi < 1 || run.qi >= total) return null;
  return run.qi;
}

/** Checklist / tile copy: how many they have already got right. */
export function dailyProgressLabel(answered: number, total: number): string {
  return `Daily · ${answered} of ${total}`;
}

/** Fat tap / overlay CTA after a real mid-run (next question is 1-based). */
export function continueDailyLabel(nextIndex: number, total: number): string {
  return `Continue Daily · ${nextIndex + 1} of ${total} ›`;
}

/** After a correct Daily tap — the meaning, not "is yours." */
export function dailyHoldLine(rootName: string, mean: string): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  const spokenMean = mean.replace(/\s+/g, ' ').trim();
  return `Yes — ${name} means ${spokenMean}.`;
}

/** Kid-facing label for the one tap that leaves the Daily hold. */
export function afterDailyNextLabel(isLast: boolean): string {
  return isLast ? 'Done →' : 'Next →';
}

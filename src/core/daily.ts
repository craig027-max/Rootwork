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
 * dump — and Home names that next root (Chron · time), not the already-got
 * first three. A correct tap holds the meaning until Next (same spirit as
 * Hear / Yes / Remember), then peeks the next root so Next is not a dump
 * onto an unnamed card. Photo cannot slam over Bio. An owned hit is
 * today's Remember; the first hit banks the play-today streak. Last hold
 * peeks Continue · next learn — or Keep going when today's learn is
 * already done. Same next the done overlay already names.
 * Boot Continue prefers that live mid-run over the next learn, so a
 * returning kid lands on Chron — not a Geo dump.
 * After the five are banked, Home / overlay / menu recap that done set —
 * "Today's five are done" — not a fresh-start pitch over Chron. Recap
 * chips Remember owned roots and Meet unowned ones. Fat Continue /
 * Keep going / Rush taps stay where #68 put them. After Daily + a
 * learn, an owned Rush miss makes Remember the done hero — Play
 * again / Keep going must not sit over Geo. Rush start now matches
 * that same fat tap. Last hold peeks Remember when that miss is the
 * done hero — Keep going must not sit over Geo there either.
 * Daily done overlay / Home Daily lead now match that same name —
 * Done for today / Streak banked must not sit over Geo. Home
 * Daily now matches that same chrome — Daily / DONE / Done for
 * today / the 🔥 streak must not sit over Geo. The
 * five-are-done recap stays.
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
 * Mid-run Home uses `dailyResumePreview` so already-got roots are not
 * teased as if they are still coming.
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

/**
 * Mid-run Daily peek: remaining roots starting at the next unanswered
 * index — same honesty as a tier tile peeking Geo after Bio is owned.
 * Fresh start (`from` 0) and junk indexes fall back to the first-three
 * teaser. A finished index peeks nothing.
 */
export function dailyResumePreview(
  deal: readonly { root: string; mean: string }[],
  from: number,
  count: number = DAILY_TILE_PREVIEW_COUNT,
): DailyTileLine[] {
  if (!Number.isInteger(from) || from < 1) return dailyTilePreview(deal, count);
  if (from >= deal.length) return [];
  return dailyTilePreview(deal.slice(from), count);
}

/** Next unanswered Daily root when a mid-run is live. */
export function dailyNextRoot<T>(
  deal: readonly T[],
  resumeQi: number | null | undefined,
): T | undefined {
  if (resumeQi == null || !Number.isInteger(resumeQi) || resumeQi < 1) return undefined;
  if (resumeQi >= deal.length) return undefined;
  return deal[resumeQi];
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

/**
 * Live mid-run index for Home / Rush / Daily / boot. A finished Daily
 * (lastDailyDay is today) must not keep peeking Continue Daily.
 */
export function liveDailyResumeQi(
  run: DailyRun | null | undefined,
  day: string,
  studentId: string | null,
  total: number,
  lastDailyDay: string | null | undefined,
): number | null {
  if (lastDailyDay === day) return null;
  return resumeDailyQi(run, day, studentId, total);
}

/** Where a returning kid should land — Daily mid-run wins over the next learn. */
export type BootResume =
  | { kind: 'daily' }
  | { kind: 'learn'; rootId: string }
  | { kind: 'home' };

/**
 * Boot Continue. A live Daily mid-run is the same hero Rush / Home already
 * name — do not dump them onto Geo while Chron is still waiting.
 * Fresh / finished / junk indexes fall through to the next learn, then Home.
 */
export function resolveBootResume(opts: {
  dailyResumeQi?: number | null;
  dailyTotal?: number;
  nextRootId: string | null;
}): BootResume {
  const total = opts.dailyTotal && opts.dailyTotal > 0 ? opts.dailyTotal : 5;
  const qi = opts.dailyResumeQi;
  if (typeof qi === 'number' && Number.isInteger(qi) && qi >= 1 && qi < total) {
    return { kind: 'daily' };
  }
  if (opts.nextRootId) return { kind: 'learn', rootId: opts.nextRootId };
  return { kind: 'home' };
}

/** Checklist / tile copy: how many they have already got right. */
export function dailyProgressLabel(answered: number, total: number): string {
  return `Daily · ${answered} of ${total}`;
}

/**
 * Today-row mid-run: keep the count, then name the next root + meaning.
 * Fat Continue / Keep going taps stay elsewhere — this is the Daily path.
 */
export function dailyNextRowLabel(opts: {
  answered: number;
  total: number;
  nextName?: string;
  nextMean?: string;
}): string {
  const count = dailyProgressLabel(opts.answered, opts.total);
  const name = opts.nextName?.replace(/\s+/g, ' ').trim();
  if (!name) return count;
  const mean = opts.nextMean?.replace(/\s+/g, ' ').trim();
  return mean ? `${count} · ${name} · ${mean}` : `${count} · ${name}`;
}

/** Menu-row mid-run: same "Next · {root}" language as an in-progress tier. */
export function dailyNextSub(nextName: string): string {
  return `Next · ${nextName.replace(/\s+/g, ' ').trim()}`;
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

/**
 * After the Yes hold, name the next unanswered Daily root the way Home
 * already peeks it — so Next is not a dump onto an unnamed card.
 * Last root has no Daily Next peek — it peeks Continue · next learn instead.
 */
export function dailyHoldNextLine(nextName: string, nextMean?: string): string {
  const name = nextName.replace(/\s+/g, ' ').trim();
  const mean = nextMean?.replace(/\s+/g, ' ').trim();
  return mean ? `Next · ${name} · ${mean}` : `Next · ${name}`;
}

/**
 * Last Daily hold peeks the same Continue · next learn the done overlay uses —
 * Done → is not a dump onto an unnamed card. No next learn → no peek.
 */
export function dailyHoldContinueLine(nextName: string, nextMean?: string): string {
  const name = nextName.replace(/\s+/g, ' ').trim();
  const mean = nextMean?.replace(/\s+/g, ' ').trim();
  return mean ? `Continue · ${name} · ${mean}` : `Continue · ${name}`;
}

/**
 * Last Daily hold after today's learn is already done — Keep going, not
 * another unfinished Continue. Same extra-play language as Today ✓.
 */
export function dailyHoldKeepGoingLine(nextName: string, nextMean?: string): string {
  const name = nextName.replace(/\s+/g, ' ').trim();
  const mean = nextMean?.replace(/\s+/g, ' ').trim();
  return mean ? `Keep going · ${name} · ${mean}` : `Keep going · ${name}`;
}

/**
 * Last Daily hold after Daily + a learn, when an owned Rush miss is
 * the done hero — Remember, not Keep going over Geo.
 */
export function dailyHoldRememberLine(nextName: string, nextMean?: string): string {
  const name = nextName.replace(/\s+/g, ' ').trim();
  const mean = nextMean?.replace(/\s+/g, ' ').trim();
  return mean ? `Remember · ${name} · ${mean}` : `Remember · ${name}`;
}

/** Kid-facing label for the one tap that leaves the Daily hold. */
export function afterDailyNextLabel(isLast: boolean): string {
  return isLast ? 'Done →' : 'Next →';
}

function cleanDailyNames(names?: readonly string[], max = 3): string[] {
  return (names ?? [])
    .map((n) => n.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Home Daily tile lead after the five are banked — recap, not
 * "Five fresh roots every day." Chips / Today already name the set.
 * A path-done Rush miss drops Streak banked — Remember is still
 * waiting, so the tile must not celebrate a finished day over Geo.
 */
export function dailyDoneLead(
  streak?: number,
  opts: { missWaiting?: boolean } = {},
): string {
  const days = typeof streak === 'number' && Number.isFinite(streak) ? Math.max(0, Math.round(streak)) : 0;
  const streakLine =
    !opts.missWaiting && days > 0
      ? ` Streak banked — 🔥 ${days} day${days === 1 ? '' : 's'}.`
      : '';
  return `Today's five are done. Same until tomorrow.${streakLine}`;
}

/**
 * Home Daily menu row after the five are banked — named recap, not a
 * nameless "Done for today · same five until tomorrow" dump. A
 * path-done Rush miss names Remember — DONE / Done for today must
 * not sit over Geo.
 */
export function dailyDoneMenuSub(
  names?: readonly string[],
  opts: { missName?: string } = {},
): string {
  const miss = opts.missName?.replace(/\s+/g, ' ').trim();
  if (miss) return `Missed ${miss} · remember`;
  const cleaned = cleanDailyNames(names);
  if (cleaned.length === 0) return 'Done for today · same five until tomorrow';
  return `Done · ${cleaned.join(' · ')}`;
}

/**
 * Daily overlay sub after the five are banked. Streak stays on the
 * streak line — this names the recap, not a fresh-start pitch.
 */
export function dailyDoneOverlaySub(justFinished: boolean): string {
  return justFinished
    ? "Today's five are done. Same until tomorrow."
    : "Today's five are done. Replay is just for fun.";
}

/**
 * Done-recap chip aria. Owned roots Remember; unowned ones Meet —
 * Daily must not say Remember Chron when Chron is still unlearned.
 */
export function dailyRecapChipLabel(rootName: string, owned: boolean): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  if (!name) return owned ? 'Remember' : 'Meet this root';
  return owned ? `Remember ${name}` : `Meet ${name}`;
}

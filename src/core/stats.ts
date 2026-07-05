/**
 * Gamification stats — pure, testable scoring + streak logic for Wondral Words.
 *
 * Kept free of I/O and `Date` so the rules are locked by unit tests
 * (`stats.test.ts`); the store injects the calendar day and persists the result
 * (localStorage today, Supabase later — mirrors how `progress` is handled). This
 * is what lights up the profile band (streak / stars / accuracy / level) with
 * real numbers instead of the design's placeholders.
 */

export interface GameStats {
  /** Experience points — drives the level badge. */
  xp: number;
  /** Stars banked across every quiz run (cumulative — replay-friendly). */
  totalStars: number;
  /** Lifetime quiz questions seen / answered correctly → accuracy. */
  questionsAnswered: number;
  questionsCorrect: number;
  /** Best single-run stars / accuracy, for the "new best" celebration. */
  bestStars: number;
  bestPct: number;
  /** Best single-run Root Rush combo score (points, not stars). */
  bestScore: number;
  /** Completed quiz runs. */
  runs: number;
  /** Daily streak: consecutive calendar days with ≥1 learning action. */
  streakCurrent: number;
  streakLongest: number;
  /** Last active calendar day (YYYY-MM-DD, local), or null if never active. */
  lastActiveDay: string | null;
}

export const EMPTY_STATS: GameStats = {
  xp: 0,
  totalStars: 0,
  questionsAnswered: 0,
  questionsCorrect: 0,
  bestStars: 0,
  bestPct: 0,
  bestScore: 0,
  runs: 0,
  streakCurrent: 0,
  streakLongest: 0,
  lastActiveDay: null,
};

export const XP_PER_ROOT = 10;
export const XP_PER_LEVEL = 100;

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

/** Stars (0–5) for a run's accuracy percentage. */
export function starsForPct(pct: number): number {
  if (pct >= 100) return 5;
  if (pct >= 80) return 4;
  if (pct >= 60) return 3;
  if (pct >= 40) return 2;
  if (pct >= 20) return 1;
  return 0;
}

/** Letter grade for a run's accuracy percentage. */
export function gradeForPct(pct: number): Grade {
  if (pct >= 100) return 'S';
  if (pct >= 80) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 40) return 'C';
  return 'D';
}

/** Level from total XP (1-based; every XP_PER_LEVEL points is a level). */
export function levelForXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

/** XP awarded for a finished quiz run. */
export function xpForRun(correct: number, stars: number): number {
  return correct * 5 + stars * 10;
}

/** Lifetime quiz accuracy %, or null when no questions have been answered. */
export function accuracyPct(stats: GameStats): number | null {
  if (stats.questionsAnswered <= 0) return null;
  return Math.round((stats.questionsCorrect / stats.questionsAnswered) * 100);
}

/** Days since the Unix epoch for a YYYY-MM-DD day key (UTC-safe integer). */
function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Apply a day's activity to the streak. Same day → unchanged; the next calendar
 * day → +1; any larger gap (or first ever) → reset to 1.
 */
export function bumpStreak(
  stats: GameStats,
  day: string,
): Pick<GameStats, 'streakCurrent' | 'streakLongest' | 'lastActiveDay'> {
  if (stats.lastActiveDay === day) {
    return {
      streakCurrent: stats.streakCurrent,
      streakLongest: stats.streakLongest,
      lastActiveDay: stats.lastActiveDay,
    };
  }
  const consecutive =
    stats.lastActiveDay != null && dayNumber(day) - dayNumber(stats.lastActiveDay) === 1;
  const streakCurrent = consecutive ? stats.streakCurrent + 1 : 1;
  return {
    streakCurrent,
    streakLongest: Math.max(stats.streakLongest, streakCurrent),
    lastActiveDay: day,
  };
}

export interface RunResult {
  pct: number;
  stars: number;
  grade: Grade;
  isNewBest: boolean;
  /** Only present when the run reported a combo `score`: it beat `bestScore`. */
  isNewBestScore?: boolean;
}

/** Record a finished quiz run; returns the new stats + a summary for the UI. */
export function recordRun(
  stats: GameStats,
  input: { correct: number; total: number; day: string; score?: number },
): { stats: GameStats; run: RunResult } {
  const total = Math.max(0, input.total);
  const correct = Math.max(0, Math.min(input.correct, total));
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const stars = starsForPct(pct);
  const isNewBest = stars > stats.bestStars || (stars === stats.bestStars && pct > stats.bestPct);
  // Older persisted blobs may predate bestScore; treat a missing field as 0.
  const prevBestScore = stats.bestScore ?? 0;

  const next: GameStats = {
    ...stats,
    xp: stats.xp + xpForRun(correct, stars),
    totalStars: stats.totalStars + stars,
    questionsAnswered: stats.questionsAnswered + total,
    questionsCorrect: stats.questionsCorrect + correct,
    bestStars: Math.max(stats.bestStars, stars),
    bestPct: Math.max(stats.bestPct, pct),
    bestScore: Math.max(prevBestScore, input.score ?? 0),
    runs: stats.runs + 1,
    ...bumpStreak(stats, input.day),
  };

  return {
    stats: next,
    run: {
      pct,
      stars,
      grade: gradeForPct(pct),
      isNewBest,
      ...(input.score != null ? { isNewBestScore: input.score > prevBestScore } : {}),
    },
  };
}

/** Record that a root was marked learned (XP + streak). */
export function recordRootLearned(stats: GameStats, input: { day: string }): GameStats {
  return {
    ...stats,
    xp: stats.xp + XP_PER_ROOT,
    ...bumpStreak(stats, input.day),
  };
}

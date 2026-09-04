/**
 * Home profile-band view model — honest returning-learner progress.
 *
 * The band used to hide streak risk in a `title` tooltip (invisible on phones)
 * and always render Stars 0 / Accuracy — / Streak — as dead chrome. This
 * derives what a kid should actually see: a visible today-status line, and
 * only the stats that have been earned.
 *
 * Pure and Date-injectable (pass `day`) so tests lock the copy without I/O.
 */
import { accuracyPct, type GameStats } from '../../core/stats';
import { ROOTS } from '../../data/roots';

export type StreakKind = 'none' | 'risk' | 'banked';

export interface ProfileStat {
  key: 'streak' | 'stars' | 'acc' | 'roots';
  value: string;
  suffix?: string;
  label: string;
}

export interface ProfileProgress {
  firstRun: boolean;
  hello: string;
  hint: string | null;
  streakKind: StreakKind;
  showXp: boolean;
  stats: ProfileStat[];
}

/** Streak state for a given local calendar day. */
export function streakKindFor(stats: GameStats, day: string): StreakKind {
  if (stats.streakCurrent <= 0) return 'none';
  if (stats.lastActiveDay === day) return 'banked';
  return 'risk';
}

/**
 * What the profile band shows. `rootsTotal` defaults to the live catalog so
 * the owned count stays honest without hardcoding a size.
 */
export function buildProfileProgress(
  stats: GameStats,
  rootsOwned: number,
  day: string,
  rootsTotal: number = ROOTS.length,
): ProfileProgress {
  const firstRun = rootsOwned === 0 && stats.runs === 0;
  const kind = streakKindFor(stats, day);
  const accuracy = accuracyPct(stats);

  const hello = firstRun ? 'Grow your first root 🌱' : kind === 'risk' ? 'Keep your streak' : 'Welcome back';

  let hint: string | null = null;
  if (kind === 'risk') {
    hint = `Play today to keep your ${stats.streakCurrent}-day streak`;
  } else if (kind === 'banked') {
    hint = 'Streak banked for today ✓';
  } else if (!firstRun) {
    hint = 'Learn a root today to start a streak';
  }

  const rows: ProfileStat[] = [];
  if (kind !== 'none') {
    rows.push({
      key: 'streak',
      value: `🔥 ${stats.streakCurrent}${kind === 'banked' ? ' ✓' : ''}`,
      label: kind === 'risk' ? 'Play today' : 'Banked',
    });
  }
  if (stats.totalStars > 0) {
    rows.push({ key: 'stars', value: `★ ${stats.totalStars}`, label: 'Stars' });
  }
  if (accuracy !== null) {
    rows.push({ key: 'acc', value: `${accuracy}%`, label: 'Accuracy' });
  }
  rows.push({
    key: 'roots',
    value: String(rootsOwned),
    suffix: ` / ${rootsTotal}`,
    label: 'Roots Owned',
  });

  return {
    firstRun,
    hello,
    hint,
    streakKind: kind,
    showXp: stats.xp > 0,
    stats: rows,
  };
}

import { describe, it, expect } from 'vitest';
import {
  EMPTY_STATS,
  accuracyPct,
  bumpStreak,
  gradeForPct,
  levelForXp,
  recordRootLearned,
  recordRun,
  starsForPct,
  xpForRun,
  XP_PER_ROOT,
} from './stats';

describe('starsForPct / gradeForPct', () => {
  it('maps accuracy bands to stars', () => {
    expect(starsForPct(100)).toBe(5);
    expect(starsForPct(80)).toBe(4);
    expect(starsForPct(79)).toBe(3);
    expect(starsForPct(60)).toBe(3);
    expect(starsForPct(40)).toBe(2);
    expect(starsForPct(20)).toBe(1);
    expect(starsForPct(19)).toBe(0);
    expect(starsForPct(0)).toBe(0);
  });

  it('maps accuracy bands to letter grades', () => {
    expect(gradeForPct(100)).toBe('S');
    expect(gradeForPct(80)).toBe('A');
    expect(gradeForPct(60)).toBe('B');
    expect(gradeForPct(40)).toBe('C');
    expect(gradeForPct(39)).toBe('D');
  });
});

describe('levelForXp', () => {
  it('is 1-based and steps every 100 xp', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
    expect(levelForXp(-5)).toBe(1);
  });
});

describe('accuracyPct', () => {
  it('is null with no answers, else rounded lifetime accuracy', () => {
    expect(accuracyPct(EMPTY_STATS)).toBeNull();
    expect(accuracyPct({ ...EMPTY_STATS, questionsAnswered: 8, questionsCorrect: 7 })).toBe(88);
  });
});

describe('bumpStreak', () => {
  it('starts at 1 on first activity', () => {
    expect(bumpStreak(EMPTY_STATS, '2026-06-29')).toEqual({
      streakCurrent: 1,
      streakLongest: 1,
      lastActiveDay: '2026-06-29',
    });
  });

  it('does not double-count the same day', () => {
    const s = { ...EMPTY_STATS, streakCurrent: 3, streakLongest: 5, lastActiveDay: '2026-06-29' };
    expect(bumpStreak(s, '2026-06-29')).toEqual({
      streakCurrent: 3,
      streakLongest: 5,
      lastActiveDay: '2026-06-29',
    });
  });

  it('increments on the next calendar day (across a month boundary)', () => {
    const s = { ...EMPTY_STATS, streakCurrent: 2, streakLongest: 2, lastActiveDay: '2026-06-30' };
    expect(bumpStreak(s, '2026-07-01')).toEqual({
      streakCurrent: 3,
      streakLongest: 3,
      lastActiveDay: '2026-07-01',
    });
  });

  it('resets after a gap but keeps the longest', () => {
    const s = { ...EMPTY_STATS, streakCurrent: 6, streakLongest: 6, lastActiveDay: '2026-06-25' };
    expect(bumpStreak(s, '2026-06-29')).toEqual({
      streakCurrent: 1,
      streakLongest: 6,
      lastActiveDay: '2026-06-29',
    });
  });
});

describe('recordRun', () => {
  it('banks stars, accuracy, xp and a run summary', () => {
    const { stats, run } = recordRun(EMPTY_STATS, { correct: 8, total: 8, day: '2026-06-29' });
    expect(run).toEqual({ pct: 100, stars: 5, grade: 'S', isNewBest: true });
    expect(stats.totalStars).toBe(5);
    expect(stats.questionsAnswered).toBe(8);
    expect(stats.questionsCorrect).toBe(8);
    expect(stats.runs).toBe(1);
    expect(stats.xp).toBe(xpForRun(8, 5));
    expect(stats.streakCurrent).toBe(1);
  });

  it('accumulates across runs and flags only a genuine new best', () => {
    const first = recordRun(EMPTY_STATS, { correct: 4, total: 8, day: '2026-06-29' });
    expect(first.run.stars).toBe(2);
    expect(first.run.isNewBest).toBe(true);

    const second = recordRun(first.stats, { correct: 2, total: 8, day: '2026-06-29' });
    expect(second.run.isNewBest).toBe(false);
    expect(second.stats.totalStars).toBe(first.stats.totalStars + 1);
    // same day → streak unchanged
    expect(second.stats.streakCurrent).toBe(1);
  });

  it('clamps nonsense input', () => {
    const { run } = recordRun(EMPTY_STATS, { correct: 99, total: 8, day: '2026-06-29' });
    expect(run.pct).toBe(100);
  });

  it('banks a combo score and flags only a genuine new best score', () => {
    const first = recordRun(EMPTY_STATS, { correct: 5, total: 10, day: '2026-06-29', score: 900 });
    expect(first.stats.bestScore).toBe(900);
    expect(first.run.isNewBestScore).toBe(true);

    const lower = recordRun(first.stats, { correct: 5, total: 10, day: '2026-06-29', score: 400 });
    expect(lower.stats.bestScore).toBe(900);
    expect(lower.run.isNewBestScore).toBe(false);

    const higher = recordRun(lower.stats, { correct: 9, total: 10, day: '2026-06-29', score: 2400 });
    expect(higher.stats.bestScore).toBe(2400);
    expect(higher.run.isNewBestScore).toBe(true);
  });

  it('leaves bestScore alone (and unreported) when no score is given', () => {
    const seeded = { ...EMPTY_STATS, bestScore: 700 };
    const { stats, run } = recordRun(seeded, { correct: 1, total: 2, day: '2026-06-29' });
    expect(stats.bestScore).toBe(700);
    expect(run.isNewBestScore).toBeUndefined();
  });

  it('treats a missing bestScore field (older saved blobs) as 0', () => {
    const legacy = { ...EMPTY_STATS } as Partial<typeof EMPTY_STATS>;
    delete legacy.bestScore;
    const { stats, run } = recordRun(legacy as typeof EMPTY_STATS, {
      correct: 3,
      total: 10,
      day: '2026-06-29',
      score: 300,
    });
    expect(stats.bestScore).toBe(300);
    expect(run.isNewBestScore).toBe(true);
  });
});

describe('recordRootLearned', () => {
  it('awards XP and bumps the streak', () => {
    const next = recordRootLearned(EMPTY_STATS, { day: '2026-06-29' });
    expect(next.xp).toBe(XP_PER_ROOT);
    expect(next.streakCurrent).toBe(1);
  });
});

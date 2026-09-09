import { describe, expect, it } from 'vitest';
import { ROOTS, rootId, isRootOpenable } from '../data/roots';
import {
  DAILY_COUNT,
  DAILY_TILE_PREVIEW_COUNT,
  afterDailyNextLabel,
  continueDailyLabel,
  dailyHoldLine,
  dailyNextRoot,
  dailyNextRowLabel,
  dailyNextSub,
  dailyProgressLabel,
  dailyResumePreview,
  dailySeed,
  dailyTilePreview,
  localDayKey,
  parseDailyRun,
  pickDailyRoots,
  resumeDailyQi,
} from './daily';

const T1 = ROOTS.filter((r) => isRootOpenable(rootId(r), false));
const ALL = ROOTS.filter((r) => isRootOpenable(rootId(r), true));

describe('localDayKey', () => {
  it('formats a local calendar day as YYYY-MM-DD', () => {
    expect(localDayKey(new Date(2026, 7, 13))).toBe('2026-08-13');
    expect(localDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('pickDailyRoots', () => {
  it('returns five roots from the given pool', () => {
    const picked = pickDailyRoots(T1, dailySeed('2026-08-13', null));
    expect(picked).toHaveLength(DAILY_COUNT);
    for (const r of picked) expect(T1).toContain(r);
  });

  it('is deterministic for the same seed', () => {
    const seed = dailySeed('2026-08-13', 'kid-a');
    const a = pickDailyRoots(T1, seed).map((r) => r.root);
    const b = pickDailyRoots(T1, seed).map((r) => r.root);
    expect(a).toEqual(b);
  });

  it('differs across days (same learner)', () => {
    const a = pickDailyRoots(T1, dailySeed('2026-08-13', 'kid-a')).map((r) => r.root);
    const b = pickDailyRoots(T1, dailySeed('2026-08-14', 'kid-a')).map((r) => r.root);
    expect(a).not.toEqual(b);
  });

  it('differs across learners on the same day', () => {
    const a = pickDailyRoots(T1, dailySeed('2026-08-13', 'kid-a')).map((r) => r.root);
    const b = pickDailyRoots(T1, dailySeed('2026-08-13', 'kid-b')).map((r) => r.root);
    expect(a).not.toEqual(b);
  });

  it('never draws paid roots from a free (Tier 1) pool', () => {
    const picked = pickDailyRoots(T1, dailySeed('2026-08-13', null));
    for (const r of picked) expect(r.t).toBe(1);
  });

  it('can draw Tier 2+ when the pool is entitled', () => {
    // Over many days a paid pool should include at least one non-T1 root.
    const days = Array.from({ length: 40 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
    const roots = days.flatMap((d) => pickDailyRoots(ALL, dailySeed(d, 'kid-a')));
    expect(roots.some((r) => r.t > 1)).toBe(true);
  });

  it('returns the whole pool when it is smaller than five', () => {
    const tiny = T1.slice(0, 3);
    const picked = pickDailyRoots(tiny, dailySeed('2026-08-13', null));
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((r) => r.root)).size).toBe(3);
  });

  it('returns [] for an empty pool', () => {
    expect(pickDailyRoots([], dailySeed('2026-08-13', null))).toEqual([]);
  });
});

describe('dailyTilePreview', () => {
  const seed = dailySeed('2026-09-01', 'kid-a');
  const today = pickDailyRoots(T1, seed);

  it('keeps the challenge at five and peeks the first three of that pick', () => {
    expect(DAILY_COUNT).toBe(5);
    expect(DAILY_TILE_PREVIEW_COUNT).toBe(3);
    expect(today).toHaveLength(DAILY_COUNT);
    const lines = dailyTilePreview(today);
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.root)).toEqual(today.slice(0, 3).map((r) => r.root));
    expect(lines.map((l) => l.mean)).toEqual(today.slice(0, 3).map((r) => r.mean));
  });

  it('uses the real daily pick — not a hardcoded starter trio', () => {
    const lines = dailyTilePreview(today);
    for (const line of lines) {
      const fromDeal = today.find((r) => r.root === line.root);
      expect(fromDeal, line.root).toBeTruthy();
      expect(line.mean).toBe(fromDeal!.mean);
      expect(line.mean.length).toBeGreaterThan(0);
      expect(line.mean).not.toMatch(/\n/);
    }
    const otherDay = pickDailyRoots(T1, dailySeed('2026-09-02', 'kid-a'));
    expect(dailyTilePreview(otherDay).map((l) => l.root)).not.toEqual(lines.map((l) => l.root));
  });

  it('returns [] for an empty deal', () => {
    expect(dailyTilePreview([])).toEqual([]);
  });
});

describe('dailyResumePreview + dailyNextRoot', () => {
  const seed = dailySeed('2026-09-01', 'kid-a');
  const today = pickDailyRoots(T1, seed);

  it('peeks remaining roots from the next unanswered index — not the already-got first three', () => {
    expect(today).toHaveLength(5);
    const remaining = dailyResumePreview(today, 2);
    expect(remaining.map((l) => l.root)).toEqual(today.slice(2).map((r) => r.root));
    expect(remaining.map((l) => l.mean)).toEqual(today.slice(2).map((r) => r.mean));
    expect(remaining[0]?.root).toBe(today[2]?.root);
    expect(remaining.map((l) => l.root)).not.toEqual(today.slice(0, 3).map((r) => r.root));
    expect(dailyNextRoot(today, 2)).toEqual(today[2]);
  });

  it('falls back to the first-three teaser on a fresh start and peeks nothing when finished', () => {
    expect(dailyResumePreview(today, 0)).toEqual(dailyTilePreview(today));
    expect(dailyResumePreview(today, 5)).toEqual([]);
    expect(dailyNextRoot(today, 0)).toBeUndefined();
    expect(dailyNextRoot(today, 5)).toBeUndefined();
    expect(dailyNextRoot(today, null)).toBeUndefined();
  });

  it('names the next Daily root on the Today row and the menu Next line', () => {
    expect(dailyNextRowLabel({ answered: 2, total: 5, nextName: 'Chron', nextMean: 'time' })).toBe(
      'Daily · 2 of 5 · Chron · time',
    );
    expect(dailyNextRowLabel({ answered: 2, total: 5 })).toBe('Daily · 2 of 5');
    expect(dailyNextSub('Chron')).toBe('Next · Chron');
  });
});

describe('Daily mid-run resume + hold meaning', () => {
  const today = '2026-09-08';
  const run = { day: today, studentId: 'kid-a', qi: 2 };

  it('resumes at the next unanswered root for the same kid + day', () => {
    expect(resumeDailyQi(run, today, 'kid-a', 5)).toBe(2);
    expect(dailyProgressLabel(2, 5)).toBe('Daily · 2 of 5');
    expect(continueDailyLabel(2, 5)).toBe('Continue Daily · 3 of 5 ›');
  });

  it('drops yesterday, another kid, a fresh start, or a finished index', () => {
    expect(resumeDailyQi(run, '2026-09-09', 'kid-a', 5)).toBeNull();
    expect(resumeDailyQi(run, today, 'kid-b', 5)).toBeNull();
    expect(resumeDailyQi(run, today, null, 5)).toBeNull();
    expect(resumeDailyQi({ ...run, qi: 0 }, today, 'kid-a', 5)).toBeNull();
    expect(resumeDailyQi({ ...run, qi: 5 }, today, 'kid-a', 5)).toBeNull();
    expect(resumeDailyQi(null, today, 'kid-a', 5)).toBeNull();
    expect(resumeDailyQi(run, today, 'kid-a', 0)).toBeNull();
  });

  it('parses a stored blob and drops junk', () => {
    expect(parseDailyRun(run)).toEqual(run);
    expect(parseDailyRun({ day: today, studentId: null, qi: 1 })).toEqual({
      day: today,
      studentId: null,
      qi: 1,
    });
    expect(parseDailyRun({ day: 'nope', studentId: 'kid-a', qi: 1 })).toBeNull();
    expect(parseDailyRun({ day: today, qi: 1.5 })).toBeNull();
    expect(parseDailyRun(null)).toBeNull();
    expect(parseDailyRun('{"qi":2}')).toBeNull();
  });

  it('holds the meaning until Next — not "is yours" and not an auto-dump', () => {
    expect(dailyHoldLine('Photo', 'light')).toBe('Yes — Photo means light.');
    expect(dailyHoldLine('  Bio  ', '  life ')).toBe('Yes — Bio means life.');
    expect(afterDailyNextLabel(false)).toBe('Next →');
    expect(afterDailyNextLabel(true)).toBe('Done →');
  });
});

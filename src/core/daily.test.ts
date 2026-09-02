import { describe, expect, it } from 'vitest';
import { ROOTS, rootId, isRootOpenable } from '../data/roots';
import {
  DAILY_COUNT,
  DAILY_TILE_PREVIEW_COUNT,
  dailySeed,
  dailyTilePreview,
  localDayKey,
  pickDailyRoots,
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

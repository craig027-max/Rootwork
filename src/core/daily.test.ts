import { describe, expect, it } from 'vitest';
import { ROOTS, rootId, isRootOpenable } from '../data/roots';
import { DAILY_COUNT, dailySeed, localDayKey, pickDailyRoots } from './daily';

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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { recordDailyComplete, recordDailyHit, EMPTY_STATS } from '../core/stats';
import { dailyHoldContinueLine } from '../core/daily';
import { stampReviewedAt } from './home/progressStamp';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const store = readFileSync(join(process.cwd(), 'src/app/store.ts'), 'utf8');

describe('Daily hold is today\'s Remember + play-today streak', () => {
  it('banks streak on the first Daily hit — no XP until the five are done', () => {
    const hit = recordDailyHit(
      { ...EMPTY_STATS, streakCurrent: 4, streakLongest: 4, lastActiveDay: '2026-09-09' },
      { day: '2026-09-10' },
    );
    expect(hit.streakCurrent).toBe(5);
    expect(hit.lastActiveDay).toBe('2026-09-10');
    expect(hit.xp).toBe(0);
    expect(hit.lastDailyDay).toBeNull();
    const done = recordDailyComplete(hit, { day: '2026-09-10' });
    expect(done.xp).toBeGreaterThan(0);
    expect(done.lastDailyDay).toBe('2026-09-10');
    expect(done.streakCurrent).toBe(5);
  });

  it('stamps Remember on an owned Daily hit — unowned roots stay unlearned', () => {
    const owned = stampReviewedAt(
      { bio: { completedAt: Date.parse('2026-09-01T12:00:00Z') } },
      'bio',
      Date.parse('2026-09-10T15:00:00Z'),
    );
    expect(owned?.bio?.reviewedAt).toBe(Date.parse('2026-09-10T15:00:00Z'));
    expect(stampReviewedAt({}, 'bio', Date.parse('2026-09-10T15:00:00Z'))).toBeNull();
  });

  it('Daily writes the hit into streak + Remember; last hold peeks Continue', () => {
    expect(daily).toContain('saveDailyRun(qi + 1, hitId)');
    expect(daily).toContain('recordDailyComplete(hitId)');
    expect(daily).toContain('dailyHoldContinueLine');
    expect(daily).toContain('continueHold');
    expect(daily).toContain('learnNextAction');
    expect(store).toContain('recordDailyHit');
    expect(store).toContain('applyDailyHit');
    expect(store).toContain('stampReviewedAt');
    expect(home).toContain('dailyRoots.map((r) => rootId(r))');
    expect(dailyHoldContinueLine('Auto', 'self')).toBe('Continue · Auto · self');
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

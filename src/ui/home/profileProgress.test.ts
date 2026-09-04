import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMPTY_STATS, recordRootLearned, recordRun, type GameStats } from '../../core/stats';
import { ROOTS } from '../../data/roots';
import { buildProfileProgress, streakKindFor } from './profileProgress';

const band = readFileSync(join(process.cwd(), 'src/ui/home/ProfileBand.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

function mediaBlock(source: string, query: string): string {
  const start = source.indexOf(`@media (${query})`);
  if (start < 0) throw new Error(`missing @media (${query})`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed @media (${query})`);
}

const TODAY = '2026-09-04';
const YESTERDAY = '2026-09-03';

function returningStreak(day: string, extra: Partial<GameStats> = {}): GameStats {
  return {
    ...EMPTY_STATS,
    xp: 40,
    streakCurrent: 7,
    streakLongest: 7,
    lastActiveDay: day,
    ...extra,
  };
}

describe('streakKindFor', () => {
  it('is none until a streak exists', () => {
    expect(streakKindFor(EMPTY_STATS, TODAY)).toBe('none');
  });

  it('is banked on the same calendar day, at risk otherwise', () => {
    expect(streakKindFor(returningStreak(TODAY), TODAY)).toBe('banked');
    expect(streakKindFor(returningStreak(YESTERDAY), TODAY)).toBe('risk');
  });
});

describe('buildProfileProgress — first run', () => {
  const vm = buildProfileProgress(EMPTY_STATS, 0, TODAY);

  it('keeps the grow-your-first-root hello and hides dead chrome', () => {
    expect(vm.firstRun).toBe(true);
    expect(vm.hello).toBe('Grow your first root 🌱');
    expect(vm.hint).toBeNull();
    expect(vm.showXp).toBe(false);
    expect(vm.stats.map((s) => s.key)).toEqual(['roots']);
    expect(vm.stats[0]).toMatchObject({ value: '0', suffix: ` / ${ROOTS.length}` });
    expect(vm.stats.some((s) => s.key === 'streak' || s.key === 'stars' || s.key === 'acc')).toBe(
      false,
    );
  });
});

describe('buildProfileProgress — returning, streak at risk', () => {
  const vm = buildProfileProgress(returningStreak(YESTERDAY), 12, TODAY);

  it('makes Play-today the visible next action — not a hover tooltip', () => {
    expect(vm.firstRun).toBe(false);
    expect(vm.hello).toBe('Keep your streak');
    expect(vm.hint).toBe('Play today to keep your 7-day streak');
    expect(vm.streakKind).toBe('risk');
    expect(vm.showXp).toBe(true);

    const streak = vm.stats.find((s) => s.key === 'streak');
    expect(streak?.value).toBe('🔥 7');
    expect(streak?.label).toBe('Play today');
    expect(vm.stats.map((s) => s.key)).toEqual(['streak', 'roots']);
  });
});

describe('buildProfileProgress — returning, streak banked', () => {
  const vm = buildProfileProgress(returningStreak(TODAY), 12, TODAY);

  it('recaps that today is already banked', () => {
    expect(vm.hello).toBe('Welcome back');
    expect(vm.hint).toBe('Streak banked for today ✓');
    expect(vm.streakKind).toBe('banked');
    expect(vm.stats.find((s) => s.key === 'streak')).toMatchObject({
      value: '🔥 7 ✓',
      label: 'Banked',
    });
  });
});

describe('buildProfileProgress — hide unearned Rush chrome', () => {
  it('shows stars and accuracy only after a real quiz run', () => {
    const learned = recordRootLearned(EMPTY_STATS, { day: TODAY });
    const beforeRush = buildProfileProgress(learned, 1, TODAY);
    expect(beforeRush.stats.map((s) => s.key)).toEqual(['streak', 'roots']);
    expect(beforeRush.stats.some((s) => s.key === 'stars' || s.key === 'acc')).toBe(false);

    const afterRush = recordRun(learned, { correct: 8, total: 10, day: TODAY, score: 2400 });
    const vm = buildProfileProgress(afterRush.stats, 1, TODAY);
    expect(vm.stats.map((s) => s.key)).toEqual(['streak', 'stars', 'acc', 'roots']);
    expect(vm.stats.find((s) => s.key === 'stars')?.value).toBe(`★ ${afterRush.stats.totalStars}`);
    expect(vm.stats.find((s) => s.key === 'acc')?.value).toBe('80%');
  });

  it('tells a hydrated learner with roots but no streak to start one', () => {
    const vm = buildProfileProgress(EMPTY_STATS, 4, TODAY);
    expect(vm.firstRun).toBe(false);
    expect(vm.hint).toBe('Learn a root today to start a streak');
    expect(vm.stats.map((s) => s.key)).toEqual(['roots']);
    expect(vm.showXp).toBe(false);
  });
});

describe('Profile band wiring + phone layout', () => {
  it('renders the visible hint from the model — not a title-only tooltip', () => {
    expect(home).toContain('<ProfileBand');
    expect(band).toContain('buildProfileProgress');
    expect(band).toContain('ww-profile-hint');
    expect(band).toContain('role="status"');
    expect(band).not.toMatch(/title=\{/);
    expect(band).not.toContain('Play today to keep your streak!');
  });

  it('keeps the first-run / resume Continue board untouched', () => {
    expect(menu).toContain("return nextPlay ? 'Start playing' : 'Jump back in'");
    expect(menu).toContain('Continue ${opts.rootName}');
    expect(detail).toContain('heroCta: firstPlay || resumeNow');
    expect(home).toContain('is-resume');
    expect(home).toContain('Tap continue');
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });

  it('keeps the hint and slim stats readable at phone width', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-profile-hint\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-profile-hint\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-profile\.is-slim/);
    expect(phone).toMatch(/\.ww-profile\.is-first/);
    expect(css).toMatch(/\.ww-profile-hint\.is-risk/);
    expect(css).toMatch(/\.ww-profile-hint\.is-banked/);
  });
});

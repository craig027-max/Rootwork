import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMPTY_STATS, recordDailyHit, recordRootLearned, recordRun, type GameStats } from '../../core/stats';
import { ROOTS, firstRoot, rootId, rootsInTier, type RootId } from '../../data/roots';
import { buildProfileProgress } from './profileProgress';
import {
  buildTodayProgress,
  keepGoingLabel,
  learnedRootName,
  learnedRootToday,
  pickRememberRoot,
  rememberRootToday,
  rootLabel,
  stampReviewedAt,
} from './todayProgress';
import { learnNextAction } from '../modes/modeHandoff';
import { isNextPlayHome, nextPlayRoot } from './menu';

const band = readFileSync(join(process.cwd(), 'src/ui/home/ProfileBand.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const store = readFileSync(join(process.cwd(), 'src/app/store.ts'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
const hydrate = readFileSync(join(process.cwd(), 'src/core/hydrate.ts'), 'utf8');
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

const TODAY = '2026-09-06';
const first = firstRoot();
if (!first) throw new Error('fixture: expected a first root');
const starter = rootsInTier(1);
const second = starter[1];
if (!second) throw new Error('fixture: expected Geo after Bio');
const starterDone = new Set<RootId>(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder roots');
const startedBuilder = new Set<RootId>([...starterDone, rootId(firstBuilder)]);
const midStarter = new Set<RootId>([rootId(first)]);
const NONE = new Set<string>();

function returningStats(extra: Partial<GameStats> = {}): GameStats {
  return {
    ...EMPTY_STATS,
    xp: 40,
    streakCurrent: 7,
    streakLongest: 7,
    lastActiveDay: TODAY,
    ...extra,
  };
}

describe('buildTodayProgress — hidden on first-run / next-Play', () => {
  it('does not dump Daily onto Grow-your-first-root / Play Bio', () => {
    const vm = buildTodayProgress({
      firstRun: true,
      nextPlay: true,
      dailyDone: false,
      completed: NONE,
      entitled: false,
    });
    expect(vm.show).toBe(false);
    expect(vm.pathDone).toBe(false);
    expect(vm.recap).toBeNull();
    expect(vm.items).toEqual([]);
    expect(vm.cta).toBeNull();
    expect(isNextPlayHome(NONE)).toBe(true);
    expect(nextPlayRoot(NONE, false)?.root).toBe(first.root);
  });

  it('stays off the one-Play board after Bio — Play Geo is still the only next tap', () => {
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: true,
      dailyDone: false,
      completed: midStarter,
      entitled: false,
    });
    expect(vm.show).toBe(false);
    expect(vm.cta).toBeNull();
    expect(vm.recap).toBeNull();
    expect(vm.items.some((i) => i.key === 'daily')).toBe(false);
    expect(isNextPlayHome(midStarter)).toBe(true);
  });
});

describe('buildTodayProgress — returning dashboard', () => {
  it('lists Daily + Continue {next root} and makes Continue the fat tap', () => {
    const next = learnNextAction(startedBuilder, true);
    expect(next.label).toBe(`Continue ${secondBuilder.root} ›`);

    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      completed: startedBuilder,
      entitled: true,
    });

    expect(vm.show).toBe(true);
    expect(vm.heading).toBe('Today');
    expect(vm.pathDone).toBe(false);
    expect(vm.items).toEqual([
      {
        key: 'daily',
        done: false,
        label: 'Daily · five fresh roots',
        action: 'daily',
      },
      {
        key: 'learn',
        done: false,
        label: `Continue ${secondBuilder.root}`,
        action: 'learn',
        rootId: next.rootId,
      },
    ]);
    expect(vm.cta).toEqual({
      kind: 'learn',
      label: `Continue ${secondBuilder.root} ›`,
      rootId: next.rootId,
    });
    expect(vm.cta?.label).toBe(next.label);
    expect(vm.cta?.rootId).toBe(rootId(secondBuilder));
  });

  it('marks Daily done and keeps Continue {root} as the hero — not Play again', () => {
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
    });

    expect(vm.items[0]).toMatchObject({
      key: 'daily',
      done: true,
      label: 'Daily · done for today',
    });
    expect(vm.cta?.kind).toBe('learn');
    expect(vm.cta?.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(vm.cta?.label).not.toMatch(/Play again|Start daily/);
  });

  it('uses Play {root} when the next tier is still empty — same as Home', () => {
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      completed: starterDone,
      entitled: false,
    });
    expect(learnNextAction(starterDone, false).label).toBe(`Play ${firstBuilder.root} ›`);
    expect(vm.items.find((i) => i.key === 'learn')?.label).toBe(`Play ${firstBuilder.root}`);
    expect(vm.cta?.label).toBe(`Play ${firstBuilder.root} ›`);
  });

  it('falls back to Start daily when every openable root is owned', () => {
    const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));
    const pending = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      completed: allOpen,
      entitled: false,
    });
    expect(pending.items.map((i) => i.key)).toEqual(['daily']);
    expect(pending.cta).toEqual({ kind: 'daily', label: 'Start daily ›' });
    expect(pending.pathDone).toBe(false);
    expect(pending.recap).toBeNull();
  });

  it('makes Continue Daily the fat tap on a mid-run — Continue {root} stays on the learn row', () => {
    const next = learnNextAction(startedBuilder, true);
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      completed: startedBuilder,
      entitled: true,
    });
    expect(vm.items[0]).toMatchObject({
      key: 'daily',
      done: false,
      label: 'Daily · 2 of 5 · Chron · time',
      action: 'daily',
    });
    expect(vm.items[0]?.label).not.toBe('Daily · 2 of 5');
    expect(vm.items.find((i) => i.key === 'learn')).toMatchObject({
      label: `Continue ${secondBuilder.root}`,
      action: 'learn',
      rootId: next.rootId,
    });
    expect(vm.cta).toEqual({ kind: 'daily', label: 'Continue Daily · 3 of 5 ›' });
    expect(vm.cta?.label).not.toMatch(/Start daily|Play again|Continue ${secondBuilder.root}/);
  });

  it('makes Continue Daily the fat tap when that is the only open path', () => {
    const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      completed: allOpen,
      entitled: false,
    });
    expect(vm.items[0]?.label).toBe('Daily · 2 of 5 · Chron · time');
    expect(vm.cta).toEqual({ kind: 'daily', label: 'Continue Daily · 3 of 5 ›' });
    expect(vm.pathDone).toBe(false);
  });

  it('hands a caught-up kid Root Rush — not a dead empty tap', () => {
    const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));
    const caughtUp = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: allOpen,
      entitled: false,
    });
    expect(caughtUp.items[0]?.done).toBe(true);
    expect(caughtUp.items.map((i) => i.key)).toEqual(['daily']);
    expect(caughtUp.pathDone).toBe(true);
    expect(caughtUp.heading).toBe('Today ✓');
    expect(caughtUp.recap).toBe("Today's path is done");
    expect(caughtUp.cta).toEqual({ kind: 'rush', label: 'Play Root Rush ›' });
  });
});

describe('learnedRootToday — local-day stamps', () => {
  function atDay(day: string, hour = 15): number {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y!, m! - 1, d, hour).getTime();
  }

  it('picks the most recent root completed today and ignores yesterday', () => {
    const photo = ROOTS.find((r) => r.root === 'Photo');
    const geo = second;
    if (!photo) throw new Error('fixture: Photo');
    const progress = {
      [rootId(first)]: { completedAt: atDay('2026-09-05', 18) },
      [rootId(geo)]: { completedAt: atDay(TODAY, 10) },
      [rootId(photo)]: { completedAt: atDay(TODAY, 16) },
    };
    expect(learnedRootToday(progress, TODAY)).toBe(rootId(photo));
    expect(learnedRootName(rootId(photo))).toBe('Photo');
    expect(learnedRootToday(progress, '2026-09-05')).toBe(rootId(first));
    expect(learnedRootToday({}, TODAY)).toBeNull();
  });

  it('does not count a stamp without completedAt', () => {
    expect(learnedRootToday({ [rootId(first)]: {} }, TODAY)).toBeNull();
  });
});

describe('pickRememberRoot — oldest stale owned root', () => {
  function atDay(day: string, hour = 15): number {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y!, m! - 1, d, hour).getTime();
  }

  it('picks the oldest owned root that was not learned today', () => {
    const progress = {
      [rootId(first)]: { completedAt: atDay('2026-09-01', 9) },
      [rootId(second)]: { completedAt: atDay('2026-09-04', 12) },
      [rootId(firstBuilder)]: { completedAt: atDay(TODAY, 16) },
    };
    expect(pickRememberRoot(progress, TODAY)).toBe(rootId(first));
    expect(rootLabel(rootId(first))).toEqual({ name: first.root, mean: first.mean });
  });

  it('skips a root already reviewed today and honors exclude', () => {
    const progress = {
      [rootId(first)]: { completedAt: atDay('2026-09-01'), reviewedAt: atDay(TODAY, 8) },
      [rootId(second)]: { completedAt: atDay('2026-09-02') },
    };
    expect(pickRememberRoot(progress, TODAY)).toBe(rootId(second));
    expect(pickRememberRoot(progress, TODAY, { exclude: [rootId(second)] })).toBeNull();
  });

  it('skips roots already on today\'s Daily deal — Remember is a different stale card', () => {
    const progress = {
      [rootId(first)]: { completedAt: atDay('2026-09-01') },
      [rootId(second)]: { completedAt: atDay('2026-09-02') },
    };
    expect(pickRememberRoot(progress, TODAY, { exclude: [rootId(first)] })).toBe(rootId(second));
    expect(pickRememberRoot(progress, TODAY, { exclude: [rootId(first), rootId(second)] })).toBeNull();
  });

  it('ignores a blob without completedAt', () => {
    expect(pickRememberRoot({ [rootId(first)]: {} }, TODAY)).toBeNull();
  });
});

describe('rememberRootToday + stampReviewedAt', () => {
  function atDay(day: string, hour = 15): number {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y!, m! - 1, d, hour).getTime();
  }

  it('names the most recent review today and ignores a root learned today', () => {
    const progress = {
      [rootId(first)]: { completedAt: atDay('2026-09-01'), reviewedAt: atDay(TODAY, 9) },
      [rootId(second)]: { completedAt: atDay(TODAY, 11), reviewedAt: atDay(TODAY, 12) },
    };
    expect(rememberRootToday(progress, TODAY)).toBe(rootId(first));
  });

  it('stamps once per day and no-ops a same-day repeat', () => {
    const firstStamp = stampReviewedAt(
      { [rootId(first)]: { completedAt: Date.parse('2026-09-01T12:00:00') } },
      rootId(first),
      atDay(TODAY, 10),
    );
    expect(firstStamp?.[rootId(first)]?.reviewedAt).toBe(atDay(TODAY, 10));
    expect(stampReviewedAt(firstStamp!, rootId(first), atDay(TODAY, 18))).toBeNull();
    expect(stampReviewedAt({}, rootId(first), atDay(TODAY))).toBeNull();
  });
});

describe('buildTodayProgress — learn row can finish', () => {
  it('checks off Learned {root} and reviews that root — Continue stays the fat tap', () => {
    const next = learnNextAction(startedBuilder, true);
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      learnedRoot: firstBuilder.root,
      learnedRootId: rootId(firstBuilder),
    });

    expect(vm.pathDone).toBe(false);
    expect(vm.heading).toBe('Today');
    expect(vm.recap).toBeNull();
    expect(vm.items.find((i) => i.key === 'learn')).toEqual({
      key: 'learn',
      done: true,
      label: `Learned ${firstBuilder.root}`,
      action: 'review',
      rootId: rootId(firstBuilder),
    });
    expect(vm.items.find((i) => i.key === 'learn')?.rootId).not.toBe(next.rootId);
    expect(vm.cta).toEqual({
      kind: 'learn',
      label: `Continue ${secondBuilder.root} ›`,
      rootId: next.rootId,
    });
  });

  it('says Today ✓ and Keep going · {next} — not another Continue, not Play again', () => {
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      learnedRoot: firstBuilder.root,
      learnedRootId: rootId(firstBuilder),
    });

    expect(vm.pathDone).toBe(true);
    expect(vm.heading).toBe('Today ✓');
    expect(vm.recap).toBe(`Daily and ${firstBuilder.root} are done`);
    expect(vm.items[0]).toMatchObject({ key: 'daily', done: true });
    expect(vm.items[1]).toMatchObject({
      key: 'learn',
      done: true,
      label: `Learned ${firstBuilder.root}`,
      action: 'review',
      rootId: rootId(firstBuilder),
    });
    expect(vm.cta?.kind).toBe('learn');
    expect(vm.cta?.label).toBe(keepGoingLabel(secondBuilder.root));
    expect(vm.cta?.label).toBe(`Keep going · ${secondBuilder.root} ›`);
    expect(vm.cta?.label).not.toMatch(/Continue |Play again|Start daily/);
  });

  it('keeps a Learned row when they are caught up after learning today', () => {
    const aqua = ROOTS.find((r) => r.root === 'Aqua');
    if (!aqua) throw new Error('fixture: Aqua');
    const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: allOpen,
      entitled: false,
      learnedToday: true,
      learnedRoot: 'Aqua',
      learnedRootId: rootId(aqua),
    });
    expect(vm.items).toEqual([
      {
        key: 'daily',
        done: true,
        label: 'Daily · done for today',
        action: 'daily',
      },
      {
        key: 'learn',
        done: true,
        label: 'Learned Aqua',
        action: 'review',
        rootId: rootId(aqua),
      },
    ]);
    expect(vm.cta).toEqual({ kind: 'rush', label: 'Play Root Rush ›' });
    expect(vm.pathDone).toBe(true);
    expect(vm.recap).toBe('Daily and Aqua are done');
  });

  it('does not dump Learned onto the one-Play board', () => {
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: true,
      dailyDone: false,
      completed: midStarter,
      entitled: false,
      learnedToday: true,
      learnedRoot: first.root,
    });
    expect(vm.show).toBe(false);
    expect(vm.items).toEqual([]);
  });
});

describe('buildTodayProgress — next-root meaning + Remember', () => {
  it('peeks the next root meaning on Continue without changing the fat tap', () => {
    const next = learnNextAction(startedBuilder, true);
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      completed: startedBuilder,
      entitled: true,
      learnMean: secondBuilder.mean,
    });
    expect(vm.items.find((i) => i.key === 'learn')?.label).toBe(
      `Continue ${secondBuilder.root} · ${secondBuilder.mean}`,
    );
    expect(vm.cta).toEqual({
      kind: 'learn',
      label: `Continue ${secondBuilder.root} ›`,
      rootId: next.rootId,
    });
  });

  it('adds Remember {stale root} · meaning and keeps Continue as the hero', () => {
    const next = learnNextAction(startedBuilder, true);
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      completed: startedBuilder,
      entitled: true,
      rememberRoot: first.root,
      rememberMean: first.mean,
      rememberRootId: rootId(first),
    });
    expect(vm.pathDone).toBe(false);
    expect(vm.items.find((i) => i.key === 'remember')).toEqual({
      key: 'remember',
      done: false,
      label: `Remember ${first.root} · ${first.mean}`,
      action: 'remember',
      rootId: rootId(first),
    });
    expect(vm.cta?.label).toBe(next.label);
    expect(vm.items.some((i) => i.key === 'daily')).toBe(true);
  });

  it('checks off Remembered {root} without blocking Today ✓ or swapping the CTA', () => {
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      learnedRoot: firstBuilder.root,
      rememberedToday: true,
      rememberRoot: first.root,
      rememberMean: first.mean,
      rememberRootId: rootId(first),
    });
    expect(vm.pathDone).toBe(true);
    expect(vm.heading).toBe('Today ✓');
    expect(vm.items.find((i) => i.key === 'remember')).toEqual({
      key: 'remember',
      done: true,
      label: `Remembered ${first.root}`,
      action: 'remember',
      rootId: rootId(first),
    });
    expect(vm.cta?.kind).toBe('learn');
    expect(vm.cta?.label).toBe(keepGoingLabel(secondBuilder.root));
    expect(vm.cta?.label).toBe(`Keep going · ${secondBuilder.root} ›`);
    expect(vm.cta?.label).not.toMatch(/Continue |Play again|Start daily/);
  });

  it('does not dump Remember onto Grow-your-first-root / Play Bio', () => {
    const vm = buildTodayProgress({
      firstRun: true,
      nextPlay: true,
      dailyDone: false,
      completed: NONE,
      entitled: false,
      rememberRoot: first.root,
      rememberMean: first.mean,
      rememberRootId: rootId(first),
    });
    expect(vm.show).toBe(false);
    expect(vm.items.some((i) => i.key === 'remember')).toBe(false);
  });
});

describe('Today checklist wiring + phone layout', () => {
  it('renders the checklist from the model on returning Home only', () => {
    expect(home).toContain('<ProfileBand');
    expect(home).toContain('today={today}');
    expect(home).toContain('buildTodayProgress');
    expect(home).toContain('learnedRootToday');
    expect(home).toContain('onContinue');
    expect(home).toContain('onRemember');
    expect(home).toContain("entry: 'remember'");
    expect(home).toContain('onDaily');
    expect(home).toContain('onRush');
    expect(home).toContain('pickRememberRoot');
    expect(home).toContain('rememberRootToday');
    expect(home).toContain('dailyRoots.map((r) => rootId(r))');
    expect(store).toContain('recordDailyHit');
    expect(store).toContain('applyDailyHit');
    expect(store).toContain('saveDailyRun: (qi, hitRootId)');
    expect(store).toContain('recordDailyComplete: (hitRootId)');
    expect(home).toContain('liveDailyResumeQi');
    expect(home).toContain('dailyResumeQi');
    expect(home).toContain('dailyNextName');
    expect(home).toContain('dailyResumePreview');
    expect(home).toContain('isDailyResumeItem');
    expect(hydrate).toContain('resolveBootResume');
    expect(hydrate).toContain('liveDailyResumeQi');
    expect(hydrate).toContain("setView('daily')");
    expect(hydrate).not.toContain('if (target) store.openRoot(target)');
    expect(store).toContain('saveDailyRun');
    expect(store).toContain('clearDailyRun');
    expect(store).toContain('wondral:dailyRun:v1:');
    expect(band).toContain('ww-today');
    expect(band).toContain('ww-today-item');
    expect(band).toContain('is-remember');
    expect(band).toContain('ww-today-cta');
    expect(band).toContain('ww-today-recap');
    expect(band).toContain('role="list"');
    expect(band).toContain('pathDone');
    expect(band).toContain('is-today-done');
    expect(band).toContain("action === 'review'");
    expect(band).toContain("action === 'rush'");
    expect(band).toContain("action === 'remember'");
    expect(band).toContain('Nice work');
    expect(store).toContain('stampReviewedAt');
    expect(store).toContain('reviewedAt');
    expect(store).toContain('bumpStreak');
  });

  it('keeps first-run Play, resume Continue, streak band, and overlay handoff', () => {
    expect(menu).toContain("return 'Start playing'");
    expect(menu).toContain("return 'Keep going'");
    expect(menu).toContain("return 'Jump back in'");
    expect(menu).toContain('Continue ${opts.rootName}');
    expect(menu).toContain('Keep going · ${opts.rootName}');
    expect(detail).toContain('heroCta: firstPlay || resumeNow');
    expect(detail).toContain('keepGoing: Boolean(extra.pathDone && resumeNow)');
    expect(home).toContain('is-resume');
    expect(home).toContain('Tap continue');
    expect(home).toContain('Keep going');
    expect(band).toContain('buildProfileProgress');
    expect(band).toContain('ww-profile-hint');
    expect(overlay).toContain('learnNextAction');
    expect(overlay).toContain('buildDailyDone');
    expect(overlay).toContain('buildRushResultNext');
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });

  it('keeps the checklist and Continue tap readable at phone width', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-today\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-today-item\s*\{[^}]*display:\s*inline-flex|\.ww-today-item\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-today-cta\s*\{[^}]*display:\s*block|\.ww-today-cta\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-today\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-today-item\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-today-cta\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-today-item\.is-done/);
    expect(css).toMatch(/\.ww-today-item\.is-remember/);
    expect(css).toMatch(/\.ww-today-mark/);
    expect(css).toMatch(/\.ww-today\.is-done/);
    expect(css).toMatch(/\.ww-today-recap/);
    expect(phone).toMatch(/\.ww-today\.is-done\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-today-recap\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-today-item\.is-remember\s*\{[^}]*display:\s*inline-flex|\.ww-today-item\.is-remember\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-today\.is-done\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-today-h\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-today-recap\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-today-item\.is-remember\s*\{[^}]*display:\s*none/);
  });

  it('does not replace the #44 streak hint with the checklist', () => {
    const risk = buildProfileProgress(returningStats({ lastActiveDay: '2026-09-05' }), 12, TODAY);
    expect(risk.hint).toBe('Play today to keep your 7-day streak');
    const banked = buildProfileProgress(recordRootLearned(EMPTY_STATS, { day: TODAY }), 1, TODAY);
    expect(banked.hint).toBe('Streak banked for today ✓');
    const afterDailyHit = buildProfileProgress(
      { ...recordDailyHit(returningStats({ lastActiveDay: '2026-09-05' }), { day: TODAY }), lastDailyDay: null },
      12,
      TODAY,
    );
    expect(afterDailyHit.hint).toBe('Streak banked for today ✓');
    expect(afterDailyHit.streakKind).toBe('banked');
    const afterRush = recordRun(returningStats(), { correct: 8, total: 10, day: TODAY, score: 2400 });
    expect(buildProfileProgress(afterRush.stats, 12, TODAY).stats.some((s) => s.key === 'stars')).toBe(
      true,
    );
  });
});

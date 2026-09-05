import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier, type RootId } from '../../data/roots';
import { EMPTY_STATS, recordRun } from '../../core/stats';
import {
  buildDailyDone,
  buildModeEmpty,
  buildRushResultNext,
  buildRushStart,
  learnNextAction,
} from './modeHandoff';

const dailySrc = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const rushSrc = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const band = readFileSync(join(process.cwd(), 'src/ui/home/ProfileBand.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');

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

const NONE = new Set<string>();
const first = firstRoot();
if (!first) throw new Error('fixture: expected a first root');
const starter = rootsInTier(1);
const second = starter[1];
if (!second) throw new Error('fixture: expected a second Starter root');
const starterDone = new Set<RootId>(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder roots');
const startedBuilder = new Set<RootId>([...starterDone, rootId(firstBuilder)]);
const midStarter = new Set<RootId>([rootId(first)]);

const todayDeal = [
  { root: 'Bio', mean: 'life' },
  { root: 'Geo', mean: 'earth' },
  { root: 'Photo', mean: 'light' },
  { root: 'Aqua', mean: 'water' },
  { root: 'Chron', mean: 'time' },
];

describe('learnNextAction', () => {
  it('names Play Bio on a first visit — not Continue', () => {
    const next = learnNextAction(NONE, false);
    expect(next.kind).toBe('learn');
    expect(next.rootName).toBe(first.root);
    expect(next.rootId).toBe(rootId(first));
    expect(next.label).toBe(`Play ${first.root} ›`);
  });

  it('names Continue {next root} mid-tier — same as Home #43', () => {
    const next = learnNextAction(midStarter, false);
    expect(next.rootName).toBe(second.root);
    expect(next.label).toBe(`Continue ${second.root} ›`);
    expect(next.label).not.toMatch(/Play again|Back to learning/);
  });

  it('names Play Auto after Starter, Continue after they start Builder (entitled)', () => {
    expect(learnNextAction(starterDone, false)).toMatchObject({
      rootName: firstBuilder.root,
      label: `Play ${firstBuilder.root} ›`,
    });
    expect(learnNextAction(startedBuilder, true)).toMatchObject({
      rootName: secondBuilder.root,
      label: `Continue ${secondBuilder.root} ›`,
    });
  });

  it('falls back to Home when every openable root is owned and they started the next tier', () => {
    const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));
    // Free learner who somehow owns T1+T2 still has no further openable root.
    const next = learnNextAction(allOpen, false);
    expect(next.kind).toBe('home');
    expect(next.label).toBe('Back to learning');
    expect(next.rootId).toBeUndefined();
  });
});

describe('buildDailyDone', () => {
  const just = buildDailyDone({
    deal: todayDeal,
    streak: 7,
    justFinished: true,
    completed: midStarter,
    entitled: false,
  });
  const reopen = buildDailyDone({
    deal: todayDeal,
    streak: 7,
    justFinished: false,
    completed: midStarter,
    entitled: false,
  });

  it('recaps all five names + meanings with a done mark — not a Play-again reset', () => {
    expect(just.recap).toEqual(todayDeal);
    expect(just.recap).toHaveLength(5);
    expect(just.recapDone).toBe(true);
    expect(just.replayLabel).toBe('Play again ›');
    expect(just.primary.label).toBe(`Continue ${second.root} ›`);
    expect(just.primary.kind).toBe('learn');
  });

  it('keeps the just-finished ✓ celebration and names Continue as the hero', () => {
    expect(just.title).toBeNull();
    expect(just.streakLine).toBe('🔥 7 day streak');
    expect(just.sub).toBe('Streak banked. Same five roots until tomorrow.');
    expect(just.primary.label).toMatch(/^Continue /);
  });

  it('on re-open, says Done for today — not Today\'s five / keep your streak', () => {
    expect(reopen.title).toBe('Done for today.');
    expect(reopen.sub).toContain('Streak banked for today ✓');
    expect(reopen.sub).toContain('replay is just for fun');
    expect(reopen.sub).not.toMatch(/keep your streak/i);
    expect(reopen.primary.label).toBe(`Continue ${second.root} ›`);
    expect(reopen.recapDone).toBe(true);
  });
});

describe('buildModeEmpty', () => {
  it('points Daily / Rush empty states at Play Bio, not a dead close', () => {
    const daily = buildModeEmpty('daily', NONE, false);
    const rush = buildModeEmpty('rush', midStarter, false);
    expect(daily.lead).toMatch(/daily/);
    expect(daily.primary.label).toBe(`Play ${first.root} ›`);
    expect(rush.lead).toMatch(/Root Rush/);
    expect(rush.primary.label).toBe(`Continue ${second.root} ›`);
  });
});

describe('buildRushStart + result next', () => {
  it('says Start round before any run, with no fake best', () => {
    const vm = buildRushStart({ runs: 0, bestPct: 0, bestStars: 0, bestScore: 0 });
    expect(vm.goLabel).toBe('Start round ›');
    expect(vm.recap).toBeNull();
  });

  it('says Play again after a real run and recaps the same best as Home', () => {
    const banked = recordRun(EMPTY_STATS, {
      correct: 8,
      total: 10,
      day: '2026-09-05',
      score: 2400,
    });
    const vm = buildRushStart({
      runs: banked.stats.runs,
      bestPct: banked.stats.bestPct,
      bestStars: banked.stats.bestStars,
      bestScore: banked.stats.bestScore,
    });
    expect(vm.goLabel).toBe('Play again ›');
    expect(vm.recap).toBe('Best so far — A · 4★ · 2,400');
    expect(vm.recap).not.toMatch(/Bio|Geo|Photo/);
  });

  it('names Continue {root} on the result so Play again is not the only tap', () => {
    const vm = buildRushResultNext(midStarter, false);
    expect(vm.replayLabel).toBe('Play again ›');
    expect(vm.changeLabel).toBe('Change level');
    expect(vm.primary.label).toBe(`Continue ${second.root} ›`);
  });
});

describe('Daily / Rush overlay wiring + phone layout', () => {
  it('Daily uses the done VM and Continue — not a start-screen reset', () => {
    expect(dailySrc).toContain('buildDailyDone');
    expect(dailySrc).toContain('buildModeEmpty');
    expect(dailySrc).toContain('showDoneLanding');
    expect(dailySrc).toContain('q-done-mark');
    expect(dailySrc).toContain('goLearn');
    expect(dailySrc).not.toContain('Already banked for today — replay is just for fun.');
  });

  it('Rush start / empty / result use the shared handoff', () => {
    expect(rushSrc).toContain('buildRushStart');
    expect(rushSrc).toContain('buildRushResultNext');
    expect(rushSrc).toContain('buildModeEmpty');
    expect(rushSrc).toContain('goLearn');
    expect(rushSrc).toContain('q-next-learn');
    expect(rushSrc).not.toContain('Best score ·');
  });

  it('keeps Home Continue + profile band (#43 / #44) untouched', () => {
    expect(home).toContain('Tap continue');
    expect(menu).toContain('Continue ${opts.rootName}');
    expect(band).toContain('buildProfileProgress');
    expect(band).toContain('ww-profile-hint');
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });

  it('keeps done recap + next-action taps readable at phone width', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-actions\s*\{[^}]*flex-direction:\s*column/);
    expect(phone).toMatch(/\.q-daily-chip\s*\{[^}]*flex-wrap:\s*wrap|\.q-daily-chips/);
    expect(css).toMatch(/\.q-daily-chip\.is-done/);
    expect(css).toMatch(/\.q-done-mark/);
    expect(css).toMatch(/\.q-next-learn/);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel } from '../core/rushRecap';
import {
  buildDailyDone,
  buildRushResultNext,
  buildRushStart,
  rushMissRememberReady,
} from './modes/modeHandoff';
import { buildTodayProgress } from './home/todayProgress';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');

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

const first = firstRoot();
if (!first) throw new Error('fixture: expected Bio');
const starter = rootsInTier(1);
const geo = starter[1];
const photo = starter[2];
if (!geo || !photo) throw new Error('fixture: expected Geo / Photo');
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);

const todayDeal = [
  { root: 'Chron', mean: 'time' },
  { root: 'Photo', mean: 'light' },
  { root: 'Aqua', mean: 'water' },
  { root: 'Bio', mean: 'life' },
  { root: 'Auto', mean: 'self' },
];

const missOpts = {
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
  dailyDone: true,
  learnedToday: true,
};

describe('Rush / Daily overlay after a miss is Remember — not Root Rush / Daily Challenge / Starter over Geo', () => {
  it('makes Rush start / result eyebrow Remember — not Root Rush / Starter / Choose your level', () => {
    const today = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      learnedRoot: firstBuilder.root,
      learnedRootId: rootId(firstBuilder),
      rememberRoot: geo.root,
      rememberMean: geo.mean,
      rememberRootId: rootId(geo),
      rememberMissed: true,
    });
    expect(today.cta?.label).toBe(rememberMissCtaLabel(geo.root));
    expect(today.missWaiting).toBe(true);

    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });

    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(start.title).toBe(`Remember ${geo.root}`);
    expect(start.eyebrow).toBe('Remember');
    expect(start.eyebrow).not.toMatch(/Root Rush|Starter|All tiers|Choose your level/i);
    expect(start.pickLevel).toBe(false);
    expect(start.missWaiting).toBe(true);
    expect(start.rememberMiss).toBe(rememberMissCtaLabel(geo.root));

    const result = buildRushResultNext(startedBuilder, true, missOpts);
    expect(result.title).toBe(`Remember ${geo.root}`);
    expect(result.eyebrow).toBe('Remember');
    expect(result.eyebrow).not.toMatch(/Root Rush|Starter|All tiers|Daily Challenge/i);
    expect(result.changeLabel).toBeNull();
    expect(result.missWaiting).toBe(true);
    expect(result.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(result.replayLabel).toBe('Play again ›');
  });

  it('makes Daily overlay eyebrow Remember — not Daily Challenge over Geo', () => {
    const done = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(done.title).toBe(`Remember ${geo.root}`);
    expect(done.eyebrow).toBe('Remember');
    expect(done.eyebrow).not.toMatch(/Daily Challenge|Done for today/i);
    expect(done.missWaiting).toBe(true);
    expect(done.primary.label).toBe(rememberMissCtaLabel(geo.root));

    const just = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(just.eyebrow).toBe('Remember');
    expect(just.celebrateDone).toBe(false);
  });

  it('keeps Root Rush / Daily Challenge / Choose your level once the miss is Remembered', () => {
    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      dailyDone: true,
      learnedToday: true,
    });
    expect(start.eyebrow).toBe('Root Rush');
    expect(start.pickLevel).toBe(true);
    expect(start.missWaiting).toBe(false);
    expect(start.title).toBeNull();

    const result = buildRushResultNext(startedBuilder, true, {
      dailyDone: true,
      learnedToday: true,
    });
    expect(result.eyebrow).toBeNull();
    expect(result.changeLabel).toBe('Change level');
    expect(result.missWaiting).toBe(false);
    expect(result.celebrateGrade).toBe(true);

    const done = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(done.eyebrow).toBe('Daily Challenge');
    expect(done.title).toBe('Done for today.');
    expect(done.missWaiting).toBe(false);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Root Rush / Daily Challenge', () => {
    const mid = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(mid.eyebrow).toBe('Root Rush');
    expect(mid.pickLevel).toBe(true);
    expect(mid.missWaiting).toBe(false);
    expect(mid.continueDaily).toBe('Continue Daily · 3 of 5 ›');

    const learnOpen = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnOpen.eyebrow).toBe('Root Rush');
    expect(learnOpen.pickLevel).toBe(true);
    expect(learnOpen.missWaiting).toBe(false);
    expect(learnOpen.continueLearn).toBe(`Continue ${secondBuilder.root} ›`);

    const learnResult = buildRushResultNext(startedBuilder, true, {
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnResult.eyebrow).toBeNull();
    expect(learnResult.changeLabel).toBe('Change level');
    expect(learnResult.primary.label).toBe(`Continue ${secondBuilder.root} ›`);

    const dailyLearn = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      learnedToday: false,
    });
    expect(dailyLearn.eyebrow).toBe('Daily Challenge');
    expect(dailyLearn.missWaiting).toBe(false);
    expect(dailyLearn.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
  });

  it('wires overlay eyebrows — Remember, not Root Rush / Daily Challenge / Starter', () => {
    expect(overlay).toContain("eyebrow: miss ? 'Remember' : 'Root Rush'");
    expect(overlay).toContain('pickLevel: !miss');
    expect(overlay).toContain("eyebrow: miss ? 'Remember' : 'Daily Challenge'");
    expect(overlay).toContain("eyebrow: 'Remember'");
    expect(overlay).toContain('changeLabel: null');
    expect(rush).toContain('aria-label={missDialog ? \'Remember\' : \'Root Rush\'}');
    expect(rush).toContain("q-eyebrow${rushStart.missWaiting ? ' is-miss' : ''}");
    expect(rush).toContain('{rushStart.eyebrow}');
    expect(rush).toContain('{rushStart.pickLevel ? (');
    expect(rush).toContain('Choose your level');
    expect(rush).toContain("q-eyebrow${rushNext.missWaiting ? ' is-miss' : ''}");
    expect(rush).toContain('{rushNext.eyebrow ?? (tier === 0 ? \'All tiers\' : TIERS[tier - 1]?.n)}');
    expect(rush).toContain('{rushNext.changeLabel ? (');
    expect(daily).toContain("aria-label={done.missWaiting && showDoneLanding ? 'Remember' : 'Daily Challenge'}");
    expect(daily).toContain("q-eyebrow${done.missWaiting ? ' is-miss' : ''}");
    expect(daily).toContain('{done.eyebrow}');
    expect(css).toMatch(/\.q-eyebrow\.is-miss/);
  });

  it('keeps Remember eyebrow readable on a phone — not hidden behind Root Rush', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-eyebrow\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    expect(phone).not.toMatch(/\.q-eyebrow\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-eyebrow\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    expect(short).not.toMatch(/\.q-eyebrow\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
    expect(first.root).toBe('Bio');
  });
});

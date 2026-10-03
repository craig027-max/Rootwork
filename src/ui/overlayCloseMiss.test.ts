import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel } from '../core/rushRecap';
import {
  buildDailyDone,
  buildRushResultNext,
  buildRushStart,
  overlayCloseLabel,
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

describe('Rush / Daily overlay close after a miss is Remember — not Close quiz / Close daily over Geo', () => {
  it('makes Rush start / result close Remember — not Close quiz over Geo', () => {
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

    expect(overlayCloseLabel('rush', true)).toBe('Close remember');
    expect(overlayCloseLabel('rush', true)).not.toMatch(/quiz|daily|Root Rush/i);
    expect(overlayCloseLabel('daily', true)).toBe('Close remember');
    expect(overlayCloseLabel('daily', true)).not.toMatch(/quiz|daily/i);

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
    expect(start.missWaiting).toBe(true);
    expect(start.closeLabel).toBe('Close remember');
    expect(start.closeLabel).not.toMatch(/quiz|daily/i);
    expect(start.rememberMiss).toBe(rememberMissCtaLabel(geo.root));

    const result = buildRushResultNext(startedBuilder, true, missOpts);
    expect(result.title).toBe(`Remember ${geo.root}`);
    expect(result.eyebrow).toBe('Remember');
    expect(result.missWaiting).toBe(true);
    expect(result.closeLabel).toBe('Close remember');
    expect(result.closeLabel).not.toMatch(/quiz|daily/i);
    expect(result.primary.label).toBe(rememberMissCtaLabel(geo.root));
  });

  it('makes Daily overlay close Remember — not Close daily over Geo', () => {
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
    expect(done.missWaiting).toBe(true);
    expect(done.closeLabel).toBe('Close remember');
    expect(done.closeLabel).not.toMatch(/quiz|daily/i);
    expect(done.homeLabel).toBe('Home');
    expect(done.primary.label).toBe(rememberMissCtaLabel(geo.root));

    const just = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(just.closeLabel).toBe('Close remember');
    expect(just.celebrateDone).toBe(false);
  });

  it('keeps Close quiz / Close daily once the miss is Remembered', () => {
    expect(overlayCloseLabel('rush')).toBe('Close quiz');
    expect(overlayCloseLabel('daily')).toBe('Close daily');

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
    expect(start.missWaiting).toBe(false);
    expect(start.closeLabel).toBe('Close quiz');

    const result = buildRushResultNext(startedBuilder, true, {
      dailyDone: true,
      learnedToday: true,
    });
    expect(result.missWaiting).toBe(false);
    expect(result.closeLabel).toBe('Close quiz');
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
    expect(done.missWaiting).toBe(false);
    expect(done.closeLabel).toBe('Close daily');
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Close quiz / Close daily', () => {
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
    expect(mid.missWaiting).toBe(false);
    expect(mid.closeLabel).toBe('Close quiz');
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
    expect(learnOpen.missWaiting).toBe(false);
    expect(learnOpen.closeLabel).toBe('Close quiz');
    expect(learnOpen.continueLearn).toBe(`Continue ${secondBuilder.root} ›`);

    const learnResult = buildRushResultNext(startedBuilder, true, {
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnResult.missWaiting).toBe(false);
    expect(learnResult.closeLabel).toBe('Close quiz');
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
    expect(dailyLearn.missWaiting).toBe(false);
    expect(dailyLearn.closeLabel).toBe('Close daily');
    expect(dailyLearn.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
  });

  it('wires overlay close — Close remember, not Close quiz / Close daily', () => {
    expect(overlay).toContain("if (miss) return 'Close remember'");
    expect(overlay).toContain("return mode === 'daily' ? 'Close daily' : 'Close quiz'");
    expect(overlay).toContain("closeLabel: overlayCloseLabel('rush', Boolean(miss))");
    expect(overlay).toContain("closeLabel: overlayCloseLabel('daily', Boolean(miss))");
    expect(overlay).toContain("closeLabel: overlayCloseLabel('rush', true)");
    expect(rush).toContain('overlayCloseLabel');
    expect(rush).toContain('rushStart.closeLabel');
    expect(rush).toContain('rushNext.closeLabel');
    expect(rush).toContain("q-x${missDialog ? ' is-miss' : ''}");
    expect(rush).not.toContain('aria-label="Close quiz"');
    expect(daily).toContain('overlayCloseLabel');
    expect(daily).toContain('done.closeLabel');
    expect(daily).toContain("q-x${done.missWaiting && showDoneLanding ? ' is-miss' : ''}");
    expect(daily).not.toContain('aria-label="Close daily"');
    expect(css).toMatch(/\.q-x\.is-miss/);
  });

  it('keeps Close remember readable on a phone — not hidden behind Close quiz', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-x\.is-miss\s*\{[^}]*display:\s*grid/);
    expect(phone).not.toMatch(/\.q-x\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-x\.is-miss\s*\{[^}]*display:\s*grid/);
    expect(short).not.toMatch(/\.q-x\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
    expect(first.root).toBe('Bio');
  });
});

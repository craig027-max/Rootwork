import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel } from '../core/rushRecap';
import {
  buildDailyDone,
  overlayCloseLabel,
  overlayHomeLabel,
  rushMissRememberReady,
} from './modes/modeHandoff';
import { buildTodayProgress } from './home/todayProgress';

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

describe('Daily Home ghost after a miss is Remember — not Home over Geo', () => {
  it('makes Daily overlay Home Remember — not Home over Geo', () => {
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

    expect(overlayHomeLabel(true)).toBe('← Remember');
    expect(overlayHomeLabel(true)).not.toMatch(/^Home$/i);
    expect(overlayHomeLabel()).toBe('Home');
    expect(overlayCloseLabel('daily', true)).toBe('Close remember');

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
    expect(done.homeLabel).toBe('← Remember');
    expect(done.homeLabel).not.toMatch(/^Home$|quiz|daily/i);
    expect(done.replayLabel).toBe('Play again ›');
    expect(done.primary.label).toBe(rememberMissCtaLabel(geo.root));

    const just = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(just.homeLabel).toBe('← Remember');
    expect(just.closeLabel).toBe('Close remember');
    expect(just.celebrateDone).toBe(false);
  });

  it('keeps Home once the miss is Remembered', () => {
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
    expect(done.homeLabel).toBe('Home');
    expect(done.homeLabel).not.toMatch(/Remember/i);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Home', () => {
    expect(overlayHomeLabel(false)).toBe('Home');

    const learnOpen = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      learnedToday: false,
    });
    expect(learnOpen.missWaiting).toBe(false);
    expect(learnOpen.homeLabel).toBe('Home');
    expect(learnOpen.closeLabel).toBe('Close daily');
    expect(learnOpen.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
  });

  it('wires Daily Home ghost — ← Remember, not Home over Geo', () => {
    expect(overlay).toContain("if (miss) return '← Remember'");
    expect(overlay).toContain("return 'Home'");
    expect(overlay).toContain('homeLabel: overlayHomeLabel(Boolean(miss))');
    expect(overlay).toContain('export function overlayHomeLabel');
    expect(daily).toContain('done.homeLabel');
    expect(daily).toContain("q-ghost${done.missWaiting ? ' is-miss' : ''}");
    expect(css).toMatch(/\.q-ghost\.is-miss/);
  });

  it('keeps ← Remember readable on a phone — not hidden behind Home', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-ghost\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-ghost\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-ghost\.is-miss\s*\{[^}]*display:\s*block/);
    expect(short).not.toMatch(/\.q-ghost\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
    expect(first.root).toBe('Bio');
  });
});

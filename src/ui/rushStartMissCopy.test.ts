import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import { buildRushStart, rushMissRememberReady } from './modes/modeHandoff';
import { buildTodayProgress } from './home/todayProgress';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
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

const missOpts = {
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
  dailyDone: true,
  learnedToday: true,
};

describe('Rush start after a miss is Remember — not Test your roots / Best so far over Geo', () => {
  it('makes Remember Geo the start title — not Test your roots / Best so far', () => {
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
    expect(today.pathDone).toBe(false);
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
    expect(start.title).not.toMatch(/Test your|roots\.|Best so far|Grade |NEW BEST/i);
    expect(start.recap).toBeNull();
    expect(start.heroSub).toBe('Play again is just for fun.');
    expect(start.heroSub).not.toMatch(/combo|multiplies|questions a round/i);
    expect(start.missWaiting).toBe(true);
    expect(start.rememberMiss).toBe(rememberMissCtaLabel(geo.root));
    expect(start.rememberPeek).toBe(todayMissRecap(geo.root));
    expect(start.goLabel).toBe('Play again ›');

    const two = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
      rememberAlso: photo.root,
    });
    expect(two.title).toBe(`Remember ${geo.root}`);
    expect(two.recap).toBeNull();
    expect(two.rememberPeek).toBe(todayMissRecap(geo.root, photo.root));
  });

  it('keeps Test your roots / Best so far once the miss is Remembered', () => {
    const clean = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      dailyDone: true,
      learnedToday: true,
    });
    expect(clean.title).toBeNull();
    expect(clean.recap).toBe('Best so far — A · 4★ · 2,400');
    expect(clean.missWaiting).toBe(false);
    expect(clean.heroSub).toBeNull();
    expect(clean.rememberMiss).toBeNull();
  });

  it('keeps Continue Daily / unfinished Continue {learn} as a graded start', () => {
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
    expect(mid.title).toBeNull();
    expect(mid.recap).toBe('Best so far — A · 4★ · 2,400');
    expect(mid.missWaiting).toBe(false);
    expect(mid.continueDaily).toBe('Continue Daily · 3 of 5 ›');
    expect(mid.goLabel).toBe('Play again ›');

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
    expect(learnOpen.title).toBeNull();
    expect(learnOpen.recap).toBe('Best so far — A · 4★ · 2,400');
    expect(learnOpen.missWaiting).toBe(false);
    expect(learnOpen.learnWaiting).toBe(true);
    expect(learnOpen.continueLearn).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnOpen.continueLearn).not.toMatch(/Remember |Play again/);
  });

  it('wires start overlay — Remember Geo, not Test your roots / Best so far', () => {
    expect(overlay).toContain('title: miss ? `Remember ${miss.name}` : null');
    expect(overlay).toContain('recap: miss ? null : recap ? `Best so far — ${recap}` : null');
    expect(rush).toContain("q-title${rushStart.missWaiting ? ' is-miss' : ''}");
    expect(rush).toContain('rushStart.title');
    expect(rush).toContain('Test your <span className="g">roots.</span>');
    expect(rush).toContain('{rushStart.recap ? (');
    expect(css).toMatch(/\.q-title\.is-miss/);
  });

  it('keeps Remember title readable on a phone — not hidden behind Best so far', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-title\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-title\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-title\.is-miss\s*\{[^}]*display:\s*block/);
    expect(short).not.toMatch(/\.q-title\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

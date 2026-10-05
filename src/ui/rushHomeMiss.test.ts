import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { afterYesNextLabel } from '../core/deckFlow';
import { rememberMissCtaLabel } from '../core/rushRecap';
import { rememberLeaveLabel } from './deck/deckChrome';
import {
  buildDailyDone,
  buildRushResultNext,
  buildRushStart,
  overlayHomeLabel,
  rushMissRememberReady,
} from './modes/modeHandoff';
import { buildTodayProgress } from './home/todayProgress';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
const chrome = readFileSync(join(process.cwd(), 'src/ui/deck/deckChrome.ts'), 'utf8');
const flow = readFileSync(join(process.cwd(), 'src/core/deckFlow.ts'), 'utf8');
const quizCss = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');
const appCss = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

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

describe('Rush / Deck Home after a miss is Remember — not Home → over Geo', () => {
  it('makes Rush start / result Home Remember — not Home → over Geo', () => {
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
    expect(overlayHomeLabel(true)).not.toMatch(/^Home$|Home →/i);

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
    expect(start.missWaiting).toBe(true);
    expect(start.homeLabel).toBe('← Remember');
    expect(start.homeLabel).not.toMatch(/^Home$|Home →|quiz|daily/i);
    expect(start.goLabel).toBe('Play again ›');
    expect(start.rememberMiss).toBe(rememberMissCtaLabel(geo.root));

    const result = buildRushResultNext(startedBuilder, true, missOpts);
    expect(result.title).toBe(`Remember ${geo.root}`);
    expect(result.missWaiting).toBe(true);
    expect(result.homeLabel).toBe('← Remember');
    expect(result.homeLabel).not.toMatch(/^Home$|Home →|quiz|daily/i);
    expect(result.replayLabel).toBe('Play again ›');
    expect(result.primary.label).toBe(rememberMissCtaLabel(geo.root));
  });

  it('makes Deck Remember leave ← Remember — not Home → over Geo', () => {
    expect(rememberLeaveLabel({ missed: true })).toBe('← Remember');
    expect(rememberLeaveLabel({ missed: true })).not.toMatch(/Home/);
    expect(
      afterYesNextLabel({ kind: 'home', line: 'Yes — Geo means earth.' }, 'remember', {
        missed: true,
      }),
    ).toBe('← Remember');
    expect(
      afterYesNextLabel({ kind: 'home', line: 'Yes — Geo means earth.' }, 'remember', {
        missed: true,
      }),
    ).not.toMatch(/Home/);
  });

  it('keeps Home / Home → once the miss is Remembered', () => {
    expect(overlayHomeLabel()).toBe('Home');
    expect(rememberLeaveLabel()).toBe('Home →');
    expect(afterYesNextLabel({ kind: 'home', line: 'Yes — Bio means life.' }, 'remember')).toBe(
      'Home →',
    );

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
    expect(start.homeLabel).toBeNull();

    const result = buildRushResultNext(startedBuilder, true, {
      dailyDone: true,
      learnedToday: true,
    });
    expect(result.missWaiting).toBe(false);
    expect(result.homeLabel).toBeNull();
    expect(result.celebrateGrade).toBe(true);

    const done = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(done.homeLabel).toBe('Home');
    expect(done.homeLabel).not.toMatch(/Remember/i);
  });

  it('keeps Continue Daily / unfinished Continue {learn} without a Rush Home ghost', () => {
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
    expect(mid.continueDaily).toBe('Continue Daily · 3 of 5 ›');
    expect(mid.missWaiting).toBe(false);
    expect(mid.homeLabel).toBeNull();

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
    expect(learnOpen.homeLabel).toBeNull();
    expect(learnOpen.continueLearn).toBe(`Continue ${secondBuilder.root} ›`);

    const learnResult = buildRushResultNext(startedBuilder, true, {
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnResult.missWaiting).toBe(false);
    expect(learnResult.homeLabel).toBeNull();
    expect(learnResult.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
  });

  it('wires Rush + Deck leave — ← Remember, not Home → over Geo', () => {
    expect(overlay).toContain('homeLabel: miss ? overlayHomeLabel(true) : null');
    expect(overlay).toContain('homeLabel: overlayHomeLabel(true)');
    expect(overlay).toContain('homeLabel: null');
    expect(rush).toContain('rushStart.homeLabel');
    expect(rush).toContain('rushNext.homeLabel');
    expect(rush).toContain('q-ghost is-miss');
    expect(chrome).toContain('export function rememberLeaveLabel');
    expect(chrome).toContain("return opts.missed ? '← Remember' : 'Home →'");
    expect(flow).toContain("return opts.missed ? '← Remember' : 'Home →'");
    expect(deck).toContain('rememberLeaveLabel');
    expect(deck).toContain('{ missed: missRemember }');
    expect(deck).toContain("ww-recall-teach${remembering ? ' is-remember' : ''}${missRemember ? ' is-miss' : ''}");
    expect(deck).not.toContain('Home →');
    expect(quizCss).toMatch(/\.q-ghost\.is-miss/);
    expect(appCss).toMatch(/\.ww-recall-teach\.is-miss \.btn\.is-miss/);
    expect(appCss).toMatch(/\.ww-card-actions \.btn\.is-miss/);
  });

  it('keeps ← Remember readable on a phone — not hidden behind Home →', () => {
    const quizPhone = mediaBlock(quizCss, 'max-width: 560px');
    expect(quizPhone).toMatch(/\.q-ghost\.is-miss\s*\{[^}]*display:\s*block/);
    expect(quizPhone).not.toMatch(/\.q-ghost\.is-miss\s*\{[^}]*display:\s*none/);
    const quizShort = mediaBlock(quizCss, 'max-height: 720px');
    expect(quizShort).toMatch(/\.q-ghost\.is-miss\s*\{[^}]*display:\s*block/);
    expect(quizShort).not.toMatch(/\.q-ghost\.is-miss\s*\{[^}]*display:\s*none/);

    const phone = mediaBlock(appCss, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-recall-teach\.is-miss\s*\{[^}]*display:\s*flex|\.ww-recall-teach\.is-miss,/);
    expect(phone).toMatch(/\.btn\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.btn\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(appCss, 'max-height: 720px');
    expect(short).toMatch(/\.ww-recall-teach\.is-miss/);
    expect(short).toMatch(/\.btn\.is-miss\s*\{[^}]*display:\s*block/);
    expect(short).not.toMatch(/\.btn\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
    expect(first.root).toBe('Bio');
  });
});

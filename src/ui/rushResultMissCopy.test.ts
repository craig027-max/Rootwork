import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import { buildRushResultNext, rushMissRememberReady } from './modes/modeHandoff';
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

describe('Rush result after a miss is Remember — not a giant grade / NEW BEST over Geo', () => {
  it('makes Remember Geo the result title — not the giant grade letter', () => {
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

    const result = buildRushResultNext(startedBuilder, true, missOpts);
    expect(result.title).toBe(`Remember ${geo.root}`);
    expect(result.title).not.toMatch(/Done for today|Nice work|Welcome back|Grade /i);
    expect(result.celebrateGrade).toBe(false);
    expect(result.missWaiting).toBe(true);
    expect(result.peek).toBe(todayMissRecap(geo.root));
    expect(result.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(result.replayLabel).toBe('Play again ›');

    const two = buildRushResultNext(startedBuilder, true, {
      ...missOpts,
      rememberAlso: photo.root,
    });
    expect(two.title).toBe(`Remember ${geo.root}`);
    expect(two.peek).toBe(todayMissRecap(geo.root, photo.root));
    expect(two.celebrateGrade).toBe(false);
  });

  it('keeps the giant grade / NEW BEST once the miss is Remembered', () => {
    const clean = buildRushResultNext(startedBuilder, true, {
      dailyDone: true,
      learnedToday: true,
    });
    expect(clean.title).toBeNull();
    expect(clean.celebrateGrade).toBe(true);
    expect(clean.missWaiting).toBe(false);
    expect(clean.primary.label).not.toMatch(/Remember /);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as a graded result', () => {
    const mid = buildRushResultNext(startedBuilder, true, {
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      ...missOpts,
    });
    expect(mid.title).toBeNull();
    expect(mid.celebrateGrade).toBe(true);
    expect(mid.missWaiting).toBe(false);
    expect(mid.primary.label).toBe('Continue Daily · 3 of 5 ›');

    const learnOpen = buildRushResultNext(startedBuilder, true, {
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnOpen.title).toBeNull();
    expect(learnOpen.celebrateGrade).toBe(true);
    expect(learnOpen.missWaiting).toBe(false);
    expect(learnOpen.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnOpen.primary.label).not.toMatch(/Remember |Play again/);
  });

  it('wires result overlay — Remember Geo, not a giant grade / NEW BEST', () => {
    expect(overlay).toContain('title: `Remember ${miss.name}`');
    expect(overlay).toContain('celebrateGrade: false');
    expect(overlay).toContain('celebrateGrade: true');
    expect(rush).toContain('rushNext.celebrateGrade');
    expect(rush).toContain('rushNext.title');
    expect(rush).toContain("rushNext.missWaiting ? ' is-miss'");
    expect(rush).toContain('newBestScore && rushNext.celebrateGrade');
    expect(rush).toContain('result?.grade === \'S\' && rushNext.celebrateGrade');
    expect(css).toMatch(/\.q-done-title\.is-miss/);
    expect(css).toMatch(/\.q-stars\.is-miss/);
  });

  it('keeps Remember title readable on a phone — not hidden behind the grade', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-done-title\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-stars\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-done-title\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-stars\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-done-title\.is-miss\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.q-stars\.is-miss\s*\{[^}]*display:\s*block/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

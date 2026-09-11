import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  continueDailyLabel,
  dailyNextRoot,
  dailyNextRowLabel,
  dailySeed,
  pickDailyRoots,
  resumeDailyQi,
} from '../core/daily';
import { ROOTS, isRootOpenable, rootId, rootsInTier } from '../data/roots';
import { buildRushResultNext, buildRushStart, dailyWaitingLine } from './modes/modeHandoff';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const handoff = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
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

const T1 = ROOTS.filter((r) => isRootOpenable(rootId(r), false));
const starter = rootsInTier(1);
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder roots');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);
const today = pickDailyRoots(T1, dailySeed('2026-09-10', 'kid-a'));
const next = dailyNextRoot(today, 2);

describe('Rush continues a live Daily mid-run', () => {
  it('names the same next Daily root Home already peeks', () => {
    expect(today).toHaveLength(5);
    expect(next).toBeTruthy();
    expect(resumeDailyQi({ day: '2026-09-10', studentId: 'kid-a', qi: 2 }, '2026-09-10', 'kid-a', 5)).toBe(
      2,
    );

    const waiting = dailyWaitingLine({
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: next?.root,
      dailyNextMean: next?.mean,
    });
    expect(waiting).toBe(dailyNextRowLabel({
      answered: 2,
      total: 5,
      nextName: next!.root,
      nextMean: next!.mean,
    }));
    expect(waiting).toContain(next!.root);
    expect(waiting).toContain(next!.mean);
    expect(waiting).not.toMatch(/Play again|Start daily|Continue ${secondBuilder.root}/);

    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: next?.root,
      dailyNextMean: next?.mean,
    });
    expect(start.waiting).toBe(waiting);
    expect(start.goLabel).toBe('Play again ›');

    const result = buildRushResultNext(startedBuilder, true, {
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: next?.root,
      dailyNextMean: next?.mean,
    });
    expect(result.dailyResume).toBe(true);
    expect(result.peek).toBe(waiting);
    expect(result.primary.kind).toBe('daily');
    expect(result.primary.label).toBe(continueDailyLabel(2, 5));
    expect(result.primary.label).toBe('Continue Daily · 3 of 5 ›');
    expect(result.primary.rootName).toBe(next!.root);
    expect(result.primary.label).not.toMatch(/Continue ${secondBuilder.root}|Play Auto|Keep going/);
    expect(result.replayLabel).toBe('Play again ›');
  });

  it('keeps Continue {learn} when Daily is not mid-run', () => {
    const result = buildRushResultNext(startedBuilder, true);
    expect(result.dailyResume).toBe(false);
    expect(result.peek).toBeNull();
    expect(result.primary.kind).toBe('learn');
    expect(result.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(dailyWaitingLine({})).toBeNull();
    expect(dailyWaitingLine({ dailyResumeQi: 0, dailyTotal: 5, dailyNextName: 'Chron' })).toBeNull();
  });

  it('wires Rush to resume Daily — Play again stays secondary', () => {
    expect(rush).toContain('liveDailyResumeQi');
    expect(rush).toContain('dailyNextRoot');
    expect(rush).toContain('pickDailyRoots');
    expect(rush).toContain('buildRushResultNext(completed, entitled, dailyResume)');
    expect(rush).toContain('goPrimary');
    expect(rush).toContain("setView('daily')");
    expect(rush).toContain('q-daily-wait');
    expect(rush).toContain('rushNext.dailyResume');
    expect(rush).toContain('rushStart.waiting');
    expect(handoff).toContain('continueDailyLabel');
    expect(handoff).toContain('dailyNextRowLabel');
    expect(handoff).toContain("kind: 'daily'");
  });

  it('keeps the Daily peek readable on a phone and a short screen', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    const short = mediaBlock(css, 'max-height: 720px');
    expect(phone).toMatch(/\.q-daily-wait\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.q-daily-wait\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-daily-wait\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.q-daily-wait\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.q-daily-wait\s*\{/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

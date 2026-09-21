import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import {
  buildRushStart,
  rushLearnReady,
  rushMissRememberReady,
} from './modes/modeHandoff';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
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

describe('Rush start after a miss is Remember — not Play again over Geo', () => {
  it('makes Remember Geo the start fat tap once Daily + a learn are done', () => {
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
    expect(start.missWaiting).toBe(true);
    expect(start.learnWaiting).toBe(false);
    expect(start.rememberMiss).toBe(rememberMissCtaLabel(geo.root));
    expect(start.rememberMissId).toBe(rootId(geo));
    expect(start.rememberPeek).toBe(todayMissRecap(geo.root));
    expect(start.goLabel).toBe('Play again ›');
    expect(start.heroSub).toBe('Play again is just for fun.');
    expect(start.heroSub).not.toMatch(/combo|multiplies|questions a round/i);
    expect(start.rememberMiss).not.toMatch(/Play again|Continue |Keep going/);
  });

  it('peeks the next miss so two misses are not a one-chip lie', () => {
    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
      rememberAlso: photo.root,
    });
    expect(start.rememberPeek).toBe(todayMissRecap(geo.root, photo.root));
    expect(start.rememberPeek).toBe(`Remember ${geo.root} · then ${photo.root}`);
    expect(start.rememberMissId).toBe(rootId(geo));
    expect(start.missWaiting).toBe(true);
  });

  it('keeps Continue Daily as a ghost — Play again stays the start tap', () => {
    const mid = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(mid.continueDaily).toBe('Continue Daily · 3 of 5 ›');
    expect(mid.goLabel).toBe('Play again ›');
    expect(mid.missWaiting).toBe(false);
    expect(mid.learnWaiting).toBe(false);
    expect(mid.rememberMiss).toBeNull();
    expect(mid.heroSub).toBeNull();
  });

  it('makes Continue {learn} the start fat tap when Daily is banked and the learn is open', () => {
    expect(
      rushLearnReady(startedBuilder, true, {
        dailyDone: true,
        learnedToday: false,
      }),
    ).toEqual({
      kind: 'learn',
      label: `Continue ${secondBuilder.root} ›`,
      rootId: rootId(secondBuilder),
      rootName: secondBuilder.root,
    });

    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      completed: startedBuilder,
      entitled: true,
      dailyDone: true,
      learnedToday: false,
    });
    expect(start.learnWaiting).toBe(true);
    expect(start.missWaiting).toBe(false);
    expect(start.continueLearn).toBe(`Continue ${secondBuilder.root} ›`);
    expect(start.goLabel).toBe('Play again ›');
    expect(start.heroSub).toBeNull();
  });

  it('keeps Start / Play again as the fat tap on a clean run', () => {
    const fresh = buildRushStart({ runs: 0, bestPct: 0, bestStars: 0 });
    expect(fresh.goLabel).toBe('Start round ›');
    expect(fresh.missWaiting).toBe(false);
    expect(fresh.learnWaiting).toBe(false);
    expect(fresh.heroSub).toBeNull();

    const replay = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
    });
    expect(replay.goLabel).toBe('Play again ›');
    expect(replay.missWaiting).toBe(false);
    expect(replay.learnWaiting).toBe(false);
    expect(replay.heroSub).toBeNull();
  });

  it('wires start — Remember / Continue is the q-go, Play again is the ghost', () => {
    expect(overlay).toContain('missWaiting: Boolean(miss)');
    expect(overlay).toContain('learnWaiting: Boolean(learn)');
    expect(overlay).toContain("heroSub: miss ? 'Play again is just for fun.' : null");
    expect(overlay).toContain('Change level must');
    expect(rush).toContain('rushStart.missWaiting');
    expect(rush).toContain('rushStart.learnWaiting');
    expect(rush).toContain('rushStart.heroSub');
    expect(rush).toContain('q-start-actions');
    expect(rush).toContain("goPrimary('remember', rushStart.rememberMissId ?? undefined)");
    expect(rush).toContain("goPrimary('learn', rushStart.continueLearnId ?? undefined)");
    expect(rush).toContain('className="q-ghost" onClick={startRun}');
    expect(home).toContain("missHero");
    expect(home).toContain("? 'Remember'");
  });

  it('keeps Remember / Continue start CTAs readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-start-actions\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.q-start-actions \.q-daily-wait\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-start-actions \.q-go\.is-miss\s*\{[^}]*display:\s*block|\.q-go\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-start-actions \.q-ghost\s*\{[^}]*display:\s*block|\.q-actions \.q-ghost\s*\{[^}]*width:\s*100%/);
    expect(phone).not.toMatch(/\.q-start-actions\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-start-actions \.q-daily-wait\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-start-actions\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.q-start-actions \.q-daily-wait\s*\{[^}]*display:\s*block/);
    expect(css).toMatch(/\.q-start-actions\s*\{/);
    expect(css).toMatch(/\.q-go\.is-miss/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

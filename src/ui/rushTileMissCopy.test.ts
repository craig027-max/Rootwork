import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, rushBestLabel } from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
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

const extraMiss = {
  dailyRoots: [] as const,
  dailyDone: true,
  streak: 4,
  nextPlay: false,
  completed: startedBuilder,
  entitled: true,
  learnedToday: true,
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
  rushRuns: 1,
  rushBestPct: 80,
  rushBestStars: 4,
  rushBestScore: 2400,
};

describe('Home Rush after a miss is Remember — not a giant grade / Best so far over Geo', () => {
  it('makes Remember Geo the tile title — not Root Rush / Best so far / the A ring', () => {
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

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushBest: rushBestLabel({
        runs: 1,
        bestPct: 80,
        bestStars: 4,
        bestScore: 2400,
      }),
      rushMissName: geo.root,
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(rushRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(rushRow.best).toBeUndefined();

    const vm = buildDetailVM(rushRow, extraMiss);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.big).not.toMatch(/Root Rush|Grade |NEW BEST/i);
    expect(String(vm.lead)).toBe('Play again is just for fun.');
    expect(String(vm.lead)).not.toMatch(/Best so far|rack up combos|beat your best|combo/i);
    expect(vm.ring).toBeUndefined();
    expect(vm.pmA).toBeUndefined();
    expect(vm.pmB).toBeUndefined();
    expect(vm.waiting).toBe(todayMissRecap(geo.root));
    expect(vm.waitingMiss).toBe(true);
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.secondary?.label).toBe('Play again ›');

    const two = buildDetailVM(rushRow, {
      ...extraMiss,
      rememberAlso: photo.root,
    });
    expect(two.big).toBe(`Remember ${geo.root}`);
    expect(two.waiting).toBe(todayMissRecap(geo.root, photo.root));
    expect(two.ring).toBeUndefined();
    expect(String(two.lead)).not.toMatch(/Best so far|combo/i);
  });

  it('keeps Root Rush / Best so far / the A ring once the miss is Remembered', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushBest: rushBestLabel({
        runs: 1,
        bestPct: 80,
        bestStars: 4,
        bestScore: 2400,
      }),
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(rushRow.best).toBe('A · 4★ · 2,400');

    const clean = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 2400,
    });
    expect(clean.big).toBe('Root Rush');
    expect(String(clean.lead)).toMatch(/Best so far/);
    expect(String(clean.lead)).toMatch(/2,400/);
    expect(clean.ring).toEqual({ pct: 80, label: 'A' });
    expect(clean.pmA).toBe('4★ best');
    expect(clean.pmB).toBe('2,400 combo');
    expect(clean.waitingMiss).toBe(false);
    expect(clean.primary.label).not.toMatch(/Remember /);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as a graded Rush tile', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushBest: rushBestLabel({
        runs: 1,
        bestPct: 80,
        bestStars: 4,
        bestScore: 2400,
      }),
      rushMissName: geo.root,
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');

    const mid = buildDetailVM(rushRow, {
      ...extraMiss,
      dailyRoots: [
        { root: 'Chron', mean: 'time' },
        { root: 'Photo', mean: 'light' },
        { root: 'Aqua', mean: 'water' },
        { root: 'Bio', mean: 'life' },
        { root: 'Auto', mean: 'self' },
      ] as never,
      dailyResumeQi: 2,
      dailyTotal: 5,
    });
    expect(mid.big).toBe('Root Rush');
    expect(mid.ring).toEqual({ pct: 80, label: 'A' });
    expect(mid.waitingMiss).toBe(false);
    expect(mid.secondary?.label).toBe('Continue Daily · 3 of 5 ›');
    expect(String(mid.lead)).toMatch(/Best so far/);

    const learnOpen = buildDetailVM(rushRow, {
      ...extraMiss,
      learnedToday: false,
    });
    expect(learnOpen.big).toBe('Root Rush');
    expect(learnOpen.ring).toEqual({ pct: 80, label: 'A' });
    expect(learnOpen.waitingMiss).toBe(false);
    expect(learnOpen.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnOpen.primary.label).not.toMatch(/Remember |Play again/);
    expect(String(learnOpen.lead)).toMatch(/Best so far/);
  });

  it('wires Home tile — Remember Geo, not Root Rush / Best so far / the A ring', () => {
    expect(detail).toContain("big: missHero && miss ? `Remember ${miss.name}` : 'Root Rush'");
    expect(detail).toContain("lead: missHero");
    expect(detail).toContain("'Play again is just for fun.'");
    expect(detail).toContain('!missHero && recap');
    expect(detail).toContain('!missHero && played');
    expect(menu).toContain('opts.rushMissName ? undefined : opts.rushBest');
    expect(panel).toContain("ww-big${vm.waitingMiss ? ' is-miss' : ''}");
    expect(css).toMatch(/\.ww-big\.is-miss/);
  });

  it('keeps Remember title readable on a phone — not hidden behind the grade', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-big\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-detail-wait\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-big\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-detail-wait\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

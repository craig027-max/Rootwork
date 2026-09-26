import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import {
  buildMenu,
  homeSecondaryAction,
  isCompleteTier,
  isMissProgressTier,
  isResumeTier,
} from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
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
};

describe('Starter after a miss is Remember — not every root owned / Remember Bio over Geo', () => {
  it('makes Remember Geo the complete Starter tile — not every root owned / Remember Bio', () => {
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
      rushMissName: geo.root,
    });
    const row = items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(row?.kind).toBe('tier');
    if (row?.kind !== 'tier') throw new Error('fixture: Starter missing');
    expect(isCompleteTier(row)).toBe(true);
    expect(isResumeTier(row)).toBe(false);
    expect(isMissProgressTier(row)).toBe(true);
    expect(row.sub).toBe(`Missed ${geo.root} · remember`);
    expect(row.sub).not.toMatch(/every root|owned|complete/i);
    expect(row.missName).toBe(geo.root);
    expect(row.resumeName).toBeUndefined();

    const vm = buildDetailVM(row, extraMiss);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.big).not.toMatch(/Starter|Bio/i);
    expect(String(vm.lead)).toBe(`Remember ${first.root} is just for fun.`);
    expect(String(vm.lead)).not.toMatch(/every root owned|Tier complete|roots owned/i);
    expect(vm.ring).toBeUndefined();
    expect(vm.pmA).toBeUndefined();
    expect(vm.pmB).toBeUndefined();
    expect(vm.waiting).toBe(todayMissRecap(geo.root));
    expect(vm.waitingMiss).toBe(true);
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.secondary?.label).toBe(`Remember ${first.root} ›`);
    expect(vm.secondary?.label).not.toMatch(/See all|every root/i);
    expect(vm.heroCta).toBe(true);
    expect(vm.scene?.caption).toMatch(new RegExp(`^${geo.root}`));
    expect(vm.scene?.caption).not.toMatch(/^Bio/);
    expect(vm.samples.find((s) => s.root === geo.root)?.ok).toBe(false);
    expect(vm.samples.find((s) => s.root === first.root)?.ok).toBe(true);
    expect(vm.samplesDone).toBe(false);
    expect(homeSecondaryAction(row, { rememberMissId: rootId(geo) })).toEqual({
      kind: 'tier',
      t: 1,
    });

    const two = buildDetailVM(row, {
      ...extraMiss,
      rememberAlso: photo.root,
    });
    expect(two.big).toBe(`Remember ${geo.root}`);
    expect(two.waiting).toBe(todayMissRecap(geo.root, photo.root));
    expect(two.ring).toBeUndefined();
  });

  it('keeps every root owned / Remember Bio once the miss is Remembered', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const row = items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(row?.kind).toBe('tier');
    if (row?.kind !== 'tier') throw new Error('fixture: Starter missing');
    expect(isCompleteTier(row)).toBe(true);
    expect(isMissProgressTier(row)).toBe(false);
    expect(row.missName).toBeUndefined();
    expect(row.sub).not.toMatch(/Missed /);

    const clean = buildDetailVM(row, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(clean.big).toMatch(/Starter/);
    expect(String(clean.lead)).toMatch(/every root owned/);
    expect(clean.primary.label).toBe(`Remember ${first.root} ›`);
    expect(clean.primary.label).not.toMatch(/Remember Geo/);
    expect(clean.secondary?.label).toBe('See all roots');
    expect(clean.waitingMiss).toBe(false);
    expect(clean.ring?.label).toBe('✓');
    expect(clean.pmB).toBe('Tier complete');
    expect(clean.samplesDone).toBe(true);
    expect(homeSecondaryAction(row)).toEqual({ kind: 'index' });
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Starter recap', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const row = items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(row?.kind).toBe('tier');
    if (row?.kind !== 'tier') throw new Error('fixture: Starter missing');

    const mid = buildDetailVM(row, {
      ...extraMiss,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyDone: false,
      learnedToday: false,
    });
    expect(mid.big).toMatch(/Starter/);
    expect(mid.waitingMiss).toBe(false);
    expect(mid.primary.label).toBe(`Remember ${first.root} ›`);
    expect(mid.primary.label).not.toMatch(/Remember Geo/);
    expect(String(mid.lead)).toMatch(/every root owned/);

    const learnOpen = buildDetailVM(row, {
      ...extraMiss,
      learnedToday: false,
    });
    expect(learnOpen.big).toMatch(/Starter/);
    expect(learnOpen.waitingMiss).toBe(false);
    expect(learnOpen.primary.label).toBe(`Remember ${first.root} ›`);
    expect(learnOpen.primary.label).not.toMatch(/Remember Geo/);
  });

  it('wires Home Progress — Remember Geo, not every root owned / Remember Bio', () => {
    expect(detail).toContain('complete');
    expect(detail).toContain('Remember ${rootName} is just for fun.');
    expect(detail).toContain('Remember ${rootName} ›');
    expect(detail).toContain('ok: false');
    expect(menu).toContain('completeNow');
    expect(menu).toContain('missHere ? `Missed ${missName} · remember`');
    expect(menu).toContain('isMissProgressTier');
    expect(menu).toContain('if (opts.rememberMissId) return { kind: \'tier\', t: item.t }');
    expect(home).toContain('isMissProgressTier');
    expect(home).toContain('missHero && rushMissId && isMissProgressTier(item)');
    expect(home).toContain("openRoot(rushMissId, { entry: 'remember' })");
    expect(panel).toContain("ww-big${vm.waitingMiss ? ' is-miss' : ''}");
    expect(css).toMatch(/\.ww-big\.is-miss/);
  });

  it('keeps Remember title readable on a phone — not hidden behind every root owned', () => {
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

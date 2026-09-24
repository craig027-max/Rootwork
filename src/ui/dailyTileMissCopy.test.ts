import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { dailyDoneLead, dailyDoneMenuSub } from '../core/daily';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu } from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/core/daily.ts'), 'utf8');
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

const extraMiss = {
  dailyRoots: todayDeal as never,
  dailyDone: true,
  streak: 4,
  nextPlay: false,
  completed: startedBuilder,
  entitled: true,
  learnedToday: true,
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
};

describe('Home Daily after a miss is Remember — not Daily / DONE / Done for today over Geo', () => {
  it('makes Remember Geo the tile title — not Daily / DONE / Done for today', () => {
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
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
      dailyStreak: 4,
      rushMissName: geo.root,
    });
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(dailyRow?.kind).toBe('mode');
    if (dailyRow?.kind !== 'mode') throw new Error('fixture: Daily missing');
    expect(dailyRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(dailyRow.sub).not.toMatch(/Done for today|Done ·|Five fresh roots/i);
    expect(dailyRow.badge).toBeUndefined();
    expect(dailyRow.best).toBeUndefined();

    const vm = buildDetailVM(dailyRow, extraMiss);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.big).not.toMatch(/Daily|Done for today|Grade |NEW BEST/i);
    expect(vm.lead).toBe(dailyDoneLead(4, { missWaiting: true }));
    expect(String(vm.lead)).not.toMatch(/Streak banked|Done for today/i);
    expect(vm.waiting).toBe(todayMissRecap(geo.root));
    expect(vm.waitingMiss).toBe(true);
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.secondary?.label).toBe('Play again ›');

    const two = buildDetailVM(dailyRow, {
      ...extraMiss,
      rememberAlso: photo.root,
    });
    expect(two.big).toBe(`Remember ${geo.root}`);
    expect(two.waiting).toBe(todayMissRecap(geo.root, photo.root));
    expect(String(two.lead)).not.toMatch(/Streak banked|Done for today/i);
  });

  it('keeps Daily / DONE / Done for today once the miss is Remembered', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
      dailyStreak: 4,
    });
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(dailyRow?.kind).toBe('mode');
    if (dailyRow?.kind !== 'mode') throw new Error('fixture: Daily missing');
    expect(dailyRow.badge).toBe('DONE');
    expect(dailyRow.best).toBe('🔥 4');
    expect(dailyRow.sub).toBe(dailyDoneMenuSub(todayDeal.slice(0, 3).map((p) => p.root)));
    expect(dailyRow.sub).toMatch(/^Done · /);

    const clean = buildDetailVM(dailyRow, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(clean.big).toBe('Daily');
    expect(String(clean.lead)).toMatch(/Streak banked/);
    expect(clean.waitingMiss).toBe(false);
    expect(clean.primary.label).not.toMatch(/Remember /);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Daily / DONE', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
      dailyStreak: 4,
    });
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(dailyRow?.kind).toBe('mode');
    if (dailyRow?.kind !== 'mode') throw new Error('fixture: Daily missing');
    expect(dailyRow.badge).toBe('DONE');
    expect(dailyRow.best).toBe('🔥 4');
    expect(dailyRow.sub).toMatch(/^Done · /);

    const mid = buildDetailVM(dailyRow, {
      ...extraMiss,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyDone: false,
      learnedToday: false,
    });
    expect(mid.big).toBe('Daily');
    expect(mid.waitingMiss).toBe(false);
    expect(mid.primary.label).toBe('Continue Daily · 3 of 5 ›');
    expect(mid.primary.label).not.toMatch(/Remember /);

    const learnOpen = buildDetailVM(dailyRow, {
      ...extraMiss,
      learnedToday: false,
    });
    expect(learnOpen.big).toBe('Daily');
    expect(learnOpen.waitingMiss).toBe(false);
    expect(learnOpen.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnOpen.primary.label).not.toMatch(/Remember |Play again/);
    expect(String(learnOpen.lead)).toMatch(/Streak banked/);
  });

  it('wires Home tile — Remember Geo, not Daily / DONE / Done for today', () => {
    expect(detail).toContain("big: miss ? `Remember ${miss.name}` : 'Daily'");
    expect(detail).toContain('dailyDoneLead(extra.streak, { missWaiting: Boolean(miss) })');
    expect(daily).toContain('if (miss) return `Missed ${miss} · remember`');
    expect(menu).toContain('missName: opts.rushMissName');
    expect(menu).toContain('opts.dailyDone && !opts.rushMissName');
    expect(menu).toContain('opts.rushMissName');
    expect(panel).toContain("ww-big${vm.waitingMiss ? ' is-miss' : ''}");
    expect(css).toMatch(/\.ww-big\.is-miss/);
  });

  it('keeps Remember title readable on a phone — not hidden behind DONE', () => {
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

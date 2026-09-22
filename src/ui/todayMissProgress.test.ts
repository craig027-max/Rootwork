import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rushRecapFromRun, todayRushRecap } from '../core/rushRecap';
import {
  buildTodayProgress,
  keepGoingLabel,
  listRushMissRemember,
  pickRememberRoot,
  pickRushMissRemember,
  rememberMissCtaLabel,
  todayMissRecap,
} from './home/todayProgress';
import { learnNextAction } from './modes/modeHandoff';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const band = readFileSync(join(process.cwd(), 'src/ui/home/ProfileBand.tsx'), 'utf8');
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

const TODAY = '2026-09-16';
const first = firstRoot();
if (!first) throw new Error('fixture: expected Bio');
const starter = rootsInTier(1);
const geo = starter[1];
const photo = starter[2];
if (!geo || !photo) throw new Error('fixture: expected Geo / Photo');
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starter.map((r) => rootId(r)), rootId(firstBuilder)]);

function atDay(day: string, hour = 15): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d, hour).getTime();
}

const lastRun = rushRecapFromRun(
  [
    { id: rootId(photo), ok: true },
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
  ],
  { day: TODAY, studentId: 'kid-a' },
);
const twoMissRun = rushRecapFromRun(
  [
    { id: rootId(photo), ok: true },
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
    { id: rootId(firstBuilder), ok: false },
  ],
  { day: TODAY, studentId: 'kid-a' },
);
const owned = {
  [rootId(first)]: { completedAt: atDay('2026-09-01') },
  [rootId(geo)]: { completedAt: atDay('2026-09-02') },
  [rootId(photo)]: { completedAt: atDay('2026-09-03'), reviewedAt: atDay(TODAY, 11) },
  [rootId(firstBuilder)]: { completedAt: atDay('2026-09-10') },
};

describe('Today ✓ waits for Remember after a Rush miss — not Nice work over Geo', () => {
  it('lists remaining owned misses in play order — Geo then Chron, not stale Bio', () => {
    expect(todayRushRecap(lastRun, 'kid-a', TODAY)).toEqual(lastRun);
    expect(pickRememberRoot(owned, TODAY)).toBe(rootId(first));
    expect(listRushMissRemember(lastRun, owned, TODAY)).toEqual([rootId(geo)]);
    expect(pickRushMissRemember(twoMissRun, owned, TODAY)).toBe(rootId(geo));
    expect(listRushMissRemember(twoMissRun, owned, TODAY)).toEqual([
      rootId(geo),
      rootId(firstBuilder),
    ]);
    const geoRemembered = {
      ...owned,
      [rootId(geo)]: { completedAt: atDay('2026-09-02'), reviewedAt: atDay(TODAY, 12) },
    };
    expect(listRushMissRemember(twoMissRun, geoRemembered, TODAY)).toEqual([
      rootId(firstBuilder),
    ]);
    expect(rememberMissCtaLabel(geo.root)).toBe(`Remember ${geo.root} ›`);
    expect(todayMissRecap(geo.root)).toBe(`Remember ${geo.root} — missed in Rush`);
    expect(todayMissRecap(geo.root, firstBuilder.root)).toBe(
      `Remember ${geo.root} · then ${firstBuilder.root}`,
    );
  });

  it('holds Today ✓ and makes Remember Geo the fat tap after Daily + a learn', () => {
    const next = learnNextAction(startedBuilder, true);
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      learnedRoot: firstBuilder.root,
      learnedRootId: rootId(firstBuilder),
      rememberedToday: false,
      rememberRoot: geo.root,
      rememberMean: geo.mean,
      rememberRootId: rootId(geo),
      rememberMissed: true,
    });
    expect(vm.show).toBe(true);
    expect(vm.pathDone).toBe(false);
    expect(vm.missWaiting).toBe(true);
    expect(vm.heading).toBe('Today');
    expect(vm.recap).toBe(`Remember ${geo.root} — missed in Rush`);
    expect(vm.items.find((i) => i.key === 'remember')).toMatchObject({
      done: false,
      label: `Missed ${geo.root} · ${geo.mean}`,
      action: 'remember',
      rootId: rootId(geo),
      missed: true,
    });
    expect(vm.cta).toEqual({
      kind: 'remember',
      label: `Remember ${geo.root} ›`,
      rootId: rootId(geo),
    });
    expect(vm.cta?.label).not.toBe(keepGoingLabel(secondBuilder.root));
    expect(vm.cta?.label).not.toMatch(/Keep going|Play Root Rush|Play again/);
    expect(vm.missName).toBe(geo.root);
    expect(next.rootId).toBe(rootId(secondBuilder));
  });

  it('peeks the next miss on the row and recap — then Chron, not a one-chip lie', () => {
    const vm = buildTodayProgress({
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
      rememberAlso: firstBuilder.root,
    });
    expect(vm.items.find((i) => i.key === 'remember')?.label).toBe(
      `Missed ${geo.root} · ${geo.mean} · then ${firstBuilder.root}`,
    );
    expect(vm.recap).toBe(`Remember ${geo.root} · then ${firstBuilder.root}`);
    expect(vm.cta).toEqual({
      kind: 'remember',
      label: `Remember ${geo.root} ›`,
      rootId: rootId(geo),
    });
    expect(vm.pathDone).toBe(false);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as the hero', () => {
    const next = learnNextAction(startedBuilder, true);
    const midDaily = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      completed: startedBuilder,
      entitled: true,
      rememberRoot: geo.root,
      rememberMean: geo.mean,
      rememberRootId: rootId(geo),
      rememberMissed: true,
    });
    expect(midDaily.cta).toEqual({ kind: 'daily', label: 'Continue Daily · 3 of 5 ›' });
    expect(midDaily.pathDone).toBe(false);
    expect(midDaily.missWaiting).toBe(true);
    expect(midDaily.recap).toBeNull();
    expect(midDaily.missName).toBeUndefined();

    const learnOpen = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
      rememberRoot: geo.root,
      rememberMean: geo.mean,
      rememberRootId: rootId(geo),
      rememberMissed: true,
    });
    expect(learnOpen.cta).toEqual({
      kind: 'learn',
      label: next.label,
      rootId: next.rootId,
    });
    expect(learnOpen.pathDone).toBe(false);
    expect(learnOpen.recap).toBeNull();
    expect(learnOpen.missName).toBeUndefined();
  });

  it('hands a caught-up kid Remember Geo — not Today ✓ + Play Root Rush', () => {
    const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: allOpen,
      entitled: false,
      rememberRoot: geo.root,
      rememberMean: geo.mean,
      rememberRootId: rootId(geo),
      rememberMissed: true,
    });
    expect(vm.pathDone).toBe(false);
    expect(vm.missWaiting).toBe(true);
    expect(vm.heading).toBe('Today');
    expect(vm.recap).toBe(`Remember ${geo.root} — missed in Rush`);
    expect(vm.cta).toEqual({
      kind: 'remember',
      label: `Remember ${geo.root} ›`,
      rootId: rootId(geo),
    });
    expect(vm.cta?.label).not.toMatch(/Play Root Rush|Keep going/);
    expect(vm.missName).toBe(geo.root);
  });

  it('returns Today ✓ + Remembered Geo after the miss is reviewed', () => {
    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      learnedRoot: firstBuilder.root,
      learnedRootId: rootId(firstBuilder),
      rememberedToday: true,
      rememberRoot: geo.root,
      rememberMean: geo.mean,
      rememberRootId: rootId(geo),
      rememberMissed: false,
    });
    expect(vm.pathDone).toBe(true);
    expect(vm.missWaiting).toBe(false);
    expect(vm.heading).toBe('Today ✓');
    expect(vm.recap).toBe(`Daily and ${firstBuilder.root} are done`);
    expect(vm.items.find((i) => i.key === 'remember')).toMatchObject({
      done: true,
      label: `Remembered ${geo.root}`,
    });
    expect(vm.cta?.kind).toBe('learn');
    expect(vm.cta?.label).toBe(keepGoingLabel(secondBuilder.root));
  });

  it('wires Home list + miss recap/CTA — Remember Geo, not Keep going', () => {
    expect(home).toContain('listRushMissRemember');
    expect(home).toContain('rushMissIds[0]');
    expect(home).toContain('rushMissIds[1]');
    expect(home).toContain('rememberAlso');
    expect(home).toContain('rememberMissed: rushMissId != null');
    expect(home).toContain("entry: 'remember'");
    expect(band).toContain('today.missWaiting');
    expect(band).toContain('profileHeroForToday');
    expect(band).toContain('today.missName');
    expect(band).toContain('ww-today-recap');
    expect(band).toContain('ww-today-cta');
    expect(band).toContain("todayCta.kind === 'remember'");
    expect(band).toContain('is-miss');
  });

  it('keeps miss recap + Remember CTA readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-today-recap\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-today-cta\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-today-item\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    expect(phone).not.toMatch(/\.ww-today-recap\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-today-cta\.is-miss\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-today-recap\.is-miss/);
    expect(css).toMatch(/\.ww-today-cta\.is-miss/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

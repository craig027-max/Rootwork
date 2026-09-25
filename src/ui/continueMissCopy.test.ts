import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { resolveBootResume } from '../core/daily';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, isResumeTier } from './home/menu';
import { buildTodayProgress, keepGoingLabel } from './home/todayProgress';

const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const hydrate = readFileSync(join(process.cwd(), 'src/core/hydrate.ts'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/core/daily.ts'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
const tierMenu = readFileSync(join(process.cwd(), 'src/ui/home/TierMenu.tsx'), 'utf8');
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

describe('Continue after a miss is Remember — not Continue {learn} / Next · Auto over Geo', () => {
  it('makes Remember Geo the HERE tile — not Continue / Next · Auto / the % ring', () => {
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
    const here = items.find((it) => it.kind === 'tier' && it.t === 2);
    expect(here?.kind).toBe('tier');
    if (here?.kind !== 'tier') throw new Error('fixture: Builder missing');
    expect(isResumeTier(here)).toBe(true);
    expect(here.sub).toBe(`Missed ${geo.root} · remember`);
    expect(here.sub).not.toMatch(/Next ·|Continue |Keep going/);
    expect(here.resumeName).toBeUndefined();
    expect(here.missName).toBe(geo.root);

    const vm = buildDetailVM(here, extraMiss);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.big).not.toMatch(/Builder|Continue |Keep going/i);
    expect(String(vm.lead)).toBe('Keep going is just for fun.');
    expect(String(vm.lead)).not.toMatch(/next up|Continue |%|roots owned/i);
    expect(vm.ring).toBeUndefined();
    expect(vm.pmA).toBeUndefined();
    expect(vm.pmB).toBeUndefined();
    expect(vm.waiting).toBe(todayMissRecap(geo.root));
    expect(vm.waitingMiss).toBe(true);
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.secondary?.label).toBe(keepGoingLabel(secondBuilder.root));
    expect(vm.scene?.caption).toMatch(new RegExp(`^${geo.root}`));
    expect(vm.scene?.caption).not.toMatch(new RegExp(`^${secondBuilder.root}`));

    const two = buildDetailVM(here, {
      ...extraMiss,
      rememberAlso: photo.root,
    });
    expect(two.big).toBe(`Remember ${geo.root}`);
    expect(two.waiting).toBe(todayMissRecap(geo.root, photo.root));
    expect(two.ring).toBeUndefined();
  });

  it('keeps Continue {learn} / Next · Auto once the miss is Remembered', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const here = items.find((it) => it.kind === 'tier' && it.t === 2);
    expect(here?.kind).toBe('tier');
    if (here?.kind !== 'tier') throw new Error('fixture: Builder missing');
    expect(here.resumeName).toBe(secondBuilder.root);
    expect(here.missName).toBeUndefined();
    expect(here.sub).not.toMatch(/Missed /);

    const clean = buildDetailVM(here, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(clean.big).toBe('Builder');
    expect(clean.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(clean.primary.label).not.toMatch(/Remember /);
    expect(clean.waitingMiss).toBe(false);
    expect(clean.ring).toEqual({ pct: here.pct, label: `${here.pct}%` });
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Continue', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const here = items.find((it) => it.kind === 'tier' && it.t === 2);
    expect(here?.kind).toBe('tier');
    if (here?.kind !== 'tier') throw new Error('fixture: Builder missing');

    const mid = buildDetailVM(here, {
      ...extraMiss,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyDone: false,
      learnedToday: false,
    });
    expect(mid.big).toBe('Builder');
    expect(mid.waitingMiss).toBe(false);
    expect(mid.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(mid.primary.label).not.toMatch(/Remember /);

    const learnOpen = buildDetailVM(here, {
      ...extraMiss,
      learnedToday: false,
    });
    expect(learnOpen.big).toBe('Builder');
    expect(learnOpen.waitingMiss).toBe(false);
    expect(learnOpen.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnOpen.primary.label).not.toMatch(/Remember /);
  });

  it('boots into Remember Geo — not Continue {learn}', () => {
    expect(
      resolveBootResume({
        nextRootId: rootId(secondBuilder),
        rememberMissId: rootId(geo),
        dailyDone: true,
        learnedToday: true,
      }),
    ).toEqual({ kind: 'remember', rootId: rootId(geo) });
    expect(
      resolveBootResume({
        dailyResumeQi: 2,
        dailyTotal: 5,
        nextRootId: rootId(secondBuilder),
        rememberMissId: rootId(geo),
      }),
    ).toEqual({ kind: 'daily' });
    expect(
      resolveBootResume({
        nextRootId: rootId(secondBuilder),
        rememberMissId: rootId(geo),
        dailyDone: true,
        learnedToday: false,
      }),
    ).toEqual({ kind: 'learn', rootId: rootId(secondBuilder) });
  });

  it('wires Home tile + boot — Remember Geo, not Continue {learn} / Next · Auto', () => {
    expect(detail).toContain('missHero && miss ? `Remember ${miss.name}` : name');
    expect(detail).toContain("'Keep going is just for fun.'");
    expect(detail).toContain('keepGoingLabel(rootName)');
    expect(menu).toContain('resumeNow && missName ? `Missed ${missName} · remember`');
    expect(menu).toContain('resumeNow && !missName ? entryRootName');
    expect(tierMenu).toContain('!it.missName');
    expect(home).toContain('missHero && rushMissId && isResumeTier(item)');
    expect(home).toContain("openRoot(rushMissId, { entry: 'remember' })");
    expect(hydrate).toContain("boot.kind === 'remember'");
    expect(hydrate).toContain("entry: 'remember'");
    expect(hydrate).toContain('listOwnedRushMissIds');
    expect(daily).toContain("kind: 'remember'");
    expect(panel).toContain("ww-big${vm.waitingMiss ? ' is-miss' : ''}");
    expect(css).toMatch(/\.ww-big\.is-miss/);
  });

  it('keeps Remember title readable on a phone — not hidden behind Next · Auto', () => {
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

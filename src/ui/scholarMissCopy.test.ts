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
  isMissProgressTier,
  isResumeTier,
} from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
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
if (!firstBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);
const scholar = rootsInTier(3);
const firstScholar = scholar[0];
const master = rootsInTier(4);
const firstMaster = master[0];
const ai = rootsInTier(5);
const firstAi = ai[0];
if (!firstScholar || !firstMaster || !firstAi) {
  throw new Error('fixture: expected Scholar / Master / AI Level');
}

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

describe('Scholar after a miss is Remember — not Play Bene / Your progress over Geo', () => {
  it('makes Remember Geo the Scholar tile — not Play Bene / Your progress', () => {
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
    const row = items.find((it) => it.kind === 'tier' && it.t === 3);
    expect(row?.kind).toBe('tier');
    if (row?.kind !== 'tier') throw new Error('fixture: Scholar missing');
    expect(isResumeTier(row)).toBe(false);
    expect(isMissProgressTier(row)).toBe(true);
    expect(row.sub).toBe(`Missed ${geo.root} · remember`);
    expect(row.sub).not.toMatch(/Play |academic|Honors|progress/i);
    expect(row.missName).toBe(geo.root);
    expect(row.resumeName).toBeUndefined();
    expect(firstScholar.root).toBe('Bene');

    const vm = buildDetailVM(row, extraMiss);
    expect(vm.eyebrow).toBe('Remember');
    expect(vm.eyebrow).not.toMatch(/Scholar|Tier 3|Bene/i);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.big).not.toMatch(/Scholar|Bene/i);
    expect(String(vm.lead)).toBe(`Play ${firstScholar.root} is just for fun.`);
    expect(String(vm.lead)).not.toMatch(/next up|academic|roots owned|Your progress/i);
    expect(vm.ring).toBeUndefined();
    expect(vm.pmA).toBeUndefined();
    expect(vm.pmB).toBeUndefined();
    expect(vm.waiting).toBe(todayMissRecap(geo.root));
    expect(vm.waitingMiss).toBe(true);
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.secondary?.label).toBe(`Play ${firstScholar.root} ›`);
    expect(vm.secondary?.label).not.toMatch(/See all|Ask a grown-up/i);
    expect(vm.heroCta).toBe(true);
    expect(vm.scene?.caption).toMatch(new RegExp(`^${geo.root}`));
    expect(vm.scene?.caption).not.toMatch(/^Bene/);
    expect(vm.locked).toBeFalsy();

    const two = buildDetailVM(row, {
      ...extraMiss,
      rememberAlso: photo.root,
    });
    expect(two.big).toBe(`Remember ${geo.root}`);
    expect(two.waiting).toBe(todayMissRecap(geo.root, photo.root));
    expect(two.ring).toBeUndefined();
  });

  it('makes Master / AI Level Remember too — not Play Bel / Play Eu over Geo', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushMissName: geo.root,
    });
    const masterRow = items.find((it) => it.kind === 'tier' && it.t === 4);
    const aiRow = items.find((it) => it.kind === 'tier' && it.t === 5);
    expect(masterRow?.kind).toBe('tier');
    expect(aiRow?.kind).toBe('tier');
    if (masterRow?.kind !== 'tier' || aiRow?.kind !== 'tier') {
      throw new Error('fixture: Master / AI Level missing');
    }
    expect(isMissProgressTier(masterRow)).toBe(true);
    expect(isMissProgressTier(aiRow)).toBe(true);
    expect(masterRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(aiRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(firstMaster.root).toBe('Bel');
    expect(firstAi.root).toBe('Eu');

    const masterVm = buildDetailVM(masterRow, extraMiss);
    expect(masterVm.big).toBe(`Remember ${geo.root}`);
    expect(masterVm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(masterVm.secondary?.label).toBe(`Play ${firstMaster.root} ›`);
    expect(masterVm.scene?.caption).toMatch(new RegExp(`^${geo.root}`));

    const aiVm = buildDetailVM(aiRow, extraMiss);
    expect(aiVm.big).toBe(`Remember ${geo.root}`);
    expect(aiVm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(aiVm.secondary?.label).toBe(`Play ${firstAi.root} ›`);
  });

  it('makes locked Scholar Remember — not Ask a grown-up over Geo', () => {
    const { tucked } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      rushMissName: geo.root,
      nextPlay: false,
    });
    const locked = tucked.find((it) => it.t === 3);
    expect(locked?.kind).toBe('tier');
    if (locked?.kind !== 'tier') throw new Error('fixture: locked Scholar missing');
    expect(locked.locked).toBe(true);
    expect(isMissProgressTier(locked)).toBe(true);
    expect(locked.sub).toBe(`Missed ${geo.root} · remember`);
    expect(locked.missName).toBe(geo.root);

    const vm = buildDetailVM(locked, { ...extraMiss, entitled: false });
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.big).not.toMatch(/Scholar|Locked/i);
    expect(String(vm.lead)).toBe('Ask a grown-up is just for fun.');
    expect(vm.locked).toBeFalsy();
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.secondary?.label).toMatch(/Ask a grown-up/);
    expect(vm.waitingMiss).toBe(true);
    expect(vm.scene?.caption).toMatch(new RegExp(`^${geo.root}`));
    expect(homeSecondaryAction(locked, { rememberMissId: rootId(geo) })).toEqual({
      kind: 'upgrade',
    });
  });

  it('keeps Play Bene / Ask a grown-up once the miss is Remembered', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const row = items.find((it) => it.kind === 'tier' && it.t === 3);
    expect(row?.kind).toBe('tier');
    if (row?.kind !== 'tier') throw new Error('fixture: Scholar missing');
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
    expect(clean.big).toMatch(/Scholar/);
    expect(clean.primary.label).toBe(`Play ${firstScholar.root} ›`);
    expect(clean.primary.label).not.toMatch(/Remember Geo/);
    expect(clean.waitingMiss).toBe(false);
    expect(String(clean.lead)).toMatch(/Play to meet/);

    const { tucked } = buildMenu(startedBuilder, false, { currentTier: 2, nextPlay: false });
    const locked = tucked.find((it) => it.t === 3);
    expect(locked?.kind).toBe('tier');
    if (locked?.kind !== 'tier') throw new Error('fixture: locked Scholar missing');
    const lockedClean = buildDetailVM(locked, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: false,
      learnedToday: true,
    });
    expect(lockedClean.big).toMatch(/Scholar/);
    expect(lockedClean.locked).toBe(true);
    expect(lockedClean.primary.label).toMatch(/Ask a grown-up/);
    expect(lockedClean.waitingMiss).toBeFalsy();
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Scholar Play', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const row = items.find((it) => it.kind === 'tier' && it.t === 3);
    expect(row?.kind).toBe('tier');
    if (row?.kind !== 'tier') throw new Error('fixture: Scholar missing');

    const mid = buildDetailVM(row, {
      ...extraMiss,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyDone: false,
      learnedToday: false,
    });
    expect(mid.big).toMatch(/Scholar/);
    expect(mid.waitingMiss).toBe(false);
    expect(mid.primary.label).toBe(`Play ${firstScholar.root} ›`);
    expect(mid.primary.label).not.toMatch(/Remember Geo/);

    const learnOpen = buildDetailVM(row, {
      ...extraMiss,
      learnedToday: false,
    });
    expect(learnOpen.big).toMatch(/Scholar/);
    expect(learnOpen.waitingMiss).toBe(false);
    expect(learnOpen.primary.label).toBe(`Play ${firstScholar.root} ›`);
    expect(learnOpen.primary.label).not.toMatch(/Remember Geo/);
  });

  it('wires Home Progress — Remember Geo, not Play Bene / Your progress / a fake ✓', () => {
    expect(detail).toContain("Play ${rootName} is just for fun.");
    expect(detail).toContain("Play ${rootName} ›");
    expect(detail).toContain('Ask a grown-up is just for fun.');
    expect(detail).toContain("const missHero = Boolean(miss)");
    expect(menu).toContain('const missHere = Boolean(missName)');
    expect(menu).toContain('isMissProgressTier');
    expect(home).toContain('missHero && isMissProgressTier(selected)');
    expect(home).toContain('missHero && rushMissId && isMissProgressTier(item)');
    expect(home).toContain("openRoot(rushMissId, { entry: 'remember' })");
    expect(tierMenu).toContain('it.missName ? (');
    expect(tierMenu.indexOf('it.missName ? (')).toBeLessThan(tierMenu.indexOf('it.pct === 100 ? ('));
    expect(panel).toContain("ww-big${vm.waitingMiss ? ' is-miss' : ''}");
    expect(css).toMatch(/\.ww-big\.is-miss/);
  });

  it('keeps Remember title readable on a phone — not hidden behind Play Bene', () => {
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

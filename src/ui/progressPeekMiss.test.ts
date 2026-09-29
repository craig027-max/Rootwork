import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import { recapOpenForRoot } from '../core/deckFlow';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, isMissProgressTier } from './home/menu';
import {
  homeSampleAction,
  missPeekSamples,
  samplePeekLabel,
  samplePeekTap,
} from './home/samplePeek';
import {
  indexChipKind,
  indexChipLabel,
  indexChipMark,
  indexHeading,
  indexRootsMissFirst,
  indexSub,
} from './deck/indexChip';

const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const peek = readFileSync(join(process.cwd(), 'src/ui/home/samplePeek.ts'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const index = readFileSync(join(process.cwd(), 'src/ui/deck/RootIndex.tsx'), 'utf8');
const chip = readFileSync(join(process.cwd(), 'src/ui/deck/indexChip.ts'), 'utf8');
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

describe('Progress peek after a miss is Remember — not Play Bene / Remember Bio / a fake ✓ over Geo', () => {
  it('makes Scholar / Builder / Starter peek Missed Geo — not Play Bene / Remember Bio', () => {
    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });
    expect(firstScholar.root).toBe('Bene');
    expect(first.root).toBe('Bio');

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushMissName: geo.root,
    });
    const scholarRow = items.find((it) => it.kind === 'tier' && it.t === 3);
    const builderRow = items.find((it) => it.kind === 'tier' && it.t === 2);
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(scholarRow?.kind).toBe('tier');
    expect(builderRow?.kind).toBe('tier');
    expect(starterRow?.kind).toBe('tier');
    if (scholarRow?.kind !== 'tier' || builderRow?.kind !== 'tier' || starterRow?.kind !== 'tier') {
      throw new Error('fixture: progress rows missing');
    }
    expect(isMissProgressTier(scholarRow)).toBe(true);

    const scholarVm = buildDetailVM(scholarRow, extraMiss);
    expect(scholarVm.big).toBe(`Remember ${geo.root}`);
    expect(scholarVm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(scholarVm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(scholarVm.samples.map((s) => s.root)).not.toContain(firstScholar.root);
    expect(scholarVm.samples[0]?.ok).toBe(false);
    expect(scholarVm.samples[0]?.mean).toBe(geo.mean);
    expect(scholarVm.sampleTap).toBe('remember');
    expect(scholarVm.sampleLines).toBe(true);
    expect(scholarVm.samplesDone).toBe(false);
    expect(scholarVm.moreCount).toBe(0);
    expect(samplePeekLabel('remember', geo.root, { ok: false })).toBe(`Missed ${geo.root}`);
    expect(homeSampleAction(scholarRow, geo.root, { rememberMissName: geo.root })).toEqual({
      kind: 'root',
      name: geo.root,
    });
    expect(recapOpenForRoot(geo.root, startedBuilder)).toEqual({
      id: rootId(geo),
      entry: 'remember',
    });

    const builderVm = buildDetailVM(builderRow, extraMiss);
    expect(builderVm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(builderVm.samples.map((s) => s.root)).not.toContain(secondBuilder.root);
    expect(builderVm.sampleTap).toBe('remember');

    const starterVm = buildDetailVM(starterRow, extraMiss);
    expect(starterVm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(starterVm.samples.map((s) => s.root)).not.toContain(first.root);
    expect(starterVm.samples[0]?.ok).toBe(false);
    expect(starterVm.sampleTap).toBe('remember');
    expect(starterVm.waiting).toBe(todayMissRecap(geo.root));

    const two = buildDetailVM(scholarRow, {
      ...extraMiss,
      rememberAlso: photo.root,
    });
    expect(two.samples.map((s) => s.root)).toEqual([geo.root, photo.root]);
    expect(two.samples.every((s) => s.ok === false)).toBe(true);
    expect(missPeekSamples({ root: geo.root, mean: geo.mean, also: photo.root, alsoMean: photo.mean }).map(
      (s) => s.root,
    )).toEqual([geo.root, photo.root]);
  });

  it('makes Master / AI / locked Scholar peek Missed Geo — not Play Bel / Eu / Bene', () => {
    const { items, tucked } = buildMenu(startedBuilder, true, {
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
    expect(firstMaster.root).toBe('Bel');
    expect(firstAi.root).toBe('Eu');

    const masterVm = buildDetailVM(masterRow, extraMiss);
    expect(masterVm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(masterVm.samples.map((s) => s.root)).not.toContain(firstMaster.root);
    expect(masterVm.sampleTap).toBe('remember');

    const aiVm = buildDetailVM(aiRow, extraMiss);
    expect(aiVm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(aiVm.samples.map((s) => s.root)).not.toContain(firstAi.root);

    const lockedMenu = buildMenu(startedBuilder, false, {
      currentTier: 2,
      rushMissName: geo.root,
      nextPlay: false,
    });
    const locked = lockedMenu.tucked.find((it) => it.t === 3);
    expect(locked?.kind).toBe('tier');
    if (locked?.kind !== 'tier') throw new Error('fixture: locked Scholar missing');
    const lockedVm = buildDetailVM(locked, { ...extraMiss, entitled: false });
    expect(lockedVm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(lockedVm.samples.map((s) => s.root)).not.toContain(firstScholar.root);
    expect(lockedVm.sampleTap).toBe('remember');
    expect(samplePeekTap({ locked: true, missHero: true, sampleCount: 1 })).toBe('remember');
    expect(samplePeekTap({ locked: true, sampleCount: 4 })).toBeUndefined();
    expect(
      homeSampleAction(locked, geo.root, { rememberMissName: geo.root }),
    ).toEqual({ kind: 'root', name: geo.root });
    expect(homeSampleAction(locked, firstScholar.root, { rememberMissName: geo.root })).toBeNull();
    expect(tucked.length).toBeGreaterThanOrEqual(0);
  });

  it('keeps Play Bene / Remember Bio chips once the miss is Remembered', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const scholarRow = items.find((it) => it.kind === 'tier' && it.t === 3);
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(scholarRow?.kind).toBe('tier');
    expect(starterRow?.kind).toBe('tier');
    if (scholarRow?.kind !== 'tier' || starterRow?.kind !== 'tier') {
      throw new Error('fixture: clean progress rows missing');
    }

    const cleanScholar = buildDetailVM(scholarRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(cleanScholar.samples[0]?.root).toBe(firstScholar.root);
    expect(cleanScholar.sampleTap).toBe('play');
    expect(cleanScholar.primary.label).toBe(`Play ${firstScholar.root} ›`);
    expect(cleanScholar.waitingMiss).toBe(false);

    const cleanStarter = buildDetailVM(starterRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(cleanStarter.samples[0]?.root).toBe(first.root);
    expect(cleanStarter.samples.find((s) => s.root === geo.root)?.ok).toBe(true);
    expect(cleanStarter.sampleTap).toBe('remember');
    expect(cleanStarter.samplesDone).toBe(true);
  });

  it('makes Browse roots / All Roots Missed Geo — not a fake ✓ over the miss', () => {
    expect(indexChipKind({ missed: true, owned: true })).toBe('miss');
    expect(indexChipKind({ owned: true })).toBe('done');
    expect(indexChipKind({ locked: true })).toBe('lock');
    expect(indexChipLabel(geo.root, 'miss')).toBe(`Missed ${geo.root}`);
    expect(indexChipLabel(geo.root, 'done')).toBe(`Remember ${geo.root}`);
    expect(indexChipLabel(first.root, 'done')).toBe(`Remember ${first.root}`);
    expect(indexChipKind({ missed: true, owned: true })).not.toBe('done');
    expect(indexHeading([geo.root])).toBe('Remember');
    expect(indexSub([geo.root])).toBe(`Missed ${geo.root}`);
    expect(indexChipMark('miss')).toBe('!');
    expect(indexRootsMissFirst(starter, new Set([rootId(geo)]), rootId)[0]?.root).toBe(geo.root);
  });

  it('wires Home + Deck catalog — Missed Geo chips, not Play Bene / a fake ✓', () => {
    expect(detail).toContain('missPeekSamples');
    expect(detail).toContain('missHero: true');
    expect(detail).toContain('missHero');
    expect(peek).toContain('missPeekSamples');
    expect(peek).toContain('if (opts.missHero) return \'remember\'');
    expect(peek).toContain('if (item.locked && !missChip) return null');
    expect(home).toContain('rememberMissIds={missHero ? rushMissIds : undefined}');
    expect(home).toContain('rememberMissName: missHero ? remember.name : undefined');
    expect(deck).toContain('listOwnedRushMissIds');
    expect(deck).toContain('rememberMissIds={listOwnedRushMissIds');
    expect(index).toContain('indexChipKind');
    expect(index).toContain('indexHeading');
    expect(index).toContain('indexRootsMissFirst');
    expect(index).toContain('kind === \'miss\'');
    expect(index).toContain('is-miss');
    expect(chip).toContain('if (opts.missed) return \'miss\'');
    expect(chip).toContain('Missed ${name}');
    expect(chip).toContain("return cleanNames(missNames)[0] ? 'Remember' : 'All Roots'");
    expect(css).toMatch(/\.ww-ichip\.is-miss/);
    expect(css).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-miss/);
  });

  it('keeps Missed Geo readable on a phone — not hidden behind Play Bene / a fake ✓', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-miss\.is-tap\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-ichip\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-schip\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-ichip\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

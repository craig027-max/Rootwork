import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel } from '../core/rushRecap';
import { recapOpenForRoot } from '../core/deckFlow';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, isMissProgressTier } from './home/menu';
import {
  indexChipKind,
  indexChipLabel,
  indexChipMark,
  indexHeading,
  indexRootsMissFirst,
  indexSub,
} from './deck/indexChip';

const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
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
if (!firstBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);
const scholar = rootsInTier(3);
const firstScholar = scholar[0];
if (!firstScholar) throw new Error('fixture: expected Scholar');

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

describe('Browse after a miss is Remember — not All Roots / Bio ✓ over Geo', () => {
  it('makes Browse / All Roots Remember Geo — not 183 roots / Bio first', () => {
    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });
    expect(first.root).toBe('Bio');
    expect(starter[0]?.root).toBe('Bio');

    expect(indexHeading([geo.root])).toBe('Remember');
    expect(indexHeading([geo.root])).not.toMatch(/All Roots/);
    expect(indexSub([geo.root], { rootCount: ROOTS.length, tierCount: 5 })).toBe(
      `Missed ${geo.root}`,
    );
    expect(indexSub([geo.root, photo.root])).toBe(`Missed ${geo.root} · then ${photo.root}`);
    expect(indexSub([geo.root])).not.toMatch(/183 roots|5 tiers/);
    expect(indexHeading([])).toBe('All Roots');
    expect(indexSub([], { rootCount: ROOTS.length, tierCount: 5 })).toBe(
      `${ROOTS.length} roots · 5 tiers`,
    );

    const missed = new Set([rootId(geo)]);
    const lead = indexRootsMissFirst(starter, missed, rootId);
    expect(lead.map((r) => r.root)[0]).toBe(geo.root);
    expect(lead.map((r) => r.root)).not.toEqual(starter.map((r) => r.root));
    expect(lead.findIndex((r) => r.root === geo.root)).toBeLessThan(
      lead.findIndex((r) => r.root === first.root),
    );
    expect(indexRootsMissFirst(starter, new Set(), rootId).map((r) => r.root)).toEqual(
      starter.map((r) => r.root),
    );

    expect(indexChipKind({ missed: true, owned: true })).toBe('miss');
    expect(indexChipMark('miss')).toBe('!');
    expect(indexChipMark('done')).toBe('✓');
    expect(indexChipMark('open')).toBeNull();
    expect(indexChipLabel(geo.root, 'miss')).toBe(`Missed ${geo.root}`);
    expect(recapOpenForRoot(geo.root, startedBuilder)).toEqual({
      id: rootId(geo),
      entry: 'remember',
    });
  });

  it('makes Scholar / Starter eyebrow Remember — not Tier 3 · Scholar over Geo', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushMissName: geo.root,
    });
    const scholarRow = items.find((it) => it.kind === 'tier' && it.t === 3);
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(scholarRow?.kind).toBe('tier');
    expect(starterRow?.kind).toBe('tier');
    expect(rushRow?.kind).toBe('mode');
    if (scholarRow?.kind !== 'tier' || starterRow?.kind !== 'tier' || rushRow?.kind !== 'mode') {
      throw new Error('fixture: progress rows missing');
    }
    expect(isMissProgressTier(scholarRow)).toBe(true);
    expect(firstScholar.root).toBe('Bene');

    const scholarVm = buildDetailVM(scholarRow, extraMiss);
    expect(scholarVm.eyebrow).toBe('Remember');
    expect(scholarVm.eyebrow).not.toMatch(/Scholar|Tier 3|Bene/i);
    expect(scholarVm.big).toBe(`Remember ${geo.root}`);
    expect(scholarVm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(scholarVm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(scholarVm.samples[0]?.ok).toBe(false);

    const starterVm = buildDetailVM(starterRow, extraMiss);
    expect(starterVm.eyebrow).toBe('Remember');
    expect(starterVm.eyebrow).not.toMatch(/Starter|Tier 1|Bio/i);

    const rushVm = buildDetailVM(rushRow, extraMiss);
    expect(rushVm.eyebrow).toBe('Remember');
    expect(rushVm.eyebrow).not.toMatch(/Quiz Mode/i);

    const { tucked } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      rushMissName: geo.root,
      nextPlay: false,
    });
    const locked = tucked.find((it) => it.t === 3);
    expect(locked?.kind).toBe('tier');
    if (locked?.kind !== 'tier') throw new Error('fixture: locked Scholar missing');
    const lockedVm = buildDetailVM(locked, { ...extraMiss, entitled: false });
    expect(lockedVm.eyebrow).toBe('Remember');
    expect(lockedVm.eyebrow).not.toMatch(/Scholar|Locked/i);
  });

  it('keeps All Roots / Scholar / Bio ✓ once the miss is Remembered', () => {
    expect(indexHeading()).toBe('All Roots');
    expect(indexSub(undefined, { rootCount: ROOTS.length, tierCount: 5 })).toBe(
      `${ROOTS.length} roots · 5 tiers`,
    );
    expect(indexRootsMissFirst(starter, new Set(), rootId)[0]?.root).toBe(first.root);

    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const scholarRow = items.find((it) => it.kind === 'tier' && it.t === 3);
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(scholarRow?.kind).toBe('tier');
    expect(starterRow?.kind).toBe('tier');
    if (scholarRow?.kind !== 'tier' || starterRow?.kind !== 'tier') {
      throw new Error('fixture: clean progress rows missing');
    }

    const clean = {
      dailyRoots: [] as const,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    };
    const cleanScholar = buildDetailVM(scholarRow, clean);
    expect(cleanScholar.eyebrow).toMatch(/Scholar/);
    expect(cleanScholar.eyebrow).not.toBe('Remember');
    expect(cleanScholar.primary.label).toBe(`Play ${firstScholar.root} ›`);

    const cleanStarter = buildDetailVM(starterRow, clean);
    expect(cleanStarter.eyebrow).toMatch(/Starter/);
    expect(cleanStarter.samples.find((s) => s.root === geo.root)?.ok).toBe(true);
  });

  it('wires Browse + Scholar eyebrow — Remember, not All Roots / Bio ✓ / Scholar', () => {
    expect(detail).toContain("eyebrow: missHero ? 'Remember' : 'Quiz Mode'");
    expect(detail).toContain("eyebrow: miss ? 'Remember' : 'Daily Challenge'");
    expect(detail).toContain("eyebrow: 'Remember'");
    expect(detail).toContain("eyebrow: missHero ? 'Remember' : item.title");
    expect(panel).toContain('chipMiss ? (');
    expect(panel).toContain('ww-daily-mark is-miss');
    expect(peek).toContain('missPeekSamples');
    expect(home).toContain('rememberMissIds={missHero ? rushMissIds : undefined}');
    expect(deck).toContain('rememberMissIds={listOwnedRushMissIds');
    expect(index).toContain('indexHeading');
    expect(index).toContain('indexSub');
    expect(index).toContain('indexRootsMissFirst');
    expect(index).toContain('indexChipMark');
    expect(index).toContain('is-miss');
    expect(chip).toContain("return cleanNames(missNames)[0] ? 'Remember' : 'All Roots'");
    expect(chip).toContain('Missed ${names[0]}');
    expect(chip).toContain("if (kind === 'miss') return '!'");
    expect(css).toMatch(/\.ww-index-head\.is-miss h2/);
    expect(css).toMatch(/\.ww-daily-mark\.is-miss/);
  });

  it('keeps Remember / Missed Geo readable on a phone — not hidden behind All Roots / Bio ✓', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-index-head\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-index-head\.is-miss h2,\s*\n\s*\.ww-index-head\.is-miss \.sub\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-ichip\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-ichip \.ww-daily-mark\.is-miss\s*\{[^}]*display:\s*inline/);
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-index-head\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-ichip\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-daily-mark\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

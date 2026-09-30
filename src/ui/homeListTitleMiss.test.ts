import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel } from '../core/rushRecap';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import {
  buildMenu,
  isCompleteTier,
  isMissProgressTier,
  isResumeTier,
  listHeading,
  tierMenuTitle,
} from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
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

describe('Home list after a miss is Remember — not Tier 1 · Starter over Geo', () => {
  it('makes Starter / Builder / Scholar row titles Remember — not Tier 1 · Starter', () => {
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
    expect(today.missWaiting).toBe(true);
    expect(listHeading(false, { missWaiting: today.missWaiting })).toBe('Remember');

    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });

    expect(tierMenuTitle({ t: 1, name: 'Starter', missName: geo.root })).toBe('Remember');
    expect(tierMenuTitle({ t: 1, name: 'Starter', missName: geo.root })).not.toMatch(
      /Starter|Tier 1/,
    );
    expect(tierMenuTitle({ t: 2, name: 'Builder', missName: `  ${geo.root}  ` })).toBe('Remember');
    expect(tierMenuTitle({ t: 3, name: 'Scholar', missName: geo.root })).toBe('Remember');

    const { items, tucked } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushMissName: geo.root,
    });
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    const builderRow = items.find((it) => it.kind === 'tier' && it.t === 2);
    const scholarRow = items.find((it) => it.kind === 'tier' && it.t === 3);
    expect(starterRow?.kind).toBe('tier');
    expect(builderRow?.kind).toBe('tier');
    expect(scholarRow?.kind).toBe('tier');
    if (starterRow?.kind !== 'tier' || builderRow?.kind !== 'tier' || scholarRow?.kind !== 'tier') {
      throw new Error('fixture: Starter / Builder / Scholar missing');
    }
    expect(isCompleteTier(starterRow)).toBe(true);
    expect(isResumeTier(builderRow)).toBe(true);
    expect(isMissProgressTier(starterRow)).toBe(true);
    expect(isMissProgressTier(builderRow)).toBe(true);
    expect(isMissProgressTier(scholarRow)).toBe(true);
    expect(starterRow.title).toBe('Remember');
    expect(builderRow.title).toBe('Remember');
    expect(scholarRow.title).toBe('Remember');
    expect(starterRow.title).not.toMatch(/Starter|Tier 1/);
    expect(builderRow.title).not.toMatch(/Builder|Tier 2/);
    expect(scholarRow.title).not.toMatch(/Scholar|Tier 3/);
    expect(starterRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(builderRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(scholarRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(tucked).toEqual([]);

    const vm = buildDetailVM(starterRow, extraMiss);
    expect(vm.eyebrow).toBe('Remember');
    expect(vm.eyebrow).not.toMatch(/Starter|Tier 1/);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
  });

  it('makes locked Scholar Remember too — not Tier 3 · Scholar over Geo', () => {
    const { tucked } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      rushMissName: geo.root,
      nextPlay: false,
    });
    const locked = tucked.find((it) => it.t === 3);
    expect(locked?.kind).toBe('tier');
    if (locked?.kind !== 'tier') throw new Error('fixture: locked Scholar missing');
    expect(locked.locked).toBe(true);
    expect(locked.title).toBe('Remember');
    expect(locked.title).not.toMatch(/Scholar|Tier 3/);
    expect(locked.sub).toBe(`Missed ${geo.root} · remember`);
  });

  it('keeps Tier 1 · Starter once the miss is Remembered', () => {
    expect(tierMenuTitle({ t: 1, name: 'Starter' })).toBe('Tier 1 · Starter');
    expect(tierMenuTitle({ t: 2, name: 'Builder', missName: '   ' })).toBe('Tier 2 · Builder');

    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    const builderRow = items.find((it) => it.kind === 'tier' && it.t === 2);
    const scholarRow = items.find((it) => it.kind === 'tier' && it.t === 3);
    expect(starterRow?.kind).toBe('tier');
    expect(builderRow?.kind).toBe('tier');
    expect(scholarRow?.kind).toBe('tier');
    if (starterRow?.kind !== 'tier' || builderRow?.kind !== 'tier' || scholarRow?.kind !== 'tier') {
      throw new Error('fixture: Starter / Builder / Scholar missing');
    }
    expect(isMissProgressTier(starterRow)).toBe(false);
    expect(starterRow.title).toBe('Tier 1 · Starter');
    expect(builderRow.title).toBe('Tier 2 · Builder');
    expect(scholarRow.title).toBe('Tier 3 · Scholar');
    expect(starterRow.sub).not.toMatch(/Missed /);
    expect(listHeading(false, { missWaiting: false, pathDone: true })).toBe('Keep going');

    const clean = buildDetailVM(starterRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(clean.eyebrow).toBe('Tier 1 · Starter');
    expect(clean.big).toMatch(/Starter/);
    expect(clean.primary.label).toBe(`Remember ${first.root} ›`);
    expect(clean.primary.label).not.toMatch(/Remember Geo/);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Starter', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(starterRow?.kind).toBe('tier');
    if (starterRow?.kind !== 'tier') throw new Error('fixture: Starter missing');
    expect(starterRow.title).toBe('Tier 1 · Starter');

    const mid = buildDetailVM(starterRow, {
      ...extraMiss,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyDone: false,
      learnedToday: false,
    });
    expect(mid.eyebrow).toBe('Tier 1 · Starter');
    expect(mid.big).toMatch(/Starter/);
    expect(mid.waitingMiss).toBe(false);
    expect(mid.primary.label).not.toMatch(/Remember Geo/);
  });

  it('wires Home list titles — Remember, not Tier 1 · Starter / FREE over Geo', () => {
    expect(menu).toContain("return miss ? 'Remember' : `Tier ${opts.t} · ${opts.name}`");
    expect(menu).toContain('title: tierMenuTitle({ t, name: tier.n, missName })');
    expect(menu).toContain('missHere ? `Missed ${missName} · remember`');
    expect(tierMenu).toContain("it.missName ? ' is-miss' : ''");
    expect(tierMenu).not.toContain("it.kind === 'tier' && it.missName ? ' is-miss' : ''");
    expect(tierMenu).toContain('it.kind === \'tier\' && it.t === 1 && !it.missName');
    expect(tierMenu).not.toContain('it.kind === \'tier\' && it.t === 1 ? <span className="ww-tag">FREE</span>');
    expect(css).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.t/);
    expect(css).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.sub/);
  });

  it('keeps Remember / Missed Geo readable on a phone — not hidden behind Tier 1 · Starter', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-menu-row\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.t\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.sub\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-menu-row\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.t\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-menu-row\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.t\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.sub\s*\{[^}]*display:\s*block/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

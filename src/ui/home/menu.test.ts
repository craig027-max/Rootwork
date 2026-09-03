import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, isRootOpenable, rootId, rootsInTier, type RootId } from '../../data/roots';
import { dailySeed, dailyTilePreview, pickDailyRoots } from '../../core/daily';
import {
  buildMenu,
  defaultSelectedIndex,
  entryRootName,
  hasChosenMode,
  hasStartedPostStarter,
  isFirstVisit,
  isNextPlayHome,
  listHeading,
  nextPlayRoot,
  pickCurrentTier,
  rushBestLabel,
  tierPrimaryLabel,
  tuckedSummary,
} from './menu';

const NONE = new Set<string>();
const first = firstRoot();
if (!first) throw new Error('fixture: expected at least one root');
const firstId = rootId(first);
const starter = rootsInTier(1);
const second = starter[1];
if (!second) throw new Error('fixture: expected a second Starter root');
const starterDone = new Set<RootId>(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: expected a first Builder (Tier 2) root');
const startedBuilder = new Set<RootId>([...starterDone, rootId(firstBuilder)]);

function keysOf(items: { key: string }[]) {
  return items.map((it) => it.key);
}

function titlesOf(menu: { items: { title: string }[]; tucked: { title: string }[] }) {
  return [...menu.items, ...menu.tucked].map((it) => it.title);
}

describe('isFirstVisit', () => {
  it('is true only when no roots are owned', () => {
    expect(isFirstVisit(NONE)).toBe(true);
    expect(isFirstVisit(new Set<RootId>([firstId]))).toBe(false);
    expect(isFirstVisit(starterDone)).toBe(false);
  });
});

describe('isNextPlayHome', () => {
  it('stays true while the next Starter root is unlearned — not a count of one', () => {
    expect(isNextPlayHome(NONE)).toBe(true);
    expect(isNextPlayHome(new Set<RootId>([firstId]))).toBe(true);
    expect(isNextPlayHome(new Set<RootId>([firstId, rootId(second)]))).toBe(true);
  });

  it('stays true just after Starter — next Play is the first next-tier root', () => {
    expect(isNextPlayHome(starterDone)).toBe(true);
    expect(isNextPlayHome(starterDone, false)).toBe(true);
    expect(isNextPlayHome(starterDone, true)).toBe(true);
    expect(nextPlayRoot(starterDone, true)?.root).toBe(firstBuilder.root);
    expect(nextPlayRoot(starterDone, false)?.root).toBe(firstBuilder.root);
    expect(firstBuilder.root).toBe('Auto');
  });

  it('is false after they start the next tier or choose a mode', () => {
    expect(hasStartedPostStarter(starterDone)).toBe(false);
    expect(hasStartedPostStarter(startedBuilder)).toBe(true);
    expect(isNextPlayHome(startedBuilder, true)).toBe(false);
    expect(isNextPlayHome(starterDone, true, { choseMode: true })).toBe(false);
    expect(hasChosenMode({ runs: 1, lastDailyDay: null })).toBe(true);
    expect(hasChosenMode({ runs: 0, lastDailyDay: '2026-08-24' })).toBe(true);
    expect(hasChosenMode({ runs: 0, lastDailyDay: null })).toBe(false);
  });
});

describe('buildMenu — 0 learned (Play Bio)', () => {
  const { items, tucked } = buildMenu(NONE, false, { currentTier: 1 });

  it('shows only Tier 1 Starter — Root Rush, Daily, and locked tiers stay hidden', () => {
    expect(keysOf(items)).toEqual(['tier-1']);
    expect(items[0]).toMatchObject({ kind: 'tier', t: 1, locked: false, current: true });
    expect(keysOf(tucked)).toEqual([]);
  });

  it('does not expose Root Rush or locked-tier CTAs on a 0-learned home', () => {
    const titles = titlesOf({ items, tucked });
    expect(titles).toEqual(['Tier 1 · Starter']);
    expect(titles.join(' ')).not.toMatch(/Root Rush|Daily|Locked/);
    expect(tuckedSummary(tucked)).toBe('');
    expect(items.every((it) => it.kind !== 'tier' || !it.locked)).toBe(true);
  });

  it('defaults selection to Starter (index 0), not Root Rush', () => {
    expect(defaultSelectedIndex(items, 1)).toBe(0);
    expect(items[defaultSelectedIndex(items, 1)]).toMatchObject({ key: 'tier-1' });
  });

  it('still hides Rush and higher tiers when entitled — 0 learned means one tap', () => {
    const entitled = buildMenu(NONE, true, { currentTier: 1 });
    expect(keysOf(entitled.items)).toEqual(['tier-1']);
    expect(keysOf(entitled.tucked)).toEqual([]);
  });

  it('names the primary control Play Bio', () => {
    expect(entryRootName(1, NONE, false)).toBe('Bio');
    expect(tierPrimaryLabel({ nextPlay: true, complete: false, rootName: 'Bio' })).toBe(
      'Play Bio ›',
    );
  });
});

describe('buildMenu — 1 learned Bio (Play Geo)', () => {
  const owned = new Set<RootId>([firstId]);
  const { items, tucked } = buildMenu(owned, false, { currentTier: 1 });

  it('keeps one fat next Play — still Starter only, no Rush / Daily / locked CTAs', () => {
    expect(keysOf(items)).toEqual(['tier-1']);
    expect(keysOf(tucked)).toEqual([]);
    expect(tuckedSummary(tucked)).toBe('');
    const titles = titlesOf({ items, tucked });
    expect(titles).toEqual(['Tier 1 · Starter']);
    expect(titles.join(' ')).not.toMatch(/Root Rush|Daily|Locked/);
  });

  it('names the primary control Play Geo and opens that next Starter root', () => {
    expect(entryRootName(1, owned, false)).toBe(second.root);
    expect(second.root).toBe('Geo');
    expect(tierPrimaryLabel({ nextPlay: true, complete: false, rootName: second.root })).toBe(
      'Play Geo ›',
    );
  });

  it('defaults selection to Starter (index 0) — no modes in front', () => {
    expect(defaultSelectedIndex(items, 1)).toBe(0);
    expect(items[0]).toMatchObject({ key: 'tier-1', current: true, locked: false });
  });

  it('still hides Rush when entitled — next Starter root is what matters', () => {
    const entitled = buildMenu(owned, true, { currentTier: 1 });
    expect(keysOf(entitled.items)).toEqual(['tier-1']);
    expect(keysOf(entitled.tucked)).toEqual([]);
  });

  it('keeps #29 even if they somehow have mode stats mid-Starter', () => {
    expect(isNextPlayHome(owned, false, { choseMode: true })).toBe(true);
    const menu = buildMenu(owned, false, { currentTier: 1, choseMode: true });
    expect(keysOf(menu.items)).toEqual(['tier-1']);
    expect(keysOf(menu.tucked)).toEqual([]);
  });
});

describe('buildMenu — Starter just finished (Play Auto)', () => {
  const { items, tucked } = buildMenu(starterDone, false, { currentTier: 2 });

  it('keeps one fat next Play for the first next-tier root — no Rush / Daily / locked dump', () => {
    expect(keysOf(items)).toEqual(['tier-2']);
    expect(items[0]).toMatchObject({ kind: 'tier', t: 2, locked: false, current: true });
    expect(keysOf(tucked)).toEqual([]);
    expect(tuckedSummary(tucked)).toBe('');
    const titles = titlesOf({ items, tucked });
    expect(titles).toEqual(['Tier 2 · Builder']);
    expect(titles.join(' ')).not.toMatch(/Root Rush|Daily|Locked/);
  });

  it('names the primary control Play Auto and opens that first Builder root', () => {
    expect(entryRootName(2, starterDone, false)).toBe(firstBuilder.root);
    expect(entryRootName(2, starterDone, true)).toBe(firstBuilder.root);
    expect(tierPrimaryLabel({ nextPlay: true, complete: false, rootName: firstBuilder.root })).toBe(
      'Play Auto ›',
    );
  });

  it('defaults selection to Builder (index 0) — no modes in front', () => {
    expect(defaultSelectedIndex(items, 2)).toBe(0);
    expect(items[0]).toMatchObject({ key: 'tier-2', current: true, locked: false });
  });

  it('still hides Rush when entitled — Starter-done is not the dashboard yet', () => {
    const entitled = buildMenu(starterDone, true, { currentTier: 2 });
    expect(keysOf(entitled.items)).toEqual(['tier-2']);
    expect(keysOf(entitled.tucked)).toEqual([]);
    expect(titlesOf(entitled).join(' ')).not.toMatch(/Root Rush|Daily|Locked/);
  });
});

describe('buildMenu — started next tier (returning dashboard)', () => {
  const { items, tucked } = buildMenu(startedBuilder, false, { currentTier: 2 });

  it('reveals Root Rush and Daily after they start the next tier', () => {
    expect(keysOf(items)).toEqual(['rush', 'daily', 'tier-1']);
    expect(items.map((it) => it.title)).toContain('Root Rush');
    expect(items.map((it) => it.title)).toContain('Daily Challenge');
  });

  it('tucks locked paid tiers under More tiers once past first-run', () => {
    expect(keysOf(tucked)).toEqual(['tier-2', 'tier-3', 'tier-4', 'tier-5']);
    expect(tucked.every((t) => t.locked)).toBe(true);
    expect(tuckedSummary(tucked)).toBe('More tiers 🔒');
  });

  it('defaults selection to Builder once entitled and they have started it', () => {
    const entitled = buildMenu(startedBuilder, true, { currentTier: 2 });
    expect(defaultSelectedIndex(entitled.items, 2)).toBe(3);
    expect(entitled.items[3]).toMatchObject({ key: 'tier-2', current: true });
  });

  it('shows unlocked higher tiers in the main list once entitled', () => {
    const entitled = buildMenu(startedBuilder, true, { currentTier: 2 });
    expect(keysOf(entitled.items)).toEqual([
      'rush',
      'daily',
      'tier-1',
      'tier-2',
      'tier-3',
      'tier-4',
      'tier-5',
    ]);
    expect(entitled.tucked).toEqual([]);
  });

  it('attaches the real Rush best on the returning-dashboard row — not a Starter teaser', () => {
    const label = rushBestLabel({ runs: 1, bestPct: 80, bestStars: 4, bestScore: 2400 });
    expect(label).toBe('A · 4★ · 2,400');
    const { items } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      rushBest: label,
    });
    const rush = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rush?.kind).toBe('mode');
    if (rush?.kind !== 'mode') throw new Error('expected Rush mode row');
    expect(rush.best).toBe('A · 4★ · 2,400');
    expect(rush.preview).toBeUndefined();
    expect(rush.previewDone).toBeFalsy();
  });

  it('also reveals the dashboard if they chose a mode without starting Builder', () => {
    const chose = buildMenu(starterDone, false, { currentTier: 1, choseMode: true });
    expect(keysOf(chose.items)).toEqual(['rush', 'daily', 'tier-1']);
    expect(keysOf(chose.tucked)).toEqual(['tier-2', 'tier-3', 'tier-4', 'tier-5']);
  });

  it('attaches today\'s three Daily names + meanings on the Daily tile', () => {
    const deal = pickDailyRoots(
      ROOTS.filter((r) => isRootOpenable(rootId(r), false)),
      dailySeed('2026-09-01', 'kid-a'),
    );
    const preview = dailyTilePreview(deal);
    expect(preview).toHaveLength(3);
    const { items } = buildMenu(startedBuilder, false, {
      currentTier: 1,
      dailyPreview: preview,
    });
    const daily = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(daily?.kind).toBe('mode');
    if (daily?.kind !== 'mode') throw new Error('expected Daily mode row');
    expect(daily.preview).toEqual(preview);
    expect(daily.previewDone).toBe(false);
    expect(daily.preview?.map((p) => p.root)).toEqual(deal.slice(0, 3).map((r) => r.root));
    expect(daily.preview?.map((p) => p.mean)).toEqual(deal.slice(0, 3).map((r) => r.mean));
  });

  it('keeps the three-line recap and marks it done after Daily is banked', () => {
    const deal = pickDailyRoots(
      ROOTS.filter((r) => isRootOpenable(rootId(r), false)),
      dailySeed('2026-09-01', 'kid-a'),
    );
    const preview = dailyTilePreview(deal);
    const { items } = buildMenu(startedBuilder, false, {
      currentTier: 1,
      dailyPreview: preview,
      dailyDone: true,
    });
    const daily = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(daily?.kind).toBe('mode');
    if (daily?.kind !== 'mode') throw new Error('expected Daily mode row');
    expect(daily.badge).toBe('DONE');
    expect(daily.preview).toEqual(preview);
    expect(daily.previewDone).toBe(true);
    expect(daily.preview?.map((p) => p.root)).toEqual(deal.slice(0, 3).map((r) => r.root));
    expect(daily.preview?.map((p) => p.mean)).toEqual(deal.slice(0, 3).map((r) => r.mean));
  });
});

describe('pickCurrentTier / entry root', () => {
  it('starts a new learner on Tier 1 / Bio', () => {
    expect(pickCurrentTier(NONE, false)).toBe(1);
    expect(entryRootName(1, NONE, false)).toBe('Bio');
  });

  it('resumes the next unfinished free root after they own one', () => {
    const owned = new Set<RootId>([firstId]);
    expect(pickCurrentTier(owned, false)).toBe(1);
    expect(entryRootName(1, owned, false)).toBe(second.root);
  });

  it('points at Builder after Starter when the next root is openable', () => {
    expect(pickCurrentTier(starterDone, true)).toBe(2);
    expect(entryRootName(2, starterDone, true)).toBe(firstBuilder.root);
  });
});

describe('copy', () => {
  it('formats a Rush best as letter + stars, and combo only once it exists', () => {
    expect(rushBestLabel({ runs: 0, bestPct: 0, bestStars: 0, bestScore: 0 })).toBeUndefined();
    expect(rushBestLabel({ runs: 1, bestPct: 20, bestStars: 1 })).toBe('D · 1★');
    expect(rushBestLabel({ runs: 2, bestPct: 100, bestStars: 5, bestScore: 4500 })).toBe(
      'S · 5★ · 4,500',
    );
  });

  it('says start/play on the next-Play board and jump back in on the dashboard', () => {
    expect(listHeading(true)).toBe('Start playing');
    expect(listHeading(false)).toBe('Jump back in');
  });

  it('names the next root on the primary button — Play, not Continue, while Starter is open', () => {
    expect(tierPrimaryLabel({ nextPlay: true, complete: false, rootName: 'Bio' })).toBe(
      'Play Bio ›',
    );
    expect(tierPrimaryLabel({ nextPlay: true, complete: false, rootName: 'Geo' })).toBe(
      'Play Geo ›',
    );
    expect(tierPrimaryLabel({ nextPlay: false, complete: false, rootName: 'Auto' })).toBe(
      'Continue Auto ›',
    );
    expect(tierPrimaryLabel({ nextPlay: false, complete: true, rootName: 'Bio' })).toBe(
      'Replay tier ›',
    );
  });
});

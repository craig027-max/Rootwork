import { describe, expect, it } from 'vitest';
import { firstRoot, rootId, rootsInTier, type RootId } from '../../data/roots';
import {
  buildMenu,
  defaultSelectedIndex,
  entryRootName,
  isFirstVisit,
  isNextPlayHome,
  listHeading,
  pickCurrentTier,
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

  it('is false only after every Starter root is owned', () => {
    expect(isNextPlayHome(starterDone)).toBe(false);
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
});

describe('buildMenu — after Starter (returning dashboard)', () => {
  const { items, tucked } = buildMenu(starterDone, false, { currentTier: 1 });

  it('reveals Root Rush and Daily once every Starter root is owned', () => {
    expect(keysOf(items)).toEqual(['rush', 'daily', 'tier-1']);
    expect(items.map((it) => it.title)).toContain('Root Rush');
    expect(items.map((it) => it.title)).toContain('Daily Challenge');
  });

  it('tucks locked paid tiers under More tiers after Starter', () => {
    expect(keysOf(tucked)).toEqual(['tier-2', 'tier-3', 'tier-4', 'tier-5']);
    expect(tucked.every((t) => t.locked)).toBe(true);
    expect(tuckedSummary(tucked)).toBe('More tiers 🔒');
  });

  it('defaults selection to the current tier, not Rush', () => {
    expect(defaultSelectedIndex(items, 1)).toBe(2);
    expect(items[2]).toMatchObject({ key: 'tier-1', current: true });
  });

  it('shows unlocked higher tiers in the main list once entitled', () => {
    const entitled = buildMenu(starterDone, true, { currentTier: 2 });
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
});

describe('copy', () => {
  it('says start/play on the next-Play board and jump back in after Starter', () => {
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

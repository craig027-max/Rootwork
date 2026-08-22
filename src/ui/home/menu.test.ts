import { describe, expect, it } from 'vitest';
import { firstRoot, rootId, rootsInTier, type RootId } from '../../data/roots';
import {
  buildMenu,
  defaultSelectedIndex,
  entryRootName,
  isFirstVisit,
  listHeading,
  pickCurrentTier,
  tierPrimaryLabel,
  tuckedSummary,
} from './menu';

const NONE = new Set<string>();
const first = firstRoot();
if (!first) throw new Error('fixture: expected at least one root');
const firstId = rootId(first);
const second = rootsInTier(1)[1];
if (!second) throw new Error('fixture: expected a second free root');

function keysOf(items: { key: string }[]) {
  return items.map((it) => it.key);
}

describe('isFirstVisit', () => {
  it('is true only when no roots are owned', () => {
    expect(isFirstVisit(NONE)).toBe(true);
    expect(isFirstVisit(new Set<RootId>([firstId]))).toBe(false);
  });
});

describe('buildMenu — first visit', () => {
  const { items, tucked } = buildMenu(NONE, false, { currentTier: 1, firstVisit: true });

  it('shows only Tier 1 Starter — Root Rush, Daily, and locked tiers stay hidden', () => {
    expect(keysOf(items)).toEqual(['tier-1']);
    expect(items[0]).toMatchObject({ kind: 'tier', t: 1, locked: false, current: true });
    expect(keysOf(tucked)).toEqual([]);
  });

  it('does not expose Root Rush or locked-tier CTAs on a 0-learned home', () => {
    const titles = [...items, ...tucked].map((it) => it.title);
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
    const entitled = buildMenu(NONE, true, { currentTier: 1, firstVisit: true });
    expect(keysOf(entitled.items)).toEqual(['tier-1']);
    expect(keysOf(entitled.tucked)).toEqual([]);
  });

  it('names the primary control Play Bio', () => {
    expect(entryRootName(1, NONE, false)).toBe('Bio');
    expect(tierPrimaryLabel({ firstVisit: true, complete: false, rootName: 'Bio' })).toBe(
      'Play Bio ›',
    );
  });
});

describe('buildMenu — returning visit', () => {
  const owned = new Set<RootId>([firstId]);
  const { items, tucked } = buildMenu(owned, false, { currentTier: 1, firstVisit: false });

  it('reveals Root Rush and Daily, then the unlocked resume tier', () => {
    expect(keysOf(items)).toEqual(['rush', 'daily', 'tier-1']);
    expect(items.map((it) => it.title)).toContain('Root Rush');
  });

  it('tucks locked paid tiers under More tiers once they have learned something', () => {
    expect(keysOf(tucked)).toEqual(['tier-2', 'tier-3', 'tier-4', 'tier-5']);
    expect(tucked.every((t) => t.locked)).toBe(true);
    expect(tuckedSummary(tucked)).toBe('More tiers 🔒');
  });

  it('defaults selection to the current tier, not Rush', () => {
    expect(defaultSelectedIndex(items, 1)).toBe(2);
    expect(items[2]).toMatchObject({ key: 'tier-1', current: true });
  });

  it('shows unlocked higher tiers in the main list once entitled', () => {
    const entitled = buildMenu(owned, true, { currentTier: 1, firstVisit: false });
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
  it('says start/play on first visit and jump back in once they own a root', () => {
    expect(listHeading(true)).toBe('Start playing');
    expect(listHeading(false)).toBe('Jump back in');
  });

  it('names the first root on the primary button — never Continue on first visit', () => {
    expect(tierPrimaryLabel({ firstVisit: true, complete: false, rootName: 'Bio' })).toBe(
      'Play Bio ›',
    );
    expect(tierPrimaryLabel({ firstVisit: false, complete: false, rootName: 'Geo' })).toBe(
      'Continue Geo ›',
    );
    expect(tierPrimaryLabel({ firstVisit: false, complete: true, rootName: 'Bio' })).toBe(
      'Replay tier ›',
    );
  });
});

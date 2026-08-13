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
const secondId = rootId(second);

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

  it('leads with Tier 1 Starter, then Rush and Daily — not a quiz', () => {
    expect(keysOf(items)).toEqual(['tier-1', 'rush', 'daily']);
    expect(items[0]).toMatchObject({ kind: 'tier', t: 1, locked: false, current: true });
  });

  it('tucks tiers 2–5 so locked rows do not dominate', () => {
    expect(keysOf(tucked)).toEqual(['tier-2', 'tier-3', 'tier-4', 'tier-5']);
    expect(tucked.every((t) => t.locked)).toBe(true);
    expect(tuckedSummary(tucked)).toBe('More tiers 🔒');
  });

  it('still locks paid tiers when not entitled (gating unchanged)', () => {
    expect(tucked.every((t) => t.t !== 1 && t.locked)).toBe(true);
    expect(items.filter((it) => it.kind === 'tier').every((it) => !it.locked)).toBe(true);
  });

  it('defaults selection to Starter (index 0), not Root Rush', () => {
    expect(defaultSelectedIndex(items, 1)).toBe(0);
    expect(items[defaultSelectedIndex(items, 1)]).toMatchObject({ key: 'tier-1' });
  });

  it('tucks higher tiers even when entitled so five rows do not bury Play', () => {
    const entitled = buildMenu(NONE, true, { currentTier: 1, firstVisit: true });
    expect(keysOf(entitled.items)).toEqual(['tier-1', 'rush', 'daily']);
    expect(keysOf(entitled.tucked)).toEqual(['tier-2', 'tier-3', 'tier-4', 'tier-5']);
    expect(entitled.tucked.every((t) => !t.locked)).toBe(true);
    expect(tuckedSummary(entitled.tucked)).toBe('More tiers');
  });
});

describe('buildMenu — returning visit', () => {
  const owned = new Set<RootId>([firstId]);
  const { items, tucked } = buildMenu(owned, false, { currentTier: 1, firstVisit: false });

  it('keeps Rush and Daily, then the unlocked resume tier', () => {
    expect(keysOf(items)).toEqual(['rush', 'daily', 'tier-1']);
  });

  it('tucks locked paid tiers and leaves gating in place', () => {
    expect(keysOf(tucked)).toEqual(['tier-2', 'tier-3', 'tier-4', 'tier-5']);
    expect(tucked.every((t) => t.locked)).toBe(true);
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

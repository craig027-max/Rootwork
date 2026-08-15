import { describe, expect, it } from 'vitest';
import { ROOTS, neighborOpenable, rootId, rootsInTier } from '../data/roots';
import { afterCorrectRecall, allDoneLine, starterDoneLine, successLine } from './deckFlow';

const bio = ROOTS.find((r) => r.root === 'Bio');
const geo = ROOTS.find((r) => r.root === 'Geo');
if (!bio || !geo) throw new Error('fixture: expected Bio then Geo in starter');

const bioId = rootId(bio);
const geoId = rootId(geo);
const lastFree = rootsInTier(1).at(-1);
if (!lastFree) throw new Error('fixture: expected a last starter root');
const lastFreeId = rootId(lastFree);
const lastAll = ROOTS.at(-1);
if (!lastAll) throw new Error('fixture: expected a last curriculum root');
const lastAllId = rootId(lastAll);
const firstPaid = ROOTS.find((r) => r.t === 2);
if (!firstPaid) throw new Error('fixture: expected a paid root after starter');

describe('afterCorrectRecall', () => {
  it('advances Bio → Geo with the same neighborOpenable(+1) Next uses', () => {
    expect(neighborOpenable(bioId, 1, false)).toBe(geoId);
    expect(neighborOpenable(geoId, -1, false)).toBe(bioId);
    expect(afterCorrectRecall(bioId, false)).toEqual({
      kind: 'next',
      id: geoId,
      line: 'Yes — Bio means life.',
    });
  });

  it('skips locked paid roots for a free learner (same as Next)', () => {
    expect(neighborOpenable(lastFreeId, 1, false)).toBeNull();
    expect(afterCorrectRecall(lastFreeId, false)).toEqual({
      kind: 'home',
      line: starterDoneLine(),
    });
  });

  it('entitled learner on the last starter still goes to the next openable root', () => {
    const next = neighborOpenable(lastFreeId, 1, true);
    expect(next).toBe(rootId(firstPaid));
    expect(afterCorrectRecall(lastFreeId, true)).toEqual({
      kind: 'next',
      id: next,
      line: successLine(lastFree),
    });
  });

  it('goes home when there is no next openable root', () => {
    expect(neighborOpenable(lastAllId, 1, true)).toBeNull();
    expect(afterCorrectRecall(lastAllId, true)).toEqual({
      kind: 'home',
      line: allDoneLine(),
    });
  });

  it('success line is one kid-safe sentence', () => {
    expect(successLine(bio)).toBe('Yes — Bio means life.');
    expect(successLine(bio).toLowerCase()).not.toMatch(/wrong|fail|shame|stupid|nope|loser/);
    expect(starterDoneLine().toLowerCase()).toContain('starter done');
  });
});

import { describe, expect, it } from 'vitest';
import { ROOTS, neighborOpenable, rootId, rootsInTier } from '../data/roots';
import {
  afterCorrectRecall,
  allDoneLine,
  allowManualStep,
  commitCorrectAdvance,
  deckEntryForOpen,
  entryAfterSuccess,
  lessonAfterCorrect,
  showExampleWords,
  starterDoneLine,
  successLine,
  winLineOnCard,
} from './deckFlow';

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

describe('Craig path: correct Bio → Geo, recall not nulled into examples', () => {
  it('shows one Yes line, then opens Geo in recall — never the examples screen', () => {
    const path = lessonAfterCorrect(bioId, false);
    expect(path.dest).toEqual({
      kind: 'next',
      id: geoId,
      line: 'Yes — Bio means life.',
    });
    expect(path.duringYes.winLine).toBe('Yes — Bio means life.');
    expect(path.duringYes.showExamples).toBe(false);
    expect(path.afterBeat).toEqual({
      action: 'open',
      currentRootId: geoId,
      entry: 'recall',
      showExamples: false,
    });
    expect(commitCorrectAdvance(path.dest)).toEqual({
      kind: 'open',
      id: geoId,
      entry: 'recall',
    });
    expect(entryAfterSuccess(path.dest)).toBe('recall');
  });

  it('the live #18 reset (null recall + teach entry) is the examples screen Craig saw', () => {
    expect(
      showExampleWords({
        recall: null,
        currentRootId: geoId,
        entry: 'teach',
        correctAdvance: null,
      }),
    ).toBe(true);
    expect(
      showExampleWords({
        recall: null,
        currentRootId: bioId,
        entry: 'teach',
        correctAdvance: null,
      }),
    ).toBe(true);
    expect(deckEntryForOpen()).toBe('teach');
    expect(deckEntryForOpen({ entry: 'recall' })).toBe('recall');
  });

  it('a remount mid-Yes does not null recall into examples', () => {
    const dest = afterCorrectRecall(bioId, false);
    const remounted = {
      recall: null,
      currentRootId: bioId,
      entry: 'teach' as const,
      correctAdvance: { fromId: bioId, dest },
    };
    expect(showExampleWords(remounted)).toBe(false);
    expect(winLineOnCard(remounted)).toBe('Yes — Bio means life.');
    expect(allowManualStep(remounted.correctAdvance)).toBe(false);
    expect(allowManualStep(null)).toBe(true);
  });

  it('wrong answers never produce an advance dest — they stay on this card', () => {
    expect(allowManualStep(null)).toBe(true);
    expect(
      showExampleWords({
        recall: { win: null, rootId: bioId },
        currentRootId: bioId,
        entry: 'teach',
        correctAdvance: null,
      }),
    ).toBe(false);
  });

  it('last starter still goes home after the Yes line — no examples flash', () => {
    const path = lessonAfterCorrect(lastFreeId, false);
    expect(path.dest.kind).toBe('home');
    expect(path.duringYes.showExamples).toBe(false);
    expect(path.afterBeat.action).toBe('home');
    expect(commitCorrectAdvance(path.dest)).toEqual({ kind: 'home' });
  });
});

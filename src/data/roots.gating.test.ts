import { describe, it, expect } from 'vitest';
import {
  isRootFree,
  rootLockReason,
  isRootAccessible,
  resumeRootId,
  orderedRoots,
  firstRoot,
  prevRoot,
  rootId,
  type RootId,
} from './roots';

// Drive everything off the real root graph, not hardcoded ids, so the suite
// keeps locking the gate even as roots are added/renumbered.
const ordered = orderedRoots();
const first = firstRoot();
if (!first) throw new Error('fixture: expected at least one root');

const freeRoots = ordered.filter((r) => r.t === 1);
const paidRoots = ordered.filter((r) => r.t !== 1);

const firstId = rootId(first);

// The first paid root — its prior root is the last free (Tier 1) root, which lets
// us exercise the entitlement-vs-completion precedence on a single id.
const firstPaid = paidRoots[0];
if (!firstPaid) throw new Error('fixture: expected at least one paid root (Tier 2+)');
const firstPaidId = rootId(firstPaid);
const priorToFirstPaid = prevRoot(firstPaidId);
if (!priorToFirstPaid) throw new Error('fixture: first paid root should have a prior root');

// A free root that is NOT the first, so it can be completion-locked.
const secondFree = freeRoots[1];
if (!secondFree) throw new Error('fixture: expected a second free root in Tier 1');
const secondFreeId = rootId(secondFree);

const NONE = new Set<RootId>();
const priorDone = new Set<RootId>([rootId(priorToFirstPaid)]);

describe('isRootFree', () => {
  it('is true for every root in Tier 1 (the free sample)', () => {
    for (const r of freeRoots) expect(isRootFree(rootId(r)), r.root).toBe(true);
  });

  it('is false for every root in Tiers 2+', () => {
    for (const r of paidRoots) expect(isRootFree(rootId(r)), r.root).toBe(false);
  });

  it('is false for an unknown root id', () => {
    expect(isRootFree('does-not-exist')).toBe(false);
  });
});

describe('rootLockReason precedence (entitlement before completion)', () => {
  // The regression guard: a brand-new learner (no progress) hitting a paid root
  // must see 'entitlement', NOT 'completion' — otherwise the paywall is invisible
  // until they grind through the free tier.
  it("paid + not entitled + prior incomplete → 'entitlement' (NOT 'completion')", () => {
    expect(rootLockReason(firstPaidId, NONE, false)).toBe('entitlement');
    expect(rootLockReason(firstPaidId, NONE, false)).not.toBe('completion');
  });

  it("paid + entitled + prior incomplete → 'completion'", () => {
    expect(rootLockReason(firstPaidId, NONE, true)).toBe('completion');
  });

  it('paid + entitled + prior complete → null (open)', () => {
    expect(rootLockReason(firstPaidId, priorDone, true)).toBeNull();
  });

  it('the first (free) root is always open, regardless of entitlement', () => {
    expect(rootLockReason(firstId, NONE, false)).toBeNull();
    expect(rootLockReason(firstId, NONE, true)).toBeNull();
  });

  it("a free, non-first root with prior incomplete → 'completion'", () => {
    expect(rootLockReason(secondFreeId, NONE, false)).toBe('completion');
    expect(rootLockReason(secondFreeId, NONE, true)).toBe('completion');
  });
});

describe('isRootAccessible mirrors rootLockReason === null', () => {
  const cases: Array<{ id: RootId; completed: Set<RootId>; entitled: boolean }> = [
    { id: firstPaidId, completed: NONE, entitled: false },
    { id: firstPaidId, completed: NONE, entitled: true },
    { id: firstPaidId, completed: priorDone, entitled: true },
    { id: firstId, completed: NONE, entitled: false },
    { id: firstId, completed: NONE, entitled: true },
    { id: secondFreeId, completed: NONE, entitled: false },
  ];

  for (const c of cases) {
    it(`${c.id} (entitled=${c.entitled}, priorDone=${c.completed.size > 0})`, () => {
      const reason = rootLockReason(c.id, c.completed, c.entitled);
      expect(isRootAccessible(c.id, c.completed, c.entitled)).toBe(reason === null);
    });
  }
});

describe('resumeRootId (boot-time resume target)', () => {
  const freeAllDone = new Set<RootId>(freeRoots.map((r) => rootId(r)));
  const allDone = new Set<RootId>(ordered.map((r) => rootId(r)));

  it('returns null for a first-time visitor (no progress) → stays on home', () => {
    expect(resumeRootId(NONE, false)).toBeNull();
    expect(resumeRootId(NONE, true)).toBeNull();
  });

  it('resumes into the next incomplete (free) root once started', () => {
    expect(resumeRootId(new Set<RootId>([firstId]), false)).toBe(secondFreeId);
  });

  it('does NOT resume into a paywalled next root when not entitled → null (home shows Unlock)', () => {
    expect(resumeRootId(freeAllDone, false)).toBeNull();
  });

  it('resumes into the first paid root once the free tier is done AND entitled', () => {
    expect(resumeRootId(freeAllDone, true)).toBe(firstPaidId);
  });

  it('returns null when the whole curriculum is complete → nothing to resume', () => {
    expect(resumeRootId(allDone, true)).toBeNull();
    expect(resumeRootId(allDone, false)).toBeNull();
  });
});

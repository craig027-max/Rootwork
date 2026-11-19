import { describe, it, expect } from 'vitest';
import {
  FREE_TRIAL_ROOTS,
  isRootFree,
  isRootOpenable,
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

const freeRoots = ordered.filter((r) => isRootFree(rootId(r)));
const paidRoots = ordered.filter((r) => !isRootFree(rootId(r)));

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
  it('is exactly the starter trial, including Bio, Geo, Photo, and Sal', () => {
    expect(freeRoots.map((r) => r.root)).toEqual([...FREE_TRIAL_ROOTS]);
    expect(freeRoots).toHaveLength(26);
    for (const name of ['Bio', 'Geo', 'Photo', 'Sal']) {
      expect(isRootFree(name.toLowerCase()), name).toBe(true);
    }
  });

  it('is false for every other root, including the rest of Tier 1', () => {
    for (const r of paidRoots) expect(isRootFree(rootId(r)), r.root).toBe(false);
    expect(paidRoots.some((r) => r.t === 1)).toBe(true);
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

  it('skips a locked Tier 1 root when unlocking the next free one', () => {
    const tri = rootId(ordered.find((r) => r.root === 'Tri')!);
    const trans = rootId(ordered.find((r) => r.root === 'Trans')!);
    expect(isRootFree('multi')).toBe(false);
    expect(rootLockReason(trans, new Set([tri]), false)).toBeNull();
  });

  it('keeps a completed root playable after it leaves the free set', () => {
    expect(isRootFree('multi')).toBe(false);
    expect(isRootOpenable('multi', false)).toBe(false);
    expect(isRootOpenable('multi', false, new Set(['multi']))).toBe(true);
    expect(rootLockReason('multi', new Set(['multi']), false)).toBeNull();
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

  it('resumes into the first unlearned root once the trial is done AND entitled', () => {
    const next = ordered.find((r) => !freeAllDone.has(rootId(r)));
    expect(next).toBeTruthy();
    expect(resumeRootId(freeAllDone, true)).toBe(rootId(next!));
  });

  it('returns null when the whole curriculum is complete → nothing to resume', () => {
    expect(resumeRootId(allDone, true)).toBeNull();
    expect(resumeRootId(allDone, false)).toBeNull();
  });
});

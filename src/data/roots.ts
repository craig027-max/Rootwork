/**
 * Root curriculum + gating for Wondral Words.
 *
 * The raw content (152 roots / 5 tiers / palettes) lives in `roots.data.ts`,
 * ported from the design package. This module adds the ids, lookups, and the
 * pure gating functions — the free/paid line and linear unlock — mirroring the
 * sibling chemistry app's `data/lessons.ts` so the spine stays liftable. The
 * tests in `roots.gating.test.ts` lock these so they can't silently regress.
 */
import { ROOTS, TIERS, PALETTES, type Root, type Palette, type Tier, type TierNum } from './roots.data';

export { ROOTS, TIERS, PALETTES };
export type { Root, Palette, Tier, TierNum };

export type RootId = string;
export type TierId = string;

/** Stable id for a root (e.g. "Bio" → "bio"). */
export function rootId(root: Root): RootId {
  return root.root.toLowerCase();
}

/** Tier id for a tier number (e.g. 1 → "tier-1"). Used as the progress module_id. */
export function tierId(t: TierNum): TierId {
  return `tier-${t}`;
}

/** Roots in curriculum order (easy → hard). The source array is already ordered. */
export function orderedRoots(): Root[] {
  return ROOTS;
}

export const ROOTS_BY_ID: Record<RootId, Root> = Object.fromEntries(
  ROOTS.map((r) => [rootId(r), r]),
);

/** The first root in the curriculum, or null if there are none. */
export function firstRoot(): Root | null {
  return ROOTS[0] ?? null;
}

/** The root immediately before `id` in curriculum order, or null. */
export function prevRoot(id: RootId): Root | null {
  const i = ROOTS.findIndex((r) => rootId(r) === id);
  if (i <= 0) return null;
  return ROOTS[i - 1] ?? null;
}

/** Which tier (module) id a root belongs to — used when upserting progress rows. */
export function moduleIdOfRoot(id: RootId): TierId {
  const root = ROOTS_BY_ID[id];
  return root ? tierId(root.t) : 'tier-1';
}

/**
 * Linear unlock: a root is unlocked if it's the first, OR the previous root in
 * the ordered sequence is completed.
 */
export function isRootUnlocked(id: RootId, completed: Set<RootId>): boolean {
  const i = ROOTS.findIndex((r) => rootId(r) === id);
  if (i <= 0) return true;
  const prev = ROOTS[i - 1];
  return prev ? completed.has(rootId(prev)) : true;
}

/**
 * The free try-before-buy sample: every root in Tier 1 (Starter). Everything
 * after requires an active entitlement. This is the free/paid line — config, not
 * structure. To move the paywall, change what this returns.
 */
export function isRootFree(id: RootId): boolean {
  const root = ROOTS_BY_ID[id];
  if (!root) return false;
  return root.t === 1;
}

/** Why a root can't be opened: it needs the prior root, or needs a purchase. */
export type LockReason = 'completion' | 'entitlement';

/**
 * The lock reason for a root, or null if it's open. Purchase is checked BEFORE
 * sequencing so paid content reads as 💳 ("buy to unlock") right away — otherwise
 * a brand-new learner with zero progress sees every paid root as merely
 * completion-locked and never learns it's the paid part of the course.
 */
export function rootLockReason(
  id: RootId,
  completed: Set<RootId>,
  entitled: boolean,
): LockReason | null {
  if (!entitled && !isRootFree(id)) return 'entitlement';
  if (!isRootUnlocked(id, completed)) return 'completion';
  return null;
}

/** Combined access gate: true iff the root has no lock reason. */
export function isRootAccessible(
  id: RootId,
  completed: Set<RootId>,
  entitled: boolean,
): boolean {
  return rootLockReason(id, completed, entitled) === null;
}

/**
 * Whether a learner may OPEN a root to study it — the navigation gate, which is
 * deliberately looser than `isRootAccessible`: roots are browsable flashcards, so
 * within an unlocked tier you can jump to any card. Only the paywall gates here
 * (free roots and entitled users can open anything). The stricter
 * `isRootAccessible` (which also enforces linear completion) still drives
 * boot-time resume, so "Continue" lands on the next unfinished root.
 */
export function isRootOpenable(id: RootId, entitled: boolean): boolean {
  return isRootFree(id) || entitled;
}

/**
 * Which root a returning learner should resume into on boot, or null to stay on
 * home. Fires only for someone who has already started (≥1 root complete), and
 * only when the next incomplete root is actually accessible — a locked next root
 * returns null so the learner lands on home and sees the Unlock/Continue CTA.
 */
export function resumeRootId(completed: Set<RootId>, entitled: boolean): RootId | null {
  if (!ROOTS.some((r) => completed.has(rootId(r)))) return null;
  const next = ROOTS.find((r) => !completed.has(rootId(r)));
  if (!next) return null;
  const id = rootId(next);
  return isRootAccessible(id, completed, entitled) ? id : null;
}

/** Roots belonging to a given tier number. */
export function rootsInTier(t: TierNum): Root[] {
  return ROOTS.filter((r) => r.t === t);
}

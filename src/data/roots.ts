/**
 * Root curriculum + gating for Wondral Words.
 *
 * The raw content (roots / 5 tiers / palettes) lives in `roots.data.ts`,
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
 * The free starter set is the trial. About two dozen teachable roots, not all
 * of Tier 1. Order is catalog order. Bio, Geo, Photo, and Sal stay in it.
 */
export const FREE_TRIAL_ROOTS = [
  'Bio',
  'Geo',
  'Photo',
  'Aqua',
  'Tele',
  'Therm',
  'Graph',
  'Scope',
  'Phon',
  'Port',
  'Dict',
  'Struct',
  'Uni',
  'Bi',
  'Tri',
  'Trans',
  'Sub',
  'Ped',
  'Pre',
  'Re',
  'Anim',
  'Dec',
  'Flor',
  'Avi',
  'Digit',
  'Sal',
] as const;

export const FREE_TRIAL_IDS: ReadonlySet<RootId> = new Set(
  FREE_TRIAL_ROOTS.map((name) => name.toLowerCase()),
);

/** Roots a profile already owns. Completed progress is that record. */
export type OwnedRoots = ReadonlySet<string>;

/**
 * Linear unlock along the roots this learner can open. An entitled learner
 * walks the catalog. A free learner walks the trial plus anything they already
 * own, so a locked root in between does not block the next free one.
 */
export function isRootUnlocked(
  id: RootId,
  completed: Set<RootId>,
  entitled: boolean = true,
  owned?: OwnedRoots,
): boolean {
  const prev = previousOpenable(id, entitled, owned ?? completed);
  if (!prev) return true;
  return completed.has(rootId(prev));
}

function previousOpenable(id: RootId, entitled: boolean, owned: OwnedRoots): Root | null {
  const i = ROOTS.findIndex((r) => rootId(r) === id);
  if (i <= 0) return null;
  for (let j = i - 1; j >= 0; j--) {
    const prev = ROOTS[j];
    if (prev && isRootOpenable(rootId(prev), entitled, owned)) return prev;
  }
  return null;
}

/** True only for the free starter set. The rest of Tier 1 is paid. */
export function isRootFree(id: RootId): boolean {
  return FREE_TRIAL_IDS.has(id);
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
  owned?: OwnedRoots,
): LockReason | null {
  if (completed.has(id)) return null;
  if (!isRootOpenable(id, entitled, owned ?? completed)) return 'entitlement';
  if (!isRootUnlocked(id, completed, entitled, owned ?? completed)) return 'completion';
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
export function isRootOpenable(id: RootId, entitled: boolean, owned?: OwnedRoots): boolean {
  if (entitled || isRootFree(id)) return true;
  return owned?.has(id) ?? false;
}

/**
 * Nearest openable root in a direction (+1 next, -1 prev), skipping locked
 * ones. Shared by the deck Next/Prev buttons and the post-Yes next tap
 * so they can never drift apart.
 */
export function neighborOpenable(
  fromId: RootId,
  dir: 1 | -1,
  entitled: boolean,
  owned?: OwnedRoots,
): RootId | null {
  const i = ROOTS.findIndex((r) => rootId(r) === fromId);
  if (i < 0) return null;
  for (let j = i + dir; j >= 0 && j < ROOTS.length; j += dir) {
    const root = ROOTS[j];
    if (!root) continue;
    const id = rootId(root);
    if (isRootOpenable(id, entitled, owned)) return id;
  }
  return null;
}

/**
 * Which root a returning learner should resume into on boot, or null to stay on
 * home. Fires only for someone who has already started (≥1 root complete), and
 * only when the next incomplete root is actually accessible — a locked next root
 * returns null so the learner lands on home and sees the Unlock/Continue CTA.
 */
export function resumeRootId(
  completed: Set<RootId>,
  entitled: boolean,
  owned?: OwnedRoots,
): RootId | null {
  if (!ROOTS.some((r) => completed.has(rootId(r)))) return null;
  const kept = owned ?? completed;
  const next = ROOTS.find(
    (r) => !completed.has(rootId(r)) && isRootOpenable(rootId(r), entitled, kept),
  );
  if (!next) return null;
  const id = rootId(next);
  return rootLockReason(id, completed, entitled, kept) === null ? id : null;
}

/** Roots belonging to a given tier number. */
export function rootsInTier(t: TierNum): Root[] {
  return ROOTS.filter((r) => r.t === t);
}

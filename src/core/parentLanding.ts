/**
 * Where a parent lands once their roster is known — the pure routing decision,
 * unit-tested so it can't silently regress (the same discipline we put on the
 * payments gate). The impure wrapper lives in `src/core/hydrate.ts`.
 *
 * `activeStudentId` is the choice persisted in localStorage, which can be STALE:
 * a since-removed student leaves a "ghost" id that's no longer in the roster.
 *
 *   - 'keep'      — the active id is a real roster member; don't disturb the session.
 *   - 'select'    — no valid active id, exactly one child → auto-select it.
 *   - 'dashboard' — no valid active id, zero or many children → pick on the dashboard.
 *
 * `clearGhost` is set on the 'dashboard' branch when a non-null active id was a
 * ghost, telling the caller to clear it (drops the stale chip + ghost-keyed
 * progress). The 'select' branch replaces the active id outright, so it carries
 * no flag.
 */
export type ParentLanding =
  | { action: 'keep' }
  | { action: 'select'; studentId: string }
  | { action: 'dashboard'; clearGhost: boolean };

export function resolveParentLanding(
  activeStudentId: string | null,
  studentIds: string[],
): ParentLanding {
  const isGhost = activeStudentId !== null && !studentIds.includes(activeStudentId);
  const hasValidActive = activeStudentId !== null && !isGhost;
  if (hasValidActive) return { action: 'keep' };

  if (studentIds.length === 1) {
    const only = studentIds[0];
    if (only) return { action: 'select', studentId: only };
  }
  return { action: 'dashboard', clearGhost: isGhost };
}

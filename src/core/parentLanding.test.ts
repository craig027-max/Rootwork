import { describe, it, expect } from 'vitest';
import { resolveParentLanding } from './parentLanding';

const A = 'student_a';
const B = 'student_b';
const GHOST = 'student_removed';

describe('resolveParentLanding', () => {
  it('keeps a valid active student (sole child)', () => {
    expect(resolveParentLanding(A, [A])).toEqual({ action: 'keep' });
  });

  it('keeps a valid active student among several', () => {
    expect(resolveParentLanding(B, [A, B])).toEqual({ action: 'keep' });
  });

  it('auto-selects the lone child when none is active', () => {
    expect(resolveParentLanding(null, [A])).toEqual({ action: 'select', studentId: A });
  });

  it('routes to the dashboard when no child is active and there are several', () => {
    expect(resolveParentLanding(null, [A, B])).toEqual({
      action: 'dashboard',
      clearGhost: false,
    });
  });

  it('routes to the dashboard (add-student) when there are no children', () => {
    expect(resolveParentLanding(null, [])).toEqual({ action: 'dashboard', clearGhost: false });
  });

  // --- The ghost-id regression (a removed student left active in localStorage) ---

  it('does NOT keep a ghost active id (the bug this fix closes)', () => {
    expect(resolveParentLanding(GHOST, [A, B]).action).not.toBe('keep');
  });

  it('replaces a ghost active id by auto-selecting the lone real child', () => {
    expect(resolveParentLanding(GHOST, [A])).toEqual({ action: 'select', studentId: A });
  });

  it('clears the ghost and routes to the dashboard when several children remain', () => {
    expect(resolveParentLanding(GHOST, [A, B])).toEqual({
      action: 'dashboard',
      clearGhost: true,
    });
  });

  it('clears the ghost and routes to the dashboard when the roster is now empty', () => {
    expect(resolveParentLanding(GHOST, [])).toEqual({ action: 'dashboard', clearGhost: true });
  });
});

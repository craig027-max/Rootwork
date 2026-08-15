/**
 * Deck first-lesson flow: after a correct recall, pick the next card the
 * same way the Next button does (`neighborOpenable(+1)`), or send them home
 * with a small "Starter done" line when the openable set is finished.
 *
 * Pure — Deck.tsx owns the timer and the store writes.
 */

import { ROOTS_BY_ID, neighborOpenable, type Root, type RootId } from '../data/roots';

/** Quiet pause so a kid can read the one-line win before the next card. */
export const SUCCESS_BEAT_MS = 900;

export type AfterCorrectRecall =
  | { kind: 'next'; id: RootId; line: string }
  | { kind: 'home'; line: string };

/** One kid-safe sentence. No fanfare, no scolding. */
export function successLine(root: Root): string {
  return `Yes — ${root.root} means ${root.mean}.`;
}

export function starterDoneLine(): string {
  return 'Starter done. Nice work.';
}

export function allDoneLine(): string {
  return 'You learned every root. Nice work.';
}

/**
 * Where to go after a correct "I know this" tap, and the one line to show
 * during the success beat. Wrong answers never call this — they stay on
 * teach + try again.
 */
export function afterCorrectRecall(fromId: RootId, entitled: boolean): AfterCorrectRecall {
  const next = neighborOpenable(fromId, 1, entitled);
  const root = ROOTS_BY_ID[fromId];
  if (next) {
    return { kind: 'next', id: next, line: root ? successLine(root) : 'Yes — you got it.' };
  }
  return { kind: 'home', line: entitled ? allDoneLine() : starterDoneLine() };
}

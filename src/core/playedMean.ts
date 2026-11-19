/**
 * Meanings a kid may see before they open the lesson.
 *
 * Played means the profile owns the root. `completeRoot` writes that
 * after a correct recall on the card — the question is answered and the
 * Yes line is up. Opening the card, a Browse find, and a Daily or Root
 * Rush tap do not own it. Hydrate merges the same completed rows, so a
 * profile that already owns roots still shows those meanings.
 */
import { ROOTS, rootId, type Root } from '../data/roots';

const BY_NAME = new Map(ROOTS.map((root) => [root.root.toLowerCase(), root]));

export function catalogRootNamed(name: string): Root | undefined {
  return BY_NAME.get(name.replace(/\s+/g, ' ').trim().toLowerCase());
}

export function lessonPlayed(id: string | undefined, completed: ReadonlySet<string>): boolean {
  return Boolean(id && completed.has(id));
}

/** List-chip meaning. Empty until that root's lesson is owned. */
export function shownLineMean(
  rootName: string,
  mean: string,
  completed: ReadonlySet<string>,
): string {
  const root = catalogRootNamed(rootName);
  if (!lessonPlayed(root ? rootId(root) : undefined, completed)) return '';
  return mean.replace(/\s+/g, ' ').trim();
}

export function withHeldMean<T extends { root: string; mean: string }>(
  lines: readonly T[],
  completed: ReadonlySet<string>,
): T[] {
  return lines.map((line) => {
    const mean = shownLineMean(line.root, line.mean, completed);
    return mean === line.mean ? line : { ...line, mean };
  });
}

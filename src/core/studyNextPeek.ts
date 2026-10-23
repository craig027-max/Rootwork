/**
 * Study Yes hold — name the question Next will open.
 *
 * The button still says Next →. The line under Yes names that beat:
 * Photograph, -graph, or the pieces. A meaning or which-word beat stays
 * on the root. The answer tile stays off the line. Remember, Find, and
 * the last root go Home or Done — no peek, and no coin-flip on Next.
 */
import type { AfterCorrectRecall } from './deckFlow';
import { dailyHoldNextLine } from './daily';
import { dailyNextPeekFace } from './dailyNextPeek';
import { buildRecall, type RecallBeat } from './recall';
import { ROOTS_BY_ID, type Root } from '../data/roots';

export interface QueuedStudyRecall {
  rootId: string;
  beat: RecallBeat;
}

/** Face line for one already-dealt beat. The answer tile stays off it. */
export function studyNextPeekLine(
  root: { root: string; mean: string },
  beat: {
    kind?: string | null;
    word?: string | null;
    part?: string | null;
    split?: string | null;
  },
): string {
  const face = dailyNextPeekFace(root, beat);
  return dailyHoldNextLine(face.name, face.mean);
}

/** Long school words wrap instead of clipping on a phone. */
export function studyNextPeekLong(line: string): boolean {
  return line.length >= 26;
}

/**
 * Keep the beat Next already named. A Home / Done dest clears it.
 * A second call for the same root returns the same object — Next must
 * not roll a new coin-flip after the line is on screen.
 */
export function buildQueuedStudyNext(
  dest: AfterCorrectRecall,
  held: QueuedStudyRecall | null,
  pool: readonly Root[],
  rng?: () => number,
): QueuedStudyRecall | null {
  if (dest.kind !== 'next') return null;
  if (held?.rootId === dest.id) return held;
  const nextRoot = ROOTS_BY_ID[dest.id];
  if (!nextRoot) return null;
  return {
    rootId: dest.id,
    beat: buildRecall({ root: nextRoot, pool, choices: 3, rng }),
  };
}

/** Beat to open when Next lands on this root. Null means deal fresh. */
export function studyRecallToOpen(
  queued: QueuedStudyRecall | null,
  rootId: string,
): RecallBeat | null {
  if (!queued || queued.rootId !== rootId) return null;
  return queued.beat;
}

/**
 * Line under Yes. Empty unless the queued beat is the root Next opens.
 * Remember / Find / Done pass a home dest and stay empty.
 */
export function studyHoldPeekLine(
  dest: AfterCorrectRecall,
  queued: QueuedStudyRecall | null,
  root: { root: string; mean: string } | undefined,
): string {
  if (dest.kind !== 'next' || !queued || queued.rootId !== dest.id || !root) return '';
  return studyNextPeekLine(root, queued.beat);
}

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

/**
 * When a baked Yes clip is present, hold the beat long enough for Jenny to
 * finish ("Yes — Bio means life") then go to Geo. Trimmed Bio is ~1.9s;
 * 2.2s leaves a breath without feeling stuck.
 */
export const SUCCESS_BEAT_WITH_CLIP_MS = 2200;

/** Hold a little longer when Jenny is speaking the Yes line; else the 900ms read. */
export function successBeatMs(hasYesClip: boolean): number {
  return hasYesClip ? SUCCESS_BEAT_WITH_CLIP_MS : SUCCESS_BEAT_MS;
}

export type AfterCorrectRecall =
  | { kind: 'next'; id: RootId; line: string }
  | { kind: 'home'; line: string };

/**
 * How a card opens. `teach` is Play / Next / index (examples + I know this).
 * `recall` is the post-Yes auto-advance — skip examples, stay in the quiz loop.
 */
export type DeckEntry = 'teach' | 'recall';

/** In-flight Yes beat. Lives in the store so a remount cannot wipe it into examples. */
export interface CorrectAdvance {
  fromId: RootId;
  dest: AfterCorrectRecall;
}

export interface RecallOnCard {
  win: string | null;
  rootId?: RootId;
}

export interface LessonView {
  recall: RecallOnCard | null;
  currentRootId: RootId | null;
  entry: DeckEntry;
  correctAdvance: CorrectAdvance | null;
}

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

/** Play / Next / index omit `entry` and land on examples. Correct recall must not. */
export function deckEntryForOpen(opts?: { entry?: DeckEntry }): DeckEntry {
  return opts?.entry ?? 'teach';
}

/** After the Yes line, the next card opens in recall — never teach/examples. */
export function entryAfterSuccess(dest: AfterCorrectRecall): DeckEntry {
  return dest.kind === 'next' ? 'recall' : 'teach';
}

/**
 * What the success-beat timer must do. `open` always carries `entry: 'recall'`
 * so `openRoot(id)` (the Next-button default) cannot sneak examples back in.
 */
export function commitCorrectAdvance(
  dest: AfterCorrectRecall,
): { kind: 'open'; id: RootId; entry: 'recall' } | { kind: 'home' } {
  if (dest.kind === 'next') return { kind: 'open', id: dest.id, entry: 'recall' };
  return { kind: 'home' };
}

function recallBelongsToCard(recall: RecallOnCard, currentRootId: RootId | null): boolean {
  if (!recall.rootId) return true;
  return recall.rootId === currentRootId;
}

/** Yes line for this card — from local recall or a store-persisted beat (remount). */
export function winLineOnCard(view: LessonView): string | null {
  const { recall, currentRootId, correctAdvance } = view;
  if (recall?.win && recallBelongsToCard(recall, currentRootId)) return recall.win;
  if (correctAdvance && correctAdvance.fromId === currentRootId) return correctAdvance.dest.line;
  return null;
}

/**
 * Studying hides example chips. Must stay true through the Yes beat and onto
 * the next root's recall — the live #18 bug was `setRecall(null)` on
 * `currentRootId` change, which is `entry: 'teach'` + no recall = examples.
 */
export function isLessonStudying(view: LessonView): boolean {
  const { recall, currentRootId, entry, correctAdvance } = view;
  if (recall !== null && recallBelongsToCard(recall, currentRootId)) return true;
  if (correctAdvance && correctAdvance.fromId === currentRootId) return true;
  return entry === 'recall';
}

export function showExampleWords(view: LessonView): boolean {
  return !isLessonStudying(view);
}

/** Next/prev during the Yes beat would cancel auto-advance and open teach. Ignore them. */
export function allowManualStep(correctAdvance: CorrectAdvance | null): boolean {
  return correctAdvance === null;
}

export interface LessonAfterCorrect {
  dest: AfterCorrectRecall;
  duringYes: { showExamples: boolean; winLine: string };
  afterBeat:
    | { action: 'open'; currentRootId: RootId; entry: 'recall'; showExamples: boolean }
    | { action: 'home'; currentRootId: null; entry: 'teach'; showExamples: boolean };
}

/**
 * Craig's path as a pure function: correct Bio → one Yes line → Geo in recall.
 * Examples never come back. A remount mid-Yes still shows the line, not chips.
 */
export function lessonAfterCorrect(fromId: RootId, entitled: boolean): LessonAfterCorrect {
  const dest = afterCorrectRecall(fromId, entitled);
  const duringYesView: LessonView = {
    recall: { win: dest.line, rootId: fromId },
    currentRootId: fromId,
    entry: 'teach',
    correctAdvance: { fromId, dest },
  };
  const duringYes = {
    showExamples: showExampleWords(duringYesView),
    winLine: winLineOnCard(duringYesView) ?? dest.line,
  };
  if (dest.kind === 'next') {
    const after: LessonView = {
      recall: null,
      currentRootId: dest.id,
      entry: entryAfterSuccess(dest),
      correctAdvance: null,
    };
    return {
      dest,
      duringYes,
      afterBeat: {
        action: 'open',
        currentRootId: dest.id,
        entry: 'recall',
        showExamples: showExampleWords(after),
      },
    };
  }
  return {
    dest,
    duringYes,
    afterBeat: { action: 'home', currentRootId: null, entry: 'teach', showExamples: false },
  };
}

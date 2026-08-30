/**
 * Deck first-lesson flow: after a correct recall, pick the next card the
 * same way the Next button does (`neighborOpenable(+1)`), or send them home
 * with a small "Starter done" line when the openable set is finished.
 *
 * Pure — Deck.tsx owns the timer and the store writes.
 */

import { ROOTS_BY_ID, neighborOpenable, type Root, type RootId } from '../data/roots';
import type { HearBeatChip } from './hearBeats';

/** Quiet pause so a kid can read the one-line win before the next card. */
export const SUCCESS_BEAT_MS = 900;

/**
 * Fallback when a Yes clip is listed but the element has no duration yet
 * (Safari before `loadedmetadata`). Trimmed Bio Yes is ~1.9s; 2.2s was
 * enough before Hear grew 0.6s beats. Prefer the live remaining time.
 */
export const SUCCESS_BEAT_WITH_CLIP_MS = 2200;

/** Safety cap so a missing `ended` on Phone Safari cannot hang the lesson. */
export const ADVANCE_ENDED_FALLBACK_MS = 10_000;

/**
 * How long to hold the Yes beat. When we know the playing clip length
 * (Hear leftover or a long 3-beat Yes), use that so Geo cannot slam over it.
 */
export function successBeatMs(
  hasYesClip: boolean,
  clipDurationMs?: number | null,
): number {
  if (clipDurationMs != null && Number.isFinite(clipDurationMs) && clipDurationMs > 0) {
    return Math.max(SUCCESS_BEAT_MS, Math.round(clipDurationMs));
  }
  return hasYesClip ? SUCCESS_BEAT_WITH_CLIP_MS : SUCCESS_BEAT_MS;
}

export type AdvanceGate = {
  /** ms since the correct tap (or remount re-arm). */
  elapsedMs: number;
  hasYesClip: boolean;
  playing: boolean;
  remainingMs: number | null;
  /** Current element has ended (or there was nothing to wait for). */
  playbackEnded: boolean;
};

export type AdvanceDecision =
  | { action: 'fire' }
  | { action: 'wait'; ms: number }
  | { action: 'wait-ended' };

/**
 * Bio correct → do not open Geo while Bio's Hear/Yes is still playing.
 * After the clip ends, keep the 900ms read beat if it has not elapsed.
 */
export function decideCorrectAdvance(gate: AdvanceGate): AdvanceDecision {
  const minLeft = Math.max(0, SUCCESS_BEAT_MS - gate.elapsedMs);

  if (gate.playing) {
    if (gate.remainingMs != null && gate.remainingMs > 0) {
      return { action: 'wait', ms: Math.max(minLeft, gate.remainingMs) };
    }
    return minLeft > 0 ? { action: 'wait', ms: minLeft } : { action: 'wait-ended' };
  }

  if (!gate.playbackEnded && gate.hasYesClip) {
    const fallbackLeft = Math.max(0, SUCCESS_BEAT_WITH_CLIP_MS - gate.elapsedMs);
    if (fallbackLeft > 0 || minLeft > 0) {
      return { action: 'wait', ms: Math.max(minLeft, fallbackLeft) };
    }
    return { action: 'fire' };
  }

  return minLeft > 0 ? { action: 'wait', ms: minLeft } : { action: 'fire' };
}

export interface AdvanceWaitHooks {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  isPlaying: () => boolean;
  remainingMs: () => number | null;
  whenEnded: () => Promise<void>;
  cancelled: () => boolean;
}

/**
 * Hold until decideCorrectAdvance says fire. Used by Deck so auto-advance
 * cannot open the next root (or start its Hear) over leftover Bio audio.
 */
export async function waitOutCorrectAdvance(
  opts: { hasYesClip: boolean; startedAt: number },
  hooks: AdvanceWaitHooks,
): Promise<'fire' | 'cancel'> {
  let playbackEnded = !hooks.isPlaying() && !opts.hasYesClip;

  while (!hooks.cancelled()) {
    const decision = decideCorrectAdvance({
      elapsedMs: hooks.now() - opts.startedAt,
      hasYesClip: opts.hasYesClip,
      playing: hooks.isPlaying(),
      remainingMs: hooks.remainingMs(),
      playbackEnded: playbackEnded && !hooks.isPlaying(),
    });

    if (decision.action === 'fire') return 'fire';

    if (decision.action === 'wait-ended') {
      let ended = false;
      await Promise.race([
        hooks.whenEnded().then(() => {
          ended = true;
          playbackEnded = true;
        }),
        hooks.sleep(ADVANCE_ENDED_FALLBACK_MS),
      ]);
      if (!hooks.isPlaying()) playbackEnded = true;
      // Phone Safari never fired `ended` — open rather than hang.
      if (!ended && hooks.isPlaying()) return 'fire';
      continue;
    }

    await Promise.race([
      hooks.sleep(decision.ms),
      hooks.whenEnded().then(() => {
        playbackEnded = true;
      }),
    ]);
    if (!hooks.isPlaying()) playbackEnded = true;
  }

  return 'cancel';
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

export interface AfterHearNextTap {
  /** Root Rush on the deck nav. Hidden on the next-Play path (#28–#30). */
  showRush: boolean;
  /**
   * Card + nav Next. Hidden after Hear/Yes so the one tap is I know this
   * (teach) or the quiz option (recall). Auto-advance still opens the next
   * root with `entry: 'recall'` — this only removes the competing taps.
   */
  showNextRoot: boolean;
}

/**
 * After Hear/Yes finishes, first-run deck stays on one next tap — no
 * Rush / Daily / Next dump. Same spirit as Home's one Play (#28–#30).
 *
 * `hearFinished` is this card's Hear clip ending. `entry: 'recall'` is the
 * #19/#32 path: previous Hear/Yes already finished, then this root opened.
 */
export function afterHearNextTap(opts: {
  nextPlay: boolean;
  hearFinished: boolean;
  entry: DeckEntry;
  won: boolean;
}): AfterHearNextTap {
  const afterHear = opts.hearFinished || opts.entry === 'recall';
  return {
    showRush: !opts.nextPlay,
    showNextRoot: !opts.won && !(opts.nextPlay && afterHear),
  };
}

/** Kid-facing wait while Hear/Yes is mid-play. Sequential — not smash-together. */
export const LISTENING_LINE = 'Listening…';

export interface ClipListening {
  /** Shown on the card while a Hear/Yes clip is active. */
  line: string | null;
  /** Hear control looks on / mid-play. */
  hearActive: boolean;
  disableKnowThis: boolean;
  disableNextRoot: boolean;
  /**
   * Three Hear beats under Listening… (name / spoken sound / letters).
   * Null for Yes — that clip is one line, not three beats.
   */
  beats: HearBeatChip[] | null;
  /**
   * Yes clip highlight: the existing win line is the one beat.
   * Never a fake three-beat row.
   */
  yesNow: boolean;
}

/**
 * While the shared Hear/Yes element is playing, the wait is visible and
 * I-know-this / next-root stay closed. After the clip ends, #33 still
 * decides whether Next/Rush hide — this only gates the mid-play taps.
 *
 * `beats` is the moving Hear highlight (currentTime vs measured splits).
 * Pass null for Yes or when splits are missing — never a stuck fake mark.
 * `yesNow` marks the existing Yes/win line for the whole Yes clip.
 */
export function clipListening(
  playing: boolean,
  beats: HearBeatChip[] | null = null,
  yesNow = false,
): ClipListening {
  if (!playing) {
    return {
      line: null,
      hearActive: false,
      disableKnowThis: false,
      disableNextRoot: false,
      beats: null,
      yesNow: false,
    };
  }
  return {
    line: LISTENING_LINE,
    hearActive: true,
    disableKnowThis: true,
    disableNextRoot: true,
    // Yes is one spoken sentence — do not keep a Hear three-beat row.
    beats: yesNow ? null : beats,
    yesNow,
  };
}

/** Next-root (card, nav, index) stays closed during the Yes beat and while a clip plays. */
export function allowNextRootTap(
  correctAdvance: CorrectAdvance | null,
  listening: boolean,
): boolean {
  return !listening && allowManualStep(correctAdvance);
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

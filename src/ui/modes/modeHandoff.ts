/**
 * Daily / Rush overlay handoff — empty, done, and post-run next action.
 *
 * Home tiles already peek today's Daily (#39/#40), recap Rush best (#41),
 * and lift Continue {root} (#43). The overlays still dumped a returning kid
 * on Play again / Back to learning. This names the same next root the Home
 * Continue button uses, and only shows a replay CTA as the secondary tap.
 *
 * A live Daily mid-run is the same honesty on Rush: Home already names
 * Chron and lands on that peek (#51 / #53 / #56). Home Rush tile, Rush
 * start, and result peek Daily · 2 of 5 · Chron · time and make
 * Continue Daily a real tap — not a status-only dump, and not only
 * Continue {next learn} or Browse roots → Bio.
 *
 * After Daily is banked, the done overlay / Home Daily tile use the
 * same next Today already named — Continue {learn}, Keep going, or
 * Rush. Play again stays the ghost over unfinished work.
 *
 * After Daily + a learn, an owned Rush miss is the same honesty:
 * Remember {Geo} is the result hero — Play again / Continue {Astro}
 * must not sit over the miss Today already named.
 *
 * Pure and Date-free so tests lock the copy without I/O.
 */
import { continueDailyLabel, dailyDoneOverlaySub, dailyNextRowLabel } from '../../core/daily';
import { rememberMissCtaLabel, todayMissRecap } from '../../core/rushRecap';
import { rootId, rootsInTier, type Root } from '../../data/roots';
import { nextPlayRoot, rushBestLabel, tierPrimaryLabel } from '../home/menu';

export interface ModeCta {
  kind: 'learn' | 'home' | 'daily' | 'remember' | 'rush';
  label: string;
  rootId?: string;
  rootName?: string;
}

export interface DailyResumeOpts {
  /** Next unanswered Daily index when a mid-run is live. */
  dailyResumeQi?: number | null;
  dailyTotal?: number;
  dailyNextName?: string;
  dailyNextMean?: string;
}

/** Owned Rush miss Today already named — result / start / Home Rush tile. */
export interface RushMissRememberOpts {
  rememberMissId?: string | null;
  rememberMissName?: string;
  rememberAlso?: string;
  dailyDone?: boolean;
  learnedToday?: boolean;
}

/**
 * Daily + a learn (or no next learn) are done. A live Daily mid-run is
 * not "clear" — Chron is still waiting.
 */
export function rushPathClear(
  completed: Set<string>,
  entitled: boolean,
  opts: { dailyDone?: boolean; learnedToday?: boolean } & DailyResumeOpts,
): boolean {
  if (dailyWaitingLine(opts)) return false;
  const next = learnNextAction(completed, entitled);
  return Boolean(opts.dailyDone) && (Boolean(opts.learnedToday) || next.kind !== 'learn');
}

/**
 * Remember Geo is the Rush hero only when Today would already make it
 * the fat tap. Continue Daily / unfinished Continue {learn} stay first.
 */
export function rushMissRememberReady(
  completed: Set<string>,
  entitled: boolean,
  opts: RushMissRememberOpts & DailyResumeOpts,
): { id: string; name: string; also?: string } | null {
  if (!rushPathClear(completed, entitled, opts)) return null;
  const id = opts.rememberMissId?.trim();
  const name = opts.rememberMissName?.replace(/\s+/g, ' ').trim();
  if (!id || !name) return null;
  const also = opts.rememberAlso?.replace(/\s+/g, ' ').trim() || undefined;
  return { id, name, also };
}

/**
 * Same Today-row mid-run line Home already uses. Junk / finished / fresh
 * start indexes peek nothing — Rush must not invent a Daily resume.
 */
export function dailyWaitingLine(opts: DailyResumeOpts): string | null {
  const total = opts.dailyTotal && opts.dailyTotal > 0 ? opts.dailyTotal : 5;
  const qi = opts.dailyResumeQi;
  if (typeof qi !== 'number' || !Number.isInteger(qi) || qi < 1 || qi >= total) {
    return null;
  }
  return dailyNextRowLabel({
    answered: qi,
    total,
    nextName: opts.dailyNextName,
    nextMean: opts.dailyNextMean,
  });
}

/** Same Play / Continue label Home uses for the next unlearned root. */
export function learnNextAction(completed: Set<string>, entitled: boolean): ModeCta {
  const next = nextPlayRoot(completed, entitled);
  if (!next) return { kind: 'home', label: 'Back to learning' };
  const emptyTier = !rootsInTier(next.t).some((r) => completed.has(rootId(r)));
  return {
    kind: 'learn',
    label: tierPrimaryLabel({
      nextPlay: completed.size === 0,
      complete: false,
      rootName: next.root,
      empty: emptyTier,
    }),
    rootId: rootId(next),
    rootName: next.root,
  };
}

export interface ModeEmptyVM {
  lead: string;
  primary: ModeCta;
}

/** Empty Daily / Rush pool: point at the next root instead of a dead close. */
export function buildModeEmpty(
  mode: 'daily' | 'rush',
  completed: Set<string>,
  entitled: boolean,
): ModeEmptyVM {
  return {
    lead:
      mode === 'daily'
        ? 'Learn a few roots first, then come back for the daily.'
        : 'Learn a few roots first, then come back for Root Rush.',
    primary: learnNextAction(completed, entitled),
  };
}

export interface DailyDoneVM {
  /** Re-open after banking: name the done state. Just-finished keeps the ✓. */
  title: string | null;
  streakLine: string;
  sub: string;
  recap: { root: string; mean: string }[];
  recapDone: boolean;
  primary: ModeCta;
  replayLabel: string;
  homeLabel: string;
}

/**
 * Same Today-path hero after Daily is banked. Unfinished Continue {learn}
 * stays first. Once today's learn is done, Keep going · {root} — not
 * another Continue. Caught-up kids get Root Rush, not Back to learning.
 * Play again stays the ghost. Rush-miss Remember stays on Today / Rush
 * (#65–#67) — Daily does not steal that thread.
 */
export function dailyDonePrimary(
  completed: Set<string>,
  entitled: boolean,
  opts: { learnedToday?: boolean } = {},
): ModeCta {
  const next = learnNextAction(completed, entitled);
  if (next.kind === 'learn' && next.rootId && !opts.learnedToday) {
    return next;
  }
  if (next.kind === 'learn' && next.rootId && next.rootName) {
    return {
      kind: 'learn',
      label: tierPrimaryLabel({
        nextPlay: false,
        complete: false,
        rootName: next.rootName,
        keepGoing: true,
      }),
      rootId: next.rootId,
      rootName: next.rootName,
    };
  }
  return { kind: 'rush', label: 'Play Root Rush ›' };
}

/**
 * Daily already-banked landing + just-finished result. Recaps all five
 * (name + meaning + ✓). Sub says today's five are done — not a
 * fresh-start pitch. The fat tap is the same next Today already named.
 */
export function buildDailyDone(opts: {
  deal: readonly Pick<Root, 'root' | 'mean'>[];
  streak: number;
  justFinished: boolean;
  completed: Set<string>;
  entitled: boolean;
  learnedToday?: boolean;
}): DailyDoneVM {
  const streakLine =
    opts.streak > 0 ? `🔥 ${opts.streak} day streak` : 'Streak banked for today ✓';
  return {
    title: opts.justFinished ? null : 'Done for today.',
    streakLine,
    sub: dailyDoneOverlaySub(opts.justFinished),
    recap: opts.deal.map((r) => ({ root: r.root, mean: r.mean })),
    recapDone: true,
    primary: dailyDonePrimary(opts.completed, opts.entitled, {
      learnedToday: opts.learnedToday,
    }),
    replayLabel: 'Play again ›',
    homeLabel: 'Home',
  };
}

export interface RushStartVM {
  goLabel: string;
  recap: string | null;
  /** Live Daily mid-run — same Today row, so Rush does not hide it. */
  waiting: string | null;
  /**
   * Same Continue Daily · N of 5 Home / result already use. Status-only
   * peek is not a tap — Chron must be reachable from Rush start.
   */
  continueDaily: string | null;
  /** Path-done Rush miss — Remember Geo, not only Play again. */
  rememberMiss: string | null;
  rememberMissId: string | null;
  rememberPeek: string | null;
}

/** Rush start: Play again after a real run, with the same best recap as Home. */
export function buildRushStart(
  opts: {
    runs: number;
    bestPct: number;
    bestStars: number;
    bestScore?: number;
    completed?: Set<string>;
    entitled?: boolean;
  } & DailyResumeOpts &
    RushMissRememberOpts,
): RushStartVM {
  const recap = rushBestLabel(opts);
  const waiting = dailyWaitingLine(opts);
  const total = opts.dailyTotal && opts.dailyTotal > 0 ? opts.dailyTotal : 5;
  const qi = opts.dailyResumeQi;
  const continueDaily =
    waiting &&
    typeof qi === 'number' &&
    Number.isInteger(qi) &&
    qi >= 1 &&
    qi < total
      ? continueDailyLabel(qi, total)
      : null;
  const miss = rushMissRememberReady(opts.completed ?? new Set(), opts.entitled ?? false, opts);
  return {
    goLabel: opts.runs > 0 ? 'Play again ›' : 'Start round ›',
    recap: recap ? `Best so far — ${recap}` : null,
    waiting,
    continueDaily,
    rememberMiss: miss ? rememberMissCtaLabel(miss.name) : null,
    rememberMissId: miss?.id ?? null,
    rememberPeek: miss ? todayMissRecap(miss.name, miss.also) : null,
  };
}

export interface RushResultVM {
  primary: ModeCta;
  replayLabel: string;
  changeLabel: string;
  peek: string | null;
  dailyResume: boolean;
  /** Owned miss is the fat tap — Play again stays ghost. */
  missWaiting: boolean;
}

/**
 * Rush result: a live Daily mid-run is the hero (Continue Daily · 3 of 5),
 * same next root Home already named. After Daily + a learn, an owned
 * miss is Remember {root} — Play again / Continue {next} must not sit
 * over Geo. Otherwise Play again stays, plus Continue {root}.
 */
export function buildRushResultNext(
  completed: Set<string>,
  entitled: boolean,
  opts: DailyResumeOpts & RushMissRememberOpts = {},
): RushResultVM {
  const peek = dailyWaitingLine(opts);
  const total = opts.dailyTotal && opts.dailyTotal > 0 ? opts.dailyTotal : 5;
  const qi = opts.dailyResumeQi;
  if (
    peek &&
    typeof qi === 'number' &&
    Number.isInteger(qi) &&
    qi >= 1 &&
    qi < total
  ) {
    return {
      primary: {
        kind: 'daily',
        label: continueDailyLabel(qi, total),
        rootName: opts.dailyNextName?.replace(/\s+/g, ' ').trim() || undefined,
      },
      replayLabel: 'Play again ›',
      changeLabel: 'Change level',
      peek,
      dailyResume: true,
      missWaiting: false,
    };
  }
  const miss = rushMissRememberReady(completed, entitled, opts);
  if (miss) {
    return {
      primary: {
        kind: 'remember',
        label: rememberMissCtaLabel(miss.name),
        rootId: miss.id,
        rootName: miss.name,
      },
      replayLabel: 'Play again ›',
      changeLabel: 'Change level',
      peek: todayMissRecap(miss.name, miss.also),
      dailyResume: false,
      missWaiting: true,
    };
  }
  return {
    primary: learnNextAction(completed, entitled),
    replayLabel: 'Play again ›',
    changeLabel: 'Change level',
    peek: null,
    dailyResume: false,
    missWaiting: false,
  };
}

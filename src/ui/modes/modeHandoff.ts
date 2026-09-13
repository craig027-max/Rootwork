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
 * Pure and Date-free so tests lock the copy without I/O.
 */
import { continueDailyLabel, dailyNextRowLabel } from '../../core/daily';
import { rootId, rootsInTier, type Root } from '../../data/roots';
import { nextPlayRoot, rushBestLabel, tierPrimaryLabel } from '../home/menu';

export interface ModeCta {
  kind: 'learn' | 'home' | 'daily';
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
 * Daily already-banked landing + just-finished result. Recaps all five
 * (name + meaning + ✓) and makes Continue {root} the hero tap.
 */
export function buildDailyDone(opts: {
  deal: readonly Pick<Root, 'root' | 'mean'>[];
  streak: number;
  justFinished: boolean;
  completed: Set<string>;
  entitled: boolean;
}): DailyDoneVM {
  const streakLine =
    opts.streak > 0 ? `🔥 ${opts.streak} day streak` : 'Streak banked for today ✓';
  return {
    title: opts.justFinished ? null : 'Done for today.',
    streakLine,
    sub: opts.justFinished
      ? 'Streak banked. Same five roots until tomorrow.'
      : 'Streak banked for today ✓. Same five until tomorrow — replay is just for fun.',
    recap: opts.deal.map((r) => ({ root: r.root, mean: r.mean })),
    recapDone: true,
    primary: learnNextAction(opts.completed, opts.entitled),
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
}

/** Rush start: Play again after a real run, with the same best recap as Home. */
export function buildRushStart(
  opts: {
    runs: number;
    bestPct: number;
    bestStars: number;
    bestScore?: number;
  } & DailyResumeOpts,
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
  return {
    goLabel: opts.runs > 0 ? 'Play again ›' : 'Start round ›',
    recap: recap ? `Best so far — ${recap}` : null,
    waiting,
    continueDaily,
  };
}

export interface RushResultVM {
  primary: ModeCta;
  replayLabel: string;
  changeLabel: string;
  peek: string | null;
  dailyResume: boolean;
}

/**
 * Rush result: a live Daily mid-run is the hero (Continue Daily · 3 of 5),
 * same next root Home already named. Otherwise Play again stays, plus
 * Continue {root} so the next learn is named.
 */
export function buildRushResultNext(
  completed: Set<string>,
  entitled: boolean,
  opts: DailyResumeOpts = {},
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
    };
  }
  return {
    primary: learnNextAction(completed, entitled),
    replayLabel: 'Play again ›',
    changeLabel: 'Change level',
    peek: null,
    dailyResume: false,
  };
}

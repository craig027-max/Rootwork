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
 * After Daily + a learn, an owned Rush miss is the same honesty on
 * Daily's own done landing: Remember {Geo} is the fat tap — Play
 * again / Keep going must not sit over the miss Today / Rush already
 * named. Overlay title / Home Daily lead now match that same name —
 * Done for today / Streak banked must not sit over Geo. Rush result
 * now matches that same chrome — the giant grade / NEW BEST must not
 * sit over Geo. Home Rush now matches that same chrome — Root Rush /
 * Best so far / the A ring must not sit over Geo. Rush start now
 * matches that same chrome — Test your roots / Best so far must not
 * sit over Geo. Home Daily now matches — Daily / DONE / Done for
 * today / the 🔥 streak must not sit over Geo. Boot Continue /
 * the Home HERE tile now match — Continue {learn} must not sit
 * over Geo. Change level must not put Play again back over Geo.
 *
 * After Daily is banked and a learn is still the Today hero (no miss),
 * Rush uses that same Continue {learn} / Keep going tap — Play again
 * stays the ghost. Home lands on today's Rush; Play again must not
 * sit over Auto the way it used to sit over Chron on Daily (#68).
 * Rush start uses that same fat tap.
 *
 * Pure and Date-free so tests lock the copy without I/O.
 */
import { continueDailyLabel, dailyDoneOverlaySub, dailyNextRowLabel } from '../../core/daily';
import { rememberMissCtaLabel, todayMissRecap } from '../../core/rushRecap';
import { ROOTS, rootId, rootsInTier, type Root } from '../../data/roots';
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
 * Continue {learn} / Keep going is the Rush hero only when Today would
 * already make it the fat tap. Continue Daily / Remember Geo stay first.
 * Caught-up kids keep Play again — Play Root Rush is not a second go.
 */
export function rushLearnReady(
  completed: Set<string>,
  entitled: boolean,
  opts: RushMissRememberOpts & DailyResumeOpts,
): ModeCta | null {
  if (dailyWaitingLine(opts)) return null;
  if (rushMissRememberReady(completed, entitled, opts)) return null;
  if (!opts.dailyDone) return null;
  const next = dailyDonePrimary(completed, entitled, { learnedToday: opts.learnedToday });
  if (next.kind !== 'learn' || !next.rootId) return null;
  return next;
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
  /** Path-done Rush miss — same recap Today / Rush already name. */
  peek: string | null;
  missWaiting: boolean;
  /** Giant Daily ✓ — off while Remember is the hero. */
  celebrateDone: boolean;
}

/**
 * Same Today-path hero after Daily is banked. Unfinished Continue {learn}
 * stays first. Once today's learn is done, Keep going · {root} — not
 * another Continue. Caught-up kids get Root Rush, not Back to learning.
 * After Daily + a learn, an owned Rush miss is Remember {Geo} — Play
 * again / Keep going stay the ghost. Overlay title is Remember {Geo}
 * too — Done for today / the giant ✓ / Streak banked must not sit
 * over the miss. Rush-miss Remember stays on Today / Rush
 * (#65–#67) and Daily now joins that thread.
 */
export function dailyDonePrimary(
  completed: Set<string>,
  entitled: boolean,
  opts: { learnedToday?: boolean } & RushMissRememberOpts = {},
): ModeCta {
  const miss = rushMissRememberReady(completed, entitled, {
    ...opts,
    dailyDone: true,
  });
  if (miss) {
    return {
      kind: 'remember',
      label: rememberMissCtaLabel(miss.name),
      rootId: miss.id,
      rootName: miss.name,
    };
  }
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
 * fresh-start pitch. The fat tap is the same next Today already named,
 * including Remember {miss} when that miss is still waiting.
 */
export function buildDailyDone(
  opts: {
    deal: readonly Pick<Root, 'root' | 'mean'>[];
    streak: number;
    justFinished: boolean;
    completed: Set<string>;
    entitled: boolean;
    learnedToday?: boolean;
  } & RushMissRememberOpts,
): DailyDoneVM {
  const missOpts = { ...opts, dailyDone: true };
  const miss = rushMissRememberReady(opts.completed, opts.entitled, missOpts);
  const streakLine =
    opts.streak > 0
      ? `🔥 ${opts.streak} day streak`
      : miss
        ? ''
        : 'Streak banked for today ✓';
  return {
    title: miss
      ? `Remember ${miss.name}`
      : opts.justFinished
        ? null
        : 'Done for today.',
    streakLine,
    sub: dailyDoneOverlaySub(opts.justFinished),
    recap: opts.deal.map((r) => ({ root: r.root, mean: r.mean })),
    recapDone: true,
    primary: dailyDonePrimary(opts.completed, opts.entitled, missOpts),
    replayLabel: 'Play again ›',
    homeLabel: 'Home',
    peek: miss ? todayMissRecap(miss.name, miss.also) : null,
    missWaiting: Boolean(miss),
    celebrateDone: !miss,
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
  /** Path-done Rush miss — Remember Geo is the fat tap. */
  rememberMiss: string | null;
  rememberMissId: string | null;
  rememberPeek: string | null;
  /**
   * Daily banked + Today still names Continue / Keep going. Same tap
   * Home / result already use — Play again is the ghost here too.
   */
  continueLearn: string | null;
  continueLearnId: string | null;
  continueLearnPeek: string | null;
  /** Owned miss is the fat tap — Play again stays ghost. */
  missWaiting: boolean;
  /** Daily banked + Continue / Keep going is the fat tap — Play again stays ghost. */
  learnWaiting: boolean;
  /** Miss landing copy — not the combo pitch over Geo. */
  heroSub: string | null;
  /** Path-done Rush miss — Remember Geo, not Test your roots. */
  title: string | null;
}

/** Rush start: Play again after a real run, with the same best recap as Home.
 *  After Daily + a learn, an owned miss is Remember Geo — Test your
 *  roots / Best so far must not sit over that same coral miss. An
 *  unfinished learn is the fat tap — same hero Home / result already
 *  use, and the graded recap stays. Continue Daily stays a ghost so
 *  mid-run Play again is still the one-tap (Home Rush tile). */
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
  const completed = opts.completed ?? new Set();
  const entitled = opts.entitled ?? false;
  const miss = rushMissRememberReady(completed, entitled, opts);
  const learn = rushLearnReady(completed, entitled, opts);
  const learnMean = learn?.rootId
    ? ROOTS.find((r) => rootId(r) === learn.rootId)?.mean.replace(/\s+/g, ' ').trim()
    : undefined;
  const learnPeek = learn
    ? [learn.rootName, learnMean].filter((part): part is string => Boolean(part?.trim())).join(' · ') ||
      null
    : null;
  return {
    goLabel: opts.runs > 0 ? 'Play again ›' : 'Start round ›',
    recap: miss ? null : recap ? `Best so far — ${recap}` : null,
    waiting,
    continueDaily,
    rememberMiss: miss ? rememberMissCtaLabel(miss.name) : null,
    rememberMissId: miss?.id ?? null,
    rememberPeek: miss ? todayMissRecap(miss.name, miss.also) : null,
    continueLearn: learn?.label ?? null,
    continueLearnId: learn?.rootId ?? null,
    continueLearnPeek: learnPeek,
    missWaiting: Boolean(miss),
    learnWaiting: Boolean(learn),
    heroSub: miss ? 'Play again is just for fun.' : null,
    title: miss ? `Remember ${miss.name}` : null,
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
  /** Daily banked + Continue / Keep going is the fat tap — Play again stays ghost. */
  learnWaiting: boolean;
  /** Path-done Rush miss — Remember Geo, not a nameless grade dump. */
  title: string | null;
  /** Giant grade letter / NEW BEST — off while Remember is the hero. */
  celebrateGrade: boolean;
}

/**
 * Rush result: a live Daily mid-run is the hero (Continue Daily · 3 of 5),
 * same next root Home already named. After Daily + a learn, an owned
 * miss is Remember {root} — Play again / Continue {next} / the giant
 * grade must not sit over Geo. After Daily is banked and Today still
 * names Continue / Keep going, that tap is the hero — Play again
 * stays the ghost and the grade stays. Otherwise Play again stays,
 * plus Continue {root}.
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
      learnWaiting: false,
      title: null,
      celebrateGrade: true,
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
      learnWaiting: false,
      title: `Remember ${miss.name}`,
      celebrateGrade: false,
    };
  }
  const learn = rushLearnReady(completed, entitled, opts);
  if (learn) {
    const mean = learn.rootId
      ? ROOTS.find((r) => rootId(r) === learn.rootId)?.mean.replace(/\s+/g, ' ').trim()
      : undefined;
    return {
      primary: learn,
      replayLabel: 'Play again ›',
      changeLabel: 'Change level',
      peek:
        [learn.rootName, mean].filter((part): part is string => Boolean(part?.trim())).join(' · ') ||
        null,
      dailyResume: false,
      missWaiting: false,
      learnWaiting: true,
      title: null,
      celebrateGrade: true,
    };
  }
  return {
    primary: learnNextAction(completed, entitled),
    replayLabel: 'Play again ›',
    changeLabel: 'Change level',
    peek: null,
    dailyResume: false,
    missWaiting: false,
    learnWaiting: false,
    title: null,
    celebrateGrade: true,
  };
}

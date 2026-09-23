/**
 * Home progress-band "Today" checklist — returning-dashboard honesty.
 *
 * #46 named Daily + Continue {root}. #47 checks off Learned {root} and
 * says Today ✓ when Daily + a learn are both done. After that, Continue
 * {next} still *looked* like unfinished work, and tapping Learned Photo
 * opened Geo. Keep going · {root} splits done from next: a finished row
 * reviews that root as Remember (hold meaning, then Home) — Geo must
 * not open after Learned Photo. Remember {stale root} · meaning is the
 * retention beat for an older owned root — it does not block Today ✓.
 * A mid-run Daily says Daily · 2 of 5 · Chron · time and makes
 * Continue Daily the fat tap — same hero Rush already uses — so Geo
 * does not steal the one-tap while Chron is still waiting. Continue
 * {next learn} stays on the learn row. An owned Daily hit is today's
 * Remember (Home excludes today's deal from the Remember pick so Bio
 * is not asked twice). After today's Rush, an owned miss wins Remember
 * — Missed Geo, not a stale Bio, and not Remembered Photo hiding the
 * miss. Today ✓ waits until that miss is Remembered — Daily + a learn
 * must not paint Nice work / Keep going while Geo is still sitting
 * there. Two unreviewed misses peek the next name (then Chron) so the
 * row is not a one-chip lie. Yesterday's recap does not steal the row.
 * First-run / next-Play stays a single Play {root} — no Daily / Remember
 * dump. Continue Daily / unfinished Continue {learn} stay the fat tap.
 * After Daily is banked, the Daily overlay and Home Daily tile use that
 * same next — Play again must not sit over Continue {learn}. Once the
 * learn is done, Daily result says Keep going (or Rush), not another
 * Continue. Done copy is a recap (Today's five are done / Done · names),
 * not a fresh-start pitch. Rush-miss Remember stays on Today / Rush
 * (#65–#67) and Daily's done landing now matches — Play again / Keep
 * going must not sit over Geo. Home Rush now matches that same fat tap
 * — Play again stays the ghost. Rush start now matches that same fat
 * tap — Change level must not put Play again back over Geo. Home hero
 * now matches that same name — Welcome back / Streak banked ✓ must
 * not sit over Geo. Daily done title / Home Daily lead now match —
 * Done for today / Streak banked must not sit over Geo. Rush result
 * now matches that same chrome — the giant grade / NEW BEST must not
 * sit over Geo. Home Rush now matches that same chrome — Root Rush /
 * Best so far / the A ring must not sit over Geo. Daily's last hold
 * peeks Remember, not Keep going.
 * Continue / Keep going / Rush CTAs stay as #68 left them when no
 * miss is waiting.
 *
 * Pure so tests lock the copy without I/O.
 */
import { continueDailyLabel, dailyNextRowLabel, localDayKey } from '../../core/daily';
import {
  rememberMissCtaLabel,
  todayMissRecap,
  type RushRecap,
} from '../../core/rushRecap';
import { ROOTS_BY_ID } from '../../data/roots';
import { learnNextAction } from '../modes/modeHandoff';
import { type ProgressStamp, stampReviewedAt } from './progressStamp';

export type { ProgressStamp };
export { stampReviewedAt };
export { rememberMissCtaLabel, todayMissRecap };

export type TodayItemKey = 'daily' | 'learn' | 'remember';
export type TodayAction = 'daily' | 'learn' | 'rush' | 'review' | 'remember' | 'none';

export interface TodayItem {
  key: TodayItemKey;
  done: boolean;
  label: string;
  action: TodayAction;
  rootId?: string;
  /** Today's Rush miss — Missed stays Missed, not a fake ✓. */
  missed?: boolean;
}

export interface TodayCta {
  kind: 'learn' | 'daily' | 'rush' | 'remember';
  label: string;
  rootId?: string;
}

export interface TodayProgress {
  show: boolean;
  heading: string;
  /** Daily banked, today's learn is done (or there is no next root), and no live Rush miss. */
  pathDone: boolean;
  /** Kid-facing recap once the path is done — or while a Rush miss still waits. */
  recap: string | null;
  items: TodayItem[];
  cta: TodayCta | null;
  /** Unreviewed Rush miss — Today ✓ must not fire, and the recap/CTA can mark miss. */
  missWaiting: boolean;
  /** Kid-facing miss name for the Home hero — not a Welcome-back dump. */
  missName?: string;
}

/** Extra-play label after Today ✓ — not another Continue (that's unfinished). */
export function keepGoingLabel(rootName: string): string {
  return `Keep going · ${rootName} ›`;
}

/** Today-row after Daily is banked — name the recap, not a nameless done dump. */
export function dailyDoneRowLabel(names?: readonly string[]): string {
  const cleaned = (names ?? [])
    .map((n) => n.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3);
  if (cleaned.length === 0) return 'Daily · done for today';
  return `Daily · done · ${cleaned.join(' · ')}`;
}

export interface RootLabel {
  name?: string;
  mean?: string;
}

/** Kid-facing name + meaning for a catalog id, or empty if it is missing. */
export function rootLabel(id: string | null | undefined): RootLabel {
  if (!id) return {};
  const root = ROOTS_BY_ID[id];
  if (!root) return {};
  return { name: root.root, mean: root.mean };
}

/** Kid-facing name for a learned root id, or undefined if the catalog misses it. */
export function learnedRootName(id: string | null): string | undefined {
  return rootLabel(id).name;
}

/**
 * Most recently completed root whose local calendar day matches `day`.
 * Uses the same YYYY-MM-DD key as Daily / streak. Missing stamps do not
 * count — older blobs without `completedAt` cannot pretend they are today.
 */
export function learnedRootToday(
  progress: Record<string, ProgressStamp>,
  day: string,
): string | null {
  let best: { id: string; at: number } | null = null;
  for (const [id, rec] of Object.entries(progress)) {
    const at = rec?.completedAt;
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    if (localDayKey(new Date(at)) !== day) continue;
    if (!best || at > best.at) best = { id, at };
  }
  return best?.id ?? null;
}

/**
 * Most recently reviewed owned root today. A root learned today is the
 * Learned row — it must not also pretend to be Remembered.
 */
export function rememberRootToday(
  progress: Record<string, ProgressStamp>,
  day: string,
): string | null {
  let best: { id: string; at: number } | null = null;
  for (const [id, rec] of Object.entries(progress)) {
    const reviewed = rec?.reviewedAt;
    if (typeof reviewed !== 'number' || !Number.isFinite(reviewed)) continue;
    if (localDayKey(new Date(reviewed)) !== day) continue;
    const learned = rec?.completedAt;
    if (typeof learned === 'number' && localDayKey(new Date(learned)) === day) continue;
    if (!best || reviewed > best.at) best = { id, at: reviewed };
  }
  return best?.id ?? null;
}

/**
 * Oldest owned root that is not today's learn and has not been reviewed
 * today — the stale card a returning kid should tap Remember on.
 */
export function pickRememberRoot(
  progress: Record<string, ProgressStamp>,
  day: string,
  opts: { exclude?: Iterable<string | null | undefined> } = {},
): string | null {
  const exclude = new Set(
    [...(opts.exclude ?? [])].filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  let best: { id: string; at: number } | null = null;
  for (const [id, rec] of Object.entries(progress)) {
    if (exclude.has(id) || !ROOTS_BY_ID[id]) continue;
    const at = rec?.completedAt;
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    if (localDayKey(new Date(at)) === day) continue;
    const reviewed = rec?.reviewedAt;
    if (
      typeof reviewed === 'number' &&
      Number.isFinite(reviewed) &&
      localDayKey(new Date(reviewed)) === day
    ) {
      continue;
    }
    if (!best || at < best.at) best = { id, at };
  }
  return best?.id ?? null;
}

/**
 * Owned misses from today's last Rush that are still unreviewed.
 * Play order — the Missed chips they already see — not oldest stale Bio.
 * Hits, unowned Meet roots, today's learn, and reviewed-today drop.
 * Yesterday's recap must not steal Today's Remember.
 */
export function listRushMissRemember(
  recap: RushRecap | null | undefined,
  progress: Record<string, ProgressStamp>,
  day: string,
  opts: { exclude?: Iterable<string | null | undefined> } = {},
): string[] {
  if (!recap || recap.day !== day || recap.roots.length === 0) return [];
  const exclude = new Set(
    [...(opts.exclude ?? [])].filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  const ids: string[] = [];
  for (const line of recap.roots) {
    if (line.ok || exclude.has(line.id) || !ROOTS_BY_ID[line.id]) continue;
    const rec = progress[line.id];
    const at = rec?.completedAt;
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    if (localDayKey(new Date(at)) === day) continue;
    const reviewed = rec?.reviewedAt;
    if (
      typeof reviewed === 'number' &&
      Number.isFinite(reviewed) &&
      localDayKey(new Date(reviewed)) === day
    ) {
      continue;
    }
    ids.push(line.id);
  }
  return ids;
}

/** First remaining owned Rush miss — the Today tap. */
export function pickRushMissRemember(
  recap: RushRecap | null | undefined,
  progress: Record<string, ProgressStamp>,
  day: string,
  opts: { exclude?: Iterable<string | null | undefined> } = {},
): string | null {
  return listRushMissRemember(recap, progress, day, opts)[0] ?? null;
}

function stripCta(label: string): string {
  return label.replace(/\s*›\s*$/, '');
}

function learnRowLabel(opts: {
  learnedToday: boolean;
  learnedName?: string;
  nextLabel: string;
  learnMean?: string;
}): string {
  if (opts.learnedToday) {
    return opts.learnedName ? `Learned ${opts.learnedName}` : 'Learned a root today';
  }
  const name = stripCta(opts.nextLabel);
  const mean = opts.learnMean?.trim();
  return mean ? `${name} · ${mean}` : name;
}

function rememberRowLabel(opts: {
  done: boolean;
  name?: string;
  mean?: string;
  missed?: boolean;
  also?: string;
}): string {
  if (opts.done) {
    return opts.name ? `Remembered ${opts.name}` : 'Remembered a root today';
  }
  const name = opts.name?.trim();
  const mean = opts.mean?.trim();
  const also = opts.also?.replace(/\s+/g, ' ').trim();
  if (opts.missed) {
    if (name && mean && also) return `Missed ${name} · ${mean} · then ${also}`;
    if (name && mean) return `Missed ${name} · ${mean}`;
    if (name && also) return `Missed ${name} · then ${also}`;
    if (name) return `Missed ${name}`;
    return 'Missed a root';
  }
  if (name && mean) return `Remember ${name} · ${mean}`;
  if (name) return `Remember ${name}`;
  return 'Remember a root';
}

/**
 * Today's path on the returning dashboard. Hidden on first-run and on the
 * one-Play board (Daily / Remember are not on that board, so listing them
 * would lie).
 */
export function buildTodayProgress(opts: {
  firstRun: boolean;
  nextPlay: boolean;
  dailyDone: boolean;
  /** Next unanswered Daily index when a mid-run is live (Home resume honesty). */
  dailyResumeQi?: number | null;
  dailyTotal?: number;
  /** Next unanswered Daily root — named on the Today row, not a count-only dump. */
  dailyNextName?: string;
  dailyNextMean?: string;
  /** Today's Daily names — named on the done row so Remember is not anonymous. */
  dailyRecapNames?: readonly string[];
  completed: Set<string>;
  entitled: boolean;
  learnedToday?: boolean;
  learnedRoot?: string;
  /** Catalog id of the root they learned today — review tap, not the next one. */
  learnedRootId?: string;
  learnMean?: string;
  rememberedToday?: boolean;
  rememberRoot?: string;
  rememberMean?: string;
  rememberRootId?: string;
  /** Today's Rush miss — Today names Missed {root}, not Remembered {hit}. */
  rememberMissed?: boolean;
  /** Next remaining Rush miss — peek "then Chron" so two misses are not a one-chip lie. */
  rememberAlso?: string;
}): TodayProgress {
  if (opts.firstRun || opts.nextPlay) {
    return {
      show: false,
      heading: 'Today',
      pathDone: false,
      recap: null,
      items: [],
      cta: null,
      missWaiting: false,
      missName: undefined,
    };
  }

  const next = learnNextAction(opts.completed, opts.entitled);
  const learnedToday = Boolean(opts.learnedToday);
  const learnedName = opts.learnedRoot?.trim() || undefined;
  const learnedId = opts.learnedRootId?.trim() || undefined;
  const rememberedToday = Boolean(opts.rememberedToday);
  const rememberName = opts.rememberRoot?.trim() || undefined;
  const rememberMean = opts.rememberMean?.trim() || undefined;
  const rememberId = opts.rememberRootId?.trim() || undefined;
  const rememberMissed = Boolean(opts.rememberMissed) && !rememberedToday;
  const rememberAlso = rememberMissed ? opts.rememberAlso?.replace(/\s+/g, ' ').trim() || undefined : undefined;
  const dailyTotal = opts.dailyTotal && opts.dailyTotal > 0 ? opts.dailyTotal : 5;
  const dailyResume =
    !opts.dailyDone &&
    typeof opts.dailyResumeQi === 'number' &&
    opts.dailyResumeQi >= 1 &&
    opts.dailyResumeQi < dailyTotal
      ? opts.dailyResumeQi
      : null;
  const items: TodayItem[] = [
    {
      key: 'daily',
      done: opts.dailyDone,
      label: opts.dailyDone
        ? dailyDoneRowLabel(opts.dailyRecapNames)
        : dailyResume != null
          ? dailyNextRowLabel({
              answered: dailyResume,
              total: dailyTotal,
              nextName: opts.dailyNextName,
              nextMean: opts.dailyNextMean,
            })
          : 'Daily · five fresh roots',
      action: 'daily',
    },
  ];

  if (next.kind === 'learn' || learnedToday) {
    const reviewId = learnedToday ? learnedId : undefined;
    items.push({
      key: 'learn',
      done: learnedToday,
      label: learnRowLabel({
        learnedToday,
        learnedName,
        nextLabel: next.label,
        learnMean: opts.learnMean,
      }),
      action: learnedToday
        ? reviewId
          ? 'review'
          : 'none'
        : next.kind === 'learn'
          ? 'learn'
          : 'none',
      ...(learnedToday
        ? reviewId
          ? { rootId: reviewId }
          : {}
        : next.rootId
          ? { rootId: next.rootId }
          : {}),
    });
  }

  if (rememberId || rememberedToday || rememberName) {
    items.push({
      key: 'remember',
      done: rememberedToday,
      label: rememberRowLabel({
        done: rememberedToday,
        name: rememberName,
        mean: rememberMean,
        missed: rememberMissed,
        also: rememberAlso,
      }),
      action: rememberId ? 'remember' : 'none',
      ...(rememberId ? { rootId: rememberId } : {}),
      ...(rememberMissed ? { missed: true } : {}),
    });
  }

  const pathClear = opts.dailyDone && (learnedToday || next.kind !== 'learn');
  const pathDone = pathClear && !rememberMissed;
  const nextName = next.rootName?.trim() || undefined;
  const unfinishedLearn = next.kind === 'learn' && Boolean(next.rootId) && !pathClear;
  const cta: TodayCta =
    dailyResume != null
      ? { kind: 'daily', label: continueDailyLabel(dailyResume, dailyTotal) }
      : unfinishedLearn && next.rootId
        ? {
            kind: 'learn',
            label: next.label,
            rootId: next.rootId,
          }
        : rememberMissed && rememberId && pathClear
          ? {
              kind: 'remember',
              label: rememberMissCtaLabel(rememberName ?? ''),
              rootId: rememberId,
            }
          : next.kind === 'learn' && next.rootId
            ? {
                kind: 'learn',
                label: pathDone && nextName ? keepGoingLabel(nextName) : next.label,
                rootId: next.rootId,
              }
            : !opts.dailyDone
              ? { kind: 'daily', label: 'Start daily ›' }
              : { kind: 'rush', label: 'Play Root Rush ›' };

  return {
    show: true,
    heading: pathDone ? 'Today ✓' : 'Today',
    pathDone,
    recap: pathDone
      ? learnedName
        ? `Daily and ${learnedName} are done`
        : "Today's path is done"
      : pathClear && rememberMissed
        ? todayMissRecap(rememberName, rememberAlso)
        : null,
    items,
    cta,
    missWaiting: rememberMissed,
    missName: rememberMissed && pathClear ? rememberName : undefined,
  };
}

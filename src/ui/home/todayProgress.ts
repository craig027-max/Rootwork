/**
 * Home progress-band "Today" checklist — returning-dashboard honesty.
 *
 * #46 named Daily + Continue {root}. #47 checks off Learned {root} and
 * says Today ✓ when Daily + a learn are both done. After that, Continue
 * {next} still *looked* like unfinished work, and tapping Learned Photo
 * opened Geo. Keep going · {root} splits done from next: a finished row
 * reviews that root. Remember {stale root} · meaning is the retention
 * beat for an older owned root — it does not block Today ✓. Tapping it
 * is a one-beat visit (hold meaning, then Home) — Geo must not open.
 * A mid-run Daily says Daily · 2 of 5 (and Continue Daily when that is
 * the fat tap) instead of pretending they never started. First-run /
 * next-Play stays a single Play {root} — no Daily / Remember dump.
 *
 * Pure so tests lock the copy without I/O.
 */
import { continueDailyLabel, dailyProgressLabel, localDayKey } from '../../core/daily';
import { ROOTS_BY_ID } from '../../data/roots';
import { learnNextAction } from '../modes/modeHandoff';
import { type ProgressStamp, stampReviewedAt } from './progressStamp';

export type { ProgressStamp };
export { stampReviewedAt };

export type TodayItemKey = 'daily' | 'learn' | 'remember';
export type TodayAction = 'daily' | 'learn' | 'rush' | 'review' | 'remember' | 'none';

export interface TodayItem {
  key: TodayItemKey;
  done: boolean;
  label: string;
  action: TodayAction;
  rootId?: string;
}

export interface TodayCta {
  kind: 'learn' | 'daily' | 'rush';
  label: string;
  rootId?: string;
}

export interface TodayProgress {
  show: boolean;
  heading: string;
  /** Daily banked and today's learn is done (or there is no next root). */
  pathDone: boolean;
  /** Kid-facing recap once the path is done — not a second checklist. */
  recap: string | null;
  items: TodayItem[];
  cta: TodayCta | null;
}

/** Extra-play label after Today ✓ — not another Continue (that's unfinished). */
export function keepGoingLabel(rootName: string): string {
  return `Keep going · ${rootName} ›`;
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
}): string {
  if (opts.done) {
    return opts.name ? `Remembered ${opts.name}` : 'Remembered a root today';
  }
  const name = opts.name?.trim();
  const mean = opts.mean?.trim();
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
}): TodayProgress {
  if (opts.firstRun || opts.nextPlay) {
    return {
      show: false,
      heading: 'Today',
      pathDone: false,
      recap: null,
      items: [],
      cta: null,
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
        ? 'Daily · done for today'
        : dailyResume != null
          ? dailyProgressLabel(dailyResume, dailyTotal)
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
      }),
      action: rememberId ? 'remember' : 'none',
      ...(rememberId ? { rootId: rememberId } : {}),
    });
  }

  const pathDone = opts.dailyDone && (learnedToday || next.kind !== 'learn');
  const nextName = next.rootName?.trim() || undefined;
  const cta: TodayCta =
    next.kind === 'learn' && next.rootId
      ? {
          kind: 'learn',
          label: pathDone && nextName ? keepGoingLabel(nextName) : next.label,
          rootId: next.rootId,
        }
      : !opts.dailyDone
        ? {
            kind: 'daily',
            label:
              dailyResume != null ? continueDailyLabel(dailyResume, dailyTotal) : 'Start daily ›',
          }
        : { kind: 'rush', label: 'Play Root Rush ›' };

  return {
    show: true,
    heading: pathDone ? 'Today ✓' : 'Today',
    pathDone,
    recap: pathDone
      ? learnedName
        ? `Daily and ${learnedName} are done`
        : "Today's path is done"
      : null,
    items,
    cta,
  };
}

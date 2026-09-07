/**
 * Home progress-band "Today" checklist — returning-dashboard honesty.
 *
 * #46 named Daily + Continue {root}. #47 checks off Learned {root} and
 * says Today ✓ when Daily + a learn are both done. After that, Continue
 * {next} still *looked* like unfinished work, and tapping Learned Photo
 * opened Geo. This splits done from next: a finished row reviews that
 * root, and the fat tap becomes Keep going · {root} (or Root Rush).
 *
 * First-run / next-Play stays a single Play {root} — no Daily dump.
 * Pure so tests lock the copy without I/O.
 */
import { localDayKey } from '../../core/daily';
import { ROOTS_BY_ID } from '../../data/roots';
import { learnNextAction } from '../modes/modeHandoff';

export type TodayItemKey = 'daily' | 'learn';
export type TodayAction = 'daily' | 'learn' | 'rush' | 'review' | 'none';

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

/** Minimal stamp so this stays free of the zustand store. */
export interface ProgressStamp {
  completedAt?: number;
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

/** Kid-facing name for a learned root id, or undefined if the catalog misses it. */
export function learnedRootName(id: string | null): string | undefined {
  if (!id) return undefined;
  return ROOTS_BY_ID[id]?.root;
}

/**
 * Today's path on the returning dashboard. Hidden on first-run and on the
 * one-Play board (Daily is not on that board, so listing it would lie).
 */
export function buildTodayProgress(opts: {
  firstRun: boolean;
  nextPlay: boolean;
  dailyDone: boolean;
  completed: Set<string>;
  entitled: boolean;
  learnedToday?: boolean;
  learnedRoot?: string;
  /** Catalog id of the root they learned today — review tap, not the next one. */
  learnedRootId?: string;
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
  const items: TodayItem[] = [
    {
      key: 'daily',
      done: opts.dailyDone,
      label: opts.dailyDone ? 'Daily · done for today' : 'Daily · five fresh roots',
      action: 'daily',
    },
  ];

  if (next.kind === 'learn' || learnedToday) {
    const reviewId = learnedToday ? learnedId : undefined;
    items.push({
      key: 'learn',
      done: learnedToday,
      label: learnedToday
        ? learnedName
          ? `Learned ${learnedName}`
          : 'Learned a root today'
        : next.label.replace(/\s*›\s*$/, ''),
      action: learnedToday ? (reviewId ? 'review' : 'none') : next.kind === 'learn' ? 'learn' : 'none',
      ...(learnedToday
        ? reviewId
          ? { rootId: reviewId }
          : {}
        : next.rootId
          ? { rootId: next.rootId }
          : {}),
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
      : null,
    items,
    cta,
  };
}

/**
 * Home progress-band "Today" checklist — returning-dashboard honesty.
 *
 * #46 named Daily + Continue {root}. The learn row could never check off,
 * so a kid who already learned Photo still saw an empty circle, and a
 * caught-up board (every openable root owned, Daily banked) had no next
 * tap. This marks Learned {root} from today's progress stamps, says
 * Today ✓ when the path is done, and hands a caught-up kid Root Rush.
 *
 * First-run / next-Play stays a single Play {root} — no Daily dump.
 * Pure so tests lock the copy without I/O.
 */
import { localDayKey } from '../../core/daily';
import { ROOTS_BY_ID } from '../../data/roots';
import { learnNextAction } from '../modes/modeHandoff';

export type TodayItemKey = 'daily' | 'learn';
export type TodayAction = 'daily' | 'learn' | 'rush' | 'none';

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
  items: TodayItem[];
  cta: TodayCta | null;
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
}): TodayProgress {
  if (opts.firstRun || opts.nextPlay) {
    return { show: false, heading: 'Today', pathDone: false, items: [], cta: null };
  }

  const next = learnNextAction(opts.completed, opts.entitled);
  const learnedToday = Boolean(opts.learnedToday);
  const learnedName = opts.learnedRoot?.trim() || undefined;
  const items: TodayItem[] = [
    {
      key: 'daily',
      done: opts.dailyDone,
      label: opts.dailyDone ? 'Daily · done for today' : 'Daily · five fresh roots',
      action: 'daily',
    },
  ];

  if (next.kind === 'learn' || learnedToday) {
    items.push({
      key: 'learn',
      done: learnedToday,
      label: learnedToday
        ? learnedName
          ? `Learned ${learnedName}`
          : 'Learned a root today'
        : next.label.replace(/\s*›\s*$/, ''),
      action: next.kind === 'learn' ? 'learn' : 'none',
      ...(next.rootId ? { rootId: next.rootId } : {}),
    });
  }

  const pathDone = opts.dailyDone && (learnedToday || next.kind !== 'learn');

  let cta: TodayCta | null = null;
  if (next.kind === 'learn' && next.rootId) {
    cta = { kind: 'learn', label: next.label, rootId: next.rootId };
  } else if (!opts.dailyDone) {
    cta = { kind: 'daily', label: 'Start daily ›' };
  } else {
    cta = { kind: 'rush', label: 'Play Root Rush ›' };
  }

  return {
    show: true,
    heading: pathDone ? 'Today ✓' : 'Today',
    pathDone,
    items,
    cta,
  };
}

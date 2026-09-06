/**
 * Home progress-band "Today" checklist — returning-dashboard honesty.
 *
 * #44 made streak risk visible. The band still did not name what today is
 * for: Daily (one-shot) and Continue {next root} (same next action as Home
 * #43 and Daily/Rush overlays #45). First-run / next-Play stays a single
 * Play {root} — no Daily dump on that board.
 *
 * Pure so tests lock the copy without I/O.
 */
import { learnNextAction } from '../modes/modeHandoff';

export type TodayItemKey = 'daily' | 'learn';
export type TodayAction = 'daily' | 'learn' | 'none';

export interface TodayItem {
  key: TodayItemKey;
  done: boolean;
  label: string;
  action: TodayAction;
  rootId?: string;
}

export interface TodayCta {
  kind: 'learn' | 'daily';
  label: string;
  rootId?: string;
}

export interface TodayProgress {
  show: boolean;
  heading: string;
  items: TodayItem[];
  cta: TodayCta | null;
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
}): TodayProgress {
  if (opts.firstRun || opts.nextPlay) {
    return { show: false, heading: 'Today', items: [], cta: null };
  }

  const next = learnNextAction(opts.completed, opts.entitled);
  const items: TodayItem[] = [
    {
      key: 'daily',
      done: opts.dailyDone,
      label: opts.dailyDone ? 'Daily · done for today' : 'Daily · five fresh roots',
      action: 'daily',
    },
  ];

  if (next.kind === 'learn') {
    items.push({
      key: 'learn',
      done: false,
      label: next.label.replace(/\s*›\s*$/, ''),
      action: 'learn',
      rootId: next.rootId,
    });
  }

  let cta: TodayCta | null = null;
  if (next.kind === 'learn' && next.rootId) {
    cta = { kind: 'learn', label: next.label, rootId: next.rootId };
  } else if (!opts.dailyDone) {
    cta = { kind: 'daily', label: 'Start daily ›' };
  }

  return { show: true, heading: 'Today', items, cta };
}

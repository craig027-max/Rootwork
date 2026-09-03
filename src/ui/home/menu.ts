/**
 * Home master-detail menu model — ported from the design package
 * (rootwork/ui_kits/rootwork-app/home.html `ITEMS`).
 *
 * Next-Play board — one fat Play, no Rush / Daily / locked-tier dump:
 *   • Through Starter (#29): Play Bio, then Geo, then Photo… while any
 *     Tier 1 root is unlearned. Not a count threshold.
 *   • After Starter: still one Play {first next-tier root} (Builder · Auto)
 *     while that next root exists and they have not yet left first-run.
 *
 * Returning dashboard (Rush / Daily, unlocked tiers, locked under More):
 *   they have started the next tier (owned ≥1 Tier 2+ root), OR they have
 *   chosen a mode (a Root Rush run or a Daily finish), OR there is no next
 *   root to offer. First-completion of Starter is not that moment.
 *
 * Tier stats are derived live from the completed-root set.
 */
import {
  ROOTS,
  ROOTS_BY_ID,
  TIERS,
  isRootOpenable,
  resumeRootId,
  rootsInTier,
  rootId,
  type Root,
  type TierNum,
} from '../../data/roots';
import { starsForPct } from '../../core/stats';

/** Per-tier presentation: emoji chip + the PALETTES jewel key that themes the row. */
export const TIER_META: { icon: string; jewel: string }[] = [
  { icon: '🌱', jewel: 'green' }, // Tier 1 · Starter  (jade)
  { icon: '🔨', jewel: 'cyan' }, // Tier 2 · Builder  (cyan)
  { icon: '📚', jewel: 'earth' }, // Tier 3 · Scholar  (cobalt)
  { icon: '🎓', jewel: 'violet' }, // Tier 4 · Master   (violet)
  { icon: '🤖', jewel: 'rose' }, // Tier 5 · AI Level (magenta)
];

export interface ModeItem {
  kind: 'mode';
  key: 'rush' | 'daily';
  icon: string;
  jewel: string;
  title: string;
  sub: string;
  badge?: string;
  disabled?: boolean;
  /** Best-result meta for the row (e.g. "A · 4★" for Root Rush), design's `best`. */
  best?: string;
  /** Daily tile peek: today's three names + one-line meanings, before Start. */
  preview?: { root: string; mean: string }[];
  /** When Daily is banked, the preview lines are a done recap (✓ on each). */
  previewDone?: boolean;
}

export interface TierItem {
  kind: 'tier';
  key: string;
  icon: string;
  jewel: string;
  title: string;
  sub: string;
  t: TierNum;
  done: number;
  total: number;
  pct: number;
  locked: boolean;
  /** Collection stars (0–5) from tier completion — the gold ★★★☆☆ row. */
  stars: number;
  /** The tier the learner is currently working through — the HERE / PLAY pill. */
  current: boolean;
}

export type MenuItem = ModeItem | TierItem;

export interface HomeMenu {
  /** Rows in the main listbox (playable / not tucked). */
  items: MenuItem[];
  /** Tiers folded under "More tiers" so they don't dominate the first screen. */
  tucked: TierItem[];
}

export interface TierStat {
  done: number;
  total: number;
  pct: number;
}

/** Brand-new learner: no roots owned yet. Entitlement does not matter. */
export function isFirstVisit(completed: Set<string>): boolean {
  return completed.size === 0;
}

/** Owned at least one post-Starter (Tier 2+) root — they started the next tier. */
export function hasStartedPostStarter(completed: Set<string>): boolean {
  return ROOTS.some((r) => r.t > 1 && completed.has(rootId(r)));
}

/** Played Root Rush or finished Daily — they chose a mode. */
export function hasChosenMode(stats: { runs: number; lastDailyDay: string | null }): boolean {
  return stats.runs > 0 || stats.lastDailyDay != null;
}

/**
 * The root the fat Play button should open: first unlearned openable root,
 * or — just after Starter, before they start the next tier — the first
 * next-tier root even if it is still paywalled (Play Auto, not a locked store).
 */
export function nextPlayRoot(completed: Set<string>, entitled: boolean): Root | undefined {
  const openable = ROOTS.find(
    (r) => isRootOpenable(rootId(r), entitled) && !completed.has(rootId(r)),
  );
  if (openable) return openable;
  if (!rootsInTier(1).some((r) => !completed.has(rootId(r))) && !hasStartedPostStarter(completed)) {
    return ROOTS.find((r) => !completed.has(rootId(r)));
  }
  return undefined;
}

/**
 * One fat next Play — hide Rush / Daily / locked tiers.
 *
 * True through Starter (#29: any Tier 1 root still unlearned). Stays true
 * after Starter while a next root can be offered (openable, or the first
 * next-tier root) and they have not yet chosen a mode or started that
 * next tier. False on the returning-dashboard threshold — not the instant
 * the last Starter root is owned.
 */
export function isNextPlayHome(
  completed: Set<string>,
  entitled: boolean = false,
  opts: { choseMode?: boolean } = {},
): boolean {
  if (rootsInTier(1).some((r) => !completed.has(rootId(r)))) return true;
  if (opts.choseMode || hasStartedPostStarter(completed)) return false;
  return nextPlayRoot(completed, entitled) != null;
}

/** Live owned/total/percent for a tier from the completed-root set. */
export function tierStats(t: TierNum, completed: Set<string>): TierStat {
  const roots = rootsInTier(t);
  const total = roots.length;
  const done = roots.reduce((n, r) => n + (completed.has(rootId(r)) ? 1 : 0), 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

/** The tier the learner is currently working through (drives the default selection). */
export function pickCurrentTier(completed: Set<string>, entitled: boolean): TierNum {
  const resumeId = resumeRootId(completed, entitled);
  if (resumeId) return ROOTS_BY_ID[resumeId]!.t;
  for (let t = 1 as TierNum; t <= 5; t = (t + 1) as TierNum) {
    const s = tierStats(t, completed);
    if (s.total > 0 && s.pct < 100 && (t === 1 || entitled)) return t;
  }
  return 1;
}

/** First incomplete & openable root in a tier (the resume point), else its first root. */
export function tierEntryRoot(t: TierNum, completed: Set<string>, entitled: boolean) {
  const roots = rootsInTier(t);
  return (
    roots.find((r) => isRootOpenable(rootId(r), entitled) && !completed.has(rootId(r))) ?? roots[0]
  );
}

/** Display name of the root a tap on this tier should open (e.g. "Bio"). */
export function entryRootName(t: TierNum, completed: Set<string>, entitled: boolean): string {
  return tierEntryRoot(t, completed, entitled)?.root ?? 'Bio';
}

/**
 * Index into `items` (the main list, not tucked rows) for the current tier.
 * Next-Play board puts the play-now tier at 0; returning dashboard finds
 * the resume tier after the modes.
 */
export function defaultSelectedIndex(items: MenuItem[], currentTier: TierNum): number {
  const idx = items.findIndex((it) => it.kind === 'tier' && it.t === currentTier && !it.locked);
  return idx >= 0 ? idx : 0;
}

/** Kid-facing list heading: start/play on the next-Play board, resume on the dashboard. */
export function listHeading(nextPlay: boolean): string {
  return nextPlay ? 'Start playing' : 'Jump back in';
}

/** Primary CTA on a playable tier. Next-Play board says Play, not Continue. */
export function tierPrimaryLabel(opts: {
  nextPlay: boolean;
  complete: boolean;
  rootName: string;
}): string {
  if (opts.nextPlay) return `Play ${opts.rootName} ›`;
  if (opts.complete) return 'Replay tier ›';
  return `Continue ${opts.rootName} ›`;
}

/** Collapsed-row label for tucked higher tiers. */
export function tuckedSummary(tucked: TierItem[]): string {
  if (tucked.length === 0) return '';
  const allLocked = tucked.every((t) => t.locked);
  return allLocked ? 'More tiers 🔒' : 'More tiers';
}

/**
 * Build the home menu. A tier is locked when it isn't free (Tier 1) and the
 * learner isn't entitled — the same free/paid line the gating module enforces.
 *
 * Next-Play board: the current play-now tier only (Starter, then Builder…).
 * Root Rush, Daily, and other tiers stay off the board while `isNextPlayHome`.
 * Returning dashboard: Root Rush / Daily, then unlocked tiers; locked paid
 * tiers tucked under More.
 */
export function buildMenu(
  completed: Set<string>,
  entitled: boolean,
  opts: {
    currentTier?: TierNum;
    rushBest?: string;
    dailyStreak?: number;
    dailyDone?: boolean;
    dailyPreview?: { root: string; mean: string }[];
    nextPlay?: boolean;
    choseMode?: boolean;
  } = {},
): HomeMenu {
  const nextPlay =
    opts.nextPlay ?? isNextPlayHome(completed, entitled, { choseMode: opts.choseMode });
  const modes: MenuItem[] = [
    {
      kind: 'mode',
      key: 'rush',
      icon: '🎯',
      jewel: 'fire',
      title: 'Root Rush',
      sub: 'Combo run · match roots to meanings',
      best: opts.rushBest,
    },
    {
      kind: 'mode',
      key: 'daily',
      icon: '📅',
      jewel: 'gold',
      title: 'Daily Challenge',
      sub: opts.dailyDone
        ? 'Done for today · same five until tomorrow'
        : 'Five fresh roots · keep your streak',
      badge: opts.dailyDone ? 'DONE' : undefined,
      best: opts.dailyStreak && opts.dailyStreak > 0 ? `🔥 ${opts.dailyStreak}` : undefined,
      preview: opts.dailyPreview,
      previewDone: Boolean(opts.dailyDone && opts.dailyPreview && opts.dailyPreview.length > 0),
    },
  ];

  const tiers: TierItem[] = TIERS.map((tier, i) => {
    const t = (i + 1) as TierNum;
    const meta = TIER_META[i]!;
    const { done, total, pct } = tierStats(t, completed);
    const locked = t !== 1 && !entitled;
    return {
      kind: 'tier',
      key: `tier-${t}`,
      icon: meta.icon,
      jewel: meta.jewel,
      title: `Tier ${t} · ${tier.n}`,
      sub: tier.sub,
      t,
      done,
      total,
      pct,
      locked,
      stars: starsForPct(pct),
      current: !locked && t === opts.currentTier,
    };
  });

  const starter = tiers.find((t) => t.t === 1)!;
  const unlocked = tiers.filter((t) => !t.locked);
  const locked = tiers.filter((t) => t.locked);

  if (nextPlay) {
    const next = nextPlayRoot(completed, entitled);
    const playTier = tiers.find((row) => row.t === (next?.t ?? 1)) ?? starter;
    return { items: [{ ...playTier, locked: false, current: true }], tucked: [] };
  }
  return { items: [...modes, ...unlocked], tucked: locked };
}

/**
 * Home master-detail menu model — ported from the design package
 * (rootwork/ui_kits/rootwork-app/home.html `ITEMS`).
 *
 * First visit (0 roots owned): Starter only — Root Rush, Daily, and locked
 * tiers stay hidden so a kid sees one tap into Bio. Returning visit (≥1 root):
 * modes then unlocked tiers (resume); locked paid tiers tuck under
 * "More tiers". Tier stats are derived live from the completed-root set.
 */
import {
  ROOTS_BY_ID,
  TIERS,
  isRootOpenable,
  resumeRootId,
  rootsInTier,
  rootId,
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
 * First visit puts Starter at 0; returning visit finds the resume tier after the modes.
 */
export function defaultSelectedIndex(items: MenuItem[], currentTier: TierNum): number {
  const idx = items.findIndex((it) => it.kind === 'tier' && it.t === currentTier && !it.locked);
  return idx >= 0 ? idx : 0;
}

/** Kid-facing list heading: start/play on first visit, resume once they own a root. */
export function listHeading(firstVisit: boolean): string {
  return firstVisit ? 'Start playing' : 'Jump back in';
}

/** Primary CTA on a playable tier. First visit says play, not continue. */
export function tierPrimaryLabel(opts: {
  firstVisit: boolean;
  complete: boolean;
  rootName: string;
}): string {
  if (opts.firstVisit) return `Play ${opts.rootName} ›`;
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
 * First visit: Starter only. Root Rush, Daily, and tiers 2–5 stay off the
 * board until the learner owns a root.
 * Returning: Root Rush / Daily, then unlocked tiers; locked paid tiers tucked.
 */
export function buildMenu(
  completed: Set<string>,
  entitled: boolean,
  opts: {
    currentTier?: TierNum;
    rushBest?: string;
    dailyStreak?: number;
    dailyDone?: boolean;
    firstVisit?: boolean;
  } = {},
): HomeMenu {
  const firstVisit = opts.firstVisit ?? isFirstVisit(completed);
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

  if (firstVisit) {
    return { items: [starter], tucked: [] };
  }
  return { items: [...modes, ...unlocked], tucked: locked };
}

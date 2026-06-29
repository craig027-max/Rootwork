/**
 * Home master-detail menu model — ported from the design package
 * (rootwork/ui_kits/rootwork-app/home.html `ITEMS`). The rows are the two game
 * modes followed by the five curriculum tiers; tier stats are derived live from
 * the learner's completed-root set (no placeholder numbers).
 */
import { TIERS, rootsInTier, rootId, type TierNum } from '../../data/roots';

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
}

export type MenuItem = ModeItem | TierItem;

export interface TierStat {
  done: number;
  total: number;
  pct: number;
}

/** Live owned/total/percent for a tier from the completed-root set. */
export function tierStats(t: TierNum, completed: Set<string>): TierStat {
  const roots = rootsInTier(t);
  const total = roots.length;
  const done = roots.reduce((n, r) => n + (completed.has(rootId(r)) ? 1 : 0), 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

/**
 * Build the home menu: Root Rush + Daily Challenge, then the five tiers. A tier
 * is locked when it isn't free (Tier 1) and the learner isn't entitled — the
 * same free/paid line the gating module enforces.
 */
export function buildMenu(completed: Set<string>, entitled: boolean): MenuItem[] {
  const modes: MenuItem[] = [
    {
      kind: 'mode',
      key: 'rush',
      icon: '🎯',
      jewel: 'fire',
      title: 'Root Rush',
      sub: 'Timed combo run · match root to meaning',
    },
    {
      kind: 'mode',
      key: 'daily',
      icon: '📅',
      jewel: 'gold',
      title: 'Daily Challenge',
      sub: 'New roots every day · coming soon',
      badge: 'SOON',
      disabled: true,
    },
  ];

  const tiers: MenuItem[] = TIERS.map((tier, i) => {
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
    };
  });

  return [...modes, ...tiers];
}

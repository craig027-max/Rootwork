import { ROOTS, TIERS, type TierNum } from '../../data/roots';
import type { TierStat } from './menu';

/**
 * Profile band — avatar, identity, and the real stats we actually track
 * (roots owned + current-tier progress). The design's streak / stars / accuracy
 * / level have no data source yet (the quiz doesn't persist a score), so they're
 * intentionally omitted rather than faked.
 *
 * TODO(gamification): once quiz scoring + streak tracking land, restore the
 * 🔥 streak / ★ stars / % accuracy / LV badge from home.html.
 */
export function ProfileBand({
  name,
  avatar,
  rootsOwned,
  currentTier,
  currentTierStat,
}: {
  name: string;
  avatar: string;
  rootsOwned: number;
  currentTier: TierNum;
  currentTierStat: TierStat;
}) {
  const tierName = TIERS[currentTier - 1]?.n ?? 'Starter';
  return (
    <section className="ww-profile">
      <div className="ww-avatar" aria-hidden="true">
        {avatar}
      </div>
      <div className="ww-pinfo">
        <div className="ww-hello">Welcome back</div>
        <h1>{name}</h1>
        <div className="ww-rank">
          Owns {rootsOwned} of {ROOTS.length} roots
        </div>
      </div>
      <div className="ww-stats">
        <div className="ww-stat">
          <div className="v">{rootsOwned}</div>
          <div className="l">Roots Owned</div>
        </div>
        <div className="ww-stat">
          <div className="v">{currentTierStat.pct}%</div>
          <div className="l">{tierName} Tier</div>
        </div>
      </div>
    </section>
  );
}

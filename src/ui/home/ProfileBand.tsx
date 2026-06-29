import { ROOTS } from '../../data/roots';
import { accuracyPct, levelForXp, type GameStats } from '../../core/stats';

/**
 * Profile band — avatar + level badge, identity, and the gamified stats, all
 * fed from real activity (core/stats): daily streak, stars banked, lifetime
 * quiz accuracy, and roots owned. Accuracy reads "—" until the first quiz run
 * so a brand-new learner never sees a misleading 0%.
 */
export function ProfileBand({
  name,
  avatar,
  rootsOwned,
  stats,
}: {
  name: string;
  avatar: string;
  rootsOwned: number;
  stats: GameStats;
}) {
  const level = levelForXp(stats.xp);
  const accuracy = accuracyPct(stats);
  return (
    <section className="ww-profile">
      <div className="ww-avatar" aria-hidden="true">
        {avatar}
        <span className="lvl">LV {level}</span>
      </div>
      <div className="ww-pinfo">
        <div className="ww-hello">Welcome back</div>
        <h1>{name}</h1>
        <div className="ww-rank">
          Level {level} · {stats.xp} XP · owns {rootsOwned} of {ROOTS.length} roots
        </div>
      </div>
      <div className="ww-stats">
        <div className="ww-stat streak">
          <div className="v">🔥 {stats.streakCurrent}</div>
          <div className="l">Day Streak</div>
        </div>
        <div className="ww-stat stars">
          <div className="v">★ {stats.totalStars}</div>
          <div className="l">Stars</div>
        </div>
        <div className="ww-stat acc">
          <div className="v">{accuracy === null ? '—' : `${accuracy}%`}</div>
          <div className="l">Accuracy</div>
        </div>
        <div className="ww-stat roots">
          <div className="v">{rootsOwned}</div>
          <div className="l">Roots Owned</div>
        </div>
      </div>
    </section>
  );
}

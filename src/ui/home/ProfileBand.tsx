import { ROOTS } from '../../data/roots';
import { accuracyPct, levelForXp, XP_PER_LEVEL, type GameStats } from '../../core/stats';

/** Local calendar day as YYYY-MM-DD — mirrors the store's todayKey(). */
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Profile band — avatar + level badge, identity, and the gamified stats, all
 * fed from real activity (core/stats): daily streak, stars banked, lifetime
 * quiz accuracy, and roots owned. Accuracy and streak read "—" until the first
 * real activity so a brand-new learner never sees a misleading 0. The rank
 * line names the XP still needed for the next level (the aspirational hook
 * from the design package), with a thin XP bar underneath so a kid can see
 * they're 60% of the way there.
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
  const intoLevel = stats.xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - intoLevel;
  const firstRun = rootsOwned === 0 && stats.runs === 0;
  const activeToday = stats.lastActiveDay === todayKey();

  return (
    <section className="ww-profile">
      <div className="ww-avatar" aria-hidden="true">
        {avatar}
        <span className="lvl">LV {level}</span>
      </div>
      <div className="ww-pinfo">
        <div className="ww-hello">{firstRun ? 'Grow your first root 🌱' : 'Welcome back'}</div>
        <h1>{name}</h1>
        <div className="ww-rank">
          Level {level} · {stats.xp} XP · {xpToNext} XP to level {level + 1}
        </div>
        <div className="ww-xpbar" aria-hidden="true">
          <i style={{ width: `${Math.round((intoLevel / XP_PER_LEVEL) * 100)}%` }} />
        </div>
      </div>
      <div className="ww-stats">
        <div
          className="ww-stat streak"
          title={
            stats.streakCurrent === 0
              ? 'Learn a root or run a quiz to start your streak!'
              : activeToday
                ? 'Streak banked for today ✓'
                : 'Play today to keep your streak!'
          }
        >
          <div className="v">
            {stats.streakCurrent === 0 ? '—' : `🔥 ${stats.streakCurrent}${activeToday ? ' ✓' : ''}`}
          </div>
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
          <div className="v">
            {rootsOwned}
            <span className="of"> / {ROOTS.length}</span>
          </div>
          <div className="l">Roots Owned</div>
        </div>
      </div>
    </section>
  );
}

import { ROOTS } from '../../data/roots';
import { levelForXp, XP_PER_LEVEL, type GameStats } from '../../core/stats';
import { localDayKey } from '../../core/daily';
import { buildProfileProgress } from './profileProgress';

/**
 * Profile band — avatar + level badge, identity, and the stats a kid has
 * actually earned. Streak risk is a visible status line (phones have no
 * hover tooltip). Stars / accuracy stay off until a real Rush run; first-run
 * drops the XP chrome so Play Bio stays on screen.
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
  const day = localDayKey();
  const vm = buildProfileProgress(stats, rootsOwned, day, ROOTS.length);
  const level = levelForXp(stats.xp);
  const intoLevel = stats.xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - intoLevel;
  const slim = vm.stats.length <= 2;

  return (
    <section
      className={`ww-profile${vm.firstRun ? ' is-first' : ''}${slim ? ' is-slim' : ''}${
        vm.streakKind === 'risk' ? ' is-risk' : ''
      }${vm.streakKind === 'banked' ? ' is-banked' : ''}`}
      aria-label="Your progress"
    >
      <div className="ww-avatar" aria-hidden="true">
        {avatar}
        <span className="lvl">LV {level}</span>
      </div>
      <div className="ww-pinfo">
        <div className="ww-hello">{vm.hello}</div>
        <h1>{name}</h1>
        {vm.hint ? (
          <div className={`ww-profile-hint is-${vm.streakKind}`} role="status">
            {vm.hint}
          </div>
        ) : null}
        {vm.showXp ? (
          <>
            <div className="ww-rank">
              Level {level} · {stats.xp} XP · {xpToNext} XP to level {level + 1}
            </div>
            <div className="ww-xpbar" aria-hidden="true">
              <i style={{ width: `${Math.round((intoLevel / XP_PER_LEVEL) * 100)}%` }} />
            </div>
          </>
        ) : null}
      </div>
      <div className="ww-stats">
        {vm.stats.map((stat) => (
          <div className={`ww-stat ${stat.key}`} key={stat.key}>
            <div className="v">
              {stat.value}
              {stat.suffix ? <span className="of">{stat.suffix}</span> : null}
            </div>
            <div className="l">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

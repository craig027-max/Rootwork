import { ROOTS } from '../../data/roots';
import { levelForXp, XP_PER_LEVEL, type GameStats } from '../../core/stats';
import { localDayKey } from '../../core/daily';
import { Button } from '../components/Button';
import { buildProfileProgress } from './profileProgress';
import { buildTodayProgress } from './todayProgress';

/**
 * Profile band — avatar + level badge, identity, the stats a kid has
 * actually earned, and (on the returning dashboard) today's checklist
 * with Continue {root} as the fat tap. Streak risk stays a visible
 * status line. First-run still drops the extra chrome so Play Bio wins.
 */
export function ProfileBand({
  name,
  avatar,
  rootsOwned,
  stats,
  nextPlay,
  completed,
  entitled,
  dailyDone,
  onContinue,
  onDaily,
}: {
  name: string;
  avatar: string;
  rootsOwned: number;
  stats: GameStats;
  nextPlay: boolean;
  completed: Set<string>;
  entitled: boolean;
  dailyDone: boolean;
  onContinue: (rootId: string) => void;
  onDaily: () => void;
}) {
  const day = localDayKey();
  const vm = buildProfileProgress(stats, rootsOwned, day, ROOTS.length);
  const today = buildTodayProgress({
    firstRun: vm.firstRun,
    nextPlay,
    dailyDone,
    completed,
    entitled,
  });
  const level = levelForXp(stats.xp);
  const intoLevel = stats.xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - intoLevel;
  const slim = vm.stats.length <= 2;

  function runAction(action: 'daily' | 'learn' | 'none', rootId?: string) {
    if (action === 'daily') onDaily();
    else if (action === 'learn' && rootId) onContinue(rootId);
  }

  const todayCta = today.cta;

  return (
    <section
      className={`ww-profile${vm.firstRun ? ' is-first' : ''}${slim ? ' is-slim' : ''}${
        vm.streakKind === 'risk' ? ' is-risk' : ''
      }${vm.streakKind === 'banked' ? ' is-banked' : ''}${today.show ? ' is-today' : ''}`}
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
      {today.show ? (
        <div className="ww-today">
          <div className="ww-today-h">{today.heading}</div>
          <div className="ww-today-list" role="list" aria-label="Today">
            {today.items.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`ww-today-item${item.done ? ' is-done' : ''}`}
                onClick={() => runAction(item.action, item.rootId)}
              >
                <span className="ww-today-mark" aria-hidden="true">
                  {item.done ? '✓' : '○'}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          {todayCta ? (
            <div className="ww-today-cta">
              <Button size="lg" block onClick={() => runAction(todayCta.kind, todayCta.rootId)}>
                {todayCta.label}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

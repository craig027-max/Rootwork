import { ROOTS } from '../../data/roots';
import { levelForXp, XP_PER_LEVEL, type GameStats } from '../../core/stats';
import { localDayKey } from '../../core/daily';
import { Button } from '../components/Button';
import { buildProfileProgress, profileHeroForToday } from './profileProgress';
import type { TodayProgress } from './todayProgress';

/**
 * Profile band — avatar + level badge, identity, the stats a kid has
 * actually earned, and (on the returning dashboard) today's checklist.
 * After they learn a root, that row checks off (Learned {root}) and
 * reviews that root as Remember — one beat, then Home, not Geo. When Daily is banked too the
 * heading is Today ✓ and the fat tap is Keep going · {root} (or Rush).
 * A live Rush miss blocks that check — Remember Geo is the fat tap
 * and the Home hello / hint, not Nice work / Welcome back / Streak
 * banked ✓ over Missed Geo. Remember {stale root} is the retention
 * beat — one-tap, hold meaning, then Home. Does not block Today ✓.
 * Streak risk stays a visible status line. First-run still drops the
 * extra chrome so Play Bio wins.
 */
export function ProfileBand({
  name,
  avatar,
  rootsOwned,
  stats,
  today,
  onContinue,
  onRemember,
  onDaily,
  onRush,
}: {
  name: string;
  avatar: string;
  rootsOwned: number;
  stats: GameStats;
  today: TodayProgress;
  onContinue: (rootId: string) => void;
  onRemember: (rootId: string) => void;
  onDaily: () => void;
  onRush: () => void;
}) {
  const day = localDayKey();
  const vm = buildProfileProgress(stats, rootsOwned, day, ROOTS.length);
  const missHero = today.missWaiting && today.cta?.kind === 'remember';
  const hero = profileHeroForToday(vm, {
    pathDone: today.pathDone,
    missWaiting: missHero,
    missName: today.missName,
    missRecap: today.recap,
  });
  const level = levelForXp(stats.xp);
  const intoLevel = stats.xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - intoLevel;
  const slim = hero.stats.length <= 2;

  function runAction(
    action: 'daily' | 'learn' | 'rush' | 'review' | 'remember' | 'none',
    rootId?: string,
  ) {
    if (action === 'daily') onDaily();
    else if (action === 'learn' && rootId) onContinue(rootId);
    else if ((action === 'review' || action === 'remember') && rootId) onRemember(rootId);
    else if (action === 'rush') onRush();
  }

  const todayCta = today.cta;

  return (
    <section
      className={`ww-profile${vm.firstRun ? ' is-first' : ''}${slim ? ' is-slim' : ''}${
        missHero ? ' is-miss' : vm.streakKind === 'risk' ? ' is-risk' : ''
      }${hero.celebrateBanked ? ' is-banked' : ''}${today.show ? ' is-today' : ''}${
        today.pathDone ? ' is-today-done' : ''
      }`}
      aria-label="Your progress"
    >
      <div className="ww-avatar" aria-hidden="true">
        {avatar}
        <span className="lvl">LV {level}</span>
      </div>
      <div className="ww-pinfo">
        <div className={`ww-hello${missHero ? ' is-miss' : ''}`}>{hero.hello}</div>
        <h1>{name}</h1>
        {hero.hint ? (
          <div className={`ww-profile-hint is-${hero.hintKind}`} role="status">
            {hero.hint}
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
        {hero.stats.map((stat) => (
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
        <div className={`ww-today${today.pathDone ? ' is-done' : ''}${today.missWaiting ? ' is-miss' : ''}`}>
          <div className="ww-today-h" role={today.pathDone ? 'status' : undefined}>
            {today.heading}
          </div>
          {today.recap ? (
            <div className={`ww-today-recap${today.missWaiting ? ' is-miss' : ''}`}>{today.recap}</div>
          ) : null}
          <div className="ww-today-list" role="list" aria-label="Today">
            {today.items.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`ww-today-item${item.done ? ' is-done' : ''}${
                  item.key === 'remember' ? ' is-remember' : ''
                }${item.missed ? ' is-miss' : ''}`}
                disabled={item.action === 'none'}
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
            <div className={`ww-today-cta${today.missWaiting && todayCta.kind === 'remember' ? ' is-miss' : ''}`}>
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

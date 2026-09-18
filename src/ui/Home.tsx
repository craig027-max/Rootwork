import { useState } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { ROOTS, rootId, isRootOpenable, type TierNum } from '../data/roots';
import { DEFAULT_AVATAR } from '../data/avatars';
import {
  dailyNextRoot,
  dailyResumePreview,
  dailySeed,
  dailyTilePreview,
  localDayKey,
  pickDailyRoots,
  liveDailyResumeQi,
} from '../core/daily';
import { recapOpenForId, recapOpenForRoot } from '../core/deckFlow';
import { homeRushRecapPreview, liveRushRecap, todayRushRecap } from '../core/rushRecap';
import {
  buildMenu,
  hasChosenMode,
  homeSecondaryAction,
  homeSelectedIndex,
  isDailyResumeItem,
  isNextPlayHome,
  isResumeTier,
  listHeading,
  pickCurrentTier,
  rushBestLabel,
  tierPrimaryOpen,
  type MenuItem,
} from './home/menu';
import { homeSampleAction } from './home/samplePeek';
import { ProfileBand } from './home/ProfileBand';
import { TierMenu } from './home/TierMenu';
import { DetailPanel } from './home/DetailPanel';
import { buildDetailVM } from './home/detailVM';
import { RootIndex } from './deck/RootIndex';
import { dailyDonePrimary, learnNextAction } from './modes/modeHandoff';
import { buildProfileProgress } from './home/profileProgress';
import {
  buildTodayProgress,
  learnedRootToday,
  listRushMissRemember,
  pickRememberRoot,
  rememberRootToday,
  rootLabel,
} from './home/todayProgress';

export function Home() {
  const entitled = useEntitledForDisplay();
  const completed = useWondralStore((s) => s.completedRoots);
  const progress = useWondralStore((s) => s.progress);
  const stats = useWondralStore((s) => s.stats);
  const dailyRun = useWondralStore((s) => s.dailyRun);
  const rushRecap = useWondralStore((s) => s.rushRecap);
  const students = useWondralStore((s) => s.students);
  const activeStudentId = useWondralStore((s) => s.activeStudentId);
  const openRoot = useWondralStore((s) => s.openRoot);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const setView = useWondralStore((s) => s.setView);
  const setSelectedTier = useWondralStore((s) => s.setSelectedTier);

  const choseMode = hasChosenMode(stats);
  const nextPlay = isNextPlayHome(completed, entitled, { choseMode });
  const currentTier = pickCurrentTier(completed, entitled);
  const rushBest = rushBestLabel(stats);
  const day = localDayKey();
  const dailyDone = stats.lastDailyDay === day;
  const dailyRoots = pickDailyRoots(
    ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)),
    dailySeed(day, activeStudentId),
  );
  const dailyResumeQi = liveDailyResumeQi(
    dailyRun,
    day,
    activeStudentId,
    dailyRoots.length,
    stats.lastDailyDay,
  );
  const dailyNext = dailyNextRoot(dailyRoots, dailyResumeQi);
  const profile = buildProfileProgress(stats, completed.size, day);
  const learnedId = learnedRootToday(progress, day);
  const rememberedId = rememberRootToday(progress, day);
  const nextLearn = learnNextAction(completed, entitled);
  const lastRush = liveRushRecap(rushRecap, activeStudentId);
  const rushToday = todayRushRecap(rushRecap, activeStudentId, day);
  const rememberExclude = [learnedId, nextLearn.rootId, ...dailyRoots.map((r) => rootId(r))];
  const rushMissIds = listRushMissRemember(rushToday, progress, day, {
    exclude: rememberExclude,
  });
  const rushMissId = rushMissIds[0] ?? null;
  const rememberId =
    rushMissId ??
    rememberedId ??
    pickRememberRoot(progress, day, {
      exclude: rememberExclude,
    });
  const rememberAlso = rootLabel(rushMissIds[1]).name;
  const learn = rootLabel(nextLearn.rootId);
  const remember = rootLabel(rememberId);
  const today = buildTodayProgress({
    firstRun: profile.firstRun,
    nextPlay,
    dailyDone,
    dailyResumeQi,
    dailyTotal: dailyRoots.length,
    dailyNextName: dailyNext?.root,
    dailyNextMean: dailyNext?.mean,
    dailyRecapNames: dailyRoots.map((r) => r.root),
    completed,
    entitled,
    learnedToday: learnedId !== null,
    learnedRoot: rootLabel(learnedId).name,
    learnedRootId: learnedId ?? undefined,
    learnMean: learn.mean,
    rememberedToday: rushMissId == null && rememberedId !== null,
    rememberRoot: remember.name,
    rememberMean: remember.mean,
    rememberRootId: rememberId ?? undefined,
    rememberMissed: rushMissId != null,
    rememberAlso,
  });
  const missHero = Boolean(today.missWaiting && today.cta?.kind === 'remember' && rushMissId);
  const dailyPreview =
    dailyResumeQi != null
      ? dailyResumePreview(dailyRoots, dailyResumeQi)
      : dailyTilePreview(dailyRoots);
  const rushPreview = homeRushRecapPreview(lastRush, {
    dailyResume: dailyResumeQi != null,
  });
  const { items, tucked } = buildMenu(completed, entitled, {
    currentTier,
    rushBest,
    dailyStreak: stats.streakCurrent,
    dailyDone,
    dailyResumeQi,
    dailyTotal: dailyRoots.length,
    dailyPreview,
    rushPreview,
    dailyNextName: dailyNext?.root,
    rushMissName: missHero ? remember.name : undefined,
    nextPlay,
  });
  const allItems = [...items, ...tucked];
  const [picked, setPicked] = useState<number | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const selectedIndex = homeSelectedIndex(picked, items, currentTier, {
    dailyResume: dailyResumeQi != null,
    dailyDone,
    learnedToday: learnedId !== null,
    rushToday: rushToday != null,
  });
  const selected = allItems[Math.min(selectedIndex, allItems.length - 1)]!;

  const activeStudent = students.find((s) => s.id === activeStudentId) ?? null;
  const name = activeStudent?.nickname ?? 'Explorer';
  const avatar = activeStudent?.avatar ?? DEFAULT_AVATAR;

  function openTier(t: TierNum) {
    const entry = tierPrimaryOpen(t, completed, entitled);
    if (entry) {
      setSelectedTier(t);
      openRoot(entry.id, { entry: entry.entry });
    }
  }

  function onPrimary(item: MenuItem) {
    if (item.kind === 'mode') {
      if (item.key === 'rush') {
        setView('quiz');
        return;
      }
      if (item.key === 'daily') {
        if (dailyDone && learnedId == null) {
          const next = dailyDonePrimary(completed, entitled, { learnedToday: false });
          if (next.kind === 'learn' && next.rootId) {
            openRoot(next.rootId);
            return;
          }
          if (next.kind === 'rush') {
            setView('quiz');
            return;
          }
        }
        setView('daily');
      }
      return;
    }
    if (item.locked) requestUpgrade();
    else openTier(item.t);
  }

  function onSecondary(item: MenuItem) {
    const tap = homeSecondaryAction(item, {
      dailyResumeQi,
      rememberMissId: missHero ? rushMissId : null,
      dailyDone,
      learnedToday: learnedId !== null,
    });
    if (tap.kind === 'daily') {
      setView('daily');
      return;
    }
    if (tap.kind === 'remember') {
      openRoot(tap.rootId, { entry: 'remember' });
      return;
    }
    if (tap.kind === 'index') {
      setIndexOpen(true);
      return;
    }
    if (tap.kind === 'upgrade') requestUpgrade();
    else openTier(tap.t);
  }

  function onRecap(name: string) {
    const recap = recapOpenForRoot(name, completed);
    if (recap) openRoot(recap.id, { entry: recap.entry });
  }

  function onSamplePick(name: string) {
    const tap = homeSampleAction(selected, name, { dailyDone });
    if (!tap) return;
    if (tap.kind === 'daily') {
      setView('daily');
      return;
    }
    onRecap(tap.name);
  }

  function onBrowsePick(id: string) {
    const recap = recapOpenForId(id, completed);
    setIndexOpen(false);
    if (recap) openRoot(recap.id, { entry: recap.entry });
  }

  const vm = buildDetailVM(selected, {
    dailyRoots,
    dailyDone,
    dailyResumeQi,
    dailyTotal: dailyRoots.length,
    streak: stats.streakCurrent,
    nextPlay,
    completed,
    entitled,
    pathDone: today.pathDone,
    learnedToday: learnedId !== null,
    rememberMissId: missHero ? rushMissId : null,
    rememberMissName: missHero ? remember.name : undefined,
    rememberAlso: missHero ? rememberAlso : undefined,
    rushRuns: stats.runs,
    rushBestPct: stats.bestPct,
    rushBestStars: stats.bestStars,
    rushBestScore: stats.bestScore ?? 0,
    rushRecap: lastRush,
  });
  const resumeNow =
    !nextPlay && (isResumeTier(selected) || isDailyResumeItem(selected));

  return (
    <div className={`ww-home${nextPlay ? ' is-first' : ''}${resumeNow ? ' is-resume' : ''}`}>
      <ProfileBand
        name={name}
        avatar={avatar}
        rootsOwned={completed.size}
        stats={stats}
        today={today}
        onContinue={(id) => openRoot(id)}
        onRemember={(id) => openRoot(id, { entry: 'remember' })}
        onDaily={() => setView('daily')}
        onRush={() => setView('quiz')}
      />

      <div className={`ww-home-grid${nextPlay ? ' is-first' : ''}${resumeNow ? ' is-resume' : ''}`}>
        <div className="ww-home-list">
          <div className="ww-panel-label">
            <span className="n">{listHeading(nextPlay, { pathDone: today.pathDone })}</span>
            {nextPlay ? null : (
              <>
                <span className="s kb-hint">↑ ↓ to browse · Enter to start</span>
                <span className="s tap-hint">Tap to preview · tap again to start</span>
              </>
            )}
          </div>
          <TierMenu
            items={items}
            tucked={tucked}
            selectedIndex={selectedIndex}
            nextPlay={nextPlay}
            onSelect={setPicked}
            onActivate={onPrimary}
          />
        </div>
        <div className="ww-home-preview">
          <div className="ww-panel-label">
            <span className="n">Preview</span>
            <span className="s">
              {selected.kind === 'mode'
                ? 'Game mode'
                : selected.locked
                  ? 'Locked tier'
                  : nextPlay
                    ? 'Tap play'
                    : resumeNow
                      ? today.pathDone
                        ? 'Keep going'
                        : 'Tap continue'
                      : 'Your progress'}
            </span>
          </div>
          <DetailPanel
            vm={vm}
            onPrimary={() => onPrimary(selected)}
            onSecondary={() => onSecondary(selected)}
            onSample={vm.sampleTap ? onSamplePick : undefined}
          />
        </div>
      </div>
      {indexOpen ? (
        <RootIndex
          entitled={entitled}
          completed={completed}
          onPick={onBrowsePick}
          onClose={() => setIndexOpen(false)}
        />
      ) : null}
    </div>
  );
}

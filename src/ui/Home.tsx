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
import { recapOpenForRoot } from '../core/deckFlow';
import {
  buildMenu,
  hasChosenMode,
  homeSelectedIndex,
  isDailyResumeItem,
  isNextPlayHome,
  isResumeTier,
  listHeading,
  pickCurrentTier,
  rushBestLabel,
  tierEntryRoot,
  type MenuItem,
} from './home/menu';
import { ProfileBand } from './home/ProfileBand';
import { TierMenu } from './home/TierMenu';
import { DetailPanel } from './home/DetailPanel';
import { buildDetailVM } from './home/detailVM';
import { learnNextAction } from './modes/modeHandoff';
import { buildProfileProgress } from './home/profileProgress';
import {
  buildTodayProgress,
  learnedRootToday,
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
  const rememberId =
    rememberedId ??
    pickRememberRoot(progress, day, {
      exclude: [learnedId, nextLearn.rootId, ...dailyRoots.map((r) => rootId(r))],
    });
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
    completed,
    entitled,
    learnedToday: learnedId !== null,
    learnedRoot: rootLabel(learnedId).name,
    learnedRootId: learnedId ?? undefined,
    learnMean: learn.mean,
    rememberedToday: rememberedId !== null,
    rememberRoot: remember.name,
    rememberMean: remember.mean,
    rememberRootId: rememberId ?? undefined,
  });
  const dailyPreview =
    dailyResumeQi != null
      ? dailyResumePreview(dailyRoots, dailyResumeQi)
      : dailyTilePreview(dailyRoots);
  const { items, tucked } = buildMenu(completed, entitled, {
    currentTier,
    rushBest,
    dailyStreak: stats.streakCurrent,
    dailyDone,
    dailyResumeQi,
    dailyTotal: dailyRoots.length,
    dailyPreview,
    dailyNextName: dailyNext?.root,
    nextPlay,
  });
  const allItems = [...items, ...tucked];
  const [picked, setPicked] = useState<number | null>(null);
  const selectedIndex = homeSelectedIndex(picked, items, currentTier, {
    dailyResume: dailyResumeQi != null,
  });
  const selected = allItems[Math.min(selectedIndex, allItems.length - 1)]!;

  const activeStudent = students.find((s) => s.id === activeStudentId) ?? null;
  const name = activeStudent?.nickname ?? 'Explorer';
  const avatar = activeStudent?.avatar ?? DEFAULT_AVATAR;

  function openTier(t: TierNum) {
    const entry = tierEntryRoot(t, completed, entitled);
    if (entry) {
      setSelectedTier(t);
      openRoot(rootId(entry));
    }
  }

  function onPrimary(item: MenuItem) {
    if (item.kind === 'mode') {
      if (item.key === 'rush') setView('quiz');
      if (item.key === 'daily') setView('daily');
      return;
    }
    if (item.locked) requestUpgrade();
    else openTier(item.t);
  }

  function onSecondary(item: MenuItem) {
    if (item.kind === 'mode') {
      // Mid-run Rush tile: Continue Daily · N of 5 — same tap Rush start uses.
      if (item.key === 'rush' && dailyResumeQi != null) {
        setView('daily');
        return;
      }
      const first = ROOTS[0];
      if (first) openRoot(rootId(first));
      return;
    }
    if (item.locked) requestUpgrade();
    else openTier(item.t);
  }

  function onRecap(name: string) {
    const recap = recapOpenForRoot(name, completed);
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
    rushRuns: stats.runs,
    rushBestPct: stats.bestPct,
    rushBestStars: stats.bestStars,
    rushBestScore: stats.bestScore ?? 0,
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
            onSample={vm.samplesDone ? onRecap : undefined}
          />
        </div>
      </div>
    </div>
  );
}

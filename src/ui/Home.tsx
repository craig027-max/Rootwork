import { useState } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { ROOTS, rootId, isRootOpenable, type TierNum } from '../data/roots';
import { DEFAULT_AVATAR } from '../data/avatars';
import { dailySeed, dailyTilePreview, localDayKey, pickDailyRoots } from '../core/daily';
import {
  buildMenu,
  hasChosenMode,
  homeSelectedIndex,
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

export function Home() {
  const entitled = useEntitledForDisplay();
  const completed = useWondralStore((s) => s.completedRoots);
  const stats = useWondralStore((s) => s.stats);
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
  const dailyPreview = dailyTilePreview(dailyRoots);
  const { items, tucked } = buildMenu(completed, entitled, {
    currentTier,
    rushBest,
    dailyStreak: stats.streakCurrent,
    dailyDone,
    dailyPreview,
    nextPlay,
  });
  const allItems = [...items, ...tucked];
  const [picked, setPicked] = useState<number | null>(null);
  const selectedIndex = homeSelectedIndex(picked, items, currentTier);
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
      const first = ROOTS[0];
      if (first) openRoot(rootId(first));
      return;
    }
    if (item.locked) requestUpgrade();
    else openTier(item.t);
  }

  const vm = buildDetailVM(selected, {
    dailyRoots,
    dailyDone,
    streak: stats.streakCurrent,
    nextPlay,
    completed,
    entitled,
    rushRuns: stats.runs,
    rushBestPct: stats.bestPct,
    rushBestStars: stats.bestStars,
    rushBestScore: stats.bestScore ?? 0,
  });
  const resumeNow = !nextPlay && isResumeTier(selected);

  return (
    <div className={`ww-home${nextPlay ? ' is-first' : ''}${resumeNow ? ' is-resume' : ''}`}>
      <ProfileBand name={name} avatar={avatar} rootsOwned={completed.size} stats={stats} />

      <div className={`ww-home-grid${nextPlay ? ' is-first' : ''}${resumeNow ? ' is-resume' : ''}`}>
        <div className="ww-home-list">
          <div className="ww-panel-label">
            <span className="n">{listHeading(nextPlay)}</span>
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
                      ? 'Tap continue'
                      : 'Your progress'}
            </span>
          </div>
          <DetailPanel
            vm={vm}
            onPrimary={() => onPrimary(selected)}
            onSecondary={() => onSecondary(selected)}
          />
        </div>
      </div>
    </div>
  );
}

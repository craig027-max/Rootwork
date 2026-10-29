import { useState } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { ROOTS, rootId, isRootOpenable, type TierNum } from '../data/roots';
import { DEFAULT_AVATAR } from '../data/avatars';
import {
  applyDailyAskedPreview,
  applyDailyPendingPreview,
  dailyAskedRecapNames,
  dailyNextRoot,
  dailyResumePreview,
  dailySeed,
  dailyTilePreview,
  liveDailyAsked,
  liveDailyPending,
  localDayKey,
  pickDailyRoots,
  liveDailyResumeQi,
} from '../core/daily';
import { dailyShownNext } from '../core/recall';
import { askedChipOpen, browseOpenForId, recapOpenForRoot } from '../core/deckFlow';
import { homeRushRecapPreview, liveRushRecap, todayRushRecap } from '../core/rushRecap';
import {
  buildMenu,
  hasChosenMode,
  homeSecondaryAction,
  homeSelectedIndex,
  isDailyResumeItem,
  isNextPlayHome,
  isResumeTier,
  isMissProgressTier,
  listHeading,
  listHint,
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
import { dailyDonePrimary, learnNextAction, rushLearnReady } from './modes/modeHandoff';
import { liveStreakCount, streakHold } from '../core/stats';
import { buildProfileProgress } from './home/profileProgress';
import {
  buildTodayProgress,
  learnedRootToday,
  listRushMissAsked,
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
  const dailyPool = ROOTS.filter((r) => isRootOpenable(rootId(r), entitled));
  const dailyRoots = pickDailyRoots(dailyPool, dailySeed(day, activeStudentId));
  const dailyResumeQi = liveDailyResumeQi(
    dailyRun,
    day,
    activeStudentId,
    dailyRoots.length,
    stats.lastDailyDay,
  );
  const dailyNext = dailyNextRoot(dailyRoots, dailyResumeQi);
  const dailyFace = dailyShownNext({
    root: dailyNext,
    pool: dailyPool,
    pending: liveDailyPending(dailyRun, day, activeStudentId),
    day,
    studentId: activeStudentId,
    qi: dailyResumeQi,
  });
  const dailyAsked = liveDailyAsked(dailyRun, day, activeStudentId);
  const dailyPreview = applyDailyPendingPreview(
    applyDailyAskedPreview(
      dailyResumeQi != null
        ? dailyResumePreview(dailyRoots, dailyResumeQi)
        : dailyTilePreview(dailyRoots),
      dailyAsked,
    ),
    dailyNext?.root,
    dailyFace,
  );
  const profile = buildProfileProgress(stats, completed.size, day);
  const streakLive = liveStreakCount(stats, day);
  const streakEnded = streakHold(stats, day) === 'lapsed' ? Math.round(stats.streakCurrent) : 0;
  const learnedId = learnedRootToday(progress, day);
  const rememberedId = rememberRootToday(progress, day);
  const nextLearn = learnNextAction(completed, entitled);
  const lastRush = liveRushRecap(rushRecap, activeStudentId);
  const rushToday = todayRushRecap(rushRecap, activeStudentId, day);
  const rememberExclude = [learnedId, nextLearn.rootId, ...dailyRoots.map((r) => rootId(r))];
  const rushMissIds = listRushMissRemember(rushToday, progress, day, {
    exclude: rememberExclude,
  });
  const rushMissAsked = listRushMissAsked(rushToday, progress, day, {
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
    dailyNextName: dailyFace?.name ?? dailyNext?.root,
    dailyNextMean: dailyFace?.mean ?? dailyNext?.mean,
    dailyRecapNames: dailyAskedRecapNames(dailyRoots, dailyAsked),
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
    rememberMissAsked: rushMissAsked[0]?.name,
    rememberMissAskedMean: rushMissAsked[0]?.mean,
    rememberAlso,
    rememberAlsoAsked: rushMissAsked[1]?.name,
  });
  const missHero = Boolean(today.missWaiting && today.cta?.kind === 'remember' && rushMissId);
  const learnHeroCta = rushLearnReady(completed, entitled, {
    dailyResumeQi,
    dailyTotal: dailyRoots.length,
    dailyDone,
    learnedToday: learnedId !== null,
    rememberMissId: rushMissId,
    rememberMissName: remember.name,
    rememberAlso,
  });
  const learnHero = learnHeroCta != null;
  const rushPreview = homeRushRecapPreview(lastRush, {
    dailyResume: dailyResumeQi != null,
  });
  const { items, tucked } = buildMenu(completed, entitled, {
    currentTier,
    rushBest,
    dailyStreak: streakLive,
    dailyStreakEnded: streakEnded > 0 ? streakEnded : undefined,
    dailyDone,
    dailyResumeQi,
    dailyTotal: dailyRoots.length,
    dailyPreview,
    rushPreview,
    dailyNextName: dailyFace?.name ?? dailyNext?.root,
    dailyNextMean: dailyFace?.mean,
    rushMissName: missHero ? (today.missName ?? remember.name) : undefined,
    rushMissId: missHero ? rushMissId ?? undefined : undefined,
    rushMissMean: missHero && rushMissAsked[0] ? (rushMissAsked[0].mean ?? '') : undefined,
    rushMissAlso: missHero ? (rushMissAsked[1]?.name ?? rememberAlso) : undefined,
    rushMissAlsoId: missHero ? rushMissIds[1] : undefined,
    rushMissAlsoMean: missHero && rushMissAsked[1] ? (rushMissAsked[1].mean ?? '') : undefined,
    rushLearnName: learnHero ? learnHeroCta.rootName ?? learn.name : undefined,
    rushKeepGoing: Boolean(learnHero && today.pathDone),
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
        if (learnHero && learnHeroCta.rootId) {
          openRoot(learnHeroCta.rootId);
          return;
        }
        if (missHero && rushMissId) {
          openRoot(rushMissId, { entry: 'remember' });
          return;
        }
        setView('quiz');
        return;
      }
      if (item.key === 'daily') {
        if (dailyDone && missHero && rushMissId) {
          openRoot(rushMissId, { entry: 'remember' });
          return;
        }
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
    if (missHero && rushMissId && isMissProgressTier(item)) {
      openRoot(rushMissId, { entry: 'remember' });
    } else if (item.locked) requestUpgrade();
    else {
      openTier(item.t);
    }
  }

  function onSecondary(item: MenuItem) {
    const tap = homeSecondaryAction(item, {
      dailyResumeQi,
      rememberMissId: missHero ? rushMissId : null,
      dailyDone,
      learnedToday: learnedId !== null,
      learnWaiting: learnHero,
    });
    if (tap.kind === 'daily') {
      setView('daily');
      return;
    }
    if (tap.kind === 'rush') {
      setView('quiz');
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

  function onSamplePick(name: string, asked?: string) {
    const tap = homeSampleAction(selected, name, {
      dailyDone,
      rememberMissName: missHero ? remember.name : undefined,
      rememberAlso: missHero ? rememberAlso : undefined,
    });
    if (!tap) return;
    if (tap.kind === 'daily') {
      setView('daily');
      return;
    }
    const catalog = ROOTS.find((r) => r.root === tap.name);
    const replayMiss =
      missHero &&
      (asked === rushMissAsked[0]?.name || asked === rushMissAsked[1]?.name);
    const open = catalog && !replayMiss ? askedChipOpen(rootId(catalog), completed, asked) : null;
    if (open?.entry === 'asked') {
      openRoot(open.id, { entry: open.entry, focusWord: open.focusWord });
      return;
    }
    onRecap(tap.name);
  }

  function onBrowsePick(id: string, focusWord?: string) {
    const recap = browseOpenForId(id, completed, focusWord);
    setIndexOpen(false);
    if (recap) openRoot(recap.id, { entry: recap.entry, focusWord: recap.focusWord });
  }

  const vm = buildDetailVM(selected, {
    dailyRoots,
    dailyDone,
    dailyResumeQi,
    dailyAsked,
    dailyNextFace: dailyFace,
    dailyTotal: dailyRoots.length,
    streak: streakLive,
    streakEnded: streakEnded > 0 ? streakEnded : undefined,
    nextPlay,
    completed,
    entitled,
    pathDone: today.pathDone,
    learnedToday: learnedId !== null,
    rememberMissId: missHero ? rushMissId : null,
    rememberMissName: missHero ? remember.name : undefined,
    rememberMissAsked: missHero ? rushMissAsked[0]?.name : undefined,
    rememberMissAskedMean: missHero ? rushMissAsked[0]?.mean : undefined,
    rememberAlso: missHero ? rememberAlso : undefined,
    rememberAlsoId: missHero ? rushMissIds[1] : undefined,
    rememberAlsoAsked: missHero ? rushMissAsked[1]?.name : undefined,
    rememberAlsoAskedMean: missHero ? rushMissAsked[1]?.mean : undefined,
    rushRuns: stats.runs,
    rushBestPct: stats.bestPct,
    rushBestStars: stats.bestStars,
    rushBestScore: stats.bestScore ?? 0,
    rushRecap: lastRush,
  });
  const resumeNow =
    !nextPlay &&
    (isResumeTier(selected) ||
      isDailyResumeItem(selected) ||
      (learnHero && selected.kind === 'mode' && selected.key === 'rush') ||
      (missHero &&
        ((selected.kind === 'mode' && (selected.key === 'daily' || selected.key === 'rush')) ||
          isMissProgressTier(selected))));

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
            <span className="n">
              {listHeading(nextPlay, { pathDone: today.pathDone, missWaiting: missHero })}
            </span>
            {nextPlay ? null : (
              <>
                <span className={`s kb-hint${missHero ? ' is-miss' : ''}`}>
                  {listHint({ missWaiting: missHero, pointer: 'keys' })}
                </span>
                <span className={`s tap-hint${missHero ? ' is-miss' : ''}`}>
                  {listHint({ missWaiting: missHero, pointer: 'tap' })}
                </span>
              </>
            )}
          </div>
          <TierMenu
            items={items}
            tucked={tucked}
            selectedIndex={selectedIndex}
            nextPlay={nextPlay}
            missWaiting={missHero}
            onSelect={setPicked}
            onActivate={onPrimary}
          />
        </div>
        <div className="ww-home-preview">
          <div className="ww-panel-label">
            <span className="n">Preview</span>
            <span className="s">
              {selected.kind === 'mode'
                ? missHero
                  ? 'Remember'
                  : learnHero && selected.key === 'rush'
                    ? today.pathDone
                      ? 'Keep going'
                      : 'Tap continue'
                    : 'Game mode'
                : missHero && isMissProgressTier(selected)
                  ? 'Remember'
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
          rememberMissIds={missHero ? rushMissIds : undefined}
          onPick={onBrowsePick}
          onClose={() => setIndexOpen(false)}
        />
      ) : null}
    </div>
  );
}

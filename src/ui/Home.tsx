import { useState, type ReactNode } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import {
  ROOTS,
  PALETTES,
  TIERS,
  rootsInTier,
  rootId,
  isRootOpenable,
  type Root,
  type TierNum,
} from '../data/roots';
import { DEFAULT_AVATAR } from '../data/avatars';
import { gradeForPct } from '../core/stats';
import { dailySeed, localDayKey, pickDailyRoots } from '../core/daily';
import {
  buildMenu,
  defaultSelectedIndex,
  entryRootName,
  isNextPlayHome,
  listHeading,
  pickCurrentTier,
  tierEntryRoot,
  tierPrimaryLabel,
  type MenuItem,
} from './home/menu';
import { ProfileBand } from './home/ProfileBand';
import { TierMenu } from './home/TierMenu';
import { DetailPanel, type DetailVM } from './home/DetailPanel';

const SAMPLE_COUNT = 4;

function sceneFrom(root: Root | undefined, fallback: { key: string; palKey: string; caption: string }) {
  const palKey = root?.pal ?? fallback.palKey;
  const p = PALETTES[palKey] ?? PALETTES.green!;
  return {
    key: root?.scene ?? fallback.key,
    pal: p.pal,
    caption: root ? `${root.root} · ${root.mean}` : fallback.caption,
  };
}

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

  const nextPlay = isNextPlayHome(completed);
  const currentTier = pickCurrentTier(completed, entitled);
  const rushBest =
    stats.runs > 0 ? `${gradeForPct(stats.bestPct)} · ${stats.bestStars}★` : undefined;
  const day = localDayKey();
  const dailyDone = stats.lastDailyDay === day;
  const dailyRoots = pickDailyRoots(
    ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)),
    dailySeed(day, activeStudentId),
  );
  const { items, tucked } = buildMenu(completed, entitled, {
    currentTier,
    rushBest,
    dailyStreak: stats.streakCurrent,
    dailyDone,
    nextPlay,
  });
  const allItems = [...items, ...tucked];
  const [selectedIndex, setSelectedIndex] = useState(() => defaultSelectedIndex(items, currentTier));
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
  });

  return (
    <div className={`ww-home${nextPlay ? ' is-first' : ''}`}>
      <ProfileBand name={name} avatar={avatar} rootsOwned={completed.size} stats={stats} />

      <div className={`ww-home-grid${nextPlay ? ' is-first' : ''}`}>
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
            onSelect={setSelectedIndex}
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

/** Derive the detail-panel view model from the selected menu row + live progress. */
function buildDetailVM(
  item: MenuItem,
  extra: {
    dailyRoots: Root[];
    dailyDone: boolean;
    streak: number;
    nextPlay: boolean;
    completed: Set<string>;
    entitled: boolean;
  },
): DetailVM {
  if (item.kind === 'mode') {
    const starter = rootsInTier(1).slice(0, 3);
    if (item.key === 'rush') {
      return {
        jewel: item.jewel,
        animKey: item.key,
        eyebrow: 'Quiz Mode',
        big: 'Root Rush',
        lead: 'Match roots to meanings and rack up combos — every right answer in a row multiplies your score. Ten questions a run; beat your best.',
        samples: starter.map((r) => ({ root: r.root, mean: r.mean })),
        moreCount: 0,
        primary: { label: 'Start the run 🎯' },
        secondary: { label: 'Browse roots' },
        scene: sceneFrom(undefined, { key: 'heat', palKey: 'fire', caption: 'Root Rush' }),
      };
    }
    const dailySamples = extra.dailyRoots.length > 0 ? extra.dailyRoots : starter;
    const streakLine =
      extra.streak > 0
        ? extra.dailyDone
          ? ` Streak banked — 🔥 ${extra.streak} day${extra.streak === 1 ? '' : 's'}.`
          : ` You're on a 🔥 ${extra.streak}-day streak.`
        : '';
    return {
      jewel: item.jewel,
      animKey: item.key,
      eyebrow: 'Daily Challenge',
      big: 'Daily',
      lead: `Five fresh roots every day. See the animation, tap what it means, keep your streak.${streakLine}`,
      samples: dailySamples.map((r) => ({ root: r.root, mean: r.mean })),
      moreCount: 0,
      primary: { label: extra.dailyDone ? 'Play again 📅' : 'Start daily 📅' },
      secondary: { label: 'Browse roots' },
      scene: sceneFrom(dailySamples[0], { key: 'stars', palKey: 'gold', caption: 'Daily' }),
    };
  }

  const roots = rootsInTier(item.t);
  const samples = roots.slice(0, SAMPLE_COUNT);
  const name = TIERS[item.t - 1]?.n ?? 'Starter';
  const preview = sceneFrom(samples[0], { key: 'dna', palKey: item.jewel, caption: name });
  const rootName = entryRootName(item.t, extra.completed, extra.entitled);

  if (item.locked) {
    return {
      jewel: item.jewel,
      animKey: item.key,
      eyebrow: item.title,
      big: name,
      locked: true,
      lead: leadWithRoots(`${name} unlocks the full curriculum — roots like `, samples.slice(0, 3)),
      samples: samples.map((r) => ({ root: r.root, mean: r.mean })),
      moreCount: Math.max(0, item.total - samples.length),
      primary: { label: '🔓 Ask a grown-up to unlock' },
      scene: preview,
    };
  }

  const complete = item.pct === 100;
  const firstPlay = extra.nextPlay && item.t === 1;
  return {
    jewel: item.jewel,
    animKey: item.key,
    eyebrow: item.title,
    big: name,
    lead: firstPlay
      ? leadWithRoots('Play to meet ', samples.slice(0, 3))
      : leadWithRoots(`${item.sub} — roots like `, samples.slice(0, 3)),
    ring: firstPlay ? undefined : { pct: item.pct, label: complete ? '✓' : `${item.pct}%` },
    pmA: firstPlay ? undefined : `${item.done} of ${item.total} roots owned`,
    pmB: firstPlay ? undefined : complete ? 'Tier complete' : `${item.total - item.done} roots to go`,
    samples: samples.map((r) => ({ root: r.root, mean: r.mean })),
    moreCount: Math.max(0, item.total - samples.length),
    primary: { label: tierPrimaryLabel({ nextPlay: firstPlay, complete, rootName }) },
    secondary: firstPlay ? undefined : { label: 'See all roots' },
    scene: preview,
    heroCta: firstPlay,
  };
}

function leadWithRoots(prefix: string, samples: Root[]): ReactNode {
  return (
    <>
      {prefix}
      {samples.map((r, i) => (
        <span key={rootId(r)}>
          <b>{r.root}</b>
          {i < samples.length - 1 ? ', ' : '.'}
        </span>
      ))}
    </>
  );
}

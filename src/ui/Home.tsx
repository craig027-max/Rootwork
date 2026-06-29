import { useState, type ReactNode } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import {
  ROOTS,
  ROOTS_BY_ID,
  TIERS,
  rootsInTier,
  rootId,
  isRootOpenable,
  resumeRootId,
  type Root,
  type TierNum,
} from '../data/roots';
import { DEFAULT_AVATAR } from '../data/avatars';
import { buildMenu, tierStats, type MenuItem } from './home/menu';
import { ProfileBand } from './home/ProfileBand';
import { TierMenu } from './home/TierMenu';
import { DetailPanel, type DetailVM } from './home/DetailPanel';

const SAMPLE_COUNT = 4;

/** Menu index for a tier number (modes occupy slots 0–1). */
const tierMenuIndex = (t: TierNum) => t + 1;

/** First incomplete & openable root in a tier (the resume point), else its first root. */
function tierEntryRoot(t: TierNum, completed: Set<string>, entitled: boolean): Root | undefined {
  const roots = rootsInTier(t);
  return (
    roots.find((r) => isRootOpenable(rootId(r), entitled) && !completed.has(rootId(r))) ?? roots[0]
  );
}

/** The tier the learner is currently working through (drives the default selection). */
function pickCurrentTier(completed: Set<string>, entitled: boolean): TierNum {
  const resumeId = resumeRootId(completed, entitled);
  if (resumeId) return ROOTS_BY_ID[resumeId]!.t;
  for (let t = 1 as TierNum; t <= 5; t = (t + 1) as TierNum) {
    const s = tierStats(t, completed);
    if (s.total > 0 && s.pct < 100 && (t === 1 || entitled)) return t;
  }
  return 1;
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

export function Home() {
  const entitled = useEntitledForDisplay();
  const completed = useWondralStore((s) => s.completedRoots);
  const students = useWondralStore((s) => s.students);
  const activeStudentId = useWondralStore((s) => s.activeStudentId);
  const openRoot = useWondralStore((s) => s.openRoot);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const setView = useWondralStore((s) => s.setView);
  const setSelectedTier = useWondralStore((s) => s.setSelectedTier);

  const items = buildMenu(completed, entitled);
  const currentTier = pickCurrentTier(completed, entitled);
  const [selectedIndex, setSelectedIndex] = useState(() => tierMenuIndex(currentTier));
  const selected = items[Math.min(selectedIndex, items.length - 1)]!;

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

  const vm = buildDetailVM(selected);

  return (
    <div className="ww-home">
      <ProfileBand
        name={name}
        avatar={avatar}
        rootsOwned={completed.size}
        currentTier={currentTier}
        currentTierStat={tierStats(currentTier, completed)}
      />

      <div className="ww-home-grid">
        <div>
          <div className="ww-panel-label">
            <span className="n">Jump back in</span>
            <span className="s">↑ ↓ to browse · Enter to start</span>
          </div>
          <TierMenu
            items={items}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onActivate={onPrimary}
          />
        </div>
        <div>
          <div className="ww-panel-label">
            <span className="n">Preview</span>
            <span className="s">
              {selected.kind === 'mode'
                ? 'Game mode'
                : selected.locked
                  ? 'Locked tier'
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
function buildDetailVM(item: MenuItem): DetailVM {
  if (item.kind === 'mode') {
    const starter = rootsInTier(1).slice(0, 3);
    if (item.key === 'rush') {
      return {
        jewel: item.jewel,
        animKey: item.key,
        eyebrow: 'Quiz Mode',
        big: 'Root Rush',
        lead: 'Match each root to its meaning before the timer runs out. Eight questions a run — build your streak and beat your best.',
        samples: starter.map((r) => ({ root: r.root, mean: r.mean })),
        moreCount: 0,
        primary: { label: 'Start the run 🎯' },
        secondary: { label: 'Browse roots' },
      };
    }
    return {
      jewel: item.jewel,
      animKey: item.key,
      eyebrow: 'Daily Challenge',
      big: 'Daily',
      lead: 'Five fresh roots every day to keep your streak alive. This mode is coming soon.',
      samples: starter.map((r) => ({ root: r.root, mean: r.mean })),
      moreCount: 0,
      primary: { label: 'Coming soon', disabled: true },
    };
  }

  const roots = rootsInTier(item.t);
  const samples = roots.slice(0, SAMPLE_COUNT);
  const name = TIERS[item.t - 1]?.n ?? 'Starter';

  if (item.locked) {
    return {
      jewel: item.jewel,
      animKey: item.key,
      eyebrow: item.title,
      big: name,
      lead: leadWithRoots(`${name} unlocks the full curriculum — roots like `, samples.slice(0, 3)),
      samples: samples.map((r) => ({ root: r.root, mean: r.mean })),
      moreCount: Math.max(0, item.total - samples.length),
      primary: { label: `🔓 Unlock Tier ${item.t}` },
      secondary: { label: 'Preview roots' },
    };
  }

  const complete = item.pct === 100;
  return {
    jewel: item.jewel,
    animKey: item.key,
    eyebrow: item.title,
    big: name,
    lead: leadWithRoots(`${item.sub} — roots like `, samples.slice(0, 3)),
    ring: { pct: item.pct, label: complete ? '✓' : `${item.pct}%` },
    pmA: `${item.done} of ${item.total} roots owned`,
    pmB: complete ? 'Tier complete' : `${item.total - item.done} roots to go`,
    samples: samples.map((r) => ({ root: r.root, mean: r.mean })),
    moreCount: Math.max(0, item.total - samples.length),
    primary: { label: complete ? 'Replay tier ›' : 'Continue tier ›' },
    secondary: { label: 'See all roots' },
  };
}

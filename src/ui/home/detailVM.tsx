import type { ReactNode } from 'react';
import { PALETTES, TIERS, rootsInTier, rootId, type Root } from '../../data/roots';
import { dailyTilePreview } from '../../core/daily';
import { gradeForPct } from '../../core/stats';
import { entryRootName, rushBestLabel, tierPrimaryLabel, type MenuItem } from './menu';
import type { DetailVM } from './DetailPanel';

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

/** Derive the detail-panel view model from the selected menu row + live progress. */
export function buildDetailVM(
  item: MenuItem,
  extra: {
    dailyRoots: Root[];
    dailyDone: boolean;
    streak: number;
    nextPlay: boolean;
    completed: Set<string>;
    entitled: boolean;
    rushRuns?: number;
    rushBestPct?: number;
    rushBestStars?: number;
    rushBestScore?: number;
  },
): DetailVM {
  if (item.kind === 'mode') {
    if (item.key === 'rush') {
      const played = (extra.rushRuns ?? 0) > 0;
      const bestPct = extra.rushBestPct ?? 0;
      const bestStars = extra.rushBestStars ?? 0;
      const bestScore = extra.rushBestScore ?? 0;
      const recap = rushBestLabel({
        runs: extra.rushRuns ?? 0,
        bestPct,
        bestStars,
        bestScore,
      });
      const recapLine = recap
        ? ` Best so far — ${recap}${bestScore > 0 ? ' combo' : ''}.`
        : '';
      return {
        jewel: item.jewel,
        animKey: item.key,
        eyebrow: 'Quiz Mode',
        big: 'Root Rush',
        lead: `Match roots to meanings and rack up combos — every right answer in a row multiplies your score. Ten questions a run; beat your best.${recapLine}`,
        ring: played
          ? { pct: bestPct, label: gradeForPct(bestPct) }
          : undefined,
        pmA: played ? `${bestStars}★ best` : undefined,
        pmB: played
          ? bestScore > 0
            ? `${bestScore.toLocaleString('en-US')} combo`
            : 'Ten questions a run'
          : undefined,
        samples: [],
        moreCount: 0,
        primary: { label: played ? 'Play again 🎯' : 'Start the run 🎯' },
        secondary: { label: 'Browse roots' },
        scene: sceneFrom(undefined, { key: 'heat', palKey: 'fire', caption: 'Root Rush' }),
      };
    }
    const dailySamples = dailyTilePreview(extra.dailyRoots);
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
      samples: dailySamples,
      sampleLines: true,
      samplesDone: extra.dailyDone && dailySamples.length > 0,
      moreCount: Math.max(0, extra.dailyRoots.length - dailySamples.length),
      primary: { label: extra.dailyDone ? 'Play again 📅' : 'Start daily 📅' },
      secondary: { label: 'Browse roots' },
      scene: sceneFrom(extra.dailyRoots[0], { key: 'stars', palKey: 'gold', caption: 'Daily' }),
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
  const firstPlay = extra.nextPlay;
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

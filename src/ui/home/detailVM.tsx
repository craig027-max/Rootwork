import type { ReactNode } from 'react';
import { PALETTES, ROOTS, ROOTS_BY_ID, TIERS, rootId, rootsInTier, type Root } from '../../data/roots';
import {
  continueDailyLabel,
  dailyDoneLead,
  dailyNextRoot,
  dailyResumePreview,
  dailyTilePreview,
} from '../../core/daily';
import { gradeForPct } from '../../core/stats';
import {
  entryRootName,
  rushBestLabel,
  tierEntryRoot,
  tierPrimaryLabel,
  tierTilePreview,
  TIER_TILE_PREVIEW_COUNT,
  type MenuItem,
} from './menu';
import { dailyDonePrimary, dailyWaitingLine, rushMissRememberReady } from '../modes/modeHandoff';
import {
  homeRushRecapPreview,
  peekChipDone,
  rememberMissCtaLabel,
  todayMissRecap,
  type RushRecap,
} from '../../core/rushRecap';
import { samplePeekTap } from './samplePeek';
import type { DetailVM } from './DetailPanel';

function sceneFrom(root: Root | undefined, fallback: { key: string; palKey: string; caption: string }) {
  const palKey = root?.pal ?? fallback.palKey;
  const p = PALETTES[palKey] ?? PALETTES.green!;
  return {
    key: root?.scene ?? fallback.key,
    pal: p.pal,
    caption: root ? `${root.root} · ${root.mean}` : fallback.caption,
  };
}

/** Derive the detail-panel view model from the selected menu row + live progress.
 *  Rush mid-run peeks Daily · N of 5 · {root} and offers Continue Daily —
 *  Browse roots must not dump Bio while Chron is still waiting. Named
 *  peek chips are real taps (Remember / Continue Daily / Continue {root}).
 *  Last Rush recap chips Remember the real run — never a Bio / Geo / Photo
 *  teaser. Hits keep ✓; a miss stays unmarked. Mid-run Daily keeps that
 *  tile empty so Chron stays the hero. After Daily is banked and today's
 *  learn is still open, Continue {root} is the fat tap — Play again must
 *  not sit over Chron. Done lead recaps today's five — not a fresh-start
 *  pitch. Recap chips Remember owned / Meet unowned. After Daily + a
 *  learn, an owned miss names Remember on the Rush tile — Play again /
 *  Browse roots must not sit over Geo. */
export function buildDetailVM(
  item: MenuItem,
  extra: {
    dailyRoots: Root[];
    dailyDone: boolean;
    /** Next unanswered Daily index when a mid-run is live. */
    dailyResumeQi?: number | null;
    dailyTotal?: number;
    streak: number;
    nextPlay: boolean;
    completed: Set<string>;
    entitled: boolean;
    /** Today ✓ — resume CTA is Keep going, not another Continue. */
    pathDone?: boolean;
    learnedToday?: boolean;
    rememberMissId?: string | null;
    rememberMissName?: string;
    rememberAlso?: string;
    rushRuns?: number;
    rushBestPct?: number;
    rushBestStars?: number;
    rushBestScore?: number;
    /** Last finished Rush — named Remember chips, not a Starter teaser. */
    rushRecap?: RushRecap | null;
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
      const nextDaily = dailyNextRoot(extra.dailyRoots, extra.dailyResumeQi);
      const waiting = dailyWaitingLine({
        dailyResumeQi: extra.dailyResumeQi,
        dailyTotal: extra.dailyRoots.length || extra.dailyTotal,
        dailyNextName: nextDaily?.root,
        dailyNextMean: nextDaily?.mean,
      });
      const total = extra.dailyRoots.length || extra.dailyTotal || 5;
      const qi = extra.dailyResumeQi;
      const continueDaily =
        waiting &&
        typeof qi === 'number' &&
        Number.isInteger(qi) &&
        qi >= 1 &&
        qi < total
          ? continueDailyLabel(qi, total)
          : null;
      const miss = rushMissRememberReady(extra.completed, extra.entitled, {
        dailyResumeQi: extra.dailyResumeQi,
        dailyTotal: extra.dailyRoots.length || extra.dailyTotal,
        dailyDone: extra.dailyDone,
        learnedToday: extra.learnedToday,
        rememberMissId: extra.rememberMissId,
        rememberMissName: extra.rememberMissName,
        rememberAlso: extra.rememberAlso,
      });
      const rushSamples = homeRushRecapPreview(extra.rushRecap, {
        dailyResume: Boolean(continueDaily),
      });
      const rushMore = extra.rushRecap
        ? Math.max(0, extra.rushRecap.roots.length - rushSamples.length)
        : 0;
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
        samples: rushSamples,
        sampleLines: rushSamples.length > 0,
        samplesDone: rushSamples.length > 0 && rushSamples.every((s) => peekChipDone({ ok: s.ok })),
        sampleTap: samplePeekTap({ mode: 'rush', sampleCount: rushSamples.length }),
        moreCount: rushMore,
        primary: { label: played ? 'Play again 🎯' : 'Start the run 🎯' },
        // Mid-run: Continue Daily. Path-done miss: Remember Geo.
        // Browse roots must not dump Bio over either.
        secondary: {
          label: continueDaily ?? (miss ? rememberMissCtaLabel(miss.name) : 'Browse roots'),
        },
        waiting: continueDaily ? waiting : miss ? todayMissRecap(miss.name, miss.also) : waiting,
        waitingMiss: Boolean(miss && !continueDaily),
        scene: sceneFrom(undefined, { key: 'heat', palKey: 'fire', caption: 'Root Rush' }),
      };
    }
    const dailyResume =
      extra.dailyResumeQi != null && extra.dailyResumeQi >= 1 ? extra.dailyResumeQi : null;
    const nextDaily = dailyNextRoot(extra.dailyRoots, dailyResume);
    const dailySamples = extra.dailyDone
      ? dailyTilePreview(extra.dailyRoots)
      : dailyResume != null
        ? dailyResumePreview(extra.dailyRoots, dailyResume)
        : dailyTilePreview(extra.dailyRoots);
    const remainingAfterPeek =
      extra.dailyDone || dailyResume == null
        ? extra.dailyRoots.length - dailySamples.length
        : extra.dailyRoots.length - dailyResume - dailySamples.length;
    const streakLine =
      extra.streak > 0 && !extra.dailyDone
        ? ` You're on a 🔥 ${extra.streak}-day streak.`
        : '';
    const midLead = nextDaily
      ? `Next is ${nextDaily.root} — ${nextDaily.mean}. ${dailyResume} of ${extra.dailyRoots.length} already yours.`
      : `Five fresh roots every day. See the animation, tap what it means, keep your streak.`;
    const doneLead = extra.dailyDone ? dailyDoneLead(extra.streak) : null;
    const doneNext = extra.dailyDone
      ? dailyDonePrimary(extra.completed, extra.entitled, { learnedToday: extra.learnedToday })
      : null;
    // Banked Daily + unfinished Today path: Continue {learn} / Rush is the
    // fat tap. Play again stays the ghost. Once today's learn is done,
    // Daily's own tap is Play again (Keep going lives on the HERE tier).
    const doneHero = Boolean(doneNext && !extra.learnedToday);
    const nextLearnRoot =
      doneHero && doneNext?.kind === 'learn' && doneNext.rootId
        ? ROOTS_BY_ID[doneNext.rootId]
        : undefined;
    return {
      jewel: item.jewel,
      animKey: item.key,
      eyebrow: 'Daily Challenge',
      big: 'Daily',
      lead: doneLead
        ? doneLead
        : dailyResume == null
          ? `Five fresh roots every day. See the animation, tap what it means, keep your streak.${streakLine}`
          : `${midLead}${streakLine}`,
      samples: extra.dailyDone
        ? dailySamples.map((s) => ({
            ...s,
            owned: ROOTS.some((r) => r.root === s.root && extra.completed.has(rootId(r))),
          }))
        : dailySamples,
      sampleLines: true,
      samplesDone: extra.dailyDone && dailySamples.length > 0,
      samplesNext: Boolean(dailyResume != null && !extra.dailyDone && dailySamples.length > 0),
      sampleTap: samplePeekTap({
        mode: 'daily',
        dailyDone: extra.dailyDone,
        sampleCount: dailySamples.length,
      }),
      moreCount: Math.max(0, remainingAfterPeek),
      primary: {
        label: extra.dailyDone
          ? doneHero && doneNext
            ? doneNext.label
            : 'Play again 📅'
          : dailyResume != null
            ? continueDailyLabel(dailyResume, extra.dailyRoots.length || extra.dailyTotal || 5)
            : 'Start daily 📅',
      },
        // Unfinished Today path: Play again is the ghost. Otherwise Browse
        // roots opens the catalog (Remember for owned) — not Bio teach.
        secondary: { label: doneHero ? 'Play again ›' : 'Browse roots' },
      scene: sceneFrom(nextLearnRoot ?? nextDaily ?? extra.dailyRoots[0], {
        key: 'stars',
        palKey: 'gold',
        caption: 'Daily',
      }),
      // Mid-run: park Continue Daily · N of 5 under the next-root scene —
      // same one-tap Rush / Today already name, so Aqua is not buried.
      heroCta: Boolean(dailyResume != null && !extra.dailyDone),
    };
  }

  const roots = rootsInTier(item.t);
  const teaser = roots.slice(0, TIER_TILE_PREVIEW_COUNT);
  const name = TIERS[item.t - 1]?.n ?? 'Starter';
  const rootName = entryRootName(item.t, extra.completed, extra.entitled);
  const entry = tierEntryRoot(item.t, extra.completed, extra.entitled);

  if (item.locked) {
    return {
      jewel: item.jewel,
      animKey: item.key,
      eyebrow: item.title,
      big: name,
      locked: true,
      lead: leadWithNames(`${name} unlocks the full curriculum — roots like `, teaser.slice(0, 3)),
      samples: teaser.map((r) => ({ root: r.root, mean: r.mean })),
      sampleTap: samplePeekTap({ locked: true, sampleCount: teaser.length }),
      moreCount: Math.max(0, item.total - teaser.length),
      primary: { label: '🔓 Ask a grown-up to unlock' },
      scene: sceneFrom(teaser[0], { key: 'dna', palKey: item.jewel, caption: name }),
    };
  }

  const complete = item.pct === 100;
  const empty = item.done === 0;
  const firstPlay = extra.nextPlay;
  const resumeNow = !firstPlay && !complete;
  // First-run stays one Play {root} — no four-root dump. Returning dashboard
  // peeks the next unlearned roots, or recaps owned ones once the tier is done.
  // In-progress resume lifts Continue {root} to a hero tap so recap chrome
  // does not bury the one-tap.
  const peek = firstPlay
    ? []
    : tierTilePreview(item.t, extra.completed, extra.entitled, { complete });
  const sceneRoot = firstPlay
    ? entry
    : (roots.find((r) => r.root === peek[0]?.root) ?? entry ?? teaser[0]);
  const remaining = complete ? item.total - peek.length : item.total - item.done - peek.length;
  return {
    jewel: item.jewel,
    animKey: item.key,
    eyebrow: item.title,
    big: name,
    lead: firstPlay
      ? `Play to meet ${rootName}.`
      : complete
        ? `${item.sub} — every root owned.`
        : empty
          ? `Play to meet ${rootName}.`
          : leadWithNames(`${item.sub} — next up `, peek),
    ring: firstPlay ? undefined : { pct: item.pct, label: complete ? '✓' : `${item.pct}%` },
    pmA: firstPlay ? undefined : `${item.done} of ${item.total} roots owned`,
    pmB: firstPlay ? undefined : complete ? 'Tier complete' : `${item.total - item.done} roots to go`,
    samples: peek,
    sampleLines: !firstPlay && peek.length > 0,
    samplesDone: complete && peek.length > 0,
    sampleTap: samplePeekTap({
      nextPlay: firstPlay,
      complete,
      empty,
      sampleCount: peek.length,
    }),
    moreCount: firstPlay ? 0 : Math.max(0, remaining),
    primary: {
      label: tierPrimaryLabel({
        nextPlay: firstPlay,
        complete,
        rootName,
        empty,
        keepGoing: Boolean(extra.pathDone && resumeNow),
      }),
    },
    secondary: complete ? { label: 'See all roots' } : undefined,
    scene: sceneFrom(sceneRoot, { key: 'dna', palKey: item.jewel, caption: name }),
    heroCta: firstPlay || resumeNow,
  };
}

function leadWithNames(prefix: string, samples: { root: string }[]): ReactNode {
  return (
    <>
      {prefix}
      {samples.map((r, i) => (
        <span key={r.root.toLowerCase()}>
          <b>{r.root}</b>
          {i < samples.length - 1 ? ', ' : '.'}
        </span>
      ))}
    </>
  );
}

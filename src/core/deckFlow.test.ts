import { describe, expect, it } from 'vitest';
import { ROOTS, neighborOpenable, rootId, rootsInTier } from '../data/roots';
import { hearBeatChips, hearBeatIndex, hearBeatLabels } from './hearBeats';
import { HEAR_BEAT_SPLITS } from './hearBeatTimes';
import {
  afterCorrectRecall,
  afterHearNextTap,
  afterYesNextLabel,
  allowNextRootTap,
  allowWinNextTap,
  allDoneLine,
  clipListening,
  LISTENING_LINE,
  allowManualStep,
  commitCorrectAdvance,
  decideCorrectAdvance,
  deckEntryForOpen,
  entryAfterSuccess,
  hearHoldLine,
  holdHearAfterClip,
  holdYesAfterClip,
  lessonAfterCorrect,
  showExampleWords,
  starterDoneLine,
  SUCCESS_BEAT_MS,
  SUCCESS_BEAT_WITH_CLIP_MS,
  successBeatMs,
  successLine,
  waitOutCorrectAdvance,
  winLineOnCard,
} from './deckFlow';

const bio = ROOTS.find((r) => r.root === 'Bio');
const geo = ROOTS.find((r) => r.root === 'Geo');
const photo = ROOTS.find((r) => r.root === 'Photo');
const aqua = ROOTS.find((r) => r.root === 'Aqua');
if (!bio || !geo || !photo || !aqua) {
  throw new Error('fixture: expected Bio then Geo then Photo then Aqua in starter');
}

const bioId = rootId(bio);
const geoId = rootId(geo);
const photoId = rootId(photo);
const aquaId = rootId(aqua);
const lastFree = rootsInTier(1).at(-1);
if (!lastFree) throw new Error('fixture: expected a last starter root');
const lastFreeId = rootId(lastFree);
const lastAll = ROOTS.at(-1);
if (!lastAll) throw new Error('fixture: expected a last curriculum root');
const lastAllId = rootId(lastAll);
const firstPaid = ROOTS.find((r) => r.t === 2);
if (!firstPaid) throw new Error('fixture: expected a paid root after starter');

describe('afterCorrectRecall', () => {
  it('advances Bio → Geo with the same neighborOpenable(+1) Next uses', () => {
    expect(neighborOpenable(bioId, 1, false)).toBe(geoId);
    expect(neighborOpenable(geoId, -1, false)).toBe(bioId);
    expect(afterCorrectRecall(bioId, false)).toEqual({
      kind: 'next',
      id: geoId,
      line: 'Yes — Bio means life.',
    });
  });

  it('skips locked paid roots for a free learner (same as Next)', () => {
    expect(neighborOpenable(lastFreeId, 1, false)).toBeNull();
    expect(afterCorrectRecall(lastFreeId, false)).toEqual({
      kind: 'home',
      line: starterDoneLine(),
    });
  });

  it('entitled learner on the last starter still goes to the next openable root', () => {
    const next = neighborOpenable(lastFreeId, 1, true);
    expect(next).toBe(rootId(firstPaid));
    expect(afterCorrectRecall(lastFreeId, true)).toEqual({
      kind: 'next',
      id: next,
      line: successLine(lastFree),
    });
  });

  it('goes home when there is no next openable root', () => {
    expect(neighborOpenable(lastAllId, 1, true)).toBeNull();
    expect(afterCorrectRecall(lastAllId, true)).toEqual({
      kind: 'home',
      line: allDoneLine(),
    });
  });

  it('success line is one kid-safe sentence', () => {
    expect(successLine(bio)).toBe('Yes — Bio means life.');
    expect(successLine(bio).toLowerCase()).not.toMatch(/wrong|fail|shame|stupid|nope|loser/);
    expect(starterDoneLine().toLowerCase()).toContain('starter done');
  });
});

describe('Craig path: correct Bio → Geo, recall not nulled into examples', () => {
  it('shows one Yes line, then opens Geo in recall — never the examples screen', () => {
    const path = lessonAfterCorrect(bioId, false);
    expect(path.dest).toEqual({
      kind: 'next',
      id: geoId,
      line: 'Yes — Bio means life.',
    });
    expect(path.duringYes.winLine).toBe('Yes — Bio means life.');
    expect(path.duringYes.showExamples).toBe(false);
    expect(path.afterClip).toEqual({
      currentRootId: bioId,
      winLine: 'Yes — Bio means life.',
      showExamples: false,
      nextReady: true,
      nextLabel: 'Next →',
    });
    expect(path.afterBeat).toEqual({
      action: 'open',
      currentRootId: geoId,
      entry: 'recall',
      showExamples: false,
    });
    expect(commitCorrectAdvance(path.dest)).toEqual({
      kind: 'open',
      id: geoId,
      entry: 'recall',
    });
    expect(entryAfterSuccess(path.dest)).toBe('recall');
  });

  it('the live #18 reset (null recall + teach entry) is the examples screen Craig saw', () => {
    expect(
      showExampleWords({
        recall: null,
        currentRootId: geoId,
        entry: 'teach',
        correctAdvance: null,
      }),
    ).toBe(true);
    expect(
      showExampleWords({
        recall: null,
        currentRootId: bioId,
        entry: 'teach',
        correctAdvance: null,
      }),
    ).toBe(true);
    expect(deckEntryForOpen()).toBe('teach');
    expect(deckEntryForOpen({ entry: 'recall' })).toBe('recall');
  });

  it('a remount mid-Yes does not null recall into examples', () => {
    const dest = afterCorrectRecall(bioId, false);
    const remounted = {
      recall: null,
      currentRootId: bioId,
      entry: 'teach' as const,
      correctAdvance: { fromId: bioId, dest },
    };
    expect(showExampleWords(remounted)).toBe(false);
    expect(winLineOnCard(remounted)).toBe('Yes — Bio means life.');
    expect(allowManualStep(remounted.correctAdvance)).toBe(false);
    expect(allowManualStep(null)).toBe(true);
  });

  it('wrong answers never produce an advance dest — they stay on this card', () => {
    expect(allowManualStep(null)).toBe(true);
    expect(
      showExampleWords({
        recall: { win: null, rootId: bioId },
        currentRootId: bioId,
        entry: 'teach',
        correctAdvance: null,
      }),
    ).toBe(false);
  });

  it('last starter still goes home after the Yes line — no examples flash', () => {
    const path = lessonAfterCorrect(lastFreeId, false);
    expect(path.dest.kind).toBe('home');
    expect(path.duringYes.showExamples).toBe(false);
    expect(path.afterClip.currentRootId).toBe(lastFreeId);
    expect(path.afterClip.nextReady).toBe(true);
    expect(path.afterClip.nextLabel).toBe('Done →');
    expect(path.afterBeat.action).toBe('home');
    expect(commitCorrectAdvance(path.dest)).toEqual({ kind: 'home' });
  });

  it('next tap still reaches the next root in recall mode when a Yes clip plays', () => {
    const path = lessonAfterCorrect(bioId, false);
    expect(successBeatMs(true)).toBe(SUCCESS_BEAT_WITH_CLIP_MS);
    expect(successBeatMs(false)).toBe(SUCCESS_BEAT_MS);
    expect(SUCCESS_BEAT_WITH_CLIP_MS).toBeGreaterThan(SUCCESS_BEAT_MS);
    expect(SUCCESS_BEAT_WITH_CLIP_MS).toBeLessThanOrEqual(2500);
    expect(path.afterClip.currentRootId).toBe(bioId);
    expect(path.afterClip.winLine).toBe('Yes — Bio means life.');
    expect(path.afterClip.nextReady).toBe(true);
    expect(path.afterBeat).toEqual({
      action: 'open',
      currentRootId: geoId,
      entry: 'recall',
      showExamples: false,
    });
    expect(commitCorrectAdvance(path.dest)).toEqual({
      kind: 'open',
      id: geoId,
      entry: 'recall',
    });
  });

  it('on-card say stays BY-oh / JEE-oh / FOH-toh', () => {
    expect(bio.say).toBe('BY-oh');
    expect(geo.say).toBe('JEE-oh');
    expect(photo.say).toBe('FOH-toh');
  });

  it('lengthens the Yes beat to the playing clip so a 3-beat Hear is not cut off', () => {
    expect(successBeatMs(true, 4200)).toBe(4200);
    expect(successBeatMs(true, 1900)).toBe(1900);
    expect(successBeatMs(true, 400)).toBe(SUCCESS_BEAT_MS);
    expect(successBeatMs(true, null)).toBe(SUCCESS_BEAT_WITH_CLIP_MS);
    expect(successBeatMs(false, 4200)).toBe(4200);
  });

  it('does not open Geo while Bio Hear/Yes is still playing past the old 2.2s beat', () => {
    expect(
      decideCorrectAdvance({
        elapsedMs: 0,
        hasYesClip: true,
        playing: true,
        remainingMs: 4200,
        playbackEnded: false,
      }),
    ).toEqual({ action: 'wait', ms: 4200 });

    expect(
      decideCorrectAdvance({
        elapsedMs: 2200,
        hasYesClip: true,
        playing: true,
        remainingMs: 2000,
        playbackEnded: false,
      }),
    ).toEqual({ action: 'wait', ms: 2000 });

    expect(
      decideCorrectAdvance({
        elapsedMs: 4200,
        hasYesClip: true,
        playing: false,
        remainingMs: 0,
        playbackEnded: true,
      }),
    ).toEqual({ action: 'fire' });
  });

  it('keeps the 900ms read beat when the clip is already done', () => {
    expect(
      decideCorrectAdvance({
        elapsedMs: 400,
        hasYesClip: true,
        playing: false,
        remainingMs: 0,
        playbackEnded: true,
      }),
    ).toEqual({ action: 'wait', ms: SUCCESS_BEAT_MS - 400 });

    expect(
      decideCorrectAdvance({
        elapsedMs: SUCCESS_BEAT_MS,
        hasYesClip: false,
        playing: false,
        remainingMs: null,
        playbackEnded: true,
      }),
    ).toEqual({ action: 'fire' });
  });

  it('uses the 2.2s fallback only when a Yes clip is listed and duration is unknown', () => {
    expect(
      decideCorrectAdvance({
        elapsedMs: 0,
        hasYesClip: true,
        playing: false,
        remainingMs: null,
        playbackEnded: false,
      }),
    ).toEqual({ action: 'wait', ms: SUCCESS_BEAT_WITH_CLIP_MS });

    expect(
      decideCorrectAdvance({
        elapsedMs: SUCCESS_BEAT_WITH_CLIP_MS,
        hasYesClip: true,
        playing: false,
        remainingMs: null,
        playbackEnded: false,
      }),
    ).toEqual({ action: 'fire' });
  });
});

describe('waitOutCorrectAdvance: Bio audio must finish before Geo can open', () => {
  async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('does not fire while Bio is still playing after 2.2s; fires only after ended', async () => {
    let now = 0;
    let playing = true;
    let remaining: number | null = 4200;
    let resolveEnded: (() => void) | undefined;
    const ended = new Promise<void>((resolve) => {
      resolveEnded = resolve;
    });
    const pendingSleeps: Array<{ ms: number; resolve: () => void }> = [];

    let result: 'fire' | 'cancel' | null = null;
    void waitOutCorrectAdvance(
      { hasYesClip: true, startedAt: 0 },
      {
        now: () => now,
        sleep: (ms) =>
          new Promise<void>((resolve) => {
            pendingSleeps.push({ ms, resolve });
          }),
        isPlaying: () => playing,
        remainingMs: () => remaining,
        whenEnded: () => ended,
        cancelled: () => false,
      },
    ).then((value) => {
      result = value;
    });

    await flush();
    expect(result).toBeNull();
    expect(pendingSleeps[0]?.ms).toBe(4200);

    // Old 2.2s Yes beat would have opened Geo here — Bio Hear is still going.
    now = 2200;
    remaining = 2000;
    expect(result).toBeNull();

    now = 4200;
    remaining = 0;
    playing = false;
    resolveEnded?.();
    pendingSleeps[0]?.resolve();
    await flush();
    expect(result).toBe('fire');
  });

  it('after the wait, the next tap still opens Geo in recall — #19 loop is intact', async () => {
    const path = lessonAfterCorrect(bioId, false);
    expect(path.afterClip.currentRootId).toBe(bioId);
    expect(path.afterClip.winLine).toBe('Yes — Bio means life.');
    expect(path.afterClip.nextReady).toBe(true);
    expect(path.afterBeat.action).toBe('open');
    if (path.afterBeat.action !== 'open') throw new Error('expected open');
    expect(path.afterBeat.currentRootId).toBe(geoId);
    expect(path.afterBeat.entry).toBe('recall');
    expect(path.afterBeat.showExamples).toBe(false);
    expect(commitCorrectAdvance(path.dest)).toEqual({
      kind: 'open',
      id: geoId,
      entry: 'recall',
    });
  });
});

describe('after Yes clip: hold the win line until next is tapped', () => {
  function yesHoldView(fromId: typeof bioId, dest = afterCorrectRecall(fromId, false)) {
    return {
      recall: { win: dest.line, rootId: fromId },
      currentRootId: fromId,
      entry: 'teach' as const,
      correctAdvance: { fromId, dest },
    };
  }

  it('keeps the Yes win line after the clip — card is not blank', () => {
    const view = yesHoldView(bioId);
    const during = holdYesAfterClip(view, true);
    expect(during.winLine).toBe('Yes — Bio means life.');
    expect(during.blank).toBe(false);
    expect(during.nextReady).toBe(false);

    const after = holdYesAfterClip(view, false);
    expect(after.winLine).toBe('Yes — Bio means life.');
    expect(after.blank).toBe(false);
    expect(after.nextReady).toBe(true);
    expect(clipListening(false, null, true).yesNow).toBe(false);
    expect(clipListening(false, null, true).beats).toBeNull();
  });

  it('does not invent a three-beat Yes recap after the clip', () => {
    const after = clipListening(false, null, true);
    expect(after.line).toBeNull();
    expect(after.beats).toBeNull();
    expect(after.yesNow).toBe(false);
    expect(hearBeatChips(hearBeatLabels('Bio', 'BY-oh'), 0)).toHaveLength(3);
  });

  it('next tap opens Geo / Photo / Aqua on that path — not on clip end', () => {
    const hops = [
      [bioId, geoId, 'Yes — Bio means life.'],
      [geoId, photoId, 'Yes — Geo means earth.'],
      [photoId, aquaId, 'Yes — Photo means light.'],
    ] as const;

    for (const [from, to, line] of hops) {
      const path = lessonAfterCorrect(from, false);
      expect(path.afterClip.currentRootId).toBe(from);
      expect(path.afterClip.winLine).toBe(line);
      expect(path.afterClip.showExamples).toBe(false);
      expect(path.afterClip.nextReady).toBe(true);
      expect(path.afterClip.nextLabel).toBe('Next →');
      expect(path.afterBeat).toEqual({
        action: 'open',
        currentRootId: to,
        entry: 'recall',
        showExamples: false,
      });
      expect(commitCorrectAdvance(path.dest)).toEqual({
        kind: 'open',
        id: to,
        entry: 'recall',
      });
      expect(afterYesNextLabel(path.dest)).toBe('Next →');
    }
  });

  it('the old auto-open is the blank card — dest swapped in, win line gone', () => {
    const snapped = {
      recall: { win: null, rootId: geoId },
      currentRootId: geoId,
      entry: 'recall' as const,
      correctAdvance: null,
    };
    const hold = holdYesAfterClip(snapped, false);
    expect(hold.winLine).toBeNull();
    expect(hold.blank).toBe(true);
    expect(hold.nextReady).toBe(false);
  });

  it('closes the next tap while Listening… and re-enables it after the clip', () => {
    const dest = afterCorrectRecall(bioId, false);
    const advance = { fromId: bioId, dest };
    expect(allowWinNextTap(advance, true)).toBe(false);
    expect(allowWinNextTap(advance, false)).toBe(true);
    expect(allowWinNextTap(null, false)).toBe(false);
    expect(clipListening(true, null, true).disableNextRoot).toBe(true);
    expect(clipListening(false, null, true).disableNextRoot).toBe(false);
    expect(allowNextRootTap(advance, false)).toBe(false);
  });
});

describe('after Hear clip: hold spoken-sound + meaning until next tap', () => {
  function hearHold(root: typeof photo, extra: Partial<Parameters<typeof holdHearAfterClip>[0]> = {}) {
    return holdHearAfterClip({
      hearFinished: true,
      listening: false,
      won: false,
      say: root.say,
      mean: root.mean,
      ...extra,
    });
  }

  it('keeps spoken-sound + meaning after Photo / Aqua / Geo Hear — card is not blank', () => {
    const photoHold = hearHold(photo);
    expect(photoHold.line).toBe('foe toh · light');
    expect(photoHold.blank).toBe(false);
    expect(photoHold.beats).toBeNull();
    expect(photoHold.knowThisReady).toBe(true);
    expect(photoHold.line).not.toContain('FOH-toh');
    expect(photoHold.line).not.toContain('P. H. O. T. O.');

    const aquaHold = hearHold(aqua);
    expect(aquaHold.line).toBe('ah kwuh · water');
    expect(aquaHold.blank).toBe(false);
    expect(aquaHold.knowThisReady).toBe(true);

    const geoHold = hearHold(geo);
    expect(geoHold.line).toBe('jee oh · earth');
    expect(geoHold.blank).toBe(false);
    expect(geoHold.line).not.toContain('JEE-oh');

    const bioHold = hearHold(bio);
    expect(bioHold.line).toBe('bye oh · life');
    expect(bioHold.blank).toBe(false);
  });

  it('does not invent a three-beat Hear recap after the clip', () => {
    const after = hearHold(photo);
    expect(after.beats).toBeNull();
    expect(after.line).toBe('foe toh · light');
    expect(clipListening(false).line).toBeNull();
    expect(clipListening(false).beats).toBeNull();
    expect(hearBeatChips(hearBeatLabels('Photo', 'FOH-toh'), 2)).toHaveLength(3);
    expect(hearHoldLine('FOH-toh', 'light')).not.toMatch(/Photo|P\. H\. O/);
  });

  it('closes I-know-this while Listening… and re-enables it after Hear', () => {
    const during = hearHold(photo, { hearFinished: false, listening: true });
    expect(during.line).toBeNull();
    expect(during.knowThisReady).toBe(false);
    expect(clipListening(true).disableKnowThis).toBe(true);
    expect(clipListening(true).disableNextRoot).toBe(true);

    const after = hearHold(photo);
    expect(after.knowThisReady).toBe(true);
    expect(clipListening(false).disableKnowThis).toBe(false);
    expect(clipListening(false).disableNextRoot).toBe(false);
  });

  it('hides the Hear hold once Yes wins — Next stays the one tap', () => {
    const won = hearHold(photo, { won: true });
    expect(won.line).toBeNull();
    expect(won.knowThisReady).toBe(false);
    expect(won.blank).toBe(false);
  });

  it('I-know-this then continues Geo → Photo → Aqua — no Rush dump', () => {
    const hops = [
      [geo, photo, 'jee oh · earth', 'Yes — Geo means earth.'],
      [photo, aqua, 'foe toh · light', 'Yes — Photo means light.'],
    ] as const;

    for (const [from, to, hold, yes] of hops) {
      const fromId = rootId(from);
      const toId = rootId(to);
      const afterHear = hearHold(from);
      expect(afterHear.line).toBe(hold);
      expect(afterHear.knowThisReady).toBe(true);
      expect(
        afterHearNextTap({ nextPlay: true, hearFinished: true, entry: 'teach', won: false }),
      ).toEqual({ showRush: false, showNextRoot: false });

      const path = lessonAfterCorrect(fromId, false);
      expect(path.afterClip.currentRootId).toBe(fromId);
      expect(path.afterClip.winLine).toBe(yes);
      expect(path.afterClip.nextReady).toBe(true);
      expect(path.afterBeat).toEqual({
        action: 'open',
        currentRootId: toId,
        entry: 'recall',
        showExamples: false,
      });
    }
  });
});

describe('afterHearNextTap: one next tap, no Rush/Daily dump', () => {
  it('keeps Next on first-run teach until Hear finishes', () => {
    expect(
      afterHearNextTap({ nextPlay: true, hearFinished: false, entry: 'teach', won: false }),
    ).toEqual({ showRush: false, showNextRoot: true });
  });

  it('after Hear finishes on teach, only I know this remains — no Next or Rush', () => {
    expect(
      afterHearNextTap({ nextPlay: true, hearFinished: true, entry: 'teach', won: false }),
    ).toEqual({ showRush: false, showNextRoot: false });
  });

  it('after Hear/Yes opens the next root in recall, quiz is the one tap', () => {
    expect(
      afterHearNextTap({ nextPlay: true, hearFinished: false, entry: 'recall', won: false }),
    ).toEqual({ showRush: false, showNextRoot: false });
  });

  it('returning dashboard still offers Next and Rush', () => {
    expect(
      afterHearNextTap({ nextPlay: false, hearFinished: true, entry: 'teach', won: false }),
    ).toEqual({ showRush: true, showNextRoot: true });
    expect(
      afterHearNextTap({ nextPlay: false, hearFinished: false, entry: 'recall', won: false }),
    ).toEqual({ showRush: true, showNextRoot: true });
  });

  it('hides Next during the Yes beat even before the clip ends', () => {
    expect(
      afterHearNextTap({ nextPlay: true, hearFinished: false, entry: 'teach', won: true }),
    ).toEqual({ showRush: false, showNextRoot: false });
  });
});

describe('clipListening: visible wait, next-root closed while playing', () => {
  it('shows Listening… and disables I know this / next while a clip plays', () => {
    expect(clipListening(true)).toEqual({
      line: LISTENING_LINE,
      hearActive: true,
      disableKnowThis: true,
      disableNextRoot: true,
      beats: null,
      yesNow: false,
    });
    expect(LISTENING_LINE).toBe('Listening…');
    expect(LISTENING_LINE).not.toMatch(/while (Hear|Yes|you listen)/i);
    expect(LISTENING_LINE).not.toMatch(/starts during/i);
  });

  it('re-enables I know this / next when the clip ends', () => {
    expect(clipListening(false)).toEqual({
      line: null,
      hearActive: false,
      disableKnowThis: false,
      disableNextRoot: false,
      beats: null,
      yesNow: false,
    });
  });

  it('keeps Next visible on first-run teach while Hear is still playing — disable is separate from #33 hide', () => {
    expect(
      afterHearNextTap({ nextPlay: true, hearFinished: false, entry: 'teach', won: false }),
    ).toEqual({ showRush: false, showNextRoot: true });
    expect(clipListening(true).disableNextRoot).toBe(true);
  });

  it('blocks next-root taps while listening, and during the Yes beat', () => {
    expect(allowNextRootTap(null, true)).toBe(false);
    expect(allowNextRootTap(null, false)).toBe(true);
    expect(
      allowNextRootTap({ fromId: bioId, dest: afterCorrectRecall(bioId, false) }, false),
    ).toBe(false);
  });

  it('shows a moving Hear beat highlight; Yes stays Listening… without three beats', () => {
    const labels = hearBeatLabels('Bio', 'BY-oh');
    const splits = HEAR_BEAT_SPLITS.bio!;
    const at = (t: number) =>
      clipListening(true, hearBeatChips(labels, hearBeatIndex(t, splits)));

    expect(at(0).beats?.map((b) => [b.kind, b.active])).toEqual([
      ['name', true],
      ['sound', false],
      ['letters', false],
    ]);
    expect(at(1.241).beats?.find((b) => b.active)?.kind).toBe('sound');
    expect(at(2.563).beats?.find((b) => b.active)?.kind).toBe('letters');
    expect(at(1.241).line).toBe(LISTENING_LINE);
    expect(at(1.241).disableKnowThis).toBe(true);
    expect(at(1.241).disableNextRoot).toBe(true);

    expect(clipListening(true).beats).toBeNull();
    expect(clipListening(true, null).beats).toBeNull();
    expect(clipListening(true).yesNow).toBe(false);
    expect(clipListening(true, hearBeatChips(labels, 0)).yesNow).toBe(false);
  });

  it('highlights the Yes win line as one beat while Listening — no three-beat row', () => {
    const labels = hearBeatLabels('Bio', 'BY-oh');
    const hearChips = hearBeatChips(labels, 0);
    const yes = clipListening(true, null, true);

    expect(yes.line).toBe(LISTENING_LINE);
    expect(yes.yesNow).toBe(true);
    expect(yes.beats).toBeNull();
    expect(yes.hearActive).toBe(true);
    expect(yes.disableKnowThis).toBe(true);
    expect(yes.disableNextRoot).toBe(true);

    // Even if Hear chips leak in, Yes stays one beat — never a fake 3-row.
    expect(clipListening(true, hearChips, true).beats).toBeNull();
    expect(clipListening(true, hearChips, true).yesNow).toBe(true);
    expect(hearChips).toHaveLength(3);

    // Clip end drops the highlight; win line stays; next tap opens Geo.
    expect(clipListening(false, null, true).yesNow).toBe(false);
    expect(clipListening(false, null, true).line).toBeNull();
    const path = lessonAfterCorrect(bioId, false);
    expect(path.duringYes.winLine).toBe('Yes — Bio means life.');
    expect(path.afterClip.winLine).toBe('Yes — Bio means life.');
    expect(path.afterClip.currentRootId).toBe(bioId);
    expect(path.afterClip.nextReady).toBe(true);
    expect(path.afterBeat).toEqual({
      action: 'open',
      currentRootId: geoId,
      entry: 'recall',
      showExamples: false,
    });
    expect(commitCorrectAdvance(path.dest)).toEqual({
      kind: 'open',
      id: geoId,
      entry: 'recall',
    });
  });
});

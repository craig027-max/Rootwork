import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { buildRushQuestion } from './rush';
import { buildBig, buildPicksForRoot, otherPartsForRoot } from './wordParts';
import { quizGloss } from './wordDef';
import { canon } from './distractors';
import {
  RUSH_RECAP_PREVIEW_COUNT,
  homeRushRecapPreview,
  isOwnedRushMiss,
  liveRushRecap,
  parseRushRecap,
  peekChipDone,
  rushBuildHoldLine,
  rushBuildMissLine,
  rushGlossHoldLine,
  rushPartHoldLine,
  rushPartMissLine,
  rushGlossMissLine,
  rushHoldLine,
  rushMissLine,
  rushAnswerKind,
  rushComboLabel,
  rushResultTallyLabel,
  rushPracticeHoldLine,
  rushPracticeYesLine,
  RUSH_RETRY_LABEL,
  rushWordHoldLine,
  rushWordMissLine,
  rememberMissCtaLabel,
  rushAskedChip,
  rushRecapChipLabel,
  rushRecapFromRun,
  rushRecapPreview,
  todayMissRecap,
  todayRushRecap,
} from './rushRecap';

const first = firstRoot();
if (!first) throw new Error('fixture: expected Bio');
const starter = rootsInTier(1);
const geo = starter[1];
const photo = starter[2];
if (!geo || !photo) throw new Error('fixture: expected Geo / Photo');

const kidRecap = rushRecapFromRun(
  [
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
    { id: rootId(photo), ok: true },
  ],
  { day: '2026-09-15', studentId: 'kid-a' },
);

describe('parseRushRecap + liveRushRecap', () => {
  it('keeps a real last run and drops junk / another kid', () => {
    expect(kidRecap).toEqual({
      day: '2026-09-15',
      studentId: 'kid-a',
      roots: [
        { id: rootId(first), root: first.root, mean: first.mean, ok: true },
        { id: rootId(geo), root: geo.root, mean: geo.mean, ok: false },
        { id: rootId(photo), root: photo.root, mean: photo.mean, ok: true },
      ],
    });
    expect(parseRushRecap(kidRecap)).toEqual(kidRecap);
    expect(parseRushRecap({ day: 'nope', studentId: null, roots: [] })).toBeNull();
    expect(parseRushRecap({ day: '2026-09-15', roots: [{ id: '', root: 'Bio' }] })).toBeNull();
    expect(liveRushRecap(kidRecap, 'kid-a')).toEqual(kidRecap);
    expect(liveRushRecap(kidRecap, 'kid-b')).toBeNull();
    expect(liveRushRecap(kidRecap, null)).toBeNull();
    expect(liveRushRecap(null, 'kid-a')).toBeNull();
  });

  it('does not invent a Bio / Geo / Photo teaser from an empty run', () => {
    expect(rushRecapFromRun([], { day: '2026-09-15', studentId: null })).toBeNull();
    expect(rushRecapFromRun([{ id: 'missing', ok: true }], { day: '2026-09-15', studentId: null })).toBeNull();
    expect(rushRecapPreview(null)).toEqual([]);
    expect(homeRushRecapPreview(null)).toEqual([]);
  });
});

describe('rushRecapPreview + homeRushRecapPreview', () => {
  it('peeks the real last run — play order, not a Bio → Geo → Photo dump', () => {
    expect(RUSH_RECAP_PREVIEW_COUNT).toBe(4);
    const shuffled = rushRecapFromRun(
      [
        { id: rootId(photo), ok: true },
        { id: rootId(first), ok: true },
      ],
      { day: '2026-09-15', studentId: 'kid-a' },
    );
    expect(rushRecapPreview(shuffled).map((s) => s.root)).toEqual([photo.root, first.root]);
    expect(rushRecapPreview(shuffled).map((s) => s.root)).not.toEqual([
      first.root,
      geo.root,
      photo.root,
    ]);
    expect(rushRecapPreview(kidRecap, 2)).toEqual([
      { id: rootId(first), root: first.root, mean: first.mean, ok: true },
      { id: rootId(geo), root: geo.root, mean: geo.mean, ok: false },
    ]);
    expect(homeRushRecapPreview(kidRecap).map((s) => s.root)).toEqual([
      first.root,
      geo.root,
      photo.root,
    ]);
  });

  it('hides the Home peek while Daily is mid-run so Chron is not buried', () => {
    expect(homeRushRecapPreview(kidRecap, { dailyResume: true })).toEqual([]);
    expect(homeRushRecapPreview(kidRecap, { dailyResume: false })).toHaveLength(3);
  });
});

describe('rushHoldLine + rushMissLine + rushRecapChipLabel', () => {
  it('names the meaning on a correct hold — not points-only', () => {
    expect(rushHoldLine('Chron', 'time', 200, 2)).toBe('Yes — Chron means time. +200 · 2× combo');
    expect(rushHoldLine('Bio', 'life', 100, 1)).toBe('Yes — Bio means life. +100');
    expect(rushHoldLine('', '', 100, 1)).toBe('+100');
  });

  it('names the meaning on a miss — not a label-only dump', () => {
    expect(rushMissLine('Chron', 'time')).toBe('Nope — Chron means time.');
    expect(rushMissLine('Bio', 'life')).toBe('Nope — Bio means life.');
    expect(rushMissLine('', '')).toBe('Nope — try the next one.');
    expect(rushGlossHoldLine('Biology', 'The science of living things', 100, 1)).toBe(
      'Yes — Biology. The science of living things. +100',
    );
    expect(rushGlossHoldLine('Biology', 'The science of living things', 200, 2)).toBe(
      'Yes — Biology. The science of living things. +200 · 2× combo',
    );
    expect(rushGlossHoldLine('Biology', 'The science of living things', 100, 1)).not.toMatch(
      /Bio means life/,
    );
    expect(rushGlossMissLine('Biology', 'The science of living things')).toBe(
      'Nope — Biology: The science of living things.',
    );
    expect(rushGlossMissLine('', '')).toBe('Nope — try the next one.');
    expect(rushPartHoldLine('-logy', 'study of', 100, 1)).toBe(
      'Yes — -logy means study of. +100',
    );
    expect(rushPartHoldLine('-logy', 'study of', 200, 2)).toBe(
      'Yes — -logy means study of. +200 · 2× combo',
    );
    expect(rushPartHoldLine('-logy', 'study of', 100, 1)).not.toMatch(/Bio means life/);
    expect(rushPartMissLine('-logy', 'study of', 'Biology')).toBe(
      'Nope — in Biology, -logy means study of.',
    );
    expect(rushPartMissLine('-logy', 'study of', 'Biology')).not.toMatch(/Bio means life/);
    expect(rushBuildHoldLine('Biology', 'bio (life) + -logy (study of)', 100, 1)).toBe(
      'Yes — Biology. Built from bio (life) + -logy (study of). +100',
    );
    expect(rushBuildHoldLine('Biology', 'bio (life) + -logy (study of)', 200, 2)).toBe(
      'Yes — Biology. Built from bio (life) + -logy (study of). +200 · 2× combo',
    );
    expect(rushBuildHoldLine('Biology', 'bio (life) + -logy (study of)', 100, 1)).not.toMatch(
      /Bio means life/,
    );
    expect(rushBuildMissLine('Biology', 'bio (life) + -logy (study of)')).toBe(
      'Nope — bio (life) + -logy (study of) builds Biology.',
    );
    expect(rushBuildMissLine('', '')).toBe('Nope — try the next one.');
    expect(rushWordHoldLine('Biology', 'bio (life) + -logy (study of)', 100, 1)).toBe(
      'Yes — Biology. Built from bio (life) + -logy (study of). +100',
    );
    expect(rushWordHoldLine('Biology', 'bio (life) + -logy (study of)', 200, 2)).toBe(
      'Yes — Biology. Built from bio (life) + -logy (study of). +200 · 2× combo',
    );
    expect(rushWordHoldLine('Biology', 'bio (life) + -logy (study of)', 100, 1)).not.toMatch(
      /Bio means life/,
    );
    expect(rushWordMissLine('Biology', 'bio (life) + -logy (study of)')).toBe(
      'Nope — Biology. Built from bio (life) + -logy (study of).',
    );
    expect(rushWordMissLine('Biology', 'bio (life) + -logy (study of)')).not.toMatch(/Bio means life/);
    expect(rushWordMissLine('')).toBe('Nope — try the next one.');
  });

  it('a later tap on a miss does not score, and the yes line has no points', () => {
    expect(rushAnswerKind(false, true)).toBe('score-hit');
    expect(rushAnswerKind(false, false)).toBe('score-miss');
    expect(rushAnswerKind(true, true)).toBe('practice-hit');
    expect(rushAnswerKind(true, false)).toBe('practice-miss');
    expect(RUSH_RETRY_LABEL).toBe('Try again ›');
    expect(RUSH_RETRY_LABEL).not.toMatch(/Next|See results/);

    expect(rushPracticeHoldLine('Bio', 'life')).toBe('Yes — Bio means life.');
    expect(rushPracticeHoldLine('Bio', 'life')).not.toMatch(/\+|combo|points/i);
    expect(rushPracticeHoldLine('', '')).toBe('Yes — you got it.');

    expect(
      rushPracticeYesLine({
        type: 'gloss',
        rootName: 'Bio',
        mean: 'life',
        glossWord: 'Biology',
        gloss: 'The science of living things',
      }),
    ).toBe('Yes — Biology. The science of living things.');
    expect(
      rushPracticeYesLine({
        type: 'part',
        rootName: 'Bio',
        mean: 'life',
        part: '-logy',
        partMean: 'study of',
      }),
    ).toBe('Yes — -logy means study of.');
    expect(
      rushPracticeYesLine({
        type: 'build',
        rootName: 'Bio',
        mean: 'life',
        buildWord: 'Biology',
        buildSplit: 'bio (life) + -logy (study of)',
      }),
    ).toBe('Yes — Biology. Built from bio (life) + -logy (study of).');
    expect(
      rushPracticeYesLine({
        type: 'word',
        rootName: 'Bio',
        mean: 'life',
        word: 'Biology',
        wordSplit: 'bio (life) + -logy (study of)',
      }),
    ).toBe('Yes — Biology. Built from bio (life) + -logy (study of).');
    expect(
      rushPracticeYesLine({ type: 'mean', rootName: 'Bio', mean: 'life' }),
    ).toBe('Yes — Bio means life.');
    expect(
      rushPracticeYesLine({
        type: 'gloss',
        rootName: 'Bio',
        mean: 'life',
        glossWord: 'Biology',
        gloss: 'The science of living things',
      }),
    ).not.toMatch(/Bio means life|\+/);
  });

  it('a missed question does not say Combo ready, and the result tally says first try', () => {
    const fresh = { missed: false, showingMiss: false, streakBroke: false, retried: false };
    expect(rushComboLabel({ ...fresh, streak: 0, mult: 1 })).toBe('Combo ready');
    expect(rushComboLabel({ ...fresh, streak: 1, mult: 1 })).toBe('Combo ready');
    expect(rushComboLabel({ ...fresh, streak: 4, mult: 4 })).toBe('🔥 4 streak · 4×');

    const missed = { missed: true, streak: 0, mult: 1 };
    expect(
      rushComboLabel({ ...missed, showingMiss: true, streakBroke: false, retried: false }),
    ).toBe('No points');
    expect(
      rushComboLabel({ ...missed, showingMiss: true, streakBroke: true, retried: false }),
    ).toBe('Streak reset');
    expect(
      rushComboLabel({ ...missed, showingMiss: false, streakBroke: true, retried: true }),
    ).toBe('No points');
    expect(
      rushComboLabel({ ...missed, showingMiss: true, streakBroke: true, retried: true }),
    ).toBe('No points');
    expect(
      rushComboLabel({ ...missed, showingMiss: false, streakBroke: true, retried: true }),
    ).not.toMatch(/Combo ready|🔥/);

    expect(rushResultTallyLabel(false)).toBe('correct');
    expect(rushResultTallyLabel(true)).toBe('first try');
    expect(rushResultTallyLabel(true)).not.toBe('correct');
  });

  it('names the asked thing on a result chip — not Bio / life over Biography', () => {
    const bio = first;
    const gloss = rushAskedChip({
      type: 'gloss',
      root: bio,
      glossWord: 'Biography',
      gloss: "The true written story of a real person's life",
    });
    expect(gloss).toEqual({
      title: 'Biography',
      sub: "The true written story of a real person's life",
    });
    expect(gloss.title).not.toBe(bio.root);
    expect(gloss.sub).not.toBe(bio.mean);

    const part = rushAskedChip({
      type: 'part',
      root: bio,
      part: '-logy',
      partMean: 'study of',
    });
    expect(part).toEqual({ title: '-logy', sub: 'study of' });
    expect(part.title).not.toBe(bio.root);
    expect(part.sub).not.toBe(bio.mean);

    const build = rushAskedChip({
      type: 'build',
      root: bio,
      buildWord: 'Biology',
      buildSplit: 'bio (life) + -logy (study of)',
    });
    expect(build).toEqual({ title: 'Biology', sub: 'bio + -logy' });
    expect(build.title).not.toBe(bio.root);
    expect(build.sub).not.toBe(bio.mean);
    expect(build.sub).toBe(buildBig('bio (life) + -logy (study of)'));

    const word = rushAskedChip({
      type: 'word',
      root: bio,
      word: 'Biology',
    });
    expect(word).toEqual({ title: 'Biology', sub: 'from Bio' });
    expect(word.sub).not.toBe(bio.mean);

    expect(rushAskedChip({ type: 'mean', root: bio })).toEqual({
      title: bio.root,
      sub: bio.mean,
    });
    expect(rushAskedChip({ type: 'root', root: bio })).toEqual({
      title: bio.root,
      sub: bio.mean,
    });
    expect(rushAskedChip({ type: 'gloss', root: bio })).toEqual({
      title: bio.root,
      sub: bio.mean,
    });
    expect(rushAskedChip({ type: 'word', root: { root: '  Bio  ', mean: 'life' }, word: '  Biology  ' })).toEqual({
      title: 'Biology',
      sub: 'from Bio',
    });
  });

  it('names every catalog gloss, piece, pieces, and which-word on the result chip', () => {
    const rng = () => 0;
    for (const root of ROOTS) {
      const glossQ = buildRushQuestion({
        root,
        scoped: ROOTS,
        all: ROOTS,
        type: 'gloss',
        rng,
      });
      if (glossQ.type === 'gloss' && glossQ.glossWord) {
        const chip = rushAskedChip(glossQ);
        expect(chip.title, root.root).toBe(glossQ.glossWord);
        if (glossQ.glossWord !== root.root) expect(chip.title, root.root).not.toBe(root.root);
        expect(chip.sub, glossQ.glossWord).toBe(glossQ.gloss);
        if (glossQ.gloss && glossQ.gloss !== root.mean) {
          expect(chip.sub, glossQ.glossWord).not.toBe(root.mean);
        }
      }
      const partQ = buildRushQuestion({
        root,
        scoped: ROOTS,
        all: ROOTS,
        type: 'part',
        rng,
      });
      if (partQ.type === 'part' && partQ.part) {
        const chip = rushAskedChip(partQ);
        expect(chip.title, partQ.part).toBe(partQ.part);
        expect(chip.sub, partQ.part).toBe(partQ.partMean);
        if (partQ.part !== root.root) expect(chip.title, partQ.part).not.toBe(root.root);
      }
      const buildQ = buildRushQuestion({
        root,
        scoped: ROOTS,
        all: ROOTS,
        type: 'build',
        rng,
      });
      if (buildQ.type === 'build' && buildQ.buildWord && buildQ.buildSplit) {
        const chip = rushAskedChip(buildQ);
        expect(chip.title, buildQ.buildWord).toBe(buildQ.buildWord);
        expect(chip.sub, buildQ.buildWord).toBe(buildBig(buildQ.buildSplit));
        if (buildQ.buildWord !== root.root) expect(chip.title, buildQ.buildWord).not.toBe(root.root);
        expect(chip.sub, buildQ.buildWord).not.toBe(root.mean);
      }
      const wordQ = buildRushQuestion({
        root,
        scoped: ROOTS,
        all: ROOTS,
        type: 'word',
        rng,
      });
      if (wordQ.word && wordQ.word !== root.root) {
        const chip = rushAskedChip(wordQ);
        expect(chip.title, wordQ.word).toBe(wordQ.word);
        expect(chip.title, wordQ.word).not.toBe(root.root);
        expect(chip.sub, wordQ.word).toBe(`from ${root.root}`);
        expect(chip.sub, wordQ.word).not.toBe(root.mean);
      }
      const meanQ = buildRushQuestion({
        root,
        scoped: ROOTS,
        all: ROOTS,
        type: 'mean',
        rng,
      });
      expect(rushAskedChip(meanQ)).toEqual({ title: root.root, sub: root.mean });
    }
    for (const root of ROOTS) {
      for (const word of root.words) {
        const spoken = quizGloss(word.d);
        if (!spoken || canon(spoken) === canon(root.mean)) continue;
        const title = word.w.replace(/\s+/g, ' ').trim();
        if (!title || title === root.root) continue;
        expect(rushAskedChip({ type: 'gloss', root, glossWord: title, gloss: spoken }).title, title).toBe(
          title,
        );
      }
      for (const part of otherPartsForRoot(root)) {
        expect(rushAskedChip({ type: 'part', root, part: part.letters, partMean: part.mean }).title).toBe(
          part.letters,
        );
      }
      for (const pick of buildPicksForRoot(root)) {
        const chip = rushAskedChip({
          type: 'build',
          root,
          buildWord: pick.word,
          buildSplit: pick.split,
        });
        expect(chip.title, pick.word).toBe(pick.word);
        expect(chip.sub, pick.word).toBe(buildBig(pick.split));
        expect(chip.title, pick.word).not.toBe(root.root);
      }
    }
  });

  it('names Remember vs Meet vs Missed on a result chip', () => {
    expect(rushRecapChipLabel('Bio', true)).toBe('Remember Bio');
    expect(rushRecapChipLabel('Chron', false)).toBe('Meet Chron');
    expect(rushRecapChipLabel('Geo', true, false)).toBe('Missed Geo');
    expect(rushRecapChipLabel('Chron', false, false)).toBe('Missed Chron');
    expect(rushRecapChipLabel('Photo', true, true)).toBe('Remember Photo');
    expect(rememberMissCtaLabel(geo.root)).toBe(`Remember ${geo.root} ›`);
    expect(todayMissRecap(geo.root)).toBe(`Remember ${geo.root} — missed in Rush`);
    expect(todayMissRecap(geo.root, photo.root)).toBe(`Remember ${geo.root} · then ${photo.root}`);
  });
});

describe('isOwnedRushMiss', () => {
  it('is true only for an owned unreviewed Rush miss on that day', () => {
    const progress = {
      [rootId(first)]: { completedAt: Date.parse('2026-09-01T15:00:00Z') },
      [rootId(geo)]: { completedAt: Date.parse('2026-09-02T15:00:00Z') },
      [rootId(photo)]: { completedAt: Date.parse('2026-09-03T15:00:00Z') },
    };
    expect(isOwnedRushMiss(rootId(geo), kidRecap, progress, '2026-09-15')).toBe(true);
    expect(isOwnedRushMiss(rootId(first), kidRecap, progress, '2026-09-15')).toBe(false);
    expect(isOwnedRushMiss(rootId(photo), kidRecap, progress, '2026-09-15')).toBe(false);
    expect(
      isOwnedRushMiss(
        rootId(geo),
        kidRecap,
        {
          ...progress,
          [rootId(geo)]: {
            completedAt: Date.parse('2026-09-02T15:00:00Z'),
            reviewedAt: Date.parse('2026-09-15T18:00:00Z'),
          },
        },
        '2026-09-15',
      ),
    ).toBe(false);
    expect(isOwnedRushMiss(rootId(geo), kidRecap, progress, '2026-09-16')).toBe(false);
    expect(isOwnedRushMiss('', kidRecap, progress, '2026-09-15')).toBe(false);
  });
});

describe('todayRushRecap + peekChipDone', () => {
  it('lands only on today\'s last run — yesterday still peeks, does not steal Home', () => {
    expect(todayRushRecap(kidRecap, 'kid-a', '2026-09-15')).toEqual(kidRecap);
    expect(todayRushRecap(kidRecap, 'kid-a', '2026-09-16')).toBeNull();
    expect(todayRushRecap(kidRecap, 'kid-b', '2026-09-15')).toBeNull();
    expect(peekChipDone({ ok: true })).toBe(true);
    expect(peekChipDone({ ok: false })).toBe(false);
    expect(peekChipDone({ done: true, ok: false })).toBe(false);
    expect(peekChipDone({ done: true })).toBe(true);
    expect(peekChipDone({ done: false })).toBe(false);
  });
});

describe('catalog size', () => {
  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../core/daily';
import {
  rememberAskedTeach,
  rememberedAskName,
  rememberHintLine,
  rememberLeadLine,
} from '../core/deckFlow';
import { quizGloss } from '../core/wordDef';
import { recallForMissedAsk } from '../core/recall';
import { ownedRushMissAsked, rushAskedChip, rushRecapFromRun } from '../core/rushRecap';
import { buildBig, buildPicksForRoot, otherPartsForRoot, partMissLine } from '../core/wordParts';
import { ROOTS, rootId, rootsInTier } from '../data/roots';
import { deckCaption, deckEyebrow, deckNavRoot, deckStripCount } from './deck/deckChrome';
import { deckQuizHero } from './deck/deckQuizHero';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

function mediaBlock(source: string, query: string): string {
  const start = source.indexOf(`@media (${query})`);
  if (start < 0) throw new Error(`missing @media (${query})`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed @media (${query})`);
}

const TODAY = '2026-10-21';
const starter = rootsInTier(1);
const bio = starter.find((r) => r.root === 'Bio');
const geo = starter.find((r) => r.root === 'Geo');
const photo = starter.find((r) => r.root === 'Photo');
if (!bio || !geo || !photo) throw new Error('fixture: expected Bio / Geo / Photo');

const graph = otherPartsForRoot(photo).find((part) => part.letters === '-graph');
const photograph = photo.words.find((w) => w.w === 'Photograph');
const biology = bio.words.find((w) => w.w === 'Biology');
if (!graph || !photograph || !biology) {
  throw new Error('fixture: expected -graph / Photograph / Biology');
}
const photographGloss = quizGloss(photograph.d);
if (!photographGloss) throw new Error('fixture: expected Photograph gloss');

const piece = rushAskedChip({
  type: 'part',
  root: photo,
  part: graph.letters,
  partMean: graph.mean,
});
const gloss = rushAskedChip({
  type: 'gloss',
  root: photo,
  glossWord: photograph.w,
  gloss: photographGloss,
});
const pieces = rushAskedChip({
  type: 'build',
  root: bio,
  buildWord: biology.w,
  buildSplit: biology.b,
});
const whichWord = rushAskedChip({
  type: 'word',
  root: bio,
  word: biology.w,
});
const meaning = rushAskedChip({ type: 'mean', root: geo });

function atDay(day: string, hour = 15): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d, hour).getTime();
}

const owned = {
  [rootId(bio)]: { completedAt: atDay('2026-09-01') },
  [rootId(geo)]: { completedAt: atDay('2026-09-02') },
  [rootId(photo)]: { completedAt: atDay('2026-09-03') },
};

function correctLabel(beat: { opts: { label: string; ok: boolean }[] }): string {
  const ok = beat.opts.filter((opt) => opt.ok);
  expect(ok).toHaveLength(1);
  return ok[0]!.label;
}

describe('Remember replays the missed question — not Photo means light over -graph', () => {
  it('asks what -graph means, and a meaning miss stays a root question', () => {
    const beat = recallForMissedAsk({
      root: photo,
      pool: starter,
      asked: { name: piece.title, mean: piece.sub },
      rng: mulberry32(4),
      choices: 3,
    });
    expect(piece).toEqual({ title: '-graph', sub: 'record' });
    expect(beat?.kind).toBe('part');
    expect(beat?.part).toBe('-graph');
    expect(beat?.partMean).toBe('record');
    expect(beat?.ask).toBe('In Photograph, what does -graph mean?');
    expect(beat?.ask).not.toMatch(/what does this root mean/i);
    expect(correctLabel(beat!)).toBe('record');
    expect(correctLabel(beat!)).not.toBe(photo.mean);
    expect(beat?.opts).toHaveLength(3);
    expect(beat?.teach).not.toMatch(/Photo means light/);

    expect(
      recallForMissedAsk({
        root: geo,
        pool: starter,
        asked: { name: meaning.title, mean: meaning.sub },
      }),
    ).toBeNull();
    expect(recallForMissedAsk({ root: photo, pool: starter, asked: null })).toBeNull();
    expect(
      recallForMissedAsk({
        root: photo,
        pool: starter,
        asked: { name: 'Chair', mean: 'sit' },
      }),
    ).toBeNull();
    expect(
      recallForMissedAsk({
        root: photo,
        pool: starter,
        asked: { name: '-graph', mean: photo.mean },
      }),
    ).toBeNull();
  });

  it('asks the school word, the pieces, and which word — without printing the answer in the chrome', () => {
    const glossBeat = recallForMissedAsk({
      root: photo,
      pool: starter,
      asked: { name: gloss.title, mean: gloss.sub },
      rng: mulberry32(5),
      choices: 3,
    });
    expect(glossBeat?.kind).toBe('gloss');
    expect(glossBeat?.word).toBe('Photograph');
    expect(glossBeat?.ask).toBe('What does Photograph mean?');
    expect(correctLabel(glossBeat!)).toBe(photographGloss);
    expect(correctLabel(glossBeat!)).not.toBe(photo.mean);
    const glossName = rememberedAskName(glossBeat, true);
    expect(glossName).toBe('Photograph');
    expect(deckCaption({
      emoji: '💡',
      root: photo.root,
      mean: photo.mean,
      alt: photo.alt,
      missed: true,
      missAsked: glossName,
    })).toBe('💡 Missed Photograph');
    expect(deckCaption({
      emoji: '💡',
      root: photo.root,
      mean: photo.mean,
      alt: photo.alt,
      missed: true,
      missAsked: glossName,
    })).not.toContain(photographGloss);

    const buildBeat = recallForMissedAsk({
      root: bio,
      pool: starter,
      asked: { name: pieces.title, mean: pieces.sub },
      rng: mulberry32(6),
      choices: 3,
    });
    expect(pieces.sub).toBe('bio + -logy');
    expect(buildBeat?.kind).toBe('build');
    expect(buildBeat?.ask).toBe(`Which word is built from ${biology.b}?`);
    expect(correctLabel(buildBeat!)).toBe('Biology');
    const pieceName = rememberedAskName(buildBeat, true);
    expect(pieceName).toBe('bio + -logy');
    expect(pieceName).not.toBe('Biology');
    expect(deckNavRoot({ root: bio.root, missed: true, missAsked: pieceName })).toBe(
      'Missed bio + -logy',
    );
    expect(deckNavRoot({ root: bio.root, missed: true, missAsked: pieceName })).not.toBe(
      'Missed Biology',
    );
    expect(deckQuizHero({
      root: bio.root,
      mean: bio.mean,
      kind: 'build',
      word: biology.w,
      split: biology.b,
    })?.title).toBe('bio + -logy');

    const wordBeat = recallForMissedAsk({
      root: bio,
      pool: starter,
      asked: { name: whichWord.title, mean: whichWord.sub },
      rng: mulberry32(7),
      choices: 3,
    });
    expect(whichWord).toEqual({ title: 'Biology', sub: 'from Bio' });
    expect(wordBeat?.kind).toBe('word');
    expect(wordBeat?.word).toBe('Biology');
    expect(wordBeat?.ask).toBe('Which word is built from this root?');
    expect(correctLabel(wordBeat!)).toBe('Biology');
    expect(rememberedAskName(wordBeat, true)).toBeUndefined();
    expect(rememberLeadLine(bio.root, { missed: true, askedKind: 'word' })).toBe(
      'You missed Bio in Rush. Tap which word it builds — then Home.',
    );
    expect(rememberLeadLine(bio.root, { missed: true, askedKind: 'word' })).not.toContain(
      'Biology',
    );
    expect(rememberHintLine(bio.root, { missed: true, askedKind: 'word' })).toBe(
      'Remember Bio — tap the word you missed.',
    );
    expect(deckCaption({
      emoji: '🧬',
      root: bio.root,
      mean: bio.mean,
      alt: bio.alt,
      missed: true,
    })).toBe('🧬 Missed Bio');
  });

  it('names -graph on the visit and teaches record only after a miss', () => {
    const beat = recallForMissedAsk({
      root: photo,
      pool: starter,
      asked: { name: '  -graph  ', mean: '  record  ' },
      rng: mulberry32(8),
    })!;
    expect(rememberedAskName(beat, true)).toBe('-graph');
    expect(rememberLeadLine(photo.root, { missed: true, asked: '-graph', askedKind: 'part' })).toBe(
      'You missed -graph in Rush. Tap what it means — then Home.',
    );
    expect(rememberLeadLine(photo.root, { missed: true, asked: '-graph', askedKind: 'part' })).not.toContain(
      'record',
    );
    expect(rememberLeadLine(photo.root, { missed: true, asked: '-graph', askedKind: 'part' })).not.toContain(
      photo.mean,
    );
    expect(rememberHintLine(photo.root, { missed: true, asked: '-graph', askedKind: 'part' })).toBe(
      'Remember -graph — you missed this in Rush.',
    );
    expect(rememberAskedTeach(photo.root, photo.mean, beat)).toBe(
      partMissLine('-graph', 'record', 'Photograph'),
    );
    expect(rememberAskedTeach(photo.root, photo.mean, beat)).toContain('record');
    expect(rememberAskedTeach(photo.root, photo.mean, { kind: 'mean' })).toBe(
      'Nope — Photo means light.',
    );
    expect(deckEyebrow({
      root: photo.root,
      lang: 'Greek',
      missed: true,
      quizKind: 'part',
      missAsked: '-graph',
    })).toBe('Missed -graph');
    expect(deckStripCount({
      missed: true,
      missName: '-graph',
      position: 3,
      total: ROOTS.length,
    })).toBe('Missed -graph');
    expect(deckNavRoot({
      root: photo.root,
      missed: true,
      quizTitle: 'Photograph',
      missAsked: '-graph',
    })).toBe('Missed -graph');
    expect(deckNavRoot({ root: 'Geo', missed: true, quizTitle: 'Geography' })).toBe('Missed Geo');
  });

  it('reads the first stored miss, and a caught meaning beat stays on the root', () => {
    const recap = rushRecapFromRun(
      [
        { id: rootId(photo), ok: false, asked: piece.title, askedSub: piece.sub },
        { id: rootId(photo), ok: false, asked: 'synthesis', askedSub: 'putting together' },
        { id: rootId(geo), ok: false, asked: meaning.title, askedSub: meaning.sub },
      ],
      { day: TODAY, studentId: 'kid-a' },
    );
    expect(ownedRushMissAsked(rootId(photo), recap, owned, TODAY)).toEqual({
      name: '-graph',
      mean: 'record',
    });
    expect(ownedRushMissAsked(rootId(geo), recap, owned, TODAY)).toBeNull();
    expect(ownedRushMissAsked(rootId(bio), recap, owned, TODAY)).toBeNull();
    const reviewed = {
      ...owned,
      [rootId(photo)]: { completedAt: atDay('2026-09-03'), reviewedAt: atDay(TODAY, 16) },
    };
    expect(ownedRushMissAsked(rootId(photo), recap, reviewed, TODAY)).toBeNull();
  });

  it('replays every catalog piece, gloss, pieces, and which-word chip', () => {
    for (const root of ROOTS) {
      for (const part of otherPartsForRoot(root)) {
        const chip = rushAskedChip({
          type: 'part',
          root,
          part: part.letters,
          partMean: part.mean,
        });
        const beat = recallForMissedAsk({
          root,
          pool: ROOTS,
          asked: { name: chip.title, mean: chip.sub },
          rng: mulberry32(part.word.length + part.letters.length),
          choices: 3,
        });
        expect(beat?.kind, part.word).toBe('part');
        expect(beat?.part, part.word).toBe(part.letters);
        expect(correctLabel(beat!), part.word).toBe(part.mean);
        expect(beat?.ask, part.word).toContain(part.letters);
        expect(beat?.ask, part.word).not.toMatch(/what does this root mean/i);
        expect(rememberedAskName(beat, true), part.word).toBe(part.letters);
      }
      for (const word of root.words) {
        const spoken = quizGloss(word.d);
        if (spoken && spoken.toLowerCase() !== root.mean.toLowerCase()) {
          const chip = rushAskedChip({
            type: 'gloss',
            root,
            glossWord: word.w,
            gloss: spoken,
          });
          const beat = recallForMissedAsk({
            root,
            pool: ROOTS,
            asked: { name: chip.title, mean: chip.sub },
            rng: mulberry32(word.w.length),
            choices: 3,
          });
          if (foldSame(chip.title, root.root)) {
            expect(beat, word.w).toBeNull();
          } else {
            expect(beat?.kind, word.w).toBe('gloss');
            expect(beat?.word, word.w).toBe(word.w.replace(/\s+/g, ' ').trim());
            expect(correctLabel(beat!), word.w).toBe(spoken);
            expect(rememberedAskName(beat, true), word.w).not.toBe(spoken);
          }
        }
        const built = buildPicksForRoot(root).find((pick) => pick.word === word.w);
        if (built) {
          const chip = rushAskedChip({
            type: 'build',
            root,
            buildWord: word.w,
            buildSplit: word.b,
          });
          const beat = recallForMissedAsk({
            root,
            pool: ROOTS,
            asked: { name: chip.title, mean: chip.sub },
            rng: mulberry32(word.w.length + 3),
            choices: 3,
          });
          if (foldSame(chip.title, root.root)) {
            expect(beat, word.w).toBeNull();
          } else {
            expect(beat?.kind, word.w).toBe('build');
            expect(correctLabel(beat!), word.w).toBe(word.w.replace(/\s+/g, ' ').trim());
            expect(rememberedAskName(beat, true), word.w).toBe(buildBig(word.b));
            expect(rememberedAskName(beat, true), word.w).not.toBe(word.w);
          }
        }
        const which = rushAskedChip({ type: 'word', root, word: word.w });
        const whichBeat = recallForMissedAsk({
          root,
          pool: ROOTS,
          asked: { name: which.title, mean: which.sub },
          rng: mulberry32(word.w.length + 9),
          choices: 3,
        });
        if (foldSame(which.title, root.root)) {
          expect(whichBeat, word.w).toBeNull();
        } else {
          expect(whichBeat?.kind, word.w).toBe('word');
          expect(correctLabel(whichBeat!), word.w).toBe(word.w.replace(/\s+/g, ' ').trim());
          expect(rememberedAskName(whichBeat, true), word.w).toBeUndefined();
        }
      }
    }
  });

  it('wires Remember to the stored miss and keeps the question readable on a phone', () => {
    expect(deck).toContain('ownedRushMissAsked');
    expect(deck).toContain('recallForMissedAsk');
    expect(deck).toContain('pinnedAsk: Boolean(pinned)');
    expect(deck).toContain("kinds: deckEntry === 'remember' ? ['mean', 'word'] : undefined");
    expect(deck).toContain('missAsked: askedReplay');
    expect(deck).toContain('rememberAskedTeach(root.root, root.mean, quizRecall.beat)');
    expect(deck).toContain('missName={askedReplay || labelRoot}');
    expect(deck).toContain(": root.root;");
    const phone = mediaBlock(css, 'max-width: 860px');
    const short = mediaBlock(css, 'max-height: 720px');
    for (const block of [phone, short]) {
      expect(block).toMatch(/\.ww-caption\.is-remember-miss/);
      expect(block).toMatch(/\.ww-caption\.is-quiz\s*\{[^}]*display:\s*block/);
      expect(block).toMatch(
        /\.ww-root\.is-gloss,\s*\.ww-root\.is-part,\s*\.ww-root\.is-build\s*\{[^}]*display:\s*block/,
      );
      expect(block).not.toMatch(/\.ww-caption\.is-quiz\s*\{[^}]*display:\s*none/);
      expect(block).not.toMatch(/\.ww-root\.is-part\s*\{[^}]*display:\s*none/);
    }
    expect(ROOTS.length).toBe(183);
  });
});

function foldSame(a: string, b: string): boolean {
  return a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase();
}

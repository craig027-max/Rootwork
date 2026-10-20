import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { quizGloss } from '../core/wordDef';
import { askedChipOpen } from '../core/deckFlow';
import {
  homeRushRecapPreview,
  parseRushRecap,
  rushAskedChip,
  rushRecapFromRun,
} from '../core/rushRecap';
import { ROOTS, rootId, rootsInTier } from '../data/roots';
import { buildDetailVM } from './home/detailVM';
import { buildMenu } from './home/menu';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');

const starter = rootsInTier(1);
const builder = rootsInTier(2);
const bio = starter.find((r) => r.root === 'Bio');
const geo = starter.find((r) => r.root === 'Geo');
const photo = starter.find((r) => r.root === 'Photo');
const firstBuilder = builder[0];
if (!bio || !geo || !photo || !firstBuilder) {
  throw new Error('fixture: expected Bio / Geo / Photo / Builder');
}

const biography = bio.words.find((w) => w.w === 'Biography');
const photograph = photo.words.find((w) => w.w === 'Photograph');
if (!biography || !photograph) throw new Error('fixture: expected Biography / Photograph');
const biographyGloss = quizGloss(biography.d);
const photographGloss = quizGloss(photograph.d);
if (!biographyGloss || !photographGloss) throw new Error('fixture: expected quiz glosses');

const gloss = rushAskedChip({
  type: 'gloss',
  root: bio,
  glossWord: biography.w,
  gloss: biographyGloss,
});
const meaning = rushAskedChip({ type: 'mean', root: geo });
const part = rushAskedChip({
  type: 'part',
  root: photo,
  part: '-graph',
  partMean: 'written',
});
const whichWord = rushAskedChip({
  type: 'word',
  root: bio,
  word: 'Biology',
});

const started = new Set([...starter.map((r) => rootId(r)), rootId(firstBuilder)]);
const recap = rushRecapFromRun(
  [
    { id: rootId(bio), ok: true, asked: gloss.title, askedSub: gloss.sub },
    { id: rootId(geo), ok: true, asked: meaning.title, askedSub: meaning.sub },
    { id: rootId(photo), ok: false, asked: part.title, askedSub: part.sub },
    { id: rootId(bio), ok: true, asked: whichWord.title, askedSub: whichWord.sub },
  ],
  { day: '2026-10-20', studentId: 'kid-a' },
);

describe('Home Rush names the question — not Bio / life over Biography', () => {
  it('stores the result chip and leaves a meaning beat on the root', () => {
    expect(gloss).toEqual({ title: 'Biography', sub: biographyGloss });
    expect(meaning).toEqual({ title: 'Geo', sub: 'earth' });
    expect(part.title).toBe('-graph');
    expect(whichWord).toEqual({ title: 'Biology', sub: 'from Bio' });

    expect(recap?.roots.map((line) => line.asked || line.root)).toEqual([
      'Biography',
      'Geo',
      '-graph',
      'Biology',
    ]);
    expect(recap?.roots[0]).toMatchObject({
      root: 'Bio',
      mean: 'life',
      asked: 'Biography',
      askedSub: biographyGloss,
      ok: true,
    });
    expect(recap?.roots[1]).toEqual({
      id: rootId(geo),
      root: 'Geo',
      mean: 'earth',
      ok: true,
    });
    expect(recap?.roots[1]).not.toHaveProperty('asked');
    expect(recap?.roots[2]?.asked).toBe('-graph');
    expect(recap?.roots[3]?.asked).toBe('Biology');

    const peek = homeRushRecapPreview(recap);
    expect(peek.map((line) => line.asked || line.root)).toEqual([
      'Biography',
      'Geo',
      '-graph',
      'Biology',
    ]);
    expect(peek[0]?.mean).toBe(biographyGloss);
    expect(peek[0]?.mean).not.toBe('life');
    expect(peek[1]).toMatchObject({ root: 'Geo', mean: 'earth', ok: true });
    expect(peek[1]?.asked).toBeUndefined();
    expect(peek[2]).toMatchObject({ root: 'Photo', asked: '-graph', mean: 'written', ok: false });
    expect(peek[3]).toMatchObject({ root: 'Bio', asked: 'Biology', mean: 'from Bio' });
    expect(parseRushRecap(recap)).toEqual(recap);
  });

  it('peeks Biography on the Home row and opens that word', () => {
    const peek = homeRushRecapPreview(recap);
    const { items } = buildMenu(started, true, {
      currentTier: 2,
      rushPreview: peek,
    });
    const row = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(row?.kind).toBe('mode');
    if (row?.kind !== 'mode') return;
    expect(row.preview?.map((line) => line.asked || line.root)).toEqual([
      'Biography',
      'Geo',
      '-graph',
      'Biology',
    ]);
    expect(row.preview?.[0]?.mean).toBe(biographyGloss);
    expect(row.preview?.[0]?.mean).not.toBe('life');
    expect(row.preview?.[1]?.asked).toBeUndefined();

    const vm = buildDetailVM(row, {
      dailyRoots: [],
      dailyDone: false,
      streak: 2,
      nextPlay: false,
      completed: started,
      entitled: true,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 900,
      rushRecap: recap,
    });
    expect(vm.samples[0]).toMatchObject({
      root: 'Bio',
      asked: 'Biography',
      mean: biographyGloss,
      ok: true,
      owned: true,
      opensWord: true,
    });
    expect(vm.samples[0]?.mean).not.toBe('life');
    expect(vm.samples[1]).toMatchObject({ root: 'Geo', mean: 'earth', owned: true });
    expect(vm.samples[1]?.asked).toBeUndefined();
    expect(vm.samples[1]?.opensWord).toBe(false);
    expect(vm.samples[2]).toMatchObject({
      root: 'Photo',
      asked: '-graph',
      opensWord: false,
      ok: false,
    });
    expect(vm.samples[3]).toMatchObject({ root: 'Bio', asked: 'Biology', opensWord: true });
    expect(askedChipOpen(rootId(bio), started, 'Biography')?.entry).toBe('asked');
    expect(askedChipOpen(rootId(photo), started, '-graph')?.entry).not.toBe('asked');
    expect(askedChipOpen(rootId(geo), started, 'Geo')?.entry).not.toBe('asked');
  });

  it('keeps a Remember miss on the root, and an older save on the root', () => {
    const { items } = buildMenu(started, true, {
      currentTier: 2,
      dailyDone: true,
      rushPreview: homeRushRecapPreview(recap),
      rushMissName: geo.root,
    });
    const missed = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(missed?.kind).toBe('mode');
    if (missed?.kind !== 'mode') return;
    expect(missed.preview?.map((line) => line.root)).toEqual(['Geo']);
    expect(missed.preview?.every((line) => !line.asked)).toBe(true);

    const vm = buildDetailVM(missed, {
      dailyRoots: [],
      dailyDone: true,
      streak: 2,
      nextPlay: false,
      completed: started,
      entitled: true,
      learnedToday: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      rushRuns: 1,
      rushRecap: recap,
    });
    expect(vm.big).toBe('Remember Geo');
    expect(vm.samples.map((s) => s.root)).toEqual(['Geo']);
    expect(vm.samples.every((s) => !s.asked)).toBe(true);

    const old = parseRushRecap({
      day: '2026-10-19',
      studentId: 'kid-a',
      roots: [{ id: rootId(bio), root: 'Bio', mean: 'life', ok: true, asked: 'bio' }],
    });
    expect(old?.roots[0]).toEqual({
      id: rootId(bio),
      root: 'Bio',
      mean: 'life',
      ok: true,
    });
    expect(homeRushRecapPreview(old).map((line) => line.asked || line.root)).toEqual(['Bio']);
    expect(homeRushRecapPreview(old)[0]?.mean).toBe('life');
    expect(homeRushRecapPreview(recap, { dailyResume: true })).toEqual([]);
  });

  it('wires the start peek to the same stored chip', () => {
    expect(rush).toContain('rushAskedChip(item)');
    expect(rush).toContain('asked: chip.title');
    expect(rush).toContain('askedSub: chip.sub');
    expect(rush).toContain('s.asked || s.root');
    expect(rush).toContain('openRecap(s.id, s.asked)');
    expect(rush).toContain('name.length >= 14');
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

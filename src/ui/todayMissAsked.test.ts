import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { quizGloss } from '../core/wordDef';
import { otherPartsForRoot } from '../core/wordParts';
import { rushAskedChip, rushRecapFromRun } from '../core/rushRecap';
import { ROOTS, rootId, rootsInTier } from '../data/roots';
import { buildTodayProgress, listRushMissAsked, listRushMissRemember } from './home/todayProgress';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
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

const TODAY = '2026-10-20';
const starter = rootsInTier(1);
const builder = rootsInTier(2);
const bio = starter.find((r) => r.root === 'Bio');
const geo = starter.find((r) => r.root === 'Geo');
const photo = starter.find((r) => r.root === 'Photo');
const firstBuilder = builder[0];
if (!bio || !geo || !photo || !firstBuilder) {
  throw new Error('fixture: expected Bio / Geo / Photo / Builder');
}

const graph = otherPartsForRoot(photo).find((part) => part.letters === '-graph');
const logy = otherPartsForRoot(bio).find((part) => part.letters === '-logy');
const biography = bio.words.find((w) => w.w === 'Biography');
const biology = bio.words.find((w) => w.w === 'Biology');
const photograph = photo.words.find((w) => w.w === 'Photograph');
if (!graph || !logy || !biography || !biology || !photograph) {
  throw new Error('fixture: expected -graph / -logy / Biography / Biology / Photograph');
}
const photographGloss = quizGloss(photograph.d);
if (!photographGloss) throw new Error('fixture: expected Photograph gloss');

const piece = rushAskedChip({
  type: 'part',
  root: photo,
  part: graph.letters,
  partMean: graph.mean,
});
const otherPiece = rushAskedChip({
  type: 'part',
  root: bio,
  part: logy.letters,
  partMean: logy.mean,
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
  [rootId(firstBuilder)]: { completedAt: atDay('2026-09-10') },
};

const started = new Set([...starter.map((r) => rootId(r)), rootId(firstBuilder)]);

function todayFor(opts: {
  root: string;
  mean: string;
  id: string;
  asked?: string;
  askedMean?: string;
  also?: string;
  alsoAsked?: string;
  missed?: boolean;
  remembered?: boolean;
}) {
  return buildTodayProgress({
    firstRun: false,
    nextPlay: false,
    dailyDone: true,
    completed: started,
    entitled: true,
    learnedToday: true,
    learnedRoot: firstBuilder.root,
    learnedRootId: rootId(firstBuilder),
    rememberedToday: Boolean(opts.remembered),
    rememberRoot: opts.root,
    rememberMean: opts.mean,
    rememberRootId: opts.id,
    rememberMissed: opts.missed !== false && !opts.remembered,
    rememberMissAsked: opts.asked,
    rememberMissAskedMean: opts.askedMean,
    rememberAlso: opts.also,
    rememberAlsoAsked: opts.alsoAsked,
  });
}

describe('Today row names the missed question — not Photo · light over -graph', () => {
  it('stores the piece and leaves a meaning beat on the root', () => {
    expect(graph.mean).toBe('record');
    expect(graph.mean).not.toBe(photo.mean);
    expect(piece).toEqual({ title: '-graph', sub: 'record' });
    expect(piece.title).not.toBe(photo.root);
    expect(piece.sub).not.toBe(photo.mean);
    expect(otherPiece).toEqual({ title: '-logy', sub: 'study of' });
    expect(meaning).toEqual({ title: 'Geo', sub: 'earth' });

    const recap = rushRecapFromRun(
      [
        { id: rootId(photo), ok: false, asked: piece.title, askedSub: piece.sub },
        { id: rootId(geo), ok: false, asked: meaning.title, askedSub: meaning.sub },
        { id: rootId(bio), ok: true, asked: gloss.title, askedSub: gloss.sub },
      ],
      { day: TODAY, studentId: 'kid-a' },
    );
    expect(listRushMissRemember(recap, owned, TODAY)).toEqual([rootId(photo), rootId(geo)]);
    expect(listRushMissAsked(recap, owned, TODAY)).toEqual([
      { name: '-graph', mean: 'record' },
      null,
    ]);

    const reviewed = {
      ...owned,
      [rootId(photo)]: { completedAt: atDay('2026-09-03'), reviewedAt: atDay(TODAY, 12) },
    };
    expect(listRushMissRemember(recap, reviewed, TODAY)).toEqual([rootId(geo)]);
    expect(listRushMissAsked(recap, reviewed, TODAY)).toEqual([null]);
    expect(listRushMissAsked(recap, owned, '2026-10-19')).toEqual([]);
    expect(listRushMissAsked(recap, {}, TODAY)).toEqual([]);
    expect(
      listRushMissAsked(recap, owned, TODAY, { exclude: [rootId(photo)] }),
    ).toEqual([null]);
  });

  it('names -graph on the Today row and still Remembers Photo', () => {
    const vm = todayFor({
      root: photo.root,
      mean: photo.mean,
      id: rootId(photo),
      asked: `  ${piece.title}  `,
      askedMean: `  ${piece.sub}  `,
      also: bio.root,
      alsoAsked: `  ${otherPiece.title}  `,
    });
    expect(vm.items.find((item) => item.key === 'remember')?.label).toBe(
      'Missed -graph · record · then -logy',
    );
    expect(vm.items.find((item) => item.key === 'remember')?.label).not.toBe(
      `Missed ${photo.root} · ${photo.mean} · then ${bio.root}`,
    );
    expect(vm.items.find((item) => item.key === 'remember')?.label).not.toContain(photo.mean);
    expect(vm.cta).toEqual({
      kind: 'remember',
      label: `Remember ${photo.root} ›`,
      rootId: rootId(photo),
    });
    expect(vm.recap).toBe(`Remember ${photo.root} · then ${bio.root}`);
    expect(vm.missName).toBe(photo.root);
    expect(vm.pathDone).toBe(false);

    const alone = todayFor({
      root: photo.root,
      mean: photo.mean,
      id: rootId(photo),
      asked: piece.title,
      askedMean: '',
    });
    expect(alone.items.find((item) => item.key === 'remember')?.label).toBe('Missed -graph');
    expect(alone.items.find((item) => item.key === 'remember')?.label).not.toContain(photo.mean);
  });

  it('names a school word, the pieces, and which word — and a meaning miss stays Geo · earth', () => {
    const glossRow = todayFor({
      root: photo.root,
      mean: photo.mean,
      id: rootId(photo),
      asked: gloss.title,
      askedMean: gloss.sub,
    });
    expect(glossRow.items.find((item) => item.key === 'remember')?.label).toBe(
      `Missed ${photograph.w} · ${photographGloss}`,
    );
    expect(glossRow.items.find((item) => item.key === 'remember')?.label).not.toBe(
      `Missed ${photo.root} · ${photo.mean}`,
    );
    expect(glossRow.cta?.label).toBe(`Remember ${photo.root} ›`);

    const buildRow = todayFor({
      root: bio.root,
      mean: bio.mean,
      id: rootId(bio),
      asked: pieces.title,
      askedMean: pieces.sub,
    });
    expect(buildRow.items.find((item) => item.key === 'remember')?.label).toBe(
      `Missed ${biology.w} · ${pieces.sub}`,
    );
    expect(pieces.sub).not.toBe(bio.mean);
    expect(buildRow.missName).toBe(bio.root);

    const wordRow = todayFor({
      root: bio.root,
      mean: bio.mean,
      id: rootId(bio),
      asked: whichWord.title,
      askedMean: whichWord.sub,
    });
    expect(wordRow.items.find((item) => item.key === 'remember')?.label).toBe(
      `Missed ${biology.w} · from ${bio.root}`,
    );
    expect(wordRow.items.find((item) => item.key === 'remember')?.label).not.toContain(bio.mean);

    const rootRow = todayFor({
      root: geo.root,
      mean: geo.mean,
      id: rootId(geo),
      asked: meaning.title,
      askedMean: meaning.sub,
    });
    expect(rootRow.items.find((item) => item.key === 'remember')?.label).toBe(
      `Missed ${geo.root} · ${geo.mean}`,
    );
    const stored = rushRecapFromRun(
      [{ id: rootId(geo), ok: false, asked: meaning.title, askedSub: meaning.sub }],
      { day: TODAY, studentId: 'kid-a' },
    );
    expect(listRushMissAsked(stored, owned, TODAY)).toEqual([null]);

    const caught = todayFor({
      root: photo.root,
      mean: photo.mean,
      id: rootId(photo),
      asked: piece.title,
      askedMean: piece.sub,
      remembered: true,
    });
    expect(caught.items.find((item) => item.key === 'remember')?.label).toBe(
      `Remembered ${photo.root}`,
    );
    expect(caught.missName).toBeUndefined();
    expect(caught.pathDone).toBe(true);
  });

  it('keeps the second piece when the same root is missed twice', () => {
    const recap = rushRecapFromRun(
      [
        { id: rootId(photo), ok: false, asked: piece.title, askedSub: piece.sub },
        {
          id: rootId(photo),
          ok: false,
          asked: rushAskedChip({
            type: 'part',
            root: photo,
            part: 'synthesis',
            partMean: 'putting together',
          }).title,
          askedSub: 'putting together',
        },
      ],
      { day: TODAY, studentId: 'kid-a' },
    );
    expect(listRushMissRemember(recap, owned, TODAY)).toEqual([rootId(photo), rootId(photo)]);
    expect(listRushMissAsked(recap, owned, TODAY)).toEqual([
      { name: '-graph', mean: 'record' },
      { name: 'synthesis', mean: 'putting together' },
    ]);
  });

  it('wires Home to the asked miss and keeps the row readable on a phone', () => {
    expect(home).toContain('listRushMissRemember');
    expect(home).toContain('listRushMissAsked');
    expect(home).toContain('rememberMissAsked: rushMissAsked[0]?.name');
    expect(home).toContain('rememberMissAskedMean: rushMissAsked[0]?.mean');
    expect(home).toContain('rememberAlsoAsked: rushMissAsked[1]?.name');
    expect(home).toContain('rememberRoot: remember.name');
    expect(home).toContain('rememberMissName: remember.name');
    expect(home).toContain("openRoot(rushMissId, { entry: 'remember' })");
    expect(css).toMatch(/\.ww-today-item\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.ww-today-item\s*\{[^}]*white-space:\s*normal/);
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-today-item\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    expect(phone).not.toMatch(/\.ww-today-item\.is-miss\s*\{[^}]*display:\s*none/);
    expect(ROOTS.length).toBe(183);
  });
});

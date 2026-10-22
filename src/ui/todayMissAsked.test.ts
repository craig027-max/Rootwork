import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { quizGloss } from '../core/wordDef';
import { otherPartsForRoot } from '../core/wordParts';
import { missDisplayName, rushAskedChip, rushRecapFromRun } from '../core/rushRecap';
import { ROOTS, rootId, rootsInTier } from '../data/roots';
import { buildDetailVM } from './home/detailVM';
import { buildMenu } from './home/menu';
import { buildTodayProgress, listRushMissAsked, listRushMissRemember } from './home/todayProgress';
import { buildDailyDone, buildRushResultNext, buildRushStart, rushMissRememberReady } from './modes/modeHandoff';

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

  it('names -graph on the Today row and Remembers -graph', () => {
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
      label: `Remember ${piece.title} ›`,
      rootId: rootId(photo),
    });
    expect(vm.cta?.label).not.toBe(`Remember ${photo.root} ›`);
    expect(vm.recap).toBe(`Remember ${piece.title} · then ${otherPiece.title}`);
    expect(vm.recap).not.toContain(photo.root);
    expect(vm.missName).toBe(piece.title);
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
    expect(glossRow.cta?.label).toBe(`Remember ${photograph.w} ›`);
    expect(glossRow.missName).toBe(photograph.w);
    expect(glossRow.recap).toBe(`Remember ${photograph.w} — missed in Rush`);

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
    expect(buildRow.missName).toBe(biology.w);
    expect(buildRow.cta?.label).toBe(`Remember ${biology.w} ›`);
    expect(buildRow.cta?.rootId).toBe(rootId(bio));

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
    expect(wordRow.cta?.label).toBe(`Remember ${biology.w} ›`);
    expect(wordRow.missName).toBe(biology.w);

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
    expect(rootRow.cta?.label).toBe(`Remember ${geo.root} ›`);
    expect(rootRow.missName).toBe(geo.root);
    expect(rootRow.recap).toBe(`Remember ${geo.root} — missed in Rush`);
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
    expect(home).toContain('rushMissName: missHero ? (today.missName ?? remember.name) : undefined');
    expect(home).toContain('rushMissId: missHero ? rushMissId ?? undefined : undefined');
    expect(home).toContain('rememberMissAsked: missHero ? rushMissAsked[0]?.name : undefined');
    expect(home).toContain('rememberAlsoAsked: missHero ? rushMissAsked[1]?.name : undefined');
    expect(home).toContain(
      'asked === rushMissAsked[0]?.name || asked === rushMissAsked[1]?.name',
    );
    expect(css).toMatch(/\.ww-hello\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.ww-big\.is-miss\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.ww-today-cta\.is-miss \.btn\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(home).toContain("openRoot(rushMissId, { entry: 'remember' })");
    expect(css).toMatch(/\.ww-today-item\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.ww-today-item\s*\{[^}]*white-space:\s*normal/);
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-today-item\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    expect(phone).not.toMatch(/\.ww-today-item\.is-miss\s*\{[^}]*display:\s*none/);
    expect(ROOTS.length).toBe(183);
  });

  it('names every catalog question on the fat tap and still opens the root', () => {
    for (const root of ROOTS) {
      const chips = [
        ...otherPartsForRoot(root).map((part) =>
          rushAskedChip({ type: 'part', root, part: part.letters, partMean: part.mean }),
        ),
        ...root.words.flatMap((word) => {
          const spoken = quizGloss(word.d);
          const out = [
            rushAskedChip({ type: 'word', root, word: word.w }),
            rushAskedChip({ type: 'build', root, buildWord: word.w, buildSplit: word.b }),
          ];
          if (spoken) {
            out.push(
              rushAskedChip({ type: 'gloss', root, glossWord: word.w, gloss: spoken }),
            );
          }
          return out;
        }),
      ];
      for (const chip of chips) {
        const vm = todayFor({
          root: root.root,
          mean: root.mean,
          id: rootId(root),
          asked: chip.title,
          askedMean: chip.sub,
        });
        const display = missDisplayName(root.root, chip.title);
        if (!display) {
          expect(vm.cta?.label, chip.title).toBe(`Remember ${root.root} ›`);
          expect(vm.missName, chip.title).toBe(root.root);
        } else {
          expect(vm.cta?.label, `${root.root} ${chip.title}`).toBe(`Remember ${display} ›`);
          expect(vm.missName, chip.title).toBe(display);
          expect(vm.recap, chip.title).toBe(`Remember ${display} — missed in Rush`);
          expect(vm.cta?.rootId, chip.title).toBe(rootId(root));
        }
      }
    }
  });

  it('Remember chrome names -graph and a meaning miss stays Geo', () => {
    const face = {
      rememberMissId: rootId(photo),
      rememberMissName: photo.root,
      rememberMissAsked: piece.title,
      rememberMissAskedMean: piece.sub,
      rememberAlso: bio.root,
      rememberAlsoId: rootId(bio),
      rememberAlsoAsked: otherPiece.title,
      rememberAlsoAskedMean: otherPiece.sub,
      dailyDone: true,
      learnedToday: true,
    };
    expect(rushMissRememberReady(started, true, face)).toMatchObject({
      id: rootId(photo),
      name: '-graph',
      mean: 'record',
      also: '-logy',
      alsoMean: 'study of',
      alsoId: rootId(bio),
    });

    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 100,
      completed: started,
      entitled: true,
      ...face,
    });
    expect(start.title).toBe('Remember -graph');
    expect(start.rememberMiss).toBe('Remember -graph ›');
    expect(start.rememberPeek).toBe('Remember -graph · then -logy');
    expect(start.peekChips?.[0]).toMatchObject({
      root: photo.root,
      asked: '-graph',
      mean: 'record',
      id: rootId(photo),
    });
    expect(start.peekChips?.[1]).toMatchObject({
      root: bio.root,
      asked: '-logy',
      mean: 'study of',
    });
    expect(start.peekChips?.map((chip) => chip.mean)).not.toContain(photo.mean);

    const result = buildRushResultNext(started, true, face);
    expect(result.title).toBe('Remember -graph');
    expect(result.primary).toMatchObject({ label: 'Remember -graph ›', rootId: rootId(photo) });
    expect(result.recap?.[0]).toMatchObject({ asked: '-graph', mean: 'record', root: photo.root });

    const done = buildDailyDone({
      deal: [photo, bio],
      streak: 2,
      justFinished: true,
      completed: started,
      entitled: true,
      ...face,
    });
    expect(done.title).toBe('Remember -graph');
    expect(done.primary.label).toBe('Remember -graph ›');
    expect(done.recap[0]).toMatchObject({ asked: '-graph', mean: 'record', root: photo.root });

    const { items } = buildMenu(started, true, {
      rushMissName: '-graph',
      rushMissId: rootId(photo),
      rushMissMean: 'record',
      rushMissAlso: '-logy',
      rushMissAlsoId: rootId(bio),
      rushMissAlsoMean: 'study of',
      dailyDone: true,
    });
    const rushRow = items.find((item) => item.kind === 'mode' && item.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(rushRow.sub).toBe('Missed -graph · remember');
    expect(rushRow.preview?.[0]).toMatchObject({ root: photo.root, asked: '-graph', mean: 'record' });
    expect(rushRow.preview?.[1]).toMatchObject({ root: bio.root, asked: '-logy', mean: 'study of' });

    const vm = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 1,
      nextPlay: false,
      completed: started,
      entitled: true,
      learnedToday: true,
      rushRuns: 1,
      ...face,
    });
    expect(vm.big).toBe('Remember -graph');
    expect(vm.primary.label).toBe('Remember -graph ›');
    expect(vm.waiting).toBe('Remember -graph · then -logy');
    expect(vm.samples[0]).toMatchObject({ root: photo.root, asked: '-graph', mean: 'record' });
    expect(vm.samples[0]?.mean).not.toBe(photo.mean);
    expect(vm.scene?.caption).toBe('Missed -graph');
    expect(vm.samples[0]?.opensWord).toBeFalsy();

    const wordVm = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 1,
      nextPlay: false,
      completed: started,
      entitled: true,
      learnedToday: true,
      rushRuns: 1,
      rememberMissId: rootId(bio),
      rememberMissName: bio.root,
      rememberMissAsked: whichWord.title,
      rememberMissAskedMean: whichWord.sub,
    });
    expect(wordVm.big).toBe(`Remember ${biology.w}`);
    expect(wordVm.samples[0]).toMatchObject({
      root: bio.root,
      asked: biology.w,
      ok: false,
    });
    expect(wordVm.samples[0]?.opensWord).toBeFalsy();
    expect(wordVm.scene?.caption).toBe(`Missed ${biology.w}`);

    const meaning = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      completed: started,
      entitled: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: true,
    });
    expect(meaning.title).toBe(`Remember ${geo.root}`);
    expect(meaning.peekChips?.[0]).toMatchObject({ root: geo.root, mean: geo.mean });
    expect(meaning.peekChips?.[0]?.asked).toBeUndefined();
  });
});

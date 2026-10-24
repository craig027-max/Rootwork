import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyDailyPendingPreview,
  dailyMenuNextLine,
  dailyResumeCaption,
  dailyResumeSentence,
  dailySeed,
  liveDailyPending,
  parseDailyRun,
  pendingFromBeat,
  pickDailyRoots,
} from '../core/daily';
import { dailyNextPeekFace } from '../core/dailyNextPeek';
import { mulberry32 } from '../core/daily';
import { dailyResumeBeat, dailyShownNext, recallFromPending } from '../core/recall';
import { quizGloss } from '../core/wordDef';
import { otherPartsForRoot } from '../core/wordParts';
import { ROOTS, isRootOpenable, rootId, rootsInTier } from '../data/roots';
import { buildDetailVM } from './home/detailVM';
import { buildMenu } from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

const photo = ROOTS.find((r) => r.root === 'Photo');
const bio = ROOTS.find((r) => r.root === 'Bio');
if (!photo || !bio) throw new Error('fixture: Photo / Bio');
const photograph = photo.words.find((w) => w.w === 'Photograph');
const graph = otherPartsForRoot(photo).find((part) => part.letters === '-graph');
const biology = bio.words.find((w) => w.w === 'Biology');
if (!photograph || !graph || !biology) throw new Error('fixture: Photograph / -graph / Biology');

const starter = rootsInTier(1);
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: Builder');
const started = new Set([...starter.map((r) => rootId(r)), rootId(firstBuilder)]);
const pool = ROOTS.filter((r) => isRootOpenable(rootId(r), false));

describe('Continue Daily reopens the question Home names', () => {
  it('keeps a stored question and drops a junk one without dropping the resume', () => {
    const day = '2026-10-24';
    const pending = { kind: 'gloss' as const, word: 'Photograph' };
    const run = { day, studentId: 'kid', qi: 2, pending };
    expect(parseDailyRun(run)).toEqual(run);
    expect(parseDailyRun({ day, studentId: 'kid', qi: 2, pending: { kind: 'nope' } })).toEqual({
      day,
      studentId: 'kid',
      qi: 2,
    });
    expect(parseDailyRun({ day, studentId: 'kid', qi: 2, pending: { kind: 'gloss' } })).toEqual({
      day,
      studentId: 'kid',
      qi: 2,
    });
    expect(liveDailyPending(run, day, 'kid')).toEqual(pending);
    expect(liveDailyPending(run, '2026-10-25', 'kid')).toBeNull();
    expect(liveDailyPending(run, day, 'other')).toBeNull();
  });

  it('reopens Photograph, -graph, and the pieces — not a new coin-flip', () => {
    const gloss = quizGloss(photograph.d);
    if (!gloss) throw new Error('fixture: Photograph gloss');
    const word = recallFromPending({
      root: photo,
      pool,
      pending: { kind: 'gloss', word: 'Photograph' },
      rng: mulberry32(1),
      choices: 3,
    });
    expect(word?.ask).toBe('What does Photograph mean?');
    expect(word?.opts.find((o) => o.ok)?.label).toBe(gloss);
    expect(word?.opts.filter((o) => o.ok)).toHaveLength(1);

    const piece = recallFromPending({
      root: photo,
      pool,
      pending: { kind: 'part', part: '-graph', word: graph.word },
      rng: mulberry32(2),
      choices: 3,
    });
    expect(piece?.part).toBe('-graph');
    expect(piece?.ask).toContain('-graph');
    expect(piece?.opts.find((o) => o.ok)?.label).toBe(graph.mean);

    const pieces = recallFromPending({
      root: bio,
      pool,
      pending: { kind: 'build', word: 'Biology', split: biology.b },
      rng: mulberry32(3),
      choices: 3,
    });
    expect(pieces?.word).toBe('Biology');
    expect(pieces?.opts.find((o) => o.ok)?.label).toBe('Biology');
    expect(pieces?.ask).toContain(biology.b);

    expect(
      recallFromPending({
        root: photo,
        pool,
        pending: { kind: 'gloss', word: 'NotAWord' },
        rng: mulberry32(4),
      }),
    ).toBeNull();
  });

  it('deals the same question twice when nothing is stored, and again from that pending', () => {
    const day = '2026-10-24';
    const root = pickDailyRoots(pool, dailySeed(day, 'kid'))[1];
    if (!root) throw new Error('fixture: daily root');
    const first = dailyResumeBeat({ root, pool, day, studentId: 'kid', qi: 1 });
    const second = dailyResumeBeat({ root, pool, day, studentId: 'kid', qi: 1 });
    expect(second.ask).toBe(first.ask);
    expect(second.kind).toBe(first.kind);
    expect(second.opts.find((o) => o.ok)?.label).toBe(first.opts.find((o) => o.ok)?.label);
    const pending = pendingFromBeat(first);
    expect(pending?.kind).toBe(first.kind);
    const again = dailyResumeBeat({ root, pool, pending, day, studentId: 'kid', qi: 1 });
    expect(again.ask).toBe(first.ask);
    expect(again.opts.find((o) => o.ok)?.label).toBe(first.opts.find((o) => o.ok)?.label);
    expect(dailyShownNext({ root, pool, pending, day, studentId: 'kid', qi: 1 })).toEqual(
      dailyNextPeekFace(root, first),
    );
  });

  it('names Photograph on Home, Today, and the scene — a meaning beat stays Photo', () => {
    const face = dailyNextPeekFace(photo, { kind: 'gloss', word: 'Photograph' });
    expect(face).toEqual({ name: 'Photograph', mean: 'from Photo' });
    expect(dailyMenuNextLine(face.name, face.mean)).toBe('Next · Photograph · from Photo');
    expect(dailyResumeSentence(photo, face)).toBe('Next is Photograph — from Photo.');
    expect(dailyResumeCaption(photo, face)).toBe('Photograph · from Photo');
    expect(dailyMenuNextLine(photo.root, photo.mean)).toBe('Next · Photo');
    expect(dailyResumeSentence(photo, { name: photo.root, mean: photo.mean })).toBe(
      `Next is ${photo.root} — ${photo.mean}.`,
    );
    expect(dailyResumeCaption(photo, { name: photo.root, mean: photo.mean })).toBe(
      `${photo.root} · ${photo.mean}`,
    );

    const preview = applyDailyPendingPreview(
      [
        { root: 'Photo', mean: 'light' },
        { root: 'Aqua', mean: 'water' },
      ],
      'Photo',
      face,
    );
    expect(preview[0]).toEqual({ root: 'Photo', mean: 'from Photo', asked: 'Photograph' });
    expect(preview[1]).toEqual({ root: 'Aqua', mean: 'water' });

    const menu = buildMenu(started, false, {
      currentTier: 1,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: face.name,
      dailyNextMean: face.mean,
      dailyPreview: preview,
    });
    const row = menu.items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(row?.kind).toBe('mode');
    if (row?.kind !== 'mode') return;
    expect(row.sub).toBe('Next · Photograph · from Photo');
    expect(row.sub).not.toBe('Next · Photo');
    expect(row.resumeName).toBe('Photograph');
    expect(row.preview?.[0]?.asked).toBe('Photograph');

    const vm = buildDetailVM(row, {
      dailyRoots: [bio, photo, photo, photo, photo],
      dailyDone: false,
      dailyResumeQi: 1,
      dailyTotal: 5,
      dailyNextFace: face,
      streak: 0,
      nextPlay: false,
      completed: started,
      entitled: false,
    });
    expect(String(vm.lead)).toContain('Next is Photograph — from Photo.');
    expect(String(vm.lead)).not.toContain('Next is Photo — light.');
    expect(vm.scene?.caption).toBe('Photograph · from Photo');
    expect(vm.samples[0]?.asked).toBe('Photograph');
    expect(vm.samples[0]?.mean).toBe('from Photo');
    expect(vm.samples[0]?.mean).not.toBe(quizGloss(photograph.d));

    const today = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: face.name,
      dailyNextMean: face.mean,
      completed: started,
      entitled: true,
    });
    expect(today.items[0]?.label).toBe('Daily · 2 of 5 · Photograph · from Photo');
    expect(today.items[0]?.label).not.toContain('Photo · light');
  });

  it('wires Home, Rush, and the resume open to that same question', () => {
    expect(daily).toContain('dailyResumeBeat');
    expect(daily).toContain('pendingFromBeat(queuedNext)');
    expect(daily).toContain('saveDailyPending');
    expect(daily).toContain('sameDailyPending');
    expect(home).toContain('dailyShownNext');
    expect(home).toContain('applyDailyPendingPreview');
    expect(home).toContain('liveDailyPending');
    expect(home).toContain('dailyNextFace: dailyFace');
    expect(rush).toContain('dailyShownNext');
    expect(rush).toContain('dailyFace?.name ?? dailyNext?.root');
    expect(css).toMatch(/\.ww-menu-body \.sub\.is-long\s*\{[^}]*white-space:\s*normal/);
    expect(css).toMatch(/\.ww-menu-body \.sub\.is-long\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).not.toMatch(/\.ww-menu-body \.sub\.is-long\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-menu-meta \.pct\.is-long\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).not.toMatch(/\.ww-menu-meta \.pct\.is-long\s*\{[^}]*display:\s*none/);
  });
});

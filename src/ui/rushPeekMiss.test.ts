import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import {
  homeRushRecapPreview,
  rememberMissCtaLabel,
  rushRecapFromRun,
} from '../core/rushRecap';
import { buildDailyDone, buildRushResultNext, buildRushStart, rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, isMissMode } from './home/menu';
import { missPeekForNames, samplePeekLabel } from './home/samplePeek';
import { buildTodayProgress } from './home/todayProgress';

const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const peek = readFileSync(join(process.cwd(), 'src/ui/home/samplePeek.ts'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');
const quiz = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');

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

const first = firstRoot();
if (!first) throw new Error('fixture: expected Bio');
const starter = rootsInTier(1);
const geo = starter[1];
const photo = starter[2];
if (!geo || !photo) throw new Error('fixture: expected Geo / Photo');
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);

const lastRun = rushRecapFromRun(
  [
    { id: rootId(photo), ok: true },
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
  ],
  { day: '2026-09-15', studentId: 'kid-a' },
);
const lastPeek = homeRushRecapPreview(lastRun);

const missOpts = {
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
  dailyDone: true,
  learnedToday: true,
};

const extraMiss = {
  dailyRoots: [] as const,
  dailyDone: true,
  streak: 4,
  nextPlay: false,
  completed: startedBuilder,
  entitled: true,
  learnedToday: true,
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
  rushRuns: 1,
  rushBestPct: 80,
  rushBestStars: 4,
  rushBestScore: 2400,
  rushRecap: lastRun,
};

describe('Rush peek after a miss is Remember — not last-run Photo ✓ Bio ✓ over Geo', () => {
  it('makes Rush list / detail peek Missed Geo — not Photo ✓ Bio ✓', () => {
    const today = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      learnedRoot: firstBuilder.root,
      learnedRootId: rootId(firstBuilder),
      rememberRoot: geo.root,
      rememberMean: geo.mean,
      rememberRootId: rootId(geo),
      rememberMissed: true,
    });
    expect(today.cta?.label).toBe(rememberMissCtaLabel(geo.root));
    expect(today.missWaiting).toBe(true);

    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });

    expect(lastPeek.map((s) => s.root)).toEqual([photo.root, first.root, geo.root]);
    expect(lastPeek.map((s) => s.ok)).toEqual([true, true, false]);

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushPreview: lastPeek,
      rushMissName: geo.root,
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(isMissMode(rushRow)).toBe(true);
    expect(rushRow.title).toBe('Remember');
    expect(rushRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(rushRow.preview?.map((p) => p.root)).toEqual([geo.root]);
    expect(rushRow.preview?.map((p) => p.root)).not.toEqual(lastPeek.map((p) => p.root));
    expect(rushRow.preview?.every((p) => p.ok === false)).toBe(true);
    expect(rushRow.preview?.[0]?.mean).toBe(geo.mean);
    expect(rushRow.preview?.some((p) => p.root === photo.root)).toBe(false);
    expect(rushRow.preview?.some((p) => p.root === first.root)).toBe(false);

    const vm = buildDetailVM(rushRow, extraMiss);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(vm.samples.map((s) => s.root)).not.toContain(photo.root);
    expect(vm.samples.map((s) => s.root)).not.toContain(first.root);
    expect(vm.samples[0]?.ok).toBe(false);
    expect(vm.samples[0]?.mean).toBe(geo.mean);
    expect(vm.samplesDone).toBe(false);
    expect(vm.moreCount).toBe(0);
    expect(vm.sampleTap).toBe('remember');
    expect(samplePeekLabel('remember', geo.root, { ok: false })).toBe(`Missed ${geo.root}`);

    const two = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushPreview: lastPeek,
      rushMissName: geo.root,
      rushMissAlso: photo.root,
    });
    const twoRow = two.items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(twoRow?.kind).toBe('mode');
    if (twoRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(twoRow.preview?.map((p) => p.root)).toEqual([geo.root, photo.root]);
    expect(twoRow.preview?.every((p) => p.ok === false)).toBe(true);
    expect(missPeekForNames(geo.root, photo.root).map((s) => s.root)).toEqual([
      geo.root,
      photo.root,
    ]);

    const twoVm = buildDetailVM(twoRow, { ...extraMiss, rememberAlso: photo.root });
    expect(twoVm.samples.map((s) => s.root)).toEqual([geo.root, photo.root]);
    expect(twoVm.samples.every((s) => s.ok === false)).toBe(true);
  });

  it('makes Rush start / result peek Missed Geo — not last-run Photo ✓ Bio ✓', () => {
    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(start.title).toBe(`Remember ${geo.root}`);
    expect(start.peekChips?.map((p) => p.root)).toEqual([geo.root]);
    expect(start.peekChips?.map((p) => p.root)).not.toEqual(lastPeek.map((p) => p.root));
    expect(start.peekChips?.[0]?.ok).toBe(false);
    expect(start.peekChips?.[0]?.mean).toBe(geo.mean);

    const result = buildRushResultNext(startedBuilder, true, missOpts);
    expect(result.title).toBe(`Remember ${geo.root}`);
    expect(result.recap?.map((p) => p.root)).toEqual([geo.root]);
    expect(result.recap?.map((p) => p.root)).not.toEqual(lastPeek.map((p) => p.root));
    expect(result.recap?.[0]?.ok).toBe(false);
    expect(result.recap?.[0]?.mean).toBe(geo.mean);

    const two = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
      rememberAlso: photo.root,
    });
    expect(two.peekChips?.map((p) => p.root)).toEqual([geo.root, photo.root]);
    expect(two.peekChips?.every((p) => p.ok === false)).toBe(true);

    const twoResult = buildRushResultNext(startedBuilder, true, {
      ...missOpts,
      rememberAlso: photo.root,
    });
    expect(twoResult.recap?.map((p) => p.root)).toEqual([geo.root, photo.root]);
    expect(twoResult.recap?.every((p) => p.ok === false)).toBe(true);
  });

  it('keeps last-run Photo ✓ Bio ✓ once the miss is Remembered', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushPreview: lastPeek,
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(rushRow.preview?.map((p) => p.root)).toEqual(lastPeek.map((p) => p.root));
    expect(rushRow.preview?.map((p) => p.ok)).toEqual([true, true, false]);

    const clean = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 2400,
      rushRecap: lastRun,
    });
    expect(clean.big).toBe('Root Rush');
    expect(clean.samples.map((s) => s.root)).toEqual(lastPeek.map((p) => p.root));
    expect(clean.samples.map((s) => s.ok)).toEqual([true, true, false]);
    expect(clean.samples.map((s) => s.root)).not.toEqual([geo.root]);

    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      dailyDone: true,
      learnedToday: true,
    });
    expect(start.peekChips).toBeNull();
    expect(start.title).toBeNull();

    const done = buildRushResultNext(startedBuilder, true, {
      dailyDone: true,
      learnedToday: true,
    });
    expect(done.recap).toBeNull();
    expect(done.title).toBeNull();
    expect(done.celebrateGrade).toBe(true);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as last-run peek', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushPreview: lastPeek,
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(rushRow.preview?.map((p) => p.root)).toEqual(lastPeek.map((p) => p.root));

    const mid = buildDetailVM(rushRow, {
      ...extraMiss,
      dailyRoots: [
        { root: 'Chron', mean: 'time' },
        { root: 'Photo', mean: 'light' },
        { root: 'Aqua', mean: 'water' },
        { root: 'Bio', mean: 'life' },
        { root: 'Auto', mean: 'self' },
      ] as never,
      dailyResumeQi: 2,
      dailyTotal: 5,
    });
    expect(mid.big).toBe('Root Rush');
    expect(mid.waitingMiss).toBe(false);
    expect(mid.samples).toEqual([]);
    expect(mid.primary.label).not.toMatch(/Remember Geo/);

    const learnTile = buildDetailVM(rushRow, {
      ...extraMiss,
      learnedToday: false,
    });
    expect(learnTile.big).toBe('Root Rush');
    expect(learnTile.waitingMiss).toBe(false);
    expect(learnTile.samples.map((s) => s.root)).toEqual(lastPeek.map((p) => p.root));
    expect(learnTile.primary.label).toBe(`Continue ${secondBuilder.root} ›`);

    const learnOpen = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnOpen.peekChips).toBeNull();
    expect(learnOpen.continueLearn).toBe(`Continue ${secondBuilder.root} ›`);

    const learnResult = buildRushResultNext(startedBuilder, true, {
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnResult.recap).toBeNull();
    expect(learnResult.primary.label).toBe(`Continue ${secondBuilder.root} ›`);

    const daily = buildDailyDone({
      deal: [
        { root: 'Chron', mean: 'time' },
        { root: 'Photo', mean: 'light' },
        { root: 'Aqua', mean: 'water' },
        { root: 'Bio', mean: 'life' },
        { root: 'Auto', mean: 'self' },
      ],
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: false,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
    });
    expect(daily.recap.map((r) => r.root)).not.toEqual([geo.root]);
    expect(daily.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
  });

  it('wires Rush list / detail / start / result — Missed Geo, not last-run ✓', () => {
    expect(menu).toContain('missPeekForNames(missName, missAlso)');
    expect(menu).toContain('missPreview.length > 0');
    expect(menu).toContain('? missPreview');
    expect(detail).toContain('missPeekForNames(miss.name, miss.also)');
    expect(detail).toContain('? missSamples');
    expect(detail).toContain('moreCount: rushMore');
    expect(overlay).toContain('peekChips: miss ? missPeekForNames(miss.name, miss.also) : null');
    expect(overlay).toContain('recap: missPeekForNames(miss.name, miss.also)');
    expect(rush).toContain('rushStart.missWaiting');
    expect(rush).toContain('rushStart.peekChips');
    expect(rush).toContain('rushNext.missWaiting && rushNext.recap');
    expect(rush).toContain("samplePeekLabel('remember', s.root, { ok: false })");
    expect(rush).toContain("samplePeekLabel('remember', catalog.root, { ok: false })");
    expect(rush).toContain('q-done-mark is-miss');
    expect(peek).toContain('export function missPeekForNames');
    expect(css).toMatch(/\.ww-daily-line\.is-miss/);
    expect(css).toMatch(/\.ww-daily-mark\.is-miss/);
    expect(quiz).toMatch(/\.q-done-mark\.is-miss/);
    expect(quiz).toMatch(/\.q-daily-chip\.is-miss/);
  });

  it('keeps Missed Geo peek readable on a phone — not hidden behind Photo ✓', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-daily-line\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-daily-line\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-daily-line\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(short).not.toMatch(/\.ww-daily-line\.is-miss\s*\{[^}]*display:\s*none/);
    const quizPhone = mediaBlock(quiz, 'max-width: 560px');
    expect(quizPhone).toMatch(/\.q-daily-chip\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    expect(quizPhone).not.toMatch(/\.q-daily-chip\.is-miss\s*\{[^}]*display:\s*none/);
    expect(quizPhone).toMatch(/\.q-rush-start-recap\s*\{[^}]*display:\s*flex/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
    expect(first.root).toBe('Bio');
  });
});

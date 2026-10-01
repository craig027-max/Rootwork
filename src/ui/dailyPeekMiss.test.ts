import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel } from '../core/rushRecap';
import { buildDailyDone, rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, isMissMode } from './home/menu';
import { missPeekForNames, samplePeekLabel } from './home/samplePeek';
import { buildTodayProgress } from './home/todayProgress';

const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const tierMenu = readFileSync(join(process.cwd(), 'src/ui/home/TierMenu.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
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

const todayDeal = [
  { root: 'Chron', mean: 'time' },
  { root: 'Photo', mean: 'light' },
  { root: 'Aqua', mean: 'water' },
  { root: 'Bio', mean: 'life' },
  { root: 'Auto', mean: 'self' },
];

const missOpts = {
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
  dailyDone: true,
  learnedToday: true,
};

const extraMiss = {
  dailyRoots: todayDeal as never,
  dailyDone: true,
  streak: 4,
  nextPlay: false,
  completed: startedBuilder,
  entitled: true,
  learnedToday: true,
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
};

describe('Daily peek after a miss is Remember — not today\'s five ✓ over Geo', () => {
  it('makes Daily list / detail peek Missed Geo — not Chron ✓ Photo ✓ Aqua', () => {
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

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
      dailyStreak: 4,
      rushMissName: geo.root,
    });
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(dailyRow?.kind).toBe('mode');
    if (dailyRow?.kind !== 'mode') throw new Error('fixture: Daily missing');
    expect(isMissMode(dailyRow)).toBe(true);
    expect(dailyRow.title).toBe('Remember');
    expect(dailyRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(dailyRow.previewDone).toBe(false);
    expect(dailyRow.preview?.map((p) => p.root)).toEqual([geo.root]);
    expect(dailyRow.preview?.map((p) => p.root)).not.toEqual(
      todayDeal.slice(0, 3).map((p) => p.root),
    );
    expect(dailyRow.preview?.every((p) => p.ok === false)).toBe(true);
    expect(dailyRow.preview?.[0]?.mean).toBe(geo.mean);
    expect(dailyRow.preview?.some((p) => p.root === 'Chron')).toBe(false);

    const vm = buildDetailVM(dailyRow, extraMiss);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.samples.map((s) => s.root)).toEqual([geo.root]);
    expect(vm.samples.map((s) => s.root)).not.toContain('Chron');
    expect(vm.samples.map((s) => s.root)).not.toContain('Aqua');
    expect(vm.samples[0]?.ok).toBe(false);
    expect(vm.samples[0]?.mean).toBe(geo.mean);
    expect(vm.samplesDone).toBe(false);
    expect(vm.moreCount).toBe(0);
    expect(vm.sampleTap).toBe('remember');
    expect(samplePeekLabel('remember', geo.root, { ok: false })).toBe(`Missed ${geo.root}`);

    const two = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
      rushMissName: geo.root,
      rushMissAlso: photo.root,
    });
    const twoRow = two.items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(twoRow?.kind).toBe('mode');
    if (twoRow?.kind !== 'mode') throw new Error('fixture: Daily missing');
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

  it('makes Daily overlay recap Missed Geo — not today\'s five ✓', () => {
    const reopen = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(reopen.title).toBe(`Remember ${geo.root}`);
    expect(reopen.recapDone).toBe(false);
    expect(reopen.recap.map((r) => r.root)).toEqual([geo.root]);
    expect(reopen.recap.map((r) => r.root)).not.toEqual(todayDeal.map((r) => r.root));
    expect(reopen.recap[0]?.ok).toBe(false);
    expect(reopen.recap[0]?.mean).toBe(geo.mean);
    expect(reopen.recap.some((r) => r.root === 'Chron')).toBe(false);

    const two = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
      rememberAlso: photo.root,
    });
    expect(two.recap.map((r) => r.root)).toEqual([geo.root, photo.root]);
    expect(two.recap.every((r) => r.ok === false)).toBe(true);
    expect(two.recapDone).toBe(false);
  });

  it('keeps today\'s five ✓ once the miss is Remembered', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
      dailyStreak: 4,
    });
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(dailyRow?.kind).toBe('mode');
    if (dailyRow?.kind !== 'mode') throw new Error('fixture: Daily missing');
    expect(dailyRow.previewDone).toBe(true);
    expect(dailyRow.preview?.map((p) => p.root)).toEqual(todayDeal.slice(0, 3).map((p) => p.root));

    const clean = buildDetailVM(dailyRow, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(clean.big).toBe('Daily');
    expect(clean.samplesDone).toBe(true);
    expect(clean.samples.map((s) => s.root)).toEqual(todayDeal.slice(0, 3).map((p) => p.root));
    expect(clean.samples.map((s) => s.root)).not.toEqual([geo.root]);

    const done = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(done.recapDone).toBe(true);
    expect(done.recap.map((r) => r.root)).toEqual(todayDeal.map((r) => r.root));
    expect(done.recap.every((r) => r.ok !== false)).toBe(true);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as today\'s five', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
    });
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(dailyRow?.kind).toBe('mode');
    if (dailyRow?.kind !== 'mode') throw new Error('fixture: Daily missing');
    expect(dailyRow.preview?.map((p) => p.root)).toEqual(todayDeal.slice(0, 3).map((p) => p.root));

    const mid = buildDetailVM(dailyRow, {
      ...extraMiss,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyDone: false,
      learnedToday: false,
    });
    expect(mid.big).toBe('Daily');
    expect(mid.waitingMiss).toBe(false);
    expect(mid.samples.map((s) => s.root)).not.toEqual([geo.root]);
    expect(mid.primary.label).not.toMatch(/Remember Geo/);

    const learnOpen = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      learnedToday: false,
    });
    expect(learnOpen.recapDone).toBe(true);
    expect(learnOpen.recap.map((r) => r.root)).toEqual(todayDeal.map((r) => r.root));
    expect(learnOpen.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
  });

  it('wires Daily list / detail / overlay — Missed Geo, not today\'s five ✓', () => {
    expect(menu).toContain('missPeekForNames(missName, missAlso)');
    expect(menu).toContain('missPreview.length > 0 ? missPreview : opts.dailyPreview');
    expect(menu).toContain('!missName');
    expect(detail).toContain('missPeekForNames(miss.name, miss.also)');
    expect(detail).toContain('miss ? missSamples');
    expect(detail).toContain('missHero: Boolean(miss)');
    expect(tierMenu).toContain('lineMiss ? (');
    expect(tierMenu).toContain('ww-daily-mark is-miss');
    expect(overlay).toContain('missPeekForNames(miss.name, miss.also)');
    expect(overlay).toContain('recapDone: !miss');
    expect(daily).toContain('done.recap.map');
    expect(daily).toContain('chipMiss');
    expect(daily).toContain('openRecap(r)');
    expect(daily).toContain("samplePeekLabel('remember', r.root, { ok: false })");
    expect(home).toContain('rushMissAlso: missHero ? rememberAlso : undefined');
    expect(peek).toContain('export function missPeekForNames');
    expect(css).toMatch(/\.ww-daily-line\.is-miss/);
    expect(css).toMatch(/\.ww-daily-mark\.is-miss/);
    expect(quiz).toMatch(/\.q-done-mark\.is-miss/);
    expect(quiz).toMatch(/\.q-daily-chip\.is-miss/);
  });

  it('keeps Missed Geo peek readable on a phone — not hidden behind Chron ✓', () => {
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
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
    expect(first.root).toBe('Bio');
  });
});

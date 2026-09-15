import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { recapOpenForId } from '../core/deckFlow';
import { stampReviewedAt } from './home/progressStamp';
import {
  homeRushRecapPreview,
  rushHoldLine,
  rushRecapChipLabel,
  rushRecapFromRun,
} from '../core/rushRecap';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, defaultSelectedIndex, homeSelectedIndex } from './home/menu';
import { dailyDoneRowLabel } from './home/todayProgress';
import { homeSampleAction, samplePeekTap } from './home/samplePeek';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const store = readFileSync(join(process.cwd(), 'src/app/store.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');
const appCss = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

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
if (!firstBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);
const lastRun = rushRecapFromRun(
  [
    { id: rootId(photo), ok: true },
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
  ],
  { day: '2026-09-15', studentId: 'kid-a' },
);

describe('Rush recap is Remember — not a grade-only / Bio → Geo dump', () => {
  it('result chips Remember owned roots and Meet unowned ones', () => {
    expect(rushRecapChipLabel(photo.root, true)).toBe(`Remember ${photo.root}`);
    expect(recapOpenForId(rootId(first), startedBuilder)).toEqual({
      id: rootId(first),
      entry: 'remember',
    });
    expect(recapOpenForId(rootId(first), new Set())).toEqual({
      id: rootId(first),
      entry: 'teach',
    });
    expect(stampReviewedAt({ [rootId(first)]: { completedAt: 1 } }, rootId(first), 2)?.[
      rootId(first)
    ]?.reviewedAt).toBe(2);
    expect(stampReviewedAt({}, rootId(first), 2)).toBeNull();
  });

  it('Home Rush peeks the real last run as Remember taps', () => {
    const peek = homeRushRecapPreview(lastRun);
    expect(peek.map((s) => s.root)).toEqual([photo.root, first.root, geo.root]);
    expect(peek.map((s) => s.root)).not.toEqual(starter.slice(0, 3).map((r) => r.root));

    const { items } = buildMenu(startedBuilder, false, { currentTier: 2 });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow).toBeTruthy();
    if (!rushRow) throw new Error('fixture: Rush missing');
    expect(homeSampleAction(rushRow, photo.root)).toEqual({ kind: 'root', name: photo.root });
    expect(samplePeekTap({ mode: 'rush', sampleCount: peek.length })).toBe('remember');

    const vm = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 3,
      nextPlay: false,
      completed: startedBuilder,
      entitled: false,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 2400,
      rushRecap: lastRun,
    });
    expect(vm.samples.map((s) => s.root)).toEqual([photo.root, first.root, geo.root]);
    expect(vm.sampleTap).toBe('remember');
    expect(vm.samplesDone).toBe(true);
    expect(vm.samples.map((s) => s.root)).not.toEqual(['Bio', 'Geo', 'Photo']);
  });

  it('hides Home Rush recap while Daily is mid-run so Chron is not buried', () => {
    const { items } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    if (!rushRow) throw new Error('fixture: Rush missing');
    const vm = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: false,
      dailyResumeQi: 2,
      dailyTotal: 5,
      streak: 3,
      nextPlay: false,
      completed: startedBuilder,
      entitled: false,
      rushRecap: lastRun,
    });
    expect(vm.samples).toEqual([]);
    expect(vm.sampleTap).toBeUndefined();
    expect(vm.secondary?.label).toMatch(/Continue Daily/);
  });

  it('names Daily done on Today and lands Home on that recap until they learn', () => {
    expect(dailyDoneRowLabel(['Chron', 'Photo', 'Aqua'])).toBe('Daily · done · Chron · Photo · Aqua');
    expect(dailyDoneRowLabel([])).toBe('Daily · done for today');
    const entitled = buildMenu(startedBuilder, true, { currentTier: 2 });
    expect(defaultSelectedIndex(entitled.items, 2, { dailyDone: true })).toBe(1);
    expect(homeSelectedIndex(null, entitled.items, 2, { dailyDone: true })).toBe(1);
    expect(entitled.items[1]).toMatchObject({ kind: 'mode', key: 'daily' });
    expect(homeSelectedIndex(null, entitled.items, 2, { dailyDone: true, learnedToday: true })).toBe(
      3,
    );
    expect(homeSelectedIndex(null, entitled.items, 2, { dailyResume: true, dailyDone: false })).toBe(
      1,
    );
  });

  it('wires Rush hold + recap chips + Remember stamp — not openRoot teach', () => {
    expect(rushHoldLine('Chron', 'time', 200, 2)).toBe('Yes — Chron means time. +200 · 2× combo');
    expect(rush).toContain('const AUTO_ADVANCE_MS = 1600');
    expect(rush).toContain('rushHoldLine');
    expect(rush).toContain('rememberRushHit');
    expect(rush).toContain('rushRecapFromRun');
    expect(rush).toContain('openRecap');
    expect(rush).toContain('recapDeckEntry');
    expect(rush).toContain('q-rush-recap');
    expect(rush).toContain('rushRecapChipLabel');
    expect(rush).not.toContain('onClick={() => openRoot(rootId(q.root))}');
    expect(store).toContain('rememberRushHit');
    expect(store).toContain('applyRushHit');
    expect(store).toContain('wondral:rushRecap:v1:');
    expect(store).toContain('parseRushRecap');
    expect(home).toContain('liveRushRecap');
    expect(home).toContain('dailyRecapNames');
    expect(home).toContain('learnedToday: learnedId !== null');
    expect(home).toContain('rushRecap: lastRush');
    expect(detail).toContain('homeRushRecapPreview');
    expect(detail).toContain('rushRecap');
    expect(menu).toContain('dailyDone && !opts.learnedToday');
  });

  it('keeps Rush recap chips + meaning hold readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-rush-recap\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.q-fb\.good\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-rush-recap\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-rush-recap\s*\{[^}]*display:\s*flex/);
    const homePhone = mediaBlock(appCss, 'max-width: 860px');
    expect(homePhone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-done\.is-tap\s*\{[^}]*display:\s*flex/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

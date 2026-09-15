import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import {
  homeRushRecapPreview,
  peekChipDone,
  rushMissLine,
  rushRecapChipLabel,
  rushRecapFromRun,
  todayRushRecap,
} from '../core/rushRecap';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, defaultSelectedIndex, homeSelectedIndex } from './home/menu';
import { samplePeekLabel } from './home/samplePeek';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
const tierMenu = readFileSync(join(process.cwd(), 'src/ui/home/TierMenu.tsx'), 'utf8');
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
const yesterday = rushRecapFromRun(
  [{ id: rootId(photo), ok: true }],
  { day: '2026-09-14', studentId: 'kid-a' },
);

describe('Rush recap is honest — ✓ only on hits, not an all-done dump', () => {
  it('keeps ok on the peek so Geo missed cannot wear a fake ✓', () => {
    const peek = homeRushRecapPreview(lastRun);
    expect(peek.map((s) => s.root)).toEqual([photo.root, first.root, geo.root]);
    expect(peek.map((s) => s.ok)).toEqual([true, true, false]);
    expect(peekChipDone({ ok: peek[0]?.ok })).toBe(true);
    expect(peekChipDone({ ok: peek[2]?.ok })).toBe(false);
    expect(peekChipDone({ done: true, ok: false })).toBe(false);
    expect(rushRecapChipLabel(geo.root, true, false)).toBe(`Missed ${geo.root}`);
    expect(samplePeekLabel('remember', geo.root, { ok: false })).toBe(`Missed ${geo.root}`);
    expect(samplePeekLabel('remember', photo.root, { ok: true })).toBe(`Remember ${photo.root}`);
  });

  it('Home Rush peeks hit/miss chips and lands on today\'s last run', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushPreview: homeRushRecapPreview(lastRun),
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(rushRow.preview?.map((s) => s.root)).toEqual([photo.root, first.root, geo.root]);
    expect(rushRow.preview?.map((s) => s.ok)).toEqual([true, true, false]);

    const vm = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 3,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 2400,
      rushRecap: lastRun,
    });
    expect(vm.samples.map((s) => s.ok)).toEqual([true, true, false]);
    expect(vm.samplesDone).toBe(false);
    expect(vm.sampleTap).toBe('remember');

    expect(todayRushRecap(lastRun, 'kid-a', '2026-09-15')).toEqual(lastRun);
    expect(todayRushRecap(yesterday, 'kid-a', '2026-09-15')).toBeNull();
    expect(defaultSelectedIndex(items, 2, { rushToday: true })).toBe(0);
    expect(homeSelectedIndex(null, items, 2, { dailyDone: true, rushToday: true })).toBe(0);
    expect(homeSelectedIndex(null, items, 2, { dailyDone: true })).toBe(1);
    expect(
      homeSelectedIndex(null, items, 2, { dailyResume: true, rushToday: true }),
    ).toBe(1);
    expect(items[0]).toMatchObject({ kind: 'mode', key: 'rush' });
    expect(items[1]).toMatchObject({ kind: 'mode', key: 'daily' });
  });

  it('hides the Rush peek while Daily is mid-run so Chron is not buried', () => {
    const { items } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      rushPreview: homeRushRecapPreview(lastRun, { dailyResume: true }),
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    if (!rushRow) throw new Error('fixture: Rush missing');
    expect(rushRow.kind === 'mode' && rushRow.preview).toBeFalsy();
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
    expect(vm.secondary?.label).toMatch(/Continue Daily/);
  });

  it('wires miss hold + start/result chips + Home land — not an all-✓ dump', () => {
    expect(rushMissLine('Chron', 'time')).toBe('Nope — Chron means time.');
    expect(rush).toContain('rushMissLine');
    expect(rush).toContain('startPeek');
    expect(rush).toContain('q-rush-start-recap');
    expect(rush).toContain("s.ok ? ' is-done' : ' is-miss'");
    expect(rush).toContain("hit ? ' is-done' : ' is-miss'");
    expect(rush).toContain('rushRecapChipLabel(item.root.root, owned, hit)');
    expect(home).toContain('todayRushRecap');
    expect(home).toContain('rushPreview');
    expect(home).toContain('rushToday: rushToday != null');
    expect(menu).toContain('opts.rushToday');
    expect(menu).toContain('opts.rushPreview');
    expect(detail).toContain('peekChipDone');
    expect(detail).toContain('rushSamples.every');
    expect(panel).toContain('chipMiss');
    expect(panel).toContain('is-miss');
    expect(tierMenu).toContain('peekChipDone');
    expect(tierMenu).toContain('lineMiss');
  });

  it('keeps hit + miss chips + miss hold readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-fb\.bad\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-daily-chip\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    expect(phone).toMatch(/\.q-rush-start-recap\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.q-daily-chip\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-fb\.bad\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.q-daily-chip\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    const homePhone = mediaBlock(appCss, 'max-width: 860px');
    expect(homePhone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-miss\.is-tap\s*\{[^}]*display:\s*flex/);
    expect(homePhone).toMatch(/\.ww-daily-line\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(appCss).toMatch(/\.ww-schip\.is-miss/);
    expect(css).toMatch(/\.q-daily-chip\.is-miss/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

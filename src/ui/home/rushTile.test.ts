import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rootId, rootsInTier } from '../../data/roots';
import { EMPTY_STATS, gradeForPct, recordRun } from '../../core/stats';
import { buildDetailVM } from './detailVM';
import { buildMenu, rushBestLabel } from './menu';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const store = readFileSync(join(process.cwd(), 'src/app/store.ts'), 'utf8');
const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
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

const starter = rootsInTier(1);
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: expected a first Builder root');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);

const rushItem = buildMenu(startedBuilder, false, { currentTier: 2 }).items.find(
  (it) => it.kind === 'mode' && it.key === 'rush',
);
if (!rushItem || rushItem.kind !== 'mode') throw new Error('fixture: Rush tile missing');

const extraBase = {
  dailyRoots: [],
  dailyDone: false,
  streak: 0,
  nextPlay: false,
  completed: startedBuilder,
  entitled: false,
};

describe('Home Root Rush tile: no fake Starter trio', () => {
  it('does not list Bio / Geo / Photo (or any other roots) as if they were the quiz', () => {
    const vm = buildDetailVM(rushItem, extraBase);

    expect(vm.samples).toEqual([]);
    expect(vm.samples.map((s) => s.root)).not.toEqual(['Bio', 'Geo', 'Photo']);
    expect(vm.samples.map((s) => s.root)).not.toEqual(starter.slice(0, 3).map((r) => r.root));
    expect(vm.sampleLines).toBeFalsy();
    expect(vm.samplesDone).toBeFalsy();
    expect(vm.ring).toBeUndefined();
    expect(vm.primary.label).toMatch(/Start the run/);
    expect(vm.primary.label).not.toMatch(/Play again/);
  });

  it('keeps Rush off the first-run one-Play board', () => {
    const firstRun = buildMenu(new Set(), false, { currentTier: 1, nextPlay: true });
    expect(firstRun.items.some((it) => it.kind === 'mode' && it.key === 'rush')).toBe(false);
    expect(buildMenu(starterDone, false, { currentTier: 2, nextPlay: true }).items.some(
      (it) => it.kind === 'mode' && it.key === 'rush',
    )).toBe(false);
  });
});

describe('Home Root Rush tile: best recap after a run', () => {
  const banked = recordRun(EMPTY_STATS, {
    correct: 8,
    total: 10,
    day: '2026-09-03',
    score: 2400,
  });

  it('recaps the kid\'s real best — grade, stars, and combo score — not a naked Start reset', () => {
    expect(banked.stats.runs).toBe(1);
    expect(banked.stats.bestScore).toBe(2400);
    expect(banked.run.grade).toBe('A');
    expect(banked.run.stars).toBe(4);

    const label = rushBestLabel(banked.stats);
    expect(label).toBe('A · 4★ · 2,400');

    const { items } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      rushBest: label,
    });
    const row = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(row?.kind).toBe('mode');
    if (row?.kind !== 'mode') throw new Error('expected Rush mode row');
    expect(row.best).toBe('A · 4★ · 2,400');
    expect(row.preview).toBeUndefined();

    const vm = buildDetailVM(row, {
      ...extraBase,
      rushRuns: banked.stats.runs,
      rushBestPct: banked.stats.bestPct,
      rushBestStars: banked.stats.bestStars,
      rushBestScore: banked.stats.bestScore,
    });

    expect(vm.samples).toEqual([]);
    expect(vm.samples.map((s) => s.root)).not.toEqual(['Bio', 'Geo', 'Photo']);
    expect(vm.samplesDone).toBeFalsy();
    expect(vm.ring).toEqual({ pct: banked.stats.bestPct, label: gradeForPct(banked.stats.bestPct) });
    expect(vm.ring?.label).toBe('A');
    expect(vm.pmA).toBe('4★ best');
    expect(vm.pmB).toBe('2,400 combo');
    expect(String(vm.lead)).toMatch(/Best so far/);
    expect(String(vm.lead)).toMatch(/2,400/);
    expect(vm.primary.label).toMatch(/Play again/);
    expect(vm.primary.label).not.toMatch(/Start the run/);
  });

  it('still keeps Start / Play again as the next tap when there is no combo yet', () => {
    const noCombo = recordRun(EMPTY_STATS, { correct: 2, total: 10, day: '2026-09-03' });
    expect(noCombo.stats.runs).toBe(1);
    expect(noCombo.stats.bestScore).toBe(0);
    expect(rushBestLabel(noCombo.stats)).toBe('D · 1★');

    const vm = buildDetailVM(rushItem, {
      ...extraBase,
      rushRuns: noCombo.stats.runs,
      rushBestPct: noCombo.stats.bestPct,
      rushBestStars: noCombo.stats.bestStars,
      rushBestScore: noCombo.stats.bestScore,
    });
    expect(vm.samples).toEqual([]);
    expect(vm.ring?.label).toBe('D');
    expect(vm.pmA).toBe('1★ best');
    expect(vm.pmB).toBe('Ten questions a run');
    expect(vm.primary.label).toMatch(/Play again/);
  });

  it('wires the Home tile from live stats and keeps the recap on a phone-width viewport', () => {
    expect(home).toContain('rushBestLabel(stats)');
    expect(home).toContain('rushRuns: stats.runs');
    expect(home).toContain('rushBestScore: stats.bestScore ?? 0');
    expect(detail).toContain("item.key === 'rush'");
    expect(detail).toContain('samples: []');
    expect(detail).not.toMatch(/rootsInTier\(1\)\.slice\(0,\s*3\)/);
    expect(detail).toContain("played ? 'Play again 🎯' : 'Start the run 🎯'");

    const ctaAt = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8').indexOf(
      'ww-detail-cta',
    );
    expect(ctaAt).toBeGreaterThan(0);

    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-prog\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-pmeta \.pm-a\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-pmeta \.pm-b\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-prog\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-pmeta \.pm-a\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-pmeta \.pm-b\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-ring\s*\{[^}]*display:\s*none/);
  });
});

describe('Root Rush combo bestScore uses the normal stats path', () => {
  it('recordQuizRun passes combo score into recordRun and saveStats', () => {
    expect(store).toContain('recordQuizRun: (correct, total, score)');
    expect(store).toContain(
      'recordRun(get().stats, { correct, total, day: localDayKey(), score })',
    );
    expect(store).toContain('saveStats(stats, studentId)');
  });

  it('does not dual-write wondral:stats:v1 from RootRush', () => {
    expect(rush).toContain('recordQuizRun(correctCount, questions.length, score)');
    expect(rush).toContain('run.isNewBestScore');
    expect(rush).not.toContain('persistBestScore');
    expect(rush).not.toContain('wondral:stats:v1:');
    expect(rush).not.toContain('localStorage.setItem');
    expect(rush).not.toContain('localStorage.getItem');
  });

  it('banks combo score on the GameStats blob the store already persists', () => {
    const first = recordRun(EMPTY_STATS, { correct: 5, total: 10, day: '2026-09-03', score: 900 });
    expect(first.stats.bestScore).toBe(900);
    expect(first.run.isNewBestScore).toBe(true);

    const kidB = recordRun(EMPTY_STATS, { correct: 1, total: 10, day: '2026-09-03', score: 100 });
    expect(kidB.stats.bestScore).toBe(100);
    expect(kidB.stats.bestScore).not.toBe(first.stats.bestScore);
  });
});

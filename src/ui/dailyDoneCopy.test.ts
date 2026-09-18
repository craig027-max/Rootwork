import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import {
  dailyDoneLead,
  dailyDoneMenuSub,
  dailyDoneOverlaySub,
  dailyRecapChipLabel,
} from '../core/daily';
import { buildDailyDone, dailyDonePrimary } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu } from './home/menu';
import { samplePeekLabel } from './home/samplePeek';
import { buildTodayProgress } from './home/todayProgress';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
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
if (!first) throw new Error('fixture: expected a first root');
const starter = rootsInTier(1);
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder roots');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);

const todayDeal = [
  { root: 'Chron', mean: 'time' },
  { root: 'Photo', mean: 'light' },
  { root: 'Aqua', mean: 'water' },
  { root: 'Bio', mean: 'life' },
  { root: 'Geo', mean: 'earth' },
];
const previewNames = todayDeal.slice(0, 3).map((r) => r.root);

describe('Daily done copy is a recap — not a fresh-start pitch', () => {
  it('names the done set on Today / menu / overlay — Continue stays the hero', () => {
    const today = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      dailyRecapNames: todayDeal.map((r) => r.root),
      completed: startedBuilder,
      entitled: true,
    });
    expect(today.cta).toEqual({
      kind: 'learn',
      label: `Continue ${secondBuilder.root} ›`,
      rootId: rootId(secondBuilder),
    });
    expect(today.items[0]?.label).toBe('Daily · done · Chron · Photo · Aqua');

    expect(dailyDoneMenuSub(previewNames)).toBe('Done · Chron · Photo · Aqua');
    expect(dailyDoneLead(4)).toBe(
      "Today's five are done. Same until tomorrow. Streak banked — 🔥 4 days.",
    );
    expect(dailyDoneOverlaySub(true)).toBe("Today's five are done. Same until tomorrow.");
    expect(dailyDoneOverlaySub(false)).toBe("Today's five are done. Replay is just for fun.");

    const overlayVm = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
    });
    expect(overlayVm.sub).toBe(dailyDoneOverlaySub(true));
    expect(overlayVm.primary).toEqual(dailyDonePrimary(startedBuilder, true));
    expect(overlayVm.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(overlayVm.replayLabel).toBe('Play again ›');
    expect(overlayVm.sub).not.toMatch(/Five fresh roots|keep your streak|Play again/i);
  });

  it('Home Daily tile recaps the done set — not Five fresh roots', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
    });
    const dailyItem = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    if (!dailyItem || dailyItem.kind !== 'mode') throw new Error('fixture: Daily missing');
    expect(dailyItem.sub).toBe('Done · Chron · Photo · Aqua');
    expect(dailyItem.sub).not.toMatch(/Five fresh roots|same five until tomorrow/);

    const vm = buildDetailVM(dailyItem, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
    });
    expect(vm.lead).toBe(dailyDoneLead(4));
    expect(String(vm.lead)).not.toMatch(/Five fresh roots|keep your streak/i);
    expect(vm.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(vm.samples.find((s) => s.root === 'Photo')?.owned).toBe(true);
    expect(vm.samples.find((s) => s.root === 'Chron')?.owned).toBe(false);
    expect(samplePeekLabel('remember', 'Photo', { owned: true })).toBe('Remember Photo');
    expect(samplePeekLabel('remember', 'Chron', { owned: false })).toBe('Meet Chron');
    expect(dailyRecapChipLabel('Photo', true)).toBe('Remember Photo');
    expect(dailyRecapChipLabel('Chron', false)).toBe('Meet Chron');
  });

  it('keeps Continue Daily / first-run Play Bio / Rush-miss Remember as they are', () => {
    const mid = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      completed: startedBuilder,
      entitled: true,
    });
    expect(mid.cta).toEqual({ kind: 'daily', label: 'Continue Daily · 3 of 5 ›' });
    expect(mid.items[0]?.label).toBe('Daily · 2 of 5 · Chron · time');

    const fresh = buildMenu(new Set(), false, { currentTier: 1, nextPlay: true });
    expect(fresh.items.some((it) => it.kind === 'mode' && it.key === 'daily')).toBe(false);
    expect(dailyDonePrimary(new Set(), false).label).toBe(`Play ${first.root} ›`);
    expect(overlay).toContain('Rush-miss Remember stays on Today / Rush');
  });

  it('wires Home + overlay + chips to the shared done recap', () => {
    expect(overlay).toContain('dailyDoneOverlaySub');
    expect(daily).toContain('dailyRecapChipLabel');
    expect(daily).toContain('buildDailyDone');
    expect(home).toContain('dailyDonePrimary');
    expect(detail).toContain('dailyDoneLead');
    expect(detail).toContain('owned:');
    expect(menu).toContain('dailyDoneMenuSub');
    expect(panel).toContain('owned: s.owned');
    expect(panel).toContain('samplePeekLabel');
  });

  it('keeps the done recap + Continue tap readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-actions\s*\{[^}]*flex-direction:\s*column/);
    expect(phone).toMatch(/\.q-daily-chip\.is-done\s*\{[^}]*display:\s*inline-flex|\.q-daily-chip/);
    expect(phone).not.toMatch(/\.q-sub\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.q-daily-chip\.is-done/);
    const homePhone = mediaBlock(appCss, 'max-width: 860px');
    expect(homePhone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-done\.is-tap\s*\{[^}]*display:\s*flex/);
    expect(homePhone).not.toMatch(/\.ww-samples\.is-lines\s*\{[^}]*display:\s*none/);
    expect(appCss).toMatch(/\.ww-schip\.is-done/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

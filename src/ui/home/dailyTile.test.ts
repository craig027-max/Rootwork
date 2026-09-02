import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, isRootOpenable, rootId, rootsInTier } from '../../data/roots';
import { dailySeed, dailyTilePreview, pickDailyRoots } from '../../core/daily';
import { buildDetailVM } from './detailVM';
import { buildMenu } from './menu';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/TierMenu.tsx'), 'utf8');
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

const T1 = ROOTS.filter((r) => isRootOpenable(rootId(r), false));
const starter = rootsInTier(1);
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: expected a first Builder root');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);

const today = pickDailyRoots(T1, dailySeed('2026-09-01', 'kid-a'));
const preview = dailyTilePreview(today);

const dailyItem = buildMenu(startedBuilder, false, {
  currentTier: 1,
  dailyPreview: preview,
}).items.find((it) => it.kind === 'mode' && it.key === 'daily');
if (!dailyItem || dailyItem.kind !== 'mode') throw new Error('fixture: Daily tile missing');

describe('Home Daily tile: three names + one-line meanings before Start', () => {
  it('lists today\'s three Daily roots with their real one-line meanings', () => {
    expect(today).toHaveLength(5);
    expect(preview).toHaveLength(3);

    const vm = buildDetailVM(dailyItem, {
      dailyRoots: today,
      dailyDone: false,
      streak: 0,
      nextPlay: false,
      completed: startedBuilder,
      entitled: false,
    });

    expect(vm.samples).toHaveLength(3);
    expect(vm.sampleLines).toBe(true);
    expect(vm.samples.map((s) => s.root)).toEqual(today.slice(0, 3).map((r) => r.root));
    expect(vm.samples.map((s) => s.mean)).toEqual(today.slice(0, 3).map((r) => r.mean));
    for (const s of vm.samples) {
      expect(s.mean.length).toBeGreaterThan(0);
      expect(s.mean).not.toMatch(/\n/);
    }
    expect(vm.moreCount).toBe(2);
    expect(vm.primary.label).toMatch(/Start daily/);
  });

  it('does not invent a fake starter list when today\'s pick is empty', () => {
    const vm = buildDetailVM(dailyItem, {
      dailyRoots: [],
      dailyDone: false,
      streak: 0,
      nextPlay: false,
      completed: startedBuilder,
      entitled: false,
    });
    expect(vm.samples).toEqual([]);
    expect(vm.samples.map((s) => s.root)).not.toEqual(['Bio', 'Geo', 'Photo']);
  });

  it('keeps Daily off the first-run one-Play board', () => {
    const firstRun = buildMenu(new Set(), false, { currentTier: 1, nextPlay: true });
    expect(firstRun.items.some((it) => it.kind === 'mode' && it.key === 'daily')).toBe(false);
  });

  it('renders name + meaning lines on the Daily tile before the Start CTA', () => {
    expect(home).toContain('dailyTilePreview(dailyRoots)');
    expect(detail).toContain('dailyTilePreview(extra.dailyRoots)');
    expect(detail).toContain('sampleLines: true');
    expect(panel).toContain('ww-samples${vm.sampleLines ? \' is-lines\' : \'\'}');
    expect(panel).toContain('<b>{s.root}</b>');
    expect(panel).toContain('{s.mean}');
    expect(menu).toContain('ww-daily-lines');
    expect(menu).toContain('ww-daily-line');
    expect(menu).toContain('{p.root}');
    expect(menu).toContain('{p.mean}');

    const samplesAt = panel.indexOf('className={`ww-samples');
    const ctaAt = panel.indexOf('ww-detail-cta');
    expect(samplesAt).toBeGreaterThan(0);
    expect(ctaAt).toBeGreaterThan(samplesAt);
  });

  it('keeps the three lines readable on a phone-width viewport', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-daily-lines\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-daily-line\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-samples\.is-lines\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-daily-lines\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-daily-line\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-samples\.is-lines\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-samples\.is-lines\s*\{/);
    expect(css).toMatch(/\.ww-daily-line\s*\{/);
  });
});

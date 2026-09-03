import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { firstRoot, rootId, rootsInTier, type RootId } from '../../data/roots';
import { buildDetailVM } from './detailVM';
import { buildMenu, entryRootName, tierPrimaryLabel, tierTilePreview } from './menu';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
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

const first = firstRoot();
if (!first) throw new Error('fixture: expected at least one root');
const firstId = rootId(first);
const starter = rootsInTier(1);
const second = starter[1];
if (!second) throw new Error('fixture: expected Geo after Bio');
const starterDone = new Set<RootId>(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: expected Builder roots');
const startedBuilder = new Set<RootId>([...starterDone, rootId(firstBuilder)]);
const bioOwned = new Set<RootId>([firstId]);

const extraBase = {
  dailyRoots: [],
  dailyDone: false,
  streak: 0,
  entitled: false,
};

function starterRow(completed: Set<string>, nextPlay: boolean) {
  const { items } = buildMenu(completed, false, { currentTier: 1, nextPlay });
  const row = items.find((it) => it.kind === 'tier' && it.t === 1);
  if (!row || row.kind !== 'tier') throw new Error('fixture: Starter tile missing');
  return row;
}

describe('Home tier tile: mid-Starter peek (Bio owned)', () => {
  const row = starterRow(bioOwned, false);
  const peek = tierTilePreview(1, bioOwned, false);

  it('does not lead with Bio — it peeks the next unlearned (Geo…) + meaning', () => {
    expect(first.root).toBe('Bio');
    expect(second.root).toBe('Geo');
    expect(peek[0]?.root).toBe('Geo');
    expect(peek.map((p) => p.root)).not.toEqual(['Bio', 'Geo', 'Photo', 'Aqua']);
    expect(peek.map((p) => p.root)[0]).not.toBe('Bio');
    expect(peek[0]?.mean).toBe(second.mean);
    expect(peek[0]?.mean.length).toBeGreaterThan(0);
    expect(peek[0]?.mean).not.toMatch(/\n/);

    const vm = buildDetailVM(row, {
      ...extraBase,
      nextPlay: false,
      completed: bioOwned,
    });

    expect(vm.samples.length).toBeGreaterThan(0);
    expect(vm.samples[0]?.root).toBe('Geo');
    expect(vm.samples.map((s) => s.root)[0]).not.toBe('Bio');
    expect(vm.samples.map((s) => s.root)).not.toEqual(starter.slice(0, 4).map((r) => r.root));
    expect(vm.samples[0]?.mean).toBe(second.mean);
    expect(vm.sampleLines).toBe(true);
    expect(vm.samplesDone).toBeFalsy();
    expect(vm.scene?.caption).toMatch(/^Geo/);
    expect(vm.scene?.caption).not.toMatch(/^Bio/);
  });

  it('keeps Continue named after that next root', () => {
    expect(entryRootName(1, bioOwned, false)).toBe('Geo');
    expect(tierPrimaryLabel({ nextPlay: false, complete: false, rootName: 'Geo' })).toBe(
      'Continue Geo ›',
    );

    const vm = buildDetailVM(row, {
      ...extraBase,
      nextPlay: false,
      completed: bioOwned,
    });
    expect(vm.primary.label).toBe('Continue Geo ›');
    expect(vm.primary.label).not.toMatch(/Bio/);
    expect(vm.heroCta).toBeFalsy();
  });
});

describe('Home tier tile: complete Starter recap', () => {
  const returning = buildMenu(startedBuilder, false, { currentTier: 2, nextPlay: false });
  const row = returning.items.find((it) => it.kind === 'tier' && it.t === 1);
  if (!row || row.kind !== 'tier') throw new Error('fixture: Starter tile missing on dashboard');

  it('recaps owned roots with ✓ — Replay stays, not a first-play teaser', () => {
    expect(row.pct).toBe(100);

    const vm = buildDetailVM(row, {
      ...extraBase,
      nextPlay: false,
      completed: startedBuilder,
    });

    expect(vm.samples.length).toBeGreaterThan(0);
    expect(vm.sampleLines).toBe(true);
    expect(vm.samplesDone).toBe(true);
    expect(vm.samples.map((s) => s.root)).toEqual(starter.slice(0, 4).map((r) => r.root));
    expect(vm.samples.map((s) => s.mean)).toEqual(starter.slice(0, 4).map((r) => r.mean));
    expect(String(vm.lead)).toMatch(/every root owned/);
    expect(String(vm.lead)).not.toMatch(/Play to meet/);
    expect(String(vm.lead)).not.toMatch(/roots like/);
    expect(vm.primary.label).toBe('Replay tier ›');
    expect(vm.ring?.label).toBe('✓');
    expect(vm.pmB).toBe('Tier complete');
  });

  it('marks the recap lines with the same Daily ✓ chrome', () => {
    expect(panel).toContain('vm.samplesDone');
    expect(panel).toContain('ww-daily-mark');
    expect(panel).toContain('✓');
    expect(detail).toContain('samplesDone: complete && peek.length > 0');
    expect(css).toMatch(/\.ww-schip\.is-done/);
    expect(css).toMatch(/\.ww-samples\.is-lines .ww-schip.is-done/);
  });
});

describe('Home tier tile: first-run one-Play board stays one Play', () => {
  it('hides Rush / Daily / extra tiers and one-taps Play Bio', () => {
    const firstRun = buildMenu(new Set(), false, { currentTier: 1, nextPlay: true });
    expect(firstRun.items.map((it) => it.key)).toEqual(['tier-1']);
    expect(firstRun.tucked).toEqual([]);
    expect(firstRun.items.some((it) => it.kind === 'mode')).toBe(false);

    const vm = buildDetailVM(firstRun.items[0]!, {
      ...extraBase,
      nextPlay: true,
      completed: new Set(),
    });
    expect(vm.primary.label).toBe('Play Bio ›');
    expect(vm.heroCta).toBe(true);
    expect(vm.samples).toEqual([]);
    expect(vm.samples.map((s) => s.root)).not.toEqual(['Bio', 'Geo', 'Photo', 'Aqua']);
    expect(vm.sampleLines).toBeFalsy();
    expect(vm.samplesDone).toBeFalsy();
    expect(vm.moreCount).toBe(0);
  });

  it('still one-taps Play Geo after Bio — no four-root dump that fights that', () => {
    const mid = buildMenu(bioOwned, false, { currentTier: 1, nextPlay: true });
    expect(mid.items.map((it) => it.key)).toEqual(['tier-1']);
    expect(mid.items.some((it) => it.kind === 'mode' && it.key === 'rush')).toBe(false);
    expect(mid.items.some((it) => it.kind === 'mode' && it.key === 'daily')).toBe(false);

    const vm = buildDetailVM(mid.items[0]!, {
      ...extraBase,
      nextPlay: true,
      completed: bioOwned,
    });
    expect(vm.primary.label).toBe('Play Geo ›');
    expect(vm.samples).toEqual([]);
    expect(vm.samples.map((s) => s.root)).not.toEqual(['Bio', 'Geo', 'Photo', 'Aqua']);
    expect(String(vm.lead)).toBe('Play to meet Geo.');
    expect(String(vm.lead)).not.toMatch(/Bio/);
  });
});

describe('Home tier tile: locked paid teaser stays a teaser', () => {
  it('keeps the catalog unlock peek and the grown-up CTA', () => {
    const { tucked } = buildMenu(startedBuilder, false, { currentTier: 2, nextPlay: false });
    const locked = tucked.find((it) => it.t === 2);
    if (!locked) throw new Error('fixture: locked Builder missing');
    expect(locked.locked).toBe(true);

    const vm = buildDetailVM(locked, {
      ...extraBase,
      nextPlay: false,
      completed: startedBuilder,
    });
    expect(vm.locked).toBe(true);
    expect(vm.samples.map((s) => s.root)).toEqual(builder.slice(0, 4).map((r) => r.root));
    expect(vm.sampleLines).toBeFalsy();
    expect(vm.samplesDone).toBeFalsy();
    expect(vm.primary.label).toMatch(/Ask a grown-up to unlock/);
  });
});

describe('Home tier tile: phone-width sample / recap lines stay readable', () => {
  it('does not hide Daily-style sample or done lines at max-width 860px', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-samples\.is-lines\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-done\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-daily-mark\s*\{[^}]*display:\s*inline/);
    expect(phone).not.toMatch(/\.ww-samples\.is-lines\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-samples\.is-lines \.ww-schip\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-done\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-daily-mark\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-samples\.is-lines\s*\{/);
    expect(css).toMatch(/\.ww-schip\.is-done/);

    expect(home).toContain('buildDetailVM');
    expect(detail).toContain('tierTilePreview');
    expect(detail).not.toMatch(/rootsInTier\(item\.t\)\.slice\(0,\s*4\)/);
    expect(panel).toContain("ww-samples${vm.sampleLines ? ' is-lines' : ''}${vm.samplesDone ? ' is-done' : ''}");
  });
});

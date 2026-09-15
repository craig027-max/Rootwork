import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { recapOpenForId, recapOpenForRoot } from '../core/deckFlow';
import {
  continueDailyLabel,
  dailyNextRoot,
  dailyResumePreview,
  dailySeed,
  pickDailyRoots,
} from '../core/daily';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, tierPrimaryLabel, tierPrimaryOpen } from './home/menu';
import { homeSampleAction, samplePeekLabel, samplePeekTap } from './home/samplePeek';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
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
if (!first) throw new Error('fixture: expected Bio');
const starter = rootsInTier(1);
const geo = starter[1];
if (!geo) throw new Error('fixture: expected Geo');
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);
const bioOwned = new Set([rootId(first)]);
const today = pickDailyRoots(starter, dailySeed('2026-09-01', 'kid-a'));

describe('Named peek / Replay is a real Continue or Remember tap', () => {
  it('finished Starter Remembers Bio — not teach → Geo', () => {
    expect(tierPrimaryLabel({ nextPlay: false, complete: true, rootName: 'Bio' })).toBe(
      'Remember Bio ›',
    );
    expect(tierPrimaryLabel({ nextPlay: false, complete: true, rootName: 'Bio' })).not.toMatch(
      /Replay/,
    );
    expect(tierPrimaryOpen(1, startedBuilder, false)).toEqual({
      id: rootId(first),
      entry: 'remember',
    });
    expect(recapOpenForId(rootId(first), startedBuilder)).toEqual({
      id: rootId(first),
      entry: 'remember',
    });
    const next = recapOpenForId(rootId(first), startedBuilder);
    expect(next?.entry).not.toBe('teach');
  });

  it('in-progress Starter still Continues Geo as teach', () => {
    expect(tierPrimaryOpen(1, bioOwned, false)).toEqual({
      id: rootId(geo),
      entry: 'teach',
    });
    expect(tierPrimaryLabel({ nextPlay: false, complete: false, rootName: 'Geo' })).toBe(
      'Continue Geo ›',
    );
  });

  it('Daily peek chips Continue Daily — Chron is not a teach dump', () => {
    const next = dailyNextRoot(today, 2);
    expect(next).toBeTruthy();
    const { items } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyPreview: dailyResumePreview(today, 2),
      dailyNextName: next?.root,
    });
    const daily = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(daily).toBeTruthy();
    if (!daily) throw new Error('fixture: Daily missing');
    expect(homeSampleAction(daily, next!.root, { dailyDone: false })).toEqual({ kind: 'daily' });
    expect(homeSampleAction(daily, 'Photo', { dailyDone: false })).toEqual({ kind: 'daily' });
    expect(homeSampleAction(daily, next!.root, { dailyDone: true })).toEqual({
      kind: 'root',
      name: next!.root,
    });
    expect(samplePeekTap({ mode: 'daily', dailyDone: false, sampleCount: 3 })).toBe('daily');
    expect(samplePeekLabel('daily', next!.root, { dailyNext: true })).toBe(
      `Continue Daily · ${next!.root}`,
    );
  });

  it('in-progress Geo peek Continues Geo; done Bio recap Remembers', () => {
    const { items } = buildMenu(startedBuilder, true, { currentTier: 2 });
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    const builderRow = items.find((it) => it.kind === 'tier' && it.t === 2);
    expect(starterRow && builderRow).toBeTruthy();
    if (!starterRow || !builderRow) throw new Error('fixture: tiers missing');
    expect(homeSampleAction(starterRow, 'Bio')).toEqual({ kind: 'root', name: 'Bio' });
    expect(recapOpenForRoot('Bio', startedBuilder)).toEqual({
      id: rootId(first),
      entry: 'remember',
    });
    expect(homeSampleAction(builderRow, firstBuilder.root)).toEqual({
      kind: 'root',
      name: firstBuilder.root,
    });
    const mid = buildMenu(bioOwned, false, { currentTier: 1, nextPlay: false });
    const midStarter = mid.items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(midStarter).toBeTruthy();
    if (!midStarter) throw new Error('fixture: mid Starter missing');
    expect(homeSampleAction(midStarter, 'Geo')).toEqual({ kind: 'root', name: 'Geo' });
    expect(recapOpenForRoot('Geo', bioOwned)).toEqual({ id: rootId(geo), entry: 'teach' });
  });

  it('does not make locked teasers or first-run chips tappable', () => {
    const { tucked } = buildMenu(startedBuilder, false, { currentTier: 2 });
    const locked = tucked.find((it) => it.locked);
    expect(locked).toBeTruthy();
    if (!locked) throw new Error('fixture: locked missing');
    expect(homeSampleAction(locked, 'Auto')).toBeNull();
    expect(samplePeekTap({ locked: true, sampleCount: 4 })).toBeUndefined();
    expect(samplePeekTap({ nextPlay: true, sampleCount: 0 })).toBeUndefined();
    expect(samplePeekTap({ mode: 'rush', sampleCount: 0 })).toBeUndefined();
    const { items } = buildMenu(startedBuilder, false, { currentTier: 2 });
    const rush = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rush && homeSampleAction(rush, 'Bio')).toEqual({ kind: 'root', name: 'Bio' });
    expect(samplePeekTap({ mode: 'rush', sampleCount: 3 })).toBe('remember');
  });

  it('Home preview wires named chips + Remember Replay — not openRoot(entry) teach', () => {
    expect(home).toContain('tierPrimaryOpen');
    expect(home).toContain('homeSampleAction');
    expect(home).toContain('onSamplePick');
    expect(home).toContain('onSample={vm.sampleTap ? onSamplePick : undefined}');
    expect(home).toContain("tap.kind === 'daily'");
    expect(home).not.toContain('openRoot(rootId(entry))');
    expect(panel).toContain('vm.sampleTap');
    expect(panel).toContain('samplePeekLabel');
    expect(panel).toContain('is-next');
    expect(panel).toContain('is-tap');
  });

  it('keeps named next + Remember taps readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-tap\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-next\.is-tap\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-done\.is-tap\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-schip\.is-tap\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-schip\.is-next\.is-tap\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/button\.ww-schip\s*\{/);
  });

  it('Home Daily mid-run still names Continue Daily as the hero', () => {
    const next = dailyNextRoot(today, 2);
    const remaining = dailyResumePreview(today, 2);
    const { items } = buildMenu(startedBuilder, false, {
      currentTier: 2,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyPreview: remaining,
      dailyNextName: next?.root,
    });
    const daily = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    if (!daily) throw new Error('fixture: Daily missing');
    const vm = buildDetailVM(daily, {
      dailyRoots: today,
      dailyDone: false,
      dailyResumeQi: 2,
      dailyTotal: 5,
      streak: 0,
      nextPlay: false,
      completed: startedBuilder,
      entitled: false,
    });
    expect(vm.sampleTap).toBe('daily');
    expect(vm.samplesNext).toBe(true);
    expect(vm.primary.label).toBe(continueDailyLabel(2, 5));
    expect(vm.samples[0]?.root).toBe(next?.root);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

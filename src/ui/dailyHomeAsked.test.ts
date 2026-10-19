import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, rootId, rootsInTier } from '../data/roots';
import {
  applyDailyAskedPreview,
  dailyAskedRecapNames,
  dailyDoneMenuSub,
  dailyResumePreview,
  dailyTilePreview,
} from '../core/daily';
import { askedChipOpen } from '../core/deckFlow';
import { buildDetailVM } from './home/detailVM';
import { buildMenu } from './home/menu';
import { dailyDoneRowLabel } from './home/todayProgress';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/TierMenu.tsx'), 'utf8');
const menuModel = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
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
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const bio = starter.find((r) => r.root === 'Bio');
const geo = starter.find((r) => r.root === 'Geo');
const photo = starter.find((r) => r.root === 'Photo');
const aqua = starter.find((r) => r.root === 'Aqua');
const auto = ROOTS.find((r) => r.root === 'Auto');
if (!bio || !geo || !photo || !aqua || !auto || !firstBuilder) {
  throw new Error('fixture: expected Bio / Geo / Photo / Aqua / Auto');
}
const deal = [bio, geo, photo, aqua, auto];
const biography = bio.words.find((w) => w.w === 'Biography');
const photograph = photo.words.find((w) => w.w === 'Photograph');
if (!biography || !photograph) throw new Error('fixture: expected Biography / Photograph');

const asked = [
  { root: 'Bio', title: 'Biography', sub: biography.d },
  { root: 'Geo', title: 'Geo', sub: 'earth' },
  { root: 'Photo', title: '-graph', sub: 'written' },
  { root: 'Aqua', title: 'Aquarium', sub: aqua.words.find((w) => w.w === 'Aquarium')?.d ?? 'A tank of water' },
  null,
];

const started = new Set([...starter.map((r) => rootId(r)), rootId(firstBuilder)]);
const preview = applyDailyAskedPreview(dailyTilePreview(deal), asked);

describe('Home Daily names the question — not Bio / life over Biography', () => {
  it('peeks Biography on the done tile and leaves a meaning beat on the root', () => {
    expect(preview.map((line) => line.asked || line.root)).toEqual(['Biography', 'Geo', '-graph']);
    expect(preview[0]?.mean).toBe(biography.d);
    expect(preview[0]?.mean).not.toBe('life');
    expect(preview[1]).toEqual({ root: 'Geo', mean: 'earth' });
    expect(preview[2]?.asked).toBe('-graph');

    const doneMenu = buildMenu(started, false, {
      currentTier: 1,
      dailyDone: true,
      dailyPreview: preview,
    });
    const daily = doneMenu.items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(daily?.kind).toBe('mode');
    if (daily?.kind !== 'mode') return;
    expect(daily.sub).toBe('Done · Biography · Geo · -graph');
    expect(daily.sub).not.toMatch(/Bio · Geo · Photo/);
    expect(daily.preview?.[0]?.asked).toBe('Biography');
    expect(dailyDoneMenuSub(preview.map((line) => line.asked || line.root))).toBe(daily.sub);

    const vm = buildDetailVM(daily, {
      dailyRoots: deal,
      dailyDone: true,
      dailyAsked: asked,
      streak: 2,
      nextPlay: false,
      completed: started,
      entitled: false,
      learnedToday: true,
    });
    expect(vm.samples[0]).toMatchObject({
      root: 'Bio',
      asked: 'Biography',
      mean: biography.d,
      opensWord: true,
      owned: true,
    });
    expect(vm.samples[0]?.mean).not.toBe('life');
    expect(vm.samples[1]).toMatchObject({ root: 'Geo', mean: 'earth', owned: true });
    expect(vm.samples[1]?.asked).toBeUndefined();
    expect(vm.samples[1]?.opensWord).toBe(false);
    expect(vm.samples[2]).toMatchObject({ root: 'Photo', asked: '-graph', opensWord: false });
    expect(askedChipOpen(rootId(bio), started, 'Biography')?.entry).toBe('asked');
    expect(askedChipOpen(rootId(photo), started, '-graph')?.entry).not.toBe('asked');

    expect(dailyDoneRowLabel(dailyAskedRecapNames(deal, asked))).toBe(
      'Daily · done · Biography · Geo · -graph',
    );
    expect(dailyDoneRowLabel(dailyAskedRecapNames(deal, asked))).not.toMatch(/Bio · Geo · Photo/);
  });

  it('keeps a Remember miss on the root, and a mid-run peek on the roots still coming', () => {
    const missMenu = buildMenu(started, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: preview,
      rushMissName: geo.root,
    });
    const missed = missMenu.items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(missed?.kind).toBe('mode');
    if (missed?.kind !== 'mode') return;
    expect(missed.sub).toBe('Missed Geo · remember');
    expect(missed.preview?.map((line) => line.root)).toEqual(['Geo']);
    expect(missed.preview?.every((line) => !line.asked)).toBe(true);

    const vm = buildDetailVM(missed, {
      dailyRoots: deal,
      dailyDone: true,
      dailyAsked: asked,
      streak: 2,
      nextPlay: false,
      completed: started,
      entitled: true,
      learnedToday: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
    });
    expect(vm.big).toBe('Remember Geo');
    expect(vm.samples.map((s) => s.root)).toEqual(['Geo']);
    expect(vm.samples.every((s) => !s.asked)).toBe(true);

    const remaining = applyDailyAskedPreview(dailyResumePreview(deal, 2), asked);
    expect(remaining.map((line) => line.root)).toEqual(['Photo', 'Aqua', 'Auto']);
    expect(remaining.find((line) => line.asked === 'Biography')).toBeUndefined();
    expect(remaining[0]?.asked).toBe('-graph');
  });

  it('wires Home to the stored chips and keeps a long name on a phone', () => {
    expect(home).toContain('liveDailyAsked');
    expect(home).toContain('applyDailyAskedPreview');
    expect(home).toContain('dailyAskedRecapNames');
    expect(home).toContain('askedChipOpen');
    expect(home).toContain("open?.entry === 'asked'");
    expect(home).toContain('onRecap(tap.name)');
    expect(detail).toContain('applyDailyAskedPreview');
    expect(detail).toContain('opensWord: open?.entry === \'asked\'');
    expect(panel).toContain('s.asked ? <b>{s.asked}</b> : <b>{s.root}</b>');
    expect(panel).toContain('Open ${s.asked}');
    expect(panel).toContain('onSample(s.root, s.asked)');
    expect(menu).toContain('p.asked ? <b>{p.asked}</b> : <b>{p.root}</b>');
    expect(menu).toContain("p.asked ? ' is-asked' : ''");
    expect(menuModel).toContain('p.asked || p.root');
    expect(css).toMatch(/\.ww-daily-line\.is-asked\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.ww-daily-line\.is-asked b\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(
      /\.ww-samples\.is-lines \.ww-schip\.is-asked > span:last-child\s*\{[^}]*white-space:\s*normal/,
    );
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-daily-line\.is-asked\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(
      /\.ww-samples\.is-lines \.ww-schip\.is-asked\.is-done\.is-tap\s*\{[^}]*display:\s*flex/,
    );
    expect(phone).not.toMatch(/\.ww-daily-line\.is-asked\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-schip\.is-asked\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-daily-line\.is-asked\s*\{[^}]*display:\s*flex/);
    expect(short).not.toMatch(/\.ww-daily-line\.is-asked\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.ww-schip\.is-asked\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

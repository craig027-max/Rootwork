import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel } from '../core/rushRecap';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM, detailSceneCaption } from './home/detailVM';
import {
  buildMenu,
  listAria,
  listHeading,
  listHint,
} from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const tierMenu = readFileSync(join(process.cwd(), 'src/ui/home/TierMenu.tsx'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
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

describe('Home after a miss is Remember — not start / Geo · earth over Geo', () => {
  it('makes list hints Remember — not tap again to start over Geo', () => {
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
    expect(listHeading(false, { missWaiting: today.missWaiting })).toBe('Remember');
    expect(listHint({ missWaiting: true, pointer: 'tap' })).toBe(
      'Tap to preview · tap again to remember',
    );
    expect(listHint({ missWaiting: true, pointer: 'keys' })).toBe(
      '↑ ↓ to browse · Enter to remember',
    );
    expect(listHint({ missWaiting: true, pointer: 'tap' })).not.toMatch(/start/i);
    expect(listHint({ missWaiting: true, pointer: 'keys' })).not.toMatch(/start/i);
    expect(listAria({ missWaiting: true })).toBe('Remember');
    expect(listAria({ missWaiting: true })).not.toMatch(/Choose what to play|start/i);
  });

  it('makes Rush / Daily / Starter scene captions Missed Geo — not Geo · earth / Root Rush', () => {
    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });
    expect(detailSceneCaption({
      missed: true,
      root: geo.root,
      mean: geo.mean,
      fallback: 'Root Rush',
    })).toBe(`Missed ${geo.root}`);
    expect(detailSceneCaption({
      missed: true,
      root: geo.root,
      mean: geo.mean,
      fallback: 'Root Rush',
    })).not.toMatch(/Geo · |Root Rush|Daily|Starter/i);

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushMissName: geo.root,
      dailyDone: true,
    });
    const rush = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    const daily = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    if (rush?.kind !== 'mode' || daily?.kind !== 'mode' || starterRow?.kind !== 'tier') {
      throw new Error('fixture: Rush / Daily / Starter missing');
    }

    const rushVm = buildDetailVM(rush, extraMiss);
    expect(rushVm.big).toBe(`Remember ${geo.root}`);
    expect(rushVm.waitingMiss).toBe(true);
    expect(rushVm.scene?.caption).toBe(`Missed ${geo.root}`);
    expect(rushVm.scene?.caption).not.toMatch(/Geo · |Root Rush|earth/i);

    const dailyVm = buildDetailVM(daily, extraMiss);
    expect(dailyVm.big).toBe(`Remember ${geo.root}`);
    expect(dailyVm.waitingMiss).toBe(true);
    expect(dailyVm.scene?.caption).toBe(`Missed ${geo.root}`);
    expect(dailyVm.scene?.caption).not.toMatch(/Geo · |Daily|earth/i);

    const starterVm = buildDetailVM(starterRow, extraMiss);
    expect(starterVm.big).toBe(`Remember ${geo.root}`);
    expect(starterVm.waitingMiss).toBe(true);
    expect(starterVm.scene?.caption).toBe(`Missed ${geo.root}`);
    expect(starterVm.scene?.caption).not.toMatch(/Geo · |Starter|earth/i);

    const two = buildDetailVM(rush, { ...extraMiss, rememberAlso: photo.root });
    expect(two.scene?.caption).toBe(`Missed ${geo.root}`);
    expect(two.waiting).toMatch(new RegExp(photo.root));
  });

  it('keeps start / Choose what to play / Geo · earth once the miss is Remembered', () => {
    expect(listHint({ pointer: 'tap' })).toBe('Tap to preview · tap again to start');
    expect(listHint({ pointer: 'keys' })).toBe('↑ ↓ to browse · Enter to start');
    expect(listAria()).toBe('Choose what to play');
    expect(detailSceneCaption({
      root: geo.root,
      mean: geo.mean,
      fallback: 'Root Rush',
    })).toBe(`${geo.root} · ${geo.mean}`);

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
    });
    const rush = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    if (rush?.kind !== 'mode') throw new Error('fixture: Rush missing');
    const vm = buildDetailVM(rush, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(vm.waitingMiss).toBeFalsy();
    expect(vm.scene?.caption).not.toMatch(/^Missed /);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as start / Geo · earth', () => {
    const mid = listHint({ missWaiting: false, pointer: 'tap' });
    expect(mid).toBe('Tap to preview · tap again to start');
    expect(listAria({ missWaiting: false })).toBe('Choose what to play');

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      rushLearnName: secondBuilder.root,
    });
    const rush = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    if (rush?.kind !== 'mode') throw new Error('fixture: Rush missing');
    const learnOpen = buildDetailVM(rush, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: false,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
    });
    expect(learnOpen.waitingMiss).toBeFalsy();
    expect(learnOpen.scene?.caption).toBe(`${secondBuilder.root} · ${secondBuilder.mean}`);
    expect(learnOpen.scene?.caption).not.toMatch(/^Missed /);
  });

  it('wires Home list hints + detail scene — Remember / Missed Geo, not start / Geo · earth', () => {
    expect(menu).toContain('export function listHint');
    expect(menu).toContain('tap again to remember');
    expect(menu).toContain('Enter to remember');
    expect(menu).toContain('export function listAria');
    expect(menu).toContain("return opts.missWaiting ? 'Remember' : 'Choose what to play'");
    expect(home).toContain('listHint({ missWaiting: missHero, pointer: \'keys\' })');
    expect(home).toContain('listHint({ missWaiting: missHero, pointer: \'tap\' })');
    expect(home).toContain('s kb-hint${missHero ? \' is-miss\' : \'\'}');
    expect(home).toContain('s tap-hint${missHero ? \' is-miss\' : \'\'}');
    expect(home).toContain('missWaiting={missHero}');
    expect(home).not.toContain('Tap to preview · tap again to start');
    expect(home).not.toContain('↑ ↓ to browse · Enter to start');
    expect(tierMenu).toContain('listAria({ missWaiting })');
    expect(tierMenu).not.toContain('aria-label="Choose what to play"');
    expect(detail).toContain('export function detailSceneCaption');
    expect(detail).toContain('Missed ${name}');
    expect(detail).toContain('{ missed: missHero }');
    expect(detail).toContain('{ missed: Boolean(miss) }');
    expect(panel).toContain('ww-detail-scene-cap${vm.waitingMiss ? \' is-miss\' : \'\'}');
    expect(css).toMatch(/\.ww-panel-label \.s\.is-miss/);
    expect(css).toMatch(/\.ww-detail-scene-cap\.is-miss/);
  });

  it('keeps Remember / Missed Geo readable on a phone — not hidden behind start', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-panel-label \.s\.tap-hint\.is-miss\s*\{[^}]*display:\s*inline/);
    expect(phone).not.toMatch(/\.ww-panel-label \.s\.tap-hint\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-detail-scene-cap\.is-miss\s*\{[^}]*display:\s*inline-block/);
    expect(phone).not.toMatch(/\.ww-detail-scene-cap\.is-miss\s*\{[^}]*display:\s*none/);
    const coarse = mediaBlock(css, 'pointer: coarse');
    expect(coarse).toMatch(/\.ww-panel-label \.s\.tap-hint\.is-miss\s*\{[^}]*display:\s*inline/);
    expect(coarse).not.toMatch(/\.ww-panel-label \.s\.tap-hint\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
    expect(first.root).toBe('Bio');
  });
});

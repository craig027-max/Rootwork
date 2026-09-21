import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel, rushRecapFromRun, todayMissRecap } from '../core/rushRecap';
import {
  buildRushResultNext,
  buildRushStart,
  learnNextAction,
  rushMissRememberReady,
  rushPathClear,
} from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, homeSecondaryAction, rushMenuSub } from './home/menu';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
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
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);
const lastRun = rushRecapFromRun(
  [
    { id: rootId(photo), ok: true },
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
  ],
  { day: '2026-09-17', studentId: 'kid-a' },
);
const missOpts = {
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
  dailyDone: true,
  learnedToday: true,
};

describe('Rush after a miss is Remember — not Play again over Geo', () => {
  it('makes Remember Geo the result hero once Daily + a learn are done', () => {
    expect(rushPathClear(startedBuilder, true, { dailyDone: true, learnedToday: true })).toBe(true);
    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });
    const next = learnNextAction(startedBuilder, true);
    expect(next.rootId).toBe(rootId(secondBuilder));

    const vm = buildRushResultNext(startedBuilder, true, missOpts);
    expect(vm.missWaiting).toBe(true);
    expect(vm.dailyResume).toBe(false);
    expect(vm.primary).toEqual({
      kind: 'remember',
      label: rememberMissCtaLabel(geo.root),
      rootId: rootId(geo),
      rootName: geo.root,
    });
    expect(vm.peek).toBe(todayMissRecap(geo.root));
    expect(vm.replayLabel).toBe('Play again ›');
    expect(vm.primary.label).not.toMatch(/Play again|Continue |Keep going/);
  });

  it('peeks the next miss so two misses are not a one-chip lie', () => {
    const vm = buildRushResultNext(startedBuilder, true, {
      ...missOpts,
      rememberAlso: firstBuilder.root,
    });
    expect(vm.peek).toBe(todayMissRecap(geo.root, firstBuilder.root));
    expect(vm.peek).toBe(`Remember ${geo.root} · then ${firstBuilder.root}`);
    expect(vm.primary.rootId).toBe(rootId(geo));
  });

  it('keeps Continue Daily / unfinished Continue {learn} as the hero', () => {
    const mid = {
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      ...missOpts,
    };
    const daily = buildRushResultNext(startedBuilder, true, mid);
    expect(daily.dailyResume).toBe(true);
    expect(daily.missWaiting).toBe(false);
    expect(daily.primary.kind).toBe('daily');
    expect(daily.primary.label).toBe('Continue Daily · 3 of 5 ›');
    expect(rushMissRememberReady(startedBuilder, true, mid)).toBeNull();

    const learnOpen = buildRushResultNext(startedBuilder, true, {
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnOpen.missWaiting).toBe(false);
    expect(learnOpen.primary.kind).toBe('learn');
    expect(learnOpen.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnOpen.primary.label).not.toMatch(/Remember |Play again/);
  });

  it('offers Remember on Rush start without stealing Play again', () => {
    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(start.goLabel).toBe('Play again ›');
    expect(start.rememberMiss).toBe(rememberMissCtaLabel(geo.root));
    expect(start.rememberMissId).toBe(rootId(geo));
    expect(start.rememberPeek).toBe(todayMissRecap(geo.root));
    expect(start.continueDaily).toBeNull();

    const midStart = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(midStart.continueDaily).toBe('Continue Daily · 3 of 5 ›');
    expect(midStart.rememberMiss).toBeNull();
    expect(midStart.rememberPeek).toBeNull();
  });

  it('Home Rush tile: Remember Geo is the fat tap, Play again is the ghost', () => {
    expect(rushMenuSub({ missName: geo.root })).toBe(`Missed ${geo.root} · remember`);
    expect(rushMenuSub({ dailyNextName: 'Chron', missName: geo.root })).toBe('Daily waiting · Chron');
    expect(lastRun).toBeTruthy();

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      rushMissName: geo.root,
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(rushRow.sub).toBe(`Missed ${geo.root} · remember`);

    const vm = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 3,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 2400,
      rushRecap: lastRun,
    });
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.secondary?.label).toBe('Play again ›');
    expect(vm.waiting).toBe(todayMissRecap(geo.root));
    expect(vm.waitingMiss).toBe(true);
    expect(vm.heroCta).toBe(true);
    expect(vm.scene?.caption).toBe(`${geo.root} · ${geo.mean}`);
    expect(vm.primary.label).not.toMatch(/Play again|Keep going|Continue |Browse roots/);
    expect(homeSecondaryAction(rushRow, { rememberMissId: rootId(geo) })).toEqual({
      kind: 'rush',
    });
    expect(homeSecondaryAction(rushRow, { dailyResumeQi: 2, rememberMissId: rootId(geo) })).toEqual({
      kind: 'daily',
    });

    const unfinished = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 3,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: false,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 2400,
    });
    expect(unfinished.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(unfinished.waitingMiss).toBe(false);
    expect(unfinished.heroCta).toBe(true);
  });

  it('wires result + start + Home tile — Remember Geo, not openRoot teach', () => {
    expect(overlay).toContain('rushMissRememberReady');
    expect(overlay).toContain("kind: 'remember'");
    expect(overlay).toContain('missWaiting: true');
    expect(rush).toContain('listRushMissRemember');
    expect(rush).toContain('goPrimary');
    expect(rush).toContain("kind === 'remember'");
    expect(rush).toContain("entry: 'remember'");
    expect(rush).toContain('rushNext.missWaiting');
    expect(rush).toContain('q-rush-remember');
    expect(rush).toContain('rushStart.rememberMiss');
    expect(home).toContain('missHero');
    expect(home).toContain('rushMissName');
    expect(home).toContain('rememberMissId: missHero ? rushMissId : null');
    expect(home).toContain('missHero && rushMissId');
    expect(home).toContain("openRoot(rushMissId, { entry: 'remember' })");
    expect(home).toContain("tap.kind === 'remember'");
    expect(home).toContain("openRoot(tap.rootId, { entry: 'remember' })");
    expect(home).toContain("selected.key === 'daily' || selected.key === 'rush'");
    expect(menu).toContain('opts.rushMissName');
    expect(menu).toContain("item.key === 'rush' && missId) return { kind: 'rush' }");
    expect(detail).toContain('rememberMissCtaLabel');
    expect(detail).toContain('waitingMiss');
    expect(detail).toContain('miss && missHero');
    expect(detail).toContain('heroCta: Boolean(learn || missHero)');
    expect(panel).toContain('vm.waitingMiss');
    expect(panel).toContain('is-miss');
  });

  it('keeps Remember recap + CTA readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-rush-remember\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.q-daily-wait\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-go\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-rush-remember\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-daily-wait\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-rush-remember\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.q-daily-wait\.is-miss\s*\{[^}]*display:\s*block/);
    const homePhone = mediaBlock(appCss, 'max-width: 860px');
    expect(homePhone).toMatch(/\.ww-detail-wait\.is-miss\s*\{[^}]*display:\s*block/);
    expect(homePhone).not.toMatch(/\.ww-detail-wait\.is-miss\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.q-rush-remember/);
    expect(css).toMatch(/\.q-go\.is-miss/);
    expect(css).toMatch(/\.q-daily-wait\.is-miss/);
    expect(appCss).toMatch(/\.ww-detail-wait\.is-miss/);
    expect(appCss).toMatch(/\.ww-detail-hero-cta/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

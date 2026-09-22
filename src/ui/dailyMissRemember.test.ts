import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import {
  buildDailyDone,
  dailyDonePrimary,
  learnNextAction,
  rushMissRememberReady,
} from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, homeSecondaryAction } from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
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
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);
const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));

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

describe('Daily after a miss is Remember — not Keep going / Play again over Geo', () => {
  it('matches Today: Remember Geo is the done hero once Daily + a learn are done', () => {
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
    expect(today.cta).toEqual({
      kind: 'remember',
      label: rememberMissCtaLabel(geo.root),
      rootId: rootId(geo),
    });
    expect(today.pathDone).toBe(false);
    expect(today.missWaiting).toBe(true);

    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });
    const next = dailyDonePrimary(startedBuilder, true, missOpts);
    expect(next).toEqual({
      kind: 'remember',
      label: rememberMissCtaLabel(geo.root),
      rootId: rootId(geo),
      rootName: geo.root,
    });
    expect(next.label).not.toMatch(/Play again|Keep going|Continue |Play Root Rush/);

    const overlayVm = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(overlayVm.primary).toEqual(next);
    expect(overlayVm.missWaiting).toBe(true);
    expect(overlayVm.peek).toBe(todayMissRecap(geo.root));
    expect(overlayVm.replayLabel).toBe('Play again ›');
    expect(overlayVm.sub).toBe("Today's five are done. Replay is just for fun.");
  });

  it('peeks the next miss so two misses are not a one-chip lie', () => {
    const overlayVm = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
      rememberAlso: photo.root,
    });
    expect(overlayVm.peek).toBe(todayMissRecap(geo.root, photo.root));
    expect(overlayVm.peek).toBe(`Remember ${geo.root} · then ${photo.root}`);
    expect(overlayVm.primary.rootId).toBe(rootId(geo));
  });

  it('keeps unfinished Continue {learn} / Continue Daily as the hero', () => {
    const learnOpen = dailyDonePrimary(startedBuilder, true, {
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: false,
    });
    expect(learnOpen.kind).toBe('learn');
    expect(learnOpen.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnOpen.label).not.toMatch(/Remember |Play again|Keep going/);
    expect(
      rushMissRememberReady(startedBuilder, true, {
        rememberMissId: rootId(geo),
        rememberMissName: geo.root,
        dailyDone: true,
        learnedToday: false,
      }),
    ).toBeNull();

    const overlayVm = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      learnedToday: false,
    });
    expect(overlayVm.missWaiting).toBe(false);
    expect(overlayVm.primary.kind).toBe('learn');
    expect(overlayVm.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(overlayVm.peek).toBeNull();
  });

  it('hands a caught-up kid Remember Geo — not Play Root Rush over the miss', () => {
    const next = dailyDonePrimary(allOpen, false, missOpts);
    expect(next.kind).toBe('remember');
    expect(next.label).toBe(rememberMissCtaLabel(geo.root));
    expect(next.label).not.toMatch(/Play Root Rush|Keep going|Play again/);
    expect(learnNextAction(allOpen, false).kind).toBe('home');
  });

  it('Home Daily tile: Remember Geo is the fat tap, Play again is the ghost', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
    });
    const dailyItem = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    if (!dailyItem || dailyItem.kind !== 'mode') throw new Error('fixture: Daily missing');

    const vm = buildDetailVM(dailyItem, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
    });
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(vm.secondary?.label).toBe('Play again ›');
    expect(vm.waiting).toBe(todayMissRecap(geo.root));
    expect(vm.waitingMiss).toBe(true);
    expect(vm.heroCta).toBe(true);
    expect(vm.scene?.caption).toBe(`${geo.root} · ${geo.mean}`);
    expect(vm.primary.label).not.toMatch(/Play again|Keep going|Continue |Browse roots/);
    expect(homeSecondaryAction(dailyItem, {
      dailyDone: true,
      learnedToday: true,
      rememberMissId: rootId(geo),
    })).toEqual({ kind: 'daily' });

    const unfinished = buildDetailVM(dailyItem, {
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
    expect(unfinished.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(unfinished.waitingMiss).toBe(false);
    expect(unfinished.heroCta).toBe(false);
  });

  it('wires overlay + Home tile — Remember Geo, not Keep going over the miss', () => {
    expect(overlay).toContain('export function dailyDonePrimary');
    expect(overlay).toContain('rushMissRememberReady');
    expect(overlay).toContain('missWaiting: Boolean(miss)');
    expect(overlay).toContain('Daily now joins that thread');
    expect(daily).toContain('listRushMissRemember');
    expect(daily).toContain('todayRushRecap');
    expect(daily).toContain('dailyHoldRememberLine');
    expect(daily).toContain('lastHoldMiss');
    expect(daily).toContain('rememberMissId: rushMissId');
    expect(daily).toContain('done.missWaiting');
    expect(daily).toContain('done.peek');
    expect(daily).toContain("cta.kind === 'remember'");
    expect(home).toContain('dailyDone && missHero && rushMissId');
    expect(home).toContain("openRoot(rushMissId, { entry: 'remember' })");
    expect(home).toContain("selected.key === 'daily' || selected.key === 'rush'");
    expect(detail).toContain('rushMissRememberReady');
    expect(detail).toContain('waitingMiss: Boolean(miss)');
    expect(detail).toContain('heroCta: Boolean(dailyResume != null && !extra.dailyDone) || Boolean(miss)');
    expect(menu).toContain("item.key === 'daily' && opts.dailyDone && missId");
  });

  it('keeps Remember recap + CTA readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-daily-wait\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-daily-wait\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-go\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-next-learn\s*\{[^}]*width:\s*100%|\.q-actions\s*\{[^}]*flex-direction:\s*column/);
    expect(phone).not.toMatch(/\.q-daily-wait\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-daily-wait\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-go\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-daily-wait\.is-miss\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.q-go\.is-miss\s*\{[^}]*display:\s*block/);
    const homePhone = mediaBlock(appCss, 'max-width: 860px');
    expect(homePhone).toMatch(/\.ww-detail-wait\.is-miss\s*\{[^}]*display:\s*block/);
    expect(homePhone).not.toMatch(/\.ww-detail-wait\.is-miss\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.q-go\.is-miss/);
    expect(css).toMatch(/\.q-daily-wait\.is-miss/);
    expect(appCss).toMatch(/\.ww-detail-wait\.is-miss/);
    expect(appCss).toMatch(/\.ww-detail-hero-cta/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

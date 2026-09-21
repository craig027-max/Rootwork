import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, rootId, rootsInTier } from '../data/roots';
import {
  buildRushResultNext,
  buildRushStart,
  dailyDonePrimary,
  rushLearnReady,
  rushMissRememberReady,
} from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, homeSecondaryAction, rushMenuSub } from './home/menu';
import { buildTodayProgress, keepGoingLabel } from './home/todayProgress';

const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
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

const starter = rootsInTier(1);
const geo = starter[1];
if (!geo) throw new Error('fixture: expected Geo');
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);
const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));

const learnOpen = {
  dailyDone: true,
  learnedToday: false,
};
const pathDone = {
  dailyDone: true,
  learnedToday: true,
};

describe('Rush after Daily is Continue {learn} / Keep going — not Play again over Auto', () => {
  it('matches Today: unfinished Continue {learn} is the Rush hero', () => {
    const today = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
    });
    expect(today.cta?.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(today.pathDone).toBe(false);

    const next = dailyDonePrimary(startedBuilder, true);
    expect(rushLearnReady(startedBuilder, true, learnOpen)).toEqual(next);
    expect(next.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(next.label).not.toMatch(/Play again|Keep going|Remember /);

    const result = buildRushResultNext(startedBuilder, true, learnOpen);
    expect(result.learnWaiting).toBe(true);
    expect(result.missWaiting).toBe(false);
    expect(result.dailyResume).toBe(false);
    expect(result.primary).toEqual(next);
    expect(result.replayLabel).toBe('Play again ›');
    expect(result.peek).toBe(`${secondBuilder.root} · ${secondBuilder.mean}`);
  });

  it('says Keep going · {root} after Daily + today\'s learn — not another Continue', () => {
    const today = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      learnedRoot: firstBuilder.root,
      learnedRootId: rootId(firstBuilder),
    });
    expect(today.pathDone).toBe(true);
    expect(today.cta?.label).toBe(keepGoingLabel(secondBuilder.root));

    const next = dailyDonePrimary(startedBuilder, true, { learnedToday: true });
    expect(rushLearnReady(startedBuilder, true, pathDone)).toEqual(next);
    expect(next.label).toBe(`Keep going · ${secondBuilder.root} ›`);
    expect(next.label).not.toMatch(/Continue |Play again|Remember /);

    const result = buildRushResultNext(startedBuilder, true, pathDone);
    expect(result.learnWaiting).toBe(true);
    expect(result.primary.label).toBe(`Keep going · ${secondBuilder.root} ›`);
    expect(result.replayLabel).toBe('Play again ›');
  });

  it('keeps Continue Daily / Remember Geo as the hero', () => {
    const mid = {
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyNextMean: 'time',
      dailyDone: true,
      learnedToday: false,
    };
    expect(rushLearnReady(startedBuilder, true, mid)).toBeNull();
    expect(buildRushResultNext(startedBuilder, true, mid).learnWaiting).toBe(false);
    expect(buildRushResultNext(startedBuilder, true, mid).primary.kind).toBe('daily');

    const miss = {
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      dailyDone: true,
      learnedToday: true,
    };
    expect(rushMissRememberReady(startedBuilder, true, miss)).toBeTruthy();
    expect(rushLearnReady(startedBuilder, true, miss)).toBeNull();
    expect(buildRushResultNext(startedBuilder, true, miss).learnWaiting).toBe(false);
    expect(buildRushResultNext(startedBuilder, true, miss).missWaiting).toBe(true);
  });

  it('does not steal Play again before Daily is banked, or once they are caught up', () => {
    expect(rushLearnReady(startedBuilder, true, { dailyDone: false })).toBeNull();
    const fresh = buildRushResultNext(startedBuilder, true);
    expect(fresh.learnWaiting).toBe(false);
    expect(fresh.primary.label).toBe(`Continue ${secondBuilder.root} ›`);

    expect(rushLearnReady(allOpen, false, { dailyDone: true })).toBeNull();
    const caught = buildRushResultNext(allOpen, false, { dailyDone: true });
    expect(caught.learnWaiting).toBe(false);
    expect(caught.primary.kind).not.toBe('learn');
  });

  it('makes Continue / Keep going the start hero — Play again is the ghost', () => {
    const start = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      bestScore: 2400,
      completed: startedBuilder,
      entitled: true,
      ...learnOpen,
    });
    expect(start.goLabel).toBe('Play again ›');
    expect(start.learnWaiting).toBe(true);
    expect(start.missWaiting).toBe(false);
    expect(start.continueLearn).toBe(`Continue ${secondBuilder.root} ›`);
    expect(start.continueLearnId).toBe(rootId(secondBuilder));
    expect(start.continueLearnPeek).toBe(`${secondBuilder.root} · ${secondBuilder.mean}`);
    expect(start.continueDaily).toBeNull();
    expect(start.rememberMiss).toBeNull();
    expect(start.heroSub).toBeNull();

    const keep = buildRushStart({
      runs: 1,
      bestPct: 80,
      bestStars: 4,
      completed: startedBuilder,
      entitled: true,
      ...pathDone,
    });
    expect(keep.goLabel).toBe('Play again ›');
    expect(keep.learnWaiting).toBe(true);
    expect(keep.continueLearn).toBe(`Keep going · ${secondBuilder.root} ›`);
    expect(keep.continueLearnPeek).toBe(`${secondBuilder.root} · ${secondBuilder.mean}`);
  });

  it('Home Rush tile: Continue {learn} is the fat tap, Play again is the ghost', () => {
    expect(rushMenuSub({ learnName: secondBuilder.root })).toBe(`Continue · ${secondBuilder.root}`);
    expect(rushMenuSub({ learnName: secondBuilder.root, keepGoing: true })).toBe(
      `Keep going · ${secondBuilder.root}`,
    );
    expect(rushMenuSub({ dailyNextName: 'Chron', learnName: secondBuilder.root })).toBe(
      'Daily waiting · Chron',
    );
    expect(rushMenuSub({ missName: geo.root, learnName: secondBuilder.root })).toBe(
      `Missed ${geo.root} · remember`,
    );

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      rushLearnName: secondBuilder.root,
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rushRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode') throw new Error('fixture: Rush missing');
    expect(rushRow.sub).toBe(`Continue · ${secondBuilder.root}`);

    const unfinished = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 2400,
    });
    expect(unfinished.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(unfinished.secondary?.label).toBe('Play again ›');
    expect(unfinished.waiting).toBe(`${secondBuilder.root} · ${secondBuilder.mean}`);
    expect(unfinished.heroCta).toBe(true);
    expect(unfinished.scene?.caption).toBe(`${secondBuilder.root} · ${secondBuilder.mean}`);
    expect(unfinished.primary.label).not.toMatch(/Play again|Remember |Browse roots/);
    expect(homeSecondaryAction(rushRow, { learnWaiting: true })).toEqual({ kind: 'rush' });
    expect(homeSecondaryAction(rushRow, { dailyResumeQi: 2, learnWaiting: true })).toEqual({
      kind: 'daily',
    });

    const learned = buildDetailVM(rushRow, {
      dailyRoots: [],
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      pathDone: true,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
      rushBestScore: 2400,
    });
    expect(learned.primary.label).toBe(`Keep going · ${secondBuilder.root} ›`);
    expect(learned.secondary?.label).toBe('Play again ›');
    expect(learned.heroCta).toBe(true);
  });

  it('wires result + start + Home tile — Continue Auto, not Play again over the learn', () => {
    expect(overlay).toContain('export function rushLearnReady');
    expect(overlay).toContain('learnWaiting: true');
    expect(overlay).toContain('continueLearn');
    expect(rush).toContain('rushStart.continueLearn');
    expect(rush).toContain('rushStart.learnWaiting');
    expect(rush).toContain('q-start-actions');
    expect(rush).toContain('q-rush-learn');
    expect(rush).toContain('rushNext.learnWaiting');
    expect(rush).toContain("goPrimary('learn'");
    expect(home).toContain('rushLearnReady');
    expect(home).toContain('learnHero');
    expect(home).toContain('learnWaiting: learnHero');
    expect(home).toContain("tap.kind === 'rush'");
    expect(home).toContain('openRoot(learnHeroCta.rootId)');
    expect(home).toContain('rushLearnName');
    expect(menu).toContain("kind: 'rush'");
    expect(menu).toContain('opts.learnWaiting');
    expect(menu).toContain('opts.rushLearnName');
    expect(detail).toContain('rushLearnReady');
    expect(detail).toContain('learn ? learn.label : rushReplay');
    expect(detail).toContain('heroCta: Boolean(learn || missHero)');
  });

  it('keeps Continue / Keep going readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-rush-learn\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.q-daily-continue\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.q-next-learn\s*\{[^}]*width:\s*100%|\.q-actions\s*\{[^}]*flex-direction:\s*column/);
    expect(phone).not.toMatch(/\.q-rush-learn\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-daily-continue\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-rush-learn\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.q-daily-continue\s*\{[^}]*display:\s*flex/);
    const homePhone = mediaBlock(appCss, 'max-width: 860px');
    expect(homePhone).toMatch(/\.ww-detail-wait\s*\{[^}]*display:\s*block/);
    expect(homePhone).not.toMatch(/\.ww-detail-wait\s*\{[^}]*display:\s*none/);
    expect(homePhone).toMatch(/\.ww-today-cta\s*\{[^}]*display:\s*block/);
    expect(appCss).toMatch(/\.ww-detail-hero-cta/);
    expect(css).toMatch(/\.q-rush-learn/);
    expect(css).toMatch(/\.q-daily-continue/);
    expect(css).toMatch(/\.q-next-learn/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

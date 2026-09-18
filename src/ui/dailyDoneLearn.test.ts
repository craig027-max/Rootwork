import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier, type RootId } from '../data/roots';
import { dailyHoldContinueLine, dailyHoldKeepGoingLine } from '../core/daily';
import { buildDailyDone, dailyDonePrimary, learnNextAction } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, homeSecondaryAction } from './home/menu';
import { buildTodayProgress, keepGoingLabel } from './home/todayProgress';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
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
const starterDone = new Set<RootId>(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
const secondBuilder = builder[1];
if (!firstBuilder || !secondBuilder) throw new Error('fixture: expected Builder roots');
const startedBuilder = new Set<RootId>([...starterDone, rootId(firstBuilder)]);
const allOpen = new Set(ROOTS.filter((r) => r.t === 1 || r.t === 2).map((r) => rootId(r)));

const todayDeal = [
  { root: 'Chron', mean: 'time' },
  { root: 'Photo', mean: 'light' },
  { root: 'Aqua', mean: 'water' },
  { root: 'Bio', mean: 'life' },
  { root: 'Geo', mean: 'earth' },
];

describe('Daily done is Continue {learn} / Keep going — not Play again over Chron', () => {
  it('matches Today: unfinished Continue {learn} is the done hero', () => {
    const next = learnNextAction(startedBuilder, true);
    expect(next.label).toBe(`Continue ${secondBuilder.root} ›`);

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
      rootId: next.rootId,
    });

    const done = dailyDonePrimary(startedBuilder, true);
    expect(done).toEqual(next);
    expect(done.label).not.toMatch(/Play again|Keep going|Back to learning/);

    const overlayVm = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
    });
    expect(overlayVm.primary).toEqual(done);
    expect(overlayVm.replayLabel).toBe('Play again ›');
    expect(dailyHoldContinueLine(secondBuilder.root, secondBuilder.mean)).toBe(
      `Continue · ${secondBuilder.root} · ${secondBuilder.mean}`,
    );
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

    const done = dailyDonePrimary(startedBuilder, true, { learnedToday: true });
    expect(done).toEqual({
      kind: 'learn',
      label: `Keep going · ${secondBuilder.root} ›`,
      rootId: rootId(secondBuilder),
      rootName: secondBuilder.root,
    });
    expect(done.label).not.toMatch(/Continue |Play again|Back to learning/);
    expect(dailyHoldKeepGoingLine(secondBuilder.root, secondBuilder.mean)).toBe(
      `Keep going · ${secondBuilder.root} · ${secondBuilder.mean}`,
    );
  });

  it('hands a caught-up kid Root Rush on Daily done — not Back to learning', () => {
    const today = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: true,
      completed: allOpen,
      entitled: false,
    });
    expect(today.cta).toEqual({ kind: 'rush', label: 'Play Root Rush ›' });
    expect(dailyDonePrimary(allOpen, false)).toEqual({
      kind: 'rush',
      label: 'Play Root Rush ›',
    });
  });

  it('Home Daily tile: Continue {learn} is the fat tap, Play again is the ghost', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
    });
    const dailyItem = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    if (!dailyItem || dailyItem.kind !== 'mode') throw new Error('fixture: Daily missing');

    const unfinished = buildDetailVM(dailyItem, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
    });
    expect(unfinished.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(unfinished.secondary?.label).toBe('Play again ›');
    expect(unfinished.scene?.caption).toBe(`${secondBuilder.root} · ${secondBuilder.mean}`);
    expect(homeSecondaryAction(dailyItem, { dailyDone: true, learnedToday: false })).toEqual({
      kind: 'daily',
    });

    const learned = buildDetailVM(dailyItem, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      pathDone: true,
    });
    expect(learned.primary.label).toMatch(/Play again/);
    expect(learned.secondary?.label).toBe('Browse roots');
    expect(homeSecondaryAction(dailyItem, { dailyDone: true, learnedToday: true })).toEqual({
      kind: 'index',
    });

    const caught = buildDetailVM(dailyItem, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: allOpen,
      entitled: false,
    });
    expect(caught.primary.label).toBe('Play Root Rush ›');
    expect(caught.secondary?.label).toBe('Play again ›');
  });

  it('keeps Continue Daily / first-run Play Bio / Rush-miss Remember as they are', () => {
    const mid = dailyDonePrimary(startedBuilder, true);
    expect(mid.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnNextAction(new Set(), false).label).toBe(`Play ${first.root} ›`);
    expect(overlay).toContain('Rush-miss Remember stays on Today / Rush');
  });

  it('wires Daily overlay + Home primary to the shared done next', () => {
    expect(overlay).toContain('export function dailyDonePrimary');
    expect(overlay).toContain("kind: 'rush', label: 'Play Root Rush ›'");
    expect(overlay).toContain('keepGoing: true');
    expect(daily).toContain('buildDailyDone');
    expect(daily).toContain('learnedToday');
    expect(daily).toContain('goPrimary(done.primary)');
    expect(daily).toContain('dailyHoldKeepGoingLine');
    expect(daily).toContain("cta.kind === 'rush'");
    expect(daily).toContain("setView('quiz')");
    expect(home).toContain('dailyDonePrimary');
    expect(home).toContain('dailyDone && learnedId == null');
    expect(home).toContain("next.kind === 'learn' && next.rootId");
    expect(home).toContain("next.kind === 'rush'");
    expect(home).toContain('dailyDone,');
    expect(home).toContain('learnedToday: learnedId !== null');
    expect(detail).toContain('dailyDonePrimary');
    expect(detail).toContain('doneHero');
    expect(detail).toContain("doneHero ? 'Play again ›' : 'Browse roots'");
  });

  it('keeps the done Continue / Keep going / Rush tap readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-actions\s*\{[^}]*flex-direction:\s*column/);
    expect(phone).toMatch(/\.q-daily\s+\.q-foot\s*\{[^}]*flex-direction:\s*column/);
    expect(phone).not.toMatch(/\.q-actions\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-next-learn\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.q-next-learn/);
    const homePhone = mediaBlock(appCss, 'max-width: 860px');
    expect(homePhone).toMatch(/\.ww-today-cta\s*\{[^}]*display:\s*block/);
    expect(homePhone).not.toMatch(/\.ww-today-cta\s*\{[^}]*display:\s*none/);
    expect(homePhone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-done\.is-tap\s*\{[^}]*display:\s*flex/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

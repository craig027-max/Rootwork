import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissCtaLabel } from '../core/rushRecap';
import { rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import {
  buildMenu,
  isMissMode,
  listHeading,
  modeMenuTitle,
} from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const tierMenu = readFileSync(join(process.cwd(), 'src/ui/home/TierMenu.tsx'), 'utf8');
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
if (!firstBuilder) throw new Error('fixture: expected Builder');
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

describe('Rush / Daily list after a miss is Remember — not Root Rush / Daily Challenge over Geo', () => {
  it('makes Rush / Daily row titles Remember — not Root Rush / Daily Challenge', () => {
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

    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });

    expect(modeMenuTitle({ name: 'Root Rush', missName: geo.root })).toBe('Remember');
    expect(modeMenuTitle({ name: 'Root Rush', missName: geo.root })).not.toMatch(
      /Root Rush|Daily Challenge/,
    );
    expect(modeMenuTitle({ name: 'Daily Challenge', missName: `  ${geo.root}  ` })).toBe('Remember');
    expect(modeMenuTitle({ name: 'Daily Challenge', missName: geo.root })).not.toMatch(
      /Daily|Challenge/,
    );

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
      dailyStreak: 4,
      rushBest: 'A · 4★',
      rushMissName: geo.root,
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(rushRow?.kind).toBe('mode');
    expect(dailyRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode' || dailyRow?.kind !== 'mode') {
      throw new Error('fixture: Rush / Daily missing');
    }
    expect(isMissMode(rushRow)).toBe(true);
    expect(isMissMode(dailyRow)).toBe(true);
    expect(rushRow.title).toBe('Remember');
    expect(dailyRow.title).toBe('Remember');
    expect(rushRow.title).not.toMatch(/Root Rush|Quiz|Best so far/i);
    expect(dailyRow.title).not.toMatch(/Daily|Challenge|DONE/i);
    expect(rushRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(dailyRow.sub).toBe(`Missed ${geo.root} · remember`);
    expect(rushRow.missName).toBe(geo.root);
    expect(dailyRow.missName).toBe(geo.root);
    expect(rushRow.best).toBeUndefined();
    expect(dailyRow.badge).toBeUndefined();
    expect(dailyRow.best).toBeUndefined();

    const rushVm = buildDetailVM(rushRow, extraMiss);
    expect(rushVm.eyebrow).toBe('Remember');
    expect(rushVm.big).toBe(`Remember ${geo.root}`);
    expect(rushVm.primary.label).toBe(rememberMissCtaLabel(geo.root));

    const dailyVm = buildDetailVM(dailyRow, extraMiss);
    expect(dailyVm.eyebrow).toBe('Remember');
    expect(dailyVm.big).toBe(`Remember ${geo.root}`);
    expect(dailyVm.primary.label).toBe(rememberMissCtaLabel(geo.root));
  });

  it('keeps Root Rush / Daily Challenge once the miss is Remembered', () => {
    expect(modeMenuTitle({ name: 'Root Rush' })).toBe('Root Rush');
    expect(modeMenuTitle({ name: 'Daily Challenge', missName: '   ' })).toBe('Daily Challenge');

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
      dailyStreak: 4,
      rushBest: 'A · 4★',
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(rushRow?.kind).toBe('mode');
    expect(dailyRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode' || dailyRow?.kind !== 'mode') {
      throw new Error('fixture: Rush / Daily missing');
    }
    expect(isMissMode(rushRow)).toBe(false);
    expect(isMissMode(dailyRow)).toBe(false);
    expect(rushRow.title).toBe('Root Rush');
    expect(dailyRow.title).toBe('Daily Challenge');
    expect(rushRow.sub).not.toMatch(/Missed /);
    expect(dailyRow.sub).not.toMatch(/Missed /);
    expect(listHeading(false, { missWaiting: false, pathDone: true })).toBe('Keep going');

    const cleanRush = buildDetailVM(rushRow, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
      rushRuns: 1,
      rushBestPct: 80,
      rushBestStars: 4,
    });
    expect(cleanRush.eyebrow).toBe('Quiz Mode');
    expect(cleanRush.big).toBe('Root Rush');
    expect(cleanRush.primary.label).not.toMatch(/Remember Geo/);

    const cleanDaily = buildDetailVM(dailyRow, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(cleanDaily.eyebrow).toBe('Daily Challenge');
    expect(cleanDaily.big).toBe('Daily');
    expect(cleanDaily.primary.label).not.toMatch(/Remember Geo/);
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Root Rush / Daily', () => {
    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyNextName: 'Chron',
      dailyPreview: todayDeal.slice(2),
      rushBest: 'A · 4★',
    });
    const rushRow = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    const dailyRow = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    expect(rushRow?.kind).toBe('mode');
    expect(dailyRow?.kind).toBe('mode');
    if (rushRow?.kind !== 'mode' || dailyRow?.kind !== 'mode') {
      throw new Error('fixture: Rush / Daily missing');
    }
    expect(rushRow.title).toBe('Root Rush');
    expect(dailyRow.title).toBe('Daily Challenge');
    expect(isMissMode(rushRow)).toBe(false);

    const mid = buildDetailVM(rushRow, {
      ...extraMiss,
      dailyResumeQi: 2,
      dailyTotal: 5,
      dailyDone: false,
      learnedToday: false,
    });
    expect(mid.big).toBe('Root Rush');
    expect(mid.waitingMiss).toBe(false);
    expect(mid.primary.label).not.toMatch(/Remember Geo/);

    const learnOpen = buildDetailVM(dailyRow, {
      ...extraMiss,
      learnedToday: false,
    });
    expect(learnOpen.big).toBe('Daily');
    expect(learnOpen.waitingMiss).toBe(false);
    expect(learnOpen.primary.label).not.toMatch(/Remember Geo/);
  });

  it('wires Home Rush / Daily titles — Remember, not Root Rush / Daily Challenge over Geo', () => {
    expect(menu).toContain("return miss ? 'Remember' : opts.name");
    expect(menu).toContain("title: modeMenuTitle({ name: 'Root Rush', missName })");
    expect(menu).toContain("title: modeMenuTitle({ name: 'Daily Challenge', missName })");
    expect(menu).toContain('missName,');
    expect(tierMenu).toContain("it.missName ? ' is-miss' : ''");
    expect(tierMenu).not.toContain("it.kind === 'tier' && it.missName ? ' is-miss' : ''");
    expect(css).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.t/);
    expect(css).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.sub/);
  });

  it('keeps Remember / Missed Geo readable on a phone — not hidden behind Root Rush / Daily Challenge', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-menu-row\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.t\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.sub\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-menu-row\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.t\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-menu-row\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.t\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.ww-menu-row\.is-miss \.ww-menu-body \.sub\s*\{[^}]*display:\s*block/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

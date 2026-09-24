import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { dailyDoneLead } from '../core/daily';
import { rememberMissCtaLabel, todayMissRecap } from '../core/rushRecap';
import { buildDailyDone, rushMissRememberReady } from './modes/modeHandoff';
import { buildDetailVM } from './home/detailVM';
import { buildMenu } from './home/menu';
import { buildTodayProgress } from './home/todayProgress';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const overlay = readFileSync(join(process.cwd(), 'src/ui/modes/modeHandoff.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');

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

describe('Daily done after a miss is Remember — not Done for today / Streak banked over Geo', () => {
  it('makes Remember Geo the overlay title — not Done for today / the giant ✓', () => {
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
    expect(today.pathDone).toBe(false);
    expect(today.missWaiting).toBe(true);

    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });

    const reopen = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(reopen.title).toBe(`Remember ${geo.root}`);
    expect(reopen.title).not.toMatch(/Done for today|Nice work|Welcome back/i);
    expect(reopen.celebrateDone).toBe(false);
    expect(reopen.missWaiting).toBe(true);
    expect(reopen.streakLine).toBe('🔥 4 day streak');
    expect(reopen.streakLine).not.toMatch(/Streak banked|✓/);
    expect(reopen.peek).toBe(todayMissRecap(geo.root));
    expect(reopen.primary.label).toBe(rememberMissCtaLabel(geo.root));
    expect(reopen.sub).toBe("Today's five are done. Replay is just for fun.");

    const just = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
    });
    expect(just.title).toBe(`Remember ${geo.root}`);
    expect(just.celebrateDone).toBe(false);
    expect(just.streakLine).not.toMatch(/Streak banked|✓/);

    const two = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      ...missOpts,
      rememberAlso: photo.root,
    });
    expect(two.title).toBe(`Remember ${geo.root}`);
    expect(two.peek).toBe(todayMissRecap(geo.root, photo.root));
    expect(two.celebrateDone).toBe(false);
  });

  it('drops Streak banked on the Home Daily lead while Remember is the hero', () => {
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
    expect(vm.lead).toBe(dailyDoneLead(4, { missWaiting: true }));
    expect(vm.lead).toBe("Today's five are done. Same until tomorrow.");
    expect(String(vm.lead)).not.toMatch(/Streak banked|Done for today/i);
    expect(vm.big).toBe(`Remember ${geo.root}`);
    expect(vm.waiting).toBe(todayMissRecap(geo.root));
    expect(vm.primary.label).toBe(rememberMissCtaLabel(geo.root));
  });

  it('keeps Done for today / Streak banked / the ✓ once the miss is Remembered', () => {
    const clean = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(clean.title).toBe('Done for today.');
    expect(clean.celebrateDone).toBe(true);
    expect(clean.streakLine).toBe('🔥 4 day streak');
    expect(clean.missWaiting).toBe(false);

    const just = buildDailyDone({
      deal: todayDeal,
      streak: 0,
      justFinished: true,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(just.title).toBeNull();
    expect(just.celebrateDone).toBe(true);
    expect(just.streakLine).toBe('Streak banked for today ✓');

    const { items } = buildMenu(startedBuilder, true, {
      currentTier: 2,
      dailyDone: true,
      dailyPreview: todayDeal.slice(0, 3),
    });
    const dailyItem = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    if (!dailyItem || dailyItem.kind !== 'mode') throw new Error('fixture: Daily missing');
    const lead = buildDetailVM(dailyItem, {
      dailyRoots: todayDeal as never,
      dailyDone: true,
      streak: 4,
      nextPlay: false,
      completed: startedBuilder,
      entitled: true,
      learnedToday: true,
    });
    expect(lead.lead).toBe(dailyDoneLead(4));
    expect(String(lead.lead)).toMatch(/Streak banked/);
    expect(lead.big).toBe('Daily');
  });

  it('keeps Continue Daily / unfinished Continue {learn} as Done for today', () => {
    const learnOpen = buildDailyDone({
      deal: todayDeal,
      streak: 4,
      justFinished: false,
      completed: startedBuilder,
      entitled: true,
      rememberMissId: rootId(geo),
      rememberMissName: geo.root,
      learnedToday: false,
    });
    expect(learnOpen.title).toBe('Done for today.');
    expect(learnOpen.celebrateDone).toBe(true);
    expect(learnOpen.missWaiting).toBe(false);
    expect(learnOpen.primary.label).toBe(`Continue ${secondBuilder.root} ›`);
    expect(learnOpen.peek).toBeNull();
  });

  it('wires overlay + Home tile — Remember Geo, not Done for today / Streak banked', () => {
    expect(overlay).toContain('celebrateDone: !miss');
    expect(overlay).toContain('title: miss');
    expect(overlay).toContain('Remember ${miss.name}');
    expect(overlay).toContain("Streak banked for today ✓");
    expect(daily).toContain('done.celebrateDone');
    expect(daily).toContain("done.missWaiting ? ' is-miss'");
    expect(detail).toContain('dailyDoneLead(extra.streak, { missWaiting: Boolean(miss) })');
    expect(detail).toContain("big: miss ? `Remember ${miss.name}` : 'Daily'");
    expect(css).toMatch(/\.q-done-title\.is-miss/);
    expect(css).toMatch(/\.q-stars\.is-miss/);
  });

  it('keeps Remember title readable on a phone — not hidden behind the ✓', () => {
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-done-title\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-stars\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-done-title\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-stars\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-done-title\.is-miss\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.q-stars\.is-miss\s*\{[^}]*display:\s*block/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

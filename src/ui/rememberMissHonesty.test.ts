import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { rememberMissLine } from '../core/deckFlow';
import { rushRecapFromRun, todayRushRecap } from '../core/rushRecap';
import { buildTodayProgress, pickRememberRoot, pickRushMissRemember } from './home/todayProgress';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const band = readFileSync(join(process.cwd(), 'src/ui/home/ProfileBand.tsx'), 'utf8');
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

const TODAY = '2026-09-16';
const first = firstRoot();
if (!first) throw new Error('fixture: expected Bio');
const starter = rootsInTier(1);
const geo = starter[1];
const photo = starter[2];
if (!geo || !photo) throw new Error('fixture: expected Geo / Photo');
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: expected Builder');
const startedBuilder = new Set([...starter.map((r) => rootId(r)), rootId(firstBuilder)]);

function atDay(day: string, hour = 15): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d, hour).getTime();
}

const lastRun = rushRecapFromRun(
  [
    { id: rootId(photo), ok: true },
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
  ],
  { day: TODAY, studentId: 'kid-a' },
);
const owned = {
  [rootId(first)]: { completedAt: atDay('2026-09-01') },
  [rootId(geo)]: { completedAt: atDay('2026-09-02') },
  [rootId(photo)]: { completedAt: atDay('2026-09-03'), reviewedAt: atDay(TODAY, 11) },
  [rootId(firstBuilder)]: { completedAt: atDay('2026-09-10') },
};

describe('Today Remember after Rush is honest — Missed Geo, not stale Bio', () => {
  it('prefers today\'s owned Rush miss over Remembered Photo / oldest Bio', () => {
    expect(todayRushRecap(lastRun, 'kid-a', TODAY)).toEqual(lastRun);
    expect(pickRememberRoot(owned, TODAY)).toBe(rootId(first));
    expect(pickRushMissRemember(lastRun, owned, TODAY)).toBe(rootId(geo));
    const staleIfMissHidden = {
      ...owned,
      [rootId(geo)]: { completedAt: atDay('2026-09-02'), reviewedAt: atDay(TODAY, 12) },
    };
    expect(pickRushMissRemember(lastRun, staleIfMissHidden, TODAY)).toBeNull();

    const vm = buildTodayProgress({
      firstRun: false,
      nextPlay: false,
      dailyDone: false,
      completed: startedBuilder,
      entitled: true,
      rememberRoot: geo.root,
      rememberMean: geo.mean,
      rememberRootId: rootId(geo),
      rememberMissed: true,
    });
    expect(vm.items.find((i) => i.key === 'remember')).toMatchObject({
      done: false,
      label: `Missed ${geo.root} · ${geo.mean}`,
      action: 'remember',
      rootId: rootId(geo),
      missed: true,
    });
    expect(vm.cta?.kind).toBe('learn');
    expect(vm.cta?.label).not.toMatch(/Play again|Try again/);
  });

  it('wires Home pick + Remember miss hold + Home tap — not Try again', () => {
    expect(home).toContain('pickRushMissRemember');
    expect(home).toContain('todayRushRecap');
    expect(home).toContain('rememberMissed: rushMissId != null');
    expect(home).toContain('rushMissId ??');
    expect(home).toContain("entry: 'remember'");
    expect(band).toContain('item.missed');
    expect(band).toContain('is-miss');
    expect(deck).toContain('rememberMissLine');
    expect(deck).toContain("remembering ? ' is-remember' : ''");
    expect(deck).toContain('rememberMissLine(root.root, root.mean)');
    expect(deck).toContain('onClick={closeRoot}');
    expect(deck).toContain('Home →');
    expect(deck).toContain('quizRecall.picked === null');
    expect(rememberMissLine(geo.root, geo.mean)).toBe(`Nope — ${geo.root} means ${geo.mean}.`);
  });

  it('keeps Missed Today + Remember miss hold readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-today-item\.is-miss\s*\{[^}]*display:\s*inline-flex/);
    expect(phone).not.toMatch(/\.ww-today-item\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-recall-teach\.is-remember/);
    expect(short).toMatch(/\.ww-card2\.is-remember \.ww-recall-teach\s*\{[^}]*display:\s*flex/);
    expect(short).not.toMatch(/\.ww-recall-teach\.is-remember\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-today-item\.is-miss/);
    expect(css).toMatch(/\.ww-recall-teach\.is-remember/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

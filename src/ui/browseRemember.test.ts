import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { recapOpenForId } from '../core/deckFlow';
import { buildMenu, homeSecondaryAction } from './home/menu';

const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const index = readFileSync(join(process.cwd(), 'src/ui/deck/RootIndex.tsx'), 'utf8');
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
if (!first) throw new Error('fixture: expected a first root');
const starter = rootsInTier(1);
const starterDone = new Set(starter.map((r) => rootId(r)));
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: expected Builder roots');
const startedBuilder = new Set([...starterDone, rootId(firstBuilder)]);

describe('Browse roots / See all / index is Remember — not a Bio → Geo dump', () => {
  it('owned catalog ids open Remember; unowned stay teach', () => {
    expect(recapOpenForId(rootId(first), startedBuilder)).toEqual({
      id: rootId(first),
      entry: 'remember',
    });
    expect(recapOpenForId(rootId(firstBuilder), new Set())).toEqual({
      id: rootId(firstBuilder),
      entry: 'teach',
    });
  });

  it('Home Browse roots and See all open the catalog — not ROOTS[0] Bio teach', () => {
    const { items } = buildMenu(startedBuilder, false, { currentTier: 2 });
    const rush = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    const daily = items.find((it) => it.kind === 'mode' && it.key === 'daily');
    const starterRow = items.find((it) => it.kind === 'tier' && it.t === 1);
    expect(rush && daily && starterRow).toBeTruthy();
    if (!rush || !daily || !starterRow) throw new Error('fixture: Home rows missing');
    expect(homeSecondaryAction(rush)).toEqual({ kind: 'index' });
    expect(homeSecondaryAction(daily)).toEqual({ kind: 'index' });
    expect(homeSecondaryAction(starterRow)).toEqual({ kind: 'index' });
    expect(home).toContain('homeSecondaryAction');
    expect(home).toContain('setIndexOpen');
    expect(home).toContain('<RootIndex');
    expect(home).toContain('recapOpenForId');
    expect(home).toContain('onBrowsePick');
    expect(home).not.toContain('const first = ROOTS[0]');
    expect(home).not.toContain('openRoot(rootId(first))');
  });

  it('Rush mid-run Continue Daily still wins over Browse', () => {
    const { items } = buildMenu(startedBuilder, false, { currentTier: 2 });
    const rush = items.find((it) => it.kind === 'mode' && it.key === 'rush');
    expect(rush).toBeTruthy();
    if (!rush) throw new Error('fixture: Rush missing');
    expect(homeSecondaryAction(rush, { dailyResumeQi: 2 })).toEqual({ kind: 'daily' });
    expect(home).toContain("tap.kind === 'daily'");
    expect(home).toContain("setView('daily')");
  });

  it('Deck index and Home catalog mark owned chips Remember', () => {
    expect(deck).toContain('recapOpenForId');
    expect(deck).toContain('completed={completed}');
    expect(deck).not.toContain('openRoot(pickId);');
    expect(index).toContain('completed?.has(id)');
    expect(index).toContain('is-done');
    expect(index).toContain('Remember ${root.root}');
    expect(index).toContain('recapDeckEntry');
  });

  it('keeps the catalog readable on a phone — owned ✓ chips stay on screen', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-index\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-ichip\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-ichip\.is-done\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-ichip\.is-done \.ir\s*\{[^}]*display:\s*inline-flex/);
    expect(phone).not.toMatch(/\.ww-index\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-ichip\.is-done\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-ichip \.ww-daily-mark\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-ichip\.is-done\s*\{/);
  });

  it('does not dump Browse onto the first-run one-Play board', () => {
    const firstRun = buildMenu(new Set(), false, { currentTier: 1, nextPlay: true });
    expect(firstRun.items.some((it) => it.kind === 'mode')).toBe(false);
    expect(firstRun.items[0]?.kind).toBe('tier');
    if (firstRun.items[0]?.kind !== 'tier') throw new Error('fixture: first-run tier missing');
    expect(homeSecondaryAction(firstRun.items[0])).toEqual({ kind: 'tier', t: 1 });
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

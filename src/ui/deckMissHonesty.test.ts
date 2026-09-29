import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { recapOpenForRoot } from '../core/deckFlow';
import { rushMissRememberReady } from './modes/modeHandoff';
import {
  deckBackLabel,
  deckIndexAria,
  deckNavMeta,
  deckStripCount,
  deckStripTier,
} from './deck/deckChrome';
import { indexHeading, indexSub } from './deck/indexChip';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const nav = readFileSync(join(process.cwd(), 'src/ui/deck/DeckNav.tsx'), 'utf8');
const chrome = readFileSync(join(process.cwd(), 'src/ui/deck/deckChrome.ts'), 'utf8');
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

const missOpts = {
  rememberMissId: rootId(geo),
  rememberMissName: geo.root,
  dailyDone: true,
  learnedToday: true,
};

describe('Deck after a miss is Remember — not Starter / Card 02 / 183 over Geo', () => {
  it('makes the Remember Geo visit Remember — not Tier 1 · Starter / 183', () => {
    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });
    expect(recapOpenForRoot(geo.root, startedBuilder)).toEqual({
      id: rootId(geo),
      entry: 'remember',
    });
    expect(indexHeading([geo.root])).toBe('Remember');
    expect(indexSub([geo.root], { rootCount: ROOTS.length, tierCount: 5 })).toBe(
      `Missed ${geo.root}`,
    );

    expect(deckBackLabel({ remembering: true, missed: true })).toBe('← Remember');
    expect(deckBackLabel({ remembering: true, missed: true })).not.toMatch(/Today|All roots/);
    expect(deckStripTier({ missed: true, tier: 1, tierName: 'Starter' })).toBe('Remember');
    expect(deckStripTier({ missed: true, tier: 1, tierName: 'Starter' })).not.toMatch(
      /Starter|Tier 1/,
    );
    expect(
      deckStripCount({ missed: true, missName: geo.root, position: 2, total: ROOTS.length }),
    ).toBe(`Missed ${geo.root}`);
    expect(
      deckStripCount({ missed: true, missName: geo.root, position: 2, total: ROOTS.length }),
    ).not.toMatch(/Card |\/ 183|02/);
    expect(
      deckNavMeta({
        missed: true,
        missName: geo.root,
        tierName: 'Starter',
        position: 2,
        total: ROOTS.length,
      }),
    ).toBe(`Remember · ${geo.root}`);
    expect(
      deckNavMeta({
        missed: true,
        missName: geo.root,
        tierName: 'Starter',
        position: 2,
        total: ROOTS.length,
      }),
    ).not.toMatch(/Starter|\/ 183/);
    expect(deckIndexAria({ missed: true })).toBe('Remember');
    expect(deckIndexAria({ missed: true })).not.toMatch(/All roots/);
  });

  it('keeps Starter / Card 02 / 183 / All roots once the miss is Remembered', () => {
    expect(deckBackLabel({ remembering: true })).toBe('← Today');
    expect(deckBackLabel()).toBe('← All roots');
    expect(deckStripTier({ tier: 1, tierName: 'Starter' })).toBe('Tier 1 · Starter');
    expect(deckStripCount({ position: 2, total: ROOTS.length })).toBe(
      `Card 02 / ${ROOTS.length}`,
    );
    expect(
      deckNavMeta({
        tierName: 'Starter',
        position: 2,
        total: ROOTS.length,
      }),
    ).toBe('Starter · 2 / 183');
    expect(deckIndexAria()).toBe('All roots index');
    expect(indexHeading()).toBe('All Roots');
  });

  it('keeps a stale Remember Bio visit Today — not Missed Geo over Bio', () => {
    expect(deckBackLabel({ remembering: true, missed: false })).toBe('← Today');
    expect(deckStripTier({ missed: false, tier: 1, tierName: 'Starter' })).toBe(
      'Tier 1 · Starter',
    );
    expect(
      deckStripCount({
        missed: false,
        missName: geo.root,
        position: 1,
        total: ROOTS.length,
      }),
    ).toBe(`Card 01 / ${ROOTS.length}`);
    expect(deckStripCount({ missed: true })).toBe('Missed');
    expect(deckNavMeta({ missed: true, tierName: 'Starter', position: 2, total: 183 })).toBe(
      'Remember',
    );
  });

  it('wires Deck strip + nav — Remember / Missed Geo, not Starter / 183', () => {
    expect(deck).toContain('deckBackLabel');
    expect(deck).toContain('deckStripTier');
    expect(deck).toContain('deckStripCount');
    expect(deck).toContain('missed: missRemember');
    expect(deck).toContain('missName: root.root');
    expect(deck).toContain('ww-strip${missRemember ? \' is-miss\' : \'\'}');
    expect(deck).toContain('missed={missRemember}');
    expect(deck).not.toContain("remembering ? '← Today' : '← All roots'");
    expect(deck).not.toContain('Card {String(position).padStart(2, \'0\')} / {ROOTS.length}');
    expect(nav).toContain('deckNavMeta');
    expect(nav).toContain('deckIndexAria');
    expect(nav).toContain('ww-decknav${missed ? \' is-miss\' : \'\'}');
    expect(nav).toContain('ww-nav-cur${missed ? \' is-miss\' : \'\'}');
    expect(nav).not.toContain('{tierName} · {position} / {total}');
    expect(nav).not.toContain('aria-label="All roots index"');
    expect(chrome).toContain("if (opts.missed) return '← Remember'");
    expect(chrome).toContain("if (opts.missed) return 'Remember'");
    expect(chrome).toContain('Missed ${name}');
    expect(chrome).toContain('Remember · ${name}');
    expect(css).toMatch(/\.ww-strip\.is-miss \.tier/);
    expect(css).toMatch(/\.ww-strip\.is-miss \.count/);
    expect(css).toMatch(/\.ww-deck-back\.is-miss/);
    expect(css).toMatch(/\.ww-nav-cur\.is-miss \.meta/);
  });

  it('keeps Remember / Missed Geo readable on a phone — not hidden behind Starter / 183', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-strip\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-strip\.is-miss \.tier,\s*\n\s*\.ww-strip\.is-miss \.count\s*\{[^}]*display:\s*inline/);
    expect(phone).toMatch(/\.ww-deck-back\.is-miss\s*\{[^}]*display:\s*inline/);
    expect(phone).toMatch(/\.ww-nav-cur\.is-miss,\s*\n\s*\.ww-nav-cur\.is-miss \.meta\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-strip\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-deck-back\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-nav-cur\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-strip\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.ww-nav-cur\.is-miss \.meta\s*\{[^}]*display:\s*block/);
    expect(short).not.toMatch(/\.ww-strip\.is-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, TIERS, firstRoot, rootId, rootsInTier } from '../data/roots';
import { recapOpenForRoot } from '../core/deckFlow';
import { rushMissRememberReady } from './modes/modeHandoff';
import {
  deckCaption,
  deckEyebrow,
  deckMeansAlt,
  deckNavMeaning,
  deckNavRoot,
  deckShowPrev,
} from './deck/deckChrome';
import {
  indexHeading,
  indexSub,
  indexTierHeading,
  indexTiersMissFirst,
  indexTierSub,
} from './deck/indexChip';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const nav = readFileSync(join(process.cwd(), 'src/ui/deck/DeckNav.tsx'), 'utf8');
const index = readFileSync(join(process.cwd(), 'src/ui/deck/RootIndex.tsx'), 'utf8');
const chip = readFileSync(join(process.cwd(), 'src/ui/deck/indexChip.ts'), 'utf8');
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

describe('Browse / Deck after a miss stay Remember — not Starter / Prev → Bio over Geo', () => {
  it('makes the Geo Browse section Remember — not Tier 1 — Starter', () => {
    expect(rushMissRememberReady(startedBuilder, true, missOpts)).toEqual({
      id: rootId(geo),
      name: geo.root,
    });
    expect(recapOpenForRoot(geo.root, startedBuilder)).toEqual({
      id: rootId(geo),
      entry: 'remember',
    });
    expect(indexHeading([geo.root])).toBe('Remember');
    expect(indexSub([geo.root])).toBe(`Missed ${geo.root}`);

    expect(indexTierHeading({ t: 1, name: 'Starter', missNames: [geo.root] })).toBe('Remember');
    expect(indexTierHeading({ t: 1, name: 'Starter', missNames: [geo.root] })).not.toMatch(
      /Starter|Tier 1/,
    );
    expect(indexTierSub({ sub: TIERS[0]!.sub, missNames: [geo.root] })).toBe(`Missed ${geo.root}`);
    expect(indexTierSub({ sub: TIERS[0]!.sub, missNames: [geo.root] })).not.toMatch(
      /everyday|Middle school/,
    );
    expect(indexTierSub({ sub: TIERS[0]!.sub, missNames: [geo.root, photo.root] })).toBe(
      `Missed ${geo.root} · then ${photo.root}`,
    );
    expect(indexTierHeading({ t: 2, name: 'Builder' })).toBe('Tier 2 — Builder');
    expect(indexTierSub({ sub: TIERS[1]!.sub })).toBe(TIERS[1]!.sub);

    const sections = [
      { n: 'Starter', miss: false },
      { n: 'Builder', miss: true },
      { n: 'Scholar', miss: false },
    ];
    expect(indexTiersMissFirst(sections, (s) => s.miss).map((s) => s.n)).toEqual([
      'Builder',
      'Starter',
      'Scholar',
    ]);
    expect(indexTiersMissFirst(sections, () => false).map((s) => s.n)).toEqual([
      'Starter',
      'Builder',
      'Scholar',
    ]);
  });

  it('makes the Remember Geo card Missed Geo — not prove you know it / Prev → Bio', () => {
    expect(deckCaption({
      emoji: '🌍',
      root: geo.root,
      mean: geo.mean,
      alt: geo.alt,
      remembering: true,
      missed: true,
      studying: true,
    })).toBe(`🌍 Missed ${geo.root}`);
    expect(
      deckCaption({
        emoji: '🌍',
        root: geo.root,
        mean: geo.mean,
        alt: geo.alt,
        remembering: true,
        missed: true,
        studying: true,
      }),
    ).not.toMatch(/watch the scene|Remember Geo/);
    expect(deckEyebrow({ root: geo.root, lang: 'Greek', remembering: true, missed: true })).toBe(
      `Missed ${geo.root}`,
    );
    expect(
      deckEyebrow({ root: geo.root, lang: 'Greek', remembering: true, missed: true }),
    ).not.toMatch(/Latin|Greek Root|Remember Geo/);
    expect(deckMeansAlt({ alt: geo.alt, studying: true, missed: true })).toBe(
      'you missed this in Rush',
    );
    expect(deckMeansAlt({ alt: geo.alt, studying: true, missed: true })).not.toMatch(
      /prove you know it/,
    );
    expect(deckNavRoot({ root: geo.root, missed: true })).toBe(`Missed ${geo.root}`);
    expect(deckNavMeaning({ meaning: '?', missed: true })).toBe('');
    expect(deckShowPrev({ remembering: true })).toBe(false);
    expect(deckShowPrev({ remembering: true })).not.toBe(true);
  });

  it('keeps Starter / prove you know it / Prev once the miss is Remembered', () => {
    expect(indexTierHeading({ t: 1, name: 'Starter' })).toBe('Tier 1 — Starter');
    expect(indexTierSub({ sub: TIERS[0]!.sub })).toBe(TIERS[0]!.sub);
    expect(
      deckCaption({
        emoji: '🌍',
        root: geo.root,
        mean: geo.mean,
        alt: geo.alt,
        remembering: true,
        studying: true,
      }),
    ).toBe(`🌍 Remember ${geo.root}`);
    expect(deckEyebrow({ root: geo.root, lang: 'Greek', remembering: true })).toBe(
      `Remember ${geo.root}`,
    );
    expect(deckMeansAlt({ alt: geo.alt, studying: true })).toBe('prove you know it');
    expect(deckNavRoot({ root: geo.root })).toBe(geo.root);
    expect(deckNavMeaning({ meaning: '?' })).toBe('?');
    expect(deckShowPrev()).toBe(true);
    expect(
      deckCaption({
        emoji: '🌍',
        root: geo.root,
        mean: geo.mean,
        alt: geo.alt,
        studying: false,
      }),
    ).toBe(`🌍 ${geo.mean} — ${geo.alt}`);
    expect(deckEyebrow({ root: geo.root, lang: 'Greek' })).toBe('Greek Root');
  });

  it('wires Browse sections + Deck card — Remember / Missed Geo, not Starter / Prev → Bio', () => {
    expect(index).toContain('indexTierHeading');
    expect(index).toContain('indexTierSub');
    expect(index).toContain('indexTiersMissFirst');
    expect(index).toContain('ww-tier-sec${missSec ? \' is-miss\' : \'\'}');
    expect(index).not.toContain('Tier {ti + 1} — {tier.n}');
    expect(chip).toContain("return cleanNames(opts.missNames)[0] ? 'Remember'");
    expect(chip).toContain('Missed ${names[0]}');
    expect(chip).toContain('indexTiersMissFirst');
    expect(deck).toContain('deckCaption');
    expect(deck).toContain('deckEyebrow');
    expect(deck).toContain('deckMeansAlt');
    expect(deck).toContain('deckNavRoot');
    expect(deck).toContain('deckNavMeaning');
    expect(deck).toContain('deckShowPrev');
    expect(deck).toContain('is-remember-miss');
    expect(deck).toContain('ww-means${missRemember ? \' is-miss\' : \'\'}');
    expect(deck).not.toContain("studying ? 'prove you know it' : root.alt");
    expect(nav).toContain('showPrev');
    expect(nav).toContain('showPrev ? (');
    expect(nav).toContain('{meaning ? <b> · {meaning}</b> : null}');
    expect(nav).not.toContain('{rootLabel} <b>· {meaning}</b>');
    expect(chrome).toContain('Missed ${name}');
    expect(chrome).toContain("return 'you missed this in Rush'");
    expect(chrome).toContain('return !opts.remembering');
    expect(css).toMatch(/\.ww-tier-sec\.is-miss \.th \.n/);
    expect(css).toMatch(/\.ww-caption\.is-remember-miss/);
    expect(css).toMatch(/\.ww-eyebrow2\.is-remember-miss/);
    expect(css).toMatch(/\.ww-means\.is-miss \.alt/);
  });

  it('keeps Remember / Missed Geo readable on a phone — not hidden behind Starter / Prev', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-tier-sec\.is-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-tier-sec\.is-miss \.th,\s*\n\s*\.ww-tier-sec\.is-miss \.th\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-tier-sec\.is-miss \.th \.n,\s*\n\s*\.ww-tier-sec\.is-miss \.th \.s\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-caption\.is-remember-miss,\s*\n\s*\.ww-eyebrow2\.is-remember-miss\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-means\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-tier-sec\.is-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-caption\.is-remember-miss\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-means\.is-miss\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-caption\.is-remember-miss\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.ww-eyebrow2\.is-remember-miss\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.ww-means\.is-miss\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.ww-tier-sec\.is-miss\s*\{[^}]*display:\s*block/);
    expect(short).not.toMatch(/\.ww-caption\.is-remember-miss\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.ww-eyebrow2\.is-remember-miss\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

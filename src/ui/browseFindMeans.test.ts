import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { shortWordDef } from '../core/wordDef';
import {
  deckFindTitle,
  deckMeansAlt,
  deckMeansWord,
  deckNavMeaning,
  deckNavRoot,
} from './deck/deckChrome';

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

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const biology = bio.words.find((w) => w.w === 'Biology')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;
const photograph = photo.words.find((w) => w.w === 'Photograph')!;

describe('Find leftover: title / means / nav name the school word', () => {
  it('names Biology on the hero — not Bio / life over the school word', () => {
    expect(deckFindTitle({ root: bio.root, findWord: 'Biology' })).toBe('Biology');
    expect(deckFindTitle({ root: bio.root, findWord: 'Biology' })).not.toBe(bio.root);
    expect(deckFindTitle({ root: bio.root })).toBe(bio.root);
    expect(
      deckMeansWord({
        mean: bio.mean,
        findWord: 'Biology',
        findDef: biology.d,
      }),
    ).toBe(shortWordDef(biology.d));
    expect(
      deckMeansWord({
        mean: bio.mean,
        findWord: 'Biology',
        findDef: biology.d,
      }),
    ).not.toBe(bio.mean);
    expect(
      deckMeansWord({
        mean: bio.mean,
        findWord: 'Biology',
        findDef: biology.d,
      }),
    ).not.toMatch(/^life$/i);
    expect(
      deckMeansAlt({
        alt: bio.alt,
        findWord: 'Biology',
        findRoot: bio.root,
      }),
    ).toBe(`from ${bio.root}`);
    expect(
      deckMeansAlt({
        alt: bio.alt,
        findWord: 'Biology',
        findRoot: bio.root,
      }),
    ).not.toMatch(/living things|prove you know it/i);
    expect(deckNavRoot({ root: bio.root, findWord: 'Biology' })).toBe('Biology');
    expect(deckNavRoot({ root: bio.root, findWord: 'Biology' })).not.toBe(bio.root);
    expect(
      deckNavMeaning({
        meaning: bio.mean,
        findWord: 'Biology',
        findDef: biology.d,
      }),
    ).toBe(shortWordDef(biology.d));
    expect(
      deckNavMeaning({
        meaning: bio.mean,
        findWord: 'Biology',
        findDef: biology.d,
      }),
    ).not.toBe(bio.mean);
  });

  it('hides the gloss during the word quiz — not life sitting over Biology', () => {
    expect(
      deckMeansWord({
        mean: bio.mean,
        studying: true,
        findWord: 'Biology',
        findDef: biology.d,
      }),
    ).toBe('?');
    expect(
      deckMeansAlt({
        alt: bio.alt,
        studying: true,
        findWord: 'Biology',
        findRoot: bio.root,
      }),
    ).toBe('what this word means');
    expect(
      deckMeansAlt({
        alt: bio.alt,
        studying: true,
        findWord: 'Biology',
        findRoot: bio.root,
      }),
    ).not.toMatch(/prove you know it|living things/i);
    expect(
      deckNavMeaning({
        meaning: '?',
        studying: true,
        findWord: 'Biology',
        findDef: biology.d,
      }),
    ).toBe('');
    expect(
      deckNavMeaning({
        meaning: photo.mean,
        findWord: 'Photograph',
        findDef: photograph.d,
      }),
    ).toBe(shortWordDef(photograph.d));
    expect(deckFindTitle({ root: photo.root, findWord: 'Photograph' })).toBe('Photograph');
  });

  it('keeps Remember / teach chrome once Find is not the visit', () => {
    expect(deckFindTitle({ root: bio.root })).toBe(bio.root);
    expect(deckMeansWord({ mean: bio.mean })).toBe(bio.mean);
    expect(deckMeansAlt({ alt: bio.alt, studying: true })).toBe('prove you know it');
    expect(deckNavRoot({ root: bio.root })).toBe(bio.root);
    expect(deckNavMeaning({ meaning: '?' })).toBe('?');
    expect(deckNavMeaning({ meaning: bio.mean, missed: true, findWord: 'Biology' })).toBe('');
  });

  it('wires Deck / nav / chrome to the school word, not Bio / life', () => {
    expect(deck).toContain('deckFindTitle');
    expect(deck).toContain('deckMeansWord');
    expect(deck).toContain('deckMeansAlt');
    expect(deck).toContain('findRoot: finding ? root.root : undefined');
    expect(deck).toContain('ww-root${finding ? \' is-find\' : \'\'}');
    expect(deck).toContain('ww-means${missRemember ? \' is-miss\' : \'\'}${finding ? \' is-find\' : \'\'}');
    expect(deck).not.toContain('<div className="ww-root">{root.root}</div>');
    expect(deck).not.toContain("{studying ? '?' : root.mean}</span>");
    expect(nav).toContain('ww-nav-cur${missed ? \' is-miss\' : \'\'}${finding ? \' is-find\' : \'\'}');
    expect(chrome).toContain('Biology, not Bio');
    expect(chrome).toContain('from ${root}');
    expect(chrome).toContain("return 'what this word means'");
    expect(css).toMatch(/\.ww-root\.is-find\s*\{/);
    expect(css).toMatch(/\.ww-means\.is-find \.word\s*\{/);
    expect(css).toMatch(/\.ww-nav-cur\.is-find \.r\s*\{/);
  });

  it('keeps the school-word title and gloss readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-root\.is-find\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-means\.is-find\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-nav-cur\.is-find,\s*\n\s*\.ww-nav-cur\.is-find \.meta\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-root\.is-find\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-means\.is-find\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-nav-cur\.is-find\s*\{[^}]*display:\s*none/);
    const card = mediaBlock(css, 'max-width: 820px');
    expect(card).toMatch(/\.ww-root\.is-find\s*\{[^}]*display:\s*block/);
    expect(card).toMatch(/\.ww-means\.is-find\s*\{[^}]*display:\s*flex/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-root\.is-find\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.ww-means\.is-find\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.ww-nav-cur\.is-find,\s*\n\s*\.ww-nav-cur\.is-find \.meta\s*\{[^}]*display:\s*block/);
    expect(short).not.toMatch(/\.ww-root\.is-find\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

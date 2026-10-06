import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, rootId } from '../data/roots';
import { browseOpenForId } from '../core/deckFlow';
import {
  deckBackLabel,
  deckCaption,
  deckEyebrow,
  deckNavMeta,
  deckShowPrev,
  deckStripCount,
  deckStripTier,
} from './deck/deckChrome';
import { indexFocusWord, indexRootMatch } from './deck/indexSearch';
import { openWordForFind, splitForOpenWord } from './wordSplit';

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

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const log = ROOTS.find((r) => r.root === 'Log')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;

describe('Browse find tap opens the school word — not a closed chip', () => {
  it('biology opens Biology on Bio and on Log, with the authored split', () => {
    expect(indexFocusWord(indexRootMatch(bio, 'biology'))).toBe('Biology');
    expect(indexFocusWord(indexRootMatch(log, 'biology'))).toBe('Biology');
    expect(openWordForFind(bio.words, 'Biology')).toBe('Biology');
    expect(openWordForFind(log.words, 'Biology')).toBe('Biology');
    expect(splitForOpenWord(bio.words, 'Biology')).toBe('bio (life) + -logy (study of)');
    expect(splitForOpenWord(log.words, 'Biology')).toBe('bio (life) + logy (study)');
    expect(browseOpenForId(rootId(bio), new Set([rootId(bio)]), 'Biology')?.entry).toBe('find');
    expect(browseOpenForId(rootId(log), new Set(), 'Biology')?.entry).toBe('find');
  });

  it('photograph opens Photograph on Photo — Card 01 / 183 must not sit over it', () => {
    expect(indexFocusWord(indexRootMatch(photo, 'photograph'))).toBe('Photograph');
    expect(deckStripTier({ finding: true, tier: 1, tierName: 'Starter' })).toBe('Find');
    expect(deckStripCount({ findWord: 'Photograph', position: 3, total: 183 })).toBe('Photograph');
    expect(deckStripCount({ findWord: 'Photograph', position: 3, total: 183 })).not.toMatch(
      /Card 03|183/,
    );
    expect(deckNavMeta({ findWord: 'Photograph', tierName: 'Starter', position: 3, total: 183 })).toBe(
      'Find · Photograph',
    );
    expect(deckBackLabel({ finding: true })).toBe('← Find');
    expect(deckEyebrow({ root: 'Photo', lang: 'Greek', findWord: 'Photograph' })).toBe(
      'Find Photograph',
    );
    expect(deckCaption({ emoji: '📷', root: 'Photo', mean: 'light', alt: 'glow', findWord: 'Photograph' })).toBe(
      '📷 Photograph',
    );
    expect(deckShowPrev({ finding: true })).toBe(false);
  });

  it('empty query / meaning / spoken sound stay Remember or teach', () => {
    expect(indexFocusWord(indexRootMatch(bio, ''))).toBeNull();
    expect(indexFocusWord(indexRootMatch(bio, 'life'))).toBeNull();
    expect(indexFocusWord(indexRootMatch(bio, 'BY-oh'))).toBeNull();
    expect(browseOpenForId(rootId(bio), new Set([rootId(bio)]))?.entry).toBe('remember');
    expect(browseOpenForId(rootId(bio), new Set([rootId(bio)]), 'life')?.entry).toBe('remember');
    expect(browseOpenForId(rootId(bio), new Set())?.entry).toBe('teach');
  });

  it('wires Home / Deck / Browse to pass the school word through', () => {
    expect(index).toContain('indexFocusWord');
    expect(index).toContain('onPick(id, focusWord ?? undefined)');
    expect(home).toContain('browseOpenForId');
    expect(home).toContain('focusWord: recap.focusWord');
    expect(deck).toContain('browseOpenForId');
    expect(deck).toContain('openWordForFind');
    expect(deck).toContain('isFindEntry');
    expect(deck).toContain('deckFocusWord');
    expect(deck).toContain('is-find');
    expect(deck).not.toContain('openRoot(pickId);');
  });

  it('keeps the open school word and split readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-card2\.is-find \.ww-word-split[\s\S]*?display:\s*block/);
    expect(phone).toMatch(/\.ww-card2\.is-find \.ww-word\.is-find[\s\S]*?display:\s*flex/);
    expect(phone).toMatch(/\.ww-strip\.is-find\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-card2\.is-find \.ww-word-split[\s\S]*?display:\s*none/);
    expect(phone).not.toMatch(/\.ww-card2\.is-find \.ww-words\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-word\.is-find\s*\{/);
    expect(css).toMatch(/\.ww-card2\.is-find \.ww-word-split\s*\{/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

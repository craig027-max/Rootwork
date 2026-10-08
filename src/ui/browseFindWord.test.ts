import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { afterCorrectRecall, findSuccessLine } from '../core/deckFlow';
import { ROOTS, rootId } from '../data/roots';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const index = readFileSync(join(process.cwd(), 'src/ui/deck/RootIndex.tsx'), 'utf8');
const store = readFileSync(join(process.cwd(), 'src/app/store.ts'), 'utf8');
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

describe('Find leftover: teach the school word, then back to Find', () => {
  it('wires definition, other half, word quiz, and ← Find → index', () => {
    expect(deck).toContain('findMeanLine');
    expect(deck).toContain('findLeadLine');
    expect(deck).toContain('wordDefForOpen');
    expect(deck).toContain('otherRootsForWord');
    expect(deck).toContain('findAlsoTapLabel');
    expect(deck).toContain('findAlsoNote');
    expect(deck).toContain('buildWordRecall');
    expect(deck).toContain('findKnowLabel');
    expect(deck).toContain('findHintLine');
    expect(deck).toContain('findMissLine');
    expect(deck).toContain('findBackOpensIndex');
    expect(deck).toContain('onDeckBack');
    expect(deck).toContain('setIndexOpen(true)');
    expect(deck).toContain('if (!finding) completeRoot');
    expect(deck).toContain('ww-word-def');
    expect(deck).toContain('ww-word-also');
    expect(index).toContain('browseQuery');
    expect(index).toContain('setBrowseQuery');
    expect(store).toContain('browseQuery');
    expect(store).toContain("entry === 'find' ? s.browseQuery : ''");
  });

  it('Yes after a word tap names Biology — not Bio means life', () => {
    expect(
      afterCorrectRecall(rootId(bio), false, {
        entry: 'find',
        findWord: 'Biology',
        findDef: biology.d,
      }).line,
    ).toBe(findSuccessLine('Biology', biology.d));
    expect(
      afterCorrectRecall(rootId(bio), false, {
        entry: 'find',
        findWord: 'Biology',
        findDef: biology.d,
      }).line,
    ).not.toMatch(/Bio means life/);
    expect(afterCorrectRecall(rootId(bio), false, { entry: 'find' }).line).toBe(
      'Yes — Bio means life.',
    );
  });

  it('keeps the word definition readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 820px');
    expect(phone).toMatch(/\.ww-card2\.is-find \.ww-word-def[\s\S]*?display:\s*block/);
    expect(phone).toMatch(/\.ww-card2\.is-find \.ww-word-also[\s\S]*?display:\s*flex/);
    expect(phone).toMatch(/\.ww-card2\.is-find \.ww-lead2\.is-find[\s\S]*?display:\s*block/);
    expect(phone).not.toMatch(/\.ww-card2\.is-find \.ww-word-def[\s\S]*?display:\s*none/);
    expect(css).toMatch(/\.ww-word-def\s*\{/);
    expect(css).toMatch(/\.ww-word-also-tap\s*\{/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import {
  INDEX_SEARCH_PLACEHOLDER,
  buildIndexBrowseSections,
  indexFocusWord,
  indexMatchCount,
  indexRootMatch,
  indexSearchEmptyHint,
  indexSearchSub,
  wordFormHas,
} from './deck/indexSearch';

const index = readFileSync(join(process.cwd(), 'src/ui/deck/RootIndex.tsx'), 'utf8');
const search = readFileSync(join(process.cwd(), 'src/ui/deck/indexSearch.ts'), 'utf8');
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
const photo = ROOTS.find((r) => r.root === 'Photo')!;
const cap = ROOTS.find((r) => r.root === 'Cap')!;
const port = ROOTS.find((r) => r.root === 'Port')!;

describe('Find empty-state leftover: honest miss, school-word forms', () => {
  it('names a true miss as we do not have that word — not No roots match', () => {
    expect(indexSearchSub('dinosaur', 0)).toBe("We don't have dinosaur.");
    expect(indexSearchSub('xyzzyqq', 0)).toBe("We don't have xyzzyqq.");
    expect(indexSearchSub('dinosaur', 0)).not.toMatch(/No roots match|183 roots/i);
    expect(indexSearchEmptyHint()).toBe(
      'Try a root (Bio), a meaning (life), or a word we teach (biology).',
    );
    expect(indexSearchEmptyHint()).not.toBe(
      'Try a root (Bio), a meaning (life), or a word (biology).',
    );
    expect(INDEX_SEARCH_PLACEHOLDER).toMatch(/root.*word/i);
  });

  it('opens Biology from biologist instead of emptying Find', () => {
    expect(wordFormHas('Biology', 'biologist')).toBe(true);
    expect(indexFocusWord(indexRootMatch(bio, 'biologist'))).toBe('Biology');
    expect(indexFocusWord(indexRootMatch(photo, 'photographer'))).toBe('Photograph');
    expect(indexMatchCount(buildIndexBrowseSections({ query: 'biologist' }))).toBeGreaterThan(0);
    expect(indexMatchCount(buildIndexBrowseSections({ query: 'dinosaur' }))).toBe(0);
  });

  it('does not invent Capture / important from a form, and does not grow the catalog', () => {
    expect(wordFormHas('Capture', 'photo')).toBe(false);
    expect(wordFormHas('Port', 'important')).toBe(false);
    expect(wordFormHas('Portable', 'important')).toBe(false);
    expect(indexRootMatch(cap, 'photographer')).toBeNull();
    expect(indexRootMatch(port, 'important')).toBeNull();
    expect(indexFocusWord(indexRootMatch(port, 'portable'))).toBe('Portable');
    const forms = ['biologist', 'photographer', 'geological', 'telephones'];
    for (const form of forms) {
      for (const root of ROOTS) {
        const match = indexRootMatch(root, form);
        if (match?.why !== 'word' || !match.hint) continue;
        expect(wordFormHas(match.hint, form) || match.hint.toLowerCase().includes(form.slice(0, 5))).toBe(
          true,
        );
      }
    }
    expect(ROOTS.length).toBe(183);
  });

  it('wires the empty copy and keeps it readable on a phone', () => {
    expect(search).toContain('wordFormHas');
    expect(search).toContain("We don't have");
    expect(search).toContain('word we teach (biology)');
    expect(search).toContain("We don't have ${shown}.");
    expect(indexSearchSub('xyzzyqq', 0)).not.toMatch(/No roots match/i);
    expect(index).toContain('indexSearchSub(query, 0)');
    expect(index).toContain('indexSearchEmptyHint');
    expect(index).toContain('ww-index-empty');
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-index-empty\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-index-empty \.hint\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-index-empty\s*\{[^}]*display:\s*none/);
  });
});

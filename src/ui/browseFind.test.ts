import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { INDEX_SEARCH_PLACEHOLDER, indexSearchHeading, indexSearchSub } from './deck/indexSearch';

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

describe('Browse find is wired — not a 183-chip scroll', () => {
  it('puts a find field on All Roots and keeps Remember helpers', () => {
    expect(index).toContain('ww-index-q');
    expect(index).toContain('INDEX_SEARCH_PLACEHOLDER');
    expect(index).toContain('buildIndexBrowseSections');
    expect(index).toContain('indexSearchHeading');
    expect(index).toContain('indexSearchSub');
    expect(index).toContain('indexSearchEscape');
    expect(index).toContain('indexChipHint');
    expect(index).toContain('indexHeading');
    expect(index).toContain('indexSub');
    expect(index).toContain('indexRootsMissFirst');
    expect(index).toContain('indexTiersMissFirst');
    expect(INDEX_SEARCH_PLACEHOLDER).toMatch(/root/i);
    expect(indexSearchHeading()).toBe('Find');
    expect(indexSearchSub('photograph', 1)).toBe('1 match');
    expect(indexSearchSub('photograph', 1)).not.toMatch(/183 roots/);
  });

  it('keeps the find field readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-index-find\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-index-q\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-index-empty\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-ichip \.ih\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-index-find\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-index-q\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-ichip \.ih\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-index-q\s*\{/);
    expect(css).toMatch(/\.ww-index-empty\s*\{/);
    expect(css).toMatch(/\.ww-ichip \.ih\s*\{/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

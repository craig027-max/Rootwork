import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
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

function rulesFor(source: string, selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...source.matchAll(new RegExp(`${escaped}\\s*\\{[^}]+\\}`, 'g'))].map((m) => m[0]);
}

describe('phone card: one-line meaning + chips', () => {
  it('keeps example chips on the teach card', () => {
    expect(deck).toContain('className="ww-words"');
    expect(deck).toMatch(/className=\{`ww-word/);
    expect(deck).toContain('root.words.map');
  });

  it('renders a readable one-line root meaning with the chips', () => {
    expect(deck).toContain('className="ww-means"');
    expect(deck).toContain('className="ww-mean-line"');
    expect(deck).toMatch(/means \{root\.mean\}/);
    expect(deck.indexOf('className="ww-mean-line"')).toBeGreaterThan(deck.indexOf('className="ww-words"'));
  });

  it('does not hide the meaning with display:none', () => {
    const meaningRules = [
      ...rulesFor(css, '.ww-means'),
      ...rulesFor(css, '.ww-mean-line'),
    ];
    expect(meaningRules.length).toBeGreaterThan(0);
    for (const rule of meaningRules) {
      expect(rule).not.toMatch(/display:\s*none/);
    }
  });

  it('keeps the meaning visible at a phone-width viewport', () => {
    const phone = mediaBlock(css, 'max-width: 820px');
    expect(phone).toMatch(/\.ww-words\s*\{/);
    expect(phone).toMatch(/display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-words\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-word\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-means\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-mean-line\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-mean-line\s*\{[^}]*display:\s*block/);
  });
});

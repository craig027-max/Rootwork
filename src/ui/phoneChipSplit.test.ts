import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots.data';
import { splitForOpenWord, toggleOpenWord } from './wordSplit';

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

const bio = ROOTS.find((r) => r.root === 'Bio');
if (!bio) throw new Error('missing Bio root');

describe('phone card: tap chip for part-split', () => {
  it('keeps example chips on the teach card', () => {
    expect(deck).toContain('className="ww-words"');
    expect(deck).toContain('root.words.map');
    expect(deck).toMatch(/className=\{`ww-word\$\{openWord === w\.w \? ' is-open' : ''\}`\}/);
  });

  it('tapping a chip at phone width reveals the authored part-split', () => {
    const open = toggleOpenWord(null, 'Biology');
    expect(splitForOpenWord(bio.words, open)).toBe('bio (life) + -logy (study of)');
    expect(deck).toContain('toggleOpenWord');
    expect(deck).toContain('splitForOpenWord');
    expect(deck).toContain('onClick={() => setOpenWord((cur) => toggleOpenWord(cur, w.w))}');
    expect(deck).toContain('className="ww-word-split"');
    expect(deck).toContain('{openSplit}');

    const phone = mediaBlock(css, 'max-width: 820px');
    expect(phone).toMatch(/\.ww-words\s*\{/);
    expect(phone).toMatch(/display:\s*flex/);
    expect(phone).toMatch(/\.ww-word-split\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-word-split\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-words\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.ww-word\s*\{[^}]*display:\s*none/);
  });

  it('does not rely on title-only tooltips for the part-split', () => {
    expect(deck).toContain('title={`${w.b} — ${w.d}`}');
    expect(deck).toContain('className="ww-word-split"');
    expect(deck).toContain('{openSplit}');
    expect(deck.indexOf('className="ww-word-split"')).toBeGreaterThan(deck.indexOf('className="ww-words"'));
    expect(deck).toMatch(/<button[\s\S]*onClick=\{\(\) => setOpenWord/);
  });

  it('keeps the #26 meaning line and does not hide it', () => {
    expect(deck).toContain('className="ww-mean-line"');
    expect(deck).toMatch(/means \{root\.mean\}/);
    const phone = mediaBlock(css, 'max-width: 820px');
    expect(phone).toMatch(/\.ww-mean-line\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-mean-line\s*\{[^}]*display:\s*none/);
  });

  it('does not change the Hear speaker control', () => {
    expect(deck).toContain('ww-hear');
    expect(deck).toContain('aria-label={`Hear ${root.root}`}');
    expect(deck).toContain('speakRoot(card.root, card.say)');
  });
});

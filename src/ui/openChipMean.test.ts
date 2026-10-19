import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shortWordDef } from '../core/wordDef';
import { ROOTS } from '../data/roots';
import { openChipAria, openChipLesson, openChipMeanLine } from './wordSplit';

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

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;

describe('Study chip tap names the school word — not Bio means life', () => {
  it('names Biology and its authored gloss', () => {
    const biology = bio.words.find((w) => w.w === 'Biology')!;
    expect(openChipLesson('Biology', biology.d)).toEqual({
      word: 'Biology',
      gloss: 'The science of living things',
    });
    expect(openChipMeanLine('Biology', biology.d)).toBe(
      'Biology — The science of living things',
    );
    expect(openChipMeanLine('Biology', biology.d)).not.toMatch(/Bio means life/);
    expect(openChipAria('Biology', biology.d)).toBe(
      'Biology. The science of living things',
    );
    expect(openChipLesson('  ', biology.d)).toBeNull();
    expect(openChipLesson('Biology', '   ')).toBeNull();
    expect(openChipMeanLine('Biology', '')).toBeNull();
    expect(openChipAria('Biology', '')).toBe('Biology');
  });

  it('names every catalog school word, not the root gloss', () => {
    for (const root of ROOTS) {
      for (const word of root.words) {
        const lesson = openChipLesson(word.w, word.d);
        const gloss = shortWordDef(word.d);
        if (!gloss) {
          expect(lesson).toBeNull();
          expect(openChipAria(word.w, word.d)).toBe(word.w.trim());
          continue;
        }
        expect(lesson).toEqual({ word: word.w.trim(), gloss });
        const line = openChipMeanLine(word.w, word.d);
        expect(line).toBe(`${word.w.trim()} — ${gloss}`);
        expect(line).not.toBe(`${root.root} means ${root.mean}`);
        expect(line?.startsWith(root.root + ' means')).toBe(false);
        expect(openChipAria(word.w, word.d)).toBe(`${word.w.trim()}. ${gloss}`);
      }
    }
    const photoWord = photo.words.find((w) => w.w === 'Photograph')!;
    expect(openChipMeanLine('Photograph', photoWord.d)).toBe(
      'Photograph — A picture made by capturing light with a camera',
    );
    expect(openChipMeanLine('Photograph', photoWord.d)).not.toMatch(/Photo means light/);
  });

  it('wires the open chip and leaves a closed card on the root', () => {
    expect(deck).toContain('openChipLesson');
    expect(deck).toContain('openChipAria(w.w, w.d)');
    expect(deck).toContain('chipLesson ? \' is-word\'');
    expect(deck).toContain('role={chipLesson ? \'status\' : undefined}');
    expect(deck).toContain('<strong>{chipLesson.word}</strong>');
    expect(deck).toContain('means {root.mean}');
    expect(deck).toContain('finding && findWord && findDef');
    expect(deck).toContain('finding || !openWord');
  });

  it('wraps the open meaning on a phone while chip glosses stay hidden', () => {
    expect(css).toMatch(/\.ww-mean-line\.is-word\s*\{[^}]*white-space:\s*normal/);
    expect(css).toMatch(/\.ww-word-split\s*\{[^}]*white-space:\s*normal/);
    const phone = mediaBlock(css, 'max-width: 820px');
    expect(phone).toMatch(/\.ww-mean-line\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-mean-line\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-word p\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-word-split\s*\{[^}]*display:\s*block/);
  });
});

import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots.data';
import { splitForOpenWord, toggleOpenWord, wordPartSplit } from './wordSplit';

const bio = ROOTS.find((r) => r.root === 'Bio');
if (!bio) throw new Error('missing Bio root');

function word(name: string) {
  const found = bio.words.find((w) => w.w === name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

describe('word part-split (authored `b`)', () => {
  it('uses the existing breakdown, not a new etymology scheme', () => {
    expect(wordPartSplit(word('Biology'))).toBe('bio (life) + -logy (study of)');
    expect(wordPartSplit(word('Biography'))).toBe('bio (life) + -graphy (writing)');
    expect(wordPartSplit(word('Biodegradable'))).toBe('bio (life) + degrade (break down)');
  });

  it('keeps highlight letters (`hl`) as they already appear on the word', () => {
    expect(word('Biology').hl).toBe('Bio');
    expect(word('Biology').w.toLowerCase()).toContain(word('Biology').hl.toLowerCase());
    expect(wordPartSplit(word('Biology'))).toMatch(/bio/);
    expect(wordPartSplit(word('Biology'))).toMatch(/-logy/);
  });
});

describe('tapping a chip reveals the part-split', () => {
  it('opens Biology as bio + -logy from the authored split', () => {
    const open = toggleOpenWord(null, 'Biology');
    expect(splitForOpenWord(bio.words, open)).toBe('bio (life) + -logy (study of)');
  });

  it('switches from Biology to Biography', () => {
    const open = toggleOpenWord('Biology', 'Biography');
    expect(splitForOpenWord(bio.words, open)).toBe('bio (life) + -graphy (writing)');
  });

  it('tapping the open chip again hides the split', () => {
    expect(toggleOpenWord('Biology', 'Biology')).toBeNull();
    expect(splitForOpenWord(bio.words, null)).toBeNull();
  });
});

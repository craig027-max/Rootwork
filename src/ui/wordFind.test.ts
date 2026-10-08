import { describe, expect, it } from 'vitest';
import { ROOTS, isRootOpenable, rootId } from '../data/roots';
import {
  findAlsoNote,
  findAlsoTapLabel,
  findBackOpensIndex,
  findHintLine,
  findKnowLabel,
  findLeadLine,
  findMeanLine,
  findMissLine,
  findSuccessLine,
  otherRootsForWord,
  shortWordDef,
  wordDefForOpen,
} from './wordFind';

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const log = ROOTS.find((r) => r.root === 'Log')!;
const tele = ROOTS.find((r) => r.root === 'Tele')!;
const phon = ROOTS.find((r) => r.root === 'Phon')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;

describe('Find teaches the school word — not Bio means life', () => {
  it('shortens authored defs at the dash, never invents a meaning', () => {
    const biology = bio.words.find((w) => w.w === 'Biology')!;
    expect(shortWordDef(biology.d)).toBe('The science of living things');
    expect(shortWordDef(biology.d)).not.toMatch(/grow, eat/);
    expect(wordDefForOpen(bio.words, 'Biology')).toBe(biology.d);
    expect(wordDefForOpen(bio.words, 'biology')).toBe(biology.d);
    expect(wordDefForOpen(bio.words, null)).toBeNull();
  });

  it('names Biology on the mean line — not Bio means life', () => {
    const biology = bio.words.find((w) => w.w === 'Biology')!;
    expect(findMeanLine('Biology', biology.d)).toBe(
      'Biology — The science of living things',
    );
    expect(findMeanLine('Biology', biology.d)).not.toMatch(/Bio means life/);
    expect(findLeadLine('Biology', 'bio (life) + -logy (study of)')).toBe(
      'Biology is built from bio (life) + -logy (study of).',
    );
    expect(findSuccessLine('Biology', biology.d)).toBe(
      'Yes — Biology. The science of living things',
    );
    expect(findSuccessLine('Biology', biology.d)).not.toMatch(/Bio means life/);
    expect(findMissLine('Biology', biology.d)).toBe(
      'Nope — Biology: The science of living things.',
    );
    expect(findHintLine('Biology')).toBe('What does Biology mean? One tap.');
    expect(findKnowLabel()).toBe('I know this word ✓');
  });

  it('lists the other half of the school word', () => {
    expect(otherRootsForWord('Biology', rootId(bio))).toEqual([
      { id: rootId(log), root: 'Log', mean: log.mean },
    ]);
    expect(otherRootsForWord('Biology', rootId(log))).toEqual([
      { id: rootId(bio), root: 'Bio', mean: bio.mean },
    ]);
    expect(otherRootsForWord('Telephone', rootId(tele))).toEqual([
      { id: rootId(phon), root: 'Phon', mean: phon.mean },
    ]);
    expect(otherRootsForWord('Photograph', rootId(photo))).toEqual([]);
    expect(findAlsoTapLabel('Log')).toBe('Also on Log →');
    expect(findAlsoNote('Log', log.mean)).toBe(`Also on Log · ${log.mean}`);
  });

  it('does not open a paywall tap for a locked other half', () => {
    expect(isRootOpenable(rootId(log), false)).toBe(false);
    expect(isRootOpenable(rootId(phon), false)).toBe(true);
    expect(findBackOpensIndex(true)).toBe(true);
    expect(findBackOpensIndex(false)).toBe(false);
  });
});

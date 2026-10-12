import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import {
  otherPartsForRoot,
  parseWordSplit,
  partAsk,
  partMeanLabels,
  partMissLine,
  partTeach,
  partYesLine,
  pieceMatchesRoot,
  usablePartMean,
} from './wordParts';

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const aqua = ROOTS.find((r) => r.root === 'Aqua')!;
const tri = ROOTS.find((r) => r.root === 'Tri')!;
const graph = ROOTS.find((r) => r.root === 'Graph')!;

describe('parseWordSplit', () => {
  it('reads the authored pieces and does not invent a bare meaning', () => {
    expect(parseWordSplit('bio (life) + -logy (study of)')).toEqual([
      { letters: 'bio', mean: 'life' },
      { letters: '-logy', mean: 'study of' },
    ]);
    expect(parseWordSplit('tri (three) + angle')).toEqual([
      { letters: 'tri', mean: 'three' },
      { letters: 'angle', mean: null },
    ]);
    expect(parseWordSplit('fort (strong)')).toEqual([{ letters: 'fort', mean: 'strong' }]);
  });

  it('parses every catalog split', () => {
    for (const root of ROOTS) {
      for (const word of root.words) {
        const pieces = parseWordSplit(word.b);
        expect(pieces.length, word.b).toBeGreaterThan(0);
        expect(pieces.map((p) => p.letters).join(' + ').length, word.b).toBeGreaterThan(0);
      }
    }
  });
});

describe('other part of a school word', () => {
  it('matches the root by highlight when the spelling drifts (Aque / Aqua)', () => {
    expect(pieceMatchesRoot('aque', 'Aqua', 'Aque')).toBe(true);
    expect(pieceMatchesRoot('duct', 'Aqua', 'Aque')).toBe(false);
    expect(pieceMatchesRoot('-logy', 'Bio', 'Bio')).toBe(false);
  });

  it('asks the other piece of Biology — not bio, and not a bare angle', () => {
    const parts = otherPartsForRoot(bio);
    expect(parts.map((p) => p.letters)).toEqual(['-logy', '-graphy', 'degrade']);
    expect(parts.map((p) => p.mean)).toEqual(['study of', 'writing', 'break down']);
    expect(parts.some((p) => p.mean === bio.mean)).toBe(false);

    const triangle = tri.words.find((w) => w.w === 'Triangle')!;
    expect(otherPartsForRoot(tri).some((p) => p.word === 'Triangle')).toBe(false);
    expect(usablePartMean(parseWordSplit(triangle.b)[1]?.mean)).toBeNull();

    const graphic = graph.words.find((w) => w.w === 'Graphic')!;
    expect(otherPartsForRoot(graph).some((p) => p.word === 'Graphic')).toBe(false);
    expect(graphic.b).toContain('(of)');
  });

  it('keeps Aqueduct’s other piece as duct (lead)', () => {
    const duct = otherPartsForRoot(aqua).find((p) => p.word === 'Aqueduct');
    expect(duct).toMatchObject({ letters: 'duct', mean: 'lead' });
  });

  it('copy names the piece, not the root', () => {
    expect(partAsk('Biology', '-logy')).toBe('In Biology, what does -logy mean?');
    expect(partAsk('Biology', '-logy')).not.toMatch(/What does Biology mean/);
    expect(partTeach('Biology', '-logy', 'study of', 'bio (life) + -logy (study of)')).toBe(
      '-logy means study of. Biology is built from bio (life) + -logy (study of).',
    );
    expect(partYesLine('-logy', 'study of')).toBe('Yes — -logy means study of.');
    expect(partYesLine('-logy', 'study of')).not.toMatch(/Bio means life/);
    expect(partMissLine('-logy', 'study of', 'Biology')).toBe(
      'Nope — in Biology, -logy means study of.',
    );
  });

  it('pools real piece meanings and drops glue glosses', () => {
    const labels = partMeanLabels(ROOTS);
    expect(labels).toContain('study of');
    expect(labels).toContain('life');
    expect(labels).not.toContain('of');
    expect(labels).not.toContain('do');
    expect(new Set(labels.map((l) => l.toLowerCase())).size).toBe(labels.length);
  });
});

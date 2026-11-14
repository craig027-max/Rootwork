import { describe, expect, it } from 'vitest';
import { ROOTS, isRootFree, rootId } from './roots';

/**
 * Count & Shape — a free Starter set for homeschool number and shape words.
 * Meanings follow the classical forms (not lookalike English).
 * September / October / December keep their Roman-calendar places:
 * seven, eight, and ten, counting from March.
 * A millimeter is one thousandth of a meter, not a thousand meters.
 */
const COUNT_SHAPE = [
  'Quad',
  'Pent',
  'Hex',
  'Sept',
  'Oct',
  'Dec',
  'Mill',
  'Gon',
  'Later',
  'Rect',
  'Prim',
  'Post',
] as const;

const MEANINGS: Record<(typeof COUNT_SHAPE)[number], string> = {
  Quad: 'four',
  Pent: 'five',
  Hex: 'six',
  Sept: 'seven',
  Oct: 'eight',
  Dec: 'ten',
  Mill: 'thousand',
  Gon: 'angle',
  Later: 'side',
  Rect: 'straight',
  Prim: 'first',
  Post: 'after',
};

describe('Count & Shape starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve free roots between Sect and Auto', () => {
    expect(COUNT_SHAPE).toHaveLength(12);
    const sect = ROOTS.findIndex((r) => r.root === 'Sect');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(sect).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(sect);
    for (const name of COUNT_SHAPE) {
      const root = by[name];
      expect(root, name).toBeDefined();
      expect(root!.t, name).toBe(1);
      expect(isRootFree(rootId(root!)), name).toBe(true);
      expect(root!.mean, name).toBe(MEANINGS[name]);
      expect(root!.words, name).toHaveLength(3);
      const i = ROOTS.findIndex((r) => r.root === name);
      expect(i, name).toBeGreaterThan(sect);
      expect(i, name).toBeLessThan(auto);
    }
    expect(ROOTS.length).toBe(231);
  });

  it('keeps the classical origins and the shape-word breakdowns', () => {
    expect(by.Quad!.org).toBe('Latin quattuor');
    expect(by.Pent!.org).toBe('Greek pénte');
    expect(by.Hex!.org).toBe('Greek héx');
    expect(by.Sept!.org).toBe('Latin septem');
    expect(by.Oct!.org).toBe('Greek oktṓ · Latin octō');
    expect(by.Dec!.org).toBe('Greek déka · Latin decem');
    expect(by.Mill!.org).toBe('Latin mīlle');
    expect(by.Gon!.org).toBe('Greek gōnía');
    expect(by.Later!.org).toBe('Latin latus');
    expect(by.Rect!.org).toBe('Latin rectus');
    expect(by.Prim!.org).toBe('Latin prīmus');
    expect(by.Post!.org).toBe('Latin post');

    expect(by.Quad!.words.map((w) => w.b)).toEqual([
      'quad (four) + later (side)',
      'quad (four) + ped (foot)',
      'quad (four) + -uple (fold)',
    ]);
    expect(by.Oct!.words.find((w) => w.w === 'Octopus')!.b).toBe('oct (eight) + pus (foot)');
    expect(by.Mill!.words.find((w) => w.w === 'Millennium')!.b).toBe('mill (thousand) + enn (year)');
    expect(by.Gon!.words.find((w) => w.w === 'Polygon')!.b).toBe('poly (many) + gon (angle)');
    expect(by.Later!.words.find((w) => w.w === 'Equilateral')!.b).toBe('equi (equal) + later (side)');
    expect(by.Rect!.words.find((w) => w.w === 'Rectangle')!.b).toBe('rect (straight) + angle');
    expect(by.Post!.words.find((w) => w.w === 'Postpone')!.b).toBe('post (after) + pone (place)');
    expect(by.Post!.words.find((w) => w.w === 'Postscript')!.b).toBe('post (after) + script (write)');
  });

  it('tells the Roman months and the millimeter honestly', () => {
    expect(by.Sept!.words.find((w) => w.w === 'September')!.d).toContain('seventh');
    expect(by.Sept!.words.find((w) => w.w === 'September')!.d).toContain('seven');
    expect(by.Oct!.words.find((w) => w.w === 'October')!.d).toContain('eighth');
    expect(by.Oct!.words.find((w) => w.w === 'October')!.d).toContain('eight');
    expect(by.Dec!.words.find((w) => w.w === 'December')!.d).toContain('tenth');
    expect(by.Dec!.words.find((w) => w.w === 'December')!.d).toContain('ten');
    const mm = by.Mill!.words.find((w) => w.w === 'Millimeter')!;
    expect(mm.d.toLowerCase()).toContain('thousand');
    expect(mm.d.toLowerCase()).not.toMatch(/thousand meters/);
    expect(mm.b).toContain('meter (measure)');
  });
});

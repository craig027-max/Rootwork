import { describe, expect, it } from 'vitest';
import { parseWordSplit } from '../core/wordParts';
import { PALETTES, ROOTS, rootId } from './roots';
import { SCENES } from '../ui/scenes';

/** Scene keys registered in src/ui/scenes.ts — do not invent new ones here. */
const SCENE_KEYS = new Set(Object.keys(SCENES));

const SCHOOL_LIST_GAPS = [
  'Inter',
  'Super',
  'Semi',
  'Anti',
  'Form',
  'Fort',
  'Circum',
  'Contra',
  'Fract',
  'Sect',
  'Cap',
  'Junct',
  'Loc',
  'Mater',
  'Jud',
  'Metr',
  'Mono',
  'Gram',
  'Naut',
  'Dyna',
  'Urb',
  'Civ',
  'Jur',
  'Arch',
  'Polis',
  'Homo',
  'Hypo',
  'Hyper',
  'Techno',
  'Osteo',
  'Odont',
];

describe('curriculum shape (content lift must not break the model)', () => {
  it('every root has three example words, a lead, and an existing scene key', () => {
    for (const r of ROOTS) {
      expect(r.words, r.root).toHaveLength(3);
      expect(r.lead.length, r.root).toBeGreaterThan(10);
      expect(SCENE_KEYS.has(r.scene), `${r.root} scene ${r.scene}`).toBe(true);
      expect(PALETTES[r.pal], `${r.root} pal ${r.pal}`).toBeDefined();
      expect(r.t, r.root).toBeGreaterThanOrEqual(1);
      expect(r.t, r.root).toBeLessThanOrEqual(5);
    }
  });

  it('keeps Bio/Geo/Photo/Aqua/Tele/Therm in free Tier 1 and Astro in Tier 2', () => {
    const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));
    for (const name of ['Bio', 'Geo', 'Photo', 'Aqua', 'Tele', 'Therm']) {
      expect(by[name]?.t, name).toBe(1);
    }
    expect(by.Astro?.t).toBe(2);
  });

  it('has unique root ids', () => {
    const ids = ROOTS.map((r) => rootId(r));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names only letters a kid can find in the example word', () => {
    for (const r of ROOTS) {
      for (const w of r.words) {
        const spelled = w.w.toLowerCase();
        expect(spelled.includes(w.hl.toLowerCase()), `${w.w} highlight ${w.hl}`).toBe(true);
        for (const piece of parseWordSplit(w.b)) {
          const letters = piece.letters.replace(/[^a-z]/gi, '').toLowerCase();
          expect(letters.length, `${w.w} ${w.b}`).toBeGreaterThan(0);
          expect(spelled.includes(letters), `${w.w} names ${piece.letters}`).toBe(true);
        }
      }
    }
  });

  it('highlights letters that actually appear in each new school-list example word', () => {
    const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));
    for (const name of SCHOOL_LIST_GAPS) {
      const r = by[name];
      expect(r, name).toBeDefined();
      for (const w of r!.words) {
        expect(
          w.w.toLowerCase().includes(w.hl.toLowerCase()),
          `${r!.root} word ${w.w} missing hl ${w.hl}`,
        ).toBe(true);
      }
    }
  });

  it('does not quiz a meaning the letters do not carry', () => {
    const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));
    const cases: Array<[string, string, string]> = [
      ['Cent', 'Century', 'span'],
      ['Ped', 'Pedestal', 'stand'],
      ['Min', 'Minor', 'more'],
      ['Aud', 'Audience', 'people'],
      ['Terr', 'Terrain', 'nature of'],
      ['Voc', 'Vocabulary', 'collection'],
      ['Micro', 'Microbe', 'life'],
      ['Jur', 'Jury', 'people'],
      ['Odont', 'Mastodon', 'breast'],
    ];
    for (const [name, word, mean] of cases) {
      const item = by[name]!.words.find((w) => w.w === word);
      expect(item, word).toBeDefined();
      expect(item!.b.toLowerCase(), `${word} breakdown`).not.toContain(`(${mean})`);
      expect(
        parseWordSplit(item!.b).some((piece) => piece.mean?.toLowerCase() === mean),
        `${word} piece ${mean}`,
      ).toBe(false);
    }
    const microbe = by.Micro!.words.find((w) => w.w === 'Microbe')!;
    expect(microbe.d).toContain('joins small and life');
    expect(microbe.b).toBe('micro (small) + be');
    const mastodon = by.Odont!.words.find((w) => w.w === 'Mastodon')!;
    expect(mastodon.b).toContain('mast (bump)');
  });

  it('lights every letter of chthon that the breakdown names', () => {
    const chthon = ROOTS.find((r) => r.root === 'Chthon');
    expect(chthon).toBeDefined();
    for (const w of chthon!.words) {
      const word = w.w.toLowerCase();
      const hl = w.hl.toLowerCase();
      expect(hl, w.w).toBe('chthon');
      expect(word.indexOf(hl), w.w).toBe(word.indexOf('chthon'));
    }
  });

  it('includes high-frequency school-list combining forms that were missing', () => {
    const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));
    for (const name of SCHOOL_LIST_GAPS) {
      expect(by[name], name).toBeDefined();
    }
    expect(by.Inter?.t).toBe(1);
    expect(by.Form?.t).toBe(1);
    expect(by.Cap?.t).toBe(2);
    expect(by.Metr?.t).toBe(2);
    expect(by.Homo?.t).toBe(3);
    expect(by.Arch?.t).toBe(3);
    expect(by.Osteo?.t).toBe(4);
  });
});

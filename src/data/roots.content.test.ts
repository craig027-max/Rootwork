import { describe, expect, it } from 'vitest';
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

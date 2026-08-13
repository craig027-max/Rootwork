import { describe, expect, it } from 'vitest';
import { ROOTS } from './roots';

/** Scene keys that already exist in src/ui/scenes.ts — do not invent new ones here. */
const SCENE_KEYS = new Set([
  'dna',
  'globe',
  'light',
  'waves',
  'draw',
  'water',
  'heat',
  'stars',
  'clock',
  'sound',
  'eye',
  'motion',
  'gear',
  'speak',
  'breakx',
  'scale',
  'heart',
  'mind',
  'people',
]);

describe('curriculum shape (content lift must not break the model)', () => {
  it('every root has three example words, a lead, and an existing scene key', () => {
    for (const r of ROOTS) {
      expect(r.words, r.root).toHaveLength(3);
      expect(r.lead.length, r.root).toBeGreaterThan(10);
      expect(SCENE_KEYS.has(r.scene), `${r.root} scene ${r.scene}`).toBe(true);
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
});

import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots.data';
import { SCENES, SCENE_EMOJI } from './scenes';

describe('scene registry', () => {
  it('exports a function for every registered scene key', () => {
    const keys = Object.keys(SCENES);
    expect(keys.length).toBeGreaterThan(19);
    for (const key of keys) {
      expect(typeof SCENES[key], key).toBe('function');
    }
  });

  it('gives every root a scene that exists in the registry', () => {
    const missing = ROOTS.filter((r) => !SCENES[r.scene]).map((r) => `${r.root} → ${r.scene}`);
    expect(missing).toEqual([]);
  });

  it('has an emoji for every registered scene', () => {
    const missing = Object.keys(SCENES).filter((k) => !SCENE_EMOJI[k]);
    expect(missing).toEqual([]);
  });

  it('wires meaning-true scenes onto the roots that used to contradict', () => {
    const byRoot = Object.fromEntries(ROOTS.map((r) => [r.root, r.scene]));
    expect(byRoot.Stat).toBe('stand');
    expect(byRoot.Ten).toBe('hold');
    expect(byRoot.Tang).toBe('touch');
    expect(byRoot.Lev).toBe('lift');
    expect(byRoot.Aero).toBe('air');
    expect(byRoot.Ptero).toBe('wing');
    expect(byRoot.Struct).toBe('build');
    expect(byRoot.Uni).toBe('one');
    expect(byRoot.Bi).toBe('two');
    expect(byRoot.Tri).toBe('three');
    expect(byRoot.Aqua).toBe('water');
    expect(byRoot.Photo).toBe('light');
    expect(byRoot.Astro).toBe('stars');
    expect(byRoot.Therm).toBe('heat');
    expect(byRoot.Bio).toBe('dna');
    expect(byRoot.Pyr).toBe('heat');
  });
});

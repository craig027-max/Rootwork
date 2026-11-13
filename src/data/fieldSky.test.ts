import { describe, expect, it } from 'vitest';
import { quizGloss } from '../core/wordDef';
import { HEAR_BEAT_PAUSE, speakablePronunciation, utteranceText, yesUtteranceText } from '../core/speak';
import { buildIndexBrowseSections, indexMatchCount } from '../ui/deck/indexSearch';
import { ROOTS, isRootFree, rootId } from './roots';

/**
 * Field & Sky — a free Starter set for homeschool life science and sky words.
 * Meanings follow the classical forms.
 * Dinosaur keeps the honest split: a reptile whose name means terrible lizard.
 * Chlorophyll's green is the pigment in leaves. Albedo is how much light
 * bounces, and the white is in the letters, not a claim that the light is white.
 */
const FIELD_SKY = [
  'Flor',
  'Herb',
  'Chlor',
  'Dendr',
  'Vor',
  'Avi',
  'Saur',
  'Luna',
  'Noct',
  'Nimb',
  'Alb',
  'Seism',
] as const;

const MEANINGS: Record<(typeof FIELD_SKY)[number], string> = {
  Flor: 'flower',
  Herb: 'plant',
  Chlor: 'green',
  Dendr: 'tree',
  Vor: 'eat',
  Avi: 'bird',
  Saur: 'lizard',
  Luna: 'moon',
  Noct: 'night',
  Nimb: 'cloud',
  Alb: 'white',
  Seism: 'quake',
};

const SCENES: Record<(typeof FIELD_SKY)[number], string> = {
  Flor: 'flower',
  Herb: 'plant',
  Chlor: 'green',
  Dendr: 'tree',
  Vor: 'eat',
  Avi: 'bird',
  Saur: 'lizard',
  Luna: 'moon',
  Noct: 'night',
  Nimb: 'cloud',
  Alb: 'white',
  Seism: 'quake',
};

describe('Field & Sky starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve free roots after Post and before Auto', () => {
    expect(FIELD_SKY).toHaveLength(12);
    const post = ROOTS.findIndex((r) => r.root === 'Post');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(post).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(post);
    let prev = post;
    for (const name of FIELD_SKY) {
      const root = by[name];
      expect(root, name).toBeDefined();
      expect(root!.t, name).toBe(1);
      expect(isRootFree(rootId(root!)), name).toBe(true);
      expect(root!.mean, name).toBe(MEANINGS[name]);
      expect(root!.scene, name).toBe(SCENES[name]);
      expect(root!.words, name).toHaveLength(3);
      const i = ROOTS.findIndex((r) => r.root === name);
      expect(i, name).toBeGreaterThan(prev);
      expect(i, name).toBeLessThan(auto);
      prev = i;
    }
    expect(ROOTS.length).toBe(219);
  });

  it('keeps the classical origins and the life-science breakdowns', () => {
    expect(by.Flor!.org).toBe('Latin flōs');
    expect(by.Herb!.org).toBe('Latin herba');
    expect(by.Chlor!.org).toBe('Greek chlōrós');
    expect(by.Dendr!.org).toBe('Greek déndron');
    expect(by.Vor!.org).toBe('Latin vorāre');
    expect(by.Avi!.org).toBe('Latin avis');
    expect(by.Saur!.org).toBe('Greek saûros');
    expect(by.Luna!.org).toBe('Latin lūna');
    expect(by.Noct!.org).toBe('Latin nox');
    expect(by.Nimb!.org).toBe('Latin nimbus');
    expect(by.Alb!.org).toBe('Latin albus');
    expect(by.Seism!.org).toBe('Greek seismós');

    expect(by.Vor!.words.map((w) => w.b)).toEqual([
      'carn (meat) + vore (eat)',
      'herb (plant) + vore (eat)',
      'omni (all) + vore (eat)',
    ]);
    expect(by.Carn!.words.find((w) => w.w === 'Carnivore')!.b).toBe(
      by.Vor!.words.find((w) => w.w === 'Carnivore')!.b,
    );
    expect(by.Omni!.words.find((w) => w.w === 'Omnivore')!.b).toBe(
      by.Vor!.words.find((w) => w.w === 'Omnivore')!.b,
    );
    expect(by.Chlor!.words.find((w) => w.w === 'Chlorophyll')!.b).toBe(
      'chlor (green) + phyll (leaf)',
    );
    expect(by.Saur!.words.find((w) => w.w === 'Pterosaur')!.b).toBe('ptero (wing) + saur (lizard)');
    expect(by.Noct!.words.find((w) => w.w === 'Noctilucent')!.b).toBe('noct (night) + luc (light)');
    expect(by.Seism!.words.find((w) => w.w === 'Seismograph')!.b).toBe('seism (quake) + graph (write)');
    expect(by.Nimb!.words.find((w) => w.w === 'Cumulonimbus')!.b).toBe('cumulo (heap) + nimb (cloud)');
  });

  it('tells the dinosaur, the leaf pigment, and the albedo honestly', () => {
    const dino = by.Saur!.words.find((w) => w.w === 'Dinosaur')!;
    expect(dino.d).toContain('reptile');
    expect(dino.d).toContain('terrible lizard');
    expect(dino.d.toLowerCase()).not.toContain('was a lizard');
    expect(quizGloss(dino.d)).toBe('A famous reptile from long ago');

    const leaf = by.Chlor!.words.find((w) => w.w === 'Chlorophyll')!;
    expect(quizGloss(leaf.d)).toBe('The green pigment in leaves');
    expect(leaf.d).toContain('sunlight');
    expect(quizGloss(leaf.d)!.toLowerCase()).not.toContain('sunlight');

    const albedo = by.Alb!.words.find((w) => w.w === 'Albedo')!;
    expect(quizGloss(albedo.d)).toBe('How much light a surface bounces');
    expect(quizGloss(albedo.d)!.toLowerCase()).not.toContain('white');
    expect(albedo.d).toContain('white');
    expect(albedo.b).toContain('alb (white)');
  });

  it('speaks the new roots as sounds a kid can hear, not the raw card spelling', () => {
    expect(speakablePronunciation('FLOR')).toBe('floor');
    expect(speakablePronunciation('HERB')).toBe('hurb');
    expect(speakablePronunciation('KLOR')).toBe('clore');
    expect(speakablePronunciation('VOR')).toBe('vore');
    expect(speakablePronunciation('SOR')).toBe('sore');
    expect(speakablePronunciation('NOKT')).toBe('knocked');
    expect(speakablePronunciation('SYZ-um')).toBe('size um');
    expect(utteranceText('Flor', 'FLOR')).toBe(
      `Flor. ${HEAR_BEAT_PAUSE} floor. ${HEAR_BEAT_PAUSE} The letters F. L. O. R.`,
    );
    expect(yesUtteranceText('Saur', 'lizard')).toBe('Yes — Saur means lizard.');
  });

  it('lets a family find Dinosaur on Saur', () => {
    const sections = buildIndexBrowseSections({ query: 'dinosaur' });
    expect(indexMatchCount(sections)).toBe(1);
    expect(sections.some((section) => section.roots.some((root) => root.root === 'Saur'))).toBe(true);
  });
});

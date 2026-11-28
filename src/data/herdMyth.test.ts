import { describe, expect, it } from 'vitest';
import { glossSaysMean } from '../core/distractors';
import { quizGloss } from '../core/wordDef';
import { HEAR_BEAT_PAUSE, speakablePronunciation, utteranceText, yesUtteranceText } from '../core/speak';
import { buildIndexBrowseSections, indexMatchCount } from '../ui/deck/indexSearch';
import { ROOTS, isRootFree, rootId } from './roots';

/**
 * Herd & Myth — a free Starter set for homeschool animal, farm, and myth words.
 * Meanings follow the classical forms.
 * A canary is a bird; the islands it is named for were the islands of dogs.
 * A hippocampus is a fish; horse sits in the letters, not in that quiz gloss.
 * Porcelain is a clay; the little pig sits after the dash.
 * Capricorn is a sign of the zodiac; goat and horn sit after the dash.
 * A chameleon is a lizard; lion on the ground sits after the dash.
 */
const HERD_MYTH = [
  'Can',
  'Fel',
  'Hipp',
  'Porc',
  'Capr',
  'Taur',
  'Api',
  'Pisc',
  'Urs',
  'Leon',
  'Ovi',
  'Corn',
] as const;

const MEANINGS: Record<(typeof HERD_MYTH)[number], string> = {
  Can: 'dog',
  Fel: 'cat',
  Hipp: 'horse',
  Porc: 'pig',
  Capr: 'goat',
  Taur: 'bull',
  Api: 'bee',
  Pisc: 'fish',
  Urs: 'bear',
  Leon: 'lion',
  Ovi: 'egg',
  Corn: 'horn',
};

const SCENES: Record<(typeof HERD_MYTH)[number], string> = {
  Can: 'dog',
  Fel: 'cat',
  Hipp: 'horse',
  Porc: 'pig',
  Capr: 'goat',
  Taur: 'bull',
  Api: 'bee',
  Pisc: 'fish',
  Urs: 'bear',
  Leon: 'lion',
  Ovi: 'egg',
  Corn: 'horn',
};

describe('Herd & Myth starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve Starter roots after San and before Auto', () => {
    expect(HERD_MYTH).toHaveLength(12);
    const san = ROOTS.findIndex((r) => r.root === 'San');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(san).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(san);
    let prev = san;
    for (const name of HERD_MYTH) {
      const root = by[name];
      expect(root, name).toBeDefined();
      expect(root!.t, name).toBe(1);
      expect(isRootFree(rootId(root!)), name).toBe(false);
      expect(root!.mean, name).toBe(MEANINGS[name]);
      expect(root!.scene, name).toBe(SCENES[name]);
      expect(root!.words, name).toHaveLength(3);
      const i = ROOTS.findIndex((r) => r.root === name);
      expect(i, name).toBeGreaterThan(prev);
      expect(i, name).toBeLessThan(auto);
      prev = i;
    }
    expect(ROOTS.length).toBe(339);
  });

  it('keeps the classical origins and the shared piece names', () => {
    expect(by.Can!.org).toBe('Latin canis');
    expect(by.Fel!.org).toBe('Latin fēlēs');
    expect(by.Hipp!.org).toBe('Greek híppos');
    expect(by.Porc!.org).toBe('Latin porcus');
    expect(by.Capr!.org).toBe('Latin caper');
    expect(by.Taur!.org).toBe('Latin taurus');
    expect(by.Api!.org).toBe('Latin apis');
    expect(by.Pisc!.org).toBe('Latin piscis');
    expect(by.Urs!.org).toBe('Latin ursus');
    expect(by.Leon!.org).toBe('Latin leō');
    expect(by.Ovi!.org).toBe('Latin ōvum');
    expect(by.Corn!.org).toBe('Latin cornū');

    expect(by.Corn!.words.find((w) => w.w === 'Unicorn')!.b).toBe(
      by.Uni!.words.find((w) => w.w === 'Unicorn')!.b,
    );
    expect(by.Corn!.words.find((w) => w.w === 'Capricorn')!.b).toBe(
      by.Capr!.words.find((w) => w.w === 'Capricorn')!.b,
    );
    expect(by.Pisc!.words.find((w) => w.w === 'Piscivore')!.b).toBe('pisc (fish) + vore (eat)');
    expect(by.Vor!.words.find((w) => w.w === 'Carnivore')!.b).toContain('vore (eat)');
    expect(by.Ovi!.words.find((w) => w.w === 'Oviduct')!.b).toBe('ovi (egg) + duct (lead)');
    expect(by.Aqua!.words.find((w) => w.w === 'Aqueduct')!.b).toContain('duct (lead)');
    expect(by.Via!.words.find((w) => w.w === 'Viaduct')!.b).toContain('duct (lead)');
    expect(by.Ovi!.words.find((w) => w.w === 'Oviform')!.b).toBe('ovi (egg) + form (shape)');
    expect(by.Uni!.words.find((w) => w.w === 'Uniform')!.b).toContain('form (shape)');
    expect(by.Api!.words.find((w) => w.w === 'Apiary')!.b).toBe('api (bee) + -ary (place)');
    expect(by.Avi!.words.find((w) => w.w === 'Aviary')!.b).toContain('-ary (place)');
  });

  it('tells the bird, the fish, the clay, the sign, and the lizard honestly', () => {
    const bird = by.Can!.words.find((w) => w.w === 'Canary')!;
    expect(quizGloss(bird.d)).toBe('A small yellow bird');
    expect(bird.d).toContain('dogs');
    expect(quizGloss(bird.d)!.toLowerCase()).not.toContain('dog');

    const fish = by.Hipp!.words.find((w) => w.w === 'Hippocampus')!;
    expect(quizGloss(fish.d)).toBe('A small fish that swims upright');
    expect(fish.d).toContain('horse');
    expect(quizGloss(fish.d)!.toLowerCase()).not.toContain('horse');
    expect(fish.d.toLowerCase()).not.toContain('was a horse');

    const clay = by.Porc!.words.find((w) => w.w === 'Porcelain')!;
    expect(quizGloss(clay.d)).toBe('A fine white clay for dishes');
    expect(clay.d).toContain('little pig');
    expect(quizGloss(clay.d)!.toLowerCase()).not.toContain('pig');

    const spines = by.Porc!.words.find((w) => w.w === 'Porcupine')!;
    expect(quizGloss(spines.d)).toBe('A spiny animal');
    expect(spines.d).toContain('spiny pig');
    expect(spines.d.toLowerCase()).not.toContain('was a pig');

    const sign = by.Capr!.words.find((w) => w.w === 'Capricorn')!;
    expect(quizGloss(sign.d)).toBe('The tenth sign of the zodiac');
    expect(sign.d).toContain('goat horn');
    expect(quizGloss(sign.d)!.toLowerCase()).not.toContain('goat');
    expect(quizGloss(sign.d)!.toLowerCase()).not.toContain('horn');

    const leap = by.Capr!.words.find((w) => w.w === 'Capricious')!;
    expect(quizGloss(leap.d)).toBe('Quick to change one’s mind');
    expect(leap.d).toContain('goat');
    expect(quizGloss(leap.d)!.toLowerCase()).not.toContain('goat');

    const lizard = by.Leon!.words.find((w) => w.w === 'Chameleon')!;
    expect(quizGloss(lizard.d)).toBe('A lizard that changes color');
    expect(lizard.d).toContain('lion on the ground');
    expect(lizard.d.toLowerCase()).not.toContain('was a lion');
    expect(quizGloss(lizard.d)!.toLowerCase()).not.toContain('lion');

    const plenty = by.Corn!.words.find((w) => w.w === 'Cornucopia')!;
    expect(quizGloss(plenty.d)).toBe('A container overflowing with fruit');
    expect(plenty.d).toContain('horn of plenty');
    expect(quizGloss(plenty.d)!.toLowerCase()).not.toContain('horn');

    const furry = by.Urs!.words.find((w) => w.w === 'Ursine')!;
    expect(quizGloss(furry.d)).toBe('Of a large furry animal');
    expect(furry.d).toContain('bear');
    expect(quizGloss(furry.d)!.toLowerCase()).not.toContain('bear');
    expect(quizGloss(furry.d)!.toLowerCase()).not.toContain('carry');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('dog', 'Of a dog, or a pointed tooth like a dog’s.')).toBe(true);
    expect(glossSaysMean('dog', 'A small yellow bird')).toBe(false);
    expect(glossSaysMean('horse', 'A track where horses race')).toBe(true);
    expect(glossSaysMean('horse', 'A small fish that swims upright')).toBe(false);
    expect(glossSaysMean('horse', 'A huge river animal')).toBe(false);
    expect(glossSaysMean('pig', 'Of a pig.')).toBe(true);
    expect(glossSaysMean('pig', 'A fine white clay for dishes')).toBe(false);
    expect(glossSaysMean('pig', 'A spiny animal')).toBe(false);
    expect(glossSaysMean('goat', 'Of a goat.')).toBe(true);
    expect(glossSaysMean('goat', 'The tenth sign of the zodiac')).toBe(false);
    expect(glossSaysMean('goat', 'Quick to change one’s mind')).toBe(false);
    expect(glossSaysMean('horn', 'A mythical horse with a single horn.')).toBe(true);
    expect(glossSaysMean('horn', 'A container overflowing with fruit')).toBe(false);
    expect(glossSaysMean('horn', 'The tenth sign of the zodiac')).toBe(false);
    expect(glossSaysMean('bear', 'Of a large furry animal')).toBe(false);
    expect(glossSaysMean('bear', 'To carry something from one place to another.')).toBe(true);
    expect(glossSaysMean('lion', 'Like a lion.')).toBe(true);
    expect(glossSaysMean('lion', 'A lizard that changes color')).toBe(false);
    expect(glossSaysMean('egg', 'Hatching from a shell, as a bird does')).toBe(false);
    expect(glossSaysMean('fish', 'An animal that eats fish.')).toBe(true);
    expect(glossSaysMean('fish', 'The twelfth sign of the zodiac')).toBe(false);
    expect(glossSaysMean('bee', 'A place where bees are kept.')).toBe(true);
    expect(glossSaysMean('cat', 'Of a cat.')).toBe(true);
    expect(glossSaysMean('bull', 'The second sign of the zodiac')).toBe(false);
  });

  it('speaks the new roots as sounds a kid can hear, not the raw card spelling', () => {
    expect(speakablePronunciation('CAN')).toBe('can');
    expect(speakablePronunciation('FEE')).toBe('fee');
    expect(speakablePronunciation('HIP')).toBe('hip');
    expect(speakablePronunciation('PORK')).toBe('pork');
    expect(speakablePronunciation('CAP-ri')).toBe('cap ri');
    expect(speakablePronunciation('TOR')).toBe('tor');
    expect(speakablePronunciation('LEE-on')).toBe('lee on');
    expect(speakablePronunciation('ERS')).toBe('ers');
    expect(speakablePronunciation('AY-pee')).toBe('ay pee');
    expect(speakablePronunciation('PISK')).toBe('pisk');
    expect(speakablePronunciation('OH-vee')).toBe('oh vee');
    expect(speakablePronunciation('KORN')).toBe('corn');
    expect(utteranceText('Can', 'CAN')).toBe(
      `Can. ${HEAR_BEAT_PAUSE} can. ${HEAR_BEAT_PAUSE} The letters C. A. N.`,
    );
    expect(yesUtteranceText('Hipp', 'horse')).toBe('Yes — Hipp means horse.');
  });

  it('lets a family find Canary on Can and Chameleon on Leon', () => {
    const bird = buildIndexBrowseSections({ query: 'canary' });
    expect(indexMatchCount(bird)).toBe(1);
    expect(bird.some((section) => section.roots.some((root) => root.root === 'Can'))).toBe(true);

    const spines = buildIndexBrowseSections({ query: 'porcupine' });
    expect(indexMatchCount(spines)).toBe(1);
    expect(spines.some((section) => section.roots.some((root) => root.root === 'Porc'))).toBe(true);

    const lizard = buildIndexBrowseSections({ query: 'chameleon' });
    expect(indexMatchCount(lizard)).toBe(1);
    expect(lizard.some((section) => section.roots.some((root) => root.root === 'Leon'))).toBe(true);

    const horn = buildIndexBrowseSections({ query: 'cornucopia' });
    expect(indexMatchCount(horn)).toBe(1);
    expect(horn.some((section) => section.roots.some((root) => root.root === 'Corn'))).toBe(true);

    const dog = buildIndexBrowseSections({ query: 'dog' });
    expect(indexMatchCount(dog)).toBe(1);
    expect(dog.some((section) => section.roots.some((root) => root.root === 'Can'))).toBe(true);

    const horse = buildIndexBrowseSections({ query: 'horse' });
    expect(indexMatchCount(horse)).toBe(1);
    expect(horse.some((section) => section.roots.some((root) => root.root === 'Hipp'))).toBe(true);
  });
});

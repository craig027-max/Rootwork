import { describe, expect, it } from 'vitest';
import { quizGloss } from '../core/wordDef';
import { HEAR_BEAT_PAUSE, speakablePronunciation, utteranceText, yesUtteranceText } from '../core/speak';
import { buildIndexBrowseSections, indexMatchCount } from '../ui/deck/indexSearch';
import { ROOTS, isRootFree, rootId } from './roots';

/**
 * Body & Sense — a free Starter set for homeschool body and sense words.
 * Meanings follow the classical forms.
 * A trident is a spear whose name means three teeth. A brachiosaurus is a
 * reptile whose name means arm lizard. Digital numerals come from counting
 * on fingers. Gusto is enjoyment, and disgust is a dislike. The taste sits
 * in the letters, not in those quiz glosses.
 */
const BODY_SENSE = [
  'Ocul',
  'Aur',
  'Lingu',
  'Gust',
  'Capit',
  'Cerebr',
  'Dent',
  'Brachi',
  'Digit',
  'Gastr',
  'Pulmo',
  'Pod',
] as const;

const MEANINGS: Record<(typeof BODY_SENSE)[number], string> = {
  Ocul: 'eye',
  Aur: 'ear',
  Lingu: 'tongue',
  Gust: 'taste',
  Capit: 'head',
  Cerebr: 'brain',
  Dent: 'tooth',
  Brachi: 'arm',
  Digit: 'finger',
  Gastr: 'stomach',
  Pulmo: 'lung',
  Pod: 'foot',
};

const SCENES: Record<(typeof BODY_SENSE)[number], string> = {
  Ocul: 'eye',
  Aur: 'ear',
  Lingu: 'tongue',
  Gust: 'taste',
  Capit: 'head',
  Cerebr: 'mind',
  Dent: 'tooth',
  Brachi: 'arm',
  Digit: 'finger',
  Gastr: 'stomach',
  Pulmo: 'lung',
  Pod: 'foot',
};

describe('Body & Sense starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve free roots after Seism and before Auto', () => {
    expect(BODY_SENSE).toHaveLength(12);
    const seism = ROOTS.findIndex((r) => r.root === 'Seism');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(seism).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(seism);
    let prev = seism;
    for (const name of BODY_SENSE) {
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
    expect(ROOTS.length).toBe(231);
  });

  it('keeps the classical origins and the shared breakdowns', () => {
    expect(by.Ocul!.org).toBe('Latin oculus');
    expect(by.Aur!.org).toBe('Latin auris');
    expect(by.Lingu!.org).toBe('Latin lingua');
    expect(by.Gust!.org).toBe('Latin gustus');
    expect(by.Capit!.org).toBe('Latin caput');
    expect(by.Cerebr!.org).toBe('Latin cerebrum');
    expect(by.Dent!.org).toBe('Latin dēns');
    expect(by.Brachi!.org).toBe('Latin bracchium');
    expect(by.Digit!.org).toBe('Latin digitus');
    expect(by.Gastr!.org).toBe('Greek gastḗr');
    expect(by.Pulmo!.org).toBe('Latin pulmō');
    expect(by.Pod!.org).toBe('Greek poús');

    expect(by.Bi!.words.find((w) => w.w === 'Binoculars')!.b).toBe(
      by.Ocul!.words.find((w) => w.w === 'Binoculars')!.b,
    );
    expect(by.Bi!.words.find((w) => w.w === 'Bilingual')!.b).toBe(
      by.Lingu!.words.find((w) => w.w === 'Bilingual')!.b,
    );
    expect(by.Tri!.words.find((w) => w.w === 'Tripod')!.b).toBe(
      by.Pod!.words.find((w) => w.w === 'Tripod')!.b,
    );
    expect(by.Gastr!.words.find((w) => w.w === 'Gastropod')!.b).toBe('gastr (stomach) + pod (foot)');
    expect(by.Brachi!.words.find((w) => w.w === 'Brachiosaurus')!.b).toBe(
      'brachi (arm) + saur (lizard)',
    );
    expect(by.Pulmo!.words.find((w) => w.w === 'Cardiopulmonary')!.b).toBe(
      'cardio (heart) + pulmo (lung)',
    );
    expect(by.Cerebr!.words.find((w) => w.w === 'Cerebrospinal')!.b).toBe(
      'cerebr (brain) + spin (spine)',
    );
    expect(by.Pod!.words.find((w) => w.w === 'Podiatrist')!.b).toBe(
      'pod (foot) + iatr (heal) + -ist (person)',
    );
  });

  it('tells the spear, the dinosaur, the clock, and the dislike honestly', () => {
    const spear = by.Dent!.words.find((w) => w.w === 'Trident')!;
    expect(quizGloss(spear.d)).toBe('A spear with three prongs');
    expect(spear.d).toContain('three teeth');
    expect(quizGloss(spear.d)!.toLowerCase()).not.toContain('tooth');
    expect(quizGloss(spear.d)!.toLowerCase()).not.toContain('teeth');

    const dino = by.Brachi!.words.find((w) => w.w === 'Brachiosaurus')!;
    expect(dino.d).toContain('reptile');
    expect(dino.d).toContain('arm lizard');
    expect(quizGloss(dino.d)).toBe('A long-necked reptile from long ago');
    expect(quizGloss(dino.d)!.toLowerCase()).not.toContain('lizard');
    expect(dino.d.toLowerCase()).not.toContain('was a lizard');

    const clock = by.Digit!.words.find((w) => w.w === 'Digital')!;
    expect(quizGloss(clock.d)).toBe('Using numerals, as a digital clock does');
    expect(clock.d).toContain('fingers');
    expect(quizGloss(clock.d)!.toLowerCase()).not.toContain('finger');

    const zest = by.Gust!.words.find((w) => w.w === 'Gusto')!;
    expect(quizGloss(zest.d)).toBe('Keen enjoyment');
    expect(zest.d).toContain('taste');
    expect(quizGloss(zest.d)!.toLowerCase()).not.toContain('taste');

    const dislike = by.Gust!.words.find((w) => w.w === 'Disgust')!;
    expect(quizGloss(dislike.d)).toBe('A strong dislike');
    expect(quizGloss(dislike.d)!.toLowerCase()).not.toContain('taste');

    const snail = by.Gastr!.words.find((w) => w.w === 'Gastropod')!;
    expect(quizGloss(snail.d)).toBe('A snail or a slug');
    expect(snail.d).toContain('stomach foot');
    expect(quizGloss(snail.d)!.toLowerCase()).not.toContain('stomach');
  });

  it('speaks the new roots as sounds a kid can hear, not the raw card spelling', () => {
    expect(speakablePronunciation('OK-yul')).toBe('ok yul');
    expect(speakablePronunciation('OR')).toBe('or');
    expect(speakablePronunciation('LING-gwa')).toBe('ling gwa');
    expect(speakablePronunciation('KAP-it')).toBe('cap it');
    expect(speakablePronunciation('DIJ-it')).toBe('didge it');
    expect(speakablePronunciation('BRACK-ee')).toBe('brack ee');
    expect(speakablePronunciation('PULL-moh')).toBe('pull moh');
    expect(utteranceText('Aur', 'OR')).toBe(
      `Aur. ${HEAR_BEAT_PAUSE} or. ${HEAR_BEAT_PAUSE} The letters A. U. R.`,
    );
    expect(yesUtteranceText('Pod', 'foot')).toBe('Yes — Pod means foot.');
  });

  it('lets a family find Dentist on Dent and Brachiosaurus on Brachi', () => {
    const dentist = buildIndexBrowseSections({ query: 'dentist' });
    expect(indexMatchCount(dentist)).toBe(1);
    expect(dentist.some((section) => section.roots.some((root) => root.root === 'Dent'))).toBe(true);

    const saur = buildIndexBrowseSections({ query: 'brachiosaurus' });
    expect(indexMatchCount(saur)).toBe(1);
    expect(saur.some((section) => section.roots.some((root) => root.root === 'Brachi'))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { glossSaysMean } from '../core/distractors';
import { quizGloss } from '../core/wordDef';
import { HEAR_BEAT_PAUSE, speakablePronunciation, utteranceText, yesUtteranceText } from '../core/speak';
import { buildIndexBrowseSections, indexMatchCount } from '../ui/deck/indexSearch';
import { ROOTS, isRootFree, rootId } from './roots';

/**
 * Table & Hearth — a free Starter set for homeschool kitchen and hearth words.
 * Meanings follow the classical forms.
 * A salary is pay; the Roman name was money for buying salt.
 * A flamingo is a bird; the flame color sits after the dash.
 * Perfume is a scent; smoke through sits after the dash.
 * A candidate runs for office; the bright robe sits after the dash.
 * Focaccia is a loaf; the hearth sits after the dash.
 * A bib is a cloth; drink sits after the dash.
 */
const TABLE_HEARTH = [
  'Lact',
  'Fruct',
  'Gran',
  'Sal',
  'Mel',
  'Ole',
  'Sacchar',
  'Flam',
  'Fum',
  'Cand',
  'Foc',
  'Bib',
] as const;

const MEANINGS: Record<(typeof TABLE_HEARTH)[number], string> = {
  Lact: 'milk',
  Fruct: 'fruit',
  Gran: 'grain',
  Sal: 'salt',
  Mel: 'honey',
  Ole: 'oil',
  Sacchar: 'sugar',
  Flam: 'flame',
  Fum: 'smoke',
  Cand: 'glow',
  Foc: 'hearth',
  Bib: 'drink',
};

const SCENES: Record<(typeof TABLE_HEARTH)[number], string> = {
  Lact: 'milk',
  Fruct: 'fruit',
  Gran: 'grain',
  Sal: 'salt',
  Mel: 'honey',
  Ole: 'oil',
  Sacchar: 'sugar',
  Flam: 'flame',
  Fum: 'smoke',
  Cand: 'glow',
  Foc: 'hearth',
  Bib: 'drink',
};

describe('Table & Hearth starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve Starter roots after Corn and before Auto', () => {
    expect(TABLE_HEARTH).toHaveLength(12);
    const corn = ROOTS.findIndex((r) => r.root === 'Corn');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(corn).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(corn);
    let prev = corn;
    for (const name of TABLE_HEARTH) {
      const root = by[name];
      expect(root, name).toBeDefined();
      expect(root!.t, name).toBe(1);
      expect(isRootFree(rootId(root!)), name).toBe(name === 'Sal');
      expect(root!.mean, name).toBe(MEANINGS[name]);
      expect(root!.scene, name).toBe(SCENES[name]);
      expect(root!.words, name).toHaveLength(3);
      const i = ROOTS.findIndex((r) => r.root === name);
      expect(i, name).toBeGreaterThan(prev);
      expect(i, name).toBeLessThan(auto);
      prev = i;
    }
    expect(ROOTS.length).toBe(303);
  });

  it('keeps the classical origins and the shared piece names', () => {
    expect(by.Lact!.org).toBe('Latin lac');
    expect(by.Fruct!.org).toBe('Latin frūctus');
    expect(by.Gran!.org).toBe('Latin grānum');
    expect(by.Sal!.org).toBe('Latin sāl');
    expect(by.Mel!.org).toBe('Latin mel · Greek méli');
    expect(by.Ole!.org).toBe('Latin oleum');
    expect(by.Sacchar!.org).toBe('Greek sákkharon');
    expect(by.Flam!.org).toBe('Latin flamma');
    expect(by.Fum!.org).toBe('Latin fūmus');
    expect(by.Cand!.org).toBe('Latin candēre');
    expect(by.Foc!.org).toBe('Latin focus');
    expect(by.Bib!.org).toBe('Latin bibere');

    expect(by.Lact!.words.find((w) => w.w === 'Lactose')!.b).toBe(
      by.Fruct!.words.find((w) => w.w === 'Fructose')!.b.replace('fruct (fruit)', 'lact (milk)'),
    );
    expect(by.Fruct!.words.find((w) => w.w === 'Fructose')!.b).toBe('fruct (fruit) + -ose (sugar)');
    expect(by.Gran!.words.find((w) => w.w === 'Granary')!.b).toBe('gran (grain) + -ary (place)');
    expect(by.Api!.words.find((w) => w.w === 'Apiary')!.b).toContain('-ary (place)');
    expect(by.Avi!.words.find((w) => w.w === 'Aviary')!.b).toContain('-ary (place)');
    expect(by.Mel!.words.find((w) => w.w === 'Mellifluous')!.b).toBe('mel (honey) + flu (flow)');
    expect(by.Flu!.words.find((w) => w.w === 'Fluid')!.b).toContain('flu (flow)');
    expect(by.Fruct!.words.find((w) => w.w === 'Fructivorous')!.b).toBe('fruct (fruit) + vor (eat)');
    expect(by.Vor!.words.find((w) => w.w === 'Carnivore')!.b).toContain('vore (eat)');
    expect(by.Flam!.words.find((w) => w.w === 'Inflame')!.b).toBe('in (into) + flam (flame)');
    expect(by.Struct!.words.find((w) => w.w === 'Instruct')!.b).toContain('in (into)');
    expect(by.Ole!.words.find((w) => w.w === 'Petroleum')!.b).toBe('petr (rock) + ole (oil)');
    expect(by.Ole!.words.find((w) => w.w === 'Linoleum')!.b).toBe('lin (flax) + ole (oil)');
    expect(by.Gran!.words.find((w) => w.w === 'Pomegranate')!.b).toBe('pome (apple) + gran (grain)');
  });

  it('tells the pay, the bird, the scent, the robe, the loaf, and the cloth honestly', () => {
    const pay = by.Sal!.words.find((w) => w.w === 'Salary')!;
    expect(quizGloss(pay.d)).toBe('Pay for work');
    expect(pay.d).toContain('salt');
    expect(quizGloss(pay.d)!.toLowerCase()).not.toContain('salt');

    const leaves = by.Sal!.words.find((w) => w.w === 'Salad')!;
    expect(quizGloss(leaves.d)).toBe('A bowl of raw leaves');
    expect(leaves.d).toContain('salted');
    expect(quizGloss(leaves.d)!.toLowerCase()).not.toContain('salt');

    const sauce = by.Sal!.words.find((w) => w.w === 'Salsa')!;
    expect(quizGloss(sauce.d)).toBe('A sauce of tomatoes and peppers');
    expect(sauce.d).toContain('salted');
    expect(quizGloss(sauce.d)!.toLowerCase()).not.toContain('salt');

    const bird = by.Flam!.words.find((w) => w.w === 'Flamingo')!;
    expect(quizGloss(bird.d)).toBe('A tall pink bird');
    expect(bird.d).toContain('flame');
    expect(quizGloss(bird.d)!.toLowerCase()).not.toContain('flame');
    expect(bird.d.toLowerCase()).not.toContain('was a flame');

    const scent = by.Fum!.words.find((w) => w.w === 'Perfume')!;
    expect(quizGloss(scent.d)).toBe('A pleasant scent');
    expect(scent.d).toContain('smoke');
    expect(quizGloss(scent.d)!.toLowerCase()).not.toContain('smoke');

    const robe = by.Cand!.words.find((w) => w.w === 'Candidate')!;
    expect(quizGloss(robe.d)).toBe('Someone running for an office');
    expect(robe.d).toContain('glow');
    expect(quizGloss(robe.d)!.toLowerCase()).not.toContain('glow');
    expect(quizGloss(robe.d)!.toLowerCase()).not.toContain('white');

    const loaf = by.Foc!.words.find((w) => w.w === 'Focaccia')!;
    expect(quizGloss(loaf.d)).toBe('A flat dimpled loaf');
    expect(loaf.d).toContain('hearth');
    expect(quizGloss(loaf.d)!.toLowerCase()).not.toContain('hearth');

    const cloth = by.Bib!.words.find((w) => w.w === 'Bib')!;
    expect(quizGloss(cloth.d)).toBe('A cloth at a baby’s chin');
    expect(cloth.d).toContain('drink');
    expect(quizGloss(cloth.d)!.toLowerCase()).not.toContain('drink');

    const fuel = by.Ole!.words.find((w) => w.w === 'Petroleum')!;
    expect(quizGloss(fuel.d)).toBe('A dark fuel for engines');
    expect(fuel.d).toContain('rock oil');
    expect(quizGloss(fuel.d)!.toLowerCase()).not.toContain('oil');
    expect(quizGloss(fuel.d)!.toLowerCase()).not.toContain('rock');

    const seeds = by.Gran!.words.find((w) => w.w === 'Pomegranate')!;
    expect(quizGloss(seeds.d)).toBe('A round food packed with jewel-like seeds');
    expect(seeds.d).toContain('grains');
    expect(quizGloss(seeds.d)!.toLowerCase()).not.toContain('grain');
    expect(quizGloss(seeds.d)!.toLowerCase()).not.toContain('apple');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('milk', 'A sugar in milk')).toBe(true);
    expect(glossSaysMean('milk', 'Milk for a baby')).toBe(true);
    expect(glossSaysMean('salt', 'Pay for work')).toBe(false);
    expect(glossSaysMean('salt', 'A bowl of raw leaves')).toBe(false);
    expect(glossSaysMean('salt', 'A sauce of tomatoes and peppers')).toBe(false);
    expect(glossSaysMean('salt', 'Of salt.')).toBe(true);
    expect(glossSaysMean('grain', 'A breakfast of toasted oats')).toBe(false);
    expect(glossSaysMean('grain', 'A farm shed that stores the harvest')).toBe(false);
    expect(glossSaysMean('grain', 'A round food packed with jewel-like seeds')).toBe(false);
    expect(glossSaysMean('fruit', 'A sugar in fruit')).toBe(true);
    expect(glossSaysMean('fruit', 'To grow productive')).toBe(false);
    expect(glossSaysMean('fruit', 'Feeding on orchard crops')).toBe(false);
    expect(glossSaysMean('honey', 'Pleasant and smooth to listen to')).toBe(false);
    expect(glossSaysMean('honey', 'A lemon-scented leaf')).toBe(false);
    expect(glossSaysMean('honey', 'Flowing with honey')).toBe(true);
    expect(glossSaysMean('oil', 'A dark fuel for engines')).toBe(false);
    expect(glossSaysMean('oil', 'A smooth sheet used on floors')).toBe(false);
    expect(glossSaysMean('oil', 'Slick in manner')).toBe(false);
    expect(glossSaysMean('sugar', 'A sugar unit in food')).toBe(true);
    expect(glossSaysMean('sugar', 'A sweetener prepared in a lab')).toBe(false);
    expect(glossSaysMean('sugar', 'Too sweet in manner')).toBe(false);
    expect(glossSaysMean('flame', 'Able to catch flame')).toBe(true);
    expect(glossSaysMean('flame', 'A tall pink bird')).toBe(false);
    expect(glossSaysMean('flame', 'To rouse anger')).toBe(false);
    expect(glossSaysMean('fire', 'Able to catch flame')).toBe(false);
    expect(glossSaysMean('smoke', 'Smoke, or a sharp vapor')).toBe(true);
    expect(glossSaysMean('smoke', 'A pleasant scent')).toBe(false);
    expect(glossSaysMean('smoke', 'A treatment that clears pests with vapor')).toBe(false);
    expect(glossSaysMean('glow', 'Glowing, as a bulb')).toBe(true);
    expect(glossSaysMean('glow', 'A wax stick with a wick')).toBe(false);
    expect(glossSaysMean('glow', 'Someone running for an office')).toBe(false);
    expect(glossSaysMean('hearth', 'A flat dimpled loaf')).toBe(false);
    expect(glossSaysMean('hearth', 'What a lesson keeps returning to')).toBe(false);
    expect(glossSaysMean('hearth', 'The household hearth')).toBe(true);
    expect(glossSaysMean('drink', 'To swallow liquid')).toBe(false);
    expect(glossSaysMean('drink', 'A cloth at a baby’s chin')).toBe(false);
    expect(glossSaysMean('drink', 'Quick to soak up liquid')).toBe(false);
    expect(glossSaysMean('drink', 'To drink')).toBe(true);
    expect(glossSaysMean('make', 'Milk for a baby')).toBe(false);
    expect(glossSaysMean('small', 'Of milk, or a narrow vessel for it')).toBe(false);
    expect(glossSaysMean('speak', 'What a lesson keeps returning to')).toBe(false);
    expect(glossSaysMean('build', 'A farm shed that stores the harvest')).toBe(false);
    expect(glossSaysMean('break', 'Able to catch flame')).toBe(false);
    expect(glossSaysMean('strong', 'To rouse anger')).toBe(false);
    expect(glossSaysMean('old', 'Glowing, as a bulb')).toBe(false);
    expect(glossSaysMean('under', 'A cloth at a baby’s chin')).toBe(false);
    expect(glossSaysMean('above', 'Too sweet in manner')).toBe(false);
  });

  it('speaks the new roots as sounds a kid can hear, not the raw card spelling', () => {
    expect(speakablePronunciation('LACT')).toBe('lacked');
    expect(speakablePronunciation('FRUKT')).toBe('frukt');
    expect(speakablePronunciation('GRAN')).toBe('gran');
    expect(speakablePronunciation('SAL')).toBe('sal');
    expect(speakablePronunciation('MEL')).toBe('mel');
    expect(speakablePronunciation('OH-lee')).toBe('oh lee');
    expect(speakablePronunciation('SAK-ar')).toBe('sack ar');
    expect(speakablePronunciation('FLAM')).toBe('flam');
    expect(speakablePronunciation('FYOOM')).toBe('fume');
    expect(speakablePronunciation('KAND')).toBe('canned');
    expect(speakablePronunciation('FOH-kus')).toBe('foe cuss');
    expect(speakablePronunciation('BIB')).toBe('bib');
    expect(utteranceText('Lact', 'LACT')).toBe(
      `Lact. ${HEAR_BEAT_PAUSE} lacked. ${HEAR_BEAT_PAUSE} The letters L. A. C. T.`,
    );
    expect(yesUtteranceText('Foc', 'hearth')).toBe('Yes — Foc means hearth.');
  });

  it('lets a family find Salary on Sal and Focaccia on Foc', () => {
    const pay = buildIndexBrowseSections({ query: 'salary' });
    expect(indexMatchCount(pay)).toBe(1);
    expect(pay.some((section) => section.roots.some((root) => root.root === 'Sal'))).toBe(true);

    const bird = buildIndexBrowseSections({ query: 'flamingo' });
    expect(indexMatchCount(bird)).toBe(1);
    expect(bird.some((section) => section.roots.some((root) => root.root === 'Flam'))).toBe(true);

    const loaf = buildIndexBrowseSections({ query: 'focaccia' });
    expect(indexMatchCount(loaf)).toBe(1);
    expect(loaf.some((section) => section.roots.some((root) => root.root === 'Foc'))).toBe(true);

    const scent = buildIndexBrowseSections({ query: 'perfume' });
    expect(indexMatchCount(scent)).toBe(1);
    expect(scent.some((section) => section.roots.some((root) => root.root === 'Fum'))).toBe(true);

    const seeds = buildIndexBrowseSections({ query: 'pomegranate' });
    expect(indexMatchCount(seeds)).toBe(1);
    expect(seeds.some((section) => section.roots.some((root) => root.root === 'Gran'))).toBe(true);

    const salt = buildIndexBrowseSections({ query: 'salt' });
    expect(indexMatchCount(salt)).toBe(1);
    expect(salt.some((section) => section.roots.some((root) => root.root === 'Sal'))).toBe(true);

    const milk = buildIndexBrowseSections({ query: 'milk' });
    expect(indexMatchCount(milk)).toBe(1);
    expect(milk.some((section) => section.roots.some((root) => root.root === 'Lact'))).toBe(true);

    const honey = buildIndexBrowseSections({ query: 'honey' });
    expect(indexMatchCount(honey)).toBe(1);
    expect(honey.some((section) => section.roots.some((root) => root.root === 'Mel'))).toBe(true);

    const hearth = buildIndexBrowseSections({ query: 'hearth' });
    expect(indexMatchCount(hearth)).toBe(1);
    expect(hearth.some((section) => section.roots.some((root) => root.root === 'Foc'))).toBe(true);

    const sugar = buildIndexBrowseSections({ query: 'sugar' });
    expect(indexMatchCount(sugar)).toBe(1);
    expect(sugar.some((section) => section.roots.some((root) => root.root === 'Sacchar'))).toBe(true);
  });
});

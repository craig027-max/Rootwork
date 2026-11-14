import { describe, expect, it } from 'vitest';
import { glossSaysMean } from '../core/distractors';
import { quizGloss } from '../core/wordDef';
import { HEAR_BEAT_PAUSE, speakablePronunciation, utteranceText, yesUtteranceText } from '../core/speak';
import { buildIndexBrowseSections, indexMatchCount } from '../ui/deck/indexSearch';
import { ROOTS, isRootFree, rootId } from './roots';

/**
 * Home & Kin — a free Starter set for homeschool house, family, and school words.
 * Meanings follow the classical forms.
 * A dome is a rounded roof whose name comes from house.
 * The Senate is a council named for the old.
 * A doctor heals; the Latin name meant a teacher.
 * The Pacific is an ocean; peace sits in the letters, not in that quiz gloss.
 * The Mediterranean is a sea; middle of the land sits after the dash.
 */
const HOME_KIN = [
  'Dom',
  'Famil',
  'Frater',
  'Sen',
  'Juven',
  'Ami',
  'Pac',
  'Doc',
  'Schol',
  'Via',
  'Medi',
  'San',
] as const;

const MEANINGS: Record<(typeof HOME_KIN)[number], string> = {
  Dom: 'house',
  Famil: 'family',
  Frater: 'brother',
  Sen: 'old',
  Juven: 'young',
  Ami: 'friend',
  Pac: 'peace',
  Doc: 'teach',
  Schol: 'school',
  Via: 'road',
  Medi: 'middle',
  San: 'healthy',
};

const SCENES: Record<(typeof HOME_KIN)[number], string> = {
  Dom: 'house',
  Famil: 'family',
  Frater: 'brother',
  Sen: 'old',
  Juven: 'young',
  Ami: 'friend',
  Pac: 'peace',
  Doc: 'teach',
  Schol: 'school',
  Via: 'road',
  Medi: 'middle',
  San: 'healthy',
};

describe('Home & Kin starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve free roots after Pod and before Auto', () => {
    expect(HOME_KIN).toHaveLength(12);
    const pod = ROOTS.findIndex((r) => r.root === 'Pod');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(pod).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(pod);
    let prev = pod;
    for (const name of HOME_KIN) {
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

  it('keeps the classical origins and the shared piece names', () => {
    expect(by.Dom!.org).toBe('Latin domus');
    expect(by.Famil!.org).toBe('Latin familia');
    expect(by.Frater!.org).toBe('Latin frāter');
    expect(by.Sen!.org).toBe('Latin senex');
    expect(by.Juven!.org).toBe('Latin iuvenis');
    expect(by.Ami!.org).toBe('Latin amīcus');
    expect(by.Pac!.org).toBe('Latin pāx');
    expect(by.Doc!.org).toBe('Latin docēre');
    expect(by.Schol!.org).toBe('Greek scholḗ');
    expect(by.Via!.org).toBe('Latin via');
    expect(by.Medi!.org).toBe('Latin medius');
    expect(by.San!.org).toBe('Latin sānus');

    expect(by.Via!.words.find((w) => w.w === 'Viaduct')!.b).toBe('via (road) + duct (lead)');
    expect(by.Aqua!.words.find((w) => w.w === 'Aqueduct')!.b).toContain('duct (lead)');
    expect(by.Duc!.words.find((w) => w.w === 'Conduct')!.b).toContain('duct (lead)');
    expect(by.Via!.words.find((w) => w.w === 'Trivial')!.b).toBe('tri (three) + via (road)');
    expect(by.Tri!.words.find((w) => w.w === 'Triangle')!.b).toContain('tri (three)');
    expect(by.Medi!.words.find((w) => w.w === 'Mediterranean')!.b).toBe(
      'medi (middle) + terr (land)',
    );
    expect(by.Terr!.words.find((w) => w.w === 'Territory')!.b).toContain('terr (land)');
    expect(by.Juven!.words.find((w) => w.w === 'Rejuvenate')!.b).toBe(
      're (again) + juven (young)',
    );
    expect(by.Vit!.words.find((w) => w.w === 'Revitalize')!.b).toContain('re (again)');
    expect(by.San!.words.find((w) => w.w === 'Insane')!.b).toBe('in (not) + san (healthy)');
  });

  it('tells the roof, the council, the healer, the ocean, and the sea honestly', () => {
    const roof = by.Dom!.words.find((w) => w.w === 'Dome')!;
    expect(quizGloss(roof.d)).toBe('A rounded roof');
    expect(roof.d).toContain('house');
    expect(quizGloss(roof.d)!.toLowerCase()).not.toContain('house');
    expect(quizGloss(roof.d)!.toLowerCase()).not.toContain('home');

    const council = by.Sen!.words.find((w) => w.w === 'Senate')!;
    expect(quizGloss(council.d)).toBe('A lawmaking council');
    expect(council.d).toContain('old');
    expect(quizGloss(council.d)!.toLowerCase()).not.toContain('old');
    expect(quizGloss(council.d)!.toLowerCase()).not.toContain('elder');

    const healer = by.Doc!.words.find((w) => w.w === 'Doctor')!;
    expect(quizGloss(healer.d)).toBe('Someone trained to heal the sick');
    expect(healer.d).toContain('teacher');
    expect(quizGloss(healer.d)!.toLowerCase()).not.toContain('teach');

    const ocean = by.Pac!.words.find((w) => w.w === 'Pacific')!;
    expect(quizGloss(ocean.d)).toBe('The ocean west of the Americas');
    expect(ocean.d).toContain('peace');
    expect(quizGloss(ocean.d)!.toLowerCase()).not.toContain('peace');

    const sea = by.Medi!.words.find((w) => w.w === 'Mediterranean')!;
    expect(quizGloss(sea.d)).toBe('The sea surrounded by Europe, Africa, and Asia');
    expect(sea.d).toContain('middle of the land');
    expect(quizGloss(sea.d)!.toLowerCase()).not.toContain('middle');
    expect(quizGloss(sea.d)!.toLowerCase()).not.toContain('land');

    const known = by.Famil!.words.find((w) => w.w === 'Familiar')!;
    expect(quizGloss(known.d)).toBe('Already known');
    expect(known.d).toContain('family');
    expect(quizGloss(known.d)!.toLowerCase()).not.toContain('family');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('house', 'At home anywhere in the world.')).toBe(true);
    expect(glossSaysMean('house', 'A rounded roof')).toBe(false);
    expect(glossSaysMean('house', 'Of the house, such as chores at home.')).toBe(true);
    expect(glossSaysMean('family', 'The male head of a family or people.')).toBe(true);
    expect(glossSaysMean('family', 'Already known')).toBe(false);
    expect(glossSaysMean('family', 'Parents and children in a household.')).toBe(true);
    expect(glossSaysMean('old', 'A lawmaking council')).toBe(false);
    expect(glossSaysMean('old', 'Older than the others.')).toBe(true);
    expect(glossSaysMean('old', 'An elder of the group.')).toBe(true);
    expect(glossSaysMean('young', 'To become young again.')).toBe(true);
    expect(glossSaysMean('young', 'Full of youth.')).toBe(true);
    expect(glossSaysMean('road', 'A road that runs between states.')).toBe(true);
    expect(glossSaysMean('road', 'To leave a planned course')).toBe(false);
    expect(glossSaysMean('road', 'A shorter route home.')).toBe(true);
    expect(glossSaysMean('middle', 'Having the Sun at the center.')).toBe(true);
    expect(glossSaysMean('middle', 'The sea surrounded by Europe, Africa, and Asia')).toBe(false);
    expect(glossSaysMean('healthy', 'Thinking clearly')).toBe(false);
    expect(glossSaysMean('healthy', 'Back in good health.')).toBe(true);
    expect(glossSaysMean('sea', 'The ocean west of the Americas')).toBe(true);
    expect(glossSaysMean('sea', 'A rounded roof')).toBe(false);
    expect(glossSaysMean('teach', 'Someone trained to heal the sick')).toBe(false);
    expect(glossSaysMean('teach', 'The power to do, or those who teach.')).toBe(true);
    expect(glossSaysMean('peace', 'To settle a quarrel')).toBe(false);
    expect(glossSaysMean('friend', 'Goodwill shared by nations')).toBe(false);
    expect(glossSaysMean('school', 'Someone deep in learning')).toBe(false);
    expect(glossSaysMean('brother', 'Of a brother, or like brothers.')).toBe(true);
  });

  it('speaks the new roots as sounds a kid can hear, not the raw card spelling', () => {
    expect(speakablePronunciation('DOM')).toBe('dom');
    expect(speakablePronunciation('FAM-il')).toBe('fam il');
    expect(speakablePronunciation('FRAY-tur')).toBe('fray tur');
    expect(speakablePronunciation('JOO-ven')).toBe('joo ven');
    expect(speakablePronunciation('AH-mee')).toBe('ah mee');
    expect(speakablePronunciation('PAK')).toBe('pack');
    expect(speakablePronunciation('DOK')).toBe('dock');
    expect(speakablePronunciation('SKOL')).toBe('skole');
    expect(speakablePronunciation('VY-uh')).toBe('vye uh');
    expect(speakablePronunciation('MEE-dee')).toBe('mee dee');
    expect(utteranceText('San', 'SAN')).toBe(
      `San. ${HEAR_BEAT_PAUSE} san. ${HEAR_BEAT_PAUSE} The letters S. A. N.`,
    );
    expect(yesUtteranceText('Dom', 'house')).toBe('Yes — Dom means house.');
  });

  it('lets a family find Viaduct on Via and Fraternity on Frater', () => {
    const bridge = buildIndexBrowseSections({ query: 'viaduct' });
    expect(indexMatchCount(bridge)).toBe(1);
    expect(bridge.some((section) => section.roots.some((root) => root.root === 'Via'))).toBe(true);

    const club = buildIndexBrowseSections({ query: 'fraternity' });
    expect(indexMatchCount(club)).toBe(1);
    expect(club.some((section) => section.roots.some((root) => root.root === 'Frater'))).toBe(
      true,
    );

    const sea = buildIndexBrowseSections({ query: 'mediterranean' });
    expect(indexMatchCount(sea)).toBe(1);
    expect(sea.some((section) => section.roots.some((root) => root.root === 'Medi'))).toBe(true);

    const house = buildIndexBrowseSections({ query: 'house' });
    expect(indexMatchCount(house)).toBe(1);
    expect(house.some((section) => section.roots.some((root) => root.root === 'Dom'))).toBe(true);
  });
});

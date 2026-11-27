import { describe, expect, it } from 'vitest';
import { glossSaysMean } from '../core/distractors';
import {
  INTRO_CONTINUE_LABEL,
  introContainsAnswer,
  rootAnswerLesson,
  rootIntroCopy,
  wordAnswerLesson,
  wordIntroCopy,
} from '../core/cardIntro';
import { quizGloss } from '../core/wordDef';
import { HEAR_BEAT_PAUSE, speakablePronunciation, utteranceText, yesUtteranceText } from '../core/speak';
import { buildIndexBrowseSections, indexMatchCount } from '../ui/deck/indexSearch';
import { ROOTS, isRootFree, rootId } from './roots';

/**
 * Hill & Shore — a free Starter set for homeschool land, water, and climb words.
 * Meanings follow the classical forms.
 * Vermont and Montana are states; the mountain sits after the dash.
 * Piedmont is rolling hills; the foot of the mountain sits after the dash.
 * A peninsula is land almost surrounded by water; the island sits after the dash.
 * Insulin helps the body use sugar; the cell islands sit after the dash.
 * Pennsylvania and Transylvania are places; the woods sit after the dash.
 * Glacial is extremely slow; the ice sits after the dash.
 * Gelato is ice cream; frozen sits after the dash.
 * A rival is someone you compete with; the shared brook sits after the dash.
 * Abundant is more than enough; the wave sits after the dash.
 * A plane is a flying machine; the flat surface sits after the dash.
 * A planisphere is a sky chart; the flat ball sits after the dash.
 * Ascend goes up; the climb sits after the dash.
 * Cumulus is a puffy mass; the heap sits after the dash.
 * Agronomy's agr- is the Greek twin of Latin ager. The card names both.
 */
const HILL_SHORE = [
  'Mont',
  'Insul',
  'Sylv',
  'Agr',
  'Glac',
  'Gel',
  'Cav',
  'Riv',
  'Und',
  'Plan',
  'Scend',
  'Cumul',
] as const;

const MEANINGS: Record<(typeof HILL_SHORE)[number], string> = {
  Mont: 'mountain',
  Insul: 'island',
  Sylv: 'woods',
  Agr: 'field',
  Glac: 'ice',
  Gel: 'freeze',
  Cav: 'hollow',
  Riv: 'brook',
  Und: 'wave',
  Plan: 'flat',
  Scend: 'climb',
  Cumul: 'heap',
};

const SCENES: Record<(typeof HILL_SHORE)[number], string> = {
  Mont: 'mountain',
  Insul: 'island',
  Sylv: 'woods',
  Agr: 'field',
  Glac: 'ice',
  Gel: 'freeze',
  Cav: 'hollow',
  Riv: 'brook',
  Und: 'ripple',
  Plan: 'flat',
  Scend: 'climb',
  Cumul: 'heap',
};

/** First clause the feedback says after the kid answers. */
const WORD_INTRO: Record<string, string> = {
  Vermont: 'Vermont means a state in New England.',
  Montana: 'Montana means a northern state named for its high ranges.',
  Piedmont: 'Piedmont means a region of rolling hills.',
  Peninsula: 'Peninsula means land almost surrounded by water.',
  Insulate: 'Insulate means to keep heat or sound from passing.',
  Insulin: 'Insulin means a hormone that helps the body use sugar.',
  Sylvan: 'Sylvan means shady, with a thick canopy.',
  Pennsylvania: 'Pennsylvania means a state in the eastern United States.',
  Transylvania: 'Transylvania means a region in Romania.',
  Agriculture: 'Agriculture means the work of growing crops for food.',
  Agrarian: 'Agrarian means about growing crops in the countryside.',
  Agronomy: 'Agronomy means the science of managing soil and crops.',
  Glacier: 'Glacier means a slow-moving mass of frozen water.',
  Glacial: 'Glacial means extremely slow.',
  Glaciology: 'Glaciology means the science of glaciers.',
  Gelato: 'Gelato means a soft Italian ice cream.',
  Gelatin: 'Gelatin means a jiggly food used in desserts.',
  Gel: 'Gel means a thick, jiggly substance.',
  Cave: 'Cave means a natural chamber inside a hill.',
  Cavity: 'Cavity means an opening that can form in a tooth.',
  Concave: 'Concave means curved inward like the inside of a bowl.',
  Rival: 'Rival means a person you compete with.',
  Rivulet: 'Rivulet means a tiny flow you can hop across.',
  Derive: 'Derive means to get one thing from another.',
  Undulate: 'Undulate means to rise and fall in smooth curves.',
  Inundate: 'Inundate means to overwhelm with too much at once.',
  Abundant: 'Abundant means more than enough.',
  Plane: 'Plane means a flying machine with wings.',
  Planar: 'Planar means lying in one even surface.',
  Planisphere: 'Planisphere means a chart of the sky you can turn.',
  Ascend: 'Ascend means to go up.',
  Descend: 'Descend means to go down.',
  Transcend: 'Transcend means to go past a boundary.',
  Cumulus: 'Cumulus means a puffy mass in the sky.',
  Accumulate: 'Accumulate means to gather more and more.',
  Cumulative: 'Cumulative means growing by being added together.',
};

describe('Hill & Shore starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve Starter roots after Nod and before Auto', () => {
    expect(HILL_SHORE).toHaveLength(12);
    const nod = ROOTS.findIndex((r) => r.root === 'Nod');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(nod).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(nod);
    let prev = nod;
    for (const name of HILL_SHORE) {
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
    expect(ROOTS.length).toBe(315);
  });

  it('keeps the classical origins and the shared piece names', () => {
    expect(by.Mont!.org).toBe('Latin mōns');
    expect(by.Insul!.org).toBe('Latin īnsula');
    expect(by.Sylv!.org).toBe('Latin silva');
    expect(by.Agr!.org).toBe('Latin ager · Greek agrós');
    expect(by.Glac!.org).toBe('Latin glaciēs');
    expect(by.Gel!.org).toBe('Latin gelāre');
    expect(by.Cav!.org).toBe('Latin cavus');
    expect(by.Riv!.org).toBe('Latin rīvus');
    expect(by.Und!.org).toBe('Latin unda');
    expect(by.Plan!.org).toBe('Latin plānus');
    expect(by.Scend!.org).toBe('Latin scandere');
    expect(by.Cumul!.org).toBe('Latin cumulus');

    expect(by.Mont!.words.find((w) => w.w === 'Piedmont')!.b).toBe('pied (foot) + mont (mountain)');
    expect(by.Ped!.words.find((w) => w.w === 'Pedal')!.b).toContain('ped (foot)');
    expect(by.Sylv!.words.find((w) => w.w === 'Transylvania')!.b).toBe('trans (across) + sylv (woods)');
    expect(by.Port!.words.find((w) => w.w === 'Transport')!.b).toContain('trans (across)');
    expect(by.Agr!.words.find((w) => w.w === 'Agronomy')!.b).toBe('agr (field) + -nomy (law)');
    expect(by.Astro!.words.find((w) => w.w === 'Astronomy')!.b).toContain('-nomy (law)');
    expect(by.Glac!.words.find((w) => w.w === 'Glaciology')!.b).toBe('glac (ice) + -logy (study of)');
    expect(by.Bio!.words.find((w) => w.w === 'Biology')!.b).toContain('-logy (study of)');
    expect(by.Cav!.words.find((w) => w.w === 'Concave')!.b).toBe('con (together) + cav (hollow)');
    expect(by.Struct!.words.find((w) => w.w === 'Construct')!.b).toContain('con (together)');
    expect(by.Und!.words.find((w) => w.w === 'Inundate')!.b).toBe('in (into) + und (wave)');
    expect(by.Struct!.words.find((w) => w.w === 'Instruct')!.b).toContain('in (into)');
    expect(by.Plan!.words.find((w) => w.w === 'Planisphere')!.b).toBe('plan (flat) + sphere (ball)');
    expect(by.Sphere!.words.find((w) => w.w === 'Atmosphere')!.b).toContain('sphere (ball)');
    expect(by.Cumul!.words.find((w) => w.w === 'Cumulus')!.b).toBe('cumul (heap)');
    expect(by.Nimb!.words.find((w) => w.w === 'Cumulonimbus')!.b).toBe('cumulo (heap) + nimb (cloud)');
    expect(by.Riv!.words.find((w) => w.w === 'Rivulet')!.b).toBe('riv (brook) + -ulet (little)');
    expect(by.Anti!.words.find((w) => w.w === 'Antifreeze')!.b).toBe('anti (against) + freeze');
    expect(by.Hipp!.words.find((w) => w.w === 'Hippocampus')!.b).toContain('camp (sea monster)');
  });

  it('tells the state, the hills, the shore, the places, the slow pace, the ice cream, the rival, the plenty, the machine, the chart, the climb, and the cloud honestly', () => {
    const green = by.Mont!.words.find((w) => w.w === 'Vermont')!;
    expect(quizGloss(green.d)).toBe('A state in New England');
    expect(green.d).toContain('mountain');
    expect(quizGloss(green.d)!.toLowerCase()).not.toContain('mountain');
    expect(quizGloss(green.d)!.toLowerCase()).not.toContain('green');

    const state = by.Mont!.words.find((w) => w.w === 'Montana')!;
    expect(quizGloss(state.d)).toBe('A northern state named for its high ranges');
    expect(state.d).toContain('mountain');
    expect(quizGloss(state.d)!.toLowerCase()).not.toContain('mountain');

    const hills = by.Mont!.words.find((w) => w.w === 'Piedmont')!;
    expect(quizGloss(hills.d)).toBe('A region of rolling hills');
    expect(hills.d).toContain('mountain');
    expect(quizGloss(hills.d)!.toLowerCase()).not.toContain('mountain');
    expect(quizGloss(hills.d)!.toLowerCase()).not.toContain('foot');

    const shore = by.Insul!.words.find((w) => w.w === 'Peninsula')!;
    expect(quizGloss(shore.d)).toBe('Land almost surrounded by water');
    expect(shore.d).toContain('island');
    expect(quizGloss(shore.d)!.toLowerCase()).not.toContain('island');

    const hormone = by.Insul!.words.find((w) => w.w === 'Insulin')!;
    expect(quizGloss(hormone.d)).toBe('A hormone that helps the body use sugar');
    expect(hormone.d).toContain('island');
    expect(quizGloss(hormone.d)!.toLowerCase()).not.toContain('island');

    const penn = by.Sylv!.words.find((w) => w.w === 'Pennsylvania')!;
    expect(quizGloss(penn.d)).toBe('A state in the eastern United States');
    expect(penn.d).toContain('woods');
    expect(quizGloss(penn.d)!.toLowerCase()).not.toContain('woods');

    const region = by.Sylv!.words.find((w) => w.w === 'Transylvania')!;
    expect(quizGloss(region.d)).toBe('A region in Romania');
    expect(region.d).toContain('woods');
    expect(quizGloss(region.d)!.toLowerCase()).not.toContain('woods');
    expect(quizGloss(region.d)!.toLowerCase()).not.toContain('across');

    const slow = by.Glac!.words.find((w) => w.w === 'Glacial')!;
    expect(quizGloss(slow.d)).toBe('Extremely slow');
    expect(slow.d).toContain('icy');
    expect(quizGloss(slow.d)!.toLowerCase()).not.toContain('ice');

    const cream = by.Gel!.words.find((w) => w.w === 'Gelato')!;
    expect(quizGloss(cream.d)).toBe('A soft Italian ice cream');
    expect(cream.d).toContain('frozen');
    expect(quizGloss(cream.d)!.toLowerCase()).not.toContain('freeze');
    expect(quizGloss(cream.d)!.toLowerCase()).not.toContain('frozen');

    const rival = by.Riv!.words.find((w) => w.w === 'Rival')!;
    expect(quizGloss(rival.d)).toBe('A person you compete with');
    expect(rival.d).toContain('brook');
    expect(quizGloss(rival.d)!.toLowerCase()).not.toContain('brook');

    const plenty = by.Und!.words.find((w) => w.w === 'Abundant')!;
    expect(quizGloss(plenty.d)).toBe('More than enough');
    expect(plenty.d).toContain('wave');
    expect(quizGloss(plenty.d)!.toLowerCase()).not.toContain('wave');

    const machine = by.Plan!.words.find((w) => w.w === 'Plane')!;
    expect(quizGloss(machine.d)).toBe('A flying machine with wings');
    expect(machine.d).toContain('flat');
    expect(quizGloss(machine.d)!.toLowerCase()).not.toContain('flat');

    const chart = by.Plan!.words.find((w) => w.w === 'Planisphere')!;
    expect(quizGloss(chart.d)).toBe('A chart of the sky you can turn');
    expect(chart.d).toContain('flat');
    expect(quizGloss(chart.d)!.toLowerCase()).not.toContain('flat');

    const up = by.Scend!.words.find((w) => w.w === 'Ascend')!;
    expect(quizGloss(up.d)).toBe('To go up');
    expect(up.d).toContain('climb');
    expect(quizGloss(up.d)!.toLowerCase()).not.toContain('climb');

    const cloud = by.Cumul!.words.find((w) => w.w === 'Cumulus')!;
    expect(quizGloss(cloud.d)).toBe('A puffy mass in the sky');
    expect(cloud.d).toContain('heap');
    expect(quizGloss(cloud.d)!.toLowerCase()).not.toContain('heap');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('mountain', 'A state in New England')).toBe(false);
    expect(glossSaysMean('green', 'A state in New England')).toBe(false);
    expect(glossSaysMean('true', 'A state in New England')).toBe(false);
    expect(glossSaysMean('mountain', 'A northern state named for its high ranges')).toBe(false);
    expect(glossSaysMean('mountain', 'A region of rolling hills')).toBe(false);
    expect(glossSaysMean('mountain', 'A mountain peak')).toBe(true);
    expect(glossSaysMean('peak', 'A northern state named for its high ranges')).toBe(false);
    expect(glossSaysMean('island', 'Land almost surrounded by water')).toBe(false);
    expect(glossSaysMean('island', 'To keep heat or sound from passing')).toBe(false);
    expect(glossSaysMean('island', 'A hormone that helps the body use sugar')).toBe(false);
    expect(glossSaysMean('island', 'An island')).toBe(true);
    expect(glossSaysMean('woods', 'Shady, with a thick canopy')).toBe(false);
    expect(glossSaysMean('woods', 'A state in the eastern United States')).toBe(false);
    expect(glossSaysMean('woods', 'A region in Romania')).toBe(false);
    expect(glossSaysMean('woods', 'Of the woods')).toBe(true);
    expect(glossSaysMean('forest', 'A state in the eastern United States')).toBe(false);
    expect(glossSaysMean('field', 'The work of growing crops for food')).toBe(false);
    expect(glossSaysMean('field', 'About growing crops in the countryside')).toBe(false);
    expect(glossSaysMean('field', 'The science of managing soil and crops')).toBe(false);
    expect(glossSaysMean('field', 'A field')).toBe(true);
    expect(glossSaysMean('ice', 'A slow-moving mass of frozen water')).toBe(false);
    expect(glossSaysMean('ice', 'Extremely slow')).toBe(false);
    expect(glossSaysMean('ice', 'The science of glaciers')).toBe(false);
    expect(glossSaysMean('ice', 'A soft Italian ice cream')).toBe(true);
    expect(glossSaysMean('ice', 'Made of ice')).toBe(true);
    expect(glossSaysMean('freeze', 'A soft Italian ice cream')).toBe(false);
    expect(glossSaysMean('freeze', 'A jiggly food used in desserts')).toBe(false);
    expect(glossSaysMean('freeze', 'A thick, jiggly substance')).toBe(false);
    expect(glossSaysMean('freeze', 'To freeze')).toBe(true);
    expect(glossSaysMean('hollow', 'A natural chamber inside a hill')).toBe(false);
    expect(glossSaysMean('hollow', 'An opening that can form in a tooth')).toBe(false);
    expect(glossSaysMean('hollow', 'Curved inward like the inside of a bowl')).toBe(false);
    expect(glossSaysMean('hollow', 'A hollow')).toBe(true);
    expect(glossSaysMean('brook', 'A person you compete with')).toBe(false);
    expect(glossSaysMean('brook', 'A tiny flow you can hop across')).toBe(false);
    expect(glossSaysMean('brook', 'To get one thing from another')).toBe(false);
    expect(glossSaysMean('brook', 'A brook')).toBe(true);
    expect(glossSaysMean('wave', 'To rise and fall in smooth curves')).toBe(false);
    expect(glossSaysMean('wave', 'To overwhelm with too much at once')).toBe(false);
    expect(glossSaysMean('wave', 'More than enough')).toBe(false);
    expect(glossSaysMean('wave', 'A wave')).toBe(true);
    expect(glossSaysMean('flat', 'A flying machine with wings')).toBe(false);
    expect(glossSaysMean('flat', 'Lying in one even surface')).toBe(false);
    expect(glossSaysMean('flat', 'A chart of the sky you can turn')).toBe(false);
    expect(glossSaysMean('flat', 'A flat surface')).toBe(true);
    expect(glossSaysMean('climb', 'To go up')).toBe(false);
    expect(glossSaysMean('climb', 'To go down')).toBe(false);
    expect(glossSaysMean('climb', 'To go past a boundary')).toBe(false);
    expect(glossSaysMean('climb', 'A climb')).toBe(true);
    expect(glossSaysMean('heap', 'A puffy mass in the sky')).toBe(false);
    expect(glossSaysMean('heap', 'To gather more and more')).toBe(false);
    expect(glossSaysMean('heap', 'Growing by being added together')).toBe(false);
    expect(glossSaysMean('heap', 'A heap')).toBe(true);
    expect(glossSaysMean('pile', 'A puffy mass in the sky')).toBe(false);
    expect(glossSaysMean('earth', 'Land almost surrounded by water')).toBe(true);
    expect(glossSaysMean('water', 'Land almost surrounded by water')).toBe(true);
    expect(glossSaysMean('stone', 'A tall rise of rock')).toBe(true);
    expect(glossSaysMean('above', 'A northern state named for its high ranges')).toBe(true);
    expect(glossSaysMean('make', 'The work of growing crops for food')).toBe(false);
    expect(glossSaysMean('speak', 'A person you compete with')).toBe(false);
    expect(glossSaysMean('build', 'A flying machine with wings')).toBe(false);
  });

  it('keeps the meaning off the intro and teaches it after the answer', () => {
    for (const name of HILL_SHORE) {
      const root = by[name]!;
      const lang = name === 'Agr' ? 'Latin and Greek' : 'Latin';
      const intro = rootIntroCopy(root);
      const introText = intro.lines.join(' ');
      expect(intro.continueLabel).toBe(INTRO_CONTINUE_LABEL);
      expect(introText).toContain(`is from ${lang}`);
      expect(introContainsAnswer(introText, root.mean), name).toBe(false);
      for (const word of root.words) {
        expect(introContainsAnswer(introText, word.w), word.w).toBe(false);
      }
      const lesson = rootAnswerLesson(root);
      expect(lesson).toContain(`${name} means ${root.mean}.`);
      expect(lesson).toContain(`It comes from ${lang}.`);
      for (const word of root.words) {
        const copy = wordIntroCopy({
          word: word.w,
          def: word.d,
          root: root.root,
          say: root.say,
          mean: root.mean,
          org: root.org,
        });
        const shown = copy.lines.join(' ');
        const gloss = WORD_INTRO[word.w]!.replace(/^.*?means /, '').replace(/\.$/, '');
        expect(copy.continueLabel, word.w).toBe('Show the questions');
        expect(shown, word.w).not.toContain('<');
        expect(introContainsAnswer(shown, gloss), word.w).toBe(false);
        expect(introContainsAnswer(shown, root.mean), word.w).toBe(false);
        expect(
          wordAnswerLesson({
            word: word.w,
            def: word.d,
            root: root.root,
            mean: root.mean,
            org: root.org,
          }),
          word.w,
        ).toBe(`${WORD_INTRO[word.w]} It comes from ${lang}, from ${root.root} — ${root.mean}.`);
      }
    }
  });

  it('speaks the new roots as sounds a kid can hear, not the raw card spelling', () => {
    expect(speakablePronunciation('MONT')).toBe('mont');
    expect(speakablePronunciation('IN-sul')).toBe('in sul');
    expect(speakablePronunciation('SILV')).toBe('silv');
    expect(speakablePronunciation('AG-ri')).toBe('agg ri');
    expect(speakablePronunciation('GLAYS')).toBe('glays');
    expect(speakablePronunciation('GEL')).toBe('gel');
    expect(speakablePronunciation('KAYV')).toBe('kayv');
    expect(speakablePronunciation('RIV')).toBe('riv');
    expect(speakablePronunciation('UND')).toBe('und');
    expect(speakablePronunciation('PLAN')).toBe('plan');
    expect(speakablePronunciation('SEND')).toBe('send');
    expect(speakablePronunciation('CUE-mul')).toBe('cue mul');
    expect(utteranceText('Mont', 'MONT')).toBe(
      `Mont. ${HEAR_BEAT_PAUSE} mont. ${HEAR_BEAT_PAUSE} The letters M. O. N. T.`,
    );
    expect(yesUtteranceText('Plan', 'flat')).toBe('Yes — Plan means flat.');
  });

  it('lets a family find Gelato on Gel and Montana on Mont', () => {
    const cream = buildIndexBrowseSections({ query: 'gelato' });
    expect(indexMatchCount(cream)).toBe(1);
    expect(cream.some((section) => section.roots.some((root) => root.root === 'Gel'))).toBe(true);

    const state = buildIndexBrowseSections({ query: 'montana' });
    expect(indexMatchCount(state)).toBe(1);
    expect(state.some((section) => section.roots.some((root) => root.root === 'Mont'))).toBe(true);

    const shore = buildIndexBrowseSections({ query: 'peninsula' });
    expect(indexMatchCount(shore)).toBe(1);
    expect(shore.some((section) => section.roots.some((root) => root.root === 'Insul'))).toBe(true);

    const penn = buildIndexBrowseSections({ query: 'pennsylvania' });
    expect(indexMatchCount(penn)).toBe(1);
    expect(penn.some((section) => section.roots.some((root) => root.root === 'Sylv'))).toBe(true);

    const crops = buildIndexBrowseSections({ query: 'agriculture' });
    expect(indexMatchCount(crops)).toBe(1);
    expect(crops.some((section) => section.roots.some((root) => root.root === 'Agr'))).toBe(true);

    const glacier = buildIndexBrowseSections({ query: 'glacier' });
    expect(indexMatchCount(glacier)).toBe(1);
    expect(glacier.some((section) => section.roots.some((root) => root.root === 'Glac'))).toBe(true);

    const rival = buildIndexBrowseSections({ query: 'rival' });
    expect(indexMatchCount(rival)).toBe(1);
    expect(rival.some((section) => section.roots.some((root) => root.root === 'Riv'))).toBe(true);

    const plenty = buildIndexBrowseSections({ query: 'abundant' });
    expect(indexMatchCount(plenty)).toBe(1);
    expect(plenty.some((section) => section.roots.some((root) => root.root === 'Und'))).toBe(true);

    const machine = buildIndexBrowseSections({ query: 'plane' });
    expect(indexMatchCount(machine)).toBe(1);
    expect(machine.some((section) => section.roots.some((root) => root.root === 'Plan'))).toBe(true);

    const up = buildIndexBrowseSections({ query: 'ascend' });
    expect(indexMatchCount(up)).toBe(1);
    expect(up.some((section) => section.roots.some((root) => root.root === 'Scend'))).toBe(true);

    const cloud = buildIndexBrowseSections({ query: 'cumulus' });
    expect(indexMatchCount(cloud)).toBe(1);
    expect(cloud.some((section) => section.roots.some((root) => root.root === 'Cumul'))).toBe(true);

    const mountain = buildIndexBrowseSections({ query: 'mountain' });
    expect(indexMatchCount(mountain)).toBe(1);
    expect(mountain.some((section) => section.roots.some((root) => root.root === 'Mont'))).toBe(true);

    const island = buildIndexBrowseSections({ query: 'island' });
    expect(indexMatchCount(island)).toBe(1);
    expect(island.some((section) => section.roots.some((root) => root.root === 'Insul'))).toBe(true);

    const field = buildIndexBrowseSections({ query: 'field' });
    expect(indexMatchCount(field)).toBe(1);
    expect(field.some((section) => section.roots.some((root) => root.root === 'Agr'))).toBe(true);

    const woods = buildIndexBrowseSections({ query: 'woods' });
    expect(indexMatchCount(woods)).toBe(1);
    expect(woods.some((section) => section.roots.some((root) => root.root === 'Sylv'))).toBe(true);

    const brook = buildIndexBrowseSections({ query: 'brook' });
    expect(indexMatchCount(brook)).toBe(1);
    expect(brook.some((section) => section.roots.some((root) => root.root === 'Riv'))).toBe(true);

    const wave = buildIndexBrowseSections({ query: 'wave' });
    expect(indexMatchCount(wave)).toBe(1);
    expect(wave.some((section) => section.roots.some((root) => root.root === 'Und'))).toBe(true);

    const flat = buildIndexBrowseSections({ query: 'flat' });
    expect(indexMatchCount(flat)).toBe(1);
    expect(flat.some((section) => section.roots.some((root) => root.root === 'Plan'))).toBe(true);

    const climb = buildIndexBrowseSections({ query: 'climb' });
    expect(indexMatchCount(climb)).toBe(1);
    expect(climb.some((section) => section.roots.some((root) => root.root === 'Scend'))).toBe(true);

    const heap = buildIndexBrowseSections({ query: 'heap' });
    expect(indexMatchCount(heap)).toBe(1);
    expect(heap.some((section) => section.roots.some((root) => root.root === 'Cumul'))).toBe(true);

    const frost = buildIndexBrowseSections({ query: 'frost' });
    expect(indexMatchCount(frost)).toBe(1);
    expect(frost.some((section) => section.roots.some((root) => root.root === 'Gel'))).toBe(true);
  });
});

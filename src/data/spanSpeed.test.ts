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
 * Span & Speed — a locked Starter set for how things grow, stretch, and last.
 * Meanings follow the classical forms.
 * Augment is adding on; the growing sits after the dash.
 * Longitude is east or west; the length sits after the dash.
 * Abbreviate is clipping a spelling; the short form sits after the dash.
 * Accelerate is going faster; the swiftness sits after the dash.
 * Tardy is arriving after the bell; the slowness sits after the dash.
 * Aggravate is making a problem worse; the weight sits after the dash.
 * A journal is a notebook; the day sits after the dash.
 * Durable is staying useful; the lasting sits after the dash.
 * A terminal is a station; the border sits after the dash.
 * Replenish is stocking up; the fullness sits after the dash.
 * Mature is ready; the ripeness sits after the dash.
 * A meridian is a map line; the noon sits after the dash.
 * Long means length, so the root name is not the answer.
 * Termin means border — Fin already owns boundary, limit, and end.
 * Merid means noon, so a search for day stays on Journ.
 * Immature leaves im bare — the catalog's im means "in".
 * Auction keeps the auct stem, the same way Curr keeps curs.
 */
const SPAN_SPEED = [
  'Aug',
  'Long',
  'Brev',
  'Celer',
  'Tard',
  'Grav',
  'Journ',
  'Dur',
  'Termin',
  'Plen',
  'Matur',
  'Merid',
] as const;

const MEANINGS: Record<(typeof SPAN_SPEED)[number], string> = {
  Aug: 'grow',
  Long: 'length',
  Brev: 'short',
  Celer: 'swift',
  Tard: 'slow',
  Grav: 'heavy',
  Journ: 'day',
  Dur: 'lasting',
  Termin: 'border',
  Plen: 'full',
  Matur: 'ripe',
  Merid: 'noon',
};

const SCENES: Record<(typeof SPAN_SPEED)[number], string> = {
  Aug: 'grow',
  Long: 'length',
  Brev: 'short',
  Celer: 'swift',
  Tard: 'slow',
  Grav: 'heavy',
  Journ: 'day',
  Dur: 'lasting',
  Termin: 'border',
  Plen: 'full',
  Matur: 'ripe',
  Merid: 'noon',
};

/** First clause the feedback says after the kid answers. */
const WORD_INTRO: Record<string, string> = {
  Augment: 'Augment means to add on so there is more.',
  Augmentation: 'Augmentation means something added so there is more.',
  Auction: 'Auction means a sale where people offer bids.',
  Elongate: 'Elongate means to stretch something out.',
  Longitude: 'Longitude means where a place sits east or west.',
  Prolong: 'Prolong means to keep something going past the planned stop.',
  Abbreviate: 'Abbreviate means to clip a spelling so it takes less room.',
  Abbreviation: 'Abbreviation means a clipped spelling, like Dr. for a doctor.',
  Brevity: 'Brevity means a remark with nothing extra.',
  Accelerate: 'Accelerate means to go faster.',
  Decelerate: 'Decelerate means to go slower.',
  Celerity: 'Celerity means a quick pace.',
  Tardy: 'Tardy means arriving after the bell.',
  Tardigrade: 'Tardigrade means a creature famous for toughing out almost anything.',
  Tardiness: 'Tardiness means showing up after you were expected.',
  Aggravate: 'Aggravate means to make a problem worse.',
  Aggravation: 'Aggravation means a problem that has gotten worse.',
  Grievous: 'Grievous means very serious harm.',
  Journal: 'Journal means a notebook of what you did.',
  Journey: 'Journey means a trip from here to there.',
  Adjourn: 'Adjourn means to pause a meeting until later.',
  Durable: 'Durable means able to stay useful through hard use.',
  Endure: 'Endure means to keep going through a hard stretch.',
  Duration: 'Duration means the span of an event.',
  Terminal: 'Terminal means a station where a trip stops.',
  Determine: 'Determine means to settle a question.',
  Terminus: 'Terminus means the last stop on a line.',
  Replenish: 'Replenish means to stock something up once more.',
  Plentiful: 'Plentiful means more than enough of something.',
  Plenary: 'Plenary means a meeting of the whole group.',
  Mature: 'Mature means ready in a finished way.',
  Immature: 'Immature means not ready yet.',
  Premature: 'Premature means happening too soon.',
  Meridian: 'Meridian means a north-south line on a map.',
  Antemeridian: 'Antemeridian means the a.m. part of a date.',
  Meridiem: 'Meridiem means the mark inside a.m. and p.m.',
};

describe('Span & Speed starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve locked Starter roots after Clin and before Auto', () => {
    expect(SPAN_SPEED).toHaveLength(12);
    const clin = ROOTS.findIndex((r) => r.root === 'Clin');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(clin).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(clin);
    let prev = clin;
    for (const name of SPAN_SPEED) {
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
    expect(by.Aug!.org).toBe('Latin augēre');
    expect(by.Long!.org).toBe('Latin longus');
    expect(by.Brev!.org).toBe('Latin brevis');
    expect(by.Celer!.org).toBe('Latin celer');
    expect(by.Tard!.org).toBe('Latin tardus');
    expect(by.Grav!.org).toBe('Latin gravis');
    expect(by.Journ!.org).toBe('Latin diurnus');
    expect(by.Dur!.org).toBe('Latin dūrāre');
    expect(by.Termin!.org).toBe('Latin terminus');
    expect(by.Plen!.org).toBe('Latin plēnus');
    expect(by.Matur!.org).toBe('Latin matūrus');
    expect(by.Merid!.org).toBe('Latin merīdiēs');

    expect(by.Long!.words.find((w) => w.w === 'Elongate')!.b).toBe('e (out) + long (length)');
    expect(by.Rupt!.words.find((w) => w.w === 'Erupt')!.b).toContain('e (out)');
    expect(by.Long!.words.find((w) => w.w === 'Prolong')!.b).toBe('pro (forward) + long (length)');
    expect(by.Duc!.words.find((w) => w.w === 'Produce')!.b).toContain('pro (forward)');
    expect(by.Plen!.words.find((w) => w.w === 'Replenish')!.b).toBe('re (again) + plen (full)');
    expect(by.Re!.words.find((w) => w.w === 'Replay')!.b).toContain('re (again)');
    expect(by.Matur!.words.find((w) => w.w === 'Premature')!.b).toBe('pre (before) + matur (ripe)');
    expect(by.Dict!.words.find((w) => w.w === 'Predict')!.b).toContain('pre (before)');
    expect(by.Dur!.words.find((w) => w.w === 'Endure')!.b).toBe('en (in) + dur (lasting)');
    expect(by.Cephal!.words.find((w) => w.w === 'Encephalitis')!.b).toContain('en (in)');
    expect(by.Tard!.words.find((w) => w.w === 'Tardigrade')!.b).toBe('tard (slow) + grad (step)');
    expect(by.Gress!.words.find((w) => w.w === 'Gradual')!.b).toContain('grad (step)');
    expect(by.Journ!.words.find((w) => w.w === 'Adjourn')!.b).toBe('ad (toward) + journ (day)');
    expect(by.Tract!.words.find((w) => w.w === 'Attract')!.b).toContain('at (toward)');
    expect(by.Matur!.words.find((w) => w.w === 'Immature')!.b).toBe('im + matur (ripe)');
    expect(by.Puls!.words.find((w) => w.w === 'Impulse')!.b).toContain('im (in)');
    expect(by.Celer!.words.find((w) => w.w === 'Accelerate')!.b).toBe('ac + celer (swift)');
    expect(by.Cumul!.words.find((w) => w.w === 'Accumulate')!.b).toContain('ac +');
    expect(by.Grav!.words.find((w) => w.w === 'Aggravate')!.b).toBe('ag + grav (heavy)');
    expect(by.Termin!.words.find((w) => w.w === 'Determine')!.b).toBe('de + termin (border)');
    expect(by.Celer!.words.find((w) => w.w === 'Decelerate')!.b).toBe('de + celer (swift)');
    expect(by.Flect!.words.find((w) => w.w === 'Deflect')!.b).toContain('de +');
    expect(by.Brev!.words.find((w) => w.w === 'Abbreviate')!.b).toBe('ab + brev (short)');
    expect(by.Und!.words.find((w) => w.w === 'Abundant')!.b).toContain('ab +');
    expect(by.Aug!.words.find((w) => w.w === 'Auction')!.b).toBe('auct (grow)');
  });

  it('keeps the everyday clause in the quiz and the root meaning after the dash', () => {
    const added = by.Aug!.words.find((w) => w.w === 'Augment')!;
    expect(quizGloss(added.d)).toBe('To add on so there is more');
    expect(added.d).toContain('grow');
    expect(quizGloss(added.d)!.toLowerCase()).not.toContain('grow');

    const east = by.Long!.words.find((w) => w.w === 'Longitude')!;
    expect(quizGloss(east.d)).toBe('Where a place sits east or west');
    expect(east.d).toContain('length');
    expect(quizGloss(east.d)!.toLowerCase()).not.toContain('length');

    const clip = by.Brev!.words.find((w) => w.w === 'Abbreviate')!;
    expect(quizGloss(clip.d)).toBe('To clip a spelling so it takes less room');
    expect(clip.d).toContain('short');
    expect(quizGloss(clip.d)!.toLowerCase()).not.toContain('short');

    const faster = by.Celer!.words.find((w) => w.w === 'Accelerate')!;
    expect(quizGloss(faster.d)).toBe('To go faster');
    expect(faster.d).toContain('swift');
    expect(quizGloss(faster.d)!.toLowerCase()).not.toContain('swift');

    const late = by.Tard!.words.find((w) => w.w === 'Tardy')!;
    expect(quizGloss(late.d)).toBe('Arriving after the bell');
    expect(late.d).toContain('slow');
    expect(quizGloss(late.d)!.toLowerCase()).not.toContain('slow');

    const worse = by.Grav!.words.find((w) => w.w === 'Aggravate')!;
    expect(quizGloss(worse.d)).toBe('To make a problem worse');
    expect(worse.d).toContain('heavy');
    expect(quizGloss(worse.d)!.toLowerCase()).not.toContain('heavy');

    const notebook = by.Journ!.words.find((w) => w.w === 'Journal')!;
    expect(quizGloss(notebook.d)).toBe('A notebook of what you did');
    expect(notebook.d).toContain('day');
    expect(quizGloss(notebook.d)!.toLowerCase()).not.toContain('day');

    const useful = by.Dur!.words.find((w) => w.w === 'Durable')!;
    expect(quizGloss(useful.d)).toBe('Able to stay useful through hard use');
    expect(useful.d).toContain('lasting');
    expect(quizGloss(useful.d)!.toLowerCase()).not.toContain('lasting');

    const station = by.Termin!.words.find((w) => w.w === 'Terminal')!;
    expect(quizGloss(station.d)).toBe('A station where a trip stops');
    expect(station.d).toContain('border');
    expect(quizGloss(station.d)!.toLowerCase()).not.toContain('border');

    const stock = by.Plen!.words.find((w) => w.w === 'Replenish')!;
    expect(quizGloss(stock.d)).toBe('To stock something up once more');
    expect(stock.d).toContain('full');
    expect(quizGloss(stock.d)!.toLowerCase()).not.toContain('full');

    const ready = by.Matur!.words.find((w) => w.w === 'Mature')!;
    expect(quizGloss(ready.d)).toBe('Ready in a finished way');
    expect(ready.d).toContain('ripe');
    expect(quizGloss(ready.d)!.toLowerCase()).not.toContain('ripe');

    const line = by.Merid!.words.find((w) => w.w === 'Meridian')!;
    expect(quizGloss(line.d)).toBe('A north-south line on a map');
    expect(line.d).toContain('noon');
    expect(quizGloss(line.d)!.toLowerCase()).not.toContain('noon');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('grow', 'To add on so there is more')).toBe(false);
    expect(glossSaysMean('grow', 'Something added so there is more')).toBe(false);
    expect(glossSaysMean('grow', 'A sale where people offer bids')).toBe(false);
    expect(glossSaysMean('grow', 'A growing')).toBe(true);
    expect(glossSaysMean('length', 'To stretch something out')).toBe(false);
    expect(glossSaysMean('length', 'Where a place sits east or west')).toBe(false);
    expect(glossSaysMean('length', 'To keep something going past the planned stop')).toBe(false);
    expect(glossSaysMean('length', 'A length')).toBe(true);
    expect(glossSaysMean('short', 'To clip a spelling so it takes less room')).toBe(false);
    expect(glossSaysMean('short', 'A clipped spelling, like Dr. for a doctor')).toBe(false);
    expect(glossSaysMean('short', 'A remark with nothing extra')).toBe(false);
    expect(glossSaysMean('short', 'A short form')).toBe(true);
    expect(glossSaysMean('swift', 'To go faster')).toBe(false);
    expect(glossSaysMean('swift', 'To go slower')).toBe(false);
    expect(glossSaysMean('swift', 'A quick pace')).toBe(false);
    expect(glossSaysMean('swift', 'A swiftness')).toBe(true);
    expect(glossSaysMean('slow', 'Arriving after the bell')).toBe(false);
    expect(glossSaysMean('slow', 'A creature famous for toughing out almost anything')).toBe(false);
    expect(glossSaysMean('slow', 'Showing up after you were expected')).toBe(false);
    expect(glossSaysMean('slow', 'To go slower')).toBe(true);
    expect(glossSaysMean('heavy', 'To make a problem worse')).toBe(false);
    expect(glossSaysMean('heavy', 'A problem that has gotten worse')).toBe(false);
    expect(glossSaysMean('heavy', 'Very serious harm')).toBe(false);
    expect(glossSaysMean('heavy', 'A heavy load')).toBe(true);
    expect(glossSaysMean('day', 'A notebook of what you did')).toBe(false);
    expect(glossSaysMean('day', 'A trip from here to there')).toBe(false);
    expect(glossSaysMean('day', 'To pause a meeting until later')).toBe(false);
    expect(glossSaysMean('day', 'A day')).toBe(true);
    expect(glossSaysMean('lasting', 'Able to stay useful through hard use')).toBe(false);
    expect(glossSaysMean('lasting', 'To keep going through a hard stretch')).toBe(false);
    expect(glossSaysMean('lasting', 'The span of an event')).toBe(false);
    expect(glossSaysMean('lasting', 'The last stop')).toBe(false);
    expect(glossSaysMean('lasting', 'A lasting')).toBe(true);
    expect(glossSaysMean('border', 'A station where a trip stops')).toBe(false);
    expect(glossSaysMean('border', 'To settle a question')).toBe(false);
    expect(glossSaysMean('border', 'The last stop on a line')).toBe(false);
    expect(glossSaysMean('border', 'A border')).toBe(true);
    expect(glossSaysMean('full', 'To stock something up once more')).toBe(false);
    expect(glossSaysMean('full', 'More than enough of something')).toBe(false);
    expect(glossSaysMean('full', 'A meeting of the whole group')).toBe(false);
    expect(glossSaysMean('full', 'A full cup')).toBe(true);
    expect(glossSaysMean('ripe', 'Ready in a finished way')).toBe(false);
    expect(glossSaysMean('ripe', 'Not ready yet')).toBe(false);
    expect(glossSaysMean('ripe', 'Happening too soon')).toBe(false);
    expect(glossSaysMean('ripe', 'A ripe peach')).toBe(true);
    expect(glossSaysMean('noon', 'A north-south line on a map')).toBe(false);
    expect(glossSaysMean('noon', 'The a.m. part of a date')).toBe(false);
    expect(glossSaysMean('noon', 'The mark inside a.m. and p.m.')).toBe(false);
    expect(glossSaysMean('noon', 'At noon')).toBe(true);
  });

  it('keeps the meaning off the intro and teaches it after the answer', () => {
    for (const name of SPAN_SPEED) {
      const root = by[name]!;
      const intro = rootIntroCopy(root);
      const introText = intro.lines.join(' ');
      expect(intro.continueLabel).toBe(INTRO_CONTINUE_LABEL);
      expect(introText).toContain('is from Latin');
      expect(introContainsAnswer(introText, root.mean), name).toBe(false);
      expect(introText, name).toContain(name);
      for (const word of root.words) {
        expect(introContainsAnswer(introText, word.w), word.w).toBe(false);
      }
      const lesson = rootAnswerLesson(root);
      expect(lesson).toContain(`${name} means ${root.mean}.`);
      expect(lesson).toContain('It comes from Latin.');
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
        ).toBe(`${WORD_INTRO[word.w]} It comes from Latin, from ${root.root} — ${root.mean}.`);
      }
    }
  });

  it('speaks the new roots as sounds a kid can hear, not the raw card spelling', () => {
    expect(speakablePronunciation('AUG')).toBe('awg');
    expect(speakablePronunciation('LONG')).toBe('long');
    expect(speakablePronunciation('BREV')).toBe('brev');
    expect(speakablePronunciation('SEL-er')).toBe('sel er');
    expect(speakablePronunciation('TARD')).toBe('tard');
    expect(speakablePronunciation('GRAV')).toBe('grav');
    expect(speakablePronunciation('JERN')).toBe('jern');
    expect(speakablePronunciation('DYOOR')).toBe('dyoor');
    expect(speakablePronunciation('TUR-min')).toBe('tur min');
    expect(speakablePronunciation('PLEN')).toBe('plen');
    expect(speakablePronunciation('muh-TUR')).toBe('muh tur');
    expect(speakablePronunciation('MER-id')).toBe('mer id');
    expect(utteranceText('Journ', 'JERN')).toBe(
      `Journ. ${HEAR_BEAT_PAUSE} jern. ${HEAR_BEAT_PAUSE} The letters J. O. U. R. N.`,
    );
    expect(utteranceText('Aug', 'AUG')).toBe(
      `Aug. ${HEAR_BEAT_PAUSE} awg. ${HEAR_BEAT_PAUSE} The letters A. U. G.`,
    );
    expect(yesUtteranceText('Long', 'length')).toBe('Yes — Long means length.');
  });

  it('lets a family find the new school words and the new meanings', () => {
    const hits: Array<[string, string]> = [
      ['augment', 'Aug'],
      ['augmentation', 'Aug'],
      ['auction', 'Aug'],
      ['elongate', 'Long'],
      ['longitude', 'Long'],
      ['prolong', 'Long'],
      ['abbreviate', 'Brev'],
      ['abbreviation', 'Brev'],
      ['brevity', 'Brev'],
      ['accelerate', 'Celer'],
      ['decelerate', 'Celer'],
      ['celerity', 'Celer'],
      ['tardy', 'Tard'],
      ['tardigrade', 'Tard'],
      ['tardiness', 'Tard'],
      ['aggravate', 'Grav'],
      ['aggravation', 'Grav'],
      ['grievous', 'Grav'],
      ['journal', 'Journ'],
      ['journey', 'Journ'],
      ['adjourn', 'Journ'],
      ['durable', 'Dur'],
      ['endure', 'Dur'],
      ['duration', 'Dur'],
      ['terminal', 'Termin'],
      ['determine', 'Termin'],
      ['terminus', 'Termin'],
      ['replenish', 'Plen'],
      ['plentiful', 'Plen'],
      ['plenary', 'Plen'],
      ['mature', 'Matur'],
      ['immature', 'Matur'],
      ['premature', 'Matur'],
      ['meridian', 'Merid'],
      ['antemeridian', 'Merid'],
      ['meridiem', 'Merid'],
      ['grow', 'Aug'],
      ['length', 'Long'],
      ['short', 'Brev'],
      ['swift', 'Celer'],
      ['slow', 'Tard'],
      ['heavy', 'Grav'],
      ['day', 'Journ'],
      ['lasting', 'Dur'],
      ['border', 'Termin'],
      ['full', 'Plen'],
      ['ripe', 'Matur'],
      ['noon', 'Merid'],
      ['growth', 'Aug'],
      ['lengthy', 'Long'],
      ['brief', 'Brev'],
      ['quick', 'Celer'],
      ['sluggish', 'Tard'],
      ['burden', 'Grav'],
      ['daily', 'Journ'],
      ['enduring', 'Dur'],
      ['edge', 'Termin'],
      ['plenty', 'Plen'],
      ['ripeness', 'Matur'],
    ];
    for (const [query, name] of hits) {
      const sections = buildIndexBrowseSections({ query });
      expect(indexMatchCount(sections), query).toBe(1);
      expect(sections.some((section) => section.roots.some((root) => root.root === name)), query).toBe(
        true,
      );
    }
  });
});

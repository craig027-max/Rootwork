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
 * Thread & Fold — a free Starter set for homeschool cloth, needle, and fold words.
 * Meanings follow the classical forms.
 * A linnet is a bird; the flax seed sits after the dash.
 * Invest is money set to grow; the clothing sits after the dash.
 * Context is the setting around a sentence; woven together sits after the dash.
 * Succinct is brief; the belt sits after the dash.
 * A detective solves a crime; the uncovering sits after the dash.
 * Punctual is arriving when expected; the point sits after the dash.
 */
const THREAD_FOLD = [
  'Tex',
  'Fil',
  'Lin',
  'Vest',
  'Plic',
  'Cinct',
  'Strict',
  'Tect',
  'Punct',
  'Acu',
  'Lig',
  'Nod',
] as const;

const MEANINGS: Record<(typeof THREAD_FOLD)[number], string> = {
  Tex: 'weave',
  Fil: 'thread',
  Lin: 'flax',
  Vest: 'clothing',
  Plic: 'fold',
  Cinct: 'belt',
  Strict: 'tight',
  Tect: 'cover',
  Punct: 'point',
  Acu: 'needle',
  Lig: 'tie',
  Nod: 'knot',
};

const SCENES: Record<(typeof THREAD_FOLD)[number], string> = {
  Tex: 'weave',
  Fil: 'thread',
  Lin: 'flax',
  Vest: 'clothing',
  Plic: 'fold',
  Cinct: 'belt',
  Strict: 'tight',
  Tect: 'cover',
  Punct: 'point',
  Acu: 'needle',
  Lig: 'tie',
  Nod: 'knot',
};

/** First clause the feedback says after the kid answers. */
const WORD_INTRO: Record<string, string> = {
  Textile: 'Textile means a cloth made on a loom.',
  Texture: 'Texture means how a surface feels.',
  Context: 'Context means the setting around a sentence.',
  Filament: 'Filament means a very thin strand.',
  Filigree: 'Filigree means delicate metal curls.',
  Profile: 'Profile means a side outline.',
  Linen: 'Linen means cloth for sheets and shirts.',
  Linseed: 'Linseed means a small brown seed that is pressed.',
  Linnet: 'Linnet means a small brown bird.',
  Vest: 'Vest means a sleeveless garment.',
  Vestment: 'Vestment means a robe worn for a ceremony.',
  Invest: 'Invest means money committed so it can grow.',
  Explicit: 'Explicit means stated in a clear, open way.',
  Implicit: 'Implicit means meant but not stated outright.',
  Complicate: 'Complicate means to make something harder to sort out.',
  Cincture: 'Cincture means a cord worn at the waist.',
  Precinct: 'Precinct means a district with a set boundary.',
  Succinct: 'Succinct means brief, with nothing extra.',
  Strict: 'Strict means firm, and not willing to bend.',
  Restrict: 'Restrict means to keep someone inside a boundary.',
  Constrict: 'Constrict means to squeeze so a space gets narrower.',
  Protect: 'Protect means to keep someone safe.',
  Detect: 'Detect means to notice something hidden.',
  Detective: 'Detective means someone paid to solve a crime.',
  Puncture: 'Puncture means a hole made by something sharp.',
  Punctual: 'Punctual means arriving when expected.',
  Punctuation: 'Punctuation means the dots and curves that divide a sentence.',
  Acute: 'Acute means sharp and sudden, as a pain.',
  Acumen: 'Acumen means quick, sharp thinking.',
  Acupuncture: 'Acupuncture means a treatment that uses thin needles in the skin.',
  Ligament: 'Ligament means a tough band between bones.',
  Ligature: 'Ligature means two letters printed as one.',
  Oblige: 'Oblige means to make someone feel they must.',
  Node: 'Node means a spot where lines meet.',
  Nodule: 'Nodule means a rounded lump.',
  Nodal: 'Nodal means related to a spot where lines meet.',
};

describe('Thread & Fold starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve Starter roots after Bib and before Auto', () => {
    expect(THREAD_FOLD).toHaveLength(12);
    const bib = ROOTS.findIndex((r) => r.root === 'Bib');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(bib).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(bib);
    let prev = bib;
    for (const name of THREAD_FOLD) {
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
    expect(ROOTS.length).toBe(279);
  });

  it('keeps the classical origins and the shared piece names', () => {
    expect(by.Tex!.org).toBe('Latin texere');
    expect(by.Fil!.org).toBe('Latin fīlum');
    expect(by.Lin!.org).toBe('Latin līnum');
    expect(by.Vest!.org).toBe('Latin vestis');
    expect(by.Plic!.org).toBe('Latin plicāre');
    expect(by.Cinct!.org).toBe('Latin cingere');
    expect(by.Strict!.org).toBe('Latin stringere');
    expect(by.Tect!.org).toBe('Latin tegere');
    expect(by.Punct!.org).toBe('Latin punctum');
    expect(by.Acu!.org).toBe('Latin acus');
    expect(by.Lig!.org).toBe('Latin ligāre');
    expect(by.Nod!.org).toBe('Latin nōdus');

    expect(by.Lin!.words.find((w) => w.w === 'Linen')!.b).toBe('lin (flax)');
    expect(by.Ole!.words.find((w) => w.w === 'Linoleum')!.b).toContain('lin (flax)');
    expect(by.Tex!.words.find((w) => w.w === 'Context')!.b).toBe('con (together) + tex (weave)');
    expect(by.Struct!.words.find((w) => w.w === 'Construct')!.b).toContain('con (together)');
    expect(by.Fil!.words.find((w) => w.w === 'Profile')!.b).toBe('pro (forward) + fil (thread)');
    expect(by.Duc!.words.find((w) => w.w === 'Produce')!.b).toContain('pro (forward)');
    expect(by.Plic!.words.find((w) => w.w === 'Explicit')!.b).toBe('ex (out) + plic (fold)');
    expect(by.Tract!.words.find((w) => w.w === 'Extract')!.b).toContain('ex (out)');
    expect(by.Plic!.words.find((w) => w.w === 'Implicit')!.b).toBe('im (in) + plic (fold)');
    expect(by.Port!.words.find((w) => w.w === 'Import')!.b).toContain('im (in)');
    expect(by.Plic!.words.find((w) => w.w === 'Complicate')!.b).toBe('com (together) + plic (fold)');
    expect(by.Pos!.words.find((w) => w.w === 'Compose')!.b).toContain('com (together)');
    expect(by.Vest!.words.find((w) => w.w === 'Invest')!.b).toBe('in (into) + vest (clothing)');
    expect(by.Struct!.words.find((w) => w.w === 'Instruct')!.b).toContain('in (into)');
    expect(by.Cinct!.words.find((w) => w.w === 'Precinct')!.b).toBe('pre (before) + cinct (belt)');
    expect(by.Dict!.words.find((w) => w.w === 'Predict')!.b).toContain('pre (before)');
    expect(by.Strict!.words.find((w) => w.w === 'Restrict')!.b).toBe('re (back) + strict (tight)');
    expect(by.Ject!.words.find((w) => w.w === 'Reject')!.b).toContain('re (back)');
    expect(by.Tect!.words.find((w) => w.w === 'Detect')!.b).toBe('de (remove) + tect (cover)');
    expect(by.Hydro!.words.find((w) => w.w === 'Dehydrate')!.b).toContain('de (remove)');
    expect(by.Acu!.words.find((w) => w.w === 'Acupuncture')!.b).toBe('acu (needle) + punct (point)');
    expect(by.Punct!.words.find((w) => w.w === 'Puncture')!.b).toContain('punct (point)');
  });

  it('tells the bird, the money, the sentence, the brief speech, the crime, and the arrival honestly', () => {
    const bird = by.Lin!.words.find((w) => w.w === 'Linnet')!;
    expect(quizGloss(bird.d)).toBe('A small brown bird');
    expect(bird.d).toContain('flax');
    expect(quizGloss(bird.d)!.toLowerCase()).not.toContain('flax');

    const money = by.Vest!.words.find((w) => w.w === 'Invest')!;
    expect(quizGloss(money.d)).toBe('Money committed so it can grow');
    expect(money.d).toContain('clothing');
    expect(quizGloss(money.d)!.toLowerCase()).not.toContain('clothing');

    const sentence = by.Tex!.words.find((w) => w.w === 'Context')!;
    expect(quizGloss(sentence.d)).toBe('The setting around a sentence');
    expect(sentence.d).toContain('woven');
    expect(quizGloss(sentence.d)!.toLowerCase()).not.toContain('woven');
    expect(quizGloss(sentence.d)!.toLowerCase()).not.toContain('weave');

    const brief = by.Cinct!.words.find((w) => w.w === 'Succinct')!;
    expect(quizGloss(brief.d)).toBe('Brief, with nothing extra');
    expect(brief.d).toContain('belt');
    expect(quizGloss(brief.d)!.toLowerCase()).not.toContain('belt');

    const crime = by.Tect!.words.find((w) => w.w === 'Detective')!;
    expect(quizGloss(crime.d)).toBe('Someone paid to solve a crime');
    expect(crime.d).toContain('uncover');
    expect(quizGloss(crime.d)!.toLowerCase()).not.toContain('cover');

    const arrival = by.Punct!.words.find((w) => w.w === 'Punctual')!;
    expect(quizGloss(arrival.d)).toBe('Arriving when expected');
    expect(arrival.d).toContain('point');
    expect(quizGloss(arrival.d)!.toLowerCase()).not.toContain('point');

    const garment = by.Vest!.words.find((w) => w.w === 'Vest')!;
    expect(quizGloss(garment.d)).toBe('A sleeveless garment');
    expect(garment.d).toContain('clothing');
    expect(quizGloss(garment.d)!.toLowerCase()).not.toContain('clothing');

    const needles = by.Acu!.words.find((w) => w.w === 'Acupuncture')!;
    expect(quizGloss(needles.d)).toBe('A treatment that uses thin needles in the skin');
    expect(quizGloss(needles.d)!.toLowerCase()).toContain('needle');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('weave', 'A cloth made on a loom')).toBe(false);
    expect(glossSaysMean('weave', 'How a surface feels')).toBe(false);
    expect(glossSaysMean('weave', 'The setting around a sentence')).toBe(false);
    expect(glossSaysMean('weave', 'Weaving on a loom')).toBe(true);
    expect(glossSaysMean('thread', 'A very thin strand')).toBe(false);
    expect(glossSaysMean('thread', 'Delicate metal curls')).toBe(false);
    expect(glossSaysMean('thread', 'A side outline')).toBe(false);
    expect(glossSaysMean('thread', 'A thread of light')).toBe(true);
    expect(glossSaysMean('flax', 'Cloth for sheets and shirts')).toBe(false);
    expect(glossSaysMean('flax', 'A small brown seed that is pressed')).toBe(false);
    expect(glossSaysMean('flax', 'A small brown bird')).toBe(false);
    expect(glossSaysMean('flax', 'Of flax')).toBe(true);
    expect(glossSaysMean('clothing', 'A sleeveless garment')).toBe(false);
    expect(glossSaysMean('clothing', 'A robe worn for a ceremony')).toBe(false);
    expect(glossSaysMean('clothing', 'Money committed so it can grow')).toBe(false);
    expect(glossSaysMean('clothing', 'Of clothing')).toBe(true);
    expect(glossSaysMean('fold', 'Stated in a clear, open way')).toBe(false);
    expect(glossSaysMean('fold', 'Meant but not stated outright')).toBe(false);
    expect(glossSaysMean('fold', 'To make something harder to sort out')).toBe(false);
    expect(glossSaysMean('fold', 'Folded out')).toBe(true);
    expect(glossSaysMean('belt', 'A cord worn at the waist')).toBe(false);
    expect(glossSaysMean('belt', 'A district with a set boundary')).toBe(false);
    expect(glossSaysMean('belt', 'Brief, with nothing extra')).toBe(false);
    expect(glossSaysMean('belt', 'A belt')).toBe(true);
    expect(glossSaysMean('tight', 'Firm, and not willing to bend')).toBe(false);
    expect(glossSaysMean('tight', 'To keep someone inside a boundary')).toBe(false);
    expect(glossSaysMean('tight', 'To squeeze so a space gets narrower')).toBe(false);
    expect(glossSaysMean('tight', 'Drawn tight')).toBe(true);
    expect(glossSaysMean('cover', 'To keep someone safe')).toBe(false);
    expect(glossSaysMean('cover', 'To notice something hidden')).toBe(false);
    expect(glossSaysMean('cover', 'Someone paid to solve a crime')).toBe(false);
    expect(glossSaysMean('cover', 'A cover')).toBe(true);
    expect(glossSaysMean('point', 'A hole made by something sharp')).toBe(false);
    expect(glossSaysMean('point', 'Arriving when expected')).toBe(false);
    expect(glossSaysMean('point', 'The dots and curves that divide a sentence')).toBe(false);
    expect(glossSaysMean('point', 'On the point')).toBe(true);
    expect(glossSaysMean('needle', 'Sharp and sudden, as a pain')).toBe(false);
    expect(glossSaysMean('needle', 'Quick, sharp thinking')).toBe(false);
    expect(glossSaysMean('needle', 'A treatment that uses thin needles in the skin')).toBe(true);
    expect(glossSaysMean('tie', 'A tough band between bones')).toBe(false);
    expect(glossSaysMean('tie', 'Two letters printed as one')).toBe(false);
    expect(glossSaysMean('tie', 'To make someone feel they must')).toBe(false);
    expect(glossSaysMean('tie', 'A tie')).toBe(true);
    expect(glossSaysMean('knot', 'A spot where lines meet')).toBe(false);
    expect(glossSaysMean('knot', 'A rounded lump')).toBe(false);
    expect(glossSaysMean('knot', 'Related to a spot where lines meet')).toBe(false);
    expect(glossSaysMean('knot', 'A knot')).toBe(true);
    expect(glossSaysMean('bird', 'A small brown bird')).toBe(true);
    expect(glossSaysMean('weave', 'A small brown bird')).toBe(false);
    expect(glossSaysMean('make', 'Money committed so it can grow')).toBe(false);
    expect(glossSaysMean('speak', 'Brief, with nothing extra')).toBe(false);
    expect(glossSaysMean('build', 'A cloth made on a loom')).toBe(false);
  });

  it('keeps the meaning off the intro and teaches it after the answer', () => {
    for (const name of THREAD_FOLD) {
      const root = by[name]!;
      const intro = rootIntroCopy(root);
      const introText = intro.lines.join(' ');
      expect(intro.continueLabel).toBe(INTRO_CONTINUE_LABEL);
      expect(introText).toContain('is from Latin');
      expect(introContainsAnswer(introText, root.mean), name).toBe(false);
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
    expect(speakablePronunciation('TEKS')).toBe('tex');
    expect(speakablePronunciation('FIL')).toBe('fill');
    expect(speakablePronunciation('LIN')).toBe('lin');
    expect(speakablePronunciation('VEST')).toBe('vest');
    expect(speakablePronunciation('PLIK')).toBe('plick');
    expect(speakablePronunciation('SINKT')).toBe('sinct');
    expect(speakablePronunciation('STRIKT')).toBe('strict');
    expect(speakablePronunciation('TEKT')).toBe('tect');
    expect(speakablePronunciation('PUNKT')).toBe('punct');
    expect(speakablePronunciation('ACK-yoo')).toBe('ack you');
    expect(speakablePronunciation('LIG')).toBe('ligg');
    expect(speakablePronunciation('NOD')).toBe('nod');
    expect(utteranceText('Tex', 'TEKS')).toBe(
      `Tex. ${HEAR_BEAT_PAUSE} tex. ${HEAR_BEAT_PAUSE} The letters T. E. X.`,
    );
    expect(yesUtteranceText('Plic', 'fold')).toBe('Yes — Plic means fold.');
  });

  it('lets a family find Invest on Vest and Linnet on Lin', () => {
    const money = buildIndexBrowseSections({ query: 'invest' });
    expect(indexMatchCount(money)).toBe(1);
    expect(money.some((section) => section.roots.some((root) => root.root === 'Vest'))).toBe(true);

    const bird = buildIndexBrowseSections({ query: 'linnet' });
    expect(indexMatchCount(bird)).toBe(1);
    expect(bird.some((section) => section.roots.some((root) => root.root === 'Lin'))).toBe(true);

    const cloth = buildIndexBrowseSections({ query: 'textile' });
    expect(indexMatchCount(cloth)).toBe(1);
    expect(cloth.some((section) => section.roots.some((root) => root.root === 'Tex'))).toBe(true);

    const crime = buildIndexBrowseSections({ query: 'detective' });
    expect(indexMatchCount(crime)).toBe(1);
    expect(crime.some((section) => section.roots.some((root) => root.root === 'Tect'))).toBe(true);

    const needles = buildIndexBrowseSections({ query: 'acupuncture' });
    expect(indexMatchCount(needles)).toBe(1);
    expect(needles.some((section) => section.roots.some((root) => root.root === 'Acu'))).toBe(true);

    const weave = buildIndexBrowseSections({ query: 'weave' });
    expect(indexMatchCount(weave)).toBe(1);
    expect(weave.some((section) => section.roots.some((root) => root.root === 'Tex'))).toBe(true);

    const flax = buildIndexBrowseSections({ query: 'flax' });
    expect(indexMatchCount(flax)).toBe(1);
    expect(flax.some((section) => section.roots.some((root) => root.root === 'Lin'))).toBe(true);

    const clothing = buildIndexBrowseSections({ query: 'clothing' });
    expect(indexMatchCount(clothing)).toBe(1);
    expect(clothing.some((section) => section.roots.some((root) => root.root === 'Vest'))).toBe(true);

    const crease = buildIndexBrowseSections({ query: 'crease' });
    expect(indexMatchCount(crease)).toBe(1);
    expect(crease.some((section) => section.roots.some((root) => root.root === 'Plic'))).toBe(true);

    const explicit = buildIndexBrowseSections({ query: 'explicit' });
    expect(indexMatchCount(explicit)).toBe(1);
    expect(explicit.some((section) => section.roots.some((root) => root.root === 'Plic'))).toBe(true);

    const needle = buildIndexBrowseSections({ query: 'needle' });
    expect(indexMatchCount(needle)).toBe(1);
    expect(needle.some((section) => section.roots.some((root) => root.root === 'Acu'))).toBe(true);
  });
});

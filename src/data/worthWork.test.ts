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
 * Worth & Work — a locked Starter set for price, effort, care, and trade.
 * Meanings follow the classical forms.
 * Value is a price; the worth sits after the dash.
 * Collaborate is teaming up; the exertion sits after the dash.
 * Curious is wanting to find out; the care sits after the dash.
 * A culprit is the one who did it; the blame sits after the dash.
 * Donate is passing something along; the giving sits after the dash.
 * A merchant buys and sells; the trade sits after the dash.
 * Numerous is more than a few; the number sits after the dash.
 * Partial is only some of a whole; the share sits after the dash.
 * A vacuum is a space with nothing in it; the void sits after the dash.
 * Cav already owns empty, so Vac means void.
 * Mutate is a gene altering traits; the shift sits after the dash.
 * Change would hide inside hang, so Mut means shift.
 * Clarify spells an idea out; the clear sits after the dash.
 * Exclaim is crying out; the shout sits after the dash.
 * Coworker already holds the letters work, so Labor means exertion.
 * Pardon keeps the par stem — the catalog's per is not in the spelling.
 * Merchandise would put hand on this card, so the third word is Commercial.
 * Secure shares the spoken letters secu with Sequ; secure still finds Cur.
 */
const WORTH_WORK = [
  'Val',
  'Labor',
  'Cur',
  'Culp',
  'Don',
  'Merc',
  'Numer',
  'Part',
  'Vac',
  'Mut',
  'Clar',
  'Clam',
] as const;

const MEANINGS: Record<(typeof WORTH_WORK)[number], string> = {
  Val: 'worth',
  Labor: 'exertion',
  Cur: 'care',
  Culp: 'blame',
  Don: 'give',
  Merc: 'trade',
  Numer: 'number',
  Part: 'share',
  Vac: 'void',
  Mut: 'shift',
  Clar: 'clear',
  Clam: 'shout',
};

const SCENES: Record<(typeof WORTH_WORK)[number], string> = {
  Val: 'worth',
  Labor: 'exertion',
  Cur: 'care',
  Culp: 'blame',
  Don: 'give',
  Merc: 'trade',
  Numer: 'number',
  Part: 'share',
  Vac: 'void',
  Mut: 'shift',
  Clar: 'clear',
  Clam: 'shout',
};

/** First clause the feedback says after the kid answers. */
const WORD_INTRO: Record<string, string> = {
  Value: 'Value means what something is priced at.',
  Evaluate: 'Evaluate means to find what something is priced at.',
  Invaluable: 'Invaluable means past any price tag.',
  Collaborate: 'Collaborate means to team up on a project.',
  Elaborate: 'Elaborate means full of extra detail.',
  Laboratory: 'Laboratory means a room for science tests.',
  Curious: 'Curious means eager to find out how something ticks.',
  Secure: 'Secure means safe from harm.',
  Curator: 'Curator means someone in charge of a museum collection.',
  Culprit: 'Culprit means the one who did it.',
  Culpable: 'Culpable means at fault for what happened.',
  Exculpate: 'Exculpate means to show someone did not do it.',
  Donate: 'Donate means to pass something along for a cause.',
  Donor: 'Donor means someone who passes something along.',
  Pardon: 'Pardon means to let a mistake pass.',
  Merchant: 'Merchant means someone who buys and sells.',
  Commerce: 'Commerce means buying and selling on a wide scale.',
  Commercial: 'Commercial means a message that sells a product.',
  Numerous: 'Numerous means more than a few of something.',
  Enumerate: 'Enumerate means to list items in order.',
  Innumerable: 'Innumerable means past listing item by item.',
  Partial: 'Partial means only some of a whole.',
  Particle: 'Particle means a speck of matter.',
  Partner: 'Partner means someone with you in a project.',
  Vacuum: 'Vacuum means a space with nothing in it.',
  Vacuous: 'Vacuous means lacking sense or ideas.',
  Evacuate: 'Evacuate means to leave a building when there is danger.',
  Mutate: 'Mutate means when a gene alters a creature’s traits.',
  Commute: 'Commute means to travel to a job each morning.',
  Mutual: 'Mutual means felt by each group at once.',
  Clarify: 'Clarify means to spell an idea out so it is easier to grasp.',
  Declare: 'Declare means to state something in public.',
  Clarity: 'Clarity means how easy an idea is to grasp.',
  Exclaim: 'Exclaim means to cry out in surprise.',
  Proclaim: 'Proclaim means to announce something publicly.',
  Clamor: 'Clamor means a loud noisy fuss.',
};

describe('Worth & Work starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve locked Starter roots after Merid and before Auto', () => {
    expect(WORTH_WORK).toHaveLength(12);
    const merid = ROOTS.findIndex((r) => r.root === 'Merid');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(merid).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(merid);
    let prev = merid;
    for (const name of WORTH_WORK) {
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
    expect(by.Val!.org).toBe('Latin valēre');
    expect(by.Labor!.org).toBe('Latin labor');
    expect(by.Cur!.org).toBe('Latin cūra');
    expect(by.Culp!.org).toBe('Latin culpa');
    expect(by.Don!.org).toBe('Latin dōnum');
    expect(by.Merc!.org).toBe('Latin merx');
    expect(by.Numer!.org).toBe('Latin numerus');
    expect(by.Part!.org).toBe('Latin pars');
    expect(by.Vac!.org).toBe('Latin vacuus');
    expect(by.Mut!.org).toBe('Latin mūtāre');
    expect(by.Clar!.org).toBe('Latin clārus');
    expect(by.Clam!.org).toBe('Latin clāmāre');

    expect(by.Val!.words.find((w) => w.w === 'Evaluate')!.b).toBe('e (out) + val (worth)');
    expect(by.Long!.words.find((w) => w.w === 'Elongate')!.b).toContain('e (out)');
    expect(by.Labor!.words.find((w) => w.w === 'Collaborate')!.b).toBe('col + labor (exertion)');
    expect(by.Laps!.words.find((w) => w.w === 'Collapse')!.b).toContain('col +');
    expect(by.Cur!.words.find((w) => w.w === 'Secure')!.b).toBe('se (apart) + cur (care)');
    expect(by.Clud!.words.find((w) => w.w === 'Seclude')!.b).toContain('se (apart)');
    expect(by.Val!.words.find((w) => w.w === 'Invaluable')!.b).toBe('in (not) + val (worth)');
    expect(by.San!.words.find((w) => w.w === 'Insane')!.b).toContain('in (not)');
    expect(by.Culp!.words.find((w) => w.w === 'Exculpate')!.b).toBe('ex (out) + culp (blame)');
    expect(by.Curr!.words.find((w) => w.w === 'Excursion')!.b).toContain('ex (out)');
    expect(by.Merc!.words.find((w) => w.w === 'Commerce')!.b).toBe('com (together) + merc (trade)');
    expect(by.Press!.words.find((w) => w.w === 'Compress')!.b).toContain('com (together)');
    expect(by.Clam!.words.find((w) => w.w === 'Proclaim')!.b).toBe('pro (forward) + claim (shout)');
    expect(by.Long!.words.find((w) => w.w === 'Prolong')!.b).toContain('pro (forward)');
    expect(by.Clar!.words.find((w) => w.w === 'Declare')!.b).toBe('de + clar (clear)');
    expect(by.Termin!.words.find((w) => w.w === 'Determine')!.b).toContain('de +');
    expect(by.Don!.words.find((w) => w.w === 'Pardon')!.b).toBe('par + don (give)');
    expect(by.Vac!.words.find((w) => w.w === 'Evacuate')!.b).toBe('e (out) + vac (void)');
    expect(by.Mut!.words.find((w) => w.w === 'Commute')!.b).toBe('com (together) + mut (shift)');
    expect(by.Cav!.alt).toBe('empty');
    expect(by.Vac!.mean).not.toBe('empty');
    expect(by.Pend!.mean).toBe('hang');
    expect(by.Mut!.mean).not.toBe('change');
  });

  it('keeps the everyday clause in the quiz and the root meaning after the dash', () => {
    const priced = by.Val!.words.find((w) => w.w === 'Value')!;
    expect(quizGloss(priced.d)).toBe('What something is priced at');
    expect(priced.d).toContain('worth');
    expect(quizGloss(priced.d)!.toLowerCase()).not.toContain('worth');

    const team = by.Labor!.words.find((w) => w.w === 'Collaborate')!;
    expect(quizGloss(team.d)).toBe('To team up on a project');
    expect(team.d).toContain('exertion');
    expect(quizGloss(team.d)!.toLowerCase()).not.toContain('exertion');

    const findOut = by.Cur!.words.find((w) => w.w === 'Curious')!;
    expect(quizGloss(findOut.d)).toBe('Eager to find out how something ticks');
    expect(findOut.d).toContain('care');
    expect(quizGloss(findOut.d)!.toLowerCase()).not.toContain('care');

    const didIt = by.Culp!.words.find((w) => w.w === 'Culprit')!;
    expect(quizGloss(didIt.d)).toBe('The one who did it');
    expect(didIt.d).toContain('blame');
    expect(quizGloss(didIt.d)!.toLowerCase()).not.toContain('blame');

    const pass = by.Don!.words.find((w) => w.w === 'Donate')!;
    expect(quizGloss(pass.d)).toBe('To pass something along for a cause');
    expect(pass.d).toContain('give');
    expect(quizGloss(pass.d)!.toLowerCase()).not.toContain('give');

    const seller = by.Merc!.words.find((w) => w.w === 'Merchant')!;
    expect(quizGloss(seller.d)).toBe('Someone who buys and sells');
    expect(seller.d).toContain('trade');
    expect(quizGloss(seller.d)!.toLowerCase()).not.toContain('trade');

    const few = by.Numer!.words.find((w) => w.w === 'Numerous')!;
    expect(quizGloss(few.d)).toBe('More than a few of something');
    expect(few.d).toContain('number');
    expect(quizGloss(few.d)!.toLowerCase()).not.toContain('number');

    const some = by.Part!.words.find((w) => w.w === 'Partial')!;
    expect(quizGloss(some.d)).toBe('Only some of a whole');
    expect(some.d).toContain('share');
    expect(quizGloss(some.d)!.toLowerCase()).not.toContain('share');

    const space = by.Vac!.words.find((w) => w.w === 'Vacuum')!;
    expect(quizGloss(space.d)).toBe('A space with nothing in it');
    expect(space.d).toContain('void');
    expect(quizGloss(space.d)!.toLowerCase()).not.toContain('void');

    const gene = by.Mut!.words.find((w) => w.w === 'Mutate')!;
    expect(quizGloss(gene.d)).toBe('When a gene alters a creature’s traits');
    expect(gene.d).toContain('shift');
    expect(quizGloss(gene.d)!.toLowerCase()).not.toContain('shift');

    const idea = by.Clar!.words.find((w) => w.w === 'Clarify')!;
    expect(quizGloss(idea.d)).toBe('To spell an idea out so it is easier to grasp');
    expect(idea.d).toContain('clear');
    expect(quizGloss(idea.d)!.toLowerCase()).not.toContain('clear');

    const cry = by.Clam!.words.find((w) => w.w === 'Exclaim')!;
    expect(quizGloss(cry.d)).toBe('To cry out in surprise');
    expect(cry.d).toContain('shout');
    expect(quizGloss(cry.d)!.toLowerCase()).not.toContain('shout');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('worth', 'What something is priced at')).toBe(false);
    expect(glossSaysMean('worth', 'To find what something is priced at')).toBe(false);
    expect(glossSaysMean('worth', 'Past any price tag')).toBe(false);
    expect(glossSaysMean('worth', 'Its worth')).toBe(true);
    expect(glossSaysMean('exertion', 'To team up on a project')).toBe(false);
    expect(glossSaysMean('exertion', 'Full of extra detail')).toBe(false);
    expect(glossSaysMean('exertion', 'A room for science tests')).toBe(false);
    expect(glossSaysMean('exertion', 'An exertion')).toBe(true);
    expect(glossSaysMean('care', 'Eager to find out how something ticks')).toBe(false);
    expect(glossSaysMean('care', 'Safe from harm')).toBe(false);
    expect(glossSaysMean('care', 'Someone in charge of a museum collection')).toBe(false);
    expect(glossSaysMean('care', 'Full of care')).toBe(true);
    expect(glossSaysMean('blame', 'The one who did it')).toBe(false);
    expect(glossSaysMean('blame', 'At fault for what happened')).toBe(false);
    expect(glossSaysMean('blame', 'To show someone did not do it')).toBe(false);
    expect(glossSaysMean('blame', 'To blame')).toBe(true);
    expect(glossSaysMean('give', 'To pass something along for a cause')).toBe(false);
    expect(glossSaysMean('give', 'Someone who passes something along')).toBe(false);
    expect(glossSaysMean('give', 'To let a mistake pass')).toBe(false);
    expect(glossSaysMean('give', 'A gift given away')).toBe(true);
    expect(glossSaysMean('give', 'She gave it away')).toBe(true);
    expect(glossSaysMean('trade', 'Someone who buys and sells')).toBe(false);
    expect(glossSaysMean('trade', 'Buying and selling on a wide scale')).toBe(false);
    expect(glossSaysMean('trade', 'A message that sells a product')).toBe(false);
    expect(glossSaysMean('trade', 'A trade')).toBe(true);
    expect(glossSaysMean('number', 'More than a few of something')).toBe(false);
    expect(glossSaysMean('number', 'To list items in order')).toBe(false);
    expect(glossSaysMean('number', 'Past listing item by item')).toBe(false);
    expect(glossSaysMean('number', 'A number')).toBe(true);
    expect(glossSaysMean('share', 'Only some of a whole')).toBe(false);
    expect(glossSaysMean('share', 'A speck of matter')).toBe(false);
    expect(glossSaysMean('share', 'Someone with you in a project')).toBe(false);
    expect(glossSaysMean('share', 'A share')).toBe(true);
    expect(glossSaysMean('void', 'A space with nothing in it')).toBe(false);
    expect(glossSaysMean('void', 'Lacking sense or ideas')).toBe(false);
    expect(glossSaysMean('void', 'To leave a building when there is danger')).toBe(false);
    expect(glossSaysMean('void', 'A void')).toBe(true);
    expect(glossSaysMean('empty', 'A space with nothing in it')).toBe(false);
    expect(glossSaysMean('shift', 'When a gene alters a creature’s traits')).toBe(false);
    expect(glossSaysMean('shift', 'To travel to a job each morning')).toBe(false);
    expect(glossSaysMean('shift', 'Felt by each group at once')).toBe(false);
    expect(glossSaysMean('shift', 'A shift')).toBe(true);
    expect(glossSaysMean('hang', 'When a gene alters a creature’s traits')).toBe(false);
    expect(glossSaysMean('clear', 'To spell an idea out so it is easier to grasp')).toBe(false);
    expect(glossSaysMean('clear', 'To state something in public')).toBe(false);
    expect(glossSaysMean('clear', 'How easy an idea is to grasp')).toBe(false);
    expect(glossSaysMean('clear', 'Make it clear')).toBe(true);
    expect(glossSaysMean('shout', 'To cry out in surprise')).toBe(false);
    expect(glossSaysMean('shout', 'To announce something publicly')).toBe(false);
    expect(glossSaysMean('shout', 'A loud noisy fuss')).toBe(false);
    expect(glossSaysMean('shout', 'A shout')).toBe(true);
  });

  it('keeps the meaning off the intro and teaches it after the answer', () => {
    for (const name of WORTH_WORK) {
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
    expect(speakablePronunciation('VAL')).toBe('val');
    expect(speakablePronunciation('LAY-ber')).toBe('lay ber');
    expect(speakablePronunciation('KYOOR')).toBe('cure');
    expect(speakablePronunciation('CULP')).toBe('culp');
    expect(speakablePronunciation('DON')).toBe('don');
    expect(speakablePronunciation('MERK')).toBe('murk');
    expect(speakablePronunciation('NOO-mer')).toBe('new mer');
    expect(speakablePronunciation('PART')).toBe('part');
    expect(speakablePronunciation('VAK')).toBe('vack');
    expect(speakablePronunciation('MYOOT')).toBe('mute');
    expect(speakablePronunciation('KLAR')).toBe('klahr');
    expect(speakablePronunciation('KLAM')).toBe('clam');
    expect(utteranceText('Labor', 'LAY-ber')).toBe(
      `Labor. ${HEAR_BEAT_PAUSE} lay ber. ${HEAR_BEAT_PAUSE} The letters L. A. B. O. R.`,
    );
    expect(utteranceText('Cur', 'KYOOR')).toBe(
      `Cur. ${HEAR_BEAT_PAUSE} cure. ${HEAR_BEAT_PAUSE} The letters C. U. R.`,
    );
    expect(yesUtteranceText('Val', 'worth')).toBe('Yes — Val means worth.');
  });

  it('lets a family find the new school words and the new meanings', () => {
    const hits: Array<[string, string]> = [
      ['value', 'Val'],
      ['evaluate', 'Val'],
      ['invaluable', 'Val'],
      ['collaborate', 'Labor'],
      ['elaborate', 'Labor'],
      ['laboratory', 'Labor'],
      ['curious', 'Cur'],
      ['secure', 'Cur'],
      ['curator', 'Cur'],
      ['culprit', 'Culp'],
      ['culpable', 'Culp'],
      ['exculpate', 'Culp'],
      ['donate', 'Don'],
      ['donor', 'Don'],
      ['pardon', 'Don'],
      ['merchant', 'Merc'],
      ['commerce', 'Merc'],
      ['commercial', 'Merc'],
      ['numerous', 'Numer'],
      ['enumerate', 'Numer'],
      ['innumerable', 'Numer'],
      ['partial', 'Part'],
      ['particle', 'Part'],
      ['partner', 'Part'],
      ['vacuum', 'Vac'],
      ['vacuous', 'Vac'],
      ['evacuate', 'Vac'],
      ['mutate', 'Mut'],
      ['commute', 'Mut'],
      ['mutual', 'Mut'],
      ['clarify', 'Clar'],
      ['declare', 'Clar'],
      ['clarity', 'Clar'],
      ['exclaim', 'Clam'],
      ['proclaim', 'Clam'],
      ['clamor', 'Clam'],
      ['worth', 'Val'],
      ['exertion', 'Labor'],
      ['care', 'Cur'],
      ['blame', 'Culp'],
      ['give', 'Don'],
      ['trade', 'Merc'],
      ['number', 'Numer'],
      ['share', 'Part'],
      ['void', 'Vac'],
      ['shift', 'Mut'],
      ['clear', 'Clar'],
      ['shout', 'Clam'],
      ['valuation', 'Val'],
      ['chores', 'Labor'],
      ['concern', 'Cur'],
      ['guilt', 'Culp'],
      ['gift', 'Don'],
      ['barter', 'Merc'],
      ['total', 'Numer'],
      ['quota', 'Part'],
      ['blank', 'Vac'],
      ['mutation', 'Mut'],
      ['sheer', 'Clar'],
      ['outcry', 'Clam'],
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

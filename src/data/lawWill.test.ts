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
 * Law & Will — a locked Starter set for liberty, a crown, and a wish.
 * Meanings follow the classical forms.
 * Liberty is a right to choose; the liberty sits after the dash.
 * A servant does tasks for others; the serving sits after the dash.
 * Regal is fit for a palace; the crown sits after the dash.
 * Shaking already holds the letters king, so Reg means crown.
 * Satisfy is meeting a need; the enough sits after the dash.
 * Grateful is owing a kindness; the thanks sits after the dash.
 * A volunteer offers help; the wish sits after the dash.
 * Timid is shy and unsure; the alarm sits after the dash.
 * Scare would hide care, and Phobia already owns fear, so Tim means alarm.
 * Irate is sharp and upset; the wrath sits after the dash.
 * Fer already owns fur, so the other name is rage.
 * Celebrate is a happy occasion; the honor sits after the dash.
 * Aud already owns the letters aud, so praise here is Celebr.
 * Prove shows a claim is solid; the proof sits after the dash.
 * Legal is allowed by a code; the statute sits after the dash.
 * Ordinal is a spot in a lineup; the rank sits after the dash.
 * Deserve leaves de bare — the same way Determine does.
 * Approve leaves ap bare — the catalog's ad is not in the spelling.
 * Legitimate keeps the letters tim, so a search for tim is not Tim alone.
 */
const LAW_WILL = [
  'Liber',
  'Serv',
  'Reg',
  'Sat',
  'Grat',
  'Vol',
  'Tim',
  'Ira',
  'Celebr',
  'Prob',
  'Leg',
  'Ord',
] as const;

const MEANINGS: Record<(typeof LAW_WILL)[number], string> = {
  Liber: 'liberty',
  Serv: 'serve',
  Reg: 'crown',
  Sat: 'enough',
  Grat: 'thanks',
  Vol: 'wish',
  Tim: 'alarm',
  Ira: 'wrath',
  Celebr: 'honor',
  Prob: 'proof',
  Leg: 'statute',
  Ord: 'rank',
};

const SCENES: Record<(typeof LAW_WILL)[number], string> = {
  Liber: 'liberty',
  Serv: 'serve',
  Reg: 'crown',
  Sat: 'enough',
  Grat: 'thanks',
  Vol: 'wish',
  Tim: 'alarm',
  Ira: 'wrath',
  Celebr: 'honor',
  Prob: 'proof',
  Leg: 'statute',
  Ord: 'rank',
};

/** First clause the feedback says after the kid answers. */
const WORD_INTRO: Record<string, string> = {
  Liberty: 'Liberty means a right to choose your own path.',
  Liberate: 'Liberate means to let someone loose from a lock.',
  Liberal: 'Liberal means generous with ideas and help.',
  Servant: 'Servant means someone paid to do tasks for others.',
  Service: 'Service means help offered during a long stretch.',
  Deserve: 'Deserve means to have earned a result.',
  Regal: 'Regal means fit for a palace.',
  Regulate: 'Regulate means to set the way something proceeds.',
  Regime: 'Regime means a system in charge of a country.',
  Satisfy: 'Satisfy means to meet a need so nothing is lacking.',
  Satiate: 'Satiate means to quiet a hunger completely.',
  Insatiable: 'Insatiable means never content, always wanting more.',
  Grateful: 'Grateful means glad you owe someone a kindness.',
  Gratitude: 'Gratitude means the warm sense of owing a kindness.',
  Congratulate: 'Congratulate means to tell someone you are glad for their joy.',
  Volunteer: 'Volunteer means to offer help without being asked.',
  Voluntary: 'Voluntary means done by choice, not by pressure.',
  Volition: 'Volition means a choice you settle on your own.',
  Timid: 'Timid means shy and unsure.',
  Intimidate: 'Intimidate means to push someone until they quit.',
  Timorous: 'Timorous means quick to shrink from a risk.',
  Irate: 'Irate means very sharp and upset.',
  Irascible: 'Irascible means quick to become upset.',
  Irascibility: 'Irascibility means a habit of becoming upset quickly.',
  Celebrate: 'Celebrate means to enjoy a happy occasion with others.',
  Celebrity: 'Celebrity means someone famous.',
  Celebration: 'Celebration means a happy gathering for a special occasion.',
  Prove: 'Prove means to show a claim is solid.',
  Probable: 'Probable means likely to be so.',
  Approve: 'Approve means to accept a plan.',
  Legal: 'Legal means allowed by the code of a country.',
  Legislate: 'Legislate means to pass a code for a country.',
  Legitimate: 'Legitimate means accepted as allowed.',
  Ordinal: 'Ordinal means the spot a thing has in a lineup, like third.',
  Coordinate: 'Coordinate means to line things up so they work as a team.',
  Inordinate: 'Inordinate means way past a sensible amount.',
};

describe('Law & Will starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve locked Starter roots after Clam and before Auto', () => {
    expect(LAW_WILL).toHaveLength(12);
    const clam = ROOTS.findIndex((r) => r.root === 'Clam');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(clam).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(clam);
    let prev = clam;
    for (const name of LAW_WILL) {
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
    expect(ROOTS.length).toBe(327);
  });

  it('keeps the classical origins and the shared piece names', () => {
    expect(by.Liber!.org).toBe('Latin lībertās');
    expect(by.Serv!.org).toBe('Latin servīre');
    expect(by.Reg!.org).toBe('Latin rēx');
    expect(by.Sat!.org).toBe('Latin satis');
    expect(by.Grat!.org).toBe('Latin grātus');
    expect(by.Vol!.org).toBe('Latin velle');
    expect(by.Tim!.org).toBe('Latin timēre');
    expect(by.Ira!.org).toBe('Latin īra');
    expect(by.Celebr!.org).toBe('Latin celebrāre');
    expect(by.Prob!.org).toBe('Latin probāre');
    expect(by.Leg!.org).toBe('Latin lēx');
    expect(by.Ord!.org).toBe('Latin ōrdō');

    expect(by.Serv!.words.find((w) => w.w === 'Deserve')!.b).toBe('de + serv (serve)');
    expect(by.Termin!.words.find((w) => w.w === 'Determine')!.b).toContain('de +');
    expect(by.Sat!.words.find((w) => w.w === 'Insatiable')!.b).toBe('in (not) + sat (enough)');
    expect(by.San!.words.find((w) => w.w === 'Insane')!.b).toContain('in (not)');
    expect(by.Grat!.words.find((w) => w.w === 'Congratulate')!.b).toBe('con (together) + grat (thanks)');
    expect(by.Struct!.words.find((w) => w.w === 'Construct')!.b).toContain('con (together)');
    expect(by.Tim!.words.find((w) => w.w === 'Intimidate')!.b).toBe('in (into) + tim (alarm)');
    expect(by.Sult!.words.find((w) => w.w === 'Insult')!.b).toContain('in (into)');
    expect(by.Ord!.words.find((w) => w.w === 'Coordinate')!.b).toBe('co (together) + ord (rank)');
    expect(by.Co!.words.find((w) => w.w === 'Cooperate')!.b).toContain('co (together)');
    expect(by.Ord!.words.find((w) => w.w === 'Inordinate')!.b).toBe('in (not) + ord (rank)');
    expect(by.Prob!.words.find((w) => w.w === 'Approve')!.b).toBe('ap + prov (proof)');
    expect(by.Seism!.alt).toContain('shaking');
    expect(by.Reg!.mean).not.toBe('king');
    expect(by.Phobia!.mean).toBe('fear');
    expect(by.Tim!.mean).not.toBe('fear');
    expect(by.Cur!.mean).toBe('care');
    expect(by.Tim!.mean).not.toContain('care');
    expect(by.Aud!.root).toBe('Aud');
    expect(by.Celebr!.root).not.toContain('aud');
    expect(by.Ira!.alt).toBe('rage');
    expect(by.Ira!.alt).not.toContain('fur');
  });

  it('keeps the everyday clause in the quiz and the root meaning after the dash', () => {
    const path = by.Liber!.words.find((w) => w.w === 'Liberty')!;
    expect(quizGloss(path.d)).toBe('A right to choose your own path');
    expect(path.d).toContain('liberty');
    expect(quizGloss(path.d)!.toLowerCase()).not.toContain('liberty');

    const tasks = by.Serv!.words.find((w) => w.w === 'Servant')!;
    expect(quizGloss(tasks.d)).toBe('Someone paid to do tasks for others');
    expect(tasks.d).toContain('serve');
    expect(quizGloss(tasks.d)!.toLowerCase()).not.toContain('serve');

    const palace = by.Reg!.words.find((w) => w.w === 'Regal')!;
    expect(quizGloss(palace.d)).toBe('Fit for a palace');
    expect(palace.d).toContain('crown');
    expect(quizGloss(palace.d)!.toLowerCase()).not.toContain('crown');

    const need = by.Sat!.words.find((w) => w.w === 'Satisfy')!;
    expect(quizGloss(need.d)).toBe('To meet a need so nothing is lacking');
    expect(need.d).toContain('enough');
    expect(quizGloss(need.d)!.toLowerCase()).not.toContain('enough');

    const owe = by.Grat!.words.find((w) => w.w === 'Grateful')!;
    expect(quizGloss(owe.d)).toBe('Glad you owe someone a kindness');
    expect(owe.d).toContain('thanks');
    expect(quizGloss(owe.d)!.toLowerCase()).not.toContain('thanks');

    const offer = by.Vol!.words.find((w) => w.w === 'Volunteer')!;
    expect(quizGloss(offer.d)).toBe('To offer help without being asked');
    expect(offer.d).toContain('wish');
    expect(quizGloss(offer.d)!.toLowerCase()).not.toContain('wish');

    const shy = by.Tim!.words.find((w) => w.w === 'Timid')!;
    expect(quizGloss(shy.d)).toBe('Shy and unsure');
    expect(shy.d).toContain('alarm');
    expect(quizGloss(shy.d)!.toLowerCase()).not.toContain('alarm');

    const sharp = by.Ira!.words.find((w) => w.w === 'Irate')!;
    expect(quizGloss(sharp.d)).toBe('Very sharp and upset');
    expect(sharp.d).toContain('wrath');
    expect(quizGloss(sharp.d)!.toLowerCase()).not.toContain('wrath');

    const occasion = by.Celebr!.words.find((w) => w.w === 'Celebrate')!;
    expect(quizGloss(occasion.d)).toBe('To enjoy a happy occasion with others');
    expect(occasion.d).toContain('honor');
    expect(quizGloss(occasion.d)!.toLowerCase()).not.toContain('honor');

    const claim = by.Prob!.words.find((w) => w.w === 'Prove')!;
    expect(quizGloss(claim.d)).toBe('To show a claim is solid');
    expect(claim.d).toContain('proof');
    expect(quizGloss(claim.d)!.toLowerCase()).not.toContain('proof');

    const code = by.Leg!.words.find((w) => w.w === 'Legal')!;
    expect(quizGloss(code.d)).toBe('Allowed by the code of a country');
    expect(code.d).toContain('statute');
    expect(quizGloss(code.d)!.toLowerCase()).not.toContain('statute');

    const spot = by.Ord!.words.find((w) => w.w === 'Ordinal')!;
    expect(quizGloss(spot.d)).toBe('The spot a thing has in a lineup, like third');
    expect(spot.d).toContain('rank');
    expect(quizGloss(spot.d)!.toLowerCase()).not.toContain('rank');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('liberty', 'A right to choose your own path')).toBe(false);
    expect(glossSaysMean('liberty', 'To let someone loose from a lock')).toBe(false);
    expect(glossSaysMean('liberty', 'Generous with ideas and help')).toBe(false);
    expect(glossSaysMean('liberty', 'Full liberty')).toBe(true);
    expect(glossSaysMean('serve', 'Someone paid to do tasks for others')).toBe(false);
    expect(glossSaysMean('serve', 'Help offered during a long stretch')).toBe(false);
    expect(glossSaysMean('serve', 'To have earned a result')).toBe(false);
    expect(glossSaysMean('serve', 'To serve')).toBe(true);
    expect(glossSaysMean('crown', 'Fit for a palace')).toBe(false);
    expect(glossSaysMean('crown', 'To set the way something proceeds')).toBe(false);
    expect(glossSaysMean('crown', 'A system in charge of a country')).toBe(false);
    expect(glossSaysMean('crown', 'A crown')).toBe(true);
    expect(glossSaysMean('king', 'Fit for a palace')).toBe(false);
    expect(glossSaysMean('enough', 'To meet a need so nothing is lacking')).toBe(false);
    expect(glossSaysMean('enough', 'To quiet a hunger completely')).toBe(false);
    expect(glossSaysMean('enough', 'Never content, always wanting more')).toBe(false);
    expect(glossSaysMean('enough', 'Had enough')).toBe(true);
    expect(glossSaysMean('thanks', 'Glad you owe someone a kindness')).toBe(false);
    expect(glossSaysMean('thanks', 'The warm sense of owing a kindness')).toBe(false);
    expect(glossSaysMean('thanks', 'To tell someone you are glad for their joy')).toBe(false);
    expect(glossSaysMean('thanks', 'Many thanks')).toBe(true);
    expect(glossSaysMean('wish', 'To offer help without being asked')).toBe(false);
    expect(glossSaysMean('wish', 'Done by choice, not by pressure')).toBe(false);
    expect(glossSaysMean('wish', 'A choice you settle on your own')).toBe(false);
    expect(glossSaysMean('wish', 'A wish')).toBe(true);
    expect(glossSaysMean('alarm', 'Shy and unsure')).toBe(false);
    expect(glossSaysMean('alarm', 'To push someone until they quit')).toBe(false);
    expect(glossSaysMean('alarm', 'Quick to shrink from a risk')).toBe(false);
    expect(glossSaysMean('alarm', 'An alarm')).toBe(true);
    expect(glossSaysMean('care', 'Shy and unsure')).toBe(false);
    expect(glossSaysMean('fear', 'Shy and unsure')).toBe(false);
    expect(glossSaysMean('wrath', 'Very sharp and upset')).toBe(false);
    expect(glossSaysMean('wrath', 'Quick to become upset')).toBe(false);
    expect(glossSaysMean('wrath', 'A habit of becoming upset quickly')).toBe(false);
    expect(glossSaysMean('wrath', 'In wrath')).toBe(true);
    expect(glossSaysMean('honor', 'To enjoy a happy occasion with others')).toBe(false);
    expect(glossSaysMean('honor', 'Someone famous')).toBe(false);
    expect(glossSaysMean('honor', 'A happy gathering for a special occasion')).toBe(false);
    expect(glossSaysMean('honor', 'An honor')).toBe(true);
    expect(glossSaysMean('proof', 'To show a claim is solid')).toBe(false);
    expect(glossSaysMean('proof', 'Likely to be so')).toBe(false);
    expect(glossSaysMean('proof', 'To accept a plan')).toBe(false);
    expect(glossSaysMean('proof', 'A proof')).toBe(true);
    expect(glossSaysMean('statute', 'Allowed by the code of a country')).toBe(false);
    expect(glossSaysMean('statute', 'To pass a code for a country')).toBe(false);
    expect(glossSaysMean('statute', 'Accepted as allowed')).toBe(false);
    expect(glossSaysMean('statute', 'A statute')).toBe(true);
    expect(glossSaysMean('rank', 'The spot a thing has in a lineup, like third')).toBe(false);
    expect(glossSaysMean('rank', 'To line things up so they work as a team')).toBe(false);
    expect(glossSaysMean('rank', 'Way past a sensible amount')).toBe(false);
    expect(glossSaysMean('rank', 'A rank')).toBe(true);
  });

  it('keeps the meaning off the intro and teaches it after the answer', () => {
    for (const name of LAW_WILL) {
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
    expect(speakablePronunciation('LIB-er')).toBe('lib er');
    expect(speakablePronunciation('SERV')).toBe('serv');
    expect(speakablePronunciation('REG')).toBe('reg');
    expect(speakablePronunciation('SAT')).toBe('sat');
    expect(speakablePronunciation('GRAT')).toBe('grat');
    expect(speakablePronunciation('VOL')).toBe('vol');
    expect(speakablePronunciation('TIM')).toBe('tim');
    expect(speakablePronunciation('EE-rah')).toBe('ee rah');
    expect(speakablePronunciation('SEL-uh-ber')).toBe('sel uh ber');
    expect(speakablePronunciation('PROB')).toBe('prob');
    expect(speakablePronunciation('LEG')).toBe('leg');
    expect(speakablePronunciation('ORD')).toBe('ord');
    expect(utteranceText('Celebr', 'SEL-uh-ber')).toBe(
      `Celebr. ${HEAR_BEAT_PAUSE} sel uh ber. ${HEAR_BEAT_PAUSE} The letters C. E. L. E. B. R.`,
    );
    expect(utteranceText('Ira', 'EE-rah')).toBe(
      `Ira. ${HEAR_BEAT_PAUSE} ee rah. ${HEAR_BEAT_PAUSE} The letters I. R. A.`,
    );
    expect(yesUtteranceText('Liber', 'liberty')).toBe('Yes — Liber means liberty.');
  });

  it('lets a family find the new school words and the new meanings', () => {
    const hits: Array<[string, string]> = [
      ['liberty', 'Liber'],
      ['liberate', 'Liber'],
      ['liberal', 'Liber'],
      ['servant', 'Serv'],
      ['service', 'Serv'],
      ['deserve', 'Serv'],
      ['regal', 'Reg'],
      ['regulate', 'Reg'],
      ['regime', 'Reg'],
      ['satisfy', 'Sat'],
      ['satiate', 'Sat'],
      ['insatiable', 'Sat'],
      ['grateful', 'Grat'],
      ['gratitude', 'Grat'],
      ['congratulate', 'Grat'],
      ['volunteer', 'Vol'],
      ['voluntary', 'Vol'],
      ['volition', 'Vol'],
      ['timid', 'Tim'],
      ['intimidate', 'Tim'],
      ['timorous', 'Tim'],
      ['irate', 'Ira'],
      ['irascible', 'Ira'],
      ['irascibility', 'Ira'],
      ['celebrate', 'Celebr'],
      ['celebrity', 'Celebr'],
      ['celebration', 'Celebr'],
      ['prove', 'Prob'],
      ['probable', 'Prob'],
      ['approve', 'Prob'],
      ['legal', 'Leg'],
      ['legislate', 'Leg'],
      ['legitimate', 'Leg'],
      ['ordinal', 'Ord'],
      ['coordinate', 'Ord'],
      ['inordinate', 'Ord'],
      ['franchise', 'Liber'],
      ['duty', 'Serv'],
      ['crown', 'Reg'],
      ['throne', 'Reg'],
      ['enough', 'Sat'],
      ['ample', 'Sat'],
      ['thanks', 'Grat'],
      ['cheers', 'Grat'],
      ['wish', 'Vol'],
      ['craving', 'Vol'],
      ['alarm', 'Tim'],
      ['unease', 'Tim'],
      ['wrath', 'Ira'],
      ['rage', 'Ira'],
      ['honor', 'Celebr'],
      ['renown', 'Celebr'],
      ['proof', 'Prob'],
      ['proven', 'Prob'],
      ['statute', 'Leg'],
      ['codex', 'Leg'],
      ['rank', 'Ord'],
      ['lineup', 'Ord'],
      ['liber', 'Liber'],
      ['serv', 'Serv'],
      ['sat', 'Sat'],
      ['ira', 'Ira'],
      ['celebr', 'Celebr'],
      ['prob', 'Prob'],
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

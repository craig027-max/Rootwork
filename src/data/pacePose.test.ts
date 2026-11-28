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
 * Pace & Pose — a locked Starter set for homeschool motion words.
 * Meanings follow the classical forms.
 * A current is a flow; the running sits after the dash.
 * A cursor is a screen mark; the runner sits after the dash.
 * An excursion is a short pleasure trip; the running out sits after the dash.
 * An ambulance is a van for the injured; the walking hospital sits after the dash.
 * A result is what an effort leaves you with; the leap sits after the dash.
 * An accident is an unplanned mishap; the fall sits after the dash.
 * A lapse is a gap in attention; the slip sits after the dash.
 * An error is a mistake; the straying sits after the dash.
 * Reflect is thinking something over; the bend sits after the dash.
 * A pulse is the throb at your wrist; the drive sits after the dash.
 * Express is letting a thought out; the squeeze sits after the dash.
 * Sedentary is staying still for hours; the sitting sits after the dash.
 * A cubicle is a walled-off desk; the little room sits after the dash.
 * Recline is resting tilted; the lean sits after the dash.
 * Decline is refusing an offer; the lean sits after the dash.
 * A clinic is a room for care; the bed sits after the dash.
 * Press is the letters kids see; premere means to squeeze.
 * Perambulate leaves per bare — the catalog's per means "for each".
 */
const PACE_POSE = [
  'Curr',
  'Ambul',
  'Sult',
  'Cad',
  'Laps',
  'Err',
  'Flect',
  'Puls',
  'Press',
  'Sed',
  'Cub',
  'Clin',
] as const;

const MEANINGS: Record<(typeof PACE_POSE)[number], string> = {
  Curr: 'run',
  Ambul: 'walk',
  Sult: 'leap',
  Cad: 'fall',
  Laps: 'slip',
  Err: 'stray',
  Flect: 'bend',
  Puls: 'drive',
  Press: 'squeeze',
  Sed: 'sit',
  Cub: 'lie',
  Clin: 'lean',
};

const SCENES: Record<(typeof PACE_POSE)[number], string> = {
  Curr: 'run',
  Ambul: 'walk',
  Sult: 'leap',
  Cad: 'tumble',
  Laps: 'slip',
  Err: 'stray',
  Flect: 'bend',
  Puls: 'drive',
  Press: 'squeeze',
  Sed: 'sit',
  Cub: 'lie',
  Clin: 'lean',
};

/** First clause the feedback says after the kid answers. */
const WORD_INTRO: Record<string, string> = {
  Current: 'Current means a flow of water or electricity.',
  Cursor: 'Cursor means a mark that travels on a screen.',
  Excursion: 'Excursion means a short pleasure trip.',
  Ambulance: 'Ambulance means a van for the injured on the way to a hospital.',
  Ambulatory: 'Ambulatory means able to get about without help.',
  Perambulate: 'Perambulate means to travel all over a place.',
  Result: 'Result means what an effort leaves you with.',
  Consult: 'Consult means to ask someone for advice.',
  Insult: 'Insult means a rude remark meant to hurt.',
  Cascade: 'Cascade means water spilling in sheets on rocks.',
  Cadence: 'Cadence means a steady beat in music or marching.',
  Accident: 'Accident means an unplanned mishap.',
  Lapse: 'Lapse means a gap where attention drops.',
  Collapse: 'Collapse means to crumple inward.',
  Elapse: 'Elapse means to pass, as hours do.',
  Error: 'Error means a mistake.',
  Erratic: 'Erratic means not keeping to a steady path.',
  Erroneous: 'Erroneous means not matching the facts.',
  Reflect: 'Reflect means to think a moment about what happened.',
  Deflect: 'Deflect means to knock something off its path.',
  Inflect: 'Inflect means to change the rise and drop of a tone.',
  Pulse: 'Pulse means the throb at your wrist.',
  Impulse: 'Impulse means a sudden urge to act.',
  Propulsion: 'Propulsion means the push behind a rocket or a boat.',
  Express: 'Express means to let a thought out.',
  Pressure: 'Pressure means a steady push on a surface.',
  Compress: 'Compress means to pack into less space.',
  Sedentary: 'Sedentary means mostly still, for hours at a stretch.',
  Sediment: 'Sediment means bits that settle at the bottom.',
  Sedate: 'Sedate means quiet and slow.',
  Incubate: 'Incubate means to keep eggs warm until they hatch.',
  Incubator: 'Incubator means a machine that keeps eggs warm.',
  Cubicle: 'Cubicle means a walled-off desk space.',
  Recline: 'Recline means to rest tilted in a chair.',
  Decline: 'Decline means to refuse an offer.',
  Clinic: 'Clinic means a room for medical care.',
};

describe('Pace & Pose starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve locked Starter roots after Cumul and before Auto', () => {
    expect(PACE_POSE).toHaveLength(12);
    const cumul = ROOTS.findIndex((r) => r.root === 'Cumul');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(cumul).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(cumul);
    let prev = cumul;
    for (const name of PACE_POSE) {
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
    expect(by.Curr!.org).toBe('Latin currere');
    expect(by.Ambul!.org).toBe('Latin ambulāre');
    expect(by.Sult!.org).toBe('Latin salīre');
    expect(by.Cad!.org).toBe('Latin cadere');
    expect(by.Laps!.org).toBe('Latin lābī');
    expect(by.Err!.org).toBe('Latin errāre');
    expect(by.Flect!.org).toBe('Latin flectere');
    expect(by.Puls!.org).toBe('Latin pellere');
    expect(by.Press!.org).toBe('Latin premere');
    expect(by.Sed!.org).toBe('Latin sedēre');
    expect(by.Cub!.org).toBe('Latin cubāre');
    expect(by.Clin!.org).toBe('Latin clīnāre · Greek klínē');

    expect(by.Curr!.words.find((w) => w.w === 'Excursion')!.b).toBe('ex (out) + curs (run)');
    expect(by.Tract!.words.find((w) => w.w === 'Extract')!.b).toContain('ex (out)');
    expect(by.Sult!.words.find((w) => w.w === 'Consult')!.b).toBe('con (together) + sult (leap)');
    expect(by.Struct!.words.find((w) => w.w === 'Construct')!.b).toContain('con (together)');
    expect(by.Sult!.words.find((w) => w.w === 'Insult')!.b).toBe('in (into) + sult (leap)');
    expect(by.Struct!.words.find((w) => w.w === 'Instruct')!.b).toContain('in (into)');
    expect(by.Puls!.words.find((w) => w.w === 'Impulse')!.b).toBe('im (in) + puls (drive)');
    expect(by.Port!.words.find((w) => w.w === 'Import')!.b).toContain('im (in)');
    expect(by.Puls!.words.find((w) => w.w === 'Propulsion')!.b).toBe('pro (forward) + puls (drive)');
    expect(by.Duc!.words.find((w) => w.w === 'Produce')!.b).toContain('pro (forward)');
    expect(by.Press!.words.find((w) => w.w === 'Compress')!.b).toBe('com (together) + press (squeeze)');
    expect(by.Pos!.words.find((w) => w.w === 'Compose')!.b).toContain('com (together)');
    expect(by.Flect!.words.find((w) => w.w === 'Reflect')!.b).toBe('re (back) + flect (bend)');
    expect(by.Ject!.words.find((w) => w.w === 'Reject')!.b).toContain('re (back)');
    expect(by.Cub!.words.find((w) => w.w === 'Incubator')!.b).toBe(
      'in (into) + cub (lie) + -or (thing that)',
    );
    expect(by.Mot!.words.find((w) => w.w === 'Motor')!.b).toContain('-or (thing that)');
    expect(by.Ambul!.words.find((w) => w.w === 'Perambulate')!.b).toBe('per + ambul (walk)');
    expect(by.Cent!.words.find((w) => w.w === 'Percent')!.b).toContain('per (for each)');
    expect(by.Cad!.words.find((w) => w.w === 'Accident')!.b).toBe('ac + cid (fall)');
    expect(by.Laps!.words.find((w) => w.w === 'Collapse')!.b).toBe('col + laps (slip)');
    expect(by.Flect!.words.find((w) => w.w === 'Deflect')!.b).toBe('de + flect (bend)');
    expect(by.Clin!.words.find((w) => w.w === 'Decline')!.b).toBe('de + clin (lean)');
  });

  it('keeps the everyday clause in the quiz and the root meaning after the dash', () => {
    const flow = by.Curr!.words.find((w) => w.w === 'Current')!;
    expect(quizGloss(flow.d)).toBe('A flow of water or electricity');
    expect(flow.d).toContain('running');
    expect(quizGloss(flow.d)!.toLowerCase()).not.toContain('run');

    const mark = by.Curr!.words.find((w) => w.w === 'Cursor')!;
    expect(quizGloss(mark.d)).toBe('A mark that travels on a screen');
    expect(mark.d).toContain('runner');
    expect(quizGloss(mark.d)!.toLowerCase()).not.toContain('run');

    const trip = by.Curr!.words.find((w) => w.w === 'Excursion')!;
    expect(quizGloss(trip.d)).toBe('A short pleasure trip');
    expect(trip.d).toContain('running');
    expect(quizGloss(trip.d)!.toLowerCase()).not.toContain('run');

    const van = by.Ambul!.words.find((w) => w.w === 'Ambulance')!;
    expect(quizGloss(van.d)).toBe('A van for the injured on the way to a hospital');
    expect(van.d).toContain('walking');
    expect(quizGloss(van.d)!.toLowerCase()).not.toContain('walk');

    const effort = by.Sult!.words.find((w) => w.w === 'Result')!;
    expect(quizGloss(effort.d)).toBe('What an effort leaves you with');
    expect(effort.d).toContain('leap');
    expect(quizGloss(effort.d)!.toLowerCase()).not.toContain('leap');

    const mishap = by.Cad!.words.find((w) => w.w === 'Accident')!;
    expect(quizGloss(mishap.d)).toBe('An unplanned mishap');
    expect(mishap.d).toContain('befalls');
    expect(quizGloss(mishap.d)!.toLowerCase()).not.toContain('fall');

    const gap = by.Laps!.words.find((w) => w.w === 'Lapse')!;
    expect(quizGloss(gap.d)).toBe('A gap where attention drops');
    expect(gap.d).toContain('slip');
    expect(quizGloss(gap.d)!.toLowerCase()).not.toContain('slip');

    const mistake = by.Err!.words.find((w) => w.w === 'Error')!;
    expect(quizGloss(mistake.d)).toBe('A mistake');
    expect(mistake.d).toContain('straying');
    expect(quizGloss(mistake.d)!.toLowerCase()).not.toContain('stray');

    const thought = by.Flect!.words.find((w) => w.w === 'Reflect')!;
    expect(quizGloss(thought.d)).toBe('To think a moment about what happened');
    expect(thought.d).toContain('bend');
    expect(quizGloss(thought.d)!.toLowerCase()).not.toContain('bend');

    const wrist = by.Puls!.words.find((w) => w.w === 'Pulse')!;
    expect(quizGloss(wrist.d)).toBe('The throb at your wrist');
    expect(wrist.d).toContain('driving');
    expect(quizGloss(wrist.d)!.toLowerCase()).not.toContain('drive');

    const thoughtOut = by.Press!.words.find((w) => w.w === 'Express')!;
    expect(quizGloss(thoughtOut.d)).toBe('To let a thought out');
    expect(thoughtOut.d).toContain('squeeze');
    expect(quizGloss(thoughtOut.d)!.toLowerCase()).not.toContain('squeeze');

    const still = by.Sed!.words.find((w) => w.w === 'Sedentary')!;
    expect(quizGloss(still.d)).toBe('Mostly still, for hours at a stretch');
    expect(still.d).toContain('sitting');
    expect(quizGloss(still.d)!.toLowerCase()).not.toContain('sit');

    const desk = by.Cub!.words.find((w) => w.w === 'Cubicle')!;
    expect(quizGloss(desk.d)).toBe('A walled-off desk space');
    expect(desk.d).toContain('lying');
    expect(quizGloss(desk.d)!.toLowerCase()).not.toContain('lie');

    const chair = by.Clin!.words.find((w) => w.w === 'Recline')!;
    expect(quizGloss(chair.d)).toBe('To rest tilted in a chair');
    expect(chair.d).toContain('lean');
    expect(quizGloss(chair.d)!.toLowerCase()).not.toContain('lean');

    const no = by.Clin!.words.find((w) => w.w === 'Decline')!;
    expect(quizGloss(no.d)).toBe('To refuse an offer');
    expect(no.d).toContain('lean');
    expect(quizGloss(no.d)!.toLowerCase()).not.toContain('lean');

    const room = by.Clin!.words.find((w) => w.w === 'Clinic')!;
    expect(quizGloss(room.d)).toBe('A room for medical care');
    expect(room.d).toContain('lean');
    expect(quizGloss(room.d)!.toLowerCase()).not.toContain('lean');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('run', 'A flow of water or electricity')).toBe(false);
    expect(glossSaysMean('run', 'A mark that travels on a screen')).toBe(false);
    expect(glossSaysMean('run', 'A short pleasure trip')).toBe(false);
    expect(glossSaysMean('run', 'A running')).toBe(true);
    expect(glossSaysMean('walk', 'A van for the injured on the way to a hospital')).toBe(false);
    expect(glossSaysMean('walk', 'Able to get about without help')).toBe(false);
    expect(glossSaysMean('walk', 'To travel all over a place')).toBe(false);
    expect(glossSaysMean('walk', 'A walk')).toBe(true);
    expect(glossSaysMean('leap', 'What an effort leaves you with')).toBe(false);
    expect(glossSaysMean('leap', 'To ask someone for advice')).toBe(false);
    expect(glossSaysMean('leap', 'A rude remark meant to hurt')).toBe(false);
    expect(glossSaysMean('leap', 'A leap')).toBe(true);
    expect(glossSaysMean('fall', 'Water spilling in sheets on rocks')).toBe(false);
    expect(glossSaysMean('fall', 'A steady beat in music or marching')).toBe(false);
    expect(glossSaysMean('fall', 'An unplanned mishap')).toBe(false);
    expect(glossSaysMean('fall', 'A fall')).toBe(true);
    expect(glossSaysMean('slip', 'A gap where attention drops')).toBe(false);
    expect(glossSaysMean('slip', 'To crumple inward')).toBe(false);
    expect(glossSaysMean('slip', 'To pass, as hours do')).toBe(false);
    expect(glossSaysMean('slip', 'A slip')).toBe(true);
    expect(glossSaysMean('stray', 'A mistake')).toBe(false);
    expect(glossSaysMean('stray', 'Not keeping to a steady path')).toBe(false);
    expect(glossSaysMean('stray', 'Not matching the facts')).toBe(false);
    expect(glossSaysMean('stray', 'To stray')).toBe(true);
    expect(glossSaysMean('bend', 'To think a moment about what happened')).toBe(false);
    expect(glossSaysMean('bend', 'To knock something off its path')).toBe(false);
    expect(glossSaysMean('bend', 'To change the rise and drop of a tone')).toBe(false);
    expect(glossSaysMean('bend', 'A bend')).toBe(true);
    expect(glossSaysMean('drive', 'The throb at your wrist')).toBe(false);
    expect(glossSaysMean('drive', 'A sudden urge to act')).toBe(false);
    expect(glossSaysMean('drive', 'The push behind a rocket or a boat')).toBe(false);
    expect(glossSaysMean('drive', 'A drive')).toBe(true);
    expect(glossSaysMean('squeeze', 'To let a thought out')).toBe(false);
    expect(glossSaysMean('squeeze', 'A steady push on a surface')).toBe(false);
    expect(glossSaysMean('squeeze', 'To pack into less space')).toBe(false);
    expect(glossSaysMean('squeeze', 'A squeeze')).toBe(true);
    expect(glossSaysMean('press', 'A steady push on a surface')).toBe(false);
    expect(glossSaysMean('sit', 'Mostly still, for hours at a stretch')).toBe(false);
    expect(glossSaysMean('sit', 'Bits that settle at the bottom')).toBe(false);
    expect(glossSaysMean('sit', 'Quiet and slow')).toBe(false);
    expect(glossSaysMean('sit', 'A sit')).toBe(true);
    expect(glossSaysMean('lie', 'To keep eggs warm until they hatch')).toBe(false);
    expect(glossSaysMean('lie', 'A machine that keeps eggs warm')).toBe(false);
    expect(glossSaysMean('lie', 'A walled-off desk space')).toBe(false);
    expect(glossSaysMean('lie', 'To lie down')).toBe(true);
    expect(glossSaysMean('lean', 'To rest tilted in a chair')).toBe(false);
    expect(glossSaysMean('lean', 'To refuse an offer')).toBe(false);
    expect(glossSaysMean('lean', 'A room for medical care')).toBe(false);
    expect(glossSaysMean('lean', 'A lean')).toBe(true);
  });

  it('keeps the meaning off the intro and teaches it after the answer', () => {
    for (const name of PACE_POSE) {
      const root = by[name]!;
      const lang = name === 'Clin' ? 'Latin and Greek' : 'Latin';
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
    expect(speakablePronunciation('KUR')).toBe('kur');
    expect(speakablePronunciation('AM-bul')).toBe('am bul');
    expect(speakablePronunciation('SULT')).toBe('sult');
    expect(speakablePronunciation('KAD')).toBe('kad');
    expect(speakablePronunciation('LAPS')).toBe('laps');
    expect(speakablePronunciation('AIR')).toBe('air');
    expect(speakablePronunciation('FLEKT')).toBe('flekt');
    expect(speakablePronunciation('PULS')).toBe('puls');
    expect(speakablePronunciation('PRESS')).toBe('press');
    expect(speakablePronunciation('SED')).toBe('sed');
    expect(speakablePronunciation('KUB')).toBe('kub');
    expect(speakablePronunciation('KLINE')).toBe('kline');
    expect(utteranceText('Err', 'AIR')).toBe(
      `Err. ${HEAR_BEAT_PAUSE} air. ${HEAR_BEAT_PAUSE} The letters E. R. R.`,
    );
    expect(yesUtteranceText('Press', 'squeeze')).toBe('Yes — Press means squeeze.');
  });

  it('lets a family find the new school words and the new meanings', () => {
    const hits: Array<[string, string]> = [
      ['current', 'Curr'],
      ['cursor', 'Curr'],
      ['excursion', 'Curr'],
      ['ambulance', 'Ambul'],
      ['perambulate', 'Ambul'],
      ['result', 'Sult'],
      ['consult', 'Sult'],
      ['insult', 'Sult'],
      ['cascade', 'Cad'],
      ['cadence', 'Cad'],
      ['accident', 'Cad'],
      ['lapse', 'Laps'],
      ['collapse', 'Laps'],
      ['elapse', 'Laps'],
      ['error', 'Err'],
      ['erratic', 'Err'],
      ['reflect', 'Flect'],
      ['deflect', 'Flect'],
      ['pulse', 'Puls'],
      ['impulse', 'Puls'],
      ['propulsion', 'Puls'],
      ['express', 'Press'],
      ['pressure', 'Press'],
      ['compress', 'Press'],
      ['sedentary', 'Sed'],
      ['sediment', 'Sed'],
      ['incubate', 'Cub'],
      ['cubicle', 'Cub'],
      ['recline', 'Clin'],
      ['decline', 'Clin'],
      ['clinic', 'Clin'],
      ['run', 'Curr'],
      ['walk', 'Ambul'],
      ['leap', 'Sult'],
      ['fall', 'Cad'],
      ['slip', 'Laps'],
      ['stray', 'Err'],
      ['bend', 'Flect'],
      ['drive', 'Puls'],
      ['squeeze', 'Press'],
      ['repose', 'Cub'],
      ['slant', 'Clin'],
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

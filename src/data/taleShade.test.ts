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
 * Tale & Shade — a locked Starter set for a tale, a greeting, and the shade.
 * Meanings follow the classical forms.
 * A narrative is a told account; the tale sits after the dash.
 * A fable is a short animal story; the legend sits after the dash.
 * Laudable is fit for kind words; the praise sits after the dash.
 * Aud already owns the letters aud, so the word is not Applaud.
 * Implore is begging for help; the weep sits after the dash.
 * Cry sits inside outcry, so Plor means weep.
 * A query is a line aimed at someone; the search sits after the dash.
 * Sequ's say holds the letters seek, and "questions" would say quest, so Quer means search.
 * Enunciate sets off each part of a word; the message sits after the dash.
 * A salute is a formal hello; the greeting sits after the dash.
 * Sal already owns the letters sal, so a search for sal is not Sal alone.
 * Similar is near in appearance; the likeness sits after the dash.
 * A scale is a run of notes; the ladder sits after the dash.
 * A clavicle is the slim support across the chest; the key sits after the dash.
 * Foliage is blades on a bush; the leaf sits after the dash.
 * Dendr already owns tree, so Foli means leaf.
 * An umbrella is a canopy in the rain; the shade sits after the dash.
 * Inundate already holds the letters nun, so a search for nun is not Nunci alone.
 * Implore leaves im bare — the catalog's in is not in the spelling.
 * Escalate leaves e bare — the catalog's e means "out".
 * Conquer leaves con bare — the catalog's con means "together".
 * Assimilate leaves as bare — the catalog's ad is not in the spelling.
 * Defoliate leaves de bare — the same way Deserve does.
 * Leaves says leaf, and wept says weep, so a hint cannot offer them as a different idea.
 */
const TALE_SHADE = [
  'Narr',
  'Fab',
  'Laud',
  'Plor',
  'Quer',
  'Nunci',
  'Salut',
  'Simil',
  'Scal',
  'Clav',
  'Foli',
  'Umbra',
] as const;

const MEANINGS: Record<(typeof TALE_SHADE)[number], string> = {
  Narr: 'tale',
  Fab: 'legend',
  Laud: 'praise',
  Plor: 'weep',
  Quer: 'search',
  Nunci: 'message',
  Salut: 'greeting',
  Simil: 'likeness',
  Scal: 'ladder',
  Clav: 'key',
  Foli: 'leaf',
  Umbra: 'shade',
};

const SCENES: Record<(typeof TALE_SHADE)[number], string> = {
  Narr: 'tale',
  Fab: 'legend',
  Laud: 'praise',
  Plor: 'weep',
  Quer: 'search',
  Nunci: 'message',
  Salut: 'greeting',
  Simil: 'likeness',
  Scal: 'ladder',
  Clav: 'key',
  Foli: 'leaf',
  Umbra: 'shade',
};

/** First clause the feedback says after the kid answers. */
const WORD_INTRO: Record<string, string> = {
  Narrative: 'Narrative means a told account of what happened.',
  Narrator: 'Narrator means the person who tells an account.',
  Narration: 'Narration means the telling of an account from start to end.',
  Fable: 'Fable means a short animal story with a lesson.',
  Fabulous: 'Fabulous means amazing in a wild way.',
  Confabulate: 'Confabulate means to invent a shared story with someone.',
  Laudable: 'Laudable means fit for kind words from other people.',
  Laudatory: 'Laudatory means full of kind remarks about someone.',
  Laudation: 'Laudation means a speech of warm remarks for someone.',
  Implore: 'Implore means to beg someone hard for help.',
  Deplore: 'Deplore means to feel that something is deeply wrong.',
  Explore: 'Explore means to range over a place you do not know.',
  Query: 'Query means a line aimed at someone to learn more.',
  Querulous: 'Querulous means quick to complain about small things.',
  Conquer: 'Conquer means to gain control after a hard effort.',
  Enunciate: 'Enunciate means to set off each part of a word so others catch it.',
  Pronunciation: 'Pronunciation means how a spelling is said aloud.',
  Nuncio: 'Nuncio means an official who brings news from another country.',
  Salute: 'Salute means a formal hello to someone you meet.',
  Salutation: 'Salutation means the hello at the start of a note.',
  Salutatorian: 'Salutatorian means the student known for the opening speech.',
  Similar: 'Similar means near in appearance to something else.',
  Simile: 'Simile means a comparison that treats one thing as another.',
  Assimilate: 'Assimilate means to blend in until you match the group.',
  Scale: 'Scale means a series of musical notes from soft to bright.',
  Escalate: 'Escalate means to become more serious bit by bit.',
  Escalator: 'Escalator means a staircase inside a building for riding upward.',
  Clavicle: 'Clavicle means the slim support along the top of the chest.',
  Enclave: 'Enclave means a district surrounded by another.',
  Conclave: 'Conclave means a private meeting held in secret.',
  Foliage: 'Foliage means the mass of blades on a bush.',
  Folio: 'Folio means a paper sheet in a bound volume.',
  Defoliate: 'Defoliate means to strip the blades off a bush.',
  Umbrella: 'Umbrella means a canopy you open in the rain.',
  Adumbrate: 'Adumbrate means to hint at an outline without filling it in.',
  Penumbra: 'Penumbra means the pale rim of a dark patch.',
};

describe('Tale & Shade starter set', () => {
  const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));

  it('adds twelve locked Starter roots after Ord and before Auto', () => {
    expect(TALE_SHADE).toHaveLength(12);
    const ord = ROOTS.findIndex((r) => r.root === 'Ord');
    const auto = ROOTS.findIndex((r) => r.root === 'Auto');
    expect(ord).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(ord);
    let prev = ord;
    for (const name of TALE_SHADE) {
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
    expect(by.Narr!.org).toBe('Latin narrāre');
    expect(by.Fab!.org).toBe('Latin fābula');
    expect(by.Laud!.org).toBe('Latin laudāre');
    expect(by.Plor!.org).toBe('Latin plōrāre');
    expect(by.Quer!.org).toBe('Latin quaerere');
    expect(by.Nunci!.org).toBe('Latin nuntius');
    expect(by.Salut!.org).toBe('Latin salūtāre');
    expect(by.Simil!.org).toBe('Latin similis');
    expect(by.Scal!.org).toBe('Latin scāla');
    expect(by.Clav!.org).toBe('Latin clāvis');
    expect(by.Foli!.org).toBe('Latin folium');
    expect(by.Umbra!.org).toBe('Latin umbra');

    expect(by.Fab!.words.find((w) => w.w === 'Confabulate')!.b).toBe('con (together) + fab (legend)');
    expect(by.Struct!.words.find((w) => w.w === 'Construct')!.b).toContain('con (together)');
    expect(by.Plor!.words.find((w) => w.w === 'Explore')!.b).toBe('ex (out) + plor (weep)');
    expect(by.Curr!.words.find((w) => w.w === 'Excursion')!.b).toContain('ex (out)');
    expect(by.Plor!.words.find((w) => w.w === 'Deplore')!.b).toBe('de + plor (weep)');
    expect(by.Termin!.words.find((w) => w.w === 'Determine')!.b).toContain('de +');
    expect(by.Nunci!.words.find((w) => w.w === 'Enunciate')!.b).toBe('e (out) + nunci (message)');
    expect(by.Long!.words.find((w) => w.w === 'Elongate')!.b).toContain('e (out)');
    expect(by.Nunci!.words.find((w) => w.w === 'Pronunciation')!.b).toBe('pro (forward) + nunci (message)');
    expect(by.Long!.words.find((w) => w.w === 'Prolong')!.b).toContain('pro (forward)');
    expect(by.Clav!.words.find((w) => w.w === 'Conclave')!.b).toBe('con (together) + clav (key)');
    expect(by.Foli!.words.find((w) => w.w === 'Defoliate')!.b).toBe('de + foli (leaf)');
    expect(by.Serv!.words.find((w) => w.w === 'Deserve')!.b).toContain('de +');
    expect(by.Simil!.words.find((w) => w.w === 'Assimilate')!.b).toBe('as + simil (likeness)');
    expect(by.Prob!.words.find((w) => w.w === 'Approve')!.b).toContain('ap +');
    expect(by.Plor!.words.find((w) => w.w === 'Implore')!.b).toBe('im + plor (weep)');
    expect(by.Scal!.words.find((w) => w.w === 'Escalate')!.b).toBe('e + scal (ladder)');
    expect(by.Quer!.words.find((w) => w.w === 'Conquer')!.b).toBe('con + quer (search)');
    expect(by.Clam!.alt).toBe('outcry');
    expect(by.Plor!.mean).not.toBe('cry');
    expect(by.Dendr!.mean).toBe('tree');
    expect(by.Foli!.mean).not.toBe('tree');
    expect(by.Aud!.root).toBe('Aud');
    expect(by.Laud!.words.map((w) => w.w)).not.toContain('Applaud');
    expect(by.Sequ!.say).toBe('SEE-kwuh');
    expect(by.Quer!.mean).not.toBe('seek');
    expect(by.Quer!.mean).not.toBe('quest');
  });

  it('keeps the everyday clause in the quiz and the root meaning after the dash', () => {
    const account = by.Narr!.words.find((w) => w.w === 'Narrative')!;
    expect(quizGloss(account.d)).toBe('A told account of what happened');
    expect(account.d).toContain('tale');
    expect(quizGloss(account.d)!.toLowerCase()).not.toContain('tale');

    const animal = by.Fab!.words.find((w) => w.w === 'Fable')!;
    expect(quizGloss(animal.d)).toBe('A short animal story with a lesson');
    expect(animal.d).toContain('legend');
    expect(quizGloss(animal.d)!.toLowerCase()).not.toContain('legend');

    const kind = by.Laud!.words.find((w) => w.w === 'Laudable')!;
    expect(quizGloss(kind.d)).toBe('Fit for kind words from other people');
    expect(kind.d).toContain('praise');
    expect(quizGloss(kind.d)!.toLowerCase()).not.toContain('praise');

    const beg = by.Plor!.words.find((w) => w.w === 'Implore')!;
    expect(quizGloss(beg.d)).toBe('To beg someone hard for help');
    expect(beg.d).toContain('weep');
    expect(quizGloss(beg.d)!.toLowerCase()).not.toContain('weep');

    const line = by.Quer!.words.find((w) => w.w === 'Query')!;
    expect(quizGloss(line.d)).toBe('A line aimed at someone to learn more');
    expect(line.d).toContain('search');
    expect(quizGloss(line.d)!.toLowerCase()).not.toContain('search');

    const parts = by.Nunci!.words.find((w) => w.w === 'Enunciate')!;
    expect(quizGloss(parts.d)).toBe('To set off each part of a word so others catch it');
    expect(parts.d).toContain('message');
    expect(quizGloss(parts.d)!.toLowerCase()).not.toContain('message');

    const hello = by.Salut!.words.find((w) => w.w === 'Salute')!;
    expect(quizGloss(hello.d)).toBe('A formal hello to someone you meet');
    expect(hello.d).toContain('greeting');
    expect(quizGloss(hello.d)!.toLowerCase()).not.toContain('greeting');

    const near = by.Simil!.words.find((w) => w.w === 'Similar')!;
    expect(quizGloss(near.d)).toBe('Near in appearance to something else');
    expect(near.d).toContain('likeness');
    expect(quizGloss(near.d)!.toLowerCase()).not.toContain('likeness');

    const notes = by.Scal!.words.find((w) => w.w === 'Scale')!;
    expect(quizGloss(notes.d)).toBe('A series of musical notes from soft to bright');
    expect(notes.d).toContain('ladder');
    expect(quizGloss(notes.d)!.toLowerCase()).not.toContain('ladder');

    const chest = by.Clav!.words.find((w) => w.w === 'Clavicle')!;
    expect(quizGloss(chest.d)).toBe('The slim support along the top of the chest');
    expect(chest.d).toContain('key');
    expect(quizGloss(chest.d)!.toLowerCase()).not.toContain('key');

    const blades = by.Foli!.words.find((w) => w.w === 'Foliage')!;
    expect(quizGloss(blades.d)).toBe('The mass of blades on a bush');
    expect(blades.d).toContain('leaf');
    expect(quizGloss(blades.d)!.toLowerCase()).not.toContain('leaf');

    const canopy = by.Umbra!.words.find((w) => w.w === 'Umbrella')!;
    expect(quizGloss(canopy.d)).toBe('A canopy you open in the rain');
    expect(canopy.d).toContain('shade');
    expect(quizGloss(canopy.d)!.toLowerCase()).not.toContain('shade');
  });

  it('does not let another name of the meaning sit as a rival answer', () => {
    expect(glossSaysMean('tale', 'A told account of what happened')).toBe(false);
    expect(glossSaysMean('tale', 'The person who tells an account')).toBe(false);
    expect(glossSaysMean('tale', 'The telling of an account from start to end')).toBe(false);
    expect(glossSaysMean('tale', 'A tale')).toBe(true);
    expect(glossSaysMean('legend', 'A short animal story with a lesson')).toBe(false);
    expect(glossSaysMean('legend', 'Amazing in a wild way')).toBe(false);
    expect(glossSaysMean('legend', 'To invent a shared story with someone')).toBe(false);
    expect(glossSaysMean('legend', 'A legend')).toBe(true);
    expect(glossSaysMean('praise', 'Fit for kind words from other people')).toBe(false);
    expect(glossSaysMean('praise', 'Full of kind remarks about someone')).toBe(false);
    expect(glossSaysMean('praise', 'A speech of warm remarks for someone')).toBe(false);
    expect(glossSaysMean('praise', 'In praise')).toBe(true);
    expect(glossSaysMean('weep', 'To beg someone hard for help')).toBe(false);
    expect(glossSaysMean('weep', 'To feel that something is deeply wrong')).toBe(false);
    expect(glossSaysMean('weep', 'To range over a place you do not know')).toBe(false);
    expect(glossSaysMean('weep', 'To weep')).toBe(true);
    expect(glossSaysMean('weep', 'She wept')).toBe(true);
    expect(glossSaysMean('cry', 'To beg someone hard for help')).toBe(false);
    expect(glossSaysMean('search', 'A line aimed at someone to learn more')).toBe(false);
    expect(glossSaysMean('search', 'Quick to complain about small things')).toBe(false);
    expect(glossSaysMean('search', 'To gain control after a hard effort')).toBe(false);
    expect(glossSaysMean('search', 'A search')).toBe(true);
    expect(glossSaysMean('seek', 'A line aimed at someone to learn more')).toBe(false);
    expect(glossSaysMean('quest', 'Show the questions')).toBe(true);
    expect(glossSaysMean('message', 'To set off each part of a word so others catch it')).toBe(false);
    expect(glossSaysMean('message', 'How a spelling is said aloud')).toBe(false);
    expect(glossSaysMean('message', 'An official who brings news from another country')).toBe(false);
    expect(glossSaysMean('message', 'A message')).toBe(true);
    expect(glossSaysMean('greeting', 'A formal hello to someone you meet')).toBe(false);
    expect(glossSaysMean('greeting', 'The hello at the start of a note')).toBe(false);
    expect(glossSaysMean('greeting', 'The student known for the opening speech')).toBe(false);
    expect(glossSaysMean('greeting', 'A greeting')).toBe(true);
    expect(glossSaysMean('likeness', 'Near in appearance to something else')).toBe(false);
    expect(glossSaysMean('likeness', 'A comparison that treats one thing as another')).toBe(false);
    expect(glossSaysMean('likeness', 'To blend in until you match the group')).toBe(false);
    expect(glossSaysMean('likeness', 'A likeness')).toBe(true);
    expect(glossSaysMean('ladder', 'A series of musical notes from soft to bright')).toBe(false);
    expect(glossSaysMean('ladder', 'To become more serious bit by bit')).toBe(false);
    expect(glossSaysMean('ladder', 'A staircase inside a building for riding upward')).toBe(false);
    expect(glossSaysMean('ladder', 'A ladder')).toBe(true);
    expect(glossSaysMean('key', 'The slim support along the top of the chest')).toBe(false);
    expect(glossSaysMean('key', 'A district surrounded by another')).toBe(false);
    expect(glossSaysMean('key', 'A private meeting held in secret')).toBe(false);
    expect(glossSaysMean('key', 'A key')).toBe(true);
    expect(glossSaysMean('leaf', 'The mass of blades on a bush')).toBe(false);
    expect(glossSaysMean('leaf', 'A paper sheet in a bound volume')).toBe(false);
    expect(glossSaysMean('leaf', 'To strip the blades off a bush')).toBe(false);
    expect(glossSaysMean('leaf', 'A leaf')).toBe(true);
    expect(glossSaysMean('leaf', 'A mass of leaves')).toBe(true);
    expect(glossSaysMean('tree', 'The mass of blades on a bush')).toBe(false);
    expect(glossSaysMean('shade', 'A canopy you open in the rain')).toBe(false);
    expect(glossSaysMean('shade', 'To hint at an outline without filling it in')).toBe(false);
    expect(glossSaysMean('shade', 'The pale rim of a dark patch')).toBe(false);
    expect(glossSaysMean('shade', 'In the shade')).toBe(true);
  });

  it('keeps the meaning off the intro and teaches it after the answer', () => {
    for (const name of TALE_SHADE) {
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
    expect(speakablePronunciation('NAIR')).toBe('nair');
    expect(speakablePronunciation('FAB')).toBe('fab');
    expect(speakablePronunciation('LAUD')).toBe('laud');
    expect(speakablePronunciation('PLOR')).toBe('plor');
    expect(speakablePronunciation('KWEER')).toBe('kweer');
    expect(speakablePronunciation('NUN-see')).toBe('nun see');
    expect(speakablePronunciation('suh-LOOT')).toBe('suh loot');
    expect(speakablePronunciation('SIM-il')).toBe('sim il');
    expect(speakablePronunciation('SKAL')).toBe('skal');
    expect(speakablePronunciation('KLAV')).toBe('klav');
    expect(speakablePronunciation('FOH-lee')).toBe('foe lee');
    expect(speakablePronunciation('UM-bruh')).toBe('um bruh');
    expect(utteranceText('Narr', 'NAIR')).toBe(
      `Narr. ${HEAR_BEAT_PAUSE} nair. ${HEAR_BEAT_PAUSE} The letters N. A. R. R.`,
    );
    expect(utteranceText('Foli', 'FOH-lee')).toBe(
      `Foli. ${HEAR_BEAT_PAUSE} foe lee. ${HEAR_BEAT_PAUSE} The letters F. O. L. I.`,
    );
    expect(yesUtteranceText('Narr', 'tale')).toBe('Yes — Narr means tale.');
  });

  it('lets a family find the new school words and the new meanings', () => {
    const hits: Array<[string, string]> = [
      ['narrative', 'Narr'],
      ['narrator', 'Narr'],
      ['narration', 'Narr'],
      ['fable', 'Fab'],
      ['fabulous', 'Fab'],
      ['confabulate', 'Fab'],
      ['laudable', 'Laud'],
      ['laudatory', 'Laud'],
      ['laudation', 'Laud'],
      ['implore', 'Plor'],
      ['deplore', 'Plor'],
      ['explore', 'Plor'],
      ['query', 'Quer'],
      ['querulous', 'Quer'],
      ['conquer', 'Quer'],
      ['enunciate', 'Nunci'],
      ['pronunciation', 'Nunci'],
      ['nuncio', 'Nunci'],
      ['salute', 'Salut'],
      ['salutation', 'Salut'],
      ['salutatorian', 'Salut'],
      ['similar', 'Simil'],
      ['simile', 'Simil'],
      ['assimilate', 'Simil'],
      ['scale', 'Scal'],
      ['escalate', 'Scal'],
      ['escalator', 'Scal'],
      ['clavicle', 'Clav'],
      ['enclave', 'Clav'],
      ['conclave', 'Clav'],
      ['foliage', 'Foli'],
      ['folio', 'Foli'],
      ['defoliate', 'Foli'],
      ['umbrella', 'Umbra'],
      ['adumbrate', 'Umbra'],
      ['penumbra', 'Umbra'],
      ['tale', 'Narr'],
      ['legend', 'Fab'],
      ['praise', 'Laud'],
      ['weep', 'Plor'],
      ['search', 'Quer'],
      ['message', 'Nunci'],
      ['greeting', 'Salut'],
      ['likeness', 'Simil'],
      ['ladder', 'Scal'],
      ['key', 'Clav'],
      ['leaf', 'Foli'],
      ['shade', 'Umbra'],
      ['recount', 'Narr'],
      ['myth', 'Fab'],
      ['commend', 'Laud'],
      ['sob', 'Plor'],
      ['inquiry', 'Quer'],
      ['dispatch', 'Nunci'],
      ['hail', 'Salut'],
      ['resemblance', 'Simil'],
      ['stile', 'Scal'],
      ['latch', 'Clav'],
      ['frond', 'Foli'],
      ['shadow', 'Umbra'],
      ['narr', 'Narr'],
      ['fab', 'Fab'],
      ['laud', 'Laud'],
      ['plor', 'Plor'],
      ['quer', 'Quer'],
      ['nunci', 'Nunci'],
      ['salut', 'Salut'],
      ['simil', 'Simil'],
      ['scal', 'Scal'],
      ['clav', 'Clav'],
      ['foli', 'Foli'],
      ['umbra', 'Umbra'],
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

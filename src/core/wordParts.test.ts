import { describe, expect, it } from 'vitest';
import { mulberry32 } from './daily';
import { spellsChoice } from './promptFace';
import { ROOTS } from '../data/roots';
import {
  buildAsk,
  buildBig,
  buildMissLine,
  buildPicksForRoot,
  buildTeach,
  buildYesLine,
  wordMissLine,
  wordYesLine,
  otherPartsForRoot,
  parseWordSplit,
  partAsk,
  partMeanLabels,
  partMissLine,
  partTeach,
  partYesLine,
  pickPartDistractors,
  samePieceIdea,
  pieceMatchesRoot,
  usablePartMean,
} from './wordParts';

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const aqua = ROOTS.find((r) => r.root === 'Aqua')!;
const tri = ROOTS.find((r) => r.root === 'Tri')!;
const graph = ROOTS.find((r) => r.root === 'Graph')!;

describe('parseWordSplit', () => {
  it('reads the authored pieces and does not invent a bare meaning', () => {
    expect(parseWordSplit('bio (life) + -logy (study of)')).toEqual([
      { letters: 'bio', mean: 'life' },
      { letters: '-logy', mean: 'study of' },
    ]);
    expect(parseWordSplit('tri (three) + angle')).toEqual([
      { letters: 'tri', mean: 'three' },
      { letters: 'angle', mean: null },
    ]);
    expect(parseWordSplit('fort (strong)')).toEqual([{ letters: 'fort', mean: 'strong' }]);
  });

  it('parses every catalog split', () => {
    for (const root of ROOTS) {
      for (const word of root.words) {
        const pieces = parseWordSplit(word.b);
        expect(pieces.length, word.b).toBeGreaterThan(0);
        expect(pieces.map((p) => p.letters).join(' + ').length, word.b).toBeGreaterThan(0);
      }
    }
  });
});

describe('other part of a school word', () => {
  it('matches the root by highlight when the spelling drifts (Aque / Aqua)', () => {
    expect(pieceMatchesRoot('aque', 'Aqua', 'Aque')).toBe(true);
    expect(pieceMatchesRoot('duct', 'Aqua', 'Aque')).toBe(false);
    expect(pieceMatchesRoot('-logy', 'Bio', 'Bio')).toBe(false);
  });

  it('asks the other piece of Biology — not bio, and not a bare angle', () => {
    const parts = otherPartsForRoot(bio);
    expect(parts.map((p) => p.letters)).toEqual(['-logy', '-graphy', 'degrad']);
    expect(parts.map((p) => p.mean)).toEqual(['study of', 'writing', 'break down']);
    expect(parts.some((p) => p.mean === bio.mean)).toBe(false);

    const triangle = tri.words.find((w) => w.w === 'Triangle')!;
    expect(otherPartsForRoot(tri).some((p) => p.word === 'Triangle')).toBe(false);
    expect(usablePartMean(parseWordSplit(triangle.b)[1]?.mean)).toBeNull();

    const graphic = graph.words.find((w) => w.w === 'Graphic')!;
    expect(otherPartsForRoot(graph).some((p) => p.word === 'Graphic')).toBe(false);
    expect(graphic.b).toContain('(of)');
  });

  it('keeps Aqueduct’s other piece as duct (lead)', () => {
    const duct = otherPartsForRoot(aqua).find((p) => p.word === 'Aqueduct');
    expect(duct).toMatchObject({ letters: 'duct', mean: 'lead' });
  });

  it('does not ask a piece meaning the letters do not carry', () => {
    const banned: Array<[string, string, string]> = [
      ['Cent', 'Century', 'span'],
      ['Ped', 'Pedestal', 'stand'],
      ['Min', 'Minor', 'more'],
      ['Aud', 'Audience', 'people'],
      ['Terr', 'Terrain', 'nature of'],
      ['Voc', 'Vocabulary', 'collection'],
      ['Micro', 'Microbe', 'life'],
      ['Jur', 'Jury', 'people'],
      ['Odont', 'Mastodon', 'breast'],
      ['Dict', 'Dictionary', 'collection'],
      ['Min', 'Minimum', 'most'],
      ['Mar', 'Mariner', 'person'],
      ['Junct', 'Junction', 'place'],
      ['Fort', 'Fortress', 'place'],
      ['Terr', 'Terrace', 'place'],
      ['Junct', 'Juncture', 'point'],
    ];
    for (const [rootName, word, mean] of banned) {
      const root = ROOTS.find((item) => item.root === rootName);
      expect(root, rootName).toBeTruthy();
      const asked = otherPartsForRoot(root!).filter((part) => part.word === word);
      expect(asked.some((part) => part.mean.toLowerCase() === mean), `${word} ${mean}`).toBe(false);
    }
    const odont = ROOTS.find((item) => item.root === 'Odont')!;
    expect(otherPartsForRoot(odont).find((part) => part.word === 'Mastodon')).toMatchObject({
      letters: 'mast',
      mean: 'bump',
    });
    const cent = ROOTS.find((item) => item.root === 'Cent')!;
    const century = buildPicksForRoot(cent).find((pick) => pick.word === 'Century');
    expect(buildAsk(century!.split)).toBe('Which word is built from cent + -ury?');
    const superior = ROOTS.find((item) => item.root === 'Super')!;
    expect(otherPartsForRoot(superior).some((part) => part.mean === 'more')).toBe(true);
    const mar = ROOTS.find((item) => item.root === 'Mar')!;
    const mariner = buildPicksForRoot(mar).find((pick) => pick.word === 'Mariner');
    expect(buildAsk(mariner!.split)).toBe('Which word is built from mar + -er?');
    expect(otherPartsForRoot(mar).some((part) => part.word === 'Mariner')).toBe(false);
    const aquaPlace = otherPartsForRoot(ROOTS.find((item) => item.root === 'Aqua')!).find(
      (part) => part.word === 'Aquarium',
    );
    expect(aquaPlace).toMatchObject({ letters: '-arium', mean: 'place' });
  });

  it('copy names the piece, not the root', () => {
    expect(partAsk('Biology', '-logy')).toBe('In Biology, what does -logy mean?');
    expect(partAsk('Biology', '-logy')).not.toMatch(/What does Biology mean/);
    expect(partTeach('Biology', '-logy', 'study of', 'bio (life) + -logy (study of)')).toBe(
      '-logy means study of. Biology is built from bio (life) + -logy (study of).',
    );
    expect(partYesLine('-logy', 'study of')).toBe('Yes — -logy means study of.');
    expect(partYesLine('-logy', 'study of')).not.toMatch(/Bio means life/);
    expect(partMissLine('-logy', 'study of', 'Biology')).toBe(
      'Nope — in Biology, -logy means study of.',
    );
  });

  it('pools real piece meanings and drops glue glosses', () => {
    const labels = partMeanLabels(ROOTS);
    expect(labels).toContain('study of');
    expect(labels).toContain('life');
    expect(labels).not.toContain('of');
    expect(labels).not.toContain('do');
    expect(new Set(labels.map((l) => l.toLowerCase())).size).toBe(labels.length);
  });

  it('treats a gloss and its ending as one idea, and keeps a real rival', () => {
    expect(samePieceIdea('study of', 'study')).toBe(true);
    expect(samePieceIdea('writing', 'write')).toBe(true);
    expect(samePieceIdea('written', 'write')).toBe(true);
    expect(samePieceIdea('land', 'earth')).toBe(true);
    expect(samePieceIdea('ground', 'earth')).toBe(true);
    expect(samePieceIdea('meat', 'flesh')).toBe(true);
    expect(samePieceIdea('speech', 'speak')).toBe(true);
    expect(samePieceIdea('say', 'speak')).toBe(true);
    expect(samePieceIdea('voice', 'sound')).toBe(true);
    expect(samePieceIdea('voice/call', 'sound')).toBe(true);
    expect(samePieceIdea('little', 'small')).toBe(true);
    expect(samePieceIdea('tiny', 'small')).toBe(true);
    expect(samePieceIdea('strength', 'strong')).toBe(true);
    expect(samePieceIdea('belief', 'believe')).toBe(true);
    expect(samePieceIdea('belief', 'faith')).toBe(true);
    expect(samePieceIdea('feet', 'foot')).toBe(true);
    expect(samePieceIdea('big', 'large')).toBe(true);
    expect(samePieceIdea('watch', 'see')).toBe(true);
    expect(samePieceIdea('single', 'one')).toBe(true);
    expect(samePieceIdea('die', 'death')).toBe(true);
    expect(samePieceIdea('hot', 'heat')).toBe(true);
    expect(samePieceIdea('temperature', 'heat')).toBe(true);
    expect(samePieceIdea('temperature', 'hot')).toBe(true);
    expect(samePieceIdea('draw', 'write')).toBe(true);
    expect(samePieceIdea('record', 'written')).toBe(true);
    expect(samePieceIdea('call', 'voice')).toBe(true);
    expect(samePieceIdea('call', 'sound')).toBe(true);
    expect(samePieceIdea('form', 'shape')).toBe(true);
    expect(samePieceIdea('figure', 'shape')).toBe(true);
    expect(samePieceIdea('burst', 'break')).toBe(true);
    expect(samePieceIdea('shatter', 'break')).toBe(true);
    expect(samePieceIdea('evil', 'bad')).toBe(true);
    expect(samePieceIdea('wheel', 'circle')).toBe(true);
    expect(samePieceIdea('ring', 'circle')).toBe(true);
    expect(samePieceIdea('wise', 'wisdom')).toBe(true);
    expect(samePieceIdea('over', 'above')).toBe(true);
    expect(samePieceIdea('roll', 'turn')).toBe(true);
    expect(samePieceIdea('spin', 'turn')).toBe(true);
    expect(samePieceIdea('rock', 'stone')).toBe(true);
    expect(samePieceIdea('makes', 'make')).toBe(true);
    expect(samePieceIdea('placing', 'place')).toBe(true);
    expect(samePieceIdea('full of', 'fully')).toBe(true);
    expect(samePieceIdea('voice/call', 'voice')).toBe(true);
    expect(samePieceIdea('voice/call', 'call')).toBe(true);
    expect(samePieceIdea('thing that', 'thing')).toBe(true);
    expect(samePieceIdea('nature of', 'nature')).toBe(true);
    expect(samePieceIdea('break down', 'down')).toBe(false);
    expect(samePieceIdea('break down', 'break')).toBe(false);
    expect(samePieceIdea('break down', 'burst')).toBe(false);
    expect(samePieceIdea('break down', 'broken')).toBe(false);
    expect(samePieceIdea('back', 'again')).toBe(true);
    expect(samePieceIdea('trust', 'believe')).toBe(true);
    expect(samePieceIdea('built', 'build')).toBe(true);
    expect(samePieceIdea('spirit', 'life')).toBe(false);
    expect(samePieceIdea('touch', 'feel')).toBe(true);
    expect(samePieceIdea('carry', 'bear')).toBe(true);
    expect(samePieceIdea('body', 'flesh')).toBe(true);
    expect(samePieceIdea('nerve', 'brain')).toBe(true);
    expect(samePieceIdea('head', 'brain')).toBe(false);
    expect(samePieceIdea('lift', 'raise')).toBe(true);
    expect(samePieceIdea('lift', 'lighten')).toBe(true);
    expect(samePieceIdea('lift', 'light')).toBe(false);
    expect(samePieceIdea('free', 'loosen')).toBe(true);
    expect(samePieceIdea('chief', 'rule')).toBe(true);
    expect(samePieceIdea('ruler', 'rule')).toBe(true);
    expect(samePieceIdea('harsh', 'bad')).toBe(true);
    expect(samePieceIdea('well', 'good')).toBe(true);
    expect(samePieceIdea('distance', 'far')).toBe(true);
    expect(samePieceIdea('larger', 'large')).toBe(true);
    expect(samePieceIdea('bigger', 'big')).toBe(true);
    expect(samePieceIdea('thrown', 'throw')).toBe(true);
    expect(samePieceIdea('strange', 'stranger')).toBe(true);
    expect(samePieceIdea('strange', 'foreign')).toBe(true);
    expect(samePieceIdea('better', 'good')).toBe(true);
    expect(samePieceIdea('better', 'well')).toBe(true);
    expect(samePieceIdea('worst', 'bad')).toBe(true);
    expect(samePieceIdea('worst', 'harsh')).toBe(true);
    expect(samePieceIdea('sail', 'sailor')).toBe(true);
    expect(samePieceIdea('ship', 'sailor')).toBe(true);
    expect(samePieceIdea('kinship', 'sailor')).toBe(false);
    expect(samePieceIdea('worship', 'sailor')).toBe(false);
    expect(samePieceIdea('power', 'rule')).toBe(false);
    expect(samePieceIdea('beginning', 'rule')).toBe(false);
    expect(samePieceIdea('dead', 'death')).toBe(true);
    expect(samePieceIdea('dead', 'die')).toBe(true);
    expect(samePieceIdea('sight', 'see')).toBe(true);
    expect(samePieceIdea('sight', 'look')).toBe(true);
    expect(samePieceIdea('same', 'equal')).toBe(true);
    expect(samePieceIdea('through', 'across')).toBe(true);
    expect(samePieceIdea('yield', 'go')).toBe(true);
    expect(samePieceIdea('going', 'go')).toBe(true);
    expect(samePieceIdea('gone', 'go')).toBe(true);
    expect(samePieceIdea('underworld', 'earth')).toBe(true);
    expect(samePieceIdea('underworld', 'land')).toBe(true);
    expect(samePieceIdea('higher', 'above')).toBe(true);
    expect(samePieceIdea('higher', 'over')).toBe(true);
    expect(samePieceIdea('differ', 'different')).toBe(true);
    expect(samePieceIdea('difference', 'different')).toBe(true);
    expect(samePieceIdea('please', 'calm')).toBe(true);
    expect(samePieceIdea('limit', 'end')).toBe(true);
    expect(samePieceIdea('sacred', 'holy')).toBe(true);
    expect(samePieceIdea('fatherland', 'father')).toBe(true);
    expect(samePieceIdea('warlike', 'war')).toBe(true);
    expect(samePieceIdea('warlike', 'fight')).toBe(true);
    expect(samePieceIdea('dying', 'death')).toBe(true);
    expect(samePieceIdea('dying', 'die')).toBe(true);
    expect(samePieceIdea('dying', 'dead')).toBe(true);
    expect(samePieceIdea('lives', 'life')).toBe(true);
    expect(samePieceIdea('lives', 'living')).toBe(true);
    expect(samePieceIdea('natural', 'nature')).toBe(true);
    expect(samePieceIdea('judgment', 'judge')).toBe(true);
    expect(samePieceIdea('decision', 'judge')).toBe(true);
    expect(samePieceIdea('decision', 'decide')).toBe(true);
    expect(samePieceIdea('high', 'above')).toBe(true);
    expect(samePieceIdea('high', 'over')).toBe(true);
    expect(samePieceIdea('high', 'higher')).toBe(true);
    expect(samePieceIdea('high', 'lift')).toBe(false);
    expect(samePieceIdea('self', 'same')).toBe(false);
    expect(samePieceIdea('self', 'equal')).toBe(false);
    expect(samePieceIdea('level', 'equal')).toBe(false);
    expect(samePieceIdea('higher', 'lift')).toBe(false);
    expect(samePieceIdea('writing', 'record')).toBe(true);
    expect(samePieceIdea('writing', 'letter')).toBe(true);
    expect(samePieceIdea('writing', 'written')).toBe(true);
    expect(samePieceIdea('letter', 'write')).toBe(true);
    expect(samePieceIdea('alone', 'one')).toBe(true);
    expect(samePieceIdea('alone', 'single')).toBe(true);
    expect(samePieceIdea('closed', 'shut')).toBe(true);
    expect(samePieceIdea('close', 'shut')).toBe(false);
    expect(samePieceIdea('world', 'universe')).toBe(true);
    expect(samePieceIdea('underworld', 'world')).toBe(false);
    expect(samePieceIdea('art', 'skill')).toBe(true);
    expect(samePieceIdea('craft', 'skill')).toBe(true);
    expect(samePieceIdea('putting together', 'together')).toBe(false);
    expect(samePieceIdea('without', 'with')).toBe(false);
    expect(samePieceIdea('underworld', 'under')).toBe(false);
    expect(samePieceIdea('remove', 'move')).toBe(false);
    expect(samePieceIdea('particle', 'part')).toBe(false);
    expect(samePieceIdea('actor', 'act')).toBe(true);
    expect(samePieceIdea('actor', 'acting')).toBe(true);
    expect(samePieceIdea('acting', 'act')).toBe(true);
    expect(samePieceIdea('forward', 'forth')).toBe(true);
    expect(samePieceIdea('joint', 'join')).toBe(true);
    expect(samePieceIdea('joint', 'together')).toBe(false);
    expect(samePieceIdea('person', 'people')).toBe(true);
    expect(samePieceIdea('can be', 'able to be')).toBe(true);
    expect(samePieceIdea('view', 'see')).toBe(true);
    expect(samePieceIdea('view', 'look')).toBe(true);
    expect(samePieceIdea('view', 'watch')).toBe(true);
    expect(samePieceIdea('human', 'people')).toBe(false);
    expect(samePieceIdea('human', 'person')).toBe(false);
    expect(samePieceIdea('doer', 'doing')).toBe(true);
    expect(samePieceIdea('doer', 'make')).toBe(false);
    expect(samePieceIdea('doing', 'make')).toBe(false);
    expect(samePieceIdea('doing', 'made')).toBe(false);
    expect(samePieceIdea('best', 'good')).toBe(true);
    expect(samePieceIdea('best', 'better')).toBe(true);
    expect(samePieceIdea('best', 'well')).toBe(true);
    expect(samePieceIdea('million', 'huge')).toBe(true);
    expect(samePieceIdea('million', 'great')).toBe(true);
    expect(samePieceIdea('million', 'large')).toBe(true);
    expect(samePieceIdea('healing', 'cure')).toBe(true);
    expect(samePieceIdea('grand', 'great')).toBe(true);
    expect(samePieceIdea('grand', 'large')).toBe(true);
    expect(samePieceIdea('words', 'study')).toBe(true);
    expect(samePieceIdea('words', 'study of')).toBe(true);
    expect(samePieceIdea('reason', 'word')).toBe(true);
    expect(samePieceIdea('reason', 'study')).toBe(true);
    expect(samePieceIdea('with', 'together')).toBe(true);
    expect(samePieceIdea('without', 'not')).toBe(true);
    expect(samePieceIdea('without', 'with')).toBe(false);
    expect(samePieceIdea('away', 'apart')).toBe(true);
    expect(samePieceIdea('not', 'apart')).toBe(false);
    expect(samePieceIdea('not', 'away')).toBe(false);
    expect(samePieceIdea('putting together', 'with')).toBe(false);
  });

  it('never deals study beside study of, and still deals a real rival', () => {
    for (const root of ROOTS) {
      for (const part of otherPartsForRoot(root)) {
        for (let seed = 0; seed < 6; seed++) {
          const distract = pickPartDistractors(
            [ROOTS],
            2,
            [part.mean, root.mean],
            mulberry32(seed),
          );
          expect(distract.length, `${part.word} ${part.letters}`).toBeGreaterThanOrEqual(1);
          for (const label of distract) {
            expect(samePieceIdea(label, part.mean), `${part.word}: ${label} ~ ${part.mean}`).toBe(
              false,
            );
            expect(samePieceIdea(label, root.mean), `${part.word}: ${label} ~ ${root.mean}`).toBe(
              false,
            );
          }
          expect(new Set(distract.map((label) => label.toLowerCase())).size).toBe(distract.length);
        }
      }
    }
    const beside = pickPartDistractors([ROOTS], 80, ['putting together'], () => 0);
    expect(beside).toContain('together');
    expect(beside).not.toContain('putting together');
    const study = pickPartDistractors([ROOTS], 80, ['study of'], () => 0);
    expect(study).not.toContain('study');
    expect(study).not.toContain('study of');
    const rivals: ReadonlyArray<readonly [string, string]> = [
      ['write', 'written'],
      ['sound', 'voice'],
      ['speech', 'speak'],
      ['speech', 'say'],
      ['little', 'small'],
      ['strength', 'strong'],
      ['belief', 'believe'],
      ['land', 'earth'],
      ['meat', 'flesh'],
      ['write', 'draw'],
      ['write', 'record'],
      ['sound', 'call'],
      ['voice', 'call'],
      ['shape', 'form'],
      ['break', 'burst'],
      ['bad', 'evil'],
      ['circle', 'wheel'],
      ['wisdom', 'wise'],
      ['above', 'over'],
      ['turn', 'roll'],
      ['turn', 'spin'],
      ['stone', 'rock'],
      ['heat', 'temperature'],
      ['again', 'back'],
      ['back', 'again'],
      ['believe', 'trust'],
      ['faith', 'trust'],
      ['memory', 'remember'],
      ['stranger', 'foreign'],
      ['force', 'power'],
      ['power', 'energy'],
      ['speak', 'spoken'],
      ['speak', 'talk'],
      ['build', 'built'],
      ['make', 'made'],
      ['sleep', 'asleep'],
      ['tooth', 'teeth'],
      ['truth', 'true'],
      ['beauty', 'beautiful'],
      ['tongue', 'language'],
      ['madness', 'craze'],
      ['between', 'among'],
      ['judge', 'decide'],
      ['wrong', 'badly'],
      ['flock', 'crowd'],
      ['place', 'put'],
      ['see', 'seen'],
      ['break', 'broken'],
      ['send', 'sent'],
      ['mind', 'spirit'],
      ['straight', 'correct'],
      ['touch', 'feel'],
      ['feel', 'touch'],
      ['carry', 'bear'],
      ['body', 'flesh'],
      ['body', 'meat'],
      ['nerve', 'brain'],
      ['all', 'every'],
      ['lift', 'raise'],
      ['writing', 'record'],
      ['writing', 'letter'],
      ['record', 'writing'],
      ['letter', 'writing'],
      ['alone', 'one'],
      ['one', 'alone'],
      ['closed', 'shut'],
      ['shut', 'closed'],
      ['world', 'universe'],
      ['universe', 'world'],
      ['art', 'skill'],
      ['skill', 'art'],
      ['craft', 'skill'],
      ['loosen', 'free'],
      ['free', 'loosen'],
      ['rule', 'chief'],
      ['chief', 'rule'],
      ['rule', 'ruler'],
      ['ruler', 'rule'],
      ['bad', 'harsh'],
      ['harsh', 'bad'],
      ['lift', 'lighten'],
      ['good', 'well'],
      ['far', 'distance'],
      ['sail', 'sailor'],
      ['sailor', 'sail'],
      ['earth', 'underworld'],
      ['underworld', 'earth'],
      ['equal', 'same'],
      ['same', 'equal'],
      ['across', 'through'],
      ['through', 'across'],
      ['calm', 'please'],
      ['please', 'calm'],
      ['end', 'limit'],
      ['limit', 'end'],
      ['holy', 'sacred'],
      ['sacred', 'holy'],
      ['father', 'fatherland'],
      ['fatherland', 'father'],
      ['strange', 'stranger'],
      ['stranger', 'strange'],
      ['strange', 'foreign'],
      ['high', 'above'],
      ['high', 'over'],
      ['above', 'high'],
      ['over', 'high'],
      ['act', 'actor'],
      ['act', 'acting'],
      ['actor', 'acting'],
      ['forth', 'forward'],
      ['join', 'joint'],
      ['people', 'person'],
      ['able to be', 'can be'],
      ['see', 'view'],
      ['look', 'view'],
      ['doer', 'doing'],
      ['doing', 'doer'],
      ['good', 'best'],
      ['best', 'good'],
      ['best', 'better'],
      ['great', 'million'],
      ['huge', 'million'],
      ['million', 'large'],
      ['healing', 'cure'],
      ['cure', 'healing'],
      ['words', 'study'],
      ['words', 'study of'],
      ['reason', 'study'],
      ['with', 'together'],
      ['together', 'with'],
      ['not', 'without'],
      ['without', 'not'],
      ['away', 'apart'],
      ['apart', 'away'],
    ];
    for (const [answer, rival] of rivals) {
      const tiles = pickPartDistractors([ROOTS], 400, [answer], () => 0);
      expect(tiles, answer).not.toContain(rival);
      expect(tiles.length, answer).toBeGreaterThan(10);
    }
    const write = pickPartDistractors([ROOTS], 400, ['write'], () => 0);
    expect(write).toContain('together');
    expect(write).toContain('down');
    const make = pickPartDistractors([ROOTS], 400, ['make'], () => 0);
    expect(make).toContain('doing');
    expect(make).not.toContain('doer');
    const mega = ROOTS.find((item) => item.root === 'Mega');
    expect(mega).toBeTruthy();
    expect(otherPartsForRoot(mega!).some((part) => part.word === 'Megabyte')).toBe(false);
    expect(otherPartsForRoot(mega!).some((part) => part.mean === 'sound')).toBe(true);
  });

  it('does not offer the catalog’s other name for the piece they were asked', () => {
    const asked: ReadonlyArray<readonly [string, string, string, readonly string[]]> = [
      ['Tele', 'Telephone', 'sound', ['call', 'voice']],
      ['Min', 'Miniature', 'form', ['shape', 'figure']],
      ['Hemo', 'Hemorrhage', 'burst', ['break', 'shatter']],
      ['Uni', 'Unicycle', 'wheel', ['circle', 'ring']],
      ['Photo', 'Photograph', 'record', ['write', 'draw', 'written']],
      ['Phil', 'Philosophy', 'wisdom', ['wise']],
      ['Ann', 'Anniversary', 'turn', ['roll', 'spin']],
      ['Ject', 'Reject', 'back', ['again']],
      ['Vit', 'Revitalize', 'again', ['back']],
      ['Aero', 'Aerodynamic', 'force', ['power', 'energy']],
      ['Chrom', 'Chromosome', 'body', ['flesh', 'meat']],
      ['Trans', 'Transfer', 'carry', ['bear']],
      ['Eu', 'Euphoria', 'carry', ['bear']],
      ['Bio', 'Biography', 'writing', ['record', 'letter', 'write', 'draw', 'written']],
      ['Photo', 'Photograph', 'record', ['writing', 'letter']],
      ['Loqu', 'Soliloquy', 'alone', ['one', 'single']],
      ['Anim', 'Unanimous', 'one', ['alone']],
      ['Phobia', 'Claustrophobia', 'closed', ['shut']],
      ['Macro', 'Macrocosm', 'world', ['universe']],
      ['Pyr', 'Pyrotechnics', 'art', ['skill', 'craft']],
      ['Cata', 'Catalyst', 'loosen', ['free']],
      ['Dem', 'Democracy', 'rule', ['chief', 'ruler']],
      ['Mater', 'Matriarch', 'ruler', ['chief', 'rule']],
      ['Gram', 'Diagram', 'through', ['across']],
      ['Metr', 'Diameter', 'across', ['through']],
      ['Luc', 'Translucent', 'through', ['across']],
      ['Polis', 'Acropolis', 'high', ['above', 'over']],
      ['Aud', 'Audible', 'able to be', ['can be']],
      ['Port', 'Portable', 'can be', ['able to be']],
      ['Proto', 'Protagonist', 'actor', ['act', 'acting']],
      ['Auto', 'Automatic', 'acting', ['act', 'actor']],
      ['Mot', 'Promote', 'forward', ['forth']],
      ['Voc', 'Provoke', 'forth', ['forward']],
      ['Osteo', 'Osteoarthritis', 'joint', ['join']],
      ['Ped', 'Pedestrian', 'person', ['people']],
      ['Pan', 'Pandemic', 'people', ['person']],
      ['Pan', 'Panorama', 'view', ['look', 'see', 'watch', 'sight']],
      ['Bene', 'Benefactor', 'doer', ['doing']],
      ['Flu', 'Fluent', 'doing', ['doer']],
      ['Psych', 'Psychiatry', 'healing', ['cure']],
      ['Pan', 'Panacea', 'cure', ['healing']],
      ['Crat', 'Aristocrat', 'best', ['good', 'well', 'better']],
      ['Fid', 'Bonafide', 'good', ['best', 'better', 'well']],
      ['Mania', 'Megalomania', 'great', ['million', 'huge', 'large', 'big', 'grand']],
      ['Sangu', 'Consanguinity', 'with', ['together']],
      ['Path', 'Sympathy', 'with', ['together']],
      ['Sequ', 'Consecutive', 'with', ['together']],
      ['Eu', 'Eulogy', 'words', ['study', 'study of', 'reason']],
      ['Fin', 'Infinite', 'not', ['without']],
      ['Miss', 'Dismiss', 'away', ['apart']],
      ['Mnem', 'Amnesty', 'not', ['without']],
      ['Theo', 'Atheist', 'without', ['not']],
    ];
    for (const [rootName, word, mean, rivals] of asked) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const part = otherPartsForRoot(root).find((item) => item.word === word && item.mean === mean);
      expect(part, `${word} ${mean}`).toBeTruthy();
      const tiles = pickPartDistractors([ROOTS], 400, [part!.mean, root.mean], () => 0);
      expect(tiles.length, word).toBeGreaterThan(10);
      for (const rival of rivals) {
        expect(tiles, `${word} ~ ${rival}`).not.toContain(rival);
      }
    }
  });
});

describe('buildPicksForRoot', () => {
  it('asks which Bio word the pieces build, and the other tiles are its siblings', () => {
    const picks = buildPicksForRoot(bio);
    const biology = picks.find((p) => p.word === 'Biology');
    expect(biology?.split).toBe('bio (life) + -logy (study of)');
    expect(biology?.siblings.sort()).toEqual(['Biodegradable', 'Biography']);
    expect(buildAsk(biology!.split)).toBe('Which word is built from bio + -logy?');
    expect(buildAsk(biology!.split)).not.toMatch(/\(/);
    expect(buildBig(biology!.split)).toBe('bio + -logy');
    expect(buildBig(biology!.split)).not.toBe('Biology');
    expect(buildBig(biology!.split)).not.toBe('Bio');
    expect(buildTeach('Biology', biology!.split)).toBe(
      'Biology is built from bio (life) + -logy (study of).',
    );
    expect(buildYesLine('Biology', biology!.split)).toBe(
      'Yes — Biology. Built from bio (life) + -logy (study of).',
    );
    expect(buildYesLine('Biology', biology!.split)).not.toMatch(/Bio means life/);
    expect(buildMissLine('Biology', biology!.split)).toBe(
      'Nope — bio (life) + -logy (study of) builds Biology.',
    );
    expect(wordYesLine('Biology', biology!.split)).toBe(
      'Yes — Biology. Built from bio (life) + -logy (study of).',
    );
    expect(wordYesLine('Biology', biology!.split)).not.toMatch(/Bio means life/);
    expect(wordMissLine('Biology', biology!.split)).toBe(
      'Nope — Biology. Built from bio (life) + -logy (study of).',
    );
    expect(wordMissLine('Biology', biology!.split)).not.toMatch(/Bio means life/);
    expect(wordYesLine('Biology')).toBe('Yes — Biology.');
    expect(wordMissLine('')).toBe('Nope — try the next one.');
  });

  it('asks with the letters and keeps the glosses off every tile', () => {
    for (const root of ROOTS) {
      for (const pick of buildPicksForRoot(root)) {
        const letters = buildBig(pick.split)
          .replace(/\s*\([^)]*\)/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const ask = buildAsk(pick.split);
        expect(ask, pick.word).toBe(`Which word is built from ${letters}?`);
        expect(ask, pick.word).not.toMatch(/\(/);
        expect(spellsChoice(ask, pick.word), pick.word).toBe(false);
        for (const sibling of pick.siblings) {
          expect(spellsChoice(ask, sibling), `${pick.word} vs ${sibling}`).toBe(false);
        }
        expect(buildTeach(pick.word, pick.split), pick.word).toContain(pick.split);
      }
    }
  });

  it('keeps the answer out of the split, and siblings off other roots', () => {
    for (const root of ROOTS) {
      const onCard = new Set(root.words.map((w) => w.w.toLowerCase()));
      for (const pick of buildPicksForRoot(root)) {
        expect(pick.split.toLowerCase().includes(pick.word.toLowerCase()), pick.word).toBe(false);
        expect(pick.siblings.length, pick.word).toBeGreaterThan(0);
        expect(pick.siblings).not.toContain(pick.word);
        for (const sibling of pick.siblings) {
          expect(onCard.has(sibling.toLowerCase()), `${root.root}: ${sibling}`).toBe(true);
        }
      }
    }
  });
});

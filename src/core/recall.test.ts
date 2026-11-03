import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { mulberry32 } from './daily';
import {
  canon,
  glossSaysMean,
  pickGlossDistractors,
  pickMeaningDistractors,
  wordContainsRoot,
} from './distractors';
import { glossQuietLine } from './promptFace';
import { buildRecall, recallFromPending } from './recall';
import { quizGloss } from './wordDef';
import {
  buildAsk,
  buildPicksForRoot,
  otherPartsForRoot,
  parseWordSplit,
  partMeanLabels,
  samePieceIdea,
  usablePartMean,
} from './wordParts';

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const geo = ROOTS.find((r) => r.root === 'Geo')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;
const pool = [bio, geo, photo];

describe('buildRecall', () => {
  it('asks for a meaning with 2–3 choices and exactly one correct', () => {
    const beat = buildRecall({ root: bio, pool, kind: 'mean', rng: mulberry32(1), choices: 3 });
    expect(beat.kind).toBe('mean');
    expect(beat.ask.toLowerCase()).toContain('mean');
    expect(beat.opts.length).toBeGreaterThanOrEqual(2);
    expect(beat.opts.length).toBeLessThanOrEqual(3);
    expect(beat.opts.filter((o) => o.ok)).toHaveLength(1);
    expect(beat.opts.find((o) => o.ok)?.label).toBe(bio.mean);
  });

  it('asks for an example word with the real word as the answer', () => {
    const beat = buildRecall({ root: bio, pool, kind: 'word', rng: mulberry32(2), choices: 3 });
    expect(beat.kind).toBe('word');
    const correct = beat.opts.find((o) => o.ok)!.label;
    expect(bio.words.map((w) => w.w)).toContain(correct);
    expect(beat.opts.filter((o) => o.ok)).toHaveLength(1);
    expect(beat.word).toBe(correct);
    const authored = bio.words.find((w) => w.w === correct);
    expect(beat.split).toBe(authored?.b);
    expect(beat.teach).toBe(`${correct} is built from ${authored?.b}.`);
    expect(beat.teach).not.toMatch(/Bio means life/);
    expect(beat.ask).toBe('Which word is built from this root?');
  });

  it('does not put the correct meaning on a rival tile', () => {
    const beat = buildRecall({ root: bio, pool, kind: 'mean', rng: mulberry32(3) });
    const labels = beat.opts.map((o) => o.label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
    expect(beat.opts.filter((o) => o.label === bio.mean)).toHaveLength(1);
  });

  it('teaches the answer without scolding', () => {
    const mean = buildRecall({ root: bio, pool, kind: 'mean', rng: mulberry32(4) });
    expect(mean.teach.toLowerCase()).toContain('life');
    expect(mean.teach.toLowerCase()).not.toMatch(/wrong|nope|fail|shame/);

    const word = buildRecall({ root: bio, pool, kind: 'word', rng: mulberry32(5) });
    expect(word.teach.toLowerCase()).toContain('bio');
    expect(word.teach.toLowerCase()).not.toMatch(/wrong|nope|fail|shame/);
  });

  it('still builds a beat when the pool is only the target root', () => {
    const beat = buildRecall({ root: bio, pool: [bio], kind: 'mean', rng: mulberry32(6), choices: 2 });
    expect(beat.opts.length).toBeGreaterThanOrEqual(2);
    expect(beat.opts.some((o) => o.ok && o.label === bio.mean)).toBe(true);
    expect(beat.opts.some((o) => !o.ok)).toBe(true);
    const junkMeans = new Set(['moon', 'color', 'number', 'weather']);
    for (const o of beat.opts) {
      if (!o.ok) expect(junkMeans.has(o.label)).toBe(false);
    }
  });

  it('asks what a school word means, using the authored definition', () => {
    const biology = bio.words.find((w) => w.w === 'Biology')!;
    let sawBiology = false;
    for (let seed = 0; seed < 12; seed++) {
      const beat = buildRecall({
        root: bio,
        pool,
        kind: 'gloss',
        rng: mulberry32(seed),
        choices: 3,
      });
      expect(beat.kind).toBe('gloss');
      expect(beat.ask).toBe(`What does ${beat.word} mean?`);
      expect(beat.opts.filter((o) => o.ok)).toHaveLength(1);
      expect(beat.opts).toHaveLength(3);
      const correct = beat.opts.find((o) => o.ok)!;
      expect(correct.label).toBe(beat.gloss);
      expect(correct.label).not.toBe(bio.mean);
      const authored = bio.words.find((w) => w.w === beat.word);
      expect(quizGloss(authored!.d)).toBe(beat.gloss);
      for (const opt of beat.opts) {
        if (opt.ok) continue;
        expect(opt.label).not.toBe(correct.label);
        expect(opt.label.length).toBeLessThanOrEqual(72);
        expect(opt.label.toLowerCase()).not.toMatch(/chair|spoon|sock|pizza/);
      }
      expect(beat.teach).toContain(`${beat.word} — ${beat.gloss}`);
      expect(beat.teach).not.toContain('Bio means life');
      if (beat.word === 'Biology') {
        sawBiology = true;
        expect(beat.gloss).toBe(quizGloss(biology.d));
        expect(beat.teach).toContain('bio (life) + -logy (study of)');
      }
    }
    expect(sawBiology).toBe(true);
  });

  it('does not point from Bio · life at a wrong tile that says life', () => {
    const biology = recallFromPending({
      root: bio,
      pool: ROOTS,
      pending: { kind: 'gloss', word: 'Biology' },
      rng: mulberry32(3),
      choices: 3,
    });
    expect(biology?.kind).toBe('gloss');
    expect(biology?.word).toBe('Biology');
    expect(glossQuietLine(bio.root, bio.mean, biology?.gloss)).toBe('from Bio · life');
    expect(biology?.opts.filter((opt) => opt.ok)).toHaveLength(1);
    expect(biology?.opts.length).toBe(3);
    for (const opt of biology?.opts ?? []) {
      if (opt.ok) continue;
      expect(glossSaysMean(bio.mean, opt.label), opt.label).toBe(false);
    }

    const scope = ROOTS.find((r) => r.root === 'Scope');
    if (!scope) throw new Error('fixture: Scope');
    const microscope = recallFromPending({
      root: scope,
      pool: ROOTS,
      pending: { kind: 'gloss', word: 'Microscope' },
      rng: mulberry32(4),
      choices: 3,
    });
    expect(glossQuietLine(scope.root, scope.mean, microscope?.gloss)).toBe('from Scope · look');
    for (const opt of microscope?.opts ?? []) {
      if (opt.ok) continue;
      expect(glossSaysMean(scope.mean, opt.label), opt.label).toBe(false);
    }

    for (const root of ROOTS) {
      for (const item of root.words) {
        const gloss = quizGloss(item.d);
        if (!gloss || canon(gloss) === canon(root.mean)) continue;
        for (let seed = 0; seed < 3; seed++) {
          const beat = recallFromPending({
            root,
            pool: ROOTS,
            pending: { kind: 'gloss', word: item.w },
            rng: mulberry32(seed + item.w.length),
            choices: 3,
          });
          expect(beat?.kind, item.w).toBe('gloss');
          const hint = glossQuietLine(root.root, root.mean, beat?.gloss);
          if (hint !== root.mean && !hint.endsWith(` · ${root.mean}`)) continue;
          for (const opt of beat?.opts ?? []) {
            if (opt.ok) continue;
            expect(glossSaysMean(root.mean, opt.label), `${item.w}: ${opt.label}`).toBe(false);
          }
        }
      }
    }
  });

  it('does not point a named meaning at a wrong tile that says the same idea', () => {
    const cases = [
      ['Macro', 'Macroeconomics', 'from Macro · large'],
      ['Vit', 'Vitamin', 'from Vit · life'],
      ['Spect', 'Spectator', 'from Spect · see'],
      ['Mega', 'Megaphone', 'from Mega · huge'],
      ['Gen', 'Generate', 'from Gen · birth'],
      ['Terr', 'Territory', 'from Terr · earth'],
      ['Carn', 'Carnivore', 'from Carn · flesh'],
      ['Graph', 'Autograph', 'from Graph · write'],
      ['Micro', 'Microchip', 'from Micro · small'],
      ['Dict', 'Dictionary', 'from Dict · speak'],
      ['Voc', 'Vocabulary', 'from Voc · voice'],
      ['Ped', 'Pedestal', 'from Ped · foot'],
      ['Mort', 'Mortal', 'from Mort · death'],
      ['Uni', 'Unicorn', 'from Uni · one'],
      ['Therm', 'Thermostat', 'from Therm · heat'],
    ] as const;
    for (const [rootName, word, line] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const authored = root.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!gloss) throw new Error(`fixture: ${word}`);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      for (let seed = 0; seed < 12; seed++) {
        const beat = recallFromPending({
          root,
          pool: ROOTS,
          pending: { kind: 'gloss', word },
          rng: mulberry32(seed + word.length),
          choices: 3,
        });
        expect(beat?.kind, word).toBe('gloss');
        expect(beat?.word, word).toBe(word);
        expect(beat?.opts.length, word).toBe(3);
        for (const opt of beat?.opts ?? []) {
          if (opt.ok) continue;
          expect(glossSaysMean(root.mean, opt.label), `${word}: ${opt.label}`).toBe(false);
        }
      }
      const rushTiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 3, mulberry32(4));
      expect(rushTiles, word).toHaveLength(3);
      for (const label of rushTiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const biography = quizGloss(bio.words.find((item) => item.w === 'Biography')!.d);
    if (!biography) throw new Error('fixture: Biography');
    expect(glossQuietLine(bio.root, bio.mean, biography)).toBe('from Bio');
    const dropped = pickGlossDistractors(bio.mean, 'Biography', biography, [ROOTS], 500, mulberry32(2));
    expect(dropped.some((label) => glossSaysMean(bio.mean, label))).toBe(true);
  });

  it('does not point the card’s other name at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Therm', 'Thermometer', 'from Therm · heat', 'Therm', 'Thermostat'],
      ['Super', 'Supervise', 'from Super · above', 'Hyper', 'Hyperbole'],
      ['Lith', 'Lithosphere', 'from Lith · stone', 'Geo', 'Geology'],
      ['Soph', 'Sophisticated', 'from Soph · wisdom', 'Soph', 'Sophomore'],
      ['Volv', 'Revolve', 'from Volv · roll', 'Vert', 'Convert'],
      ['Cycl', 'Bicycle', 'from Cycl · circle', 'Uni', 'Unicycle'],
      ['Graph', 'Graphic', 'from Graph · write', 'Cede', 'Recede'],
      ['Dys', 'Dysphoria', 'from Dys · bad', 'Caco', 'Cacodemon'],
      ['Vert', 'Vertigo', 'from Vert · turn', 'Cycl', 'Cyclone'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 500, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const superRoot = ROOTS.find((item) => item.root === 'Super');
    const volv = ROOTS.find((item) => item.root === 'Volv');
    const pyr = ROOTS.find((item) => item.root === 'Pyr');
    const lev = ROOTS.find((item) => item.root === 'Lev');
    if (!superRoot || !volv || !pyr || !lev) throw new Error('fixture: meaning roots');
    const above = pickMeaningDistractors(superRoot, [ROOTS], 400, () => 0);
    expect(above).not.toContain('over');
    expect(above).toContain('under');
    expect(above.length).toBeGreaterThan(20);
    const roll = pickMeaningDistractors(volv, [ROOTS], 400, () => 0);
    expect(roll).not.toContain('turn');
    expect(roll).toContain('throw');
    const fire = pickMeaningDistractors(pyr, [ROOTS], 400, () => 0);
    expect(fire).toContain('heat');
    const lift = pickMeaningDistractors(lev, [ROOTS], 400, () => 0);
    expect(lift).toContain('light');
  });

  it('does not point an irregular or the card’s other name at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Struct', 'Structure', 'from Struct · build', 'Geo', 'Geology'],
      ['Fac', 'Factory', 'from Fac · make', 'Photo', 'Photograph'],
      ['Miss', 'Mission', 'from Miss · send', 'Gram', 'Telegram'],
      ['Odont', 'Orthodontist', 'from Odont · tooth', 'Odont', 'Mastodon'],
      ['Ver', 'Verify', 'from Ver · truth', 'Bio', 'Biography'],
      ['Mnem', 'Amnesty', 'from Mnem · memory', 'Mnem', 'Mnemonic'],
      ['Calli', 'Calligraphy', 'from Calli · beauty', 'Loqu', 'Eloquent'],
      ['Gloss', 'Glossary', 'from Gloss · tongue', 'Bi', 'Bilingual'],
      ['Mania', 'Kleptomania', 'from Mania · madness', 'Mania', 'Megalomania'],
      ['Inter', 'Interact', 'from Inter · between', 'Dem', 'Epidemic'],
      ['Xeno', 'Xenophobia', 'from Xeno · stranger', 'Xeno', 'Xenophile'],
      ['Jud', 'Judge', 'from Jud · judge', 'Jur', 'Jury'],
      ['Mis', 'Misbehave', 'from Mis · wrong', 'Mal', 'Malfunction'],
      ['Dyna', 'Dynamic', 'from Dyna · power', 'Geo', 'Geothermal'],
      ['Dyna', 'Dynamic', 'from Dyna · power', 'Ject', 'Inject'],
      ['Re', 'Return', 'from Re · again', 'Re', 'Rewind'],
      ['Greg', 'Congregate', 'from Greg · flock', 'Agog', 'Demagogue'],
      ['Pos', 'Compose', 'from Pos · place', 'Sub', 'Submerge'],
      ['Somn', 'Insomnia', 'from Somn · sleep', 'Somn', 'Somnambulist'],
      ['Vis', 'Visible', 'from Vis · see', 'Macro', 'Macro'],
      ['Fract', 'Fraction', 'from Fract · break', 'Bio', 'Biodegradable'],
      ['Loqu', 'Soliloquy', 'from Loqu · speak', 'Log', 'Dialogue'],
      ['Dict', 'Dictionary', 'from Dict · speak', 'Loqu', 'Loquacious'],
      ['Phren', 'Frenetic', 'from Phren · mind', 'Caco', 'Cacodemon'],
      ['Ortho', 'Orthodox', 'from Ortho · straight', 'Ortho', 'Orthography'],
      ['Cred', 'Credit', 'from Cred · believe', 'Fid', 'Confide'],
      ['Fid', 'Confide', 'from Fid · faith', 'Cred', 'Credit'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 500, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    expect(glossSaysMean('life', 'An evil spirit or nightmare')).toBe(false);
    expect(glossSaysMean('heat', 'A cold wind')).toBe(false);
    expect(glossSaysMean('lift', 'A picture made by capturing light')).toBe(false);
    expect(glossSaysMean('fire', 'Heat energy from the earth')).toBe(false);
  });

  it('does not point feel, brain, every, body, or raised at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Neuro', 'Neurotic', 'from Neuro · nerve', 'Cephal', 'Encephalitis'],
      ['Omni', 'Omnipresent', 'from Omni · all', 'Cent', 'Percent'],
      ['Omni', 'Omnipresent', 'from Omni · all', 'Ann', 'Annual'],
      ['Omni', 'Omnipresent', 'from Omni · all', 'Uni', 'Uniform'],
      ['Lev', 'Levity', 'from Lev · lift', 'Terr', 'Terrace'],
      ['Carn', 'Carnival', 'from Carn · flesh', 'Corp', 'Corporation'],
      ['Carn', 'Carnival', 'from Carn · flesh', 'Phys', 'Physician'],
      ['Carn', 'Reincarnate', 'from Carn · flesh', 'Chrom', 'Chromosome'],
      ['Fer', 'Conifer', 'from Fer · carry', 'Fer', 'Conifer'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      if (rivalWord === word) continue;
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 500, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const lev = ROOTS.find((item) => item.root === 'Lev');
    const tang = ROOTS.find((item) => item.root === 'Tang');
    const sent = ROOTS.find((item) => item.root === 'Sent');
    const corp = ROOTS.find((item) => item.root === 'Corp');
    const carn = ROOTS.find((item) => item.root === 'Carn');
    const neuro = ROOTS.find((item) => item.root === 'Neuro');
    const cephal = ROOTS.find((item) => item.root === 'Cephal');
    const pyr = ROOTS.find((item) => item.root === 'Pyr');
    const phys = ROOTS.find((item) => item.root === 'Phys');
    if (!lev || !tang || !sent || !corp || !carn || !neuro || !cephal || !pyr || !phys) {
      throw new Error('fixture: meaning roots');
    }
    const lift = pickMeaningDistractors(lev, [ROOTS], 400, () => 0);
    expect(lift).not.toContain('raise');
    expect(lift).toContain('light');
    const touch = pickMeaningDistractors(tang, [ROOTS], 400, () => 0);
    expect(touch).not.toContain('feel');
    expect(touch).not.toContain('feeling');
    expect(touch).toContain('throw');
    const feel = pickMeaningDistractors(sent, [ROOTS], 400, () => 0);
    expect(feel).not.toContain('touch');
    const body = pickMeaningDistractors(corp, [ROOTS], 400, () => 0);
    expect(body).not.toContain('flesh');
    expect(body).not.toContain('meat');
    const flesh = pickMeaningDistractors(carn, [ROOTS], 400, () => 0);
    expect(flesh).not.toContain('body');
    const nerve = pickMeaningDistractors(neuro, [ROOTS], 400, () => 0);
    expect(nerve).toContain('head');
    const head = pickMeaningDistractors(cephal, [ROOTS], 400, () => 0);
    expect(head).toContain('nerve');
    const fire = pickMeaningDistractors(pyr, [ROOTS], 400, () => 0);
    expect(fire).toContain('heat');
    const nature = pickMeaningDistractors(phys, [ROOTS], 400, () => 0);
    expect(nature).toContain('flesh');
    expect(nature).not.toContain('body');

    const levity = glossOf('Lev', 'Levity');
    const lightTiles = pickGlossDistractors(lev.mean, 'Levity', levity, [ROOTS], 500, mulberry32(1));
    expect(lightTiles).toContain(glossOf('Photo', 'Photograph'));
    expect(lightTiles).not.toContain(glossOf('Terr', 'Terrace'));
    expect(glossSaysMean('head', 'Swelling of the brain inside the head')).toBe(true);
    expect(glossSaysMean('nerve', 'The head-foot creature')).toBe(false);
  });

  it('does not point writing, alone, closed, world, or art at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Uni', 'Unicorn', 'from Uni · one', 'Loqu', 'Soliloquy'],
      ['Uni', 'Unicorn', 'from Uni · one', 'Crat', 'Autocrat'],
      ['Cosm', 'Cosmopolitan', 'from Cosm · universe', 'Phys', 'Physical'],
      ['Cosm', 'Cosmopolitan', 'from Cosm · universe', 'Dys', 'Dystopia'],
      ['Cosm', 'Cosmopolitan', 'from Cosm · universe', 'Cata', 'Cataclysm'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      if (rivalWord === word) continue;
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 500, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const uni = ROOTS.find((item) => item.root === 'Uni');
    const cosm = ROOTS.find((item) => item.root === 'Cosm');
    if (!uni || !cosm) throw new Error('fixture: meaning roots');
    const one = pickGlossDistractors(uni.mean, 'Unicorn', glossOf('Uni', 'Unicorn'), [ROOTS], 500, mulberry32(1));
    expect(one).toContain(glossOf('Scope', 'Microscope'));
    expect(one).not.toContain(glossOf('Loqu', 'Soliloquy'));
    expect(one).not.toContain(glossOf('Mono', 'Monolith'));
    const universe = pickGlossDistractors(
      cosm.mean,
      'Cosmopolitan',
      glossOf('Cosm', 'Cosmopolitan'),
      [ROOTS],
      500,
      mulberry32(1),
    );
    expect(universe).toContain(glossOf('Photo', 'Photograph'));
    expect(universe).not.toContain(glossOf('Phys', 'Physical'));
    expect(universe).not.toContain(glossOf('Cosm', 'Microcosm'));
    expect(universe).not.toContain(glossOf('Chthon', 'Chthonic'));

    expect(glossSaysMean('shut', 'A tool to see very tiny things up close')).toBe(false);
    expect(glossSaysMean('shut', 'The fear of closed-in spaces')).toBe(true);
    expect(glossSaysMean('universe', 'Belonging to the underworld')).toBe(true);
    expect(glossSaysMean('skill', 'A craft lifted by spiraling wings')).toBe(true);
    expect(glossSaysMean('skill', 'The art of beautiful handwriting')).toBe(true);
    expect(glossSaysMean('one', 'A speech made alone, to oneself')).toBe(true);
    expect(glossSaysMean('write', 'The rules for putting written words together')).toBe(true);
  });

  it('does not point lighten, free, well, harsh, distance, or chief at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Lev', 'Levity', 'from Lev · lift', 'Lev', 'Alleviate'],
      ['Eu', 'Euphoria', 'from Eu · good', 'Ambi', 'Ambidextrous'],
      ['Eu', 'Euphemism', 'from Eu · good', 'Ambi', 'Ambidextrous'],
      ['Mal', 'Malfunction', 'from Mal · bad', 'Caco', 'Cacophony'],
      ['Mal', 'Malfunction', 'from Mal · bad', 'Eu', 'Euphemism'],
      ['Dys', 'Dysfunction', 'from Dys · bad', 'Caco', 'Cacophony'],
      ['Tele', 'Television', 'from Tele · far', 'Phon', 'Telephone'],
      ['Tele', 'Television', 'from Tele · far', 'Miss', 'Transmit'],
      ['Tele', 'Television', 'from Tele · far', 'Circum', 'Circumference'],
      ['Arch', 'Architect', 'from Arch · rule', 'Crat', 'Autocrat'],
      ['Crat', 'Autocrat', 'from Crat · rule', 'Arch', 'Architect'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      if (rivalWord === word) continue;
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 500, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const lev = ROOTS.find((item) => item.root === 'Lev');
    const solv = ROOTS.find((item) => item.root === 'Solv');
    const crat = ROOTS.find((item) => item.root === 'Crat');
    const pyr = ROOTS.find((item) => item.root === 'Pyr');
    if (!lev || !solv || !crat || !pyr) throw new Error('fixture: meaning roots');

    const lift = pickGlossDistractors(lev.mean, 'Levity', glossOf('Lev', 'Levity'), [ROOTS], 500, mulberry32(1));
    expect(lift).toContain(glossOf('Photo', 'Photograph'));
    expect(lift).not.toContain(glossOf('Lev', 'Alleviate'));
    const loosen = pickGlossDistractors(solv.mean, 'Absolve', glossOf('Solv', 'Absolve'), [ROOTS], 500, mulberry32(1));
    expect(loosen).not.toContain(glossOf('Solv', 'Absolve'));
    expect(loosen.length).toBeGreaterThan(10);
    const rule = pickGlossDistractors(crat.mean, 'Autocrat', glossOf('Crat', 'Autocrat'), [ROOTS], 500, mulberry32(1));
    expect(rule).toContain(glossOf('Omni', 'Omnipotent'));
    expect(rule).toContain(glossOf('Gen', 'Genesis'));
    expect(rule).not.toContain(glossOf('Arch', 'Architect'));

    const light = pickMeaningDistractors(lev, [ROOTS], 400, () => 0);
    expect(light).toContain('light');
    expect(light).not.toContain('raise');
    const fire = pickMeaningDistractors(pyr, [ROOTS], 400, () => 0);
    expect(fire).toContain('heat');
    const power = pickMeaningDistractors(crat, [ROOTS], 400, () => 0);
    expect(power).toContain('power');

    expect(glossSaysMean('lift', 'To lighten or ease a burden.')).toBe(true);
    expect(glossSaysMean('lift', 'A picture made by capturing light')).toBe(false);
    expect(glossSaysMean('lift', 'Light, cheerful humor')).toBe(false);
    expect(glossSaysMean('loosen', 'To free someone from blame.')).toBe(true);
    expect(glossSaysMean('good', 'Able to use both hands equally well.')).toBe(true);
    expect(glossSaysMean('bad', 'A harsh, jarring clash of sounds.')).toBe(true);
    expect(glossSaysMean('bad', 'A soft word used in place of a harsh one.')).toBe(true);
    expect(glossSaysMean('far', 'To send across a distance.')).toBe(true);
    expect(glossSaysMean('far', 'The distance carried all the way around a circle.')).toBe(true);
    expect(glossSaysMean('rule', 'A ruler who holds total power alone.')).toBe(true);
    expect(glossSaysMean('rule', 'The chief builder who designs a building.')).toBe(true);
    expect(glossSaysMean('rule', 'The beginning or birth of something')).toBe(false);
    expect(glossSaysMean('rule', 'Having all power; almighty')).toBe(false);
    expect(glossSaysMean('heat', 'A pile of wood built for a fire.')).toBe(false);
  });

  it('a Photosynthesis miss still teaches light after the hint dropped it', () => {
    const photo = ROOTS.find((r) => r.root === 'Photo');
    if (!photo) throw new Error('fixture: Photo');
    const beat = buildRecall({
      root: photo,
      pool,
      kind: 'gloss',
      rng: () => 0.4,
      choices: 3,
    });
    expect(beat.word).toBe('Photosynthesis');
    expect(beat.gloss?.toLowerCase()).toContain('sunlight');
    expect(beat.teach).toContain('photo (light)');
    expect(beat.ask).toBe('What does Photosynthesis mean?');
    expect(beat.ask).not.toContain('light');
  });

  it('can build a school-word beat for every root', () => {
    const glosses = new Set<string>();
    for (const root of ROOTS) {
      for (const word of root.words) {
        const gloss = quizGloss(word.d);
        if (gloss) glosses.add(gloss);
      }
    }
    for (const root of ROOTS) {
      const beat = buildRecall({
        root,
        pool: ROOTS,
        kind: 'gloss',
        rng: mulberry32(root.root.length + root.t),
        choices: 3,
      });
      expect(beat.kind, root.root).toBe('gloss');
      expect(beat.word, root.root).toBeTruthy();
      expect(beat.opts.filter((o) => o.ok), root.root).toHaveLength(1);
      expect(beat.opts.length, root.root).toBeGreaterThanOrEqual(2);
      for (const opt of beat.opts) {
        expect(glosses.has(opt.label), `${root.root}: ${opt.label}`).toBe(true);
      }
      expect(beat.teach, root.root).not.toContain(`${root.root} means`);
    }
  });

  it('keeps Remember on root beats — no school-word question over Geo', () => {
    for (let seed = 0; seed < 24; seed++) {
      const beat = buildRecall({
        root: geo,
        pool,
        rng: mulberry32(seed),
        kinds: ['mean', 'word'],
      });
      expect(beat.kind).not.toBe('gloss');
      expect(beat.kind).not.toBe('part');
      expect(beat.kind).not.toBe('build');
      expect(beat.ask).not.toMatch(/Geography|Geology|Geothermal/);
      expect(beat.ask).not.toMatch(/what does -graphy mean/i);
    }
  });

  it('asks what the other piece means — not the school word, and not the root', () => {
    const means = new Set(partMeanLabels(ROOTS));
    const biology = bio.words.find((w) => w.w === 'Biology')!;
    const logy = buildRecall({
      root: bio,
      pool,
      kind: 'part',
      rng: () => 0,
      choices: 3,
    });
    expect(logy.word).toBe('Biology');
    expect(logy.part).toBe('-logy');
    expect(logy.partMean).toBe('study of');
    expect(logy.ask).toBe('In Biology, what does -logy mean?');
    expect(logy.teach).toContain('bio (life) + -logy (study of)');
    for (let seed = 0; seed < 12; seed++) {
      const beat = buildRecall({
        root: bio,
        pool,
        kind: 'part',
        rng: mulberry32(seed),
        choices: 3,
      });
      expect(beat.kind).toBe('part');
      expect(beat.ask).toBe(`In ${beat.word}, what does ${beat.part} mean?`);
      expect(beat.ask).not.toMatch(/What does Biology mean/);
      expect(beat.ask).not.toMatch(/what does this root mean/i);
      expect(beat.opts.filter((o) => o.ok)).toHaveLength(1);
      expect(beat.opts).toHaveLength(3);
      const correct = beat.opts.find((o) => o.ok)!;
      expect(correct.label).toBe(beat.partMean);
      expect(correct.label).not.toBe(bio.mean);
      expect(correct.label).not.toBe(quizGloss(biology.d));
      const authored = otherPartsForRoot(bio).find(
        (p) => p.word === beat.word && p.letters === beat.part,
      );
      expect(authored?.mean).toBe(beat.partMean);
      for (const opt of beat.opts) {
        expect(means.has(opt.label)).toBe(true);
        expect(opt.label).not.toBe(bio.mean);
        expect(opt.label.toLowerCase()).not.toMatch(/chair|spoon|sock|pizza/);
      }
      expect(beat.teach).toContain(`${beat.part} means ${beat.partMean}`);
      expect(beat.teach).not.toMatch(/Bio means life/);
      expect(beat.teach.toLowerCase()).not.toMatch(/wrong|nope|fail|shame/);
      for (const opt of beat.opts) {
        if (opt.ok) continue;
        expect(samePieceIdea(opt.label, beat.partMean ?? ''), beat.ask).toBe(false);
      }
    }
  });

  it('does not offer study as a wrong tile for -logy (study of)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const beat = buildRecall({
        root: bio,
        pool: ROOTS,
        kind: 'part',
        rng: mulberry32(seed),
        choices: 3,
      });
      if (beat.partMean !== 'study of' && beat.partMean !== 'writing') continue;
      const labels = beat.opts.map((opt) => opt.label);
      expect(labels, beat.ask).not.toContain(beat.partMean === 'study of' ? 'study' : 'write');
    }
    const logy = buildRecall({
      root: bio,
      pool: ROOTS,
      kind: 'part',
      rng: () => 0,
      choices: 3,
    });
    expect(logy.partMean).toBe('study of');
    expect(logy.opts.map((opt) => opt.label)).not.toContain('study');
  });

  it('builds an other-part beat for every root that has one, and falls back otherwise', () => {
    const means = new Set<string>();
    for (const root of ROOTS) {
      for (const word of root.words) {
        for (const piece of parseWordSplit(word.b)) {
          const mean = usablePartMean(piece.mean);
          if (mean) means.add(mean);
        }
      }
    }
    for (const root of ROOTS) {
      const beat = buildRecall({
        root,
        pool: ROOTS,
        kind: 'part',
        rng: mulberry32(root.root.length + root.t),
        choices: 3,
      });
      const parts = otherPartsForRoot(root);
      if (parts.length === 0) {
        expect(beat.kind, root.root).not.toBe('part');
        continue;
      }
      expect(beat.kind, root.root).toBe('part');
      expect(beat.ask, root.root).toBe(`In ${beat.word}, what does ${beat.part} mean?`);
      expect(beat.opts.filter((o) => o.ok), root.root).toHaveLength(1);
      expect(beat.opts.find((o) => o.ok)?.label, root.root).not.toBe(root.mean);
      const seen = new Set<string>();
      for (const opt of beat.opts) {
        expect(means.has(opt.label), `${root.root}: ${opt.label}`).toBe(true);
        const key = canon(opt.label);
        expect(seen.has(key), `${root.root}: ${opt.label}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('asks which word the pieces build — siblings, not a word from another root', () => {
    const onCard = new Set(bio.words.map((w) => w.w));
    const beat = buildRecall({
      root: bio,
      pool,
      kind: 'build',
      rng: () => 0,
      choices: 3,
    });
    expect(beat.kind).toBe('build');
    expect(beat.word).toBe('Biology');
    expect(beat.split).toBe('bio (life) + -logy (study of)');
    expect(beat.ask).toBe('Which word is built from bio + -logy?');
    expect(beat.ask).not.toMatch(/\(/);
    expect(beat.ask).not.toMatch(/What does Biology mean/);
    expect(beat.opts.filter((o) => o.ok)).toHaveLength(1);
    expect(beat.opts.find((o) => o.ok)?.label).toBe('Biology');
    expect(beat.opts.map((o) => o.label).sort()).toEqual([
      'Biodegradable',
      'Biography',
      'Biology',
    ]);
    for (const opt of beat.opts) expect(onCard.has(opt.label)).toBe(true);
    expect(beat.opts.some((o) => o.label === 'Geography')).toBe(false);
    expect(beat.teach).toBe('Biology is built from bio (life) + -logy (study of).');
    expect(beat.teach).not.toMatch(/Bio means life/);
  });

  it('builds a pieces question for every root that has one, and falls back otherwise', () => {
    for (const root of ROOTS) {
      const beat = buildRecall({
        root,
        pool: ROOTS,
        kind: 'build',
        rng: mulberry32(root.root.length + root.t),
        choices: 3,
      });
      const picks = buildPicksForRoot(root);
      if (picks.length === 0) {
        expect(beat.kind, root.root).not.toBe('build');
        continue;
      }
      expect(beat.kind, root.root).toBe('build');
      const onCard = new Set(root.words.map((w) => w.w));
      expect(onCard.has(beat.word ?? ''), root.root).toBe(true);
      expect(beat.ask, root.root).toBe(buildAsk(beat.split ?? ''));
      expect(beat.ask, root.root).not.toMatch(/\(/);
      expect(beat.ask.toLowerCase(), root.root).not.toContain((beat.word ?? '').toLowerCase());
      expect(beat.teach, root.root).toContain(beat.split ?? '');
      expect(beat.opts.filter((o) => o.ok), root.root).toHaveLength(1);
      expect(beat.opts.find((o) => o.ok)?.label, root.root).toBe(beat.word);
      const seen = new Set<string>();
      for (const opt of beat.opts) {
        expect(onCard.has(opt.label), `${root.root}: ${opt.label}`).toBe(true);
        expect(seen.has(opt.label.toLowerCase()), opt.label).toBe(false);
        seen.add(opt.label.toLowerCase());
        if (!opt.ok) expect(opt.label).not.toBe(beat.word);
      }
      expect(beat.teach, root.root).not.toContain(`${root.root} means`);
    }
  });

  it('word distractors are curriculum words that do not contain the root', () => {
    const form = ROOTS.find((r) => r.root === 'Form')!;
    const curriculumWords = new Set(ROOTS.flatMap((r) => r.words.map((w) => w.w)));
    const household = new Set(['Window', 'Blanket', 'Sandwich', 'Pillow', 'Ladder']);
    const beat = buildRecall({ root: form, pool: ROOTS.filter((r) => r.t === 1), kind: 'word', rng: mulberry32(7), choices: 3 });
    for (const o of beat.opts) {
      expect(household.has(o.label)).toBe(false);
      expect(curriculumWords.has(o.label)).toBe(true);
      if (!o.ok) expect(wordContainsRoot(o.label, 'Form')).toBe(false);
    }
  });
});

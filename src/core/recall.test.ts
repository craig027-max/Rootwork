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
      ['Dys', 'Dystopia', 'from Dys · bad', 'Caco', 'Cacophony'],
      ['Dys', 'Dysphoria', 'from Dys · bad', 'Eu', 'Euphemism'],
      ['Caco', 'Cacodemon', 'from Caco · bad', 'Caco', 'Cacophony'],
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

  it('does not point larger, thrown, strange, better, worst, or sail at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Macro', 'Macroeconomics', 'from Macro · large', 'Magn', 'Magnify'],
      ['Macro', 'Macroeconomics', 'from Macro · large', 'Min', 'Miniature'],
      ['Macro', 'Macroeconomics', 'from Macro · large', 'Cosm', 'Microcosm'],
      ['Magn', 'Magnificent', 'from Magn · great', 'Magn', 'Magnify'],
      ['Magn', 'Magnify', 'from Magn · great', 'Min', 'Miniature'],
      ['Mega', 'Megaphone', 'from Mega · huge', 'Magn', 'Magnify'],
      ['Mega', 'Megaphone', 'from Mega · huge', 'Cosm', 'Microcosm'],
      ['Ject', 'Inject', 'from Ject · throw', 'Hyper', 'Hyperbole'],
      ['Xeno', 'Xenophile', 'from Xeno · stranger', 'Xeno', 'Xenon'],
      ['Xeno', 'Xenophile', 'from Xeno · stranger', 'Tort', 'Contort'],
      ['Xeno', 'Xenophobia', 'from Xeno · stranger', 'Xeno', 'Xenon'],
      ['Eu', 'Euphoria', 'from Eu · good', 'Super', 'Superior'],
      ['Eu', 'Euphemism', 'from Eu · good', 'Form', 'Reform'],
      ['Dys', 'Dysphoria', 'from Dys · bad', 'Cata', 'Catastrophe'],
      ['Caco', 'Cacophony', 'from Caco · bad', 'Cata', 'Catastrophe'],
      ['Dys', 'Dystopia', 'from Dys · bad', 'Cata', 'Catastrophe'],
      ['Caco', 'Cacophony', 'from Caco · bad', 'Cata', 'Catastrophe'],
      ['Naut', 'Aeronautics', 'from Naut · sailor', 'Circum', 'Circumnavigate'],
      ['Naut', 'Aeronautics', 'from Naut · sailor', 'Sub', 'Submarine'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      if (rivalWord === word) continue;
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 800, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const macro = ROOTS.find((item) => item.root === 'Macro');
    const ject = ROOTS.find((item) => item.root === 'Ject');
    const naut = ROOTS.find((item) => item.root === 'Naut');
    if (!macro || !ject || !naut) throw new Error('fixture: meaning roots');

    const large = pickGlossDistractors(
      macro.mean,
      'Macroeconomics',
      glossOf('Macro', 'Macroeconomics'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(large).toContain(glossOf('Photo', 'Photograph'));
    expect(large).not.toContain(glossOf('Magn', 'Magnify'));
    expect(large).not.toContain(glossOf('Min', 'Miniature'));
    expect(large).not.toContain(glossOf('Cosm', 'Microcosm'));

    const thrown = pickGlossDistractors(ject.mean, 'Inject', glossOf('Ject', 'Inject'), [ROOTS], 800, mulberry32(1));
    expect(thrown).toContain(glossOf('Photo', 'Photograph'));
    expect(thrown).not.toContain(glossOf('Hyper', 'Hyperbole'));

    const sailor = pickGlossDistractors(
      naut.mean,
      'Aeronautics',
      glossOf('Naut', 'Aeronautics'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(sailor).toContain(glossOf('Photo', 'Photograph'));
    expect(sailor).not.toContain(glossOf('Circum', 'Circumnavigate'));
    expect(sailor).not.toContain(glossOf('Sub', 'Submarine'));
    expect(sailor).toContain(glossOf('Sangu', 'Consanguinity'));
    expect(sailor).toContain(glossOf('Agog', 'Synagogue'));

    expect(glossSaysMean('large', 'To make something look larger.')).toBe(true);
    expect(glossSaysMean('great', 'A tiny copy of something bigger.')).toBe(true);
    expect(glossSaysMean('huge', 'A tiny world that mirrors a bigger one.')).toBe(true);
    expect(glossSaysMean('throw', 'An over-the-top exaggeration, thrown past the truth.')).toBe(true);
    expect(glossSaysMean('stranger', 'A rare "strange" gas found in the air.')).toBe(true);
    expect(glossSaysMean('stranger', 'To twist into a strange shape.')).toBe(true);
    expect(glossSaysMean('good', 'Higher or better than something else.')).toBe(true);
    expect(glossSaysMean('good', 'To shape something again, and make it better.')).toBe(true);
    expect(glossSaysMean('bad', 'A turn for the worst; a disaster.')).toBe(true);
    expect(glossSaysMean('sailor', 'To sail all the way around something.')).toBe(true);
    expect(glossSaysMean('sailor', 'A ship that travels under the sea.')).toBe(true);
    expect(glossSaysMean('sailor', 'Sharing the same blood; kinship.')).toBe(false);
    expect(glossSaysMean('sailor', 'A place that leads people together to worship.')).toBe(false);
    expect(glossSaysMean('lift', 'A picture made by capturing light')).toBe(false);
    expect(glossSaysMean('fire', 'Heat energy from the earth')).toBe(false);
  });

  it('does not point dead, sight, same, through, yield, or underworld at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Necro', 'Necropolis', 'from Necro · death', 'Corp', 'Corpse'],
      ['Necro', 'Necropolis', 'from Necro · death', 'Eu', 'Eulogy'],
      ['Necro', 'Necromancy', 'from Necro · death', 'Corp', 'Corpse'],
      ['Spect', 'Spectator', 'from Spect · see', 'Dis', 'Disappear'],
      ['Spect', 'Inspect', 'from Spect · see', 'Dis', 'Disappear'],
      ['Spect', 'Spectacle', 'from Spect · see', 'Dis', 'Disappear'],
      ['Vis', 'Video', 'from Vis · see', 'Dis', 'Disappear'],
      ['Vis', 'Visible', 'from Vis · see', 'Dis', 'Disappear'],
      ['Equ', 'Equal', 'from Equ · equal', 'Homo', 'Homogeneous'],
      ['Equ', 'Equal', 'from Equ · equal', 'Homo', 'Homophone'],
      ['Equ', 'Equal', 'from Equ · equal', 'Uni', 'Uniform'],
      ['Trans', 'Transfer', 'from Trans · across', 'Trans', 'Transparent'],
      ['Trans', 'Transfer', 'from Trans · across', 'Bi', 'Binoculars'],
      ['Trans', 'Transfer', 'from Trans · across', 'Luc', 'Translucent'],
      ['Cede', 'Concede', 'from Cede · go', 'Derm', 'Hypodermic'],
      ['Cede', 'Concede', 'from Cede · go', 'Stat', 'Stagnant'],
      ['Cede', 'Concede', 'from Cede · go', 'Dys', 'Dystopia'],
      ['Chthon', 'Autochthonous', 'from Chthon · earth', 'Chthon', 'Chthonic'],
      ['Super', 'Superior', 'from Super · above', 'Lev', 'Elevate'],
      ['Hetero', 'Heterodox', 'from Hetero · different', 'Contra', 'Contrast'],
      ['Bel', 'Rebel', 'from Bel · war', 'Bel', 'Bellicose'],
      ['Bel', 'Belligerent', 'from Bel · war', 'Bel', 'Bellicose'],
      ['Plac', 'Complacent', 'from Plac · calm', 'Plac', 'Complacent'],
      ['Fin', 'Define', 'from Fin · end', 'Fin', 'Define'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      if (rivalWord === word) continue;
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 800, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const necro = ROOTS.find((item) => item.root === 'Necro');
    const equ = ROOTS.find((item) => item.root === 'Equ');
    const trans = ROOTS.find((item) => item.root === 'Trans');
    const cede = ROOTS.find((item) => item.root === 'Cede');
    const chthon = ROOTS.find((item) => item.root === 'Chthon');
    if (!necro || !equ || !trans || !cede || !chthon) throw new Error('fixture: meaning roots');

    const dead = pickGlossDistractors(
      necro.mean,
      'Necropolis',
      glossOf('Necro', 'Necropolis'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(dead).toContain(glossOf('Photo', 'Photograph'));
    expect(dead).not.toContain(glossOf('Corp', 'Corpse'));
    expect(dead).not.toContain(glossOf('Eu', 'Eulogy'));
    expect(dead).not.toContain(glossOf('Necro', 'Necromancy'));

    const same = pickGlossDistractors(equ.mean, 'Equal', glossOf('Equ', 'Equal'), [ROOTS], 800, mulberry32(1));
    expect(same).toContain(glossOf('Photo', 'Photograph'));
    expect(same).not.toContain(glossOf('Homo', 'Homogeneous'));
    expect(same).not.toContain(glossOf('Homo', 'Homophone'));
    expect(same).not.toContain(glossOf('Uni', 'Uniform'));
    expect(same).not.toContain(glossOf('Co', 'Coexist'));

    const through = pickGlossDistractors(
      trans.mean,
      'Transfer',
      glossOf('Trans', 'Transfer'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(through).toContain(glossOf('Photo', 'Photograph'));
    expect(through).not.toContain(glossOf('Trans', 'Transparent'));
    expect(through).not.toContain(glossOf('Bi', 'Binoculars'));
    expect(through).not.toContain(glossOf('Tang', 'Tactile'));

    const yielded = pickGlossDistractors(
      cede.mean,
      'Concede',
      glossOf('Cede', 'Concede'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(yielded).toContain(glossOf('Photo', 'Photograph'));
    expect(yielded).not.toContain(glossOf('Derm', 'Hypodermic'));
    expect(yielded).not.toContain(glossOf('Stat', 'Stagnant'));
    expect(yielded).not.toContain(glossOf('Dys', 'Dystopia'));

    const earth = pickGlossDistractors(
      chthon.mean,
      'Autochthonous',
      glossOf('Chthon', 'Autochthonous'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(earth).toContain(glossOf('Photo', 'Photograph'));
    expect(earth).not.toContain(glossOf('Chthon', 'Chthonic'));

    expect(glossQuietLine('Cede', 'go', glossOf('Cede', 'Proceed'))).toBe('from Cede');
    expect(glossQuietLine('Cede', 'go', glossOf('Cede', 'Recede'))).toBe('from Cede');

    expect(glossSaysMean('death', 'A dead body')).toBe(true);
    expect(glossSaysMean('death', 'Good words spoken to honor the dead')).toBe(true);
    expect(glossSaysMean('see', 'To go away from sight')).toBe(true);
    expect(glossSaysMean('equal', 'Made of the same kind all the way through')).toBe(true);
    expect(glossSaysMean('across', 'Clear enough to see straight through')).toBe(true);
    expect(glossSaysMean('across', 'Felt through the sense of touch')).toBe(true);
    expect(glossSaysMean('go', 'To give in and yield a point')).toBe(true);
    expect(glossSaysMean('go', 'Standing still and going stale')).toBe(true);
    expect(glossSaysMean('go', 'An imagined world gone terribly wrong')).toBe(true);
    expect(glossSaysMean('earth', 'Belonging to the underworld')).toBe(true);
    expect(glossSaysMean('above', 'To lift up to a higher place')).toBe(true);
    expect(glossSaysMean('different', 'To set things against each other to show the difference')).toBe(true);
    expect(glossSaysMean('war', 'Warlike and aggressive')).toBe(true);
    expect(glossSaysMean('calm', 'So pleased with yourself you stop trying')).toBe(true);
    expect(glossSaysMean('end', "To set the limits of a word's meaning")).toBe(true);
    expect(glossSaysMean('father', 'One who loves their fatherland')).toBe(true);
    expect(glossSaysMean('holy', 'So holy it must never be touched')).toBe(true);
    expect(glossSaysMean('life', 'A dead body')).toBe(false);
    expect(glossSaysMean('equal', 'Body heat that has fallen under the safe level')).toBe(false);
    expect(glossSaysMean('self', 'The same in amount or value')).toBe(false);
    expect(glossSaysMean('lift', 'Higher or better than something else')).toBe(false);
    expect(glossSaysMean('universe', 'Belonging to the underworld')).toBe(true);
    expect(glossSaysMean('fire', 'Heat energy from the earth')).toBe(false);
    expect(glossSaysMean('rule', 'Having all power; almighty')).toBe(false);
  });

  it('does not point dying, judgment, natural, lives, or high at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Necro', 'Necropolis', 'from Necro · death', 'Mort', 'Immortal'],
      ['Necro', 'Necromancy', 'from Necro · death', 'Mort', 'Immortal'],
      ['Jud', 'Judge', 'from Jud · judge', 'Jud', 'Prejudice'],
      ['Jud', 'Judge', 'from Jud · judge', 'Ver', 'Verdict'],
      ['Phys', 'Physician', 'from Phys · nature', 'Phys', 'Physical'],
      ['Bio', 'Biology', 'from Bio · life', 'Ambi', 'Amphibian'],
      ['Bio', 'Biodegradable', 'from Bio · life', 'Ambi', 'Amphibian'],
      ['Vit', 'Vitamin', 'from Vit · life', 'Ambi', 'Amphibian'],
      ['Super', 'Superior', 'from Super · above', 'Polis', 'Acropolis'],
      ['Super', 'Supervise', 'from Super · above', 'Polis', 'Acropolis'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      if (rivalWord === word) continue;
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 800, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const necro = ROOTS.find((item) => item.root === 'Necro');
    const jud = ROOTS.find((item) => item.root === 'Jud');
    const phys = ROOTS.find((item) => item.root === 'Phys');
    const bioRoot = ROOTS.find((item) => item.root === 'Bio');
    const superRoot = ROOTS.find((item) => item.root === 'Super');
    if (!necro || !jud || !phys || !bioRoot || !superRoot) throw new Error('fixture: meaning roots');

    const dying = pickGlossDistractors(
      necro.mean,
      'Necropolis',
      glossOf('Necro', 'Necropolis'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(dying).toContain(glossOf('Photo', 'Photograph'));
    expect(dying).not.toContain(glossOf('Mort', 'Immortal'));
    expect(dying).not.toContain(glossOf('Corp', 'Corpse'));

    const judgment = pickGlossDistractors(
      jud.mean,
      'Judge',
      glossOf('Jud', 'Judge'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(judgment).toContain(glossOf('Photo', 'Photograph'));
    expect(judgment).not.toContain(glossOf('Jud', 'Prejudice'));
    expect(judgment).not.toContain(glossOf('Ver', 'Verdict'));
    expect(judgment).not.toContain(glossOf('Jud', 'Judicial'));

    const natural = pickGlossDistractors(
      phys.mean,
      'Physician',
      glossOf('Phys', 'Physician'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(natural).toContain(glossOf('Photo', 'Photograph'));
    expect(natural).not.toContain(glossOf('Phys', 'Physical'));
    expect(natural).not.toContain(glossOf('Phys', 'Physics'));

    const lives = pickGlossDistractors(
      bioRoot.mean,
      'Biology',
      glossOf('Bio', 'Biology'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(lives).toContain(glossOf('Photo', 'Photograph'));
    expect(lives).not.toContain(glossOf('Ambi', 'Amphibian'));
    expect(lives).not.toContain(glossOf('Anim', 'Animal'));
    expect(lives).not.toContain(glossOf('Aqua', 'Aquatic'));

    const high = pickGlossDistractors(
      superRoot.mean,
      'Superior',
      glossOf('Super', 'Superior'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(high).toContain(glossOf('Photo', 'Photograph'));
    expect(high).not.toContain(glossOf('Polis', 'Acropolis'));
    expect(high).not.toContain(glossOf('Lev', 'Elevate'));

    expect(glossSaysMean('death', 'Never dying')).toBe(true);
    expect(glossSaysMean('death', 'Never dying; living forever')).toBe(true);
    expect(glossSaysMean('life', 'Never dying')).toBe(false);
    expect(glossSaysMean('life', 'Never dying; living forever')).toBe(true);
    expect(glossSaysMean('judge', 'A judgment made before you know the facts')).toBe(true);
    expect(glossSaysMean('judge', 'A decision that states the truth')).toBe(true);
    expect(glossSaysMean('truth', 'A decision')).toBe(false);
    expect(glossSaysMean('nature', 'Of the body or the natural world')).toBe(true);
    expect(glossSaysMean('flesh', 'the natural world')).toBe(false);
    expect(glossSaysMean('life', 'An animal that lives both in water and on land')).toBe(true);
    expect(glossSaysMean('life', 'A dead body')).toBe(false);
    expect(glossSaysMean('above', 'The high fortified part of an ancient city')).toBe(true);
    expect(glossSaysMean('lift', 'The high fortified part of an ancient city')).toBe(false);
    expect(glossSaysMean('lift', 'Higher or better than something else')).toBe(false);
    expect(glossSaysMean('ball', 'The round that is halfway to the final')).toBe(false);
  });

  it('does not point carries, putting, badly, or laws at a wrong tile', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const cases = [
      ['Port', 'Import', 'from Port · carry', 'Phon', 'Telephone'],
      ['Port', 'Import', 'from Port · carry', 'Tele', 'Telephone'],
      ['Port', 'Import', 'from Port · carry', 'Circum', 'Circumference'],
      ['Port', 'Import', 'from Port · carry', 'Chrom', 'Chromosome'],
      ['Port', 'Import', 'from Port · carry', 'Neuro', 'Neuron'],
      ['Port', 'Import', 'from Port · carry', 'Hemo', 'Hemoglobin'],
      ['Port', 'Import', 'from Port · carry', 'Eu', 'Euphoria'],
      ['Fer', 'Conifer', 'from Fer · carry', 'Phon', 'Telephone'],
      ['Pos', 'Compose', 'from Pos · place', 'Struct', 'Construct'],
      ['Pos', 'Compose', 'from Pos · place', 'Gram', 'Grammar'],
      ['Pos', 'Deposit', 'from Pos · place', 'Struct', 'Construct'],
      ['Dys', 'Dystopia', 'from Dys · bad', 'Mal', 'Malfunction'],
      ['Dys', 'Dystopia', 'from Dys · bad', 'Dys', 'Dysfunction'],
      ['Dys', 'Dysphoria', 'from Dys · bad', 'Mis', 'Misbehave'],
      ['Caco', 'Cacophony', 'from Caco · bad', 'Mal', 'Malfunction'],
      ['Caco', 'Cacodemon', 'from Caco · bad', 'Dys', 'Dysfunction'],
      ['Jur', 'Juror', 'from Jur · law', 'Civ', 'Civilization'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      expect(glossSaysMean(root.mean, rival), `${word} ~ ${rivalWord}`).toBe(true);
      if (rivalWord === word) continue;
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 800, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, word).not.toContain(rival);
      for (const label of tiles) {
        expect(glossSaysMean(root.mean, label), `${word}: ${label}`).toBe(false);
      }
    }

    const port = ROOTS.find((item) => item.root === 'Port');
    const pos = ROOTS.find((item) => item.root === 'Pos');
    const dys = ROOTS.find((item) => item.root === 'Dys');
    const jur = ROOTS.find((item) => item.root === 'Jur');
    const mal = ROOTS.find((item) => item.root === 'Mal');
    if (!port || !pos || !dys || !jur || !mal) throw new Error('fixture: meaning roots');

    const carried = pickGlossDistractors(
      port.mean,
      'Import',
      glossOf('Port', 'Import'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(carried).toContain(glossOf('Photo', 'Photograph'));
    expect(carried).not.toContain(glossOf('Phon', 'Telephone'));
    expect(carried).not.toContain(glossOf('Tele', 'Telephone'));
    expect(carried).not.toContain(glossOf('Circum', 'Circumference'));
    expect(carried).not.toContain(glossOf('Eu', 'Euphoria'));
    expect(carried).not.toContain(glossOf('Fer', 'Conifer'));

    const putting = pickGlossDistractors(
      pos.mean,
      'Compose',
      glossOf('Pos', 'Compose'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(putting).toContain(glossOf('Photo', 'Photograph'));
    expect(putting).not.toContain(glossOf('Struct', 'Construct'));
    expect(putting).not.toContain(glossOf('Gram', 'Grammar'));
    expect(putting).not.toContain(glossOf('Sub', 'Submerge'));

    const badly = pickGlossDistractors(
      dys.mean,
      'Dystopia',
      glossOf('Dys', 'Dystopia'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(badly).toContain(glossOf('Photo', 'Photograph'));
    expect(badly).not.toContain(glossOf('Mal', 'Malfunction'));
    expect(badly).not.toContain(glossOf('Dys', 'Dysfunction'));
    expect(badly).not.toContain(glossOf('Mis', 'Misbehave'));

    const laws = pickGlossDistractors(
      jur.mean,
      'Juror',
      glossOf('Jur', 'Juror'),
      [ROOTS],
      800,
      mulberry32(1),
    );
    expect(laws).toContain(glossOf('Photo', 'Photograph'));
    expect(laws).not.toContain(glossOf('Civ', 'Civilization'));

    expect(glossQuietLine(mal.root, mal.mean, glossOf('Mal', 'Malfunction'))).toBe('from Mal');
    expect(glossQuietLine('Dys', 'bad', glossOf('Dys', 'Dysfunction'))).toBe('from Dys');
    expect(glossQuietLine(port.root, port.mean, glossOf('Port', 'Transport'))).toBe('from Port');
    expect(glossQuietLine('Fer', 'carry', glossOf('Fer', 'Conifer'))).toBe('from Fer · carry');
    expect(glossQuietLine('Pos', 'place', glossOf('Pos', 'Position'))).toBe('from Pos');

    expect(glossSaysMean('carry', 'Carries your voice across a far distance')).toBe(true);
    expect(glossSaysMean('carry', 'The distance carried all the way around a circle.')).toBe(true);
    expect(glossSaysMean('carry', 'A "colored body" that carries genes.')).toBe(true);
    expect(glossSaysMean('place', 'To build by putting parts together.')).toBe(true);
    expect(glossSaysMean('place', 'The rules for putting written words together.')).toBe(true);
    expect(glossSaysMean('bad', 'To work badly, or fail to work.')).toBe(true);
    expect(glossSaysMean('bad', 'Working badly, or not at all.')).toBe(true);
    expect(glossSaysMean('bad', 'To behave badly.')).toBe(true);
    expect(glossSaysMean('law', 'A society of citizens living together with laws and cities.')).toBe(true);
    expect(glossSaysMean('new', 'the news')).toBe(false);
    expect(glossSaysMean('sun', 'How green plants use sunlight to make their own food.')).toBe(false);
    expect(glossSaysMean('see', 'a seed')).toBe(false);
    expect(glossSaysMean('war', 'a ward')).toBe(false);
    expect(glossSaysMean('lift', 'A picture made by capturing light')).toBe(false);
    expect(glossSaysMean('go', 'The study of God and religion')).toBe(false);
  });

  it('does not point a see hint at a view, or deal the same piece idea twice', () => {
    const glossOf = (rootName: string, word: string): string => {
      const root = ROOTS.find((item) => item.root === rootName);
      const authored = root?.words.find((item) => item.w === word);
      const gloss = authored ? quizGloss(authored.d) : null;
      if (!root || !gloss) throw new Error(`fixture: ${rootName} ${word}`);
      return gloss;
    };
    const view = glossOf('Pan', 'Panorama');
    const translucent = glossOf('Luc', 'Translucent');
    expect(glossSaysMean('see', view)).toBe(true);
    expect(glossSaysMean('look', view)).toBe(true);
    expect(glossSaysMean('see', translucent)).toBe(true);
    expect(glossSaysMean('people', 'A person traveling on foot.')).toBe(true);
    expect(glossSaysMean('people', 'Looking or acting like a human.')).toBe(false);
    expect(glossSaysMean('human', 'Government ruled by the people.')).toBe(false);
    expect(glossSaysMean('join', 'A wearing-down of the bone joints.')).toBe(true);
    expect(glossSaysMean('together', 'A wearing-down of the bone joints.')).toBe(false);
    expect(glossSaysMean('act', 'The first and leading character.')).toBe(false);

    const cases = [
      ['Spect', 'Spectator', 'from Spect · see', 'Pan', 'Panorama'],
      ['Spect', 'Inspect', 'from Spect · see', 'Luc', 'Translucent'],
      ['Vis', 'Visible', 'from Vis · see', 'Pan', 'Panorama'],
      ['Scope', 'Microscope', 'from Scope · look', 'Pan', 'Panorama'],
    ] as const;
    for (const [rootName, word, line, rivalRoot, rivalWord] of cases) {
      const root = ROOTS.find((item) => item.root === rootName);
      if (!root) throw new Error(`fixture: ${rootName}`);
      const gloss = glossOf(rootName, word);
      const rival = glossOf(rivalRoot, rivalWord);
      expect(glossQuietLine(root.root, root.mean, gloss), word).toBe(line);
      const tiles = pickGlossDistractors(root.mean, word, gloss, [ROOTS], 800, mulberry32(1));
      expect(tiles.length, word).toBeGreaterThan(10);
      expect(tiles, `${word} ~ ${rivalWord}`).not.toContain(rival);
    }
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

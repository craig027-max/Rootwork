import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { mulberry32 } from './daily';
import {
  pickWordDistractors,
  scoreWordDistractor,
  wordContainsRoot,
} from './distractors';
import { buildRushQuestion, rushWordHint, whichRootFace } from './rush';
import { quizGloss } from './wordDef';
import { buildBig, buildPicksForRoot, otherPartsForRoot, partMeanLabels } from './wordParts';

const form = ROOTS.find((r) => r.root === 'Form')!;
const bio = ROOTS.find((r) => r.root === 'Bio')!;
const tier1 = ROOTS.filter((r) => r.t === 1);
const formWords = new Set(form.words.map((w) => w.w));
const curriculumWords = new Set(ROOTS.flatMap((r) => r.words.map((w) => w.w)));
const curriculumMeans = new Set(ROOTS.map((r) => r.mean));

describe('wordContainsRoot', () => {
  it('treats Uniform as containing Form, Preview as not', () => {
    expect(wordContainsRoot('Uniform', 'Form')).toBe(true);
    expect(wordContainsRoot('Transform', 'Form')).toBe(true);
    expect(wordContainsRoot('Preview', 'Form')).toBe(false);
    expect(wordContainsRoot('Antidote', 'Form')).toBe(false);
  });
});

describe('scoreWordDistractor', () => {
  it('ranks Form near-misses above unrelated prefix-words', () => {
    const fortress = scoreWordDistractor('Fortress', 'Transform', 'Form', 'Fort');
    const preview = scoreWordDistractor('Preview', 'Transform', 'Form', 'Pre');
    const antidote = scoreWordDistractor('Antidote', 'Transform', 'Form', 'Anti');
    expect(fortress).toBeGreaterThan(preview);
    expect(fortress).toBeGreaterThan(antidote);
  });
});

describe('pickWordDistractors', () => {
  it('never returns a word that contains the target root', () => {
    const rng = mulberry32(11);
    const picks = pickWordDistractors(form, [tier1], 'Transform', 3, rng);
    expect(picks).toHaveLength(3);
    for (const w of picks) {
      expect(wordContainsRoot(w, 'Form')).toBe(false);
      expect(formWords.has(w)).toBe(false);
      expect(curriculumWords.has(w)).toBe(true);
    }
  });
});

describe('buildRushQuestion', () => {
  it('uses other root meanings for “what does this root mean?”', () => {
    const q = buildRushQuestion({
      root: form,
      scoped: tier1,
      all: tier1,
      type: 'mean',
      rng: mulberry32(3),
    });
    expect(q.ask.toLowerCase()).toContain('mean');
    expect(q.opts.filter((o) => o.ok)).toHaveLength(1);
    expect(q.opts.find((o) => o.ok)?.label).toBe(form.mean);
    for (const o of q.opts) {
      if (o.ok) continue;
      expect(curriculumMeans.has(o.label)).toBe(true);
      expect(o.label).not.toBe(form.mean);
    }
  });

  it('keeps word-question options as real vocab that is not built from the root', () => {
    const q = buildRushQuestion({
      root: form,
      scoped: tier1,
      all: tier1,
      type: 'word',
      rng: mulberry32(4),
    });
    expect(q.ask.toLowerCase()).toContain('word');
    expect(q.big).toBe(form.root);
    expect(q.opts.filter((o) => o.ok)).toHaveLength(1);
    const correct = q.opts.find((o) => o.ok)!.label;
    expect(q.word).toBe(correct);
    expect(formWords.has(correct)).toBe(true);
    const authored = form.words.find((w) => w.w === correct);
    expect(q.wordSplit).toBe(authored?.b.replace(/\s+/g, ' ').trim());
    expect(q.big).not.toBe(correct);
    for (const o of q.opts) {
      expect(curriculumWords.has(o.label)).toBe(true);
      if (!o.ok) {
        expect(wordContainsRoot(o.label, 'Form')).toBe(false);
        expect(formWords.has(o.label)).toBe(false);
      }
    }
  });

  it('does not serve Preview or Antidote as Form word-question distractors', () => {
    const junk = new Set(['Preview', 'Antidote']);
    for (let seed = 0; seed < 40; seed++) {
      const q = buildRushQuestion({
        root: form,
        scoped: tier1,
        all: tier1,
        type: 'word',
        rng: mulberry32(seed + 20),
      });
      const wrong = q.opts.filter((o) => !o.ok).map((o) => o.label);
      for (const w of wrong) {
        expect(junk.has(w), `seed ${seed} served ${w} for Form`).toBe(false);
        expect(wordContainsRoot(w, 'Form')).toBe(false);
      }
    }
  });

  it('asks what a school word means, and the big type is that word', () => {
    const glosses = new Set<string>();
    for (const root of ROOTS) {
      for (const word of root.words) {
        const gloss = quizGloss(word.d);
        if (gloss) glosses.add(gloss);
      }
    }
    const q = buildRushQuestion({
      root: bio,
      scoped: tier1,
      all: tier1,
      type: 'gloss',
      rng: mulberry32(8),
    });
    expect(q.type).toBe('gloss');
    expect(q.ask).toBe(`What does ${q.glossWord} mean?`);
    expect(q.big).toBe(q.glossWord);
    expect(q.big).not.toBe('Bio');
    expect(q.sub).toBe('from Bio · life');
    expect(q.say).toBeUndefined();
    expect(q.opts.filter((o) => o.ok)).toHaveLength(1);
    expect(q.opts.find((o) => o.ok)?.label).toBe(q.gloss);
    expect(q.opts.length).toBe(4);
    for (const opt of q.opts) {
      expect(glosses.has(opt.label)).toBe(true);
      expect(opt.label).not.toBe('life');
    }
  });

  it('asks what the other piece means, and the big type is that piece', () => {
    const means = new Set(partMeanLabels(ROOTS));
    const q = buildRushQuestion({
      root: bio,
      scoped: tier1,
      all: tier1,
      type: 'part',
      rng: mulberry32(12),
    });
    expect(q.type).toBe('part');
    expect(q.ask).toBe(`In ${q.partWord}, what does ${q.part} mean?`);
    expect(q.ask).not.toMatch(/What does Biology mean/);
    expect(q.big).toBe(q.part);
    expect(q.big).not.toBe('Bio');
    expect(q.sub).toBe(`in ${q.partWord}`);
    expect(q.say).toBeUndefined();
    expect(q.opts.filter((o) => o.ok)).toHaveLength(1);
    expect(q.opts.find((o) => o.ok)?.label).toBe(q.partMean);
    expect(q.opts.find((o) => o.ok)?.label).not.toBe('life');
    expect(q.opts.length).toBe(4);
    const authored = otherPartsForRoot(bio).find(
      (p) => p.word === q.partWord && p.letters === q.part,
    );
    expect(authored?.mean).toBe(q.partMean);
    for (const opt of q.opts) {
      expect(means.has(opt.label)).toBe(true);
      expect(opt.label).not.toBe(bio.mean);
    }
  });

  it('still builds an other-part question when the scoped pool is only Bio', () => {
    const q = buildRushQuestion({
      root: bio,
      scoped: [bio],
      all: tier1,
      type: 'part',
      rng: mulberry32(13),
    });
    expect(q.type).toBe('part');
    expect(q.opts.length).toBeGreaterThanOrEqual(2);
    expect(q.opts.filter((o) => o.ok)).toHaveLength(1);
    expect(q.big).not.toBe(bio.root);
  });

  it('asks which word the pieces build, and the big type is the pieces', () => {
    const q = buildRushQuestion({
      root: bio,
      scoped: tier1,
      all: tier1,
      type: 'build',
      rng: () => 0,
    });
    expect(q.type).toBe('build');
    expect(q.buildWord).toBe('Biology');
    expect(q.ask).toBe('Which word is built from bio + -logy?');
    expect(q.ask).not.toMatch(/\(life\)|\(study of\)/);
    expect(q.big).toBe('bio + -logy');
    expect(q.big).toBe(buildBig(q.buildSplit!));
    expect(q.big).not.toBe('Bio');
    expect(q.big).not.toBe('Biology');
    expect(q.say).toBeUndefined();
    expect(q.opts.map((o) => o.label).sort()).toEqual(['Biodegradable', 'Biography', 'Biology']);
    expect(q.opts.find((o) => o.ok)?.label).toBe('Biology');
    expect(q.opts.some((o) => o.label === 'Geography')).toBe(false);
  });

  it('builds a pieces question from the card alone when the pool is only Bio', () => {
    const q = buildRushQuestion({
      root: bio,
      scoped: [bio],
      all: [bio],
      type: 'build',
      rng: mulberry32(14),
    });
    expect(q.type).toBe('build');
    const onCard = new Set(bio.words.map((w) => w.w));
    expect(q.opts.length).toBe(3);
    for (const opt of q.opts) expect(onCard.has(opt.label)).toBe(true);
    expect(buildPicksForRoot(bio).some((p) => p.word === q.buildWord)).toBe(true);
  });

  it('asks which root without spelling the button', () => {
    const names = ROOTS.map((r) => r.root);
    const formQ = buildRushQuestion({
      root: form,
      scoped: tier1,
      all: tier1,
      type: 'root',
      rng: mulberry32(5),
    });
    expect(formQ.type).toBe('root');
    expect(formQ.ask).toBe('Which root carries this meaning?');
    expect(formQ.big).toBe('Shape');
    expect(formQ.sub).toBe('figure');
    expect(formQ.sub).not.toMatch(/form/i);
    expect(`${formQ.big} ${formQ.sub ?? ''}`).not.toMatch(/form/i);
    expect(formQ.opts.find((o) => o.ok)?.label).toBe('Form');

    const equ = ROOTS.find((r) => r.root === 'Equ')!;
    const equQ = buildRushQuestion({
      root: equ,
      scoped: ROOTS,
      all: ROOTS,
      type: 'root',
      rng: mulberry32(6),
    });
    expect(equQ.type).toBe('root');
    expect(equQ.big).toBe('Even · level');
    expect(equQ.sub).toBeUndefined();
    expect(equQ.big).not.toMatch(/equ/i);
    expect(equQ.opts.find((o) => o.ok)?.label).toBe('Equ');

    const jud = ROOTS.find((r) => r.root === 'Jud')!;
    const judQ = buildRushQuestion({
      root: jud,
      scoped: ROOTS,
      all: ROOTS,
      type: 'root',
      rng: mulberry32(7),
    });
    expect(judQ.big).toBe('To decide');
    expect(judQ.big).not.toMatch(/jud/i);
    expect(judQ.sub).toBeUndefined();

    const bioQ = buildRushQuestion({
      root: bio,
      scoped: tier1,
      all: tier1,
      type: 'root',
      rng: mulberry32(8),
    });
    expect(bioQ.big).toBe('Life');
    expect(bioQ.sub).toBe('living things');

    const morph = ROOTS.find((r) => r.root === 'Morph')!;
    expect(whichRootFace(morph, names)?.sub).toBeUndefined();
    expect(whichRootFace(morph, names)?.big).toBe('Shape');
    expect(whichRootFace(form, names)).toEqual({ big: 'Shape', sub: 'figure' });
    expect(rushWordHint('life', 'Biology')).toBe('means “life”');
    expect(rushWordHint('equal', 'Equal')).toBeUndefined();
    expect(rushWordHint('equal', 'Equator')).toBe('means “equal”');
    expect(rushWordHint('judge', 'Judge')).toBeUndefined();

    for (const root of ROOTS) {
      const q = buildRushQuestion({
        root,
        scoped: ROOTS,
        all: ROOTS,
        type: 'root',
        rng: mulberry32(root.root.length + 3),
      });
      expect(q.type, root.root).toBe('root');
      const prompt = [q.ask, q.big, q.sub ?? ''].join(' ');
      const correct = q.opts.find((o) => o.ok)?.label ?? '';
      expect(prompt.toLowerCase().includes(correct.toLowerCase()), `${root.root}: ${prompt}`).toBe(
        false,
      );
      const letters = correct.replace(/[^a-z]/gi, '').toLowerCase();
      if (letters.length >= 3) {
        const chunks = [q.big, ...(q.sub ? q.sub.split('·') : [])];
        for (const chunk of chunks) {
          expect(
            chunk.replace(/[^a-z]/gi, '').toLowerCase().includes(letters),
            `${root.root}: ${chunk}`,
          ).toBe(false);
        }
      }
    }
  });

  it('does not print Equal under means “equal”', () => {
    const equ = ROOTS.find((r) => r.root === 'Equ')!;
    const jud = ROOTS.find((r) => r.root === 'Jud')!;
    for (const root of [equ, jud, bio]) {
      for (let seed = 0; seed < 12; seed++) {
        const q = buildRushQuestion({
          root,
          scoped: ROOTS,
          all: ROOTS,
          type: 'word',
          rng: mulberry32(seed + 40),
        });
        expect(q.type).toBe('word');
        const correct = q.opts.find((o) => o.ok)?.label ?? '';
        const prompt = [q.ask, q.big, q.say ?? '', q.sub ?? ''].join(' ');
        expect(prompt.toLowerCase().includes(correct.toLowerCase()), `${root.root}: ${prompt}`).toBe(
          false,
        );
        if (correct.toLowerCase() === root.mean.toLowerCase()) {
          expect(q.sub, correct).toBeUndefined();
        } else {
          expect(q.sub).toBe(`means “${root.mean}”`);
        }
      }
    }
  });

  it('still builds four tiles when the scoped pool is tiny, topping up from all', () => {
    const q = buildRushQuestion({
      root: bio,
      scoped: [bio],
      all: tier1,
      type: 'word',
      rng: mulberry32(9),
    });
    expect(q.opts.length).toBeGreaterThanOrEqual(3);
    expect(q.opts.filter((o) => o.ok)).toHaveLength(1);
  });
});

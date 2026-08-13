import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { mulberry32 } from './daily';
import {
  pickWordDistractors,
  scoreWordDistractor,
  wordContainsRoot,
} from './distractors';
import { buildRushQuestion } from './rush';

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
    expect(q.opts.filter((o) => o.ok)).toHaveLength(1);
    const correct = q.opts.find((o) => o.ok)!.label;
    expect(formWords.has(correct)).toBe(true);
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

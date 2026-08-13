import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { mulberry32 } from './daily';
import { wordContainsRoot } from './distractors';
import { buildRecall } from './recall';

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

import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { mulberry32 } from './daily';
import { wordContainsRoot } from './distractors';
import { buildRecall } from './recall';
import { quizGloss } from './wordDef';
import { canon } from './distractors';
import { otherPartsForRoot, parseWordSplit, partMeanLabels, usablePartMean } from './wordParts';

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
    }
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

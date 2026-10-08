import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { shortWordDef } from './wordDef';
import { buildWordRecall } from './wordRecall';

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;

describe('Find word recall — Biology, not Bio / life', () => {
  it('asks what the school word means and uses the authored def', () => {
    const biology = bio.words.find((w) => w.w === 'Biology')!;
    const beat = buildWordRecall({
      word: 'Biology',
      def: biology.d,
      split: biology.b,
      pool: [bio, photo],
      choices: 3,
      rng: () => 0.2,
    });
    expect(beat.ask).toBe('What does Biology mean?');
    expect(beat.ask).not.toMatch(/root/i);
    const correct = beat.opts.find((o) => o.ok);
    expect(correct?.label).toBe(shortWordDef(biology.d));
    expect(beat.opts.filter((o) => o.ok)).toHaveLength(1);
    expect(beat.opts.length).toBe(3);
    expect(beat.opts.some((o) => o.label === bio.mean)).toBe(false);
    expect(beat.teach).toMatch(/Biology — The science of living things/);
    expect(beat.teach).toMatch(/bio \(life\) \+ -logy \(study of\)/);
    expect(beat.teach).not.toMatch(/Bio means life/);
  });

  it('never uses a household-junk distractor', () => {
    const photograph = photo.words.find((w) => w.w === 'Photograph')!;
    const beat = buildWordRecall({
      word: 'Photograph',
      def: photograph.d,
      split: photograph.b,
      pool: ROOTS,
      choices: 3,
      rng: () => 0.7,
    });
    for (const opt of beat.opts) {
      expect(opt.label.length).toBeGreaterThan(8);
      expect(opt.label.toLowerCase()).not.toMatch(/chair|spoon|sock|pizza/);
    }
  });
});

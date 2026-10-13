/**
 * One-beat recall questions for Deck ("earn learned") and Daily Challenge.
 *
 * Kept free of I/O so tests can lock: 2–3 choices, one correct, no synonym
 * collisions, a teach-line on a miss (kind, not shame). Root Rush keeps its
 * own question builder — don't share combo math with this.
 */

import { ROOTS, type Root } from '../data/roots';
import { shuffleWith } from './daily';
import { canon, pickMeaningDistractors, pickWordDefDistractors, pickWordDistractors, sampleUnique } from './distractors';
import { GLOSS_TILE_MAX, quizGloss } from './wordDef';
import {
  buildAsk,
  buildPicksForRoot,
  buildTeach,
  otherPartsForRoot,
  partAsk,
  partMeanLabels,
  partTeach,
} from './wordParts';

export type RecallKind = 'mean' | 'word' | 'gloss' | 'part' | 'build';

export interface RecallOption {
  label: string;
  ok: boolean;
}

export interface RecallBeat {
  kind: RecallKind;
  ask: string;
  /** 2–3 shuffled choices, exactly one `ok`. */
  opts: RecallOption[];
  /** Shown after a miss — names the answer, never scolds. */
  teach: string;
  /** School word, when kind is gloss, part, word, or build. */
  word?: string;
  /** Authored short def for that word. */
  gloss?: string;
  /** Other piece letters, when kind is part. */
  part?: string;
  /** Authored meaning of that piece. */
  partMean?: string;
  /** Authored split, when kind is build. The answer is `word`. */
  split?: string;
}

export interface BuildRecallInput {
  root: Root;
  pool: readonly Root[];
  /** Force a kind (tests); otherwise a coin-flip across `kinds`. */
  kind?: RecallKind;
  /**
   * Kinds the coin-flip may deal. Remember stays mean | word — a named
   * Geo visit must not ask what Geography means, what -graphy means,
   * or which pieces build Geology.
   */
  kinds?: readonly RecallKind[];
  rng?: () => number;
  /** 2 or 3 choices. Clamped to what's available. */
  choices?: 2 | 3;
}

const ALL_KINDS: readonly RecallKind[] = ['mean', 'word', 'gloss', 'part', 'build'];

interface GlossPick {
  word: string;
  gloss: string;
  split: string;
}

function glossPicks(root: Root): GlossPick[] {
  const out: GlossPick[] = [];
  for (const item of root.words) {
    const gloss = quizGloss(item.d);
    const word = item.w.replace(/\s+/g, ' ').trim();
    if (!gloss || !word) continue;
    if (canon(gloss) === canon(root.mean)) continue;
    out.push({
      word,
      gloss,
      split: item.b.replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

function buildBuildRecall(
  root: Root,
  rng: () => number,
  want: number,
): RecallBeat | null {
  const picks = buildPicksForRoot(root);
  if (picks.length === 0) return null;
  const picked = picks[Math.floor(rng() * picks.length)]!;
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const distract = shuffleWith(picked.siblings, rng).slice(0, distractCount);
  if (distract.length < 1) return null;
  const opts = shuffleWith(
    [{ label: picked.word, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
    rng,
  );
  return {
    kind: 'build',
    ask: buildAsk(picked.split),
    opts,
    teach: buildTeach(picked.word, picked.split),
    word: picked.word,
    split: picked.split,
  };
}

function buildPartRecall(
  root: Root,
  pool: readonly Root[],
  rng: () => number,
  want: number,
): RecallBeat | null {
  const picks = otherPartsForRoot(root);
  if (picks.length === 0) return null;
  const picked = picks[Math.floor(rng() * picks.length)]!;
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const distract = sampleUnique(
    [partMeanLabels(pool), partMeanLabels(ROOTS)],
    distractCount,
    [picked.mean, root.mean],
    rng,
  );
  if (distract.length < 1) return null;
  const opts = shuffleWith(
    [{ label: picked.mean, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
    rng,
  );
  return {
    kind: 'part',
    ask: partAsk(picked.word, picked.letters),
    opts,
    teach: partTeach(picked.word, picked.letters, picked.mean, picked.split),
    word: picked.word,
    part: picked.letters,
    partMean: picked.mean,
  };
}

function buildGlossRecall(
  root: Root,
  pool: readonly Root[],
  rng: () => number,
  want: number,
): RecallBeat | null {
  const picks = glossPicks(root);
  if (picks.length === 0) return null;
  const picked = picks[Math.floor(rng() * picks.length)]!;
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const distract = pickWordDefDistractors(
    picked.word,
    picked.gloss,
    [pool, ROOTS],
    distractCount,
    rng,
    GLOSS_TILE_MAX,
  );
  if (distract.length < 1) return null;
  const opts = shuffleWith(
    [{ label: picked.gloss, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
    rng,
  );
  const teach = picked.split
    ? `${picked.word} — ${picked.gloss}. Built from ${picked.split}.`
    : `${picked.word} — ${picked.gloss}.`;
  return {
    kind: 'gloss',
    ask: `What does ${picked.word} mean?`,
    opts,
    teach,
    word: picked.word,
    gloss: picked.gloss,
  };
}

/**
 * Build one recall beat about `root`. Distractors come from `pool` (other
 * openable roots), topping up from the full curriculum if the pool is tiny.
 * Never household-object junk — wrong tiles are other roots' meanings/words.
 */
export function buildRecall(input: BuildRecallInput): RecallBeat {
  const { root, pool } = input;
  const rng = input.rng ?? Math.random;
  const want = input.choices ?? 3;
  const allowed = input.kinds && input.kinds.length > 0 ? input.kinds : ALL_KINDS;
  const kind: RecallKind =
    input.kind ?? allowed[Math.floor(rng() * allowed.length)]!;
  const others = pool.filter((r) => r.root !== root.root);
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const pools = [others, ROOTS];

  if (kind === 'build') {
    const built = buildBuildRecall(root, rng, want);
    if (built) return built;
  }

  if (kind === 'part') {
    const part = buildPartRecall(root, pool, rng, want);
    if (part) return part;
  }

  if (kind === 'gloss') {
    const gloss = buildGlossRecall(root, pool, rng, want);
    if (gloss) return gloss;
  }

  if (kind === 'word') {
    const item = root.words[Math.floor(rng() * root.words.length)];
    const correct = item?.w.replace(/\s+/g, ' ').trim() || root.root;
    const split = item?.b.replace(/\s+/g, ' ').trim() || '';
    const distract = pickWordDistractors(root, pools, correct, distractCount, rng);
    const opts = shuffleWith(
      [{ label: correct, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
      rng,
    );
    return {
      kind,
      ask: 'Which word is built from this root?',
      opts,
      teach: split ? buildTeach(correct, split) : `${correct} is built from ${root.root}.`,
      word: correct,
      split: split || undefined,
    };
  }

  const distract = pickMeaningDistractors(root, pools, distractCount, rng);
  const opts = shuffleWith(
    [{ label: root.mean, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
    rng,
  );
  const examples = root.words.map((w) => w.w.toLowerCase()).join(', ');
  return {
    kind: 'mean',
    ask: 'What does this root mean?',
    opts,
    teach: `${root.root} means ${root.mean} — think ${root.alt}. Words like ${examples}.`,
  };
}

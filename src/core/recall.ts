/**
 * One-beat recall questions for Deck ("earn learned") and Daily Challenge.
 *
 * Kept free of I/O so tests can lock: 2–3 choices, one correct, no synonym
 * collisions, a teach-line on a miss (kind, not shame). Root Rush keeps its
 * own question builder — don't share combo math with this.
 */

import { ROOTS, type Root } from '../data/roots';
import { hashSeed, mulberry32, shuffleWith, type DailyPending } from './daily';
import { dailyNextPeekFace } from './dailyNextPeek';
import { canon, pickMeaningDistractors, pickWordDefDistractors, pickWordDistractors, sampleUnique } from './distractors';
import { spellsChoice } from './promptFace';
import { GLOSS_TILE_MAX, quizGloss } from './wordDef';
import {
  buildAsk,
  buildBig,
  buildPicksForRoot,
  buildTeach,
  otherPartsForRoot,
  partAsk,
  partMeanLabels,
  partTeach,
  type OtherPart,
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
    const safeWords = root.words.filter((item) => !spellsChoice(root.root, item.w));
    const choices = safeWords.length > 0 ? safeWords : root.words;
    const item = choices[Math.floor(rng() * choices.length)];
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

/** Stored Rush chip — the thing that question asked, not a fresh coin-flip. */
export interface MissedAsk {
  name?: string | null;
  mean?: string | null;
}

function foldAsk(raw?: string | null): string {
  return raw?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function pickMissedPart(parts: readonly OtherPart[], sub: string): OtherPart | null {
  if (parts.length === 0) return null;
  if (!sub) return parts.length === 1 ? parts[0]! : null;
  const matched = parts.filter((part) => foldAsk(part.mean) === sub);
  if (matched.length === 0) return null;
  const mean = foldAsk(matched[0]!.mean);
  return matched.every((part) => foldAsk(part.mean) === mean) ? matched[0]! : null;
}

function pinnedPartBeat(
  root: Root,
  pool: readonly Root[],
  part: OtherPart,
  rng: () => number,
  want: number,
): RecallBeat | null {
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const distract = sampleUnique(
    [partMeanLabels(pool), partMeanLabels(ROOTS)],
    distractCount,
    [part.mean, root.mean],
    rng,
  );
  if (distract.length < 1) return null;
  return {
    kind: 'part',
    ask: partAsk(part.word, part.letters),
    opts: shuffleWith(
      [{ label: part.mean, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
      rng,
    ),
    teach: partTeach(part.word, part.letters, part.mean, part.split),
    word: part.word,
    part: part.letters,
    partMean: part.mean,
  };
}

function pinnedGlossBeat(
  root: Root,
  pool: readonly Root[],
  word: string,
  gloss: string,
  split: string,
  rng: () => number,
  want: number,
): RecallBeat | null {
  if (!gloss || canon(gloss) === canon(root.mean)) return null;
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const distract = pickWordDefDistractors(
    word,
    gloss,
    [pool.filter((item) => item.root !== root.root), ROOTS],
    distractCount,
    rng,
    GLOSS_TILE_MAX,
  );
  if (distract.length < 1) return null;
  const teach = split
    ? `${word} — ${gloss}. Built from ${split}.`
    : `${word} — ${gloss}.`;
  return {
    kind: 'gloss',
    ask: `What does ${word} mean?`,
    opts: shuffleWith(
      [{ label: gloss, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
      rng,
    ),
    teach,
    word,
    gloss,
  };
}

function pinnedBuildBeat(
  root: Root,
  word: string,
  rng: () => number,
  want: number,
): RecallBeat | null {
  const picked = buildPicksForRoot(root).find(
    (item) => foldAsk(item.word) === foldAsk(word),
  );
  if (!picked) return null;
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const distract = shuffleWith(picked.siblings, rng).slice(0, distractCount);
  if (distract.length < 1) return null;
  return {
    kind: 'build',
    ask: buildAsk(picked.split),
    opts: shuffleWith(
      [{ label: picked.word, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
      rng,
    ),
    teach: buildTeach(picked.word, picked.split),
    word: picked.word,
    split: picked.split,
  };
}

function pinnedWordBeat(
  root: Root,
  pool: readonly Root[],
  word: string,
  split: string,
  rng: () => number,
  want: number,
): RecallBeat | null {
  const distractCount = Math.max(1, Math.min(want - 1, 2));
  const distract = pickWordDistractors(
    root,
    [pool.filter((item) => item.root !== root.root), ROOTS],
    word,
    distractCount,
    rng,
  );
  if (distract.length < 1) return null;
  return {
    kind: 'word',
    ask: 'Which word is built from this root?',
    opts: shuffleWith(
      [{ label: word, ok: true }, ...distract.map((label) => ({ label, ok: false }))],
      rng,
    ),
    teach: split ? buildTeach(word, split) : `${word} is built from ${root.root}.`,
    word,
    split: split || undefined,
  };
}

/**
 * Replay the Rush question a learner missed. A -graph chip asks what
 * -graph means. Photograph asks what that word means. A pieces chip
 * asks which word those pieces build. A which-word chip asks for that
 * word. A meaning beat, the root name, and a chip the catalog cannot
 * match return null — Remember then stays a root question, and does
 * not invent Geography over Geo.
 */
export function recallForMissedAsk(input: {
  root: Root;
  pool: readonly Root[];
  asked?: MissedAsk | null;
  rng?: () => number;
  choices?: 2 | 3;
}): RecallBeat | null {
  const { root, pool } = input;
  const name = input.asked?.name?.replace(/\s+/g, ' ').trim() ?? '';
  const sub = foldAsk(input.asked?.mean);
  if (!name || foldAsk(name) === foldAsk(root.root)) return null;
  const rng = input.rng ?? Math.random;
  const want = input.choices ?? 3;

  const parts = otherPartsForRoot(root).filter(
    (part) => foldAsk(part.letters) === foldAsk(name),
  );
  const part = pickMissedPart(parts, sub);
  if (part) return pinnedPartBeat(root, pool, part, rng, want);
  if (parts.length > 0) return null;

  const item = root.words.find((word) => foldAsk(word.w) === foldAsk(name));
  if (!item) return null;
  const word = item.w.replace(/\s+/g, ' ').trim();
  const split = item.b.replace(/\s+/g, ' ').trim();
  const gloss = quizGloss(item.d) ?? '';
  const pieces = buildBig(split);
  const fromRoot = `from ${root.root}`;

  if (sub && gloss && sub === foldAsk(gloss)) {
    return pinnedGlossBeat(root, pool, word, gloss, split, rng, want);
  }
  if (sub && (sub === foldAsk(pieces) || sub === foldAsk(split))) {
    return pinnedBuildBeat(root, word, rng, want);
  }
  if (sub && sub === foldAsk(fromRoot)) {
    return pinnedWordBeat(root, pool, word, split, rng, want);
  }
  if (sub) return null;
  if (gloss && canon(gloss) !== canon(root.mean)) {
    return pinnedGlossBeat(root, pool, word, gloss, split, rng, want);
  }
  const built = pinnedBuildBeat(root, word, rng, want);
  if (built) return built;
  return pinnedWordBeat(root, pool, word, split, rng, want);
}

/**
 * Rebuild the Daily question Home already named. Distractors can shuffle.
 * The ask and the correct tile stay. Null when the catalog cannot match
 * — the caller deals a fresh beat instead of inventing one.
 */
export function recallFromPending(input: {
  root: Root;
  pool: readonly Root[];
  pending: DailyPending;
  rng?: () => number;
  choices?: 2 | 3;
}): RecallBeat | null {
  const { root, pool, pending } = input;
  const rng = input.rng ?? Math.random;
  const want = input.choices ?? 3;
  if (pending.kind === 'mean') {
    return buildRecall({ root, pool, kind: 'mean', choices: want, rng });
  }
  if (pending.kind === 'word' && pending.word) {
    const item = root.words.find((word) => foldAsk(word.w) === foldAsk(pending.word));
    if (!item) return null;
    return pinnedWordBeat(
      root,
      pool,
      item.w.replace(/\s+/g, ' ').trim(),
      item.b.replace(/\s+/g, ' ').trim(),
      rng,
      want,
    );
  }
  if (pending.kind === 'gloss' && pending.word) {
    const item = root.words.find((word) => foldAsk(word.w) === foldAsk(pending.word));
    if (!item) return null;
    const gloss = quizGloss(item.d);
    if (!gloss) return null;
    return pinnedGlossBeat(
      root,
      pool,
      item.w.replace(/\s+/g, ' ').trim(),
      gloss,
      item.b.replace(/\s+/g, ' ').trim(),
      rng,
      want,
    );
  }
  if (pending.kind === 'part' && pending.part) {
    const parts = otherPartsForRoot(root).filter(
      (part) => foldAsk(part.letters) === foldAsk(pending.part),
    );
    const word = pending.word?.replace(/\s+/g, ' ').trim();
    const part = word
      ? parts.find((item) => foldAsk(item.word) === foldAsk(word))
      : parts.length === 1
        ? parts[0]
        : null;
    if (!part) return null;
    return pinnedPartBeat(root, pool, part, rng, want);
  }
  if (pending.kind === 'build') {
    if (pending.word) return pinnedBuildBeat(root, pending.word, rng, want);
    const split = pending.split?.replace(/\s+/g, ' ').trim() ?? '';
    const picked = buildPicksForRoot(root).find(
      (item) => foldAsk(item.split) === foldAsk(split) || foldAsk(buildBig(item.split)) === foldAsk(split),
    );
    if (!picked) return null;
    return pinnedBuildBeat(root, picked.word, rng, want);
  }
  return null;
}

/** Same unanswered Daily question on Home and on Continue. Pending wins over the seed. */
export function dailyResumeBeat(input: {
  root: Root;
  pool: readonly Root[];
  pending?: DailyPending | null;
  day: string;
  studentId: string | null;
  qi: number;
}): RecallBeat {
  const seed = hashSeed(
    `${input.day}:${input.studentId ?? ''}:daily-q:${input.qi}:${input.root.root}`,
  );
  if (input.pending) {
    const pinned = recallFromPending({
      root: input.root,
      pool: input.pool,
      pending: input.pending,
      choices: 3,
      rng: mulberry32(seed),
    });
    if (pinned) return pinned;
  }
  return buildRecall({
    root: input.root,
    pool: input.pool,
    choices: 3,
    rng: mulberry32(seed),
  });
}

/** Face Home shows for that beat. The answer tile stays off it. */
export function dailyShownNext(input: {
  root: Root | undefined;
  pool: readonly Root[];
  pending?: DailyPending | null;
  day: string;
  studentId: string | null;
  qi: number | null;
}): { name: string; mean?: string } | null {
  if (!input.root || input.qi == null || !Number.isInteger(input.qi) || input.qi < 1) return null;
  const beat = dailyResumeBeat({
    root: input.root,
    pool: input.pool,
    pending: input.pending,
    day: input.day,
    studentId: input.studentId,
    qi: input.qi,
  });
  return dailyNextPeekFace(input.root, beat);
}

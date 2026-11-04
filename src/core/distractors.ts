/**
 * Shared quiz-option picking for Root Rush, Deck recall, and Daily.
 *
 * Combo scoring stays in RootRush — this module only builds labels.
 * Wrong answers should teach: other real curriculum words/meanings, never
 * household junk, and never a word that actually contains the target root.
 */

import type { Root } from '../data/roots';
import { shuffleWith } from './daily';
import { meaningSitsInAnswer } from './promptFace';
import { GLOSS_TILE_MAX, quizGloss } from './wordDef';

/**
 * Near-identical meanings that must never appear as rival tiles.
 * The extra words are the catalog's own other name for that idea,
 * including irregular forms the hint still treats as a different word:
 * Macro's alt is big, Terr's alt is land · ground, built is build,
 * made is make, sent is send, teeth is tooth, true is truth,
 * remember is memory, talk and spoken are speak, trust is believe,
 * back is again, put is place, asleep is sleep, foreign is stranger,
 * feel is touch, body is flesh, brain is nerve, every is all,
 * bear is carry, raise and lighten are lift, writing and letter are write,
 * alone is one, closed is shut, world is universe, art is skill,
 * free is loosen, well is good, harsh is bad, distance is far,
 * chief and ruler are rule, larger and bigger are large,
 * thrown is throw, strange is stranger, better is good,
 * worst is bad, and sail and ship are sailor.
 * Cold is not heat, fire is not heat, and lift is not light.
 * Kinship and worship end in -ship, a condition, not a boat.
 * Head is not brain. Close is not shut — "up close" is still near.
 * Power is not rule, and a beginning is not a ruler.
 * Those stay different tiles. Spirit is mind, not life.
 */
const SYNONYM_GROUPS: string[][] = [
  ['great', 'huge', 'large', 'big', 'larger', 'bigger'],
  ['feeling', 'feel', 'touch'],
  ['born', 'birth'],
  ['war', 'fight'],
  ['believe', 'faith', 'belief', 'trust'],
  ['lead', 'leader'],
  ['see', 'look', 'watch', 'seen'],
  ['life', 'living'],
  ['earth', 'land', 'ground'],
  ['flesh', 'meat', 'body'],
  ['write', 'written', 'draw', 'record', 'writing', 'letter'],
  ['small', 'little', 'tiny'],
  ['speak', 'say', 'speech', 'talk', 'spoken'],
  ['sound', 'voice', 'call'],
  ['foot', 'feet'],
  ['death', 'die'],
  ['one', 'single', 'alone'],
  ['strong', 'strength'],
  ['heat', 'hot', 'temperature'],
  ['shape', 'form', 'figure'],
  ['break', 'burst', 'shatter', 'broken'],
  ['bad', 'evil', 'harsh', 'worst'],
  ['circle', 'wheel', 'ring'],
  ['wisdom', 'wise'],
  ['above', 'over'],
  ['turn', 'roll', 'spin'],
  ['stone', 'rock'],
  ['tooth', 'teeth'],
  ['build', 'built'],
  ['make', 'made'],
  ['send', 'sent'],
  ['truth', 'true'],
  ['memory', 'remember'],
  ['beauty', 'beautiful'],
  ['tongue', 'language'],
  ['madness', 'craze'],
  ['between', 'among'],
  ['stranger', 'foreign', 'strange'],
  ['judge', 'decide'],
  ['wrong', 'badly'],
  ['power', 'force', 'energy'],
  ['again', 'back'],
  ['flock', 'herd', 'crowd'],
  ['place', 'put'],
  ['sleep', 'asleep'],
  ['mind', 'spirit'],
  ['straight', 'correct'],
  ['nerve', 'brain'],
  ['all', 'every'],
  ['carry', 'bear'],
  ['lift', 'raise', 'lighten'],
  ['loosen', 'free'],
  ['good', 'well', 'better'],
  ['far', 'distance'],
  ['rule', 'chief', 'ruler'],
  ['throw', 'thrown'],
  ['sailor', 'sail', 'ship'],
  ['shut', 'closed'],
  ['universe', 'world'],
  ['skill', 'art', 'craft'],
];

const SYNONYM_CANON = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYM_CANON.set(word, group[0]!);
}

function meanKey(mean: string): string {
  return mean.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** This meaning, plus any catalog synonym (life / living, see / look). */
function meanIdeas(mean: string): readonly string[] {
  const key = meanKey(mean);
  if (!key) return [];
  const group = SYNONYM_GROUPS.find((words) => words.includes(key));
  return group ?? [key];
}

/**
 * True when a school-word tile says this meaning, or a meaning the
 * catalog already treats as the same idea. "living forever" says life.
 * "a huge stone" says large. "a voice big and loud" says huge.
 * "to look closely" says see. "watches an event" says see.
 * "an area of land" says earth. "eats meat" says flesh.
 * "written by hand" says write. "a single horn" says one.
 * "a hundred feet" says foot. "able to die" says death.
 * "a room's temperature" says heat. "solid rock" says stone.
 * "two wheels" says circle. "a wise fool" says wisdom.
 * "to turn around" says roll. "watch over" says above.
 * "an evil spirit" says bad, and also mind — not life.
 * "a picture, drawing" says write. "was built" says build.
 * "things are made" says make. "is sent" says send.
 * "straightens teeth" says tooth. "is true" says truth.
 * "helps you remember" says memory. "words spoken" says speak.
 * "to trust" says believe. "wind back" says again.
 * "to put" says place. "fall asleep" says sleep.
 * "foreigners" says stranger. "who decide" says judge.
 * "work badly" says wrong. "heat energy" says power.
 * "into a crowd" says flock. "a craze" says madness.
 * "many languages" says tongue. "beautiful" says beauty.
 * "among many" says between. "the correct spelling" says straight.
 * "the sense of touch" says feel. "one body" says flesh.
 * "swelling of the brain" says nerve. "every year" says all.
 * "bears cones" says carry. "a raised area" says lift.
 * "in writing" says write. "a letter" says write.
 * "standing alone" says one. "closed-in" says shut.
 * "natural world" says universe. "the art of" says skill.
 * "to lighten" says lift. "to free" says loosen.
 * "equally well" says good. "a harsh clash" says bad.
 * "across a distance" says far. "a ruler" and "the chief" say rule.
 * "look larger" and "something bigger" say large. "thrown" says throw.
 * "a strange gas" says stranger. "better" says good. "the worst" says bad.
 * "to sail" and "a ship" say sailor. Kinship does not, and worship does not.
 * A cold wind does not say heat, and sunlight does not say lift.
 * The head does not say nerve. "Up close" does not say shut.
 * "All power" does not say rule. "The beginning" does not say rule.
 */
export function glossSaysMean(mean: string, label: string): boolean {
  const ideas = meanIdeas(mean);
  const tile = label.replace(/\s+/g, ' ').trim();
  if (ideas.length === 0 || !tile) return false;
  return ideas.some((idea) => meaningSitsInAnswer(idea, tile));
}

/** Canonical form for dedupe: lowercase, synonym groups collapse to one key. */
export function canon(label: string): string {
  const k = label.trim().toLowerCase();
  return SYNONYM_CANON.get(k) ?? k;
}

/**
 * Draw up to `n` labels that are canonically unique against `exclude` AND each
 * other. Pools are tried in order so a tier-scoped pool can fall back to a
 * wider one.
 */
export function sampleUnique(
  pools: readonly (readonly string[])[],
  n: number,
  exclude: readonly string[],
  rng: () => number = Math.random,
): string[] {
  const seen = new Set(exclude.map(canon));
  const out: string[] = [];
  for (const pool of pools) {
    for (const v of shuffleWith(pool, rng)) {
      const k = canon(v);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(v);
      if (out.length >= n) return out;
    }
  }
  return out;
}

/** True when `word` contains this root's letters — it would be a valid "built from" answer. */
export function wordContainsRoot(word: string, root: string): boolean {
  const w = word.toLowerCase();
  const r = root.trim().toLowerCase();
  if (!r) return false;
  return w.includes(r);
}

export function commonPrefixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/** Tiny Levenshtein for short root strings (Form vs Fort, Photo vs Phon). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j] ?? 0;
  }
  return prev[n] ?? n;
}

/**
 * Higher = better wrong answer for "which word is built from this root?".
 * Near-miss roots (Form/Fort) beat unrelated everyday words (Preview).
 */
export function scoreWordDistractor(
  word: string,
  correct: string,
  targetRoot: string,
  fromRoot?: string,
): number {
  const w = word.toLowerCase();
  const c = correct.toLowerCase();
  const r = targetRoot.toLowerCase();
  let s = 0;

  const prefix = commonPrefixLen(w, r);
  if (prefix >= 3) s += 14;
  else if (prefix >= 2 && r.length >= 4) s += 8;

  if (fromRoot) {
    const d = editDistance(fromRoot.toLowerCase(), r);
    if (d === 1) s += 16;
    else if (d === 2 && r.length >= 4) s += 10;
  }

  s += Math.max(0, 6 - Math.abs(w.length - c.length));

  if (w.length >= 8) s += 3;
  else if (w.length >= 6) s += 1;
  if (w.length <= 4 && prefix < 2) s -= 6;

  if (/(tion|sion|ology|ography|meter|scope|phone|ment|ture|ance|ence|able|graph|cycle)$/i.test(w)) {
    s += 2;
  }

  return s;
}

interface WordPick {
  label: string;
  fromRoot: string;
  score: number;
}

function collectWordPicks(
  target: Root,
  pools: readonly (readonly Root[])[],
  correct: string,
): WordPick[] {
  const seen = new Set<string>([canon(correct)]);
  const out: WordPick[] = [];
  for (const pool of pools) {
    for (const r of pool) {
      if (r.root === target.root) continue;
      for (const w of r.words) {
        if (wordContainsRoot(w.w, target.root)) continue;
        const k = canon(w.w);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({
          label: w.w,
          fromRoot: r.root,
          score: scoreWordDistractor(w.w, correct, target.root, r.root),
        });
      }
    }
  }
  return out;
}

function pickFromScored(scored: WordPick[], n: number, rng: () => number): string[] {
  if (n <= 0 || scored.length === 0) return [];
  const ranked = [...scored].sort(
    (a, b) => b.score - a.score || a.label.localeCompare(b.label),
  );
  const bandSize = Math.min(ranked.length, Math.max(16, n * 6));
  const band = ranked.slice(0, bandSize);
  const shuffled = shuffleWith(band, rng);
  const usedRoots = new Set<string>();
  const out: string[] = [];

  for (const c of shuffled) {
    const rk = c.fromRoot.toLowerCase();
    if (usedRoots.has(rk)) continue;
    usedRoots.add(rk);
    out.push(c.label);
    if (out.length >= n) return out;
  }
  for (const c of shuffled) {
    if (out.includes(c.label)) continue;
    out.push(c.label);
    if (out.length >= n) return out;
  }
  if (out.length >= n) return out;
  for (const c of ranked) {
    if (out.includes(c.label)) continue;
    out.push(c.label);
    if (out.length >= n) return out;
  }
  return out;
}

/**
 * Wrong options for "which word is built from this root?".
 * Every label is a real curriculum example word that does not contain the root.
 */
export function pickWordDistractors(
  target: Root,
  pools: readonly (readonly Root[])[],
  correct: string,
  n: number,
  rng: () => number = Math.random,
): string[] {
  return pickFromScored(collectWordPicks(target, pools, correct), n, rng);
}

/** Wrong options for "what does this root mean?" — other root meanings only. */
export function pickMeaningDistractors(
  target: Root,
  pools: readonly (readonly Root[])[],
  n: number,
  rng: () => number = Math.random,
): string[] {
  const meanPools = pools.map((set) =>
    set.filter((r) => r.root !== target.root).map((r) => r.mean),
  );
  return sampleUnique(meanPools, n, [target.mean], rng);
}

function collectWordDefs(
  pools: readonly (readonly Root[])[],
  skipWord: string,
  maxLen: number,
): string[] {
  const skip = skipWord.replace(/\s+/g, ' ').trim().toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const pool of pools) {
    for (const root of pool) {
      for (const item of root.words) {
        const name = item.w.replace(/\s+/g, ' ').trim().toLowerCase();
        if (name === skip) continue;
        const gloss = quizGloss(item.d, maxLen);
        if (!gloss) continue;
        const key = canon(gloss);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(gloss);
      }
    }
  }
  return out;
}

/**
 * Wrong options for "what does this school word mean?" — other authored
 * definitions only. `maxLen` defaults to no cap so Find can still use a
 * long correct gloss's siblings; gloss beats pass the tile cap.
 *
 * `avoidMean` drops a tile that already says that meaning, or the same
 * idea (living for life, huge or big for large, look or watch for see,
 * land for earth, meat for flesh, written for write, temperature for
 * heat, rock for stone, wheel for circle, over for above, built for
 * build, made for make, back for again, teeth for tooth, brain for
 * nerve, every for all, body for flesh, raised or lighten for lift,
 * free for loosen, well for good, harsh for bad, distance for far,
 * chief or ruler for rule, larger or bigger for large, thrown for
 * throw, strange for stranger, better for good, worst for bad, sail
 * or ship for sailor). The quiet line
 * still says "from Bio · life" when the right tile does not say life, so
 * a wrong tile that says life — or living — would be the one the hint
 * points at.
 */
export function pickWordDefDistractors(
  word: string,
  correct: string,
  pools: readonly (readonly Root[])[],
  n: number,
  rng: () => number = Math.random,
  maxLen = Number.POSITIVE_INFINITY,
  avoidMean?: string,
): string[] {
  const labels = collectWordDefs(pools, word, maxLen);
  const mean = avoidMean?.replace(/\s+/g, ' ').trim();
  const safe = mean ? labels.filter((label) => !glossSaysMean(mean, label)) : labels;
  return sampleUnique([safe], n, [correct], rng);
}

/**
 * Wrong tiles for a school-word question whose quiet line may still
 * name the root meaning. When that line has already dropped the meaning
 * (it sits in the right tile), a wrong tile may still say it — or the
 * same idea. While the line still says it, neither may be dealt.
 */
export function pickGlossDistractors(
  mean: string,
  word: string,
  gloss: string,
  pools: readonly (readonly Root[])[],
  n: number,
  rng: () => number = Math.random,
): string[] {
  const spoken = mean.replace(/\s+/g, ' ').trim();
  const avoid = spoken && !meaningSitsInAnswer(spoken, gloss) ? spoken : undefined;
  return pickWordDefDistractors(word, gloss, pools, n, rng, GLOSS_TILE_MAX, avoid);
}

/** Wrong options for "which root carries this meaning?". */
export function pickRootDistractors(
  target: Root,
  pools: readonly (readonly Root[])[],
  n: number,
  rng: () => number = Math.random,
): string[] {
  const rootPools = pools.map((set) =>
    set
      .filter((r) => r.root !== target.root && canon(r.mean) !== canon(target.mean))
      .map((r) => r.root),
  );
  return sampleUnique(rootPools, n, [target.root], rng);
}

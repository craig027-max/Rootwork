/**
 * Quiz prompt face — the giant word, the say line, and the origin.
 *
 * A which-word tile named Fort cannot sit under the giant word Fort,
 * and PYRE cannot sit under Pyre. A meaning tile "air" cannot sit under
 * AIR-oh. The root name stays when it is only a hint (Fort over Fortress,
 * Bio over Biology).
 */

export interface PromptRoot {
  root: string;
  say: string;
  mean: string;
  org: string;
  alt: string;
}

export interface WhichWordPrompt {
  /** Giant word. The root, unless that name is the tile — then the meaning. */
  big: string;
  say?: string;
  /**
   * Rush quiet line. `means "life"` while the giant word is the root.
   * The alt, once the giant word had to become the meaning.
   */
  hint?: string;
  /** "from Latin fortis" — absent when those words spell the tile. */
  origin?: string;
  /** True when the root name is the tile, so `big` is the meaning. */
  namedByMeaning: boolean;
}

export interface MeaningPrompt {
  say?: string;
  origin?: string;
}

function clean(raw?: string | null): string {
  return raw?.replace(/\s+/g, ' ').trim() ?? '';
}

/** First letter up, for a giant word taken from a lowercase meaning. */
export function meaningAsName(mean: string): string {
  const spoken = clean(mean);
  if (!spoken) return '';
  return spoken.charAt(0).toUpperCase() + spoken.slice(1);
}

/**
 * True when `text` contains `answer` as its own word.
 * "AIR-oh" spells air. "Latin minor" spells Minor. "Fort" spells Fort.
 * "Fortress" does not spell Fort, and "solvere" does not spell Solve.
 */
export function spellsChoice(text: string, answer: string): boolean {
  const word = clean(answer);
  if (word.length < 3) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^A-Za-z])${escaped}(?:[^A-Za-z]|$)`, 'i').test(text);
}

/**
 * Quiet line under a which-word question. The meaning is a hint until
 * the school word is that meaning — means "equal" over Equal is the tile.
 */
export function rushWordHint(mean: string, word: string): string | undefined {
  const spoken = clean(mean);
  const name = clean(word);
  if (!spoken) return undefined;
  if (name.toLowerCase() === spoken.toLowerCase()) return undefined;
  const hint = `means “${spoken}”`;
  if (spellsChoice(hint, name)) return undefined;
  return hint;
}

/**
 * Which-word prompt. Skip nothing here — callers that can deal another
 * word should. This still refuses to print the tile when the only word
 * left is the root name (Fort, Macro, Zoo) or the say line is the tile
 * (PYRE over Pyre) or the origin contains it (Latin minor over Minor).
 */
export function whichWordPrompt(root: PromptRoot, word: string): WhichWordPrompt {
  const name = clean(root.root);
  const mean = clean(root.mean);
  const say = clean(root.say);
  const org = clean(root.org);
  const alt = clean(root.alt);
  const tile = clean(word);
  const rootSpells = spellsChoice(name, tile);
  const meanName = meaningAsName(mean);
  const meanSpells = spellsChoice(meanName, tile) || spellsChoice(mean, tile);
  let big = name || 'This root';
  if (rootSpells) {
    if (meanName && !meanSpells) big = meanName;
    else if (alt && !spellsChoice(alt, tile)) big = meaningAsName(alt.split('·')[0] ?? alt) || 'This root';
    else big = 'This root';
  }
  const saySafe = say && !spellsChoice(say, tile) ? say : undefined;
  const origin =
    org && !spellsChoice(org, tile) && !spellsChoice(`from ${org}`, tile) ? `from ${org}` : undefined;
  let hint: string | undefined;
  if (!rootSpells) {
    hint = rushWordHint(mean, tile);
  } else if (alt && !spellsChoice(alt, tile) && alt.toLowerCase() !== mean.toLowerCase()) {
    hint = alt;
  }
  return {
    big,
    ...(saySafe ? { say: saySafe } : {}),
    ...(hint ? { hint } : {}),
    ...(origin ? { origin } : {}),
    namedByMeaning: rootSpells,
  };
}

/**
 * Endings that keep the meaning's letters as the same word.
 * "stars" is star. "smallest" is small. "heard" is hear.
 * A leftover like the "t" in "start" is a different word.
 */
const MEANING_INFLECTION =
  /^(?:s|es|ed|d|ing|er|est|ly|y|ies|ied|ier|iest|ness|ful|less|ment|en|ish|ous|ive|ion|tion|ation|able|ible|ings|ers)$/;

/**
 * True when `word` is `stem` plus a grammatical ending.
 * "writing" is write. "makes" is make. "placing" is place (the e drops).
 * "without" is not with, and "sunlight" is not light — those are compounds.
 */
export function carriesInflection(word: string, stem: string): boolean {
  if (stem.length < 3 || word.length <= stem.length) return false;
  if (word.startsWith(stem) && MEANING_INFLECTION.test(word.slice(stem.length))) return true;
  if (stem.endsWith('e')) {
    const dropped = stem.slice(0, -1);
    if (dropped.length >= 3 && word.startsWith(dropped)) {
      return /^(?:ed|er|est|ing)$/.test(word.slice(dropped.length));
    }
  }
  return false;
}

/**
 * True when `word` is this meaning plus an ending or a compound.
 * "sunlight" carries light. "hands" carries hand. "knowledge" carries
 * know. "moving" carries move (the e drops). "living" does not carry
 * life, and "start" does not carry star.
 */
function wordCarriesMeaning(word: string, mean: string): boolean {
  if (mean.length < 4 || word.length <= mean.length) return false;
  const spoken = word.toLowerCase();
  const stem = mean.toLowerCase();
  if (spoken.startsWith(stem)) {
    const rest = spoken.slice(stem.length);
    return MEANING_INFLECTION.test(rest) || rest.length >= 3;
  }
  if (spoken.endsWith(stem) && spoken.length - stem.length >= 2) return true;
  return carriesInflection(spoken, stem);
}

/** True when some word in the tile carries `mean` as a stem or a compound. */
function meaningCarriesIn(mean: string, answer: string): boolean {
  const words = answer.match(/[A-Za-z]+/g) ?? [];
  return words.some((word) => wordCarriesMeaning(word, mean));
}

/**
 * True when this root meaning is already inside the answer tile.
 * "life" sits in "a real person's life". "light" sits in "sunlight"
 * and in "capturing light". "hand" sits in "hands". "star" sits in
 * "stars". "living things" does not contain the word life, and
 * "start" does not contain the word star. A piece of a longer
 * meaning counts too: "half" sits in "foot-and-a-half".
 */
export function meaningSitsInAnswer(mean: string, answer: string): boolean {
  const spoken = clean(mean);
  const tile = clean(answer);
  if (!spoken || !tile) return false;
  if (spellsChoice(tile, spoken) || meaningCarriesIn(spoken, tile)) return true;
  for (const word of spoken.split(/[^A-Za-z]+/)) {
    if (word.length >= 4 && (spellsChoice(tile, word) || meaningCarriesIn(word, tile))) return true;
  }
  return false;
}

/**
 * Quiet line under "What does Biography mean?".
 * `from Bio · life` hands out the word life when the tile is a person's
 * life. `from Photo · light` hands out light when the tile says sunlight.
 * Biology's "living things" does not contain that word, so the hint
 * stays. A wrong tile that still says life is not dealt beside it.
 * The Yes and the miss still teach the meaning.
 */
export function glossQuietLine(root: string, mean: string, gloss?: string | null): string {
  const name = clean(root);
  const spoken = clean(mean);
  const leaks = meaningSitsInAnswer(spoken, gloss ?? '');
  if (name && spoken && !leaks) return `from ${name} · ${spoken}`;
  if (name) return `from ${name}`;
  if (spoken && !leaks) return spoken;
  return 'this word';
}

/**
 * Meaning-question say and origin. Aero drops AIR-oh. The root name
 * stays — Aero does not spell the tile air.
 */
export function meaningPrompt(root: Pick<PromptRoot, 'say' | 'mean' | 'org'>): MeaningPrompt {
  const say = clean(root.say);
  const mean = clean(root.mean);
  const org = clean(root.org);
  const saySafe = say && !spellsChoice(say, mean) ? say : undefined;
  const origin =
    org && !spellsChoice(org, mean) && !spellsChoice(`from ${org}`, mean) ? `from ${org}` : undefined;
  return {
    ...(saySafe ? { say: saySafe } : {}),
    ...(origin ? { origin } : {}),
  };
}

/** Pieces of a which-word or meaning prompt that a learner can read. */
export function promptReadsAnswer(parts: readonly (string | undefined)[], answer: string): boolean {
  return parts.some((part) => Boolean(part) && spellsChoice(part ?? '', answer));
}

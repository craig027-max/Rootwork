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
 * True when this root meaning is already a word inside the answer tile.
 * "life" sits in "a real person's life". "light" sits in "capturing light".
 * "living things" does not contain the word life. A piece of a longer
 * meaning counts too: "half" sits in "foot-and-a-half".
 */
export function meaningSitsInAnswer(mean: string, answer: string): boolean {
  const spoken = clean(mean);
  const tile = clean(answer);
  if (!spoken || !tile) return false;
  if (spellsChoice(tile, spoken)) return true;
  for (const word of spoken.split(/[^A-Za-z]+/)) {
    if (word.length >= 4 && spellsChoice(tile, word)) return true;
  }
  return false;
}

/**
 * Quiet line under "What does Biography mean?".
 * `from Bio · life` hands out the word life when the tile is a person's
 * life. Biology's "living things" does not contain that word, so the
 * hint stays. Photograph drops light. The Yes and the miss still teach it.
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

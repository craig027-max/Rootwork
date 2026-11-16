/**
 * First look at a root or school word the kid has not learned yet.
 *
 * One or two short lines — meaning, origin language, one example —
 * then a single tap reveals the question. The long lead and the
 * example wall stay off this beat so the card is not a quiz and a
 * lesson at the same time.
 *
 * Remember, a Daily / Rush result chip (`asked`), and a card they
 * already own skip it. Daily and Root Rush never come through here.
 * A Yes line already on the card (including a remount mid-win) skips
 * it too, so resume cannot land between the intro and the win.
 */
import type { DeckEntry } from './deckFlow';
import { shortWordDef } from './wordDef';

export const INTRO_CONTINUE_LABEL = 'Show the questions';

/** Language names that take a second word ("Old English"). */
const LANGUAGE_QUALIFIER = /^(old|middle|late|new|proto|ancient)$/i;

export interface CardIntroCopy {
  lines: readonly string[];
  continueLabel: string;
}

export interface CardIntroInput {
  entry: DeckEntry;
  learned: boolean;
  /** Yes line is on this card — including a store-restored win after remount. */
  won: boolean;
  /** Kid already tapped through the intro on this visit. */
  dismissed: boolean;
}

/**
 * True while the intro should be the only beat on the card.
 * Recall is included: Next opens the following root straight onto a
 * question, and that root has not been learned yet.
 */
export function introIsShowing(opts: CardIntroInput): boolean {
  if (opts.dismissed || opts.learned || opts.won) return false;
  return opts.entry === 'teach' || opts.entry === 'find' || opts.entry === 'recall';
}

/** "Greek bíos" → Greek. "Old English mis-" → Old English. "Greek/Latin treis" → Greek and Latin. */
export function originLanguage(org: string): string {
  const langs: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const name = raw.replace(/\s+/g, ' ').trim().replace(/[-–]+$/u, '');
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    langs.push(name);
  };

  for (const part of org.split('·')) {
    const tokens = part.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const head = tokens[0];
    if (!head) continue;
    if (head.includes('/')) {
      for (const piece of head.split('/')) add(piece);
      continue;
    }
    const next = tokens[1];
    if (LANGUAGE_QUALIFIER.test(head) && next) {
      add(`${head} ${next.replace(/[-–]+$/u, '')}`);
      continue;
    }
    add(head);
  }

  if (langs.length === 0) return '';
  if (langs.length === 1) return langs[0] ?? '';
  if (langs.length === 2) return `${langs[0]} and ${langs[1]}`;
  const last = langs[langs.length - 1];
  return `${langs.slice(0, -1).join(', ')}, and ${last}`;
}

function clean(raw: string | null | undefined): string {
  return raw?.replace(/\s+/g, ' ').trim() ?? '';
}

/** First letter down so "Pay for work" reads inside a sentence. */
function kidClause(raw: string): string {
  const text = clean(raw).replace(/\.$/, '');
  if (!text) return '';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function finish(lines: string[]): CardIntroCopy {
  const kept = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return {
    lines: kept.length > 0 ? kept : ['Here is a new word.'],
    continueLabel: INTRO_CONTINUE_LABEL,
  };
}

/** Root card — "Sal means salt. It comes from Latin. Like Salad." */
export function rootIntroCopy(root: {
  root: string;
  mean: string;
  org: string;
  words: readonly { w: string }[];
}): CardIntroCopy {
  const name = clean(root.root) || 'This root';
  const mean = kidClause(root.mean);
  const lang = originLanguage(root.org);
  const example = clean(root.words.find((word) => clean(word.w))?.w);
  const line1 = mean ? `${name} means ${mean}.` : `${name}.`;
  const from = lang ? `It comes from ${lang}.` : '';
  const like = example && example.toLowerCase() !== name.toLowerCase() ? `Like ${example}.` : '';
  const line2 = [from, like].filter(Boolean).join(' ');
  return finish(line2 ? [line1, line2] : [line1]);
}

/**
 * School-word card — "Salary means pay for work. It comes from Latin, from Sal — salt."
 * The gloss is the first clause of the authored definition, not the whole lead.
 */
export function wordIntroCopy(opts: {
  word: string;
  def: string;
  root: string;
  mean: string;
  org: string;
}): CardIntroCopy {
  const word = clean(opts.word);
  const gloss = kidClause(shortWordDef(opts.def) || opts.def);
  const name = clean(opts.root);
  const mean = kidClause(opts.mean);
  const lang = originLanguage(opts.org);
  const line1 = word && gloss ? `${word} means ${gloss}.` : word || `${name || 'This word'}.`;
  const fromRoot = name && mean ? `from ${name} — ${mean}` : name ? `from ${name}` : '';
  let line2 = '';
  if (lang && fromRoot) line2 = `It comes from ${lang}, ${fromRoot}.`;
  else if (lang) line2 = `It comes from ${lang}.`;
  else if (fromRoot) line2 = `It comes ${fromRoot}.`;
  return finish(line2 ? [line1, line2] : [line1]);
}

/** Find uses the school word they opened. Teach and recall introduce the root. */
export function cardIntroCopy(opts: {
  entry: DeckEntry;
  root: string;
  mean: string;
  org: string;
  words: readonly { w: string }[];
  word?: string | null;
  def?: string | null;
}): CardIntroCopy {
  const word = clean(opts.word);
  if ((opts.entry === 'find' || opts.entry === 'asked') && word) {
    return wordIntroCopy({
      word,
      def: opts.def ?? '',
      root: opts.root,
      mean: opts.mean,
      org: opts.org,
    });
  }
  return rootIntroCopy({
    root: opts.root,
    mean: opts.mean,
    org: opts.org,
    words: opts.words,
  });
}

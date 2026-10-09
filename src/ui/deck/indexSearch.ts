/**
 * Browse find — match a root by name, meaning, spoken sound, or an
 * example word. Empty query keeps the catalog as All Roots / Remember.
 * A typed query hides empty tiers and ranks Photo above a buried
 * "photograph" hit so kids do not scroll 183 chips to find one word.
 *
 * School-word forms count (biologist → Biology). A true miss says we
 * don't have that word — not that no root matched, as if they searched
 * wrong. Definitions and breakdowns stay out. They are sentences:
 * "as in a photo" opened Capture, and compacting "Large, or" into
 * "largeor" invented a Geo hit on Xenon / Suburb / Metamorphosis.
 */
import {
  ROOTS,
  TIERS,
  rootId,
  rootsInTier,
  type Root,
  type TierNum,
} from '../../data/roots';
import { indexRootsMissFirst, indexTiersMissFirst } from './indexChip';

/** Fold kid typing: "Bio-logy", "  LIFE  ", "FOH-toh" all become searchable. */
export function cleanSearchQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Kid-typed endings on a school word. Combining forms (phone / graph /
 * logy / meter) stay out — those would light every -phone card.
 */
const WORD_FORM_SUFFIXES = [
  'ically',
  'ical',
  'ation',
  'ition',
  'sion',
  'tion',
  'ment',
  'ness',
  'able',
  'ible',
  'ists',
  'ous',
  'ist',
  'ism',
  'ing',
  'ers',
  'ies',
  'ied',
  'ier',
  'est',
  'er',
  'ed',
  'ly',
  'es',
  's',
  'ic',
  'al',
  'y',
] as const;

const MIN_WORD_STEM = 5;

function stemsOf(value: string): string[] {
  const tight = compact(value);
  if (tight.length < MIN_WORD_STEM) return tight ? [tight] : [];
  const stems = new Set<string>([tight]);
  for (const suf of WORD_FORM_SUFFIXES) {
    if (tight.length - suf.length >= MIN_WORD_STEM && tight.endsWith(suf)) {
      stems.add(tight.slice(0, -suf.length));
    }
  }
  return [...stems];
}

/**
 * Biology ↔ biologist, Photograph ↔ photographer. Short stems stay
 * out so portable cannot invent Port, and definitions stay unread.
 */
export function wordFormHas(word: string, query: string): boolean {
  const q = compact(query);
  const w = compact(word);
  if (q.length < MIN_WORD_STEM || w.length < MIN_WORD_STEM) return false;
  if (q === w) return true;
  const wordStems = stemsOf(w);
  return stemsOf(q).some((stem) => stem.length >= MIN_WORD_STEM && wordStems.includes(stem));
}

/**
 * Match one short field. Compact only a single token so "BY-oh" matches
 * "by oh" and "Biology" matches "Bio-logy". A gloss with a space stays
 * words — compacting "Large, or" yields "largeor", which contains "geo".
 */
function fieldHas(field: string, query: string): boolean {
  if (!query) return false;
  const folded = field
    .toLowerCase()
    .replace(/[·•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (folded.includes(query)) return true;
  if (folded.includes(' ')) return false;
  const tight = compact(query);
  return tight.length > 0 && compact(field).includes(tight);
}

export type IndexMatchWhy = 'root' | 'mean' | 'alt' | 'say' | 'word';

export interface IndexMatch {
  why: IndexMatchWhy;
  /** The example word / spoken sound that matched — already on-chip fields stay blank. */
  hint?: string;
}

/**
 * Why this root matches the query. Empty query matches everything as a
 * catalog row (no hint). Origin / lead / definitions / breakdowns stay
 * out — a sentence that mentions photo is not the Photo card.
 * One or two letters are a root-name typeahead (A → Aqua, or → Ortho).
 * They must not light every chip that merely contains those letters
 * (Port / Form for "or").
 */
export function indexRootMatch(root: Root, query: string): IndexMatch | null {
  const q = cleanSearchQuery(query);
  if (!q) return { why: 'root' };
  if (q.length < 3) {
    return compact(root.root).startsWith(compact(q)) ? { why: 'root' } : null;
  }
  if (fieldHas(root.root, q)) return { why: 'root' };
  if (fieldHas(root.mean, q)) return { why: 'mean' };
  if (fieldHas(root.alt, q)) return { why: 'alt' };
  if (fieldHas(root.say, q)) return { why: 'say', hint: root.say };
  for (const word of root.words) {
    if (fieldHas(word.w, q) || wordFormHas(word.w, q)) return { why: 'word', hint: word.w };
  }
  return null;
}

/** Chip extra line — Biology under Bio when they typed the word, not the root. */
export function indexChipHint(match: IndexMatch | null): string | null {
  const hint = match?.hint?.replace(/\s+/g, ' ').trim();
  if (!hint) return null;
  if (match?.why === 'word' || match?.why === 'say') return hint;
  return null;
}

/**
 * The school word a find tap should open. Meaning / spoken-sound / root
 * hits stay a closed card — only a word match has a chip to reveal.
 */
export function indexFocusWord(match: IndexMatch | null): string | null {
  const hint = match?.hint?.replace(/\s+/g, ' ').trim();
  if (!hint || match?.why !== 'word') return null;
  return hint;
}

export function filterIndexRoots<T extends Root>(roots: readonly T[], query: string): T[] {
  if (!cleanSearchQuery(query)) return [...roots];
  return roots.filter((root) => indexRootMatch(root, query) != null);
}

function matchScore(root: Root, query: string): number {
  const q = cleanSearchQuery(query);
  if (!q) return 0;
  const name = root.root.toLowerCase();
  const tightName = compact(root.root);
  const tightQ = compact(q);
  if (name === q || tightName === tightQ) return 100;
  if (name.startsWith(q) || tightName.startsWith(tightQ)) return 80;
  if (fieldHas(root.root, q)) return 60;
  if (fieldHas(root.mean, q)) return 50;
  if (fieldHas(root.alt, q)) return 40;
  if (root.words.some((word) => fieldHas(word.w, q) || wordFormHas(word.w, q))) return 30;
  if (fieldHas(root.say, q)) return 20;
  return 10;
}

/** Exact / prefix root names lead; catalog order is the tie-break. */
export function rankIndexMatches<T extends Root>(roots: readonly T[], query: string): T[] {
  if (!cleanSearchQuery(query)) return [...roots];
  return [...roots].sort((a, b) => {
    const diff = matchScore(b, query) - matchScore(a, query);
    if (diff !== 0) return diff;
    return 0;
  });
}

/**
 * One tier's chips: filter → miss-first → rank the rest.
 * Empty query is the existing catalog order (misses still lead).
 */
export function arrangeIndexRoots<T extends Root>(
  roots: readonly T[],
  missed: ReadonlySet<string>,
  query: string,
  idOf: (root: T) => string,
): T[] {
  const matched = filterIndexRoots(roots, query);
  const ordered = indexRootsMissFirst(matched, missed, idOf);
  if (!cleanSearchQuery(query) || missed.size === 0) {
    return rankIndexMatches(ordered, query);
  }
  const miss = ordered.filter((root) => missed.has(idOf(root)));
  const rest = ordered.filter((root) => !missed.has(idOf(root)));
  return [...miss, ...rankIndexMatches(rest, query)];
}

export interface IndexBrowseSection {
  t: TierNum;
  name: string;
  sub: string;
  roots: Root[];
  missNames: string[];
}

/** Filtered / ranked catalog sections. Empty tiers drop only when a query is live. */
export function buildIndexBrowseSections(opts: {
  query?: string;
  missed?: Iterable<string>;
}): IndexBrowseSection[] {
  const query = opts.query ?? '';
  const missed = new Set(
    [...(opts.missed ?? [])].filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  const sections = TIERS.map((tier, ti) => {
    const t = (ti + 1) as TierNum;
    const roots = arrangeIndexRoots(rootsInTier(t), missed, query, rootId);
    const missNames = roots.filter((root) => missed.has(rootId(root))).map((root) => root.root);
    return { t, name: tier.n, sub: tier.sub, roots, missNames };
  }).filter((section) => section.roots.length > 0);
  return indexTiersMissFirst(sections, (section) => section.missNames.length > 0);
}

export function indexMatchCount(sections: readonly IndexBrowseSection[]): number {
  return sections.reduce((n, section) => n + section.roots.length, 0);
}

/** Heading — Find once they type, All Roots / Remember otherwise (caller). */
export function indexSearchHeading(): string {
  return 'Find';
}

/** Live-query sub — not 183 roots over a typed Photo. */
export function indexSearchSub(query: string, matchCount: number): string {
  const q = cleanSearchQuery(query);
  if (!q) return `${ROOTS.length} roots · ${TIERS.length} tiers`;
  if (matchCount <= 0) {
    const shown = query.replace(/\s+/g, ' ').trim() || q;
    return `We don't have ${shown}.`;
  }
  return matchCount === 1 ? '1 match' : `${matchCount} matches`;
}

export function indexSearchEmptyHint(): string {
  return 'Try a root (Bio), a meaning (life), or a word we teach (biology).';
}

/** Esc clears a live query first so it does not dump them out of Browse. */
export function indexSearchEscape(query: string): 'clear' | 'close' {
  return cleanSearchQuery(query) ? 'clear' : 'close';
}

export const INDEX_SEARCH_PLACEHOLDER = 'Find a root, meaning, or word';

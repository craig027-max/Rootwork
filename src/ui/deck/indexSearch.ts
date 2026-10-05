/**
 * Browse find — match a root by name, meaning, spoken sound, or an
 * example word. Empty query keeps the catalog as All Roots / Remember.
 * A typed query hides empty tiers and ranks Photo above a buried
 * "photograph" hit so kids do not scroll 183 chips to find one word.
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

function fieldHas(field: string, query: string): boolean {
  if (!query) return false;
  const folded = field.toLowerCase();
  if (folded.includes(query)) return true;
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
 * catalog row (no hint). Origin / lead stay out — Greek / HTML would
 * light up half the deck.
 */
export function indexRootMatch(root: Root, query: string): IndexMatch | null {
  const q = cleanSearchQuery(query);
  if (!q) return { why: 'root' };
  if (fieldHas(root.root, q)) return { why: 'root' };
  if (fieldHas(root.mean, q)) return { why: 'mean' };
  if (fieldHas(root.alt, q)) return { why: 'alt' };
  if (fieldHas(root.say, q)) return { why: 'say', hint: root.say };
  for (const word of root.words) {
    if (fieldHas(word.w, q) || fieldHas(word.d, q) || fieldHas(word.b, q)) {
      return { why: 'word', hint: word.w };
    }
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
  if (root.words.some((word) => fieldHas(word.w, q))) return 30;
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
    return `No roots match ${shown}`;
  }
  return matchCount === 1 ? '1 match' : `${matchCount} matches`;
}

export function indexSearchEmptyHint(): string {
  return 'Try a root (Bio), a meaning (life), or a word (biology).';
}

/** Esc clears a live query first so it does not dump them out of Browse. */
export function indexSearchEscape(query: string): 'clear' | 'close' {
  return cleanSearchQuery(query) ? 'clear' : 'close';
}

export const INDEX_SEARCH_PLACEHOLDER = 'Find a root, meaning, or word';

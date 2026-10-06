import { describe, expect, it } from 'vitest';
import { ROOTS, TIERS, rootId, rootsInTier } from '../../data/roots';
import { indexHeading, indexSub } from './indexChip';
import {
  INDEX_SEARCH_PLACEHOLDER,
  arrangeIndexRoots,
  buildIndexBrowseSections,
  cleanSearchQuery,
  filterIndexRoots,
  indexChipHint,
  indexFocusWord,
  indexMatchCount,
  indexRootMatch,
  indexSearchEmptyHint,
  indexSearchEscape,
  indexSearchHeading,
  indexSearchSub,
  rankIndexMatches,
} from './indexSearch';

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const geo = ROOTS.find((r) => r.root === 'Geo')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;
const graph = ROOTS.find((r) => r.root === 'Graph')!;
const aqua = ROOTS.find((r) => r.root === 'Aqua')!;
const starter = rootsInTier(1);

describe('Browse find — a root, meaning, or word; not a 183-chip scroll', () => {
  it('folds kid typing so Bio-logy and LIFE still match', () => {
    expect(cleanSearchQuery('  Bio-logy  ')).toBe('bio logy');
    expect(cleanSearchQuery('LIFE')).toBe('life');
    expect(cleanSearchQuery('\t')).toBe('');
  });

  it('finds Bio from the root, the meaning, and Biology', () => {
    expect(indexRootMatch(bio, 'bio')?.why).toBe('root');
    expect(indexRootMatch(bio, 'life')?.why).toBe('mean');
    expect(indexRootMatch(bio, 'living things')?.why).toBe('alt');
    expect(indexRootMatch(bio, 'biology')).toEqual({ why: 'word', hint: 'Biology' });
    expect(indexRootMatch(bio, 'BY-oh')).toEqual({ why: 'say', hint: bio.say });
    expect(indexRootMatch(bio, 'xyzzy')).toBeNull();
  });

  it('finds Photo from photograph / photosynthesis — the school-word path', () => {
    expect(indexRootMatch(photo, 'photograph')?.hint).toBe('Photograph');
    expect(indexRootMatch(photo, 'photosynthesis')?.hint).toBe('Photosynthesis');
    expect(indexRootMatch(photo, 'light')?.why).toBe('mean');
    expect(indexChipHint(indexRootMatch(photo, 'photograph'))).toBe('Photograph');
    expect(indexChipHint(indexRootMatch(photo, 'photo'))).toBeNull();
    expect(indexChipHint(indexRootMatch(photo, 'light'))).toBeNull();
    expect(indexFocusWord(indexRootMatch(photo, 'photograph'))).toBe('Photograph');
    expect(indexFocusWord(indexRootMatch(photo, 'photosynthesis'))).toBe('Photosynthesis');
    expect(indexFocusWord(indexRootMatch(bio, 'biology'))).toBe('Biology');
    expect(indexFocusWord(indexRootMatch(bio, 'life'))).toBeNull();
    expect(indexFocusWord(indexRootMatch(bio, 'BY-oh'))).toBeNull();
    expect(indexFocusWord(indexRootMatch(bio, 'bio'))).toBeNull();
  });

  it('does not treat an empty query as a miss — the full catalog stays', () => {
    expect(indexRootMatch(bio, '')).toEqual({ why: 'root' });
    expect(filterIndexRoots(starter, '   ').map((r) => r.root)).toEqual(starter.map((r) => r.root));
    expect(filterIndexRoots(starter, 'photo').map((r) => r.root)).toContain('Photo');
    expect(filterIndexRoots(starter, 'photo').map((r) => r.root)).not.toContain('Aqua');
  });

  it('ranks Graph above Photo when they typed graph, not photograph', () => {
    const ranked = rankIndexMatches([photo, graph, bio], 'graph').map((r) => r.root);
    expect(ranked[0]).toBe('Graph');
    expect(ranked).toContain('Photo');
    expect(ranked).toContain('Bio');
  });

  it('keeps a waiting miss first, then ranks the rest', () => {
    const missed = new Set([rootId(geo)]);
    const arranged = arrangeIndexRoots(starter, missed, 'graph', rootId).map((r) => r.root);
    expect(arranged[0]).toBe('Geo');
    expect(arranged[1]).toBe('Graph');
    expect(arranged).not.toContain('Aqua');
  });

  it('hides empty tiers and counts matches — not 183 roots over Photo', () => {
    const sections = buildIndexBrowseSections({ query: 'photograph' });
    expect(indexMatchCount(sections)).toBeGreaterThanOrEqual(1);
    expect(sections.every((s) => s.roots.length > 0)).toBe(true);
    expect(sections.some((s) => s.roots.some((r) => r.root === 'Photo'))).toBe(true);
    expect(indexSearchSub('photograph', indexMatchCount(sections))).toMatch(/match/);
    expect(indexSearchSub('photograph', indexMatchCount(sections))).not.toMatch(/183 roots|5 tiers/);

    const empty = buildIndexBrowseSections({ query: 'xyzzyqq' });
    expect(empty).toEqual([]);
    expect(indexMatchCount(empty)).toBe(0);
    expect(indexSearchSub('xyzzyqq', 0)).toBe('No roots match xyzzyqq');
  });

  it('empty query is still All Roots / Remember — Find is only after they type', () => {
    const open = buildIndexBrowseSections({ query: '' });
    expect(indexMatchCount(open)).toBe(ROOTS.length);
    expect(open.map((s) => s.name)).toEqual(TIERS.map((t) => t.n));
    expect(indexSearchHeading()).toBe('Find');
    expect(indexSearchHeading()).not.toBe('All Roots');
    expect(indexHeading([])).toBe('All Roots');
    expect(indexHeading([geo.root])).toBe('Remember');
    expect(indexSub([], { rootCount: ROOTS.length, tierCount: TIERS.length })).toBe(
      `${ROOTS.length} roots · ${TIERS.length} tiers`,
    );
    expect(indexSearchSub('', ROOTS.length)).toBe(`${ROOTS.length} roots · ${TIERS.length} tiers`);
    expect(indexSearchEmptyHint()).toMatch(/biology/i);
    expect(INDEX_SEARCH_PLACEHOLDER).toMatch(/root.*word/i);
  });

  it('Esc clears a live query before it closes Browse', () => {
    expect(indexSearchEscape('photo')).toBe('clear');
    expect(indexSearchEscape('   ')).toBe('close');
    expect(indexSearchEscape('')).toBe('close');
  });

  it('does not invent Aqua from a Photo search, and does not expand the catalog', () => {
    const photoHit = filterIndexRoots(starter, 'photosynthesis');
    expect(photoHit.map((r) => r.root)).toEqual(['Photo']);
    expect(photoHit.map((r) => r.root)).not.toContain(aqua.root);
    expect(ROOTS.length).toBe(183);
  });
});

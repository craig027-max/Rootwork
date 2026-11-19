import { describe, expect, it } from 'vitest';
import {
  ROOTS,
  isRootOpenable,
  rootId,
  rootsInTier,
  type TierNum,
} from '../data/roots';
import { dailySeed, dailyTilePreview, pickDailyRoots } from '../core/daily';
import { shownLineMean, withHeldMean } from '../core/playedMean';
import {
  buildIndexBrowseSections,
  filterIndexRoots,
  indexChipAria,
  indexChipFace,
  indexChipHint,
  indexMatchCount,
  indexRootMatch,
} from './deck/indexSearch';
import { buildDetailVM } from './home/detailVM';
import { buildMenu, tierTilePreview } from './home/menu';

const fresh = new Set<string>();
const bio = ROOTS.find((r) => r.root === 'Bio')!;
const geo = ROOTS.find((r) => r.root === 'Geo')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;
const ami = ROOTS.find((r) => r.root === 'Ami')!;
const sal = ROOTS.find((r) => r.root === 'Sal')!;

function tierRow(completed: Set<string>, nextPlay: boolean) {
  const { items } = buildMenu(completed, false, { currentTier: 1, nextPlay });
  const row = items.find((item) => item.kind === 'tier' && item.t === 1);
  if (!row || row.kind !== 'tier') throw new Error('fixture: Starter row missing');
  return buildDetailVM(row, {
    dailyRoots: [],
    dailyDone: false,
    streak: 0,
    nextPlay,
    completed,
    entitled: false,
  });
}

function faceFor(root: (typeof ROOTS)[number], played: boolean) {
  return indexChipFace({
    root: root.root,
    mean: root.mean,
    match: { why: 'root' },
    played,
  });
}

describe('meanings stay hidden until the lesson is played', () => {
  it('keeps pronunciations and does not find an unplayed root by them leaking a meaning', () => {
    expect(bio.say).toBe('BY-oh');
    expect(geo.say).toBe('JEE-oh');
    expect(photo.say).toBe('FOH-toh');
    expect(sal.say).toBe('SAL');
    for (const root of [bio, geo, photo, sal]) {
      const hit = indexRootMatch(root, root.say, { played: fresh });
      expect(hit, root.root).not.toBeNull();
      expect(hit?.why === 'mean' || hit?.why === 'alt', root.root).toBe(false);
      if (hit?.why === 'say') expect(indexChipHint(hit)).toBe(root.say);
    }
  });

  it('shows no meaning on Home, Daily, or Browse for a fresh profile — whole catalog', () => {
    expect(ROOTS.length).toBe(291);

    const first = tierRow(fresh, true);
    expect(first.samples).toEqual([]);
    expect(first.scene?.caption).toBe(bio.root);
    expect(first.scene?.caption).not.toMatch(/life/i);

    const dashboard = tierRow(fresh, false);
    expect(dashboard.samples.length).toBeGreaterThan(0);
    for (const sample of dashboard.samples) {
      expect(sample.mean, sample.root).toBe('');
    }
    expect(dashboard.scene?.caption).toBe(bio.root);
    expect(dashboard.scene?.caption).not.toContain(bio.mean);

    for (const t of [1, 2, 3, 4, 5] as TierNum[]) {
      for (const line of tierTilePreview(t, fresh, true)) {
        const root = ROOTS.find((item) => item.root === line.root)!;
        expect(line.mean, root.root).toBe('');
        expect(line.mean, root.root).not.toContain(root.mean);
        expect(line.mean, root.root).not.toContain(root.alt);
      }
    }

    for (const root of ROOTS) {
      expect(shownLineMean(root.root, root.mean, fresh), root.root).toBe('');
      expect(shownLineMean(root.root, root.alt, fresh), root.root).toBe('');
      expect(faceFor(root, false).sub, root.root).toBe('');
      expect(faceFor(root, false).title, root.root).toBe(root.root);
      expect(indexChipAria({ root: root.root, kind: 'open' }), root.root).toBe(root.root);
      expect(indexChipAria({ root: root.root, kind: 'open' }), root.root).not.toContain(root.mean);

      const word = root.words[0];
      const wordMatch = word ? indexRootMatch(root, word.w, { played: fresh }) : null;
      if (word && wordMatch?.why === 'word') {
        const wordFace = indexChipFace({
          root: root.root,
          mean: root.mean,
          match: wordMatch,
          played: false,
        });
        expect(wordFace.sub, `${root.root} ${word.w}`).toBe(`from ${root.root}`);
        expect(wordFace.sub.toLowerCase(), word.w).not.toContain(` · ${root.mean.toLowerCase()}`);
        expect(wordFace.title, word.w).toBe(word.w);
      }

      const q = root.mean.replace(/[^a-z0-9]+/gi, ' ').trim();
      if (q.length >= 3) {
        const why = indexRootMatch(root, root.mean, { played: fresh })?.why;
        expect(why === 'mean' || why === 'alt', root.root).toBe(false);
      }
    }

    const pool = ROOTS.filter((root) => isRootOpenable(rootId(root), false));
    const deal = pickDailyRoots(pool, dailySeed('2026-11-18', null));
    const { items } = buildMenu(fresh, false, {
      currentTier: 1,
      nextPlay: false,
      dailyPreview: dailyTilePreview(deal),
    });
    const daily = items.find((item) => item.kind === 'mode' && item.key === 'daily');
    if (daily?.kind !== 'mode') throw new Error('fixture: Daily tile missing');
    expect(daily.preview?.length).toBeGreaterThan(0);
    for (const line of daily.preview ?? []) {
      expect(line.mean, line.root).toBe('');
    }
    const dailyVm = buildDetailVM(daily, {
      dailyRoots: deal,
      dailyDone: false,
      streak: 0,
      nextPlay: false,
      completed: fresh,
      entitled: false,
    });
    for (const sample of dailyVm.samples) {
      expect(sample.mean, sample.root).toBe('');
    }
    const caption = dailyVm.scene?.caption ?? '';
    for (const root of deal) {
      expect(caption, root.root).not.toContain(root.mean);
    }

    const sections = buildIndexBrowseSections({ played: fresh });
    expect(indexMatchCount(sections)).toBe(ROOTS.length);
    for (const section of sections) {
      for (const root of section.roots) {
        expect(faceFor(root, false).sub, root.root).toBe('');
      }
    }
  });

  it('does not find an unplayed root by its meaning or gloss', () => {
    expect(indexRootMatch(ami, 'ami', { played: fresh })?.why).toBe('root');
    expect(indexRootMatch(ami, 'amity', { played: fresh })?.why).toBe('word');
    expect(indexRootMatch(ami, ami.say, { played: fresh })?.why).toBe('say');
    expect(indexRootMatch(ami, 'friend', { played: fresh })).toBeNull();
    expect(indexRootMatch(ami, 'friendly', { played: fresh })).toBeNull();

    const friend = filterIndexRoots(ROOTS, 'friend', { played: fresh });
    expect(friend.map((root) => root.root)).not.toContain('Ami');
    for (const root of friend) {
      const match = indexRootMatch(root, 'friend', { played: fresh });
      const face = indexChipFace({
        root: root.root,
        mean: root.mean,
        match,
        played: false,
      });
      expect(face.sub.toLowerCase(), root.root).not.toContain('friend');
      expect(match?.why === 'mean' || match?.why === 'alt', root.root).toBe(false);
    }

    const life = filterIndexRoots(ROOTS, 'life', { played: fresh });
    expect(life.map((root) => root.root)).not.toContain('Bio');
    expect(life.map((root) => root.root)).not.toContain('Anim');
    expect(life.map((root) => root.root)).not.toContain('Vit');
    for (const root of life) {
      const match = indexRootMatch(root, 'life', { played: fresh });
      expect(match?.why === 'mean' || match?.why === 'alt', root.root).toBe(false);
      const face = indexChipFace({
        root: root.root,
        mean: root.mean,
        match,
        played: false,
      });
      expect(face.sub.toLowerCase(), root.root).not.toContain(root.mean.toLowerCase());
    }
  });

  it('shows a meaning only for the root that was played, in Home, Daily, and Browse', () => {
    const owned = new Set([rootId(bio)]);

    const recap = tierTilePreview(1, owned, false, { complete: true });
    expect(recap).toEqual([{ root: 'Bio', mean: 'life' }]);
    for (const line of tierTilePreview(1, owned, false)) {
      expect(line.root).not.toBe('Bio');
      expect(line.mean).toBe('');
    }
    for (const t of [2, 3, 4, 5] as TierNum[]) {
      for (const line of tierTilePreview(t, owned, true)) {
        expect(line.mean, line.root).toBe('');
      }
    }

    const lines = withHeldMean(
      ROOTS.map((root) => ({ root: root.root, mean: root.mean })),
      owned,
    );
    for (const line of lines) {
      expect(line.mean, line.root).toBe(line.root === 'Bio' ? 'life' : '');
    }

    const home = tierRow(owned, false);
    expect(home.scene?.caption).toBe(geo.root);
    expect(home.scene?.caption).not.toContain(geo.mean);
    for (const sample of home.samples) expect(sample.mean, sample.root).toBe('');

    for (const root of ROOTS) {
      const on = owned.has(rootId(root));
      expect(faceFor(root, on).sub, root.root).toBe(on ? root.mean : '');
    }
    const bioWord = indexChipFace({
      root: bio.root,
      mean: bio.mean,
      match: indexRootMatch(bio, 'biology', { played: owned }),
      played: true,
    });
    expect(bioWord).toEqual({ title: 'Biology', sub: 'from Bio · life', word: 'Biology' });
    const amiWord = indexChipFace({
      root: ami.root,
      mean: ami.mean,
      match: indexRootMatch(ami, 'amity', { played: owned }),
      played: false,
    });
    expect(amiWord.sub).toBe('from Ami');
    expect(amiWord.sub).not.toMatch(/friend/i);

    const life = filterIndexRoots(ROOTS, 'life', { played: owned });
    expect(life.map((root) => root.root)).toContain('Bio');
    expect(life.map((root) => root.root)).not.toContain('Anim');
    expect(life.map((root) => root.root)).not.toContain('Vit');
    expect(filterIndexRoots(ROOTS, 'friend', { played: owned }).map((root) => root.root)).not.toContain(
      'Ami',
    );
    expect(indexRootMatch(geo, 'earth', { played: owned })).toBeNull();
    expect(indexRootMatch(geo, 'geo', { played: owned })?.why).toBe('root');
  });

  it('keeps meanings for roots an existing profile already owns', () => {
    const owned = new Set([rootId(bio), rootId(geo), rootId(ami)]);
    expect(filterIndexRoots(ROOTS, 'life', { played: owned }).map((root) => root.root)).toContain('Bio');
    expect(filterIndexRoots(ROOTS, 'earth', { played: owned }).map((root) => root.root)).toContain('Geo');
    expect(filterIndexRoots(ROOTS, 'friend', { played: owned }).map((root) => root.root)).toContain(
      'Ami',
    );
    expect(filterIndexRoots(ROOTS, 'friendly', { played: owned }).map((root) => root.root)).toContain(
      'Ami',
    );
    expect(filterIndexRoots(ROOTS, 'light', { played: owned }).map((root) => root.root)).not.toContain(
      'Photo',
    );
    expect(faceFor(bio, true).sub).toBe('life');
    expect(faceFor(geo, true).sub).toBe('earth');
    expect(faceFor(ami, true).sub).toBe('friend');
    expect(faceFor(photo, false).sub).toBe('');
    expect(shownLineMean(ami.root, ami.mean, owned)).toBe('friend');
    expect(shownLineMean(photo.root, photo.mean, owned)).toBe('');

    const starter = new Set(rootsInTier(1).map((root) => rootId(root)));
    const recap = tierTilePreview(1, starter, false, { complete: true });
    expect(recap.map((line) => line.mean)).toEqual(
      rootsInTier(1)
        .slice(0, 4)
        .map((root) => root.mean),
    );
    for (const line of tierTilePreview(2, starter, true)) {
      expect(line.mean, line.root).toBe('');
    }
  });
});

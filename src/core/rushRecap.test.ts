import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import {
  RUSH_RECAP_PREVIEW_COUNT,
  homeRushRecapPreview,
  liveRushRecap,
  parseRushRecap,
  peekChipDone,
  rushHoldLine,
  rushMissLine,
  rushRecapChipLabel,
  rushRecapFromRun,
  rushRecapPreview,
  todayRushRecap,
} from './rushRecap';

const first = firstRoot();
if (!first) throw new Error('fixture: expected Bio');
const starter = rootsInTier(1);
const geo = starter[1];
const photo = starter[2];
if (!geo || !photo) throw new Error('fixture: expected Geo / Photo');

const kidRecap = rushRecapFromRun(
  [
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
    { id: rootId(photo), ok: true },
  ],
  { day: '2026-09-15', studentId: 'kid-a' },
);

describe('parseRushRecap + liveRushRecap', () => {
  it('keeps a real last run and drops junk / another kid', () => {
    expect(kidRecap).toEqual({
      day: '2026-09-15',
      studentId: 'kid-a',
      roots: [
        { id: rootId(first), root: first.root, mean: first.mean, ok: true },
        { id: rootId(geo), root: geo.root, mean: geo.mean, ok: false },
        { id: rootId(photo), root: photo.root, mean: photo.mean, ok: true },
      ],
    });
    expect(parseRushRecap(kidRecap)).toEqual(kidRecap);
    expect(parseRushRecap({ day: 'nope', studentId: null, roots: [] })).toBeNull();
    expect(parseRushRecap({ day: '2026-09-15', roots: [{ id: '', root: 'Bio' }] })).toBeNull();
    expect(liveRushRecap(kidRecap, 'kid-a')).toEqual(kidRecap);
    expect(liveRushRecap(kidRecap, 'kid-b')).toBeNull();
    expect(liveRushRecap(kidRecap, null)).toBeNull();
    expect(liveRushRecap(null, 'kid-a')).toBeNull();
  });

  it('does not invent a Bio / Geo / Photo teaser from an empty run', () => {
    expect(rushRecapFromRun([], { day: '2026-09-15', studentId: null })).toBeNull();
    expect(rushRecapFromRun([{ id: 'missing', ok: true }], { day: '2026-09-15', studentId: null })).toBeNull();
    expect(rushRecapPreview(null)).toEqual([]);
    expect(homeRushRecapPreview(null)).toEqual([]);
  });
});

describe('rushRecapPreview + homeRushRecapPreview', () => {
  it('peeks the real last run — play order, not a Bio → Geo → Photo dump', () => {
    expect(RUSH_RECAP_PREVIEW_COUNT).toBe(4);
    const shuffled = rushRecapFromRun(
      [
        { id: rootId(photo), ok: true },
        { id: rootId(first), ok: true },
      ],
      { day: '2026-09-15', studentId: 'kid-a' },
    );
    expect(rushRecapPreview(shuffled).map((s) => s.root)).toEqual([photo.root, first.root]);
    expect(rushRecapPreview(shuffled).map((s) => s.root)).not.toEqual([
      first.root,
      geo.root,
      photo.root,
    ]);
    expect(rushRecapPreview(kidRecap, 2)).toEqual([
      { id: rootId(first), root: first.root, mean: first.mean, ok: true },
      { id: rootId(geo), root: geo.root, mean: geo.mean, ok: false },
    ]);
    expect(homeRushRecapPreview(kidRecap).map((s) => s.root)).toEqual([
      first.root,
      geo.root,
      photo.root,
    ]);
  });

  it('hides the Home peek while Daily is mid-run so Chron is not buried', () => {
    expect(homeRushRecapPreview(kidRecap, { dailyResume: true })).toEqual([]);
    expect(homeRushRecapPreview(kidRecap, { dailyResume: false })).toHaveLength(3);
  });
});

describe('rushHoldLine + rushMissLine + rushRecapChipLabel', () => {
  it('names the meaning on a correct hold — not points-only', () => {
    expect(rushHoldLine('Chron', 'time', 200, 2)).toBe('Yes — Chron means time. +200 · 2× combo');
    expect(rushHoldLine('Bio', 'life', 100, 1)).toBe('Yes — Bio means life. +100');
    expect(rushHoldLine('', '', 100, 1)).toBe('+100');
  });

  it('names the meaning on a miss — not a label-only dump', () => {
    expect(rushMissLine('Chron', 'time')).toBe('Nope — Chron means time.');
    expect(rushMissLine('Bio', 'life')).toBe('Nope — Bio means life.');
    expect(rushMissLine('', '')).toBe('Nope — try the next one.');
  });

  it('names Remember vs Meet vs Missed on a result chip', () => {
    expect(rushRecapChipLabel('Bio', true)).toBe('Remember Bio');
    expect(rushRecapChipLabel('Chron', false)).toBe('Meet Chron');
    expect(rushRecapChipLabel('Geo', true, false)).toBe('Missed Geo');
    expect(rushRecapChipLabel('Chron', false, false)).toBe('Missed Chron');
    expect(rushRecapChipLabel('Photo', true, true)).toBe('Remember Photo');
  });
});

describe('todayRushRecap + peekChipDone', () => {
  it('lands only on today\'s last run — yesterday still peeks, does not steal Home', () => {
    expect(todayRushRecap(kidRecap, 'kid-a', '2026-09-15')).toEqual(kidRecap);
    expect(todayRushRecap(kidRecap, 'kid-a', '2026-09-16')).toBeNull();
    expect(todayRushRecap(kidRecap, 'kid-b', '2026-09-15')).toBeNull();
    expect(peekChipDone({ ok: true })).toBe(true);
    expect(peekChipDone({ ok: false })).toBe(false);
    expect(peekChipDone({ done: true, ok: false })).toBe(false);
    expect(peekChipDone({ done: true })).toBe(true);
    expect(peekChipDone({ done: false })).toBe(false);
  });
});

describe('catalog size', () => {
  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

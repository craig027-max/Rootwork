import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { HEAR_CLIP_IDS } from './hearClips';
import { HEAR_BEAT_SPLITS } from './hearBeatTimes';
import {
  hearBeatChips,
  hearBeatIndex,
  hearBeatLabels,
  hearBeatSplits,
} from './hearBeats';
import { hearClipId } from './speak';

function parseSpeechStarts(ffmpegErr: string): [number, number] {
  const starts: number[] = [];
  const ends: Array<{ end: number; duration: number }> = [];
  for (const line of ffmpegErr.split('\n')) {
    const start = line.match(/silence_start:\s*([0-9.]+)/);
    if (start) starts.push(Number(start[1]));
    const end = line.match(
      /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/,
    );
    if (end) ends.push({ end: Number(end[1]), duration: Number(end[2]) });
  }
  const gaps: number[] = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    const s = starts[i]!;
    const e = ends[i]!;
    if (e.duration >= 0.45 && e.duration <= 1.05 && s > 0.15) {
      gaps.push(e.end);
    }
  }
  expect(gaps, ffmpegErr).toHaveLength(2);
  return [gaps[0]!, gaps[1]!];
}

describe('hearBeatLabels', () => {
  it('shows name, spoken sound, and letters — not raw on-card say', () => {
    const bio = hearBeatLabels('Bio', 'BY-oh');
    expect(bio).toEqual({ name: 'Bio', sound: 'bye oh', letters: 'B. I. O.' });
    expect(bio.sound).not.toBe('BY-oh');
    expect(bio.sound).not.toContain('BY');

    const geo = hearBeatLabels('Geo', 'JEE-oh');
    expect(geo).toEqual({ name: 'Geo', sound: 'jee oh', letters: 'G. E. O.' });
    expect(geo.sound).not.toContain('JEE');

    const photo = hearBeatLabels('Photo', 'FOH-toh');
    expect(photo).toEqual({
      name: 'Photo',
      sound: 'foe toh',
      letters: 'P. H. O. T. O.',
    });
    expect(photo.sound).not.toContain('FOH');
  });

  it('keeps catalog on-card say unchanged while labels use spoken sound', () => {
    for (const r of ROOTS) {
      expect(r.say.length, r.root).toBeGreaterThan(0);
      const labels = hearBeatLabels(r.root, r.say);
      expect(labels.name, r.root).toBe(r.root);
      expect(labels.letters, r.root).toMatch(/^[A-Z]\.( [A-Z]\.)*$/);
      if (r.say !== labels.sound) {
        expect(labels.sound, r.root).not.toContain(r.say);
      }
    }
  });
});

describe('hearBeatIndex: highlight moves name → sound → letters', () => {
  const bio = HEAR_BEAT_SPLITS.bio;

  it('uses measured Bio splits, not equal thirds', () => {
    expect(bio).toEqual([1.241, 2.563]);
    expect(bio![0]).not.toBeCloseTo(4.18 / 3, 1);
    expect(bio![1]).not.toBeCloseTo((4.18 * 2) / 3, 1);
  });

  it('advances through the three Hear beats as currentTime crosses splits', () => {
    expect(hearBeatIndex(0, bio!)).toBe(0);
    expect(hearBeatIndex(0.4, bio!)).toBe(0);
    expect(hearBeatIndex(1.24, bio!)).toBe(0);
    expect(hearBeatIndex(1.241, bio!)).toBe(1);
    expect(hearBeatIndex(2.0, bio!)).toBe(1);
    expect(hearBeatIndex(2.562, bio!)).toBe(1);
    expect(hearBeatIndex(2.563, bio!)).toBe(2);
    expect(hearBeatIndex(4.0, bio!)).toBe(2);
  });

  it('marks exactly one chip active at each beat', () => {
    const labels = hearBeatLabels('Bio', 'BY-oh');
    expect(hearBeatChips(labels, 0).map((b) => [b.kind, b.active, b.label])).toEqual([
      ['name', true, 'Bio'],
      ['sound', false, 'bye oh'],
      ['letters', false, 'B. I. O.'],
    ]);
    expect(hearBeatChips(labels, 1).map((b) => b.active)).toEqual([false, true, false]);
    expect(hearBeatChips(labels, 2).map((b) => b.active)).toEqual([false, false, true]);
  });
});

describe('measured Hear beat map', () => {
  it('covers every catalog Hear clip and no extras', () => {
    expect(Object.keys(HEAR_BEAT_SPLITS)).toHaveLength(HEAR_CLIP_IDS.size);
    for (const r of ROOTS) {
      const id = hearClipId(r.root);
      expect(HEAR_BEAT_SPLITS[id], id).toBeDefined();
      expect(hearBeatSplits(r.root), id).toEqual(HEAR_BEAT_SPLITS[id]);
      const [t2, t3] = HEAR_BEAT_SPLITS[id]!;
      expect(t2, id).toBeGreaterThan(0.5);
      expect(t3, id).toBeGreaterThan(t2);
    }
  });

  it('Bio / Geo / Photo splits match silence gaps in the shipped mp3s', () => {
    for (const id of ['bio', 'geo', 'photo'] as const) {
      const file = join(process.cwd(), 'public', 'audio', 'hear', `${id}.mp3`);
      const result = spawnSync(
        'ffmpeg',
        ['-i', file, '-af', 'silencedetect=noise=-35dB:d=0.35', '-f', 'null', '-'],
        { encoding: 'utf8' },
      );
      const live = parseSpeechStarts(`${result.stdout}\n${result.stderr}`);
      const stored = HEAR_BEAT_SPLITS[id]!;
      expect(stored[0], id).toBeCloseTo(live[0], 2);
      expect(stored[1], id).toBeCloseTo(live[1], 2);
    }
  });
});

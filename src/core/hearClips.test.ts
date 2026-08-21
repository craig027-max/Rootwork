import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, rootId } from '../data/roots';
import { HEAR_CLIP_IDS, HEAR_CLIP_VOICE } from './hearClips';

const clipDir = join(process.cwd(), 'public', 'audio', 'hear');

describe('baked hear clips', () => {
  it('uses one warm teacher voice (not a novelty / picker list)', () => {
    expect(HEAR_CLIP_VOICE).toBe('en-US-JennyNeural');
  });

  it('ships a clip file for every catalog root and no extras', () => {
    expect(ROOTS.length).toBeGreaterThan(10);
    for (const r of ROOTS) {
      const id = rootId(r);
      expect(HEAR_CLIP_IDS.has(id), `${r.root} missing from HEAR_CLIP_IDS`).toBe(true);
      const file = join(clipDir, `${id}.mp3`);
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeGreaterThan(500);
    }
    const files = readdirSync(clipDir).filter((name) => name.endsWith('.mp3'));
    expect(files).toHaveLength(ROOTS.length);
    expect(HEAR_CLIP_IDS.size).toBe(ROOTS.length);
  });
});

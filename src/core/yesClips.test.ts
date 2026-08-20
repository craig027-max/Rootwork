import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rootId, rootsInTier } from '../data/roots';
import { YES_CLIP_IDS, YES_CLIP_VOICE } from './yesClips';

const clipDir = join(process.cwd(), 'public', 'audio', 'yes');

describe('baked Yes clips', () => {
  it('uses the same warm teacher voice as Hear (not a novelty / picker list)', () => {
    expect(YES_CLIP_VOICE).toBe('en-US-JennyNeural');
  });

  it('ships a clip file for every Starter (Tier 1) root', () => {
    const starter = rootsInTier(1);
    expect(starter.length).toBeGreaterThan(10);
    for (const r of starter) {
      const id = rootId(r);
      expect(YES_CLIP_IDS.has(id), `${r.root} missing from YES_CLIP_IDS`).toBe(true);
      const file = join(clipDir, `${id}.mp3`);
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeGreaterThan(500);
    }
  });
});

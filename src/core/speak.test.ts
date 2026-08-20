import { afterEach, describe, expect, it, vi } from 'vitest';
import { HEAR_CLIP_IDS } from './hearClips';
import { hearClipId, hearClipUrl, speakRoot, utteranceText } from './speak';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('utteranceText', () => {
  it('speaks the root name and its say-spelling', () => {
    expect(utteranceText('Bio', 'BY-oh')).toBe('Bio. BY-oh.');
    expect(utteranceText('Aqua', 'AH-kwuh')).toBe('Aqua. AH-kwuh.');
    expect(utteranceText('Port', 'PORT')).toBe('Port.');
  });
});

describe('hearClipUrl', () => {
  it('returns a static asset URL only when the clip is listed', () => {
    const ids = new Set(['bio']);
    expect(hearClipUrl('Bio', ids, '/')).toBe('/audio/hear/bio.mp3');
    expect(hearClipUrl('Bio', ids, '/Rootwork/')).toBe('/Rootwork/audio/hear/bio.mp3');
    expect(hearClipUrl('NoSuchRoot', ids, '/')).toBeNull();
  });

  it('uses the lowercase root id as the filename', () => {
    expect(hearClipId('Bio')).toBe('bio');
    expect(hearClipId('Photo')).toBe('photo');
  });
});

describe('speakRoot', () => {
  it('plays a baked clip when one is present', () => {
    expect(HEAR_CLIP_IDS.has('bio')).toBe(true);
    const played: string[] = [];
    speakRoot('Bio', 'BY-oh', {
      play(url) {
        played.push(url);
      },
    });
    expect(played).toHaveLength(1);
    expect(played[0]).toMatch(/audio\/hear\/bio\.mp3$/);
  });

  it('does not throw and does not use speechSynthesis when the clip is missing', () => {
    const synth = {
      speak: vi.fn(),
      cancel: vi.fn(),
    };
    vi.stubGlobal('speechSynthesis', synth);
    const played: string[] = [];
    expect(() =>
      speakRoot('NoSuchRoot', 'NO-pe', {
        play(url) {
          played.push(url);
        },
      }),
    ).not.toThrow();
    expect(played).toEqual([]);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('does not throw when the player itself throws', () => {
    expect(HEAR_CLIP_IDS.has('bio')).toBe(true);
    expect(() =>
      speakRoot('Bio', 'BY-oh', {
        play() {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });

  it('never calls speechSynthesis when a clip plays', () => {
    const synth = { speak: vi.fn(), cancel: vi.fn() };
    vi.stubGlobal('speechSynthesis', synth);
    speakRoot('Bio', 'BY-oh', { play() {} });
    expect(synth.speak).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { successLine } from './deckFlow';
import { HEAR_CLIP_IDS } from './hearClips';
import { ROOTS } from '../data/roots';
import {
  hearClipId,
  hearClipUrl,
  speakRoot,
  speakYes,
  utteranceText,
  yesClipUrl,
  yesUtteranceText,
} from './speak';
import { YES_CLIP_IDS } from './yesClips';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('utteranceText', () => {
  it('speaks name, say, and spelled letters for Bio; on-card say stays BY-oh', () => {
    const bio = ROOTS.find((r) => r.root === 'Bio');
    if (!bio) throw new Error('fixture: Bio');
    expect(bio.say).toBe('BY-oh');
    expect(utteranceText(bio.root, bio.say)).toBe(
      'Bio. BY-oh. The letters B. I. O.',
    );
  });

  it('speaks name, say, and spelled letters for Geo; on-card say stays JEE-oh', () => {
    const geo = ROOTS.find((r) => r.root === 'Geo');
    if (!geo) throw new Error('fixture: Geo');
    expect(geo.say).toBe('JEE-oh');
    expect(utteranceText(geo.root, geo.say)).toBe(
      'Geo. JEE-oh. The letters G. E. O.',
    );
  });

  it('speaks name, say, and spelled letters for a longer root (Thanato)', () => {
    const thanato = ROOTS.find((r) => r.root === 'Thanato');
    if (!thanato) throw new Error('fixture: Thanato');
    expect(thanato.say).toBe('THAN-uh-toh');
    expect(utteranceText(thanato.root, thanato.say)).toBe(
      'Thanato. THAN-uh-toh. The letters T. H. A. N. A. T. O.',
    );
  });

  it('spells only A–Z letters when the written form has extra characters', () => {
    expect(utteranceText('X-ray2', 'EKS-ray')).toBe(
      'X-ray2. EKS-ray. The letters X. R. A. Y.',
    );
  });

  it('keeps say even when it matches the root name (Port)', () => {
    const port = ROOTS.find((r) => r.root === 'Port');
    if (!port) throw new Error('fixture: Port');
    expect(port.say).toBe('PORT');
    expect(utteranceText(port.root, port.say)).toBe(
      'Port. PORT. The letters P. O. R. T.',
    );
  });

  it('uses periods after each letter, not commas', () => {
    expect(utteranceText('Geo', 'JEE-oh')).not.toContain(',');
    expect(utteranceText('Bio', 'BY-oh')).not.toBe(
      'Bio. BY-oh. The letters B, I, O.',
    );
  });

  it('builds name + say + letters for every catalog root without changing on-card say', () => {
    const cardSay = Object.fromEntries(ROOTS.map((r) => [r.root, r.say]));
    for (const r of ROOTS) {
      const line = utteranceText(r.root, r.say);
      expect(line.startsWith(`${r.root}. ${r.say}. The letters `), r.root).toBe(
        true,
      );
      expect(line, r.root).toMatch(/The letters [A-Z]\.( [A-Z]\.)*$/);
      expect(r.say, r.root).toBe(cardSay[r.root]);
    }
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

describe('yesUtteranceText', () => {
  it('matches the on-screen Yes line (root name + meaning)', () => {
    const bio = ROOTS.find((r) => r.root === 'Bio');
    if (!bio) throw new Error('fixture: Bio');
    expect(yesUtteranceText('Bio', 'life')).toBe('Yes — Bio means life.');
    expect(yesUtteranceText(bio.root, bio.mean)).toBe(successLine(bio));
  });

  it('keeps Geo Yes as meaning-only (no JEE-oh smash)', () => {
    const geo = ROOTS.find((r) => r.root === 'Geo');
    if (!geo) throw new Error('fixture: Geo');
    expect(yesUtteranceText(geo.root, geo.mean)).toBe('Yes — Geo means earth.');
    expect(yesUtteranceText(geo.root, geo.mean)).toBe(successLine(geo));
  });
});

describe('yesClipUrl', () => {
  it('returns a static asset URL only when the clip is listed', () => {
    const ids = new Set(['bio']);
    expect(yesClipUrl('Bio', ids, '/')).toBe('/audio/yes/bio.mp3');
    expect(yesClipUrl('Bio', ids, '/Rootwork/')).toBe('/Rootwork/audio/yes/bio.mp3');
    expect(yesClipUrl('NoSuchRoot', ids, '/')).toBeNull();
  });
});

describe('correct recall Yes clip', () => {
  it('plays the Yes clip when present', () => {
    expect(YES_CLIP_IDS.has('bio')).toBe(true);
    const played: string[] = [];
    const started = speakYes('Bio', 'life', {
      play(url) {
        played.push(url);
      },
    });
    expect(started).toBe(true);
    expect(played).toHaveLength(1);
    expect(played[0]).toMatch(/audio\/yes\/bio\.mp3$/);
  });

  it('does not throw and does not use speechSynthesis when the clip is missing', () => {
    const synth = {
      speak: vi.fn(),
      cancel: vi.fn(),
    };
    vi.stubGlobal('speechSynthesis', synth);
    const played: string[] = [];
    expect(() =>
      speakYes('NoSuchRoot', 'nothing', {
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
    expect(YES_CLIP_IDS.has('bio')).toBe(true);
    expect(() =>
      speakYes('Bio', 'life', {
        play() {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });

  it('never calls speechSynthesis when a clip plays', () => {
    const synth = { speak: vi.fn(), cancel: vi.fn() };
    vi.stubGlobal('speechSynthesis', synth);
    speakYes('Bio', 'life', { play() {} });
    expect(synth.speak).not.toHaveBeenCalled();
  });
});

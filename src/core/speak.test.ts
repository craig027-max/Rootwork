import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { successLine } from './deckFlow';
import { HEAR_CLIP_IDS } from './hearClips';
import { ROOTS } from '../data/roots';
import {
  hearClipId,
  hearClipUrl,
  letterNames,
  SPEAKABLE_SYLLABLES,
  speakablePronunciation,
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

describe('speakablePronunciation', () => {
  it('overrides BY / FOH so Jenny does not letter-name the respelling', () => {
    expect(SPEAKABLE_SYLLABLES.by).toBe('bye');
    expect(SPEAKABLE_SYLLABLES.foh).toBe('foe');
    expect(speakablePronunciation('BY-oh')).toBe('bye oh');
    expect(speakablePronunciation('FOH-toh')).toBe('foe toh');
  });

  it('overrides YOO / SYKE / KOH / PREE and other catalog traps', () => {
    expect(speakablePronunciation('YOO-nee')).toBe('you nee');
    expect(speakablePronunciation('YOO')).toBe('you');
    expect(speakablePronunciation('SYKE')).toBe('sike');
    expect(speakablePronunciation('KOH')).toBe('koe');
    expect(speakablePronunciation('PREE')).toBe('pree');
    expect(speakablePronunciation('HY-droh')).toBe('high droh');
    expect(speakablePronunciation('SY')).toBe('sigh');
    expect(speakablePronunciation('DY-nuh')).toBe('dye nuh');
    expect(speakablePronunciation('OH-dont')).toBe('oh dahnt');
  });

  it('defaults to lowercase split when the syllable is already speakable', () => {
    expect(speakablePronunciation('JEE-oh')).toBe('jee oh');
    expect(speakablePronunciation('THAN-uh-toh')).toBe('thann uh toh');
    expect(speakablePronunciation('PORT')).toBe('port');
    expect(speakablePronunciation('AH-kwuh')).toBe('ah kwuh');
  });

  it('keeps the Python generator override map in lockstep', () => {
    const py = readFileSync(
      join(process.cwd(), 'scripts', 'generate-hear-clips.py'),
      'utf8',
    );
    for (const [key, value] of Object.entries(SPEAKABLE_SYLLABLES)) {
      expect(py, key).toContain(`"${key}": "${value}"`);
    }
  });
});

describe('utteranceText', () => {
  it('speaks Bio as bye oh; on-card say stays BY-oh; raw say is not in the line', () => {
    const bio = ROOTS.find((r) => r.root === 'Bio');
    if (!bio) throw new Error('fixture: Bio');
    expect(bio.say).toBe('BY-oh');
    expect(utteranceText(bio.root, bio.say)).toBe(
      'Bio. bye oh. The letters B. I. O.',
    );
    expect(utteranceText(bio.root, bio.say)).not.toContain(bio.say);
    expect(utteranceText(bio.root, bio.say)).not.toContain('BY');
  });

  it('speaks Geo as jee oh; on-card say stays JEE-oh; raw say is not in the line', () => {
    const geo = ROOTS.find((r) => r.root === 'Geo');
    if (!geo) throw new Error('fixture: Geo');
    expect(geo.say).toBe('JEE-oh');
    expect(utteranceText(geo.root, geo.say)).toBe(
      'Geo. jee oh. The letters G. E. O.',
    );
    expect(utteranceText(geo.root, geo.say)).not.toContain(geo.say);
    expect(utteranceText(geo.root, geo.say)).not.toContain('JEE');
  });

  it('speaks Photo as foe toh; on-card say stays FOH-toh; raw say is not in the line', () => {
    const photo = ROOTS.find((r) => r.root === 'Photo');
    if (!photo) throw new Error('fixture: Photo');
    expect(photo.say).toBe('FOH-toh');
    expect(utteranceText(photo.root, photo.say)).toBe(
      'Photo. foe toh. The letters P. H. O. T. O.',
    );
    expect(utteranceText(photo.root, photo.say)).not.toContain(photo.say);
    expect(utteranceText(photo.root, photo.say)).not.toContain('FOH');
  });

  it('covers more catalog roots: Uni, Psych, Co, Pre, Sci, Hydro, Bi, Scope', () => {
    const by = Object.fromEntries(ROOTS.map((r) => [r.root, r]));
    expect(by.Uni?.say).toBe('YOO-nee');
    expect(utteranceText(by.Uni!.root, by.Uni!.say)).toBe(
      'Uni. you nee. The letters U. N. I.',
    );
    expect(utteranceText(by.Uni!.root, by.Uni!.say)).not.toContain(by.Uni!.say);

    expect(by.Psych?.say).toBe('SYKE');
    expect(utteranceText(by.Psych!.root, by.Psych!.say)).toBe(
      'Psych. sike. The letters P. S. Y. C. H.',
    );
    expect(utteranceText(by.Psych!.root, by.Psych!.say)).not.toContain('SYKE');

    expect(by.Co?.say).toBe('KOH');
    expect(utteranceText(by.Co!.root, by.Co!.say)).toBe(
      'Co. koe. The letters C. O.',
    );
    expect(utteranceText(by.Co!.root, by.Co!.say)).not.toContain('KOH');

    expect(by.Pre?.say).toBe('PREE');
    expect(utteranceText(by.Pre!.root, by.Pre!.say)).toBe(
      'Pre. pree. The letters P. R. E.',
    );
    expect(utteranceText(by.Pre!.root, by.Pre!.say)).not.toContain('PREE');

    expect(by.Sci?.say).toBe('SY');
    expect(utteranceText(by.Sci!.root, by.Sci!.say)).toBe(
      'Sci. sigh. The letters S. C. I.',
    );

    expect(by.Hydro?.say).toBe('HY-droh');
    expect(utteranceText(by.Hydro!.root, by.Hydro!.say)).toBe(
      'Hydro. high droh. The letters H. Y. D. R. O.',
    );
    expect(utteranceText(by.Hydro!.root, by.Hydro!.say)).not.toContain('HY');

    expect(by.Bi?.say).toBe('BY');
    expect(utteranceText(by.Bi!.root, by.Bi!.say)).toBe(
      'Bi. bye. The letters B. I.',
    );

    expect(by.Scope?.say).toBe('SKOHP');
    expect(utteranceText(by.Scope!.root, by.Scope!.say)).toBe(
      'Scope. scope. The letters S. C. O. P. E.',
    );
    expect(utteranceText(by.Scope!.root, by.Scope!.say)).not.toContain('SKOHP');
  });

  it('speaks name, spoken sound, and spelled letters for a longer root (Thanato)', () => {
    const thanato = ROOTS.find((r) => r.root === 'Thanato');
    if (!thanato) throw new Error('fixture: Thanato');
    expect(thanato.say).toBe('THAN-uh-toh');
    expect(utteranceText(thanato.root, thanato.say)).toBe(
      'Thanato. thann uh toh. The letters T. H. A. N. A. T. O.',
    );
    expect(utteranceText(thanato.root, thanato.say)).not.toContain(thanato.say);
  });

  it('spells only A–Z letters when the written form has extra characters', () => {
    expect(utteranceText('X-ray2', 'EKS-ray')).toBe(
      'X-ray2. eks ray. The letters X. R. A. Y.',
    );
  });

  it('lowercases say when it matches the root name (Port)', () => {
    const port = ROOTS.find((r) => r.root === 'Port');
    if (!port) throw new Error('fixture: Port');
    expect(port.say).toBe('PORT');
    expect(utteranceText(port.root, port.say)).toBe(
      'Port. port. The letters P. O. R. T.',
    );
    expect(utteranceText(port.root, port.say)).not.toContain('PORT');
  });

  it('uses periods after each letter, not commas', () => {
    expect(utteranceText('Geo', 'JEE-oh')).not.toContain(',');
    expect(utteranceText('Bio', 'BY-oh')).not.toBe(
      'Bio. bye oh. The letters B, I, O.',
    );
  });

  it('builds name + spoken sound + letters for every catalog root without changing on-card say', () => {
    const cardSay = Object.fromEntries(ROOTS.map((r) => [r.root, r.say]));
    for (const r of ROOTS) {
      const spoken = speakablePronunciation(r.say);
      const line = utteranceText(r.root, r.say);
      expect(line, r.root).toBe(
        `${r.root}. ${spoken}. The letters ${letterNames(r.root)}`,
      );
      expect(line, r.root).toMatch(/The letters [A-Z]\.( [A-Z]\.)*$/);
      expect(r.say, r.root).toBe(cardSay[r.root]);
      if (r.say !== spoken) {
        expect(line, r.root).not.toContain(r.say);
      }
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

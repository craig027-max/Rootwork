import { describe, expect, it } from 'vitest';
import { NOVELTY_VOICE, pickKidSafeEnglishVoice, speakRoot, utteranceText } from './speak';

describe('speakRoot', () => {
  it('does not throw when speechSynthesis is absent', () => {
    expect(() => speakRoot('Bio', 'BY-oh', null)).not.toThrow();
    expect(() => speakRoot('Bio', 'BY-oh', undefined)).not.toThrow();
  });

  it('does not throw when SpeechSynthesisUtterance is missing (Node / old WebViews)', () => {
    expect(typeof SpeechSynthesisUtterance).toBe('undefined');
    expect(() =>
      speakRoot('Bio', 'BY-oh', {
        speak() {
          throw new Error('engine should not be called');
        },
      }),
    ).not.toThrow();
  });

  it('does not throw when the engine itself throws', () => {
    const Utterance = class {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice = null;
      constructor(text: string) {
        this.text = text;
      }
    };
    const prev = (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = Utterance;
    try {
      expect(() =>
        speakRoot('Bio', 'BY-oh', {
          speak() {
            throw new Error('blocked');
          },
          getVoices: () => [],
        }),
      ).not.toThrow();
    } finally {
      if (prev) (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = prev;
      else delete (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
  });
});

describe('utteranceText', () => {
  it('speaks the root name and a hyphen-free say-spelling', () => {
    expect(utteranceText('Bio', 'BY-oh')).toBe('Bio. BY oh');
    expect(utteranceText('Port', 'PORT')).toBe('Port');
    expect(utteranceText('Aqua', 'AH-kwuh')).toBe('Aqua. AH kwuh');
  });
});

describe('pickKidSafeEnglishVoice', () => {
  it('skips novelty voices and prefers a clear English one', () => {
    const picked = pickKidSafeEnglishVoice([
      { name: 'Zarvox', lang: 'en-US', localService: true },
      { name: 'Whisper', lang: 'en-US', localService: true },
      { name: 'Samantha', lang: 'en-US', localService: true },
      { name: 'Thomas', lang: 'fr-FR', localService: true },
    ]);
    expect(picked?.name).toBe('Samantha');
  });

  it('returns null when only novelty or non-English voices exist', () => {
    expect(
      pickKidSafeEnglishVoice([
        { name: 'Zarvox', lang: 'en-US' },
        { name: 'Thomas', lang: 'fr-FR' },
      ]),
    ).toBeNull();
  });

  it('treats known novelty names as unsafe', () => {
    expect(NOVELTY_VOICE.test('Pipe Organ')).toBe(true);
    expect(NOVELTY_VOICE.test('Samantha')).toBe(false);
  });
});

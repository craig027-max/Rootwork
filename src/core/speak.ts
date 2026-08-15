/**
 * Kid-safe pronunciation via the Web Speech API only.
 *
 * No audio files, no backend, no tracking. One tap from the deck card.
 * Missing engines, empty voice lists, and iOS quirks fail quietly.
 */

/** Novelty / character voices we never pick for kids. */
export const NOVELTY_VOICE =
  /bells|boing|bubbles|cellos|deranged|good news|bad news|hysterical|pipe organ|trinoids|whisper|zarvox|albert|bahh|jester|superstar|\borgan\b/i;

const PREFERRED_VOICE = /samantha|karen|daniel|moira|serena|siri|google us english|google uk english|aria|jenny|susan/i;

export function utteranceText(root: string, say: string): string {
  const spokenSay = say.replace(/[-·•]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spokenSay) return root;
  if (spokenSay.toLowerCase() === root.toLowerCase()) return root;
  return `${root}. ${spokenSay}`;
}

export interface SpeakVoice {
  name: string;
  lang: string;
  localService?: boolean;
}

/** Prefer a clear local English voice; never a novelty/character voice. */
export function pickKidSafeEnglishVoice<T extends SpeakVoice>(voices: readonly T[]): T | null {
  const english = voices.filter((v) => /^en\b/i.test(v.lang) && !NOVELTY_VOICE.test(v.name));
  if (english.length === 0) return null;
  const preferred = english.find((v) => PREFERRED_VOICE.test(v.name));
  if (preferred) return preferred;
  const local = english.find((v) => v.localService);
  return local ?? english[0] ?? null;
}

export interface SpeakSynth {
  cancel?: () => void;
  speak: (utterance: SpeechSynthesisUtterance) => void;
  getVoices?: () => SpeakVoice[];
  paused?: boolean;
  resume?: () => void;
}

function defaultSynth(): SpeakSynth | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

/**
 * Speak the root name and its say-spelling. Safe to call when
 * `speechSynthesis` is missing — returns without throwing.
 */
export function speakRoot(
  root: string,
  say: string,
  synth: SpeakSynth | null | undefined = defaultSynth(),
): void {
  if (!synth) return;
  if (typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    const text = utteranceText(root, say);
    if (!text) return;
    if (synth.paused) synth.resume?.();
    synth.cancel?.();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    u.pitch = 1;
    const voice = pickKidSafeEnglishVoice(synth.getVoices?.() ?? []);
    if (voice) u.voice = voice as SpeechSynthesisVoice;
    synth.speak(u);
  } catch {
    // Missing engine, iOS quirk, or blocked — fail quietly.
  }
}

/**
 * Kid-safe pronunciation from baked neural clips.
 *
 * Hear files ship at `public/audio/hear/{id}.mp3`. Yes files (correct recall)
 * ship at `public/audio/yes/{id}.mp3`. No Web Speech, no runtime TTS, no
 * network on tap. A missing clip fails quietly — never falls back to Safari
 * speechSynthesis.
 */
import { HEAR_CLIP_IDS } from './hearClips';
import { YES_CLIP_IDS } from './yesClips';

/** Uppercase A–Z letters in writing order, each followed by a period. */
export function letterNames(root: string): string {
  return [...root]
    .filter((ch) => /[A-Za-z]/.test(ch))
    .map((ch) => `${ch.toUpperCase()}.`)
    .join(' ');
}

/**
 * Syllables Jenny would misread if the lowercase say-spelling were spoken
 * as-is (letter-names, the wrong English word, or a known TTS trap).
 * Keys are lowercase dictionary syllables.
 * Keep in lockstep with SPEAKABLE_SYLLABLES in scripts/generate-hear-clips.py.
 */
export const SPEAKABLE_SYLLABLES: Readonly<Record<string, string>> = {
  ag: 'agg',
  awd: 'awed',
  by: 'bye',
  dont: 'dahnt',
  dook: 'duke',
  dy: 'dye',
  ek: 'eck',
  fak: 'fack',
  fil: 'fill',
  fiz: 'fizz',
  floo: 'flu',
  foh: 'foe',
  fohn: 'fone',
  fren: 'frenn',
  gr: 'gruh',
  hy: 'high',
  ih: 'ihh',
  ik: 'ick',
  im: 'ihm',
  jood: 'jude',
  joor: 'jure',
  kak: 'cack',
  kal: 'cal',
  kap: 'cap',
  klood: 'clued',
  kog: 'cog',
  koh: 'koe',
  kon: 'con',
  koz: 'kahz',
  krohm: 'chrome',
  loh: 'low',
  lohk: 'loke',
  moht: 'moat',
  nawt: 'naught',
  nayt: 'nate',
  og: 'ogg',
  om: 'ahm',
  os: 'oss',
  pol: 'pahl',
  poz: 'pahz',
  pree: 'pree',
  proh: 'pro',
  ses: 'sess',
  sfeer: 'sphere',
  siv: 'sieve',
  skohp: 'scope',
  sof: 'soff',
  som: 'sahm',
  soo: 'sue',
  sur: 'sir',
  sy: 'sigh',
  syke: 'sike',
  syne: 'sign',
  tek: 'tech',
  than: 'thann',
  tr: 'truh',
  vohk: 'voke',
  vyt: 'vite',
  yoo: 'you',
  zoh: 'zoe',
};

/**
 * Lowercase syllables a kid would hear. Hyphens become pauses (spaces).
 * Never letter-names of the dictionary respelling.
 * Keep in lockstep with speakable_pronunciation() in
 * scripts/generate-hear-clips.py.
 */
export function speakablePronunciation(say: string): string {
  const normalized = say.replace(/[·•]/g, '-').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized
    .split(/[-\s]+/)
    .map((part) => {
      const key = part.toLowerCase();
      return SPEAKABLE_SYLLABLES[key] ?? key;
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Pause mark between the three Hear beats (name / spoken sound / letters).
 * Jenny does not treat extra periods, ellipses, or newlines as more silence —
 * and she skips the sentence pause when name ≈ sound (Geo / jee oh). The clip
 * baker splits on this mark and inserts a short gap. Keep in lockstep with
 * HEAR_BEAT_PAUSE in scripts/generate-hear-clips.py.
 */
export const HEAR_BEAT_PAUSE = '…';

/**
 * Phrase baked into each Hear clip:
 * `{Root}. … {spoken sound}. … The letters {A. B. C.}`
 * Spoken sound is speakablePronunciation(say), not raw card `say`.
 * Letters come from the written root (geo → G. E. O.), not from the say-spelling.
 */
export function utteranceText(root: string, say: string): string {
  const spoken = speakablePronunciation(say);
  const letters = letterNames(root);
  if (!spoken) return `${root}. ${HEAR_BEAT_PAUSE} The letters ${letters}`;
  return `${root}. ${HEAR_BEAT_PAUSE} ${spoken}. ${HEAR_BEAT_PAUSE} The letters ${letters}`;
}

/** Phrase baked into each Yes clip — same sentence the card shows. */
export function yesUtteranceText(root: string, mean: string): string {
  const spokenMean = mean.replace(/\s+/g, ' ').trim();
  return `Yes — ${root} means ${spokenMean}.`;
}

export function hearClipId(root: string): string {
  return root.trim().toLowerCase();
}

function assetBase(base: string): string {
  return base.endsWith('/') ? base : `${base}/`;
}

function clipUrl(
  root: string,
  folder: 'hear' | 'yes',
  clipIds: ReadonlySet<string>,
  base: string,
): string | null {
  const id = hearClipId(root);
  if (!id || !clipIds.has(id)) return null;
  return `${assetBase(base)}audio/${folder}/${id}.mp3`;
}

/** URL for a baked Hear clip, or null when this root has no file. */
export function hearClipUrl(
  root: string,
  clipIds: ReadonlySet<string> = HEAR_CLIP_IDS,
  base: string = import.meta.env.BASE_URL,
): string | null {
  return clipUrl(root, 'hear', clipIds, base);
}

/** URL for a baked Yes clip, or null when this root has no file. */
export function yesClipUrl(
  root: string,
  clipIds: ReadonlySet<string> = YES_CLIP_IDS,
  base: string = import.meta.env.BASE_URL,
): string | null {
  return clipUrl(root, 'yes', clipIds, base);
}

export interface HearPlayer {
  play: (url: string) => void;
}

let current: HTMLAudioElement | null = null;

function stopCurrent(): void {
  if (!current) return;
  try {
    current.pause();
    current.removeAttribute('src');
    current.load();
  } catch {
    // Detached or already released.
  }
  current = null;
}

function defaultPlay(url: string): void {
  if (typeof Audio === 'undefined') return;
  stopCurrent();
  const audio = new Audio(url);
  current = audio;
  const playResult = audio.play();
  if (playResult && typeof playResult.catch === 'function') {
    playResult.catch(() => {
      // 404, decode error, or iOS quirk — fail quietly.
    });
  }
}

function playUrl(url: string | null, player?: HearPlayer | null): boolean {
  if (!url) return false;
  try {
    (player ?? { play: defaultPlay }).play(url);
    return true;
  } catch {
    // Missing Audio, blocked play, or a bad player — fail quietly.
    return false;
  }
}

/**
 * Play the baked Hear clip for this root. `say` is unused at playback (it is
 * already in the file). Safe when Audio or the clip is missing — returns
 * without throwing and never calls speechSynthesis.
 */
export function speakRoot(
  root: string,
  _say?: string,
  player?: HearPlayer | null,
): void {
  playUrl(hearClipUrl(root), player);
}

/**
 * Play the baked Yes clip after a correct recall. `mean` is unused at
 * playback (it is already in the file). Missing clip: fail quietly, no
 * speechSynthesis. Returns whether a clip URL was handed to the player.
 */
export function speakYes(
  root: string,
  _mean?: string,
  player?: HearPlayer | null,
): boolean {
  return playUrl(yesClipUrl(root), player);
}

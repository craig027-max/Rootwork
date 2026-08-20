/**
 * Kid-safe pronunciation from baked neural clips.
 *
 * Files ship with the app (`public/audio/hear/{id}.mp3`). One tap from the
 * Hear button. No Web Speech, no runtime TTS, no network on tap. A missing
 * clip fails quietly — never falls back to Safari speechSynthesis.
 */
import { HEAR_CLIP_IDS } from './hearClips';

/** Phrase baked into each clip: root name, then the say-spelling. */
export function utteranceText(root: string, say: string): string {
  const spokenSay = say.replace(/[·•]/g, '-').replace(/\s+/g, ' ').trim();
  if (!spokenSay) return `${root}.`;
  if (spokenSay.toLowerCase() === root.toLowerCase()) return `${root}.`;
  return `${root}. ${spokenSay}.`;
}

export function hearClipId(root: string): string {
  return root.trim().toLowerCase();
}

function assetBase(base: string): string {
  return base.endsWith('/') ? base : `${base}/`;
}

/** URL for a baked clip, or null when this root has no file. */
export function hearClipUrl(
  root: string,
  clipIds: ReadonlySet<string> = HEAR_CLIP_IDS,
  base: string = import.meta.env.BASE_URL,
): string | null {
  const id = hearClipId(root);
  if (!id || !clipIds.has(id)) return null;
  return `${assetBase(base)}audio/hear/${id}.mp3`;
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

/**
 * Play the baked clip for this root. `say` is unused at playback (it is
 * already in the file). Safe when Audio or the clip is missing — returns
 * without throwing and never calls speechSynthesis.
 */
export function speakRoot(
  root: string,
  _say?: string,
  player?: HearPlayer | null,
): void {
  const url = hearClipUrl(root);
  if (!url) return;
  try {
    (player ?? { play: defaultPlay }).play(url);
  } catch {
    // Missing Audio, blocked play, or a bad player — fail quietly.
  }
}

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

/** Phrase baked into each Hear clip: root name, then the say-spelling. */
export function utteranceText(root: string, say: string): string {
  // Geo's name already sounds like JEE-oh — spelling the letters keeps
  // Jenny from saying the same two syllables twice with no gap.
  if (root.trim().toLowerCase() === 'geo') {
    return 'Geo. The letters G. E. O.';
  }
  const spokenSay = say.replace(/[·•]/g, '-').replace(/\s+/g, ' ').trim();
  if (!spokenSay) return `${root}.`;
  if (spokenSay.toLowerCase() === root.toLowerCase()) return `${root}.`;
  return `${root}. ${spokenSay}.`;
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

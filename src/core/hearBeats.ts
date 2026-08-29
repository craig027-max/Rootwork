/**
 * Hear clip beats: name → spoken sound → letters.
 * Labels come from utteranceText parts (not raw on-card `say`).
 * Timing comes from measured silence gaps in the baked mp3s.
 */
import { hearClipId, letterNames, speakablePronunciation } from './speak';
import { HEAR_BEAT_SPLITS } from './hearBeatTimes';

export type HearBeatKind = 'name' | 'sound' | 'letters';

export interface HearBeatLabels {
  name: string;
  sound: string;
  letters: string;
}

export interface HearBeatChip {
  kind: HearBeatKind;
  label: string;
  active: boolean;
}

/** Compact labels under Listening… — spoken sound, not BY-oh / JEE-oh. */
export function hearBeatLabels(root: string, say: string): HearBeatLabels {
  return {
    name: root.trim(),
    sound: speakablePronunciation(say),
    letters: letterNames(root),
  };
}

/** Speech-start times for beats 2 and 3, or null when this id was not measured. */
export function hearBeatSplits(root: string): readonly [number, number] | null {
  const id = hearClipId(root);
  return HEAR_BEAT_SPLITS[id] ?? null;
}

/**
 * Which Hear beat is playing at `currentTime`.
 * Splits are speech-start seconds for sound then letters (beat 1 starts at 0).
 */
export function hearBeatIndex(
  currentTime: number,
  splits: readonly [number, number],
): 0 | 1 | 2 {
  const t = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0;
  if (t >= splits[1]) return 2;
  if (t >= splits[0]) return 1;
  return 0;
}

export function hearBeatChips(
  labels: HearBeatLabels,
  active: 0 | 1 | 2,
): HearBeatChip[] {
  return [
    { kind: 'name', label: labels.name, active: active === 0 },
    { kind: 'sound', label: labels.sound, active: active === 1 },
    { kind: 'letters', label: labels.letters, active: active === 2 },
  ];
}

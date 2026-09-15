/**
 * Named Home preview chips are real taps — not dead chrome.
 *
 * After #59/#60, done Daily / complete-tier recap chips Remember.
 * Mid-run Daily still named Chron but the chip did nothing, and Replay
 * tier dumped Bio teach → Geo. This names the tap the same way Continue
 * already does: Daily stays Daily, a next-root peek Continues that root,
 * a finished recap Remembers. Last Rush recap chips Remember the real
 * run. Never a dead named chip, never Bio → Geo.
 */
import type { MenuItem } from './menu';

export type SamplePeekTap = 'remember' | 'daily' | 'continue' | 'play';

export function samplePeekTap(opts: {
  locked?: boolean;
  nextPlay?: boolean;
  mode?: 'daily' | 'rush';
  dailyDone?: boolean;
  complete?: boolean;
  empty?: boolean;
  sampleCount: number;
}): SamplePeekTap | undefined {
  if (opts.locked || opts.nextPlay || opts.sampleCount <= 0) return undefined;
  if (opts.mode === 'rush') return opts.sampleCount > 0 ? 'remember' : undefined;
  if (opts.mode === 'daily') return opts.dailyDone ? 'remember' : 'daily';
  if (opts.complete) return 'remember';
  if (opts.empty) return 'play';
  return 'continue';
}

/** Kid-facing aria on a named peek chip. */
export function samplePeekLabel(
  tap: SamplePeekTap,
  rootName: string,
  opts: { dailyNext?: boolean; ok?: boolean } = {},
): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  if (tap === 'remember' && opts.ok === false) {
    return name ? `Missed ${name}` : 'Missed';
  }
  if (!name) {
    if (tap === 'remember') return 'Remember';
    if (tap === 'daily') return 'Continue Daily';
    if (tap === 'play') return 'Play';
    return 'Continue';
  }
  if (tap === 'remember') return `Remember ${name}`;
  if (tap === 'daily') return opts.dailyNext ? `Continue Daily · ${name}` : `Start daily · ${name}`;
  if (tap === 'play') return `Play ${name}`;
  return `Continue ${name}`;
}

export type HomeSampleAction = { kind: 'daily' } | { kind: 'root'; name: string };

/**
 * What a named peek chip must do. Daily (fresh or mid-run) continues Daily
 * — opening Chron as teach would dump the Geo loop. Done Daily / any
 * unlocked tier chip uses the Remember-or-teach recap open.
 */
export function homeSampleAction(
  item: MenuItem,
  name: string,
  opts: { dailyDone?: boolean } = {},
): HomeSampleAction | null {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  if (item.kind === 'mode') {
    if (item.key === 'rush') return { kind: 'root', name: trimmed };
    if (item.key !== 'daily') return null;
    if (opts.dailyDone) return { kind: 'root', name: trimmed };
    return { kind: 'daily' };
  }
  if (item.locked) return null;
  return { kind: 'root', name: trimmed };
}

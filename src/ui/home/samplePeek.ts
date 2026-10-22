/**
 * Named Home preview chips are real taps — not dead chrome.
 *
 * After #59/#60, done Daily / complete-tier recap chips Remember.
 * Mid-run Daily still named Chron but the chip did nothing, and Replay
 * tier dumped Bio teach → Geo. This names the tap the same way Continue
 * already does: Daily stays Daily, a next-root peek Continues that root,
 * a finished recap Remembers. Last Rush recap chips Remember the real
 * run. Never a dead named chip, never Bio → Geo.
 * Path-done Rush miss: Scholar / Starter / Builder peeks are Missed
 * Geo — Play Bene / Remember Bio / a fake ✓ must not sit over that
 * same coral miss the title already named. Browse / All Roots now
 * matches — 183 roots / Bio ✓ first must not sit over Geo. Deck
 * strip / nav now matches — Starter / Card 02 / 183 must not
 * sit over Geo. Browse sections now match — Tier 1 — Starter
 * must not sit over Geo. Deck card / Prev now match — prove
 * you know it / Geo · ? / Prev → Bio must not sit over Geo.
 * Home list row titles now match — Tier 1 · Starter must
 * not sit over Geo when the sub already says Missed · remember.
 * Rush / Daily list titles now match — Root Rush / Daily
 * Challenge must not sit over Geo. Daily peek chips now
 * match — today's five ✓ / Chron / Photo / Aqua must not
 * sit over Geo under a Remember title. Rush peek chips
 * now match — last-run Photo ✓ / Bio ✓ must not sit
 * over Geo under that same title. Overlay eyebrows
 * now match — Root Rush / Daily Challenge / Starter
 * / Choose your level must not sit over Geo. Home
 * list hints / detail scene now match — tap again
 * to start / Geo · earth / Choose what to play
 * must not sit over Geo under that same Remember
 * heading. Overlay close now matches — Close
 * quiz / Close daily must not sit over Geo
 * under that same heading. Daily Home ghost
 * now matches — Home must not sit over Geo
 * under that same heading.
 */
import { ROOTS, ROOTS_BY_ID } from '../../data/roots';
import type { MenuItem } from './menu';

export type SamplePeekTap = 'remember' | 'daily' | 'continue' | 'play';

export interface MissPeekSample {
  root: string;
  mean: string;
  ok: false;
  /** School word or piece when `root` is the catalog card. */
  asked?: string;
  /** Catalog id — the tap still opens this root. */
  id?: string;
}

/** Waiting Rush miss chips — Geo first, then Chron. No Bene / Bio dump. */
export function missPeekSamples(
  miss?: {
    root: string;
    mean?: string;
    asked?: string;
    id?: string;
    also?: string;
    alsoMean?: string;
    alsoAsked?: string;
    alsoId?: string;
  } | null,
): MissPeekSample[] {
  const name = miss?.root.replace(/\s+/g, ' ').trim();
  if (!name) return [];
  const asked = miss?.asked?.replace(/\s+/g, ' ').trim();
  const also = miss?.also?.replace(/\s+/g, ' ').trim();
  const alsoAsked = miss?.alsoAsked?.replace(/\s+/g, ' ').trim();
  const out: MissPeekSample[] = [
    {
      root: name,
      mean: miss?.mean?.replace(/\s+/g, ' ').trim() ?? '',
      ok: false,
      ...(asked ? { asked } : {}),
      ...(miss?.id ? { id: miss.id } : {}),
    },
  ];
  const firstKey = asked || name;
  const alsoKey = alsoAsked || also;
  if (also && alsoKey && alsoKey !== firstKey) {
    out.push({
      root: also,
      mean: miss?.alsoMean?.replace(/\s+/g, ' ').trim() ?? '',
      ok: false,
      ...(alsoAsked ? { asked: alsoAsked } : {}),
      ...(miss?.alsoId ? { id: miss.alsoId } : {}),
    });
  }
  return out;
}

function tidyPeek(raw?: string): string | undefined {
  const text = raw?.replace(/\s+/g, ' ').trim();
  return text || undefined;
}

/**
 * Remember chips for a waiting miss. The bold name is the question
 * (-graph, Photograph). `root` stays the catalog card so the tap
 * still opens Photo. A meaning miss stays Geo / earth.
 */
export function missFacePeek(face: {
  id: string;
  name: string;
  mean?: string;
  also?: string;
  alsoMean?: string;
  alsoId?: string;
}): MissPeekSample[] {
  const catalog = ROOTS_BY_ID[face.id];
  const catalogName = catalog?.root ?? tidyPeek(face.name) ?? '';
  if (!catalogName) return [];
  const display = tidyPeek(face.name) || catalogName;
  const asked =
    display.toLowerCase() === catalogName.toLowerCase() ? undefined : display;
  const mean =
    face.mean !== undefined ? face.mean.replace(/\s+/g, ' ').trim() : (catalog?.mean ?? '');
  const alsoCatalog = face.alsoId ? ROOTS_BY_ID[face.alsoId] : undefined;
  const alsoDisplay = tidyPeek(face.also);
  const alsoSame =
    Boolean(alsoCatalog) &&
    Boolean(alsoDisplay) &&
    alsoDisplay!.toLowerCase() === alsoCatalog!.root.toLowerCase();
  const alsoRoot = alsoSame
    ? alsoCatalog!.root
    : alsoCatalog && alsoDisplay
      ? alsoCatalog.root
      : alsoDisplay;
  const alsoAsked = alsoCatalog && alsoDisplay && !alsoSame ? alsoDisplay : undefined;
  const alsoMean =
    face.alsoMean !== undefined
      ? face.alsoMean.replace(/\s+/g, ' ').trim()
      : alsoSame || !alsoAsked
        ? (ROOTS.find((r) => r.root === alsoDisplay)?.mean ?? '')
        : '';
  return missPeekSamples({
    root: catalogName,
    mean,
    asked,
    id: face.id,
    also: alsoRoot,
    alsoMean,
    alsoAsked,
    alsoId: face.alsoId,
  });
}

/** Same Missed Geo / then Chron chips, looked up from the catalog. */
export function missPeekForNames(name?: string, also?: string): MissPeekSample[] {
  const root = name?.replace(/\s+/g, ' ').trim();
  if (!root) return [];
  const alsoName = also?.replace(/\s+/g, ' ').trim();
  return missPeekSamples({
    root,
    mean: ROOTS.find((r) => r.root === root)?.mean,
    also: alsoName,
    alsoMean: alsoName ? ROOTS.find((r) => r.root === alsoName)?.mean : undefined,
  });
}

export function samplePeekTap(opts: {
  locked?: boolean;
  nextPlay?: boolean;
  mode?: 'daily' | 'rush';
  dailyDone?: boolean;
  complete?: boolean;
  empty?: boolean;
  sampleCount: number;
  /** Path-done Rush miss — Remember Geo, even on a locked Scholar teaser. */
  missHero?: boolean;
}): SamplePeekTap | undefined {
  if (opts.nextPlay || opts.sampleCount <= 0) return undefined;
  if (opts.missHero) return 'remember';
  if (opts.locked) return undefined;
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
  opts: { dailyNext?: boolean; ok?: boolean; owned?: boolean } = {},
): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  if (tap === 'remember' && opts.ok === false) {
    return name ? `Missed ${name}` : 'Missed';
  }
  if (!name) {
    if (tap === 'remember') return opts.owned === false ? 'Meet this root' : 'Remember';
    if (tap === 'daily') return 'Continue Daily';
    if (tap === 'play') return 'Play';
    return 'Continue';
  }
  if (tap === 'remember') {
    return opts.owned === false ? `Meet ${name}` : `Remember ${name}`;
  }
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
  opts: {
    dailyDone?: boolean;
    /** Path-done Rush miss — locked Scholar Geo chip is Remember, not unlock. */
    rememberMissName?: string | null;
    rememberAlso?: string | null;
  } = {},
): HomeSampleAction | null {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  if (item.kind === 'mode') {
    if (item.key === 'rush') return { kind: 'root', name: trimmed };
    if (item.key !== 'daily') return null;
    if (opts.dailyDone) return { kind: 'root', name: trimmed };
    return { kind: 'daily' };
  }
  const miss = opts.rememberMissName?.replace(/\s+/g, ' ').trim();
  const also = opts.rememberAlso?.replace(/\s+/g, ' ').trim();
  const missChip = Boolean(miss && (trimmed === miss || (also && trimmed === also)));
  if (item.locked && !missChip) return null;
  return { kind: 'root', name: trimmed };
}

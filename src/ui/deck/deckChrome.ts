import { shortWordDef } from '../../core/wordDef';

/** Deck strip / nav after a miss — not Tier 1 · Starter / Card 02 / 183.
 *  Find leftover: title / means / nav name the school word, not Bio / life. */

function cleanName(raw?: string): string {
  return raw?.replace(/\s+/g, ' ').trim() ?? '';
}

/** Hero title — Biology, not Bio over a school-word tap. */
export function deckFindTitle(opts: { root: string; findWord?: string }): string {
  const word = cleanName(opts.findWord);
  if (word) return word;
  return cleanName(opts.root);
}

/** Means word — the school-word gloss, not life over Biology. */
export function deckMeansWord(opts: {
  mean: string;
  studying?: boolean;
  findWord?: string;
  findDef?: string;
}): string {
  if (opts.studying) return '?';
  const word = cleanName(opts.findWord);
  const def = cleanName(opts.findDef);
  if (word && def) return shortWordDef(def);
  return opts.mean;
}

/** Back control — Remember over a miss, Find on a school-word tap, Today on a stale recap. */
export function deckBackLabel(
  opts: { remembering?: boolean; missed?: boolean; finding?: boolean } = {},
): string {
  if (opts.missed) return '← Remember';
  if (opts.finding) return '← Find';
  if (opts.remembering) return '← Today';
  return '← All roots';
}

/**
 * Leave tap after Remember — ← Remember over a Rush miss, Home → on a
 * stale recap. Same dismiss chrome Daily / Rush already use. Destination
 * is still Home; Home → must not sit over Missed Geo.
 */
export function rememberLeaveLabel(opts: { missed?: boolean } = {}): string {
  return opts.missed ? '← Remember' : 'Home →';
}

/** Strip pill — Remember, not Tier 1 · Starter over Geo. Find over a school-word tap. */
export function deckStripTier(opts: {
  missed?: boolean;
  finding?: boolean;
  tier: number;
  tierName: string;
}): string {
  if (opts.missed) return 'Remember';
  if (opts.finding) return 'Find';
  return `Tier ${opts.tier} · ${opts.tierName}`;
}

/** Strip count — Missed Geo, not Card 02 / 183. Biology on a find tap. */
export function deckStripCount(opts: {
  missed?: boolean;
  missName?: string;
  findWord?: string;
  position: number;
  total: number;
}): string {
  const name = cleanName(opts.missName);
  if (opts.missed) return name ? `Missed ${name}` : 'Missed';
  const word = cleanName(opts.findWord);
  if (word) return word;
  return `Card ${String(opts.position).padStart(2, '0')} / ${opts.total}`;
}

/** Bottom-nav meta — Remember · Geo, not Starter · 2 / 183. Find · Biology on a word tap. */
export function deckNavMeta(opts: {
  missed?: boolean;
  missName?: string;
  findWord?: string;
  tierName: string;
  position: number;
  total: number;
}): string {
  const name = cleanName(opts.missName);
  if (opts.missed) return name ? `Remember · ${name}` : 'Remember';
  const word = cleanName(opts.findWord);
  if (word) return `Find · ${word}`;
  return `${opts.tierName} · ${opts.position} / ${opts.total}`;
}

/** ☰ aria — Remember, not All roots index over the same miss. */
export function deckIndexAria(opts: { missed?: boolean; finding?: boolean } = {}): string {
  if (opts.missed) return 'Remember';
  if (opts.finding) return 'Find';
  return 'All roots index';
}

/** Scene caption — Missed Geo, not watch the scene / Remember Geo as a stale recap. */
export function deckCaption(opts: {
  emoji: string;
  root: string;
  mean: string;
  alt: string;
  remembering?: boolean;
  missed?: boolean;
  studying?: boolean;
  findWord?: string;
}): string {
  const name = cleanName(opts.root);
  if (opts.missed) return name ? `${opts.emoji} Missed ${name}` : `${opts.emoji} Missed`;
  const word = cleanName(opts.findWord);
  if (word) return `${opts.emoji} ${word}`;
  if (opts.remembering) return name ? `${opts.emoji} Remember ${name}` : `${opts.emoji} Remember`;
  if (opts.studying) return `${opts.emoji} watch the scene`;
  return `${opts.emoji} ${opts.mean} — ${opts.alt}`;
}

/** Card eyebrow — Missed Geo, not Latin Root / Remember Geo over the same miss. */
export function deckEyebrow(opts: {
  root: string;
  lang: string;
  remembering?: boolean;
  missed?: boolean;
  findWord?: string;
}): string {
  const name = cleanName(opts.root);
  if (opts.missed) return name ? `Missed ${name}` : 'Missed';
  const word = cleanName(opts.findWord);
  if (word) return `Find ${word}`;
  if (opts.remembering) return name ? `Remember ${name}` : 'Remember';
  return `${opts.lang} Root`;
}

/** Means gloss — you missed this in Rush, not prove you know it over Geo.
 *  Find names the root half (from Bio) — not living things over Biology. */
export function deckMeansAlt(opts: {
  alt: string;
  studying?: boolean;
  missed?: boolean;
  findWord?: string;
  findRoot?: string;
}): string {
  if (opts.missed) return 'you missed this in Rush';
  const word = cleanName(opts.findWord);
  if (word) {
    if (opts.studying) return 'what this word means';
    const root = cleanName(opts.findRoot);
    return root ? `from ${root}` : 'the school word';
  }
  if (opts.studying) return 'prove you know it';
  return opts.alt;
}

/** Nav centre — Missed Geo, not Geo · ? over the same coral miss.
 *  Find names Biology, not Bio · life over the school word. */
export function deckNavRoot(opts: { root: string; missed?: boolean; findWord?: string }): string {
  const name = cleanName(opts.root);
  if (opts.missed) return name ? `Missed ${name}` : 'Missed';
  const word = cleanName(opts.findWord);
  if (word) return word;
  return name;
}

/** Nav meaning — hide the studying ? so it cannot sit over Missed Geo.
 *  Find uses the school-word gloss — not life over Biology. */
export function deckNavMeaning(opts: {
  meaning: string;
  missed?: boolean;
  findWord?: string;
  findDef?: string;
  studying?: boolean;
}): string {
  if (opts.missed) return '';
  const word = cleanName(opts.findWord);
  if (word) {
    if (opts.studying) return '';
    const def = cleanName(opts.findDef);
    return def ? shortWordDef(def) : '';
  }
  return opts.meaning;
}

/** Prev dumps Bio teach over Remember Geo / Find Biology — hide it. */
export function deckShowPrev(opts: { remembering?: boolean; finding?: boolean } = {}): boolean {
  return !opts.remembering && !opts.finding;
}

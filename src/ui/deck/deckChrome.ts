/** Deck strip / nav after a miss — not Tier 1 · Starter / Card 02 / 183. */

function cleanName(raw?: string): string {
  return raw?.replace(/\s+/g, ' ').trim() ?? '';
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

/** Means gloss — you missed this in Rush, not prove you know it over Geo. */
export function deckMeansAlt(opts: {
  alt: string;
  studying?: boolean;
  missed?: boolean;
}): string {
  if (opts.missed) return 'you missed this in Rush';
  if (opts.studying) return 'prove you know it';
  return opts.alt;
}

/** Nav centre — Missed Geo, not Geo · ? over the same coral miss. */
export function deckNavRoot(opts: { root: string; missed?: boolean }): string {
  const name = cleanName(opts.root);
  if (opts.missed) return name ? `Missed ${name}` : 'Missed';
  return name;
}

/** Nav meaning — hide the studying ? so it cannot sit over Missed Geo. */
export function deckNavMeaning(opts: { meaning: string; missed?: boolean }): string {
  return opts.missed ? '' : opts.meaning;
}

/** Prev dumps Bio teach over Remember Geo / Find Biology — hide it. */
export function deckShowPrev(opts: { remembering?: boolean; finding?: boolean } = {}): boolean {
  return !opts.remembering && !opts.finding;
}

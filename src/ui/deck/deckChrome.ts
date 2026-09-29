/** Deck strip / nav after a miss — not Tier 1 · Starter / Card 02 / 183. */

function cleanName(raw?: string): string {
  return raw?.replace(/\s+/g, ' ').trim() ?? '';
}

/** Back control — Remember over a miss, Today on a stale recap, All roots otherwise. */
export function deckBackLabel(opts: { remembering?: boolean; missed?: boolean } = {}): string {
  if (opts.missed) return '← Remember';
  if (opts.remembering) return '← Today';
  return '← All roots';
}

/** Strip pill — Remember, not Tier 1 · Starter over Geo. */
export function deckStripTier(opts: {
  missed?: boolean;
  tier: number;
  tierName: string;
}): string {
  if (opts.missed) return 'Remember';
  return `Tier ${opts.tier} · ${opts.tierName}`;
}

/** Strip count — Missed Geo, not Card 02 / 183. */
export function deckStripCount(opts: {
  missed?: boolean;
  missName?: string;
  position: number;
  total: number;
}): string {
  const name = cleanName(opts.missName);
  if (opts.missed) return name ? `Missed ${name}` : 'Missed';
  return `Card ${String(opts.position).padStart(2, '0')} / ${opts.total}`;
}

/** Bottom-nav meta — Remember · Geo, not Starter · 2 / 183. */
export function deckNavMeta(opts: {
  missed?: boolean;
  missName?: string;
  tierName: string;
  position: number;
  total: number;
}): string {
  const name = cleanName(opts.missName);
  if (opts.missed) return name ? `Remember · ${name}` : 'Remember';
  return `${opts.tierName} · ${opts.position} / ${opts.total}`;
}

/** ☰ aria — Remember, not All roots index over the same miss. */
export function deckIndexAria(opts: { missed?: boolean } = {}): string {
  return opts.missed ? 'Remember' : 'All roots index';
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
}): string {
  const name = cleanName(opts.root);
  if (opts.missed) return name ? `${opts.emoji} Missed ${name}` : `${opts.emoji} Missed`;
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
}): string {
  const name = cleanName(opts.root);
  if (opts.missed) return name ? `Missed ${name}` : 'Missed';
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

/** Prev dumps Bio teach over Remember Geo — hide it on a Remember visit. */
export function deckShowPrev(opts: { remembering?: boolean } = {}): boolean {
  return !opts.remembering;
}

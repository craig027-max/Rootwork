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

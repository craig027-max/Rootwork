/** Catalog chip chrome — a waiting Rush miss is not a fake ✓. */
export type IndexChipKind = 'miss' | 'done' | 'lock' | 'open';

export function indexChipKind(opts: {
  missed?: boolean;
  owned?: boolean;
  locked?: boolean;
}): IndexChipKind {
  if (opts.missed) return 'miss';
  if (opts.owned) return 'done';
  if (opts.locked) return 'lock';
  return 'open';
}

export function indexChipLabel(rootName: string, kind: IndexChipKind): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  if (kind === 'miss') return name ? `Missed ${name}` : 'Missed';
  if (kind === 'done') return name ? `Remember ${name}` : 'Remember';
  return name;
}

/** Visible mark — Missed is not a blank Play chip, and not a fake ✓. */
export function indexChipMark(kind: IndexChipKind): string | null {
  if (kind === 'miss') return '!';
  if (kind === 'done') return '✓';
  return null;
}

function cleanNames(names?: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of names ?? []) {
    const name = raw.replace(/\s+/g, ' ').trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/** Browse heading — Remember over a miss, All Roots once it's done. */
export function indexHeading(missNames?: readonly string[]): string {
  return cleanNames(missNames)[0] ? 'Remember' : 'All Roots';
}

/** Browse sub — Missed Geo, not 183 roots over the same coral miss. */
export function indexSub(
  missNames?: readonly string[],
  opts: { rootCount?: number; tierCount?: number } = {},
): string {
  const names = cleanNames(missNames);
  if (names[0] && names[1]) return `Missed ${names[0]} · then ${names[1]}`;
  if (names[0]) return `Missed ${names[0]}`;
  const roots = opts.rootCount ?? 0;
  const tiers = opts.tierCount ?? 0;
  return `${roots} roots · ${tiers} tiers`;
}

/**
 * Missed Geo leads the tier — Bio ✓ must not greet them first.
 * Play order among misses stays; the rest keep catalog order.
 */
export function indexRootsMissFirst<T>(
  roots: readonly T[],
  missed: ReadonlySet<string>,
  idOf: (root: T) => string,
): T[] {
  if (missed.size === 0) return [...roots];
  const miss: T[] = [];
  const rest: T[] = [];
  for (const root of roots) {
    (missed.has(idOf(root)) ? miss : rest).push(root);
  }
  return miss.length === 0 ? [...roots] : [...miss, ...rest];
}

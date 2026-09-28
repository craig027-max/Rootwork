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

/** First clause of an authored definition — quiz tiles / mean line. */
export function shortWordDef(def: string): string {
  const text = def.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const clause = text.split(/\s+[—–]\s+/)[0]?.trim() ?? text;
  return clause.replace(/\.$/, '') || text;
}

/** Quiz tiles stay one or two lines. Longer glosses are not offered. */
export const GLOSS_TILE_MAX = 72;

/**
 * First clause, markup stripped, short enough for a choice tile.
 * Null when the authored def is empty or longer than `maxLen`.
 */
export function quizGloss(def: string, maxLen = GLOSS_TILE_MAX): string | null {
  const plain = def.replace(/<[^>]+>/g, ' ');
  const text = shortWordDef(plain);
  if (!text || text.length > maxLen) return null;
  return text;
}

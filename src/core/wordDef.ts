/** First clause of an authored definition — quiz tiles / mean line. */
export function shortWordDef(def: string): string {
  const text = def.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const clause = text.split(/\s+[—–]\s+/)[0]?.trim() ?? text;
  return clause.replace(/\.$/, '') || text;
}

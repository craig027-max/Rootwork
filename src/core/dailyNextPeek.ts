/**
 * Daily Next hold — name the question that button will open.
 *
 * The hold used to say Next · Photo · light for every upcoming card.
 * Next can open -graph, Photograph, or photo + -graph. The line names
 * that hero. The answer tile stays off it: record, the gloss, and the
 * school word those pieces build are not printed early.
 * A meaning or which-word card still says Photo · light — its giant
 * type is the root. A which-word tile that is the root name (Fort)
 * cannot: the peek names the meaning instead. No beat yet stays on
 * the root too.
 */
import { spellsChoice, whichWordPrompt } from './promptFace';
import { buildBig } from './wordParts';

export interface DailyNextPeek {
  name: string;
  mean?: string;
}

export function dailyNextPeekFace(
  root: { root: string; mean: string },
  beat?: {
    kind?: string | null;
    word?: string | null;
    part?: string | null;
    split?: string | null;
  } | null,
): DailyNextPeek {
  const rootName = root.root.replace(/\s+/g, ' ').trim();
  const rootMean = root.mean.replace(/\s+/g, ' ').trim();
  const fallback: DailyNextPeek = { name: rootName || 'this root' };
  if (rootMean) fallback.mean = rootMean;
  if (!beat) return fallback;

  if (beat.kind === 'gloss') {
    const word = beat.word?.replace(/\s+/g, ' ').trim();
    if (!word) return fallback;
    return rootName ? { name: word, mean: `from ${rootName}` } : { name: word };
  }

  if (beat.kind === 'part') {
    const part = beat.part?.replace(/\s+/g, ' ').trim();
    if (!part) return fallback;
    const word = beat.word?.replace(/\s+/g, ' ').trim();
    return word ? { name: part, mean: `in ${word}` } : { name: part };
  }

  if (beat.kind === 'build') {
    const pieces = buildBig(beat.split ?? '');
    if (!pieces) return fallback;
    return { name: pieces };
  }

  if (beat.kind === 'word') {
    const word = beat.word?.replace(/\s+/g, ' ').trim() ?? '';
    if (word && spellsChoice(rootName, word)) {
      const face = whichWordPrompt(
        { root: rootName, say: '', mean: rootMean, org: '', alt: '' },
        word,
      );
      return { name: face.big };
    }
  }

  return fallback;
}

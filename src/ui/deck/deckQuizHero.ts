/**
 * Study quiz hero — the giant name is the thing being asked.
 *
 * Daily and Rush already put Biology, -logy, or bio + -logy in the big
 * type. Study was still painting Bio over those questions. Meaning and
 * which-word stay on the root: those questions are about Bio.
 */
import { glossQuietLine } from '../../core/promptFace';
import { buildBig } from '../../core/wordParts';

export type DeckQuizKind = 'gloss' | 'part' | 'build';

export interface DeckQuizHero {
  kind: DeckQuizKind;
  title: string;
  /** Extra classes on `.ww-root` — is-gloss / is-part / is-build, plus is-long. */
  titleClass: string;
  /**
   * Quiet line under the name. Never a glowing "?" and never the answer.
   * A school-word question says from Bio · life until that meaning sits
   * in the gloss — then it says from Bio. Empty on a pieces question.
   */
  hint: string;
}

export interface DeckQuizHeroInput {
  root: string;
  mean: string;
  kind?: string | null;
  word?: string | null;
  /** Authored gloss, so a meaning that sits in the tile can come off the hint. */
  gloss?: string | null;
  part?: string | null;
  split?: string | null;
}

function clean(raw?: string | null): string {
  return raw?.replace(/\s+/g, ' ').trim() ?? '';
}

function titleClass(kind: DeckQuizKind, long: boolean): string {
  return long ? `is-${kind} is-long` : `is-${kind}`;
}

/** Label above the giant name — the thing being asked, not "Greek Root". */
export function deckQuizEyebrow(kind: DeckQuizKind): string {
  if (kind === 'part') return 'Other piece';
  if (kind === 'build') return 'These pieces';
  return 'This word';
}

/**
 * Corner name on Daily. A gloss, piece, or pieces question names that
 * thing. A meaning or which-word question stays on the root.
 */
export function questionHudName(input: DeckQuizHeroInput): {
  name: string;
  quiz: boolean;
  long: boolean;
} {
  const root = clean(input.root);
  const hero = deckQuizHero(input);
  if (!hero) return { name: root || 'this root', quiz: false, long: false };
  return { name: hero.title, quiz: true, long: hero.titleClass.includes('is-long') };
}

/**
 * Hero for a gloss / part / build beat. Null keeps the root name — mean,
 * which-word, Remember, and the teach card before I know this.
 */
export function deckQuizHero(input: DeckQuizHeroInput): DeckQuizHero | null {
  const root = clean(input.root);
  const mean = clean(input.mean);
  const word = clean(input.word);
  const part = clean(input.part);
  const split = clean(input.split);

  if (input.kind === 'gloss') {
    if (!word) return null;
    const hint = glossQuietLine(root, mean, input.gloss);
    return {
      kind: 'gloss',
      title: word,
      titleClass: titleClass('gloss', word.length >= 14),
      hint,
    };
  }

  if (input.kind === 'part') {
    if (!part) return null;
    return {
      kind: 'part',
      title: part,
      titleClass: titleClass('part', part.length >= 9),
      hint: word ? `in ${word}` : 'the other piece',
    };
  }

  if (input.kind === 'build') {
    const pieces = buildBig(split);
    if (!pieces) return null;
    return {
      kind: 'build',
      title: pieces,
      titleClass: titleClass('build', pieces.length >= 14),
      hint: '',
    };
  }

  return null;
}

/**
 * Instruction before a question, and on meaning / which-word beats.
 * A gloss, piece, or pieces beat hides this — the ask names Biology,
 * and this sentence would put "what Bio means" over that word.
 */
export function deckStudyLead(rootName: string): string {
  const name = clean(rootName) || 'this root';
  return `Look at the scene. Then tap what ${name} means, which word its pieces build, or what that word means.`;
}

/**
 * First look at a root or school word the kid has not learned yet.
 *
 * Context only — where it comes from, how it is used, a hook toward the
 * picture, and the sound when that sound is not the answer. The meaning
 * stays off this beat. It shows up after the tap, in the Yes line and the
 * miss, so the question is still a question.
 *
 * Question types a new card can deal, and what each one tests:
 * - mean: what the root means (the meaning tile)
 * - word: which school word this root builds
 * - gloss: what a school word on this card means
 * - part: what the other piece of a school word means
 * - build: which school word those pieces build
 * - word-mean: what the school word opened from Browse means
 *
 * Root Rush also asks which root carries a meaning. Daily and Root Rush
 * never show this intro. Remember, a result chip (`asked`), and a card
 * they already own skip it too. There is no fill-in and no spelling
 * question — the sound is the on-card pronunciation, and it drops when
 * it spells an answer (AIR-oh over air, PYRE over Pyre).
 *
 * A Yes line already on the card (including a remount mid-win) skips the
 * intro, so resume cannot land between the intro and the win.
 */
import type { Root, RootWord } from '../data/roots.data';
import type { DeckEntry } from './deckFlow';
import { meaningSitsInAnswer } from './promptFace';
import { speakablePronunciation } from './speak';
import { quizGloss, shortWordDef } from './wordDef';
import { buildAsk, buildPicksForRoot, otherPartsForRoot, partAsk } from './wordParts';

export const INTRO_CONTINUE_LABEL = 'Show the questions';

/** Language names that take a second word ("Old English"). */
const LANGUAGE_QUALIFIER = /^(old|middle|late|new|proto|ancient)$/i;

export interface CardIntroCopy {
  lines: readonly string[];
  continueLabel: string;
}

export interface CardIntroInput {
  entry: DeckEntry;
  learned: boolean;
  /** Yes line is on this card — including a store-restored win after remount. */
  won: boolean;
  /** Kid already tapped through the intro on this visit. */
  dismissed: boolean;
}

/**
 * True while the intro should be the only beat on the card.
 * Recall is included: Next opens the following root straight onto a
 * question, and that root has not been learned yet.
 */
export function introIsShowing(opts: CardIntroInput): boolean {
  if (opts.dismissed || opts.learned || opts.won) return false;
  return opts.entry === 'teach' || opts.entry === 'find' || opts.entry === 'recall';
}

/** "Greek bíos" → Greek. "Old English mis-" → Old English. "Greek/Latin treis" → Greek and Latin. */
export function originLanguage(org: string): string {
  const langs: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const name = raw.replace(/\s+/g, ' ').trim().replace(/[-–]+$/u, '');
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    langs.push(name);
  };

  for (const part of org.split('·')) {
    const tokens = part.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const head = tokens[0];
    if (!head) continue;
    if (head.includes('/')) {
      for (const piece of head.split('/')) add(piece);
      continue;
    }
    const next = tokens[1];
    if (LANGUAGE_QUALIFIER.test(head) && next) {
      add(`${head} ${next.replace(/[-–]+$/u, '')}`);
      continue;
    }
    add(head);
  }

  if (langs.length === 0) return '';
  if (langs.length === 1) return langs[0] ?? '';
  if (langs.length === 2) return `${langs[0]} and ${langs[1]}`;
  const last = langs[langs.length - 1];
  return `${langs.slice(0, -1).join(', ')}, and ${last}`;
}

function clean(raw: string | null | undefined): string {
  return raw?.replace(/\s+/g, ' ').trim() ?? '';
}

/** First letter down so "Pay for work" reads inside a sentence. */
function kidClause(raw: string): string {
  const text = clean(raw).replace(/\.$/, '');
  if (!text) return '';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function finish(lines: string[]): CardIntroCopy {
  const kept = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return {
    lines: kept.length > 0 ? kept : ['Here.'],
    continueLabel: INTRO_CONTINUE_LABEL,
  };
}

/** Ancient spellings after the language name. "Greek bíos" → "bíos". */
export function originSourceForms(org: string): string[] {
  const forms: string[] = [];
  const seen = new Set<string>();
  for (const part of org.split('·')) {
    const tokens = part.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const head = tokens[0];
    if (!head) continue;
    const rest = head.includes('/')
      ? tokens.slice(1)
      : LANGUAGE_QUALIFIER.test(head) && tokens[1]
        ? tokens.slice(2)
        : tokens.slice(1);
    const form = rest.join(' ').trim();
    if (!form) continue;
    const key = form.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    forms.push(form);
  }
  return forms;
}

/**
 * True when `intro` already hands the kid `answer`.
 * A single word matches the way a quiz hint leaks: "life" in "lives",
 * "light" in "sunlight", "come" in "comes", "graph" in "Autograph",
 * "air" in "AIR-oh", "all" in "All roots". A longer tile has to show
 * up as the whole phrase ("pay for work", "study of").
 */
export function introContainsAnswer(intro: string, answer: string): boolean {
  const text = clean(intro);
  const tile = clean(answer);
  if (!text || !tile) return false;
  const tokens = tile.split(/[^A-Za-z]+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.length === 1) return meaningSitsInAnswer(tokens[0]!, text);
  const pattern = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^A-Za-z]+');
  return new RegExp(`(?:^|[^A-Za-z])${pattern}(?:[^A-Za-z]|$)`, 'i').test(text);
}

function leaks(text: string, answers: readonly string[]): boolean {
  return answers.some((answer) => introContainsAnswer(text, answer));
}

function firstSafe(candidates: readonly string[], answers: readonly string[]): string {
  for (const candidate of candidates) {
    const text = clean(candidate);
    if (!text) continue;
    if (leaks(text, answers)) continue;
    return text;
  }
  return '';
}

function safeJoin(parts: readonly string[], answers: readonly string[]): string {
  const kept: string[] = [];
  for (const part of parts) {
    const text = clean(part);
    if (!text) continue;
    const next = [...kept, text].join(' ');
    if (leaks(next, answers)) continue;
    kept.push(text);
  }
  return kept.join(' ');
}

export type IntroQuestionKind = 'mean' | 'word' | 'gloss' | 'part' | 'build' | 'word-mean';

export interface IntroQuestion {
  kind: IntroQuestionKind;
  /** What this question tests — the audit, not the ask line. */
  tests: string;
  ask: string;
  answer: string;
}

const QUESTION_TESTS: Record<IntroQuestionKind, string> = {
  mean: 'what the root means',
  word: 'which school word this root builds',
  gloss: 'what a school word on this card means',
  part: 'what the other piece of a school word means',
  build: 'which school word those pieces build',
  'word-mean': 'what this school word means',
};

function asRoot(root: {
  root: string;
  mean: string;
  words: readonly { w: string; hl?: string; b?: string; d?: string }[];
}): Root {
  const words: RootWord[] = root.words.map((word) => ({
    i: '',
    w: word.w,
    hl: word.hl ?? '',
    b: word.b ?? '',
    d: word.d ?? '',
  }));
  return {
    t: 1,
    root: root.root,
    say: '',
    org: '',
    mean: root.mean,
    alt: '',
    scene: '',
    pal: '',
    lead: '',
    words,
  };
}

function pushAnswer(out: IntroQuestion[], kind: IntroQuestionKind, ask: string, answer: string) {
  const tile = clean(answer);
  if (!tile) return;
  out.push({ kind, tests: QUESTION_TESTS[kind], ask, answer: tile });
}

/** Every answer a new root card can ask. Daily and Rush do not use this intro. */
export function rootQuestionAnswers(root: {
  root: string;
  mean: string;
  words: readonly { w: string; hl?: string; b?: string; d?: string }[];
}): IntroQuestion[] {
  const out: IntroQuestion[] = [];
  pushAnswer(out, 'mean', 'What does this root mean?', root.mean);
  const full = asRoot(root);
  for (const word of root.words) {
    const name = clean(word.w);
    if (!name) continue;
    pushAnswer(out, 'word', 'Which word is built from this root?', name);
    const gloss = word.d ? quizGloss(word.d) : null;
    if (gloss && gloss.toLowerCase() !== clean(root.mean).toLowerCase()) {
      pushAnswer(out, 'gloss', `What does ${name} mean?`, gloss);
    }
  }
  for (const part of otherPartsForRoot(full)) {
    pushAnswer(out, 'part', partAsk(part.word, part.letters), part.mean);
  }
  for (const pick of buildPicksForRoot(full)) {
    pushAnswer(out, 'build', buildAsk(pick.split), pick.word);
  }
  return out;
}

/** The one question a Browse school-word card asks. */
export function wordQuestionAnswers(word: string, def: string): IntroQuestion[] {
  const out: IntroQuestion[] = [];
  const name = clean(word);
  const gloss = shortWordDef(def) || clean(def);
  pushAnswer(out, 'word-mean', name ? `What does ${name} mean?` : 'What does this word mean?', gloss);
  return out;
}

export interface IntroSurface {
  lines: readonly string[];
  continueLabel: string;
  title: string;
  /** Raw pronunciation. Empty when it spells an answer. */
  say: string;
  /** "from Greek bíos", or just "from Greek" when the old spelling leaks. */
  origin: string;
  caption: string;
  eyebrow: string;
  backLabel: string;
  strip: string;
  count: string;
  /** Centre of the bottom pill. */
  navMeta: string;
  /** After Hear. Empty when the sound would answer the question. */
  hearLine: string;
  /** The Hear clip would speak an answer — the button stays quiet. */
  blocksHear: boolean;
}

export interface IntroSurfaceInput {
  entry: DeckEntry;
  root: string;
  say: string;
  mean: string;
  org: string;
  words: readonly { w: string; hl?: string; b?: string; d?: string }[];
  word?: string | null;
  def?: string | null;
  tier?: number;
  tierName?: string;
  position?: number;
  total?: number;
}

const USAGE = [
  'You will meet it inside longer names.',
  'You will meet it inside longer words.',
  'It hides in bigger names.',
  'It hides in bigger words.',
  'Longer names are made with it.',
  'Longer words are made with it.',
];

const HOOK = [
  'The moving picture sets its world.',
  'The picture sets the scene.',
  'Watch the picture, then try the questions.',
  'Then try the questions.',
];

function answerList(opts: IntroSurfaceInput): string[] {
  const word = clean(opts.word);
  const finding = (opts.entry === 'find' || opts.entry === 'asked') && word;
  const questions = finding
    ? wordQuestionAnswers(word, opts.def ?? '')
    : rootQuestionAnswers(opts);
  const answers = questions.map((question) => question.answer);
  const mean = clean(opts.mean);
  if (mean) answers.push(mean);
  return answers;
}

function soundLeaks(say: string, answers: readonly string[]): boolean {
  const raw = clean(say);
  if (!raw) return false;
  const spoken = speakablePronunciation(raw);
  return leaks(raw, answers) || (spoken !== '' && leaks(spoken, answers));
}

/**
 * Everything the intro screen can read. Built so a catalog pass can
 * fail when any of it contains an answer.
 */
export function cardIntroSurface(opts: IntroSurfaceInput): IntroSurface {
  const answers = answerList(opts);
  const word = clean(opts.word);
  const finding = (opts.entry === 'find' || opts.entry === 'asked') && Boolean(word);
  const name = clean(opts.root) || 'This root';
  const lang = originLanguage(opts.org);
  const sources = originSourceForms(opts.org);
  const who = finding ? word : name;
  const fallback = finding ? 'This word' : 'This root';
  const title = firstSafe([who, fallback, 'Here'], answers) || 'Here';
  const safeSources = sources.filter((form) => !leaks(form, answers));
  const originSentence = firstSafe(
    [
      lang && safeSources.length ? `${title} is from ${lang} — ${safeSources.join(' · ')}.` : '',
      lang ? `${title} is from ${lang}.` : '',
      `${title}.`,
      `${fallback}.`,
    ],
    answers,
  );
  const say = clean(opts.say);
  const saySafe = say && !soundLeaks(say, answers) ? say : '';
  const soundLine = saySafe ? firstSafe([`Say it ${saySafe}.`], answers) : '';
  const usage = firstSafe(USAGE, answers);
  const hook = firstSafe(HOOK, answers);
  const line2 = safeJoin([usage, hook, soundLine], answers);
  const copy = finish(line2 ? [originSentence, line2] : [originSentence]);
  const fullOrigin = clean(opts.org);
  const origin = firstSafe(
    [
      fullOrigin ? `from ${fullOrigin}` : '',
      lang && safeSources.length ? `from ${lang} — ${safeSources.join(' · ')}` : '',
      lang ? `from ${lang}` : '',
    ],
    answers,
  );
  const caption = firstSafe(['watch the scene', 'A new card.', 'A card.'], answers) || 'A card.';
  const eyebrow = finding
    ? firstSafe([`Find ${title}`, lang ? `${lang} Root` : '', 'Word'], answers) || 'Word'
    : firstSafe([lang ? `${lang} Root` : '', 'Root'], answers) || 'Root';
  const backLabel = firstSafe(['← All roots', '← Back', '← Home'], answers) || '← Back';
  const tierName = clean(opts.tierName);
  const tier =
    opts.tier && tierName ? `Tier ${opts.tier} · ${tierName}` : tierName;
  const strip = firstSafe([tier, tierName, 'Words'], answers) || 'Words';
  const position = opts.position && opts.position > 0 ? String(opts.position).padStart(2, '0') : '';
  const total = opts.total && opts.total > 0 ? String(opts.total) : '';
  const cardCount = position && total ? `Card ${position} / ${total}` : 'Card';
  const count =
    firstSafe(
      [finding && title !== 'This word' && title !== 'Here' ? title : '', cardCount, 'Card'],
      answers,
    ) || 'Card';
  const place =
    opts.position && opts.position > 0 && opts.total && opts.total > 0
      ? `${opts.position} / ${opts.total}`
      : '';
  const navMeta =
    firstSafe(
      [
        finding && title !== 'This word' && title !== 'Here' ? `Find · ${title}` : '',
        tierName && place ? `${tierName} · ${place}` : '',
        place,
        'Card',
      ],
      answers,
    ) || 'Card';
  const nameLeaks = leaks(name, answers) || (finding && leaks(word, answers));
  const blocksHear = nameLeaks || soundLeaks(say, answers);
  return {
    lines: copy.lines,
    continueLabel: copy.continueLabel,
    title,
    say: saySafe,
    origin,
    caption,
    eyebrow,
    backLabel,
    strip,
    count,
    navMeta,
    hearLine: saySafe,
    blocksHear,
  };
}

/** Text the kid can read on the intro, joined for the catalog leak check. */
export function introVisibleText(surface: IntroSurface): string {
  return [
    surface.title,
    surface.eyebrow,
    surface.backLabel,
    surface.strip,
    surface.count,
    surface.navMeta,
    surface.say,
    surface.origin,
    surface.caption,
    surface.hearLine,
    ...surface.lines,
    surface.continueLabel,
  ]
    .map((part) => clean(part))
    .filter(Boolean)
    .join(' ');
}

/** Root card — origin, how the root is used, the picture, the sound. Not the meaning. */
export function rootIntroCopy(root: {
  root: string;
  say?: string;
  mean: string;
  org: string;
  words: readonly { w: string; hl?: string; b?: string; d?: string }[];
}): CardIntroCopy {
  const surface = cardIntroSurface({
    entry: 'teach',
    root: root.root,
    say: root.say ?? '',
    mean: root.mean,
    org: root.org,
    words: root.words,
  });
  return { lines: surface.lines, continueLabel: surface.continueLabel };
}

/**
 * School-word card — where the word comes from, not what it means.
 * The gloss stays for the question and the feedback after it.
 */
export function wordIntroCopy(opts: {
  word: string;
  def: string;
  root: string;
  say?: string;
  mean: string;
  org: string;
}): CardIntroCopy {
  const surface = cardIntroSurface({
    entry: 'find',
    root: opts.root,
    say: opts.say ?? '',
    mean: opts.mean,
    org: opts.org,
    words: [],
    word: opts.word,
    def: opts.def,
  });
  return { lines: surface.lines, continueLabel: surface.continueLabel };
}

/** Find uses the school word they opened. Teach and recall introduce the root. */
export function cardIntroCopy(opts: {
  entry: DeckEntry;
  root: string;
  say?: string;
  mean: string;
  org: string;
  words: readonly { w: string; hl?: string; b?: string; d?: string }[];
  word?: string | null;
  def?: string | null;
}): CardIntroCopy {
  const surface = cardIntroSurface({
    entry: opts.entry,
    root: opts.root,
    say: opts.say ?? '',
    mean: opts.mean,
    org: opts.org,
    words: opts.words,
    word: opts.word,
    def: opts.def,
  });
  return { lines: surface.lines, continueLabel: surface.continueLabel };
}

function exampleWord(name: string, words: readonly { w: string }[]): string {
  const folded = clean(name).toLowerCase();
  const list = words.map((word) => clean(word.w)).filter(Boolean);
  return list.find((word) => word.toLowerCase() !== folded) || list[0] || '';
}

/** After the answer — the meaning, the origin, and one example. */
export function rootAnswerLesson(root: {
  root: string;
  mean: string;
  org: string;
  words: readonly { w: string }[];
}): string {
  const name = clean(root.root) || 'This root';
  const mean = kidClause(root.mean);
  const lang = originLanguage(root.org);
  const example = exampleWord(name, root.words);
  const line1 = mean ? `${name} means ${mean}.` : `${name}.`;
  const from = lang ? `It comes from ${lang}.` : '';
  const like = example ? `Like ${example}.` : '';
  const line2 = [from, like].filter(Boolean).join(' ');
  return line2 ? `${line1} ${line2}` : line1;
}

/** After the answer on a school word — gloss, origin, and the root it comes from. */
export function wordAnswerLesson(opts: {
  word: string;
  def: string;
  root: string;
  mean: string;
  org: string;
}): string {
  const word = clean(opts.word);
  const gloss = kidClause(shortWordDef(opts.def) || opts.def);
  const name = clean(opts.root);
  const mean = kidClause(opts.mean);
  const lang = originLanguage(opts.org);
  const line1 = word && gloss ? `${word} means ${gloss}.` : word || `${name || 'This word'}.`;
  const fromRoot = name && mean ? `from ${name} — ${mean}` : name ? `from ${name}` : '';
  let line2 = '';
  if (lang && fromRoot) line2 = `It comes from ${lang}, ${fromRoot}.`;
  else if (lang) line2 = `It comes from ${lang}.`;
  else if (fromRoot) line2 = `It comes ${fromRoot}.`;
  return line2 ? `${line1} ${line2}` : line1;
}

export function cardAnswerLesson(opts: {
  entry: DeckEntry;
  root: string;
  mean: string;
  org: string;
  words: readonly { w: string }[];
  word?: string | null;
  def?: string | null;
}): string {
  const word = clean(opts.word);
  if ((opts.entry === 'find' || opts.entry === 'asked') && word) {
    return wordAnswerLesson({
      word,
      def: opts.def ?? '',
      root: opts.root,
      mean: opts.mean,
      org: opts.org,
    });
  }
  return rootAnswerLesson(opts);
}

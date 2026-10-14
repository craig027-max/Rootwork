import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { canon } from '../core/distractors';
import { quizGloss } from '../core/wordDef';
import { buildBig, buildPicksForRoot, otherPartsForRoot } from '../core/wordParts';
import { deckQuizEyebrow, deckQuizHero, deckStudyLead, questionHudName } from './deck/deckQuizHero';
import { deckCaption, deckEyebrow, deckNavMeaning, deckNavRoot } from './deck/deckChrome';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');
const quizCss = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');

function mediaBlock(source: string, query: string): string {
  const start = source.indexOf(`@media (${query})`);
  if (start < 0) throw new Error(`missing @media (${query})`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed @media (${query})`);
}

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const biology = bio.words.find((w) => w.w === 'Biology')!;
const gloss = quizGloss(biology.d)!;

describe('Study quiz hero names the thing being asked', () => {
  it('names Biology on a gloss question — not Bio over the school word', () => {
    const hero = deckQuizHero({
      root: bio.root,
      mean: bio.mean,
      kind: 'gloss',
      word: 'Biology',
    });
    expect(hero?.title).toBe('Biology');
    expect(hero?.title).not.toBe(bio.root);
    expect(hero?.hint).toBe(`from ${bio.root} · ${bio.mean}`);
    expect(hero?.hint).not.toBe('?');
    expect(hero?.hint).not.toContain(gloss);
    expect(hero?.titleClass).toBe('is-gloss');
  });

  it('names -logy on a piece question — not Bio, and not study of', () => {
    const hero = deckQuizHero({
      root: bio.root,
      mean: bio.mean,
      kind: 'part',
      word: 'Biology',
      part: '-logy',
    });
    expect(hero?.title).toBe('-logy');
    expect(hero?.title).not.toBe(bio.root);
    expect(hero?.title).not.toBe('study of');
    expect(hero?.hint).toBe('in Biology');
    expect(hero?.hint).not.toBe('?');
    expect(hero?.hint).not.toContain('study of');
    expect(hero?.titleClass).toBe('is-part');
  });

  it('names the pieces — not Bio, and not the school word those pieces build', () => {
    const hero = deckQuizHero({
      root: bio.root,
      mean: bio.mean,
      kind: 'build',
      word: 'Biology',
      split: biology.b,
    });
    expect(hero?.title).toBe('bio + -logy');
    expect(hero?.title).not.toBe(bio.root);
    expect(hero?.title).not.toBe('Biology');
    expect(hero?.hint).toBe('');
    expect(hero?.hint).not.toBe('?');
    expect(hero?.hint).not.toBe('which word');
    expect(hero?.titleClass).toBe('is-build');
  });

  it('keeps Bio on a meaning question and a which-word question', () => {
    expect(deckQuizHero({ root: bio.root, mean: bio.mean, kind: 'mean' })).toBeNull();
    expect(
      deckQuizHero({
        root: bio.root,
        mean: bio.mean,
        kind: 'word',
        word: 'Biology',
        split: biology.b,
      }),
    ).toBeNull();
    expect(deckQuizHero({ root: bio.root, mean: bio.mean })).toBeNull();
    expect(deckStudyLead(bio.root)).toBe(
      'Look at the scene. Then tap what Bio means, which word its pieces build, or what that word means.',
    );
  });

  it('shrinks a long school word and a long piece', () => {
    expect(
      deckQuizHero({ root: 'Photo', mean: 'light', kind: 'gloss', word: 'Photosynthesis' })?.titleClass,
    ).toBe('is-gloss is-long');
    expect(
      deckQuizHero({ root: 'Bio', mean: 'life', kind: 'part', part: 'degrade', word: 'Biodegradable' })
        ?.titleClass,
    ).toBe('is-part');
    expect(
      deckQuizHero({
        root: 'Bio',
        mean: 'life',
        kind: 'build',
        split: 'bio (life) + degrade (break down)',
      })?.titleClass,
    ).toBe('is-build');
    expect(
      deckQuizHero({
        root: 'Paleo',
        mean: 'old',
        kind: 'build',
        split: 'paleo (old) + lithic (stone)',
      })?.titleClass,
    ).toBe('is-build is-long');
  });

  it('does not invent a title when the beat has no school word or pieces', () => {
    expect(deckQuizHero({ root: bio.root, mean: bio.mean, kind: 'gloss' })).toBeNull();
    expect(deckQuizHero({ root: bio.root, mean: bio.mean, kind: 'part' })).toBeNull();
    expect(deckQuizHero({ root: bio.root, mean: bio.mean, kind: 'build', split: '   ' })).toBeNull();
  });

  it('names the asked thing for every catalog gloss, piece, and build', () => {
    for (const root of ROOTS) {
      for (const word of root.words) {
        const spoken = quizGloss(word.d);
        if (!spoken || canon(spoken) === canon(root.mean)) continue;
        const hero = deckQuizHero({
          root: root.root,
          mean: root.mean,
          kind: 'gloss',
          word: word.w,
        });
        const title = word.w.replace(/\s+/g, ' ').trim();
        expect(hero?.title, word.w).toBe(title);
        if (title !== root.root) expect(hero?.title, word.w).not.toBe(root.root);
        expect(hero?.hint, word.w).not.toBe('?');
        expect(hero?.hint, word.w).not.toBe(spoken);
        expect(hero?.hint, word.w).not.toContain(spoken);
      }
      for (const part of otherPartsForRoot(root)) {
        const hero = deckQuizHero({
          root: root.root,
          mean: root.mean,
          kind: 'part',
          word: part.word,
          part: part.letters,
        });
        expect(hero?.title, part.word).toBe(part.letters);
        expect(hero?.title, part.word).not.toBe(part.mean);
        expect(hero?.hint, part.word).toBe(`in ${part.word}`);
        expect(hero?.hint, part.word).not.toBe(part.mean);
        expect(hero?.hint, part.word).not.toBe('?');
      }
      for (const pick of buildPicksForRoot(root)) {
        const hero = deckQuizHero({
          root: root.root,
          mean: root.mean,
          kind: 'build',
          word: pick.word,
          split: pick.split,
        });
        expect(hero?.title, pick.split).toBe(buildBig(pick.split));
        expect(hero?.title, pick.word).not.toBe(pick.word);
        expect(hero?.title, pick.word).not.toBe(root.root);
        expect(hero?.hint, pick.word).toBe('');
      }
    }
  });

  it('wires the study card to that hero, and Remember stays a root question', () => {
    expect(deck).toContain('deckQuizHero');
    expect(deck).toContain('deckStudyLead');
    expect(deck).toContain('quizHero.title');
    expect(deck).toContain('quizHero.hint');
    expect(deck).not.toContain('quizHero.means');
    expect(deck).not.toContain('quizHero.alt');
    expect(deck).toContain('const quizHero = finding');
    expect(deck).toContain(': deckQuizHero({');
    expect(deck).toContain("kinds: deckEntry === 'remember' ? ['mean', 'word'] : undefined");
    expect(deck).toContain('ww-root${finding ? \' is-find\' : \'\'}${quizHero ? ` ${quizHero.titleClass}` : \'\'}');
    expect(deck).toContain('quizHero ? null : (');
    expect(deck).toContain('studying && !quizHero');
    expect(deck).toContain(') : quizHero ? null : (');
    expect(deck).toContain('className="ww-pron"');
    expect(css).toMatch(/\.ww-root\.is-gloss,\s*\.ww-root\.is-part,\s*\.ww-root\.is-build\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.ww-root\.is-gloss\.is-long/);
    expect(css).toMatch(/\.ww-root\.is-build\.is-long/);
  });

  it('keeps the school word, piece, and pieces readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    const card = mediaBlock(css, 'max-width: 820px');
    const short = mediaBlock(css, 'max-height: 720px');
    for (const block of [phone, card, short]) {
      expect(block).toMatch(/\.ww-root\.is-gloss,\s*\.ww-root\.is-part,\s*\.ww-root\.is-build\s*\{[^}]*display:\s*block/);
      expect(block).toMatch(/\.ww-means\.is-quiz\s*\{[^}]*display:\s*flex/);
      expect(block).toMatch(/\.ww-nav-cur\.is-quiz/);
      expect(block).toMatch(/\.ww-caption\.is-quiz\s*\{[^}]*display:\s*block/);
      expect(block).not.toMatch(/\.ww-root\.is-gloss\s*\{[^}]*display:\s*none/);
      expect(block).not.toMatch(/\.ww-means\.is-quiz\s*\{[^}]*display:\s*none/);
      expect(block).not.toMatch(/\.ww-nav-cur\.is-quiz\s*\{[^}]*display:\s*none/);
      expect(block).not.toMatch(/\.ww-caption\.is-quiz\s*\{[^}]*display:\s*none/);
    }
    expect(short).toMatch(/\.ww-eyebrow2\.is-quiz\s*\{[^}]*display:\s*inline-flex/);
    expect(short).not.toMatch(/\.ww-eyebrow2\.is-quiz\s*\{[^}]*display:\s*none/);
  });
});

describe('Study and Daily chrome name the thing being asked', () => {
  it('names Biology in the nav, caption, and eyebrow — not Bio · ? / Greek Root / watch the scene', () => {
    const hero = deckQuizHero({
      root: bio.root,
      mean: bio.mean,
      kind: 'gloss',
      word: 'Biology',
    });
    expect(hero?.kind).toBe('gloss');
    expect(deckQuizEyebrow('gloss')).toBe('This word');
    expect(deckNavRoot({ root: bio.root, quizTitle: hero?.title })).toBe('Biology');
    expect(deckNavRoot({ root: bio.root, quizTitle: hero?.title })).not.toBe(bio.root);
    expect(deckNavMeaning({ meaning: '?', studying: true, quizTitle: hero?.title })).toBe('');
    expect(deckNavMeaning({ meaning: bio.mean, quizTitle: hero?.title })).not.toBe(bio.mean);
    expect(deckEyebrow({ root: bio.root, lang: 'Greek', quizKind: 'gloss' })).toBe('This word');
    expect(deckEyebrow({ root: bio.root, lang: 'Greek', quizKind: 'gloss' })).not.toMatch(/Greek Root/);
    expect(
      deckCaption({
        emoji: '🧬',
        root: bio.root,
        mean: bio.mean,
        alt: bio.alt,
        studying: true,
        quizTitle: hero?.title,
      }),
    ).toBe('🧬 Biology');
    expect(
      deckCaption({
        emoji: '🧬',
        root: bio.root,
        mean: bio.mean,
        alt: bio.alt,
        studying: true,
        quizTitle: hero?.title,
      }),
    ).not.toMatch(/watch the scene/);
  });

  it('names the piece and the pieces — and a root question stays on Bio', () => {
    expect(deckQuizEyebrow('part')).toBe('Other piece');
    expect(deckQuizEyebrow('build')).toBe('These pieces');
    expect(deckNavRoot({ root: bio.root, quizTitle: '-logy' })).toBe('-logy');
    expect(deckNavRoot({ root: bio.root, quizTitle: 'bio + -logy' })).toBe('bio + -logy');
    expect(deckEyebrow({ root: bio.root, lang: 'Greek', quizKind: 'part' })).toBe('Other piece');
    expect(deckEyebrow({ root: bio.root, lang: 'Greek', quizKind: 'build' })).toBe('These pieces');
    expect(deckNavRoot({ root: bio.root })).toBe(bio.root);
    expect(deckNavMeaning({ meaning: '?', studying: true })).toBe('?');
    expect(deckEyebrow({ root: bio.root, lang: 'Greek' })).toBe('Greek Root');
    expect(
      deckCaption({
        emoji: '🧬',
        root: bio.root,
        mean: bio.mean,
        alt: bio.alt,
        studying: true,
      }),
    ).toBe('🧬 watch the scene');
  });

  it('lets Remember and Find win over a quiz title', () => {
    expect(deckNavRoot({ root: 'Geo', missed: true, quizTitle: 'Geography' })).toBe('Missed Geo');
    expect(deckNavRoot({ root: bio.root, findWord: 'Biology', quizTitle: '-logy' })).toBe('Biology');
    expect(deckEyebrow({ root: 'Geo', lang: 'Greek', missed: true, quizKind: 'gloss' })).toBe(
      'Missed Geo',
    );
    expect(
      deckEyebrow({ root: bio.root, lang: 'Greek', findWord: 'Biology', quizKind: 'part' }),
    ).toBe('Find Biology');
    expect(
      deckCaption({
        emoji: '🌍',
        root: 'Geo',
        mean: 'earth',
        alt: 'land',
        missed: true,
        quizTitle: 'Geography',
      }),
    ).toBe('🌍 Missed Geo');
    expect(deckNavMeaning({ meaning: 'earth', missed: true, quizTitle: 'Geography' })).toBe('');
  });

  it('names every catalog gloss, piece, and build in the nav and caption', () => {
    for (const root of ROOTS) {
      for (const word of root.words) {
        const spoken = quizGloss(word.d);
        if (!spoken || canon(spoken) === canon(root.mean)) continue;
        const title = word.w.replace(/\s+/g, ' ').trim();
        expect(deckNavRoot({ root: root.root, quizTitle: title }), word.w).toBe(title);
        if (title !== root.root) {
          expect(deckNavRoot({ root: root.root, quizTitle: title }), word.w).not.toBe(root.root);
        }
        expect(deckNavMeaning({ meaning: root.mean, quizTitle: title }), word.w).not.toBe(root.mean);
        expect(
          deckCaption({
            emoji: '🔤',
            root: root.root,
            mean: root.mean,
            alt: root.alt,
            studying: true,
            quizTitle: title,
          }),
          word.w,
        ).toBe(`🔤 ${title}`);
      }
      for (const part of otherPartsForRoot(root)) {
        expect(deckNavRoot({ root: root.root, quizTitle: part.letters }), part.word).toBe(part.letters);
        expect(deckEyebrow({ root: root.root, lang: 'Greek', quizKind: 'part' }), part.word).toBe(
          'Other piece',
        );
        expect(deckEyebrow({ root: root.root, lang: 'Greek', quizKind: 'part' }), part.word).not.toBe(
          part.mean,
        );
      }
      for (const pick of buildPicksForRoot(root)) {
        const pieces = buildBig(pick.split);
        expect(deckNavRoot({ root: root.root, quizTitle: pieces }), pick.word).toBe(pieces);
        expect(deckNavRoot({ root: root.root, quizTitle: pieces }), pick.word).not.toBe(pick.word);
        expect(deckNavRoot({ root: root.root, quizTitle: pieces }), pick.word).not.toBe(root.root);
      }
    }
  });

  it('wires Study nav, caption, and eyebrow to the quiz hero', () => {
    expect(deck).toContain('quizTitle: quizHero?.title');
    expect(deck).toContain('quizKind: quizHero?.kind');
    expect(deck).toContain('quizzing={Boolean(quizHero)}');
    expect(deck).toContain("quizHero ? ' is-quiz' : ''");
    expect(css).toMatch(/\.ww-nav-cur\.is-quiz \.r\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.ww-nav-cur\.is-quiz\.is-long \.r/);
    expect(css).toMatch(/\.ww-caption\.is-quiz\s*\{[^}]*text-transform:\s*none/);
  });

  it('names Biology in the Daily corner — a meaning question stays on Bio', () => {
    const glossHud = questionHudName({
      root: bio.root,
      mean: bio.mean,
      kind: 'gloss',
      word: 'Biology',
    });
    expect(glossHud.name).toBe('Biology');
    expect(glossHud.name).not.toBe(bio.root);
    expect(glossHud.quiz).toBe(true);
    const partHud = questionHudName({
      root: bio.root,
      mean: bio.mean,
      kind: 'part',
      word: 'Biology',
      part: '-logy',
    });
    expect(partHud.name).toBe('-logy');
    expect(partHud.name).not.toBe('study of');
    const buildHud = questionHudName({
      root: bio.root,
      mean: bio.mean,
      kind: 'build',
      split: biology.b,
    });
    expect(buildHud.name).toBe(buildBig(biology.b));
    expect(buildHud.name).not.toBe('Biology');
    expect(questionHudName({ root: bio.root, mean: bio.mean, kind: 'mean' }).name).toBe(bio.root);
    expect(questionHudName({ root: bio.root, mean: bio.mean, kind: 'word', word: 'Biology' }).name).toBe(
      bio.root,
    );
    expect(questionHudName({ root: bio.root, mean: bio.mean, kind: 'gloss' }).name).toBe(bio.root);
    expect(daily).toContain('questionHudName');
    expect(daily).toContain('playHud?.name');
    expect(daily).toContain("playHud?.quiz ? ' is-quiz' : ''");
    expect(quizCss).toMatch(/\.q-score\.is-quiz\s*\{[^}]*text-transform:\s*none/);
    expect(quizCss).toMatch(/\.q-score\.is-quiz\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(quizCss).toMatch(/\.q-daily \.q-play \.q-hud\s*\{[^}]*padding-right:\s*40px/);
    for (const query of ['max-width: 560px', 'max-height: 860px', 'max-height: 720px']) {
      const block = mediaBlock(quizCss, query);
      expect(block, query).toMatch(/\.q-score\.is-quiz\s*\{[^}]*display:\s*block/);
      expect(block, query).not.toMatch(/\.q-score\.is-quiz\s*\{[^}]*display:\s*none/);
    }
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { canon } from '../core/distractors';
import { quizGloss } from '../core/wordDef';
import { buildBig, buildPicksForRoot, otherPartsForRoot } from '../core/wordParts';
import { deckQuizHero, deckStudyLead } from './deck/deckQuizHero';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

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
    expect(hero?.means).toBe('?');
    expect(hero?.means).not.toBe(gloss);
    expect(hero?.alt).toBe(`from ${bio.root} · ${bio.mean}`);
    expect(hero?.alt).not.toContain(gloss);
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
    expect(hero?.means).toBe('?');
    expect(hero?.means).not.toBe('study of');
    expect(hero?.alt).toBe('in Biology');
    expect(hero?.alt).not.toContain('study of');
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
    expect(hero?.means).toBe('?');
    expect(hero?.alt).toBe('which word');
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
        expect(hero?.means, word.w).toBe('?');
        expect(hero?.means, word.w).not.toBe(spoken);
        expect(hero?.alt, word.w).not.toContain(spoken);
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
        expect(hero?.means, part.word).not.toBe(part.mean);
        expect(hero?.alt, part.word).toBe(`in ${part.word}`);
        expect(hero?.alt, part.word).not.toBe(part.mean);
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
      }
    }
  });

  it('wires the study card to that hero, and Remember stays a root question', () => {
    expect(deck).toContain('deckQuizHero');
    expect(deck).toContain('deckStudyLead');
    expect(deck).toContain('quizHero.title');
    expect(deck).toContain('quizHero.means');
    expect(deck).toContain('quizHero.alt');
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
      expect(block).not.toMatch(/\.ww-root\.is-gloss\s*\{[^}]*display:\s*none/);
      expect(block).not.toMatch(/\.ww-means\.is-quiz\s*\{[^}]*display:\s*none/);
    }
  });
});

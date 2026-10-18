import { describe, expect, it } from 'vitest';
import { ROOTS, isRootOpenable, rootId } from '../data/roots';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hearHoldLine } from '../core/deckFlow';
import {
  findAlsoNote,
  findAlsoTapLabel,
  findBackOpensIndex,
  findHintLine,
  findKnowLabel,
  findLeadLine,
  findMeanLine,
  findMissLine,
  findSuccessLine,
  otherRootsForWord,
  shortWordDef,
  wordDefForOpen,
  wordRootHearHold,
  wordRootHearLabel,
  wordRootListeningLine,
  wordRootSayLine,
} from './wordFind';

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const log = ROOTS.find((r) => r.root === 'Log')!;
const tele = ROOTS.find((r) => r.root === 'Tele')!;
const phon = ROOTS.find((r) => r.root === 'Phon')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;

describe('Find teaches the school word — not Bio means life', () => {
  it('shortens authored defs at the dash, never invents a meaning', () => {
    const biology = bio.words.find((w) => w.w === 'Biology')!;
    expect(shortWordDef(biology.d)).toBe('The science of living things');
    expect(shortWordDef(biology.d)).not.toMatch(/grow, eat/);
    expect(wordDefForOpen(bio.words, 'Biology')).toBe(biology.d);
    expect(wordDefForOpen(bio.words, 'biology')).toBe(biology.d);
    expect(wordDefForOpen(bio.words, null)).toBeNull();
  });

  it('names Biology on the mean line — not Bio means life', () => {
    const biology = bio.words.find((w) => w.w === 'Biology')!;
    expect(findMeanLine('Biology', biology.d)).toBe(
      'Biology — The science of living things',
    );
    expect(findMeanLine('Biology', biology.d)).not.toMatch(/Bio means life/);
    expect(findLeadLine('Biology', 'bio (life) + -logy (study of)')).toBe(
      'Biology is built from bio (life) + -logy (study of).',
    );
    expect(findSuccessLine('Biology', biology.d)).toBe(
      'Yes — Biology. The science of living things',
    );
    expect(findSuccessLine('Biology', biology.d)).not.toMatch(/Bio means life/);
    expect(findMissLine('Biology', biology.d)).toBe(
      'Nope — Biology: The science of living things.',
    );
    expect(findHintLine('Biology')).toBe('What does Biology mean? One tap.');
    expect(findKnowLabel()).toBe('I know this word ✓');
  });

  it('lists the other half of the school word', () => {
    expect(otherRootsForWord('Biology', rootId(bio))).toEqual([
      { id: rootId(log), root: 'Log', mean: log.mean },
    ]);
    expect(otherRootsForWord('Biology', rootId(log))).toEqual([
      { id: rootId(bio), root: 'Bio', mean: bio.mean },
    ]);
    expect(otherRootsForWord('Telephone', rootId(tele))).toEqual([
      { id: rootId(phon), root: 'Phon', mean: phon.mean },
    ]);
    expect(otherRootsForWord('Photograph', rootId(photo))).toEqual([]);
    expect(findAlsoTapLabel('Log')).toBe('Also on Log →');
    expect(findAlsoNote('Log', log.mean)).toBe(`Also on Log · ${log.mean}`);
  });

  it('hears the root under a school word — not SENT over Century', () => {
    const cent = ROOTS.find((r) => r.root === 'Cent')!;
    const century = cent.words.find((w) => w.w === 'Century')!;
    expect(century.w).toBe('Century');
    expect(wordRootHearLabel(cent.root)).toBe('Hear the root Cent');
    expect(wordRootHearLabel(cent.root)).not.toBe(`Hear ${century.w}`);
    expect(wordRootSayLine(cent.root, cent.say)).toBe(`the root Cent · ${cent.say}`);
    expect(wordRootSayLine(cent.root, cent.say).startsWith(cent.say)).toBe(false);
    expect(wordRootListeningLine()).toBe('Hearing the root…');
    expect(wordRootHearHold(cent.root, cent.say, cent.mean)).toBe(
      `Cent · ${hearHoldLine(cent.say, cent.mean)}`,
    );
    expect(wordRootHearHold(cent.root, cent.say, cent.mean)).not.toMatch(/^sent\b/i);
    expect(wordRootHearLabel('')).toBe('Hear the root');
    expect(wordRootSayLine('', cent.say)).toBe(cent.say);
    expect(wordRootSayLine(cent.root, '  ')).toBe('the root Cent');
    expect(wordRootHearHold('', cent.say, cent.mean)).toBe(hearHoldLine(cent.say, cent.mean));

    for (const root of ROOTS) {
      expect(wordRootHearLabel(root.root)).toBe(`Hear the root ${root.root}`);
      expect(wordRootSayLine(root.root, root.say)).toContain(`the root ${root.root}`);
      for (const word of root.words) {
        expect(wordRootHearLabel(root.root)).not.toBe(`Hear ${word.w}`);
        expect(wordRootSayLine(root.root, root.say)).not.toBe(word.w);
      }
    }
  });

  it('wires the school-word speaker and leaves the root card on Hear {root}', () => {
    const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
    expect(deck).toContain('wordRootHearLabel(root.root)');
    expect(deck).toContain('wordRootSayLine(root.root, root.say)');
    expect(deck).toContain('wordRootListeningLine()');
    expect(deck).toContain('wordRootHearHold(root.root, root.say, root.mean)');
    expect(deck).toContain('finding && findWord');
    expect(deck).toContain('`Hear ${root.root}`');
    expect(deck).toContain('{root.say} &nbsp;·&nbsp; <span className="origin">from {root.org}</span>');
    expect(deck).toContain('speakRoot(card.root, card.say)');
  });

  it('does not open a paywall tap for a locked other half', () => {
    expect(isRootOpenable(rootId(log), false)).toBe(false);
    expect(isRootOpenable(rootId(phon), false)).toBe(true);
    expect(findBackOpensIndex(true)).toBe(true);
    expect(findBackOpensIndex(false)).toBe(false);
  });
});

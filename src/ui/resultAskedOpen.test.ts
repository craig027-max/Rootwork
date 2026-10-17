import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import {
  deckBackLabel,
  deckEyebrow,
  deckNavMeta,
  deckStripTier,
} from './deck/deckChrome';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');

describe('Result chip opens the asked word — then Home, not the root quiz', () => {
  it('wires Daily and Rush result taps, and leaves Home on the root', () => {
    expect(daily).toContain('askedChipOpen');
    expect(daily).toContain('resultChipAria');
    expect(daily).toContain('openRecap(r, showAsked ? title : undefined)');
    expect(daily).not.toContain('openRoot(id, { entry: recapDeckEntry');
    expect(rush).toContain('askedChipOpen');
    expect(rush).toContain('onClick={() => openRecap(id, asked.title)}');
    expect(rush).toMatch(/onClick=\{\(\) => openRecap\(s\.id\)\}/);
    expect(rush).toMatch(/onClick=\{\(\) => openRecap\(id\)\}/);
    expect(home).not.toContain('askedChipOpen');
    expect(home).not.toContain("entry: 'asked'");
  });

  it('opens the word card and sends leave / Yes home — Browse find still opens the catalog', () => {
    expect(deck).toContain('isSchoolWordEntry');
    expect(deck).toContain('askedVisit');
    expect(deck).toContain('findBackOpensIndex(browseFind)');
    expect(deck).toContain('findBackOpensIndex(isFindEntry(useWondralStore.getState().deckEntry))');
    expect(deck).toContain('if (!finding && !glossBeat && !partBeat && !buildBeat && !wordBeat)');
    expect(deckBackLabel({ asked: true })).toBe('Home →');
    expect(deckBackLabel({ asked: true })).not.toMatch(/Find/);
    expect(deckBackLabel({ finding: true })).toBe('← Find');
    expect(deckEyebrow({ root: 'Bio', lang: 'Greek', findWord: 'Biology', asked: true })).toBe(
      'Biology',
    );
    expect(deckEyebrow({ root: 'Bio', lang: 'Greek', findWord: 'Biology', asked: true })).not.toMatch(
      /Find/,
    );
    expect(deckEyebrow({ root: 'Bio', lang: 'Greek', findWord: 'Biology' })).toBe('Find Biology');
    expect(deckStripTier({ asked: true, rootName: 'Bio', tier: 1, tierName: 'Starter' })).toBe('Bio');
    expect(deckStripTier({ asked: true, rootName: 'Bio', tier: 1, tierName: 'Starter' })).not.toMatch(
      /Find|Starter/,
    );
    expect(
      deckNavMeta({
        findWord: 'Biology',
        asked: true,
        fromRoot: 'Bio',
        tierName: 'Starter',
        position: 1,
        total: 183,
      }),
    ).toBe('from Bio');
    expect(
      deckNavMeta({ findWord: 'Biology', tierName: 'Starter', position: 1, total: 183 }),
    ).toBe('Find · Biology');
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

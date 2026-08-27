import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const nav = readFileSync(join(process.cwd(), 'src/ui/deck/DeckNav.tsx'), 'utf8');

describe('after Hear: one next tap, no Rush dump', () => {
  it('Deck waits for this card Hear to finish, then uses afterHearNextTap', () => {
    expect(deck).toContain('afterHearNextTap');
    expect(deck).toContain('isNextPlayHome');
    expect(deck).toContain('setHearFinished(true)');
    expect(deck).toContain('hasActiveClip');
    expect(deck).toContain('onClick={onHear}');
    expect(deck).toContain('speakRoot(card.root, card.say)');
    expect(deck).toContain('showRush={nextTap.showRush}');
    expect(deck).toContain('showNext={nextTap.showNextRoot}');
    expect(deck).toContain('won || !nextTap.showNextRoot ? null');
  });

  it('does not invent smash-together Hear copy — Hear/Yes strings stay sequential', () => {
    expect(deck).toContain('aria-label={`Hear ${root.root}`}');
    expect(deck).not.toMatch(/while (Hear|Yes|you listen)/i);
    expect(deck).not.toMatch(/starts during/i);
    expect(deck).not.toMatch(/overlap/i);
    expect(deck).toContain('I know this ✓');
  });

  it('DeckNav can hide Next and Rush so they do not dump after Hear', () => {
    expect(nav).toContain('showRush');
    expect(nav).toContain('showNext');
    expect(nav).toContain('aria-label="Play Root Rush"');
    expect(nav).toContain('aria-label="Next root"');
    expect(nav).toMatch(/showRush \? \(/);
    expect(nav).toMatch(/showNext \? \(/);
  });

  it('keeps the #19/#32 loop: Yes clip then openRoot with entry recall', () => {
    expect(deck).toContain('speakYes(card.root, card.mean)');
    expect(deck).toContain('waitOutCorrectAdvance');
    expect(deck).toContain("entry: next.entry");
    expect(deck).toContain("{ entry: next.entry }");
  });
});

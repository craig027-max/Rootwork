import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');

describe('after Yes clip: hold win line, one next tap', () => {
  it('keeps the win line on the card after Listening… ends', () => {
    expect(deck).toContain('{winLine}');
    expect(deck).toContain('ww-recall-win${listen.yesNow ? \' is-now\' : \'\'}');
    expect(deck).toContain('listen.yesNow ? \'is-now\' : undefined');
    expect(deck).toContain("watchCurrentClip(true, 'yes')");
    expect(deck).toContain('speakYes(card.root, card.mean)');
    expect(deck).not.toContain('armAdvance');
    expect(deck).not.toContain('waitOutCorrectAdvance');
  });

  it('one next tap after the clip opens the dest in recall', () => {
    expect(deck).toContain('onWinNext');
    expect(deck).toContain('allowWinNextTap');
    expect(deck).toContain('afterYesNextLabel');
    expect(deck).toContain('fireAdvance');
    expect(deck).toContain('commitCorrectAdvance');
    expect(deck).toContain("entry: next.entry");
    expect(deck).toContain("{ entry: next.entry }");
    expect(deck).toContain('disabled={!allowWinNextTap(correctAdvance, listening)}');
  });

  it('does not invent a three-beat Yes recap', () => {
    expect(deck).toContain("clipListening(listening, hearBeats, listenKind === 'yes')");
    expect(deck).toContain('listen.yesNow');
    expect(deck).not.toMatch(/listenKind === 'yes'[\s\S]{0,80}hearBeatChips/);
    expect(deck).not.toMatch(/Yes recap/i);
    expect(deck).not.toMatch(/three-beat/);
  });

  it('does not change Hear meaning, Yes wording, or on-card say', () => {
    expect(deck).toContain('speakRoot(card.root, card.say)');
    expect(deck).toContain('speakYes(card.root, card.mean)');
    expect(deck).toContain('I know this ✓');
    expect(deck).not.toMatch(/while (Hear|Yes|you listen)/i);
    expect(deck).not.toMatch(/starts during/i);
  });
});

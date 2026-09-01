import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const nav = readFileSync(join(process.cwd(), 'src/ui/deck/DeckNav.tsx'), 'utf8');
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

describe('after Hear clip: hold spoken-sound + meaning, one next tap', () => {
  it('keeps spoken-sound + meaning on the card after Listening… ends', () => {
    expect(deck).toContain('holdHearAfterClip');
    expect(deck).toContain('hearHold.line');
    expect(deck).toContain('ww-listen-hold');
    expect(deck).toContain("watchCurrentClip(true, 'hear')");
    expect(deck).toContain('setHearFinished(true)');
    expect(deck).toContain('speakRoot(card.root, card.say)');
    expect(deck).not.toContain('armAdvance');
  });

  it('I-know-this / Next stay available after Hear; no Rush dump', () => {
    expect(deck).toContain('afterHearNextTap');
    expect(deck).toContain('disabled={listen.disableKnowThis}');
    expect(deck).toContain('I know this ✓');
    expect(deck).toContain('showRush={nextTap.showRush}');
    expect(deck).toContain('showNext={nextTap.showNextRoot}');
    expect(deck).toContain('won || !nextTap.showNextRoot ? null');
    expect(nav).toContain('showRush');
    expect(nav).toContain('showNext');
  });

  it('does not invent a three-beat Hear recap after the clip', () => {
    expect(deck).toContain('hearHold.line');
    expect(deck).toContain('listen.beats');
    expect(deck).not.toContain('hearHold.beats');
    expect(deck).not.toMatch(/hearFinished[\s\S]{0,120}hearBeatChips/);
    expect(deck).not.toMatch(/Hear recap/i);
    expect(deck).not.toMatch(/three-beat/);
    expect(deck).toContain("clipListening(listening, hearBeats, listenKind === 'yes')");
  });

  it('keeps the hold on short phones (not with hidden lead/eyebrow)', () => {
    const phone = mediaBlock(css, 'max-height: 720px');
    expect(phone).toMatch(/\.ww-listen-hold\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-listen-hold\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-listen\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-card-actions\s*\{[^}]*display:\s*flex/);
  });

  it('does not change Hear meaning, Yes wording, or on-card say', () => {
    expect(deck).toContain('speakRoot(card.root, card.say)');
    expect(deck).toContain('speakYes(card.root, card.mean)');
    expect(deck).toContain('I know this ✓');
    expect(deck).toContain('allowWinNextTap');
    expect(deck).not.toMatch(/while (Hear|Yes|you listen)/i);
    expect(deck).not.toMatch(/starts during/i);
  });
});

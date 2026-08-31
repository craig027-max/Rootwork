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

describe('listening state while Hear/Yes plays', () => {
  it('shows a Listening… line and an active Hear control', () => {
    expect(deck).toContain('clipListening');
    expect(deck).toContain('className="ww-listen"');
    expect(deck).toContain('listen.line');
    expect(deck).toContain('is-listening');
    expect(deck).toContain('aria-pressed={listen.hearActive}');
    expect(deck).toContain('aria-label={`Hear ${root.root}`}');
    expect(css).toContain('.ww-hear.is-listening');
    expect(css).toContain('.ww-listen');
  });

  it('highlights the current Hear beat from currentTime vs measured splits', () => {
    expect(deck).toContain('hearBeatChips');
    expect(deck).toContain('hearBeatLabels');
    expect(deck).toContain('hearBeatSplits');
    expect(deck).toContain('hearBeatIndex');
    expect(deck).toContain('currentClipTime');
    expect(deck).toContain("watchCurrentClip(true, 'hear')");
    expect(deck).toContain("watchCurrentClip(true, 'yes')");
    expect(deck).toContain('listen.beats');
    expect(deck).toContain('ww-listen-beat');
    expect(deck).toContain('is-now');
    expect(deck).toContain('setInterval(tick, 200)');
    expect(css).toContain('.ww-listen-beat.is-now');
    expect(css).not.toMatch(/\.ww-listen-beats\s*\{[^}]*display:\s*none/);
  });

  it('highlights the existing Yes win line as one is-now beat, not three', () => {
    expect(deck).toContain("clipListening(listening, hearBeats, listenKind === 'yes')");
    expect(deck).toContain('listen.yesNow');
    expect(deck).toContain('ww-recall-win${listen.yesNow ? \' is-now\' : \'\'}');
    expect(deck).toContain('listen.yesNow ? \'is-now\' : undefined');
    expect(deck).toContain('{winLine}');
    expect(deck).toContain("watchCurrentClip(true, 'yes')");
    expect(deck).toContain('speakYes(card.root, card.mean)');
    expect(css).toContain('.ww-recall-win p.is-now');
    expect(css).toContain('.ww-recall-win.is-now');
    expect(css).toContain('ww-yes-now');
    expect(deck).not.toMatch(/listenKind === 'yes'[\s\S]{0,80}hearBeatChips/);
  });

  it('disables I know this and next-root until the clip ends', () => {
    expect(deck).toContain('disabled={listen.disableKnowThis}');
    expect(deck).toContain('disabled={listen.disableNextRoot}');
    expect(deck).toContain('allowNextRootTap');
    expect(deck).toContain('watchCurrentClip');
    expect(deck).toContain('speakYes(card.root, card.mean)');
    expect(deck).toContain("watchCurrentClip(true, 'hear')");
    expect(deck).toContain("watchCurrentClip(true, 'yes')");
    expect(nav).toContain('disabled={nextDisabled}');
  });

  it('keeps the listening line on short phones (not with hidden lead/eyebrow)', () => {
    const phone = mediaBlock(css, 'max-height: 720px');
    expect(phone).toMatch(/\.ww-listen\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-listen\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-listen-beats\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-listen-beats\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-recall-win,\s*\n\s*\.ww-recall-win\.is-now\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-recall-win(?:\.is-now)?\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-card-actions\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-card-actions\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ww-lead2,\s*\n\s*\.ww-eyebrow2\s*\{[^}]*display:\s*none/);
  });

  it('does not invent smash-together wait copy or change Hear/Yes wording', () => {
    expect(deck).toContain('I know this ✓');
    expect(deck).toContain('speakRoot(card.root, card.say)');
    expect(deck).toContain('speakYes(card.root, card.mean)');
    expect(deck).not.toMatch(/while (Hear|Yes|you listen)/i);
    expect(deck).not.toMatch(/starts during/i);
    expect(deck).not.toMatch(/overlap/i);
  });

  it('holds the Yes win line after the clip; next tap opens recall', () => {
    expect(deck).toContain('{winLine}');
    expect(deck).toContain('onWinNext');
    expect(deck).toContain('allowWinNextTap');
    expect(deck).toContain('afterYesNextLabel');
    expect(deck).toContain('fireAdvance');
    expect(deck).toContain("entry: next.entry");
    expect(deck).toContain('afterHearNextTap');
    expect(deck).toContain('setHearFinished(true)');
    expect(deck).not.toContain('waitOutCorrectAdvance');
    expect(deck).not.toContain('armAdvance');
  });
});

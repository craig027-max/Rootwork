import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

function firstRule(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector}\\s*\\{[^}]+\\}`));
  if (!match) throw new Error(`missing ${selector} rule`);
  return match[0];
}

describe('Hear control', () => {
  it('keeps the ww-hear class next to the pronunciation', () => {
    expect(deck).toContain('ww-hear');
    expect(deck).toContain('className="ww-pron"');
    expect(deck.indexOf('ww-hear')).toBeGreaterThan(deck.indexOf('className="ww-pron"'));
    expect(deck.indexOf('ww-hear')).toBeLessThan(deck.indexOf('className="ww-means"'));
    expect(deck).toContain('aria-label={`Hear ${root.root}`}');
    expect(deck).toContain('speakRoot(card.root, card.say)');
    expect(deck).toContain('waitOutCorrectAdvance');
    expect(deck).toContain('whenCurrentClipEnds');
    expect(deck).toContain('speakYes(card.root, card.mean)');
  });

  it('keeps a 44px minimum tap target', () => {
    const rule = firstRule(css, '\\.ww-hear');
    expect(rule).toMatch(/width:\s*44px/);
    expect(rule).toMatch(/height:\s*44px/);
    expect(rule).toMatch(/min-width:\s*44px/);
    expect(rule).toMatch(/min-height:\s*44px/);
  });

  it('styles the control as a visible button, not faded type', () => {
    const rule = firstRule(css, '\\.ww-hear');
    expect(rule).toContain('.ww-hear');
    expect(rule).not.toContain('var(--text-secondary)');
    expect(rule).not.toMatch(/rgba\(\s*255,\s*255,\s*255,\s*0\.0[0-6]\s*\)/);
    expect(rule).toMatch(/color:\s*rgb\(var\(--spark-rgb\)\)/);
    expect(rule).toMatch(/background:\s*rgba\(var\(--spark-rgb\)/);
    expect(rule).toMatch(/border:\s*1px solid rgba\(var\(--spark-rgb\)/);
  });

  it('marks the control active while a clip is playing', () => {
    expect(deck).toContain('is-listening');
    expect(deck).toContain('aria-pressed={listen.hearActive}');
    const active = firstRule(css, '\\.ww-hear\\.is-listening');
    expect(active).toMatch(/background:\s*rgba\(var\(--spark-rgb\)/);
    expect(active).toMatch(/box-shadow:/);
  });
});

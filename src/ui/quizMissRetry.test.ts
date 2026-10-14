import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

describe('A miss retries the question they just missed', () => {
  it('Study Try again clears the pick on that beat — it does not deal a new one', () => {
    expect(deck).toMatch(
      /function retryRecall\(\) \{\s*setRecall\(\(cur\) => \{\s*if \(!cur \|\| cur\.rootId !== id \|\| cur\.win\) return cur;\s*return \{ \.\.\.cur, picked: null \};\s*\}\);\s*\}/,
    );
    expect(deck).toContain('onClick={retryRecall}>Try again — you\'ve got this</Button>');
    expect(deck).not.toMatch(/onClick=\{startRecall\}>Try again/);
    expect(deck).toContain(') : quizRecall ? null : done && !remembering && !finding ? (');
    expect(deck).toContain('quizRecall && quizRecall.picked !== null');
    expect(deck).toContain("scrollIntoView({ block: 'end' })");
    expect(deck).toContain("if (o.ok) cls += ' correct'");
    expect(deck).toContain('onClick={startRecall}');
  });

  it('Remember still leaves — Try again is not the miss tap there', () => {
    const teach = deck.slice(deck.indexOf('ww-recall-teach'));
    const rememberBtn = teach.indexOf('onClick={closeRoot}');
    const retryBtn = teach.indexOf('onClick={retryRecall}');
    expect(rememberBtn).toBeGreaterThan(-1);
    expect(retryBtn).toBeGreaterThan(rememberBtn);
    expect(teach.slice(rememberBtn, retryBtn)).toContain('rememberLeaveLabel');
  });

  it('Daily Try again asks that same question — the right tile lights up', () => {
    expect(daily).toMatch(/function retry\(\) \{\s*setPicked\(null\);\s*\}/);
    expect(daily).not.toContain('dealBeat(root)');
    expect(daily).toContain("if (o.ok) cls += ' correct'");
    expect(daily).toContain('Try again ›');
    expect(daily).toContain('dealBeat(first)');
    expect(daily).toContain('dealBeat(n)');
  });

  it('paints the right Study tile green, including on a phone', () => {
    expect(css).toMatch(
      /\.ww-recall-opt\.correct,\s*\.ww-recall-opt\.correct:hover\s*\{[^}]*background:\s*rgba\(34,\s*197,\s*94,\s*0\.14\)/,
    );
    expect(css).not.toMatch(/\.ww-recall-opt\.correct\s*\{[^}]*display:\s*none/);
  });
});

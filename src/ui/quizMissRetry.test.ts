import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');
const quizCss = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');

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
    expect(daily).toContain('dealBeat(first, startAt, { reset: true })');
    expect(daily).toContain('dealBeat(n, next)');
  });

  it('Rush Try again stays on that question — the first miss still counts', () => {
    expect(rush).toContain('rushAnswerKind(hitsRef.current[qi] === false, ok)');
    expect(rush).toContain("kind === 'practice-hit' || kind === 'practice-miss'");
    expect(rush).toContain('if (kind === \'score-hit\')');
    expect(rush).toMatch(
      /function retry\(\) \{\s*if \(phase !== 'play' \|\| picked === null \|\| answeredCorrect\) return;\s*setRetriedMiss\(true\);\s*setPicked\(null\);\s*\}/,
    );
    expect(rush).toContain('rushComboLabel({');
    expect(rush).toContain('missed: hits[qi] === false');
    expect(rush).toContain('if (streak >= 2) setComboBroke(true)');
    expect(rush).toContain('rushResultTallyLabel(hits.some((ok) => ok === false))');
    expect(rush).toContain("hits[qi] === false ? ' is-practice'");
    expect(rush).not.toMatch(/streak >= 2 \? `🔥 \$\{streak\} streak/);
    expect(quizCss).toMatch(/\.q-combo\.is-practice\s*\{[^}]*color:\s*#ff8a8f/);
    expect(quizCss).not.toMatch(/\.q-combo\.is-practice\s*\{[^}]*display:\s*none/);
    expect(rush).toContain('onClick={retry}');
    expect(rush).toContain('{RUSH_RETRY_LABEL}');
    expect(rush).toContain('hits[qi] === false');
    expect(rush).toContain('rushPracticeYesLine');
    expect(rush).toContain('if (answeredCorrect) advance()');
    expect(rush).toContain('else retry()');
    expect(rush).not.toMatch(/onClick=\{advance\}>\s*\{isLast \? 'See results ›' : 'Next ›'\}/);
    const phone = quizCss.slice(quizCss.indexOf('@media (max-width: 560px)'));
    expect(phone).toMatch(/\.q-rush \.q-play \.q-next\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-rush \.q-play \.q-next\s*\{[^}]*width:\s*100%/);
    expect(phone).not.toMatch(/\.q-rush \.q-play \.q-next\s*\{[^}]*display:\s*none/);
    const short = quizCss.slice(quizCss.indexOf('@media (max-height: 720px)'));
    expect(short).toMatch(/\.q-rush \.q-play \.q-next\s*\{[^}]*display:\s*block/);
    expect(short).not.toMatch(/\.q-rush \.q-play \.q-next\s*\{[^}]*display:\s*none/);
  });

  it('paints the right Study tile green, including on a phone', () => {
    expect(css).toMatch(
      /\.ww-recall-opt\.correct,\s*\.ww-recall-opt\.correct:hover\s*\{[^}]*background:\s*rgba\(34,\s*197,\s*94,\s*0\.14\)/,
    );
    expect(css).not.toMatch(/\.ww-recall-opt\.correct\s*\{[^}]*display:\s*none/);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const quiz = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');

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

describe('Daily hold: peek the next root, then Next — Home lands on that peek', () => {
  it('holds Yes + Next · {root} · {meaning} — last root stays Done', () => {
    expect(daily).toContain('dailyHoldNextLine');
    expect(daily).toContain('dailyHoldContinueLine');
    expect(daily).toContain('nextHold');
    expect(daily).toContain('continueHold');
    expect(daily).toContain('q-next-peek');
    expect(daily).toContain('q-hold');
    expect(daily).toContain('afterDailyNextLabel(isLast)');
    expect(daily).toContain('dailyHoldLine(root.root, root.mean)');
    expect(daily).toContain('learnNextAction');
    expect(daily).not.toMatch(/Keep going ·|Continue \{/);
  });

  it('lands returning Home on Daily mid-run so the next-root scene is first', () => {
    expect(home).toContain('isDailyResumeItem');
    expect(home).toContain('dailyResume: dailyResumeQi != null');
    expect(home).toContain('isResumeTier(selected) || isDailyResumeItem(selected)');
    expect(menu).toContain('opts.dailyResume');
    expect(menu).toContain("it.key === 'daily'");
    expect(menu).toContain('isDailyResumeItem');
    expect(detail).toContain('heroCta: Boolean(dailyResume != null && !extra.dailyDone)');
  });

  it('keeps the next-root peek readable on a phone and a short screen', () => {
    const phone = mediaBlock(quiz, 'max-width: 560px');
    const short = mediaBlock(quiz, 'max-height: 720px');
    expect(phone).toMatch(/\.q-daily \.q-hold\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.q-daily \.q-fb\.q-next-peek\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.q-daily \.q-hold\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.q-daily \.q-fb\.q-next-peek\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-daily \.q-hold\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-fb\.q-next-peek\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.q-daily \.q-hold\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.q-fb\.q-next-peek\s*\{[^}]*display:\s*none/);
    expect(quiz).toMatch(/\.q-hold\s*\{/);
    expect(quiz).toMatch(/\.q-fb\.q-next-peek\s*\{/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

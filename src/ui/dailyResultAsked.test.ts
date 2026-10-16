import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');

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

describe('Daily result names the question — not Bio / life over Biography', () => {
  it('wires the done list to the asked chip and keeps Remember on the root', () => {
    expect(daily).toContain('recallAskedChip');
    expect(daily).toContain('askedChipFor(root, beat)');
    expect(daily).toContain('layoutDailyAsked');
    expect(daily).toContain('stampDailyAsked');
    expect(daily).toContain('showAsked');
    expect(daily).toContain('!done.missWaiting');
    expect(daily).toContain('played.find((item) => item?.root === r.root)');
    expect(daily).toContain('dailyRecapChipLabel(title, completed.has(rootId(r)))');
    expect(daily).toContain('q-daily-asked');
    expect(daily).toContain('title.length >= 14');
    expect(daily).toContain('recordDailyComplete(hitId, nextAsked)');
    expect(daily).toContain('saveDailyRun(qi + 1, hitId, nextAsked)');
    expect(daily).not.toContain('<em>{chip.mean || r.mean}</em>');
    expect(home).not.toContain('recallAskedChip');
    expect(home).not.toContain('q-daily-asked');
  });

  it('keeps a long asked chip on screen on a phone and a short screen', () => {
    expect(css).toMatch(/\.q-daily-asked \.q-daily-chip\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.q-daily-asked \.q-daily-chip\s*\{[^}]*max-width:\s*100%/);
    expect(css).toMatch(/\.q-daily-asked \.q-daily-chip\.is-long/);
    const phone = mediaBlock(css, 'max-width: 560px');
    expect(phone).toMatch(/\.q-daily-asked\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.q-daily-asked \.q-daily-chip\.is-long\s*\{[^}]*display:\s*inline-flex/);
    expect(phone).not.toMatch(/\.q-daily-asked \.q-daily-chip\.is-long\s*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.q-daily-asked \.q-daily-chip\.is-long\s*\{[^}]*display:\s*inline-flex/);
    expect(short).not.toMatch(/\.q-daily-asked \.q-daily-chip\.is-long\s*\{[^}]*display:\s*none/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

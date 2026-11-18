import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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

describe('phone tap targets a kid can hit', () => {
  it('keeps the home button, today rows, nav buttons, and footer links at 44px', () => {
    expect(css).toMatch(/\.ww-brand\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.ww-today-item\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.ww-nav-btn\s*\{[^}]*flex:\s*none/);
    expect(css).toMatch(/\.ww-nav-btn\s*\{[^}]*width:\s*44px/);
    expect(css).toMatch(/\.ww-nav-btn\s*\{[^}]*height:\s*44px/);
    expect(css).toMatch(/\.ww-legal-links a\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.ww-for-grownups button\s*\{[^}]*min-height:\s*44px/);
  });

  it('lets a long card name shrink instead of squashing the nav buttons', () => {
    const phone = mediaBlock(css, 'max-width: 400px');
    expect(phone).toMatch(/\.ww-nav-cur\s*\{[^}]*min-width:\s*0/);
  });

  it('hides the repeated product name in the card strip on a phone landscape', () => {
    const land = mediaBlock(css, 'max-width: 900px');
    expect(land).toMatch(/\.ww-strip \.title\s*\{[^}]*display:\s*none/);
  });
});

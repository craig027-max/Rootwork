import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appCss = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');
const quizCss = readFileSync(join(process.cwd(), 'src/styles/quiz.css'), 'utf8');
const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');

function mediaBlocks(source: string, query: string): string[] {
  const needle = `@media (${query})`;
  const blocks: string[] = [];
  let from = 0;
  while (from < source.length) {
    const start = source.indexOf(needle, from);
    if (start < 0) break;
    const after = source.slice(start + needle.length);
    if (!/^\s*\{/.test(after)) {
      from = start + needle.length;
      continue;
    }
    const open = source.indexOf('{', start);
    let depth = 0;
    let end = -1;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end < 0) throw new Error(`unclosed @media (${query})`);
    blocks.push(source.slice(start, end));
    from = end;
  }
  if (blocks.length === 0) throw new Error(`missing @media (${query})`);
  return blocks;
}

function mediaBlock(source: string, query: string, marker?: string): string {
  const blocks = mediaBlocks(source, query);
  if (!marker) return blocks[0];
  const hit = blocks.find((block) => block.includes(marker));
  if (!hit) throw new Error(`@media (${query}) missing ${marker}`);
  return hit;
}

describe('tablet and short-window layout', () => {
  it('lets the home preview scene use the column under 860px', () => {
    const flexHome = mediaBlock(appCss, 'max-width: 860px', '.ww-home-grid.is-first');
    expect(flexHome).toMatch(/align-items:\s*stretch/);
    expect(flexHome).toMatch(/\.ww-home-preview,[\s\S]*?width:\s*100%/);
    const phone = mediaBlock(appCss, 'max-width: 860px', '.ww-detail-scene {');
    const scene = phone.slice(phone.indexOf('.ww-detail-scene {'));
    expect(scene).toMatch(/width:\s*100%/);
    expect(scene).toMatch(/aspect-ratio:\s*auto/);
    expect(scene).not.toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
  });

  it('lets the stacked lesson scene use the card width under 820px', () => {
    const stacked = mediaBlock(appCss, 'max-width: 820px');
    const scene = stacked.slice(stacked.indexOf('.ww-scene2 {'));
    expect(scene).toMatch(/width:\s*100%/);
    expect(scene).toMatch(/aspect-ratio:\s*auto/);
    expect(scene).toMatch(/justify-self:\s*stretch/);
    expect(scene).not.toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
  });

  it('stacks the deck nav root and meta so they do not share one line', () => {
    expect(appCss).toMatch(
      /\.ww-nav-cur \.r,\s*\.ww-nav-cur \.meta\s*\{[^}]*display:\s*block/,
    );
  });

  it('keeps the narrow card count as one phrase', () => {
    const narrow = mediaBlock(appCss, 'max-width: 400px');
    expect(narrow).toMatch(/\.ww-strip\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(narrow).toMatch(/\.ww-strip \.count\s*\{[^}]*white-space:\s*nowrap/);
  });

  it('takes the deck nav out of the short-window overlay and keeps safe area', () => {
    const short = mediaBlock(appCss, 'max-height: 520px');
    expect(short).toMatch(/\.ww-decknav\s*\{[^}]*position:\s*static/);
    expect(short).toMatch(/env\(safe-area-inset-bottom/);
    expect(short).toMatch(/\.ww-scene2\s*\{[^}]*aspect-ratio:\s*auto/);
    expect(short).not.toMatch(/\.ww-words\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.ww-card-actions\s*\{[^}]*display:\s*none/);
  });

  it('keeps quiz answers on a short window without hiding the question', () => {
    const short = mediaBlock(quizCss, 'max-height: 520px');
    expect(short).toMatch(/\.q-scene\s*\{[^}]*height:\s*64px/);
    expect(short).toMatch(/\.q-scene\s*\{[^}]*aspect-ratio:\s*auto/);
    expect(short).toMatch(/\.q-opt\s*\{[^}]*min-height:\s*44px/);
    expect(short).not.toMatch(/\.q-opt\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.q-ask\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.q-big\s*\{[^}]*display:\s*none/);
  });

  it('keeps phone safe-area padding and the existing zoom policy', () => {
    expect(appCss).toMatch(/\.ww-app\s*\{[^}]*env\(safe-area-inset-top/);
    expect(appCss).toMatch(/\.ww-decknav\s*\{[^}]*env\(safe-area-inset-bottom/);
    expect(quizCss).toMatch(/env\(safe-area-inset-top/);
    expect(quizCss).toMatch(/env\(safe-area-inset-left/);
    expect(html).toMatch(/viewport-fit=cover/);
    expect(html).toMatch(/user-scalable=no/);
    expect(html).toMatch(/maximum-scale=1/);
  });

  it('does not drop lesson or quiz wording from the screens', () => {
    expect(deck).toContain('className="ww-words"');
    expect(deck).toContain('root.words.map');
    expect(rush).toContain('q-opt');
    expect(rush).toContain('q-ask');
  });
});

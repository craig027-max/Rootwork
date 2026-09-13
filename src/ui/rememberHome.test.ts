import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const store = readFileSync(join(process.cwd(), 'src/app/store.ts'), 'utf8');
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

describe('Remember {root}: one-beat visit, then Home', () => {
  it('Home opens the named root as remember — not the Geo quiz loop', () => {
    expect(home).toContain("entry: 'remember'");
    expect(home).toContain('recapOpenForRoot');
    expect(home).toContain('onSample={vm.samplesDone ? onRecap : undefined}');
    expect(home).not.toContain("onRemember={(id) => openRoot(id, { entry: 'recall' })}");
    expect(deck).toContain('isRecallEntry(deckEntry)');
    expect(deck).toContain('afterCorrectRecall(id, entitled, { entry: deckEntry })');
    expect(deck).toContain("deckEntry === 'remember'");
    expect(deck).toContain('Remember ${root.root}');
    expect(deck).toContain('← Today');
    expect(deck).toContain('afterYesNextLabel(');
    expect(deck).toContain('deckEntry');
    expect(store).toContain('deckEntryForOpen');
  });

  it('holds the Yes line and the Home tap — Geo stays closed', () => {
    expect(deck).toContain('afterYesNextLabel');
    expect(deck).toContain('fireAdvance');
    expect(deck).toContain('commitCorrectAdvance');
    expect(deck).toContain('ww-card2${remembering ? \' is-remember\' : \'\'}');
    expect(deck).toContain('ww-caption${remembering ? \' is-remember\' : \'\'}');
    expect(deck).toContain(
      'You already own ${root.root}. Tap what it means — or which word it builds. Then Home.',
    );
    expect(deck).toContain('Remember ${root.root} — one tap. No shame if you miss.');
  });

  it('keeps Remember chrome + Home tap readable on a short phone', () => {
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-caption\.is-remember\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.ww-card2\.is-remember \.ww-card-actions\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.ww-recall-win\s*,/);
    expect(short).not.toMatch(/\.ww-caption\.is-remember\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.ww-card2\.is-remember \.ww-card-actions\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-caption\.is-remember\s*\{/);
    expect(css).toMatch(/\.ww-eyebrow2\.is-remember\s*\{/);
    expect(css).toMatch(/\.ww-card2\.is-remember \.ww-deck-back\s*\{/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, rootId } from '../data/roots';
import { recapDeckEntry, recapOpenForRoot } from '../core/deckFlow';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const band = readFileSync(join(process.cwd(), 'src/ui/home/ProfileBand.tsx'), 'utf8');
const panel = readFileSync(join(process.cwd(), 'src/ui/home/DetailPanel.tsx'), 'utf8');
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

const bio = ROOTS.find((r) => r.root === 'Bio');
if (!bio) throw new Error('fixture: Bio');
const bioId = rootId(bio);

describe('Done Daily / Learned recap is Remember — not Geo', () => {
  it('owned recap chips open Remember; unowned stay teach', () => {
    expect(recapDeckEntry(true)).toBe('remember');
    expect(recapDeckEntry(false)).toBe('teach');
    expect(recapOpenForRoot('Bio', new Set([bioId]))).toEqual({
      id: bioId,
      entry: 'remember',
    });
    expect(recapOpenForRoot('Bio', new Set())).toEqual({ id: bioId, entry: 'teach' });
  });

  it('Daily done chips and Home Daily recap use the Remember open', () => {
    expect(daily).toContain('recapDeckEntry');
    expect(daily).toContain('openRecap(r)');
    expect(daily).toContain('aria-label={`Remember ${r.root}`}');
    expect(daily).not.toContain('onClick={() => openRoot(rootId(r))}');
    expect(home).toContain('recapOpenForRoot');
    expect(home).toContain('onSample={vm.samplesDone ? onRecap : undefined}');
    expect(panel).toContain('Remember ${s.root}');
    expect(panel).toContain('is-tap');
  });

  it('Learned {root} reviews as Remember — Continue {next} stays teach', () => {
    expect(band).toContain("action === 'learn' && rootId) onContinue");
    expect(band).toContain("(action === 'review' || action === 'remember') && rootId) onRemember");
    expect(band).not.toContain("(action === 'learn' || action === 'review')");
    expect(home).toContain("onRemember={(id) => openRoot(id, { entry: 'remember' })}");
  });

  it('keeps the Remember recap tap readable on a phone', () => {
    const phone = mediaBlock(css, 'max-width: 860px');
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-done\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.ww-samples\.is-lines \.ww-schip\.is-done\.is-tap\s*\{[^}]*display:\s*flex/);
    expect(phone).not.toMatch(/\.ww-schip\.is-done\.is-tap\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/button\.ww-schip\s*\{/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

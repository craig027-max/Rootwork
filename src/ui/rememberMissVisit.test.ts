import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, firstRoot, rootId, rootsInTier } from '../data/roots';
import {
  rememberHintLine,
  rememberLeadLine,
  rememberMissLine,
} from '../core/deckFlow';
import { isOwnedRushMiss, rushRecapFromRun, todayMissRecap } from '../core/rushRecap';
import { listHeading } from './home/menu';
import { rememberMissCtaLabel } from './home/todayProgress';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const tierMenu = readFileSync(join(process.cwd(), 'src/ui/home/TierMenu.tsx'), 'utf8');
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

const TODAY = '2026-09-25';
const first = firstRoot();
if (!first) throw new Error('fixture: expected Bio');
const starter = rootsInTier(1);
const geo = starter[1];
const photo = starter[2];
if (!geo || !photo) throw new Error('fixture: expected Photo');
const builder = rootsInTier(2);
const firstBuilder = builder[0];
if (!firstBuilder) throw new Error('fixture: expected Builder');

function atDay(day: string, hour = 15): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d, hour).getTime();
}

const lastRun = rushRecapFromRun(
  [
    { id: rootId(photo), ok: true },
    { id: rootId(first), ok: true },
    { id: rootId(geo), ok: false },
  ],
  { day: TODAY, studentId: 'kid-a' },
);
const owned = {
  [rootId(first)]: { completedAt: atDay('2026-09-01') },
  [rootId(geo)]: { completedAt: atDay('2026-09-02') },
  [rootId(photo)]: { completedAt: atDay('2026-09-03'), reviewedAt: atDay(TODAY, 11) },
  [rootId(firstBuilder)]: { completedAt: atDay('2026-09-10') },
};

describe('Remember visit after a miss is honest — not You already own / Tap continue over Geo', () => {
  it('names the Rush miss on the visit — stale Remember stays You already own', () => {
    expect(isOwnedRushMiss(rootId(geo), lastRun, owned, TODAY)).toBe(true);
    expect(isOwnedRushMiss(rootId(first), lastRun, owned, TODAY)).toBe(false);
    expect(isOwnedRushMiss(rootId(photo), lastRun, owned, TODAY)).toBe(false);

    expect(rememberLeadLine(geo.root, { missed: true })).toBe(
      `You missed ${geo.root} in Rush. Tap what it means — then Home.`,
    );
    expect(rememberLeadLine(geo.root, { missed: true })).not.toMatch(/You already own|builds/);
    expect(rememberHintLine(geo.root, { missed: true })).toBe(
      `Remember ${geo.root} — you missed this in Rush.`,
    );
    expect(rememberHintLine(geo.root, { missed: true })).not.toMatch(/No shame|already own/);
    expect(rememberMissLine(geo.root, geo.mean)).toBe(`Nope — ${geo.root} means ${geo.mean}.`);
    expect(rememberMissCtaLabel(geo.root)).toBe(`Remember ${geo.root} ›`);
    expect(todayMissRecap(geo.root)).toBe(`Remember ${geo.root} — missed in Rush`);

    expect(rememberLeadLine(first.root)).toBe(
      `You already own ${first.root}. Tap what it means — or which word it builds. Then Home.`,
    );
    expect(rememberHintLine(first.root)).toBe(
      `Remember ${first.root} — one tap. No shame if you miss.`,
    );
    expect(rememberLeadLine(first.root)).not.toMatch(/missed this in Rush|You missed /);
  });

  it('Home Progress after a miss is Remember — not Jump back in / Tap continue', () => {
    expect(listHeading(false, { missWaiting: true })).toBe('Remember');
    expect(listHeading(false, { pathDone: true, missWaiting: true })).toBe('Remember');
    expect(listHeading(false, { pathDone: true })).toBe('Keep going');
    expect(listHeading(false)).toBe('Jump back in');
    expect(listHeading(false, { missWaiting: true })).not.toMatch(/Jump back in|Tap continue|Keep going/);
  });

  it('wires Deck + Home Progress — miss lead, Remember heading, no % bar over Geo', () => {
    expect(deck).toContain('isOwnedRushMiss');
    expect(deck).toContain('todayRushRecap');
    expect(deck).toContain('rememberLeadLine(root.root, { missed: missRemember })');
    expect(deck).toContain('rememberHintLine(root.root, { missed: missRemember })');
    expect(deck).toContain("ww-lead2${missRemember ? ' is-remember-miss' : ''}");
    expect(deck).toContain("ww-muted${missRemember ? ' is-remember-miss' : ''}");
    expect(deck).not.toContain('You already own ${root.root}');
    expect(home).toContain('missWaiting: missHero');
    expect(home).toContain("? 'Remember'");
    expect(home).toContain('Tap continue');
    expect(menu).toContain("if (opts.missWaiting) return 'Remember'");
    expect(tierMenu).toContain('!it.locked && !playNow && !it.missName');
    expect(tierMenu).not.toContain('!it.locked && !playNow ? (');
  });

  it('keeps the miss lead readable on a short phone — not hidden with You already own', () => {
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-lead2\.is-remember-miss\s*,/);
    expect(short).toMatch(/\.ww-muted\.is-remember-miss\s*\{[^}]*display:\s*block/);
    expect(short).not.toMatch(/\.ww-lead2\.is-remember-miss\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ww-lead2\.is-remember-miss/);
    expect(css).toMatch(/\.ww-muted\.is-remember-miss/);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dailyHoldNextLine } from '../core/daily';
import { dailyNextPeekFace } from '../core/dailyNextPeek';
import { quizGloss } from '../core/wordDef';
import { buildBig, buildPicksForRoot, otherPartsForRoot } from '../core/wordParts';
import { ROOTS } from '../data/roots';

const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'src/ui/Home.tsx'), 'utf8');
const menu = readFileSync(join(process.cwd(), 'src/ui/home/menu.ts'), 'utf8');
const detail = readFileSync(join(process.cwd(), 'src/ui/home/detailVM.tsx'), 'utf8');
const hydrate = readFileSync(join(process.cwd(), 'src/core/hydrate.ts'), 'utf8');
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

describe('Daily hold: peek the next question, then Next — Home lands on that peek', () => {
  it('holds Yes + the question Next will open — last root stays Done', () => {
    expect(daily).toContain('dailyNextPeekFace(nextHold, queuedNext)');
    expect(daily).toContain('dealBeat(n, next, { beat: queuedNext })');
    expect(daily).toContain('setQueuedNext');
    expect(daily).toContain('dailyHoldNextLine');
    expect(daily).toContain('dailyHoldContinueLine');
    expect(daily).toContain('dailyHoldKeepGoingLine');
    expect(daily).toContain('dailyHoldRememberLine');
    expect(daily).toContain('rushMissRememberReady');
    expect(daily).toContain('lastHoldMiss');
    expect(daily).toContain('nextHold');
    expect(daily).toContain('continueHold');
    expect(daily).toContain('q-next-peek');
    expect(daily).toContain('q-hold');
    expect(daily).toContain('afterDailyNextLabel(isLast)');
    expect(daily).toContain('dailyHoldLine(root.root, root.mean)');
    expect(daily).toContain('wordYesLine(beat.word, beat.split)');
    expect(daily).toContain("beat.kind === 'word' && beat.word");
    expect(daily).toContain('learnNextAction');
    expect(daily).toContain('learnedToday');
    expect(daily).toContain('dailyHoldKeepGoingLine');
  });

  it('lands returning Home on Daily mid-run so the next-root scene is first', () => {
    expect(home).toContain('isDailyResumeItem');
    expect(home).toContain('dailyResume: dailyResumeQi != null');
    expect(home).toContain('isResumeTier(selected)');
    expect(home).toContain('isDailyResumeItem(selected)');
    expect(home).toContain("learnHero && selected.kind === 'mode' && selected.key === 'rush'");
    expect(menu).toContain('opts.dailyResume');
    expect(menu).toContain("it.key === 'daily'");
    expect(menu).toContain('isDailyResumeItem');
    expect(detail).toContain('heroCta: Boolean(dailyResume != null && !extra.dailyDone)');
    expect(detail).toContain('continueDailyLabel');
    expect(hydrate).toContain('resolveBootResume');
    expect(hydrate).toContain("setView('daily')");
    expect(home).toContain('liveDailyResumeQi');
  });

  it('keeps the next-question peek readable on a phone and a short screen', () => {
    const phone = mediaBlock(quiz, 'max-width: 560px');
    const short = mediaBlock(quiz, 'max-height: 720px');
    expect(phone).toMatch(/\.q-daily \.q-hold\s*\{[^}]*display:\s*flex/);
    expect(phone).toMatch(/\.q-daily \.q-fb\.q-next-peek\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.q-daily \.q-fb\.q-next-peek\.is-long\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.q-daily \.q-hold\s*\{[^}]*display:\s*flex/);
    expect(short).toMatch(/\.q-daily \.q-fb\.q-next-peek\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.q-daily \.q-fb\.q-next-peek\.is-long\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.q-daily \.q-hold\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-fb\.q-next-peek\s*\{[^}]*display:\s*none/);
    expect(phone).not.toMatch(/\.q-fb\.q-next-peek\.is-long\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.q-daily \.q-hold\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.q-fb\.q-next-peek\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.q-fb\.q-next-peek\.is-long\s*\{[^}]*display:\s*none/);
    expect(quiz).toMatch(/\.q-hold\s*\{/);
    expect(quiz).toMatch(/\.q-fb\.q-next-peek\s*\{[^}]*white-space:\s*normal/);
    expect(quiz).toMatch(/\.q-fb\.q-next-peek\.is-long\s*\{[^}]*white-space:\s*normal/);
  });

  it('names -graph, Photograph, and the pieces — a meaning beat stays on the root', () => {
    const photo = ROOTS.find((r) => r.root === 'Photo');
    const bio = ROOTS.find((r) => r.root === 'Bio');
    if (!photo || !bio) throw new Error('fixture: Photo / Bio');
    const graph = otherPartsForRoot(photo).find((part) => part.letters === '-graph');
    const photograph = photo.words.find((w) => w.w === 'Photograph');
    const biology = bio.words.find((w) => w.w === 'Biology');
    if (!graph || !photograph || !biology) throw new Error('fixture: -graph / Photograph / Biology');
    const gloss = quizGloss(photograph.d);
    if (!gloss) throw new Error('fixture: Photograph gloss');

    const piece = dailyNextPeekFace(photo, {
      kind: 'part',
      part: graph.letters,
      word: graph.word,
    });
    expect(dailyHoldNextLine(piece.name, piece.mean)).toBe('Next · -graph · in Photograph');
    expect(piece.mean).not.toBe(graph.mean);
    expect(piece.mean).not.toContain(photo.mean);

    const word = dailyNextPeekFace(photo, { kind: 'gloss', word: photograph.w });
    expect(dailyHoldNextLine(word.name, word.mean)).toBe('Next · Photograph · from Photo');
    expect(word.mean).not.toBe(gloss);
    expect(word.mean).not.toContain(photo.mean);

    const pieces = dailyNextPeekFace(bio, { kind: 'build', split: biology.b, word: biology.w });
    expect(pieces.name).toBe(buildBig(biology.b));
    expect(pieces.mean).toBeUndefined();
    expect(pieces.name.toLowerCase()).not.toBe(biology.w.toLowerCase());
    expect(dailyHoldNextLine(pieces.name, pieces.mean)).toBe(`Next · ${buildBig(biology.b)}`);

    expect(dailyNextPeekFace(photo, { kind: 'mean' })).toEqual({
      name: photo.root,
      mean: photo.mean,
    });
    expect(dailyNextPeekFace(photo, { kind: 'word', word: photograph.w })).toEqual({
      name: photo.root,
      mean: photo.mean,
    });
    expect(dailyNextPeekFace(photo, null)).toEqual({ name: photo.root, mean: photo.mean });
  });

  it('names every catalog question without printing the answer tile', () => {
    for (const root of ROOTS) {
      expect(dailyNextPeekFace(root, { kind: 'mean' })).toEqual({
        name: root.root,
        mean: root.mean,
      });
      expect(dailyNextPeekFace(root, null)).toEqual({ name: root.root, mean: root.mean });

      for (const part of otherPartsForRoot(root)) {
        const face = dailyNextPeekFace(root, {
          kind: 'part',
          part: part.letters,
          word: part.word,
        });
        expect(face.name, root.root).toBe(part.letters);
        expect(face.mean, root.root).toBe(`in ${part.word}`);
        expect(face.mean, root.root).not.toBe(part.mean);
      }

      for (const item of root.words) {
        const gloss = quizGloss(item.d);
        if (!gloss) continue;
        const face = dailyNextPeekFace(root, { kind: 'gloss', word: item.w });
        expect(face.name, `${root.root} ${item.w}`).toBe(item.w);
        expect(face.mean, item.w).toBe(`from ${root.root}`);
        expect(face.mean, item.w).not.toBe(gloss);
      }

      for (const pick of buildPicksForRoot(root)) {
        const face = dailyNextPeekFace(root, {
          kind: 'build',
          split: pick.split,
          word: pick.word,
        });
        expect(face.name, pick.word).toBe(buildBig(pick.split));
        expect(face.mean, pick.word).toBeUndefined();
        expect(face.name.toLowerCase(), pick.word).not.toBe(pick.word.toLowerCase());
      }
    }
    expect(ROOTS.length).toBe(183);
  });

  it('does not expand the catalog', () => {
    expect(ROOTS.length).toBe(183);
  });
});

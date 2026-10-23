import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { quizGloss } from '../core/wordDef';
import {
  buildQueuedStudyNext,
  studyHoldPeekLine,
  studyNextPeekLine,
  studyNextPeekLong,
  studyRecallToOpen,
} from '../core/studyNextPeek';
import { buildBig, buildPicksForRoot, otherPartsForRoot } from '../core/wordParts';
import { ROOTS, rootId } from '../data/roots';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const store = readFileSync(join(process.cwd(), 'src/app/store.ts'), 'utf8');
const app = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

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

describe('Study Yes names the question Next will open', () => {
  it('holds the named beat under Yes and opens that same beat', () => {
    expect(deck).toContain('queueUpcoming(dest)');
    expect(deck).toContain('studyHoldPeekLine(peekDest, queuedStudyRecall, peekRoot)');
    expect(deck).toContain('studyNextPeekLong(nextPeekLine)');
    expect(deck).toContain('ww-next-peek');
    expect(deck).toContain('afterYesNextLabel(');
    expect(deck).toContain('studyRecallToOpen(state.queuedStudyRecall, currentRootId)');
    expect(deck).toContain("deckEntry === 'recall'");
    const retry = deck.slice(deck.indexOf('function retryRecall'), deck.indexOf('function startRecall'));
    expect(retry).not.toContain('queueUpcoming');
    expect(retry).not.toContain('buildQueuedStudyNext');
    const effect = deck.slice(deck.indexOf('useLayoutEffect(() => {'), deck.indexOf('const root = currentRootId'));
    const openAt = effect.indexOf('studyRecallToOpen');
    const buildAt = effect.indexOf('buildRecall(');
    expect(openAt).toBeGreaterThan(-1);
    expect(buildAt).toBeGreaterThan(openAt);
    expect(effect).toContain('if (openedBeat)');
    expect(store).toContain('queuedStudyRecall: null');
    expect(store).toContain('setQueuedStudyRecall');
  });

  it('keeps one beat for Next — Home, Remember, and a mismatch stay quiet', () => {
    const bio = ROOTS.find((r) => r.root === 'Bio');
    const geo = ROOTS.find((r) => r.root === 'Geo');
    if (!bio || !geo) throw new Error('fixture: Bio / Geo');
    const geoId = rootId(geo);
    const dest = { kind: 'next' as const, id: geoId, line: 'Yes — Bio means life.' };
    const queued = buildQueuedStudyNext(dest, null, ROOTS, () => 0);
    if (!queued) throw new Error('fixture: queued Geo');
    expect(studyRecallToOpen(queued, geoId)).toBe(queued.beat);
    expect(studyHoldPeekLine(dest, queued, geo)).toBe(studyNextPeekLine(geo, queued.beat));
    expect(buildQueuedStudyNext(dest, queued, ROOTS, () => {
      throw new Error('rebuilt');
    })).toBe(queued);
    expect(buildQueuedStudyNext({ kind: 'home', line: 'Yes — Bio means life.' }, queued, ROOTS)).toBeNull();
    expect(studyHoldPeekLine({ kind: 'home', line: 'Yes — Bio means life.' }, queued, geo)).toBe('');
    expect(studyRecallToOpen(queued, rootId(bio))).toBeNull();
    expect(studyHoldPeekLine(dest, { rootId: rootId(bio), beat: queued.beat }, geo)).toBe('');
    expect(studyHoldPeekLine(dest, null, geo)).toBe('');
    expect(studyNextPeekLong('Next · Bio · life')).toBe(false);
    expect(studyNextPeekLong('Next · Photograph · from Photo')).toBe(true);
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

    const piece = studyNextPeekLine(photo, {
      kind: 'part',
      part: graph.letters,
      word: graph.word,
    });
    expect(piece).toBe('Next · -graph · in Photograph');
    expect(piece).not.toContain(graph.mean);
    expect(piece).not.toContain(photo.mean);

    const word = studyNextPeekLine(photo, { kind: 'gloss', word: photograph.w });
    expect(word).toBe('Next · Photograph · from Photo');
    expect(word).not.toContain(gloss);
    expect(word).not.toContain(photo.mean);

    const pieces = studyNextPeekLine(bio, { kind: 'build', split: biology.b, word: biology.w });
    expect(pieces).toBe(`Next · ${buildBig(biology.b)}`);
    expect(pieces.toLowerCase()).not.toContain(biology.w.toLowerCase());

    expect(studyNextPeekLine(photo, { kind: 'mean' })).toBe(`Next · ${photo.root} · ${photo.mean}`);
    expect(studyNextPeekLine(photo, { kind: 'word', word: photograph.w })).toBe(
      `Next · ${photo.root} · ${photo.mean}`,
    );
  });

  it('names every catalog question without printing the answer tile', () => {
    for (const root of ROOTS) {
      expect(studyNextPeekLine(root, { kind: 'mean' })).toBe(`Next · ${root.root} · ${root.mean}`);
      expect(studyNextPeekLine(root, { kind: 'word', word: root.words[0]?.w })).toBe(
        `Next · ${root.root} · ${root.mean}`,
      );

      for (const part of otherPartsForRoot(root)) {
        const line = studyNextPeekLine(root, {
          kind: 'part',
          part: part.letters,
          word: part.word,
        });
        expect(line, root.root).toBe(`Next · ${part.letters} · in ${part.word}`);
        expect(`in ${part.word}`, root.root).not.toBe(part.mean);
      }

      for (const item of root.words) {
        const gloss = quizGloss(item.d);
        if (!gloss) continue;
        const line = studyNextPeekLine(root, { kind: 'gloss', word: item.w });
        expect(line, `${root.root} ${item.w}`).toBe(`Next · ${item.w} · from ${root.root}`);
        expect(`from ${root.root}`, item.w).not.toBe(gloss);
      }

      for (const pick of buildPicksForRoot(root)) {
        const line = studyNextPeekLine(root, {
          kind: 'build',
          split: pick.split,
          word: pick.word,
        });
        expect(line, pick.word).toBe(`Next · ${buildBig(pick.split)}`);
        expect(buildBig(pick.split).toLowerCase(), pick.word).not.toBe(pick.word.toLowerCase());
      }
    }
    expect(ROOTS.length).toBe(183);
  });

  it('keeps the next-question line readable on a phone and a short screen', () => {
    const phone = mediaBlock(app, 'max-width: 820px');
    const short = mediaBlock(app, 'max-height: 720px');
    expect(phone).toMatch(/\.ww-recall-win p\.ww-next-peek\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-recall-win p\.ww-next-peek\.is-long\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.ww-recall-win p\.ww-next-peek\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.ww-recall-win p\.ww-next-peek\.is-long\s*\{[^}]*display:\s*block/);
    expect(phone).not.toMatch(/\.ww-next-peek\s*\{[^}]*display:\s*none/);
    expect(short).not.toMatch(/\.ww-next-peek\s*\{[^}]*display:\s*none/);
    expect(app).toMatch(/\.ww-recall-win p\.ww-next-peek\s*\{[^}]*white-space:\s*normal/);
    expect(app).toMatch(/\.ww-recall-win p\.ww-next-peek\.is-long\s*\{[^}]*white-space:\s*normal/);
  });
});

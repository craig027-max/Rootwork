import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS, TIERS, rootId } from '../data/roots';
import { afterHearNextTap, browseOpenForId } from './deckFlow';
import { resolveBootResume } from './daily';
import {
  INTRO_CONTINUE_LABEL,
  cardAnswerLesson,
  cardIntroCopy,
  cardIntroSurface,
  introContainsAnswer,
  introIsShowing,
  introVisibleText,
  originLanguage,
  rootAnswerLesson,
  rootIntroCopy,
  rootQuestionAnswers,
  wordAnswerLesson,
  wordIntroCopy,
  wordQuestionAnswers,
  type IntroQuestionKind,
} from './cardIntro';

const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
const rush = readFileSync(join(process.cwd(), 'src/ui/RootRush.tsx'), 'utf8');
const hydrate = readFileSync(join(process.cwd(), 'src/core/hydrate.ts'), 'utf8');
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

const bio = ROOTS.find((r) => r.root === 'Bio')!;
const geo = ROOTS.find((r) => r.root === 'Geo')!;
const photo = ROOTS.find((r) => r.root === 'Photo')!;
const sal = ROOTS.find((r) => r.root === 'Sal')!;
const mis = ROOTS.find((r) => r.root === 'Mis')!;
const tri = ROOTS.find((r) => r.root === 'Tri')!;
const oct = ROOTS.find((r) => r.root === 'Oct')!;
const salary = sal.words.find((w) => w.w === 'Salary')!;

describe('a new card gives context before the questions', () => {
  it('keeps the catalog and the on-card pronunciations', () => {
    expect(ROOTS.length).toBe(315);
    expect(bio.say).toBe('BY-oh');
    expect(geo.say).toBe('JEE-oh');
    expect(photo.say).toBe('FOH-toh');
    expect(sal.say).toBe('SAL');
  });

  it('says where a new root comes from, not what it means', () => {
    expect(originLanguage('Greek bíos')).toBe('Greek');
    expect(originLanguage('Old English mis-')).toBe('Old English');
    expect(originLanguage('Greek/Latin treis')).toBe('Greek and Latin');
    expect(originLanguage('Greek oktṓ · Latin octō')).toBe('Greek and Latin');
    expect(originLanguage(mis.org)).toBe('Old English');
    expect(originLanguage(tri.org)).toBe('Greek and Latin');
    expect(originLanguage(oct.org)).toBe('Greek and Latin');

    const life = rootIntroCopy(bio);
    expect(life.lines.join(' ')).toContain('Bio is from Greek');
    expect(life.lines.join(' ')).toContain('bíos');
    expect(life.lines.join(' ')).toContain('BY-oh');
    expect(life.continueLabel).toBe('Show the questions');
    expect(life.lines.join(' ')).not.toContain('life');
    expect(life.lines.join(' ')).not.toContain('Biology');
    expect(life.lines.join(' ')).not.toContain('<');

    const earth = rootIntroCopy(geo);
    expect(earth.lines[0]).toContain('Geo is from Greek');
    expect(earth.lines.join(' ')).not.toContain('earth');
    expect(earth.lines.join(' ')).toContain('JEE-oh');

    const light = rootIntroCopy(photo);
    expect(light.lines[0]).toContain('Photo is from Greek');
    expect(light.lines.join(' ')).not.toContain('light');
    expect(light.lines.join(' ')).toContain('FOH-toh');

    const salt = rootIntroCopy(sal);
    expect(salt.lines.join(' ')).toContain('Sal is from Latin');
    expect(salt.lines.join(' ')).toContain('SAL');
    expect(salt.lines.join(' ')).not.toContain('salt');
    expect(salt.lines.join(' ')).not.toContain('Salad');
  });

  it('introduces Salary from a Browse search without the meaning', () => {
    const copy = wordIntroCopy({
      word: 'Salary',
      def: salary.d,
      root: sal.root,
      say: sal.say,
      mean: sal.mean,
      org: sal.org,
    });
    expect(copy.lines.join(' ')).toContain('Salary is from Latin');
    expect(copy.lines.join(' ')).toContain('SAL');
    expect(copy.lines.join(' ')).not.toContain('pay for work');
    expect(copy.lines.join(' ')).not.toContain('salt');
    expect(copy.lines.join(' ')).not.toMatch(/Roman|pepper|bowl/);
    expect(copy.continueLabel).toBe(INTRO_CONTINUE_LABEL);
    expect(
      cardIntroCopy({
        entry: 'find',
        root: sal.root,
        say: sal.say,
        mean: sal.mean,
        org: sal.org,
        words: sal.words,
        word: 'Salary',
        def: salary.d,
      }).lines,
    ).toEqual(copy.lines);
    expect(browseOpenForId(rootId(sal), new Set(), 'Salary')).toEqual({
      id: 'sal',
      entry: 'find',
      focusWord: 'Salary',
    });
  });

  it('shows the intro on a new teach, find, or recall card — and not after the tap', () => {
    expect(introIsShowing({ entry: 'teach', learned: false, won: false, dismissed: false })).toBe(
      true,
    );
    expect(introIsShowing({ entry: 'find', learned: false, won: false, dismissed: false })).toBe(
      true,
    );
    expect(introIsShowing({ entry: 'recall', learned: false, won: false, dismissed: false })).toBe(
      true,
    );
    expect(introIsShowing({ entry: 'find', learned: false, won: false, dismissed: true })).toBe(
      false,
    );
    expect(introIsShowing({ entry: 'teach', learned: false, won: false, dismissed: true })).toBe(
      false,
    );
  });

  it('does not slow a learned root, Remember, a result chip, or a Yes remount', () => {
    expect(introIsShowing({ entry: 'teach', learned: true, won: false, dismissed: false })).toBe(
      false,
    );
    expect(introIsShowing({ entry: 'find', learned: true, won: false, dismissed: false })).toBe(
      false,
    );
    expect(introIsShowing({ entry: 'remember', learned: true, won: false, dismissed: false })).toBe(
      false,
    );
    expect(introIsShowing({ entry: 'remember', learned: false, won: false, dismissed: false })).toBe(
      false,
    );
    expect(introIsShowing({ entry: 'asked', learned: false, won: false, dismissed: false })).toBe(
      false,
    );
    expect(introIsShowing({ entry: 'find', learned: false, won: true, dismissed: false })).toBe(
      false,
    );
    expect(introIsShowing({ entry: 'teach', learned: true, won: true, dismissed: false })).toBe(
      false,
    );
    expect(browseOpenForId(rootId(sal), new Set([rootId(sal)]), 'Salary')?.entry).toBe('find');
    expect(browseOpenForId(rootId(bio), new Set([rootId(bio)]))?.entry).toBe('remember');
  });

  it('keeps Daily, Root Rush, and boot resume off a half-open intro', () => {
    expect(daily).not.toContain('ww-intro');
    expect(daily).not.toContain('Show the questions');
    expect(daily).not.toContain('introIsShowing');
    expect(rush).not.toContain('ww-intro');
    expect(rush).not.toContain('Show the questions');
    expect(rush).not.toContain('introIsShowing');

    const learn = resolveBootResume({ nextRootId: 'sal', dailyTotal: 5 });
    expect(learn).toEqual({ kind: 'learn', rootId: 'sal' });
    expect(introIsShowing({ entry: 'teach', learned: false, won: false, dismissed: false })).toBe(
      true,
    );
    const remember = resolveBootResume({
      nextRootId: 'sal',
      rememberMissId: 'geo',
      dailyDone: true,
      learnedToday: true,
      dailyTotal: 5,
    });
    expect(remember.kind).toBe('remember');
    expect(introIsShowing({ entry: 'remember', learned: true, won: false, dismissed: false })).toBe(
      false,
    );
    expect(
      resolveBootResume({ dailyResumeQi: 2, dailyTotal: 5, nextRootId: 'sal' }).kind,
    ).toBe('daily');
    expect(hydrate).toContain('openRoot(boot.rootId)');
    expect(hydrate).toContain("openRoot(boot.rootId, { entry: 'remember' })");
    expect(hydrate).not.toContain('introIsShowing');
  });

  it('hides Next and Rush while the intro is the one tap', () => {
    expect(
      afterHearNextTap({ nextPlay: false, hearFinished: false, entry: 'teach', won: false, intro: true }),
    ).toEqual({ showRush: false, showNextRoot: false });
    expect(
      afterHearNextTap({ nextPlay: false, hearFinished: false, entry: 'teach', won: false }),
    ).toEqual({ showRush: true, showNextRoot: true });
  });

  it('keeps every root intro to two short lines that do not state the meaning', () => {
    for (const root of ROOTS) {
      const copy = rootIntroCopy(root);
      expect(copy.lines.length, root.root).toBeGreaterThanOrEqual(1);
      expect(copy.lines.length, root.root).toBeLessThanOrEqual(2);
      expect(copy.continueLabel).toBe('Show the questions');
      expect(introContainsAnswer(copy.lines.join(' '), root.mean), root.root).toBe(false);
      expect(copy.lines.join(' ')).not.toContain('<');
      expect(copy.lines.join(' ')).not.toContain(root.lead);
      for (const line of copy.lines) expect(line.endsWith('.'), line).toBe(true);
      const word = root.words[0];
      if (!word) continue;
      const found = wordIntroCopy({
        word: word.w,
        def: word.d,
        root: root.root,
        say: root.say,
        mean: root.mean,
        org: root.org,
      });
      expect(found.lines.length, word.w).toBeLessThanOrEqual(2);
      expect(found.lines.join(' ')).not.toContain('<');
      const gloss = found.lines.join(' ');
      expect(introContainsAnswer(gloss, root.mean), word.w).toBe(false);
    }
  });

  it('teaches the meaning, the origin, and an example after the answer', () => {
    expect(rootAnswerLesson(bio)).toBe('Bio means life. It comes from Greek. Like Biology.');
    expect(rootAnswerLesson(sal)).toBe('Sal means salt. It comes from Latin. Like Salad.');
    expect(
      wordAnswerLesson({
        word: 'Salary',
        def: salary.d,
        root: sal.root,
        mean: sal.mean,
        org: sal.org,
      }),
    ).toBe('Salary means pay for work. It comes from Latin, from Sal — salt.');
    expect(
      cardAnswerLesson({
        entry: 'find',
        root: sal.root,
        mean: sal.mean,
        org: sal.org,
        words: sal.words,
        word: 'Salary',
        def: salary.d,
      }),
    ).toContain('pay for work');
    for (const root of ROOTS) {
      const lesson = rootAnswerLesson(root);
      expect(lesson.toLowerCase(), root.root).toContain(root.mean.toLowerCase());
      const lang = originLanguage(root.org);
      if (lang) expect(lesson, root.root).toContain(lang);
      const example = root.words.map((word) => word.w).find((word) => word.toLowerCase() !== root.root.toLowerCase());
      if (example) expect(lesson, root.root).toContain(example);
      for (const word of root.words) {
        const told = wordAnswerLesson({
          word: word.w,
          def: word.d,
          root: root.root,
          mean: root.mean,
          org: root.org,
        });
        expect(told.toLowerCase(), word.w).toContain(word.w.toLowerCase());
        if (lang) expect(told, word.w).toContain(lang);
        expect(told.toLowerCase(), word.w).toContain(root.mean.toLowerCase());
      }
    }
  });

  it('fails when any intro the kid can read contains an answer on that card', () => {
    expect(introContainsAnswer('Bio means life.', 'life')).toBe(true);
    expect(introContainsAnswer('Like Inflame.', 'flame')).toBe(true);
    expect(introContainsAnswer('Like Autograph.', 'graph')).toBe(true);
    expect(introContainsAnswer('AIR-oh', 'air')).toBe(true);
    expect(introContainsAnswer('Say it PYRE.', 'Pyre')).toBe(true);
    expect(introContainsAnswer('from Latin minor', 'Minor')).toBe(true);
    expect(introContainsAnswer('It comes from Greek.', 'come')).toBe(true);
    expect(introContainsAnswer('← All roots', 'all')).toBe(true);
    expect(introContainsAnswer('longer words', 'word')).toBe(true);
    expect(introContainsAnswer('Tier 2 · Builder', 'build')).toBe(true);
    expect(introContainsAnswer('Latin sāl', 'salt')).toBe(false);
    expect(introContainsAnswer('Latin fortis', 'Fort')).toBe(false);
    expect(introContainsAnswer('It is from Greek.', 'come')).toBe(false);
    expect(introContainsAnswer('Salary is from Latin.', 'pay for work')).toBe(false);

    const seen = new Set<IntroQuestionKind>();
    for (const root of ROOTS) {
      const surface = cardIntroSurface({
        entry: 'teach',
        root: root.root,
        say: root.say,
        mean: root.mean,
        org: root.org,
        words: root.words,
        tier: root.t,
        tierName: TIERS[root.t - 1]?.n ?? '',
        position: 1,
        total: ROOTS.length,
      });
      const visible = introVisibleText(surface);
      const questions = rootQuestionAnswers(root);
      expect(questions.some((question) => question.kind === 'mean'), root.root).toBe(true);
      for (const question of questions) {
        seen.add(question.kind);
        expect(
          introContainsAnswer(visible, question.answer),
          `${root.root} ${question.kind} tests ${question.tests}: “${question.answer}” in “${visible}”`,
        ).toBe(false);
      }
      for (const word of root.words) {
        const wordSurface = cardIntroSurface({
          entry: 'find',
          root: root.root,
          say: root.say,
          mean: root.mean,
          org: root.org,
          words: root.words,
          word: word.w,
          def: word.d,
          tier: root.t,
          tierName: TIERS[root.t - 1]?.n ?? '',
          position: 1,
          total: ROOTS.length,
        });
        const wordVisible = introVisibleText(wordSurface);
        for (const question of wordQuestionAnswers(word.w, word.d)) {
          seen.add(question.kind);
          expect(
            introContainsAnswer(wordVisible, question.answer),
            `${word.w} ${question.kind} tests ${question.tests}: “${question.answer}” in “${wordVisible}”`,
          ).toBe(false);
        }
        expect(
          introContainsAnswer(wordVisible, root.mean),
          `${word.w} states ${root.mean}`,
        ).toBe(false);
      }
    }
    expect([...seen].sort()).toEqual(['build', 'gloss', 'mean', 'part', 'word', 'word-mean']);
    const rush = readFileSync(join(process.cwd(), 'src/core/rush.ts'), 'utf8');
    expect(rush).toContain("export type RushQuestionType = 'mean' | 'root' | 'word' | 'gloss' | 'part' | 'build'");
    const recall = readFileSync(join(process.cwd(), 'src/core/recall.ts'), 'utf8');
    expect(recall).toContain("export type RecallKind = 'mean' | 'word' | 'gloss' | 'part' | 'build'");
    expect(recall).not.toContain('fill-in');
    expect(rush).not.toContain('fill-in');
  });

  it('wires the card so the intro is first and the question waits for the tap', () => {
    expect(deck).toContain('introIsShowing');
    expect(deck).toContain('className="ww-intro"');
    expect(deck).toContain('className="ww-intro-go"');
    expect(deck).toContain('{INTRO_CONTINUE_LABEL}');
    expect(deck).toContain('!introducing && quizRecall');
    expect(deck).toContain('!introducing && examples');
    expect(deck).toContain("studying && !quizHero");
    expect(deck).toContain('onClick={startRecall}');
    expect(deck).toContain('I know this ✓');
    const cont = deck.slice(deck.indexOf('function continueFromIntro'), deck.indexOf('function startRecall'));
    expect(cont).toContain('isRecallEntry(deckEntry)');
    expect(cont).toContain('setIntroDismissed(true)');
    expect(cont).toContain('startRecall()');
    expect(cont).not.toContain('buildRecall');
    expect(cont).not.toContain('buildWordRecall');
    const recallBranch = cont.slice(cont.indexOf('isRecallEntry'), cont.indexOf('startRecall()'));
    expect(recallBranch).toContain('return');
    expect(recallBranch).not.toContain('startRecall');
  });

  it('keeps the intro and the continue tap readable on a phone', () => {
    expect(css).toMatch(/\.ww-intro\s*\{[^}]*display:\s*block/);
    expect(css).toMatch(/\.ww-card-actions \.btn\.ww-intro-go\s*\{[^}]*min-height:\s*56px/);
    expect(css).toMatch(/\.ww-card-actions \.btn\.ww-intro-go\s*\{[^}]*width:\s*100%/);
    const phone = mediaBlock(css, 'max-width: 400px');
    expect(phone).toMatch(/\.ww-intro,\s*\.ww-intro p\s*\{[^}]*display:\s*block/);
    expect(phone).toMatch(/\.ww-card-actions \.btn\.ww-intro-go\s*\{[^}]*min-height:\s*56px/);
    expect(phone).toMatch(/\.ww-card-actions \.btn\.ww-intro-go\s*\{[^}]*width:\s*100%/);
    expect(phone).not.toMatch(/\.ww-intro[^{]*\{[^}]*display:\s*none/);
    const short = mediaBlock(css, 'max-height: 720px');
    expect(short).toMatch(/\.ww-intro,\s*\n\s*\.ww-intro p\s*\{[^}]*display:\s*block/);
    expect(short).toMatch(/\.ww-card-actions \.btn\.ww-intro-go\s*\{[^}]*min-height:\s*56px/);
    expect(short).not.toMatch(/\.ww-intro\s*\{[^}]*display:\s*none/);
    const stacked = mediaBlock(css, 'max-width: 820px');
    expect(stacked).toMatch(/\.ww-card2\.is-intro \.ww-scene2\s*\{[^}]*min-height:\s*96px/);
    expect(stacked).toMatch(/\.ww-intro,\s*\.ww-intro p\s*\{[^}]*display:\s*block/);
  });
});

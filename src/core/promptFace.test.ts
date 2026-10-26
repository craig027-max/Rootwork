import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOTS } from '../data/roots';
import { mulberry32 } from './daily';
import {
  meaningAsName,
  meaningPrompt,
  promptReadsAnswer,
  spellsChoice,
  whichWordPrompt,
} from './promptFace';
import { buildRecall } from './recall';
import { buildRushQuestion } from './rush';

const fort = ROOTS.find((r) => r.root === 'Fort')!;
const macro = ROOTS.find((r) => r.root === 'Macro')!;
const zoo = ROOTS.find((r) => r.root === 'Zoo')!;
const pyr = ROOTS.find((r) => r.root === 'Pyr')!;
const min = ROOTS.find((r) => r.root === 'Min')!;
const aero = ROOTS.find((r) => r.root === 'Aero')!;
const bio = ROOTS.find((r) => r.root === 'Bio')!;
const equ = ROOTS.find((r) => r.root === 'Equ')!;

describe('spellsChoice', () => {
  it('matches a whole word and ignores a longer spelling', () => {
    expect(spellsChoice('AIR-oh', 'air')).toBe(true);
    expect(spellsChoice('air oh', 'air')).toBe(true);
    expect(spellsChoice('Latin minor', 'Minor')).toBe(true);
    expect(spellsChoice('FORT', 'Fort')).toBe(true);
    expect(spellsChoice('PYRE', 'Pyre')).toBe(true);
    expect(spellsChoice('Fort', 'Fortress')).toBe(false);
    expect(spellsChoice('Latin solvere', 'Solve')).toBe(false);
    expect(spellsChoice('YOO-nee', 'one')).toBe(false);
    expect(spellsChoice('Greek aēr', 'air')).toBe(false);
    expect(spellsChoice('Bio', 'Biology')).toBe(false);
  });
});

describe('whichWordPrompt', () => {
  it('keeps Bio over Biology and drops means “equal” over Equal', () => {
    const biology = whichWordPrompt(bio, 'Biology');
    expect(biology.big).toBe('Bio');
    expect(biology.say).toBe(bio.say);
    expect(biology.hint).toBe('means “life”');
    expect(biology.origin).toBe(`from ${bio.org}`);
    expect(biology.namedByMeaning).toBe(false);
    expect(promptReadsAnswer([biology.big, biology.say, biology.hint, biology.origin], 'Biology')).toBe(
      false,
    );

    const equal = whichWordPrompt(equ, 'Equal');
    expect(equal.big).toBe('Equ');
    expect(equal.hint).toBeUndefined();
    expect(promptReadsAnswer([equal.big, equal.say, equal.hint, equal.origin], 'Equal')).toBe(false);

    const equator = whichWordPrompt(equ, 'Equator');
    expect(equator.hint).toBe('means “equal”');
    expect(promptReadsAnswer([equator.big, equator.say, equator.hint, equator.origin], 'Equator')).toBe(
      false,
    );
  });

  it('does not print Fort, Macro, or Zoo over that same tile', () => {
    for (const root of [fort, macro, zoo]) {
      const face = whichWordPrompt(root, root.root);
      expect(face.namedByMeaning, root.root).toBe(true);
      expect(face.big, root.root).toBe(meaningAsName(root.mean));
      expect(promptReadsAnswer([face.big, face.say, face.hint, face.origin], root.root), root.root).toBe(
        false,
      );
    }
    expect(whichWordPrompt(fort, 'Fort').say).toBeUndefined();
    expect(whichWordPrompt(fort, 'Fort').hint).toBe('strength');
    expect(whichWordPrompt(macro, 'Macro').say).toBe('MAK-roh');
    expect(whichWordPrompt(zoo, 'Zoo').say).toBe('ZOH-oh');
    expect(whichWordPrompt(fort, 'Fortress').big).toBe('Fort');
    expect(whichWordPrompt(fort, 'Fortress').say).toBe('FORT');
  });

  it('drops PYRE over Pyre and Latin minor over Minor', () => {
    const pyre = whichWordPrompt(pyr, 'Pyre');
    expect(pyre.big).toBe('Pyr');
    expect(pyre.say).toBeUndefined();
    expect(pyre.hint).toBe('means “fire”');
    expect(pyre.origin).toBe(`from ${pyr.org}`);
    expect(promptReadsAnswer([pyre.big, pyre.say, pyre.hint, pyre.origin], 'Pyre')).toBe(false);

    const minor = whichWordPrompt(min, 'Minor');
    expect(minor.big).toBe('Min');
    expect(minor.say).toBe('MIN');
    expect(minor.origin).toBeUndefined();
    expect(minor.hint).toBe('means “small”');
    expect(promptReadsAnswer([minor.big, minor.say, minor.hint, minor.origin], 'Minor')).toBe(false);
  });

  it('keeps every catalog which-word prompt off the tile', () => {
    for (const root of ROOTS) {
      for (const word of root.words) {
        const face = whichWordPrompt(root, word.w);
        expect(
          promptReadsAnswer([face.big, face.say, face.hint, face.origin], word.w),
          `${root.root} ${word.w} ${face.big} ${face.say ?? ''} ${face.hint ?? ''} ${face.origin ?? ''}`,
        ).toBe(false);
      }
    }
  });
});

describe('meaningPrompt', () => {
  it('drops AIR-oh and keeps Aero and the Greek origin', () => {
    const face = meaningPrompt(aero);
    expect(face.say).toBeUndefined();
    expect(face.origin).toBe(`from ${aero.org}`);
    expect(promptReadsAnswer([aero.root, face.say, face.origin], 'air')).toBe(false);

    const life = meaningPrompt(bio);
    expect(life.say).toBe('BY-oh');
    expect(life.origin).toBe(`from ${bio.org}`);
  });

  it('keeps every catalog meaning prompt off the tile', () => {
    for (const root of ROOTS) {
      const face = meaningPrompt(root);
      expect(
        promptReadsAnswer([face.say, face.origin], root.mean),
        `${root.root} ${face.say ?? ''} ${face.origin ?? ''}`,
      ).toBe(false);
      expect(spellsChoice(root.root, root.mean), root.root).toBe(false);
    }
  });
});

describe('dealt questions leave the tile off the prompt', () => {
  it('does not deal Fort, Macro, or Zoo as the which-word tile when another word exists', () => {
    for (const root of [fort, macro, zoo]) {
      for (let seed = 0; seed < 12; seed++) {
        const rush = buildRushQuestion({
          root,
          scoped: ROOTS,
          all: ROOTS,
          type: 'word',
          rng: mulberry32(seed + 3),
        });
        const recall = buildRecall({
          root,
          pool: ROOTS,
          kind: 'word',
          rng: mulberry32(seed + 9),
          choices: 3,
        });
        expect(rush.word, root.root).not.toBe(root.root);
        expect(rush.big, root.root).toBe(root.root);
        expect(recall.word, root.root).not.toBe(root.root);
        const tile = rush.opts.find((o) => o.ok)?.label ?? '';
        expect(promptReadsAnswer([rush.ask, rush.big, rush.say, rush.sub], tile), `${root.root} ${tile}`).toBe(
          false,
        );
      }
    }
  });

  it('asks Pyre without PYRE and air without AIR-oh', () => {
    for (let seed = 0; seed < 16; seed++) {
      const pyre = buildRushQuestion({
        root: pyr,
        scoped: ROOTS,
        all: ROOTS,
        type: 'word',
        rng: mulberry32(seed + 4),
      });
      if (pyre.word === 'Pyre') {
        expect(pyre.big).toBe('Pyr');
        expect(pyre.say).toBeUndefined();
        expect(pyre.sub).toBe('means “fire”');
      }
      const tile = pyre.opts.find((o) => o.ok)?.label ?? '';
      expect(promptReadsAnswer([pyre.ask, pyre.big, pyre.say, pyre.sub], tile)).toBe(false);
    }
    const air = buildRushQuestion({
      root: aero,
      scoped: ROOTS,
      all: ROOTS,
      type: 'mean',
      rng: mulberry32(2),
    });
    expect(air.big).toBe('Aero');
    expect(air.say).toBeUndefined();
    expect(air.sub).toBe(`from ${aero.org}`);
    expect(promptReadsAnswer([air.ask, air.big, air.say, air.sub], 'air')).toBe(false);
  });

  it('wires Daily and the study card to the same face', () => {
    const daily = readFileSync(join(process.cwd(), 'src/ui/DailyChallenge.tsx'), 'utf8');
    const deck = readFileSync(join(process.cwd(), 'src/ui/Deck.tsx'), 'utf8');
    expect(daily).toContain('whichWordPrompt');
    expect(daily).toContain('meaningPrompt');
    expect(daily).not.toContain('<div className="q-say">{root.say}</div>');
    expect(deck).toContain('whichWordPrompt');
    expect(deck).toContain('meaningPrompt');
    expect(deck).toContain("{root.say} &nbsp;·&nbsp; <span className=\"origin\">from {root.org}</span>");
    expect(deck).toContain('answer: finding ? undefined : quizAnswer');
  });
});

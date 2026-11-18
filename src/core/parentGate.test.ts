import { describe, expect, it } from 'vitest';
import {
  PARENT_GATE_MS,
  grownupSumPrompt,
  isGrownupArea,
  makeGrownupSum,
  needsParentGate,
  parentGateFresh,
} from './parentGate';

describe('parent gate window', () => {
  const start = 1_700_000_000_000;

  it('is closed until a pass, and stays open only for a few minutes', () => {
    expect(parentGateFresh(null, start)).toBe(false);
    expect(parentGateFresh(start, start)).toBe(true);
    expect(parentGateFresh(start, start + PARENT_GATE_MS - 1)).toBe(true);
    expect(parentGateFresh(start, start + PARENT_GATE_MS)).toBe(false);
    expect(parentGateFresh(start, start - 1)).toBe(false);
  });

  it('puts account and purchase screens behind the gate, and keeps legal URLs public', () => {
    expect(needsParentGate('grownups')).toBe(true);
    expect(needsParentGate('auth')).toBe(true);
    expect(needsParentGate('consent')).toBe(true);
    expect(needsParentGate('paywall')).toBe(true);
    expect(needsParentGate('dashboard')).toBe(true);
    expect(needsParentGate('privacy')).toBe(false);
    expect(needsParentGate('terms')).toBe(false);
    expect(needsParentGate('refunds')).toBe(false);
    expect(needsParentGate('home')).toBe(false);
    expect(needsParentGate('deck')).toBe(false);
    expect(needsParentGate('quiz')).toBe(false);
    expect(needsParentGate('daily')).toBe(false);
  });

  it('treats legal pages as the grown-up area so leaving them for home resets the gate', () => {
    expect(isGrownupArea('privacy')).toBe(true);
    expect(isGrownupArea('terms')).toBe(true);
    expect(isGrownupArea('refunds')).toBe(true);
    expect(isGrownupArea('paywall')).toBe(true);
    expect(isGrownupArea('home')).toBe(false);
    expect(isGrownupArea('deck')).toBe(false);
  });
});

describe('grown-up sum', () => {
  it('asks a two-digit addition a young child does not pass quickly', () => {
    const samples = [0, 0.1, 0.5, 0.99, 1].map((n, i) => makeGrownupSum(() => (i === 0 ? n : n)));
    for (const sum of [0, 0.25, 0.5, 0.99].map((n) => makeGrownupSum(() => n))) {
      expect(sum.a).toBeGreaterThanOrEqual(12);
      expect(sum.a).toBeLessThanOrEqual(49);
      expect(sum.b).toBeGreaterThanOrEqual(13);
      expect(sum.b).toBeLessThanOrEqual(49);
      expect(sum.answer).toBe(sum.a + sum.b);
      expect(grownupSumPrompt(sum)).toBe(`What is ${sum.a} + ${sum.b}?`);
    }
    expect(samples[0]?.a).not.toBe(samples[2]?.a);
  });

  it('changes the sum when the random source changes', () => {
    let n = 0;
    const first = makeGrownupSum(() => {
      n += 0.17;
      return n;
    });
    const second = makeGrownupSum(() => {
      n += 0.19;
      return n;
    });
    expect(`${first.a}+${first.b}`).not.toBe(`${second.a}+${second.b}`);
  });
});

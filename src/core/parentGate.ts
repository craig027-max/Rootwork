import type { AppView } from '../app/store';

/**
 * How long a passed parent gate stays open. It covers one grown-up errand
 * (sign in, look at a plan, start checkout) and then locks again.
 */
export const PARENT_GATE_MS = 3 * 60 * 1000;

/** Account, plan, purchase, and the legal pages a parent opens from there. */
const GROWNUP_VIEWS: ReadonlySet<AppView> = new Set([
  'grownups',
  'auth',
  'consent',
  'paywall',
  'dashboard',
  'privacy',
  'terms',
]);

/**
 * Screens that must not render until the gate is passed. Privacy and Terms
 * stay publicly reachable at /privacy and /terms (Stripe, email, store
 * listings). In the app they are linked only from the grown-up area.
 */
const GATED_VIEWS: ReadonlySet<AppView> = new Set([
  'grownups',
  'auth',
  'consent',
  'paywall',
  'dashboard',
]);

export function isGrownupArea(view: AppView): boolean {
  return GROWNUP_VIEWS.has(view);
}

export function needsParentGate(view: AppView): boolean {
  return GATED_VIEWS.has(view);
}

/** True only inside the short window after a correct answer. */
export function parentGateFresh(passedAt: number | null, now: number): boolean {
  if (passedAt == null || !Number.isFinite(passedAt) || !Number.isFinite(now)) return false;
  const age = now - passedAt;
  return age >= 0 && age < PARENT_GATE_MS;
}

export interface GrownupSum {
  a: number;
  b: number;
  answer: number;
}

/**
 * Two-digit addition. A young child does not pass it quickly; an adult does.
 * A typed answer (not a hold, not a multiple-choice tap) works with a keyboard,
 * a switch, and a screen reader, and a miss swaps in a new sum so guessing
 * does not walk through.
 */
export function makeGrownupSum(rng: () => number = Math.random): GrownupSum {
  const a = roll(rng, 12, 38);
  const b = roll(rng, 13, 37);
  return { a, b, answer: a + b };
}

export function grownupSumPrompt(sum: Pick<GrownupSum, 'a' | 'b'>): string {
  return `What is ${sum.a} + ${sum.b}?`;
}

/** 0–1 exclusive of 1, so the last integer in the span is reachable and not past it. */
function roll(rng: () => number, min: number, span: number): number {
  const raw = rng();
  const unit = raw >= 1 ? 0.999999 : raw <= 0 || !Number.isFinite(raw) ? 0 : raw;
  return min + Math.floor(unit * span);
}

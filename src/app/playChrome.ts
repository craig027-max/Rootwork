import type { AppView } from './store';

/**
 * Account and purchase controls stay off a card, Daily, and Root Rush.
 * A mis-tap while answering must not open sign-in, the parent dashboard,
 * or checkout. Home and the parent screens keep them.
 */
export function showAccountChrome(view: AppView): boolean {
  return view !== 'deck' && view !== 'quiz' && view !== 'daily';
}

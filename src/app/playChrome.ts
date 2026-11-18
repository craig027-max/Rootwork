import type { AppView } from './store';

/**
 * Account and purchase controls stay off every kid surface: Home, a card,
 * Daily, and Root Rush. A mis-tap while playing must not open sign-in, the
 * parent dashboard, or checkout. Those live on the grown-up screens, behind
 * the parent gate. Home only offers the quiet “For grown-ups” door.
 */
export function showAccountChrome(view: AppView): boolean {
  return (
    view === 'grownups' ||
    view === 'auth' ||
    view === 'consent' ||
    view === 'paywall' ||
    view === 'dashboard'
  );
}

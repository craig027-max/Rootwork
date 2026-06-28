import type { AuthStatus } from '../app/store';
import type { ProfileRole } from './supabase';

/**
 * The COPPA / App-Store entry gate — a pure decision for "which top-level view
 * should show?" in every gated state. This exists to make the PianoSurge App
 * Store rejection (a "Go Premium" button that dead-ended in an error for a gated
 * user) impossible to reproduce: every branch resolves to a real, graceful view,
 * never an error and never a dead-end.
 *
 * Pairs with a hard rule in the UI: the upgrade CTA is hidden/disabled whenever
 * the backend is unconfigured or the device is offline — but even if it is
 * somehow tapped, `intent: 'upgrade'` here still routes to a sane view.
 */
export type EntryView = 'loading' | 'home' | 'auth' | 'consent' | 'paywall';
export type EntryIntent = 'browse' | 'upgrade';

export interface EntryState {
  authStatus: AuthStatus;
  /** The profile role; null until parent onboarding assigns it. */
  role: ProfileRole | null;
  /** When VPC consent was recorded; null = not yet consented. */
  consentAt: string | null;
  /** Whether the user GENUINELY has an active entitlement (not the display gate). */
  entitled: boolean;
  /** Whether the device is offline (navigator.onLine === false). */
  offline: boolean;
  /** 'browse' = boot / free use; 'upgrade' = the user tapped Go Premium. */
  intent: EntryIntent;
}

export function resolveEntryView(s: EntryState): EntryView {
  // Never flash a gate before the auth slice settles.
  if (s.authStatus === 'loading') return 'loading';

  // Browsing is always free: the Tier-1 sample works logged-out AND offline, so
  // a learner is never blocked at the door. This is the always-reachable path.
  if (s.intent === 'browse') return 'home';

  // --- intent: 'upgrade' (the "Go Premium" path) ---

  // Already entitled — there is nothing to buy; send them back to the content
  // instead of an empty paywall.
  if (s.entitled) return 'home';

  // Offline: a purchase needs the network. Show the paywall in its graceful
  // offline state (the CTA there is disabled) — never a broken checkout redirect.
  if (s.offline) return 'paywall';

  // The purchase IS the COPPA verifiable-parental-consent step, which must attach
  // to a durable account — an anonymous / signed-out visitor signs up first.
  if (s.authStatus !== 'authenticated') return 'auth';

  // Authenticated but parent onboarding / consent isn't complete → consent step,
  // not a paywall that would record a purchase against an unconsented account.
  if (s.role !== 'parent' || s.consentAt === null) return 'consent';

  // Authenticated, consented parent who simply hasn't bought → the paywall.
  return 'paywall';
}

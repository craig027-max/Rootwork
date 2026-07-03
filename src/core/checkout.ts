import { supabase } from './supabase';
import { getEntitlement, isEntitlementActive } from './entitlement';
import { getProfile } from './profile';
import { useWondralStore } from '../app/store';

export type CheckoutTier = 'single' | 'multi';

/**
 * Kick off Stripe Checkout for a tier. POSTs to the create-checkout-session
 * Pages Function with the parent's Supabase access token (the function derives
 * parent_id from it server-side), then hands the browser off to Stripe's hosted
 * page. On success the browser navigates away, so this never resolves with a
 * value; on failure it returns an error code for the caller to surface.
 */
export async function startCheckout(tier: CheckoutTier): Promise<{ error: string } | void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'account_required' };

  let res: Response;
  try {
    res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier }),
    });
  } catch {
    return { error: 'network' };
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    return { error: payload.error ?? `http_${res.status}` };
  }

  const { url } = (await res.json().catch(() => ({}))) as { url?: string };
  if (!url) return { error: 'no_url' };
  window.location.href = url; // hand off to Stripe Checkout
}

export type CheckoutReturn =
  | { status: 'cancel' }
  /** `unlocked` resolves true once the webhook-granted entitlement lands. */
  | { status: 'success'; unlocked: Promise<boolean> };

/**
 * Handle a return from Stripe Checkout (success_url / cancel_url carry
 * ?checkout=success|cancel). Strips the param so a refresh can't re-fire.
 * Returns SYNCHRONOUSLY so the UI can show "Payment received — unlocking…" the
 * instant the page loads; on success, `unlocked` carries the entitlement poll
 * (the webhook grants asynchronously, so it can lag the redirect by a beat).
 * null if this wasn't a checkout return.
 */
export function consumeCheckoutReturn(): CheckoutReturn | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const status = params.get('checkout');
  if (status !== 'success' && status !== 'cancel') return null;

  // Clear the param so a reload doesn't re-trigger this.
  params.delete('checkout');
  const qs = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));

  if (status === 'cancel') return { status: 'cancel' };
  return { status: 'success', unlocked: pollEntitlementUnlock() };
}

/**
 * Poll the parent's entitlement until it turns active (the webhook can outlast
 * the redirect), folding each fetch into the store. On unlock, also refetch the
 * profile — the webhook stamps consent + role there, and a stale profile would
 * re-prompt a parent who just paid through the consent gate. Resolves false if
 * the grant hasn't landed after ~9s; callers surface a "still processing" state
 * with a retry that calls this again — never a silent still-locked app.
 */
export async function pollEntitlementUnlock(attempts = 6): Promise<boolean> {
  const userId =
    useWondralStore.getState().authUser?.id ??
    (await supabase.auth.getUser()).data.user?.id ??
    null;
  if (!userId) return false;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await delay(1500);
    try {
      const ent = await getEntitlement(userId);
      if (ent) {
        useWondralStore.getState().setEntitlement(ent);
        if (isEntitlementActive(ent)) {
          try {
            useWondralStore.getState().setProfile(await getProfile(userId));
          } catch {
            // non-fatal — hydrate's auth listener will catch the profile up
          }
          return true;
        }
      }
    } catch {
      // transient — keep polling
    }
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

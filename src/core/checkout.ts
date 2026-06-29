import { supabase } from './supabase';
import { getEntitlement, isEntitlementActive } from './entitlement';
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

/**
 * Handle a return from Stripe Checkout (success_url / cancel_url carry
 * ?checkout=success|cancel). Strips the param so a refresh can't re-fire, and on
 * success polls the parent's entitlement — the webhook grants it asynchronously,
 * so it can lag the redirect by a beat — folding it into the store once active.
 * Returns the outcome for the caller to surface, or null if this wasn't a return.
 */
export async function consumeCheckoutReturn(): Promise<'success' | 'cancel' | null> {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const status = params.get('checkout');
  if (status !== 'success' && status !== 'cancel') return null;

  // Clear the param so a reload doesn't re-trigger this.
  params.delete('checkout');
  const qs = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));

  if (status === 'cancel') return 'cancel';

  const store = useWondralStore.getState();
  const userId = store.authUser?.id ?? (await supabase.auth.getUser()).data.user?.id ?? null;
  if (userId) {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const ent = await getEntitlement(userId);
        if (ent) {
          store.setEntitlement(ent);
          if (isEntitlementActive(ent)) break;
        }
      } catch {
        // transient — keep polling
      }
      await delay(1500);
    }
  }
  return 'success';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

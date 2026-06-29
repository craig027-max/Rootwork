import { supabase, hasSupabaseConfig, type Entitlement } from './supabase';
import type { AuthStatus } from '../app/store';

/**
 * Fetch the current parent's entitlement row, or null if they haven't purchased
 * (or the backend is unconfigured). RLS restricts the read to the parent's own
 * row; the row itself is written only by the Stripe webhook (service role), so a
 * client can read what it bought but can never self-grant.
 */
export async function getEntitlement(parentId: string): Promise<Entitlement | null> {
  if (!hasSupabaseConfig) return null;
  const { data, error } = await supabase
    .from('entitlements')
    .select('*')
    .eq('parent_id', parentId)
    .maybeSingle();
  if (error) throw error;
  return (data as Entitlement | null) ?? null;
}

/**
 * Whether an entitlement currently grants access: it must exist, be 'active',
 * and not be past its expiry. `nowMs` is injectable for deterministic tests.
 */
export function isEntitlementActive(
  ent: Entitlement | null,
  nowMs: number = Date.now(),
): boolean {
  if (!ent || ent.status !== 'active') return false;
  if (ent.expires_at && new Date(ent.expires_at).getTime() <= nowMs) return false;
  return true;
}

/**
 * Whether the gate should treat a user as entitled *for display*, which is
 * deliberately broader than `isEntitlementActive`: it also returns true while the
 * entitlement is still resolving for a signed-in user, so the paywall (💳) doesn't
 * flash on reload before the row loads. The order matters —
 *   - a genuinely active entitlement is entitled;
 *   - auth itself is still 'loading' → assume entitled until we know better;
 *   - authenticated but entitlement not yet fetched → assume entitled for the beat
 *     between hydrate and the entitlement fetch.
 * Anonymous / signed-out (loaded, no active entitlement) is NOT entitled.
 *
 * Pure so the reload-flash rule can be unit-tested.
 */
export function gateEntitled({
  active,
  authStatus,
  entitlementLoaded,
}: {
  active: boolean;
  authStatus: AuthStatus;
  entitlementLoaded: boolean;
}): boolean {
  return (
    active ||
    authStatus === 'loading' ||
    (authStatus === 'authenticated' && !entitlementLoaded)
  );
}

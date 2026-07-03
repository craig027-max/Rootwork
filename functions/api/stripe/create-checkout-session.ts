/// <reference types="@cloudflare/workers-types" />
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_SINGLE: string;
  STRIPE_PRICE_MULTI: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CHECKOUT_SUCCESS_PATH?: string;
  CHECKOUT_CANCEL_PATH?: string;
  APP_BASE_URL?: string;
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * POST /api/stripe/create-checkout-session
 *   Body: { tier: 'single' | 'multi' }
 *   Auth: Authorization: Bearer <supabase access token>
 *
 * Verifies the caller's Supabase JWT SERVER-SIDE and derives parent_id from it —
 * it never trusts a client-supplied id, so a user can only ever buy for their own
 * account. Refuses with 409 'already_entitled' if the parent already holds an
 * active entitlement (double-purchase guard). Otherwise mints a one-time
 * ('payment') Checkout Session for the chosen tier and stamps parent_id into both
 * the session metadata and client_reference_id so the webhook can grant the
 * entitlement to exactly this parent.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = (request.headers.get('Authorization') ?? '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  if (!token) return json({ error: 'unauthenticated' }, 401);

  // Service-role client: used here only to validate the caller's JWT via the auth
  // server (getUser checks the token regardless of which key the client holds).
  // Service role never leaves this function's env.
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json({ error: 'unauthenticated' }, 401);
  // The purchase IS the COPPA consent, and consent must attach to a durable
  // account — so an anonymous/free-play session must sign up first.
  if (user.is_anonymous) return json({ error: 'account_required' }, 403);

  // Double-purchase guard: a second tab or a stale paywall must not let a parent
  // pay twice. Any currently-active entitlement → 409 (the client maps it to a
  // friendly "already unlocked" state). An expired/refunded row may buy again.
  // Tier upgrades (single → multi mid-year) are deliberately not a thing yet —
  // when they are, this guard is where the exception goes.
  const { data: existing, error: entErr } = await supabase
    .from('entitlements')
    .select('status, expires_at')
    .eq('parent_id', user.id)
    .maybeSingle();
  if (entErr) {
    // Fail OPEN: blocking checkout on a flaky read would stop ALL purchases; the
    // worst case of proceeding is the pre-guard behavior (a duplicate charge,
    // which support can refund).
    console.error('[stripe] entitlement pre-check failed (proceeding)', entErr);
  } else if (
    existing &&
    existing.status === 'active' &&
    (!existing.expires_at || new Date(existing.expires_at).getTime() > Date.now())
  ) {
    return json({ error: 'already_entitled' }, 409);
  }

  let tier: 'single' | 'multi' = 'single';
  try {
    const body = (await request.json()) as { tier?: string } | null;
    if (body?.tier === 'multi') tier = 'multi';
  } catch {
    // empty / invalid body → default to single
  }

  const price = tier === 'multi' ? env.STRIPE_PRICE_MULTI : env.STRIPE_PRICE_SINGLE;
  if (!price) return json({ error: 'price_not_configured' }, 500);

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  // Build redirect URLs from the real serving origin (or a configured base), NOT
  // the client-supplied Origin header — a forged Origin could otherwise steer the
  // post-checkout redirect off-site.
  const origin = env.APP_BASE_URL ?? new URL(request.url).origin;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Card-only: keeps settlement synchronous so a session is never 'completed'
      // while still 'unpaid' (which would strand the buyer — no async grant path).
      payment_method_types: ['card'],
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      customer_creation: 'always',
      customer_email: user.email ?? undefined,
      metadata: { parent_id: user.id, tier },
      payment_intent_data: { metadata: { parent_id: user.id, tier } },
      success_url: `${origin}${env.CHECKOUT_SUCCESS_PATH ?? '/?checkout=success'}`,
      cancel_url: `${origin}${env.CHECKOUT_CANCEL_PATH ?? '/?checkout=cancel'}`,
    });
    return json({ url: session.url });
  } catch (err) {
    // Log detail server-side only; return a generic error so we don't leak price
    // ids / test-vs-live / account state to the caller.
    console.error('[stripe] checkout session create failed', err);
    return json({ error: 'stripe_error' }, 502);
  }
};

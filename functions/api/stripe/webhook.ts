/// <reference types="@cloudflare/workers-types" />
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// Student-seat cap per tier. Soft cap enforced by the dashboard's add-student
// flow; kept here so the webhook is the single source of the grant.
const SEATS: Record<'single' | 'multi', number> = { single: 1, multi: 10 };

/**
 * POST /api/stripe/webhook — Stripe checkout.session.completed handler.
 *
 * Verifies the Stripe signature with Web Crypto (Workers have no Node crypto, so
 * the async constructEventAsync + SubtleCryptoProvider is required), dedupes via
 * the stripe_events table, then — for a PAID session — grants the parent's
 * entitlement and records the charge as COPPA VPC evidence. Runs with the
 * Supabase SERVICE ROLE (bypasses RLS); this is the ONLY writer of entitlements
 * and the consent-evidence columns, which is why clients have no write policy.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const sig = request.headers.get('stripe-signature');
  if (!sig) return new Response('missing stripe-signature', { status: 400 });

  // Fail CLOSED on a misconfigured secret. Web Crypto's importKey accepts a
  // zero-length HMAC key (Node's would throw), so an empty/unset webhook secret
  // would otherwise let FORGED events verify against the (known) empty key —
  // turning a Cloudflare env typo into an auth bypass that mints entitlements.
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    return new Response('webhook secret not configured', { status: 500 });
  }

  // Read the RAW body exactly once: signature verification needs the unparsed
  // bytes, and re-reading a Workers request body throws.
  const raw = await request.text();

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    return new Response(`signature verification failed: ${(err as Error).message}`, {
      status: 400,
    });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Idempotency: claim the event id first. Stripe delivers at-least-once and
  // retries, so we can see the same event twice. A unique-violation (23505) means
  // we already handled it → ack 200 so Stripe stops retrying.
  const claim = await supabase
    .from('stripe_events')
    .insert({ event_id: event.id, type: event.type });
  if (claim.error) {
    if (claim.error.code === '23505') return new Response('duplicate', { status: 200 });
    return new Response(`event log error: ${claim.error.message}`, { status: 500 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const parentId = session.metadata?.parent_id ?? session.client_reference_id ?? null;
      const tier: 'single' | 'multi' = session.metadata?.tier === 'multi' ? 'multi' : 'single';
      const earned =
        session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required';
      if (parentId && earned) {
        await grantEntitlement(supabase, {
          parentId,
          tier,
          paymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          customerId: typeof session.customer === 'string' ? session.customer : null,
        });
      }
    }
  } catch (err) {
    // We claimed the event but processing failed. Release the claim so Stripe's
    // retry reprocesses (every write below is idempotent), then signal 500.
    await supabase.from('stripe_events').delete().eq('event_id', event.id);
    return new Response(`processing error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response('ok', { status: 200 });
};

async function grantEntitlement(
  supabase: SupabaseClient,
  args: {
    parentId: string;
    tier: 'single' | 'multi';
    paymentIntentId: string | null;
    customerId: string | null;
  },
): Promise<void> {
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1); // one-time annual model

  const ent = await supabase.from('entitlements').upsert(
    {
      parent_id: args.parentId,
      tier: args.tier,
      seats: SEATS[args.tier],
      status: 'active',
      source: 'stripe',
      stripe_customer_id: args.customerId,
      stripe_payment_intent_id: args.paymentIntentId,
      granted_at: now.toISOString(),
      expires_at: expires.toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: 'parent_id' },
  );
  if (ent.error) throw new Error(`entitlement upsert: ${ent.error.message}`);

  // VPC evidence on the profile. The Stripe charge is the strongest consent
  // record, so always stamp the method + charge ref...
  const evidence = await supabase
    .from('profiles')
    .update({ consent_method: 'stripe', vpc_payment_ref: args.paymentIntentId })
    .eq('id', args.parentId);
  if (evidence.error) throw new Error(`profile evidence: ${evidence.error.message}`);

  // ...but only set consent_at if it isn't already recorded, so we never clobber
  // an earlier (e.g. checkbox) consent timestamp.
  const firstConsent = await supabase
    .from('profiles')
    .update({ consent_at: now.toISOString() })
    .eq('id', args.parentId)
    .is('consent_at', null);
  if (firstConsent.error) throw new Error(`consent_at: ${firstConsent.error.message}`);

  // A paying user is definitively a parent — set the role if onboarding hadn't.
  const role = await supabase
    .from('profiles')
    .update({ role: 'parent' })
    .eq('id', args.parentId)
    .is('role', null);
  if (role.error) throw new Error(`role: ${role.error.message}`);
}

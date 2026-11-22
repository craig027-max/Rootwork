/// <reference types="@cloudflare/workers-types" />
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  receiptInsertFromPaidSession,
  type ReceiptInsert,
} from '../../../src/core/checkoutRecord';
import { SINGLE_SCHOLAR } from '../../../src/core/singleScholar';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * POST /api/stripe/webhook — Stripe event handler.
 *
 * Verifies the Stripe signature with Web Crypto (Workers have no Node crypto, so
 * the async constructEventAsync + SubtleCryptoProvider is required), dedupes via
 * the stripe_events table, then:
 *   - checkout.session.completed (PAID) → grants the parent's entitlement,
 *     stores one receipt row (amounts, card brand, last 4), and records the
 *     charge as COPPA VPC evidence;
 *   - charge.refunded (full refund) / charge.dispute.created → flips the
 *     entitlement to 'refunded' so access ends with the money.
 * The Stripe endpoint must be subscribed to all three event types (DEPLOYMENT.md).
 * Runs with the Supabase SERVICE ROLE (bypasses RLS); this is the ONLY writer of
 * entitlements and the consent-evidence columns, which is why clients have no
 * write policy.
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
      const earned =
        session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required';
      if (parentId && earned) {
        const now = new Date();
        const paymentIntentId = paymentIntentIdOf(session);
        // Build the receipt before granting. A paid session with the wrong
        // amount or no card throws, the claim is released, and Stripe retries.
        const receipt =
          session.payment_status === 'paid'
            ? await receiptForPaidSession(stripe, session, parentId, paymentIntentId)
            : null;
        await grantEntitlement(supabase, {
          parentId,
          paymentIntentId,
          customerId: typeof session.customer === 'string' ? session.customer : null,
          now,
        });
        if (receipt) await storeReceipt(supabase, receipt);
      }
    } else if (event.type === 'charge.refunded') {
      // Fires for partial refunds too; `charge.refunded` is only true once the
      // charge is FULLY refunded. A partial (goodwill) refund keeps access.
      const charge = event.data.object as Stripe.Charge;
      if (charge.refunded) {
        await revokeEntitlement(supabase, {
          paymentIntentId:
            typeof charge.payment_intent === 'string' ? charge.payment_intent : null,
          // Charges created from a PaymentIntent inherit its metadata (we stamp
          // parent_id via payment_intent_data) — fallback if the PI id is absent.
          parentId: charge.metadata?.parent_id ?? null,
        });
      }
    } else if (event.type === 'charge.dispute.created') {
      // A dispute freezes the funds immediately — revoke up front rather than
      // waiting for the outcome. If the parent wins the dispute, support can
      // re-grant manually (source='manual').
      const dispute = event.data.object as Stripe.Dispute;
      await revokeEntitlement(supabase, {
        paymentIntentId:
          typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null,
        parentId: null, // dispute metadata is Stripe's own, not our PI metadata
      });
    }
  } catch (err) {
    // We claimed the event but processing failed. Release the claim so Stripe's
    // retry reprocesses (every write below is idempotent), then signal 500.
    await supabase.from('stripe_events').delete().eq('event_id', event.id);
    return new Response(`processing error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response('ok', { status: 200 });
};

function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === 'string') return pi;
  if (pi && typeof pi === 'object') return pi.id;
  return null;
}

function cardFromPaymentIntent(pi: Stripe.PaymentIntent): { brand: string; last4: string } {
  const latest = pi.latest_charge;
  if (!latest || typeof latest === 'string') throw new Error('paid session has no charge');
  const card = latest.payment_method_details?.card;
  if (!card?.brand || !card.last4) throw new Error('paid session has no card');
  return { brand: card.brand, last4: card.last4 };
}

async function receiptForPaidSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  parentId: string,
  paymentIntentId: string | null,
): Promise<ReceiptInsert> {
  if (!session.id) throw new Error('paid session has no id');
  if (!paymentIntentId) throw new Error('paid session has no payment intent');
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });
  const card = cardFromPaymentIntent(pi);
  return receiptInsertFromPaidSession({
    parentId,
    sessionId: session.id,
    paymentIntentId,
    createdUnix: session.created,
    currency: session.currency,
    amountSubtotal: session.amount_subtotal,
    amountDiscount: session.total_details?.amount_discount ?? 0,
    amountTax: session.total_details?.amount_tax ?? 0,
    amountShipping: session.total_details?.amount_shipping ?? 0,
    amountTotal: session.amount_total,
    cardBrand: card.brand,
    cardLast4: card.last4,
  });
}

/**
 * Insert the receipt once. A unique conflict on this checkout session is the
 * retry of a write that already landed — ack it. A conflict that is not this
 * session (receipt-number collision) throws so Stripe retries.
 */
async function storeReceipt(supabase: SupabaseClient, row: ReceiptInsert): Promise<void> {
  const inserted = await supabase.from('receipts').insert(row);
  if (!inserted.error) return;
  if (inserted.error.code !== '23505') throw new Error(`receipt insert: ${inserted.error.message}`);
  const existing = await supabase
    .from('receipts')
    .select('checkout_session_id')
    .eq('checkout_session_id', row.checkout_session_id)
    .maybeSingle();
  if (existing.error) throw new Error(`receipt lookup: ${existing.error.message}`);
  if (existing.data) return;
  throw new Error('receipt number collision');
}

async function grantEntitlement(
  supabase: SupabaseClient,
  args: {
    parentId: string;
    paymentIntentId: string | null;
    customerId: string | null;
    now?: Date;
  },
): Promise<void> {
  const now = args.now ?? new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1); // one-time annual model

  const ent = await supabase.from('entitlements').upsert(
    {
      parent_id: args.parentId,
      tier: SINGLE_SCHOLAR.tier,
      seats: SINGLE_SCHOLAR.seats,
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

/**
 * Flip an entitlement to 'refunded' (used for full refunds AND disputes — the DB
 * status enum has no separate 'disputed'; either way the money is gone, so access
 * goes with it). Matches by stripe_payment_intent_id first: if the parent later
 * re-purchased, the row carries the NEW payment intent, so a refund of the OLD
 * charge correctly matches nothing. parent_id is the fallback when the event has
 * no usable PI reference. Idempotent — safe under Stripe's at-least-once retries.
 */
async function revokeEntitlement(
  supabase: SupabaseClient,
  args: { paymentIntentId: string | null; parentId: string | null },
): Promise<void> {
  const patch = { status: 'refunded', updated_at: new Date().toISOString() };

  if (args.paymentIntentId) {
    const byPi = await supabase
      .from('entitlements')
      .update(patch)
      .eq('stripe_payment_intent_id', args.paymentIntentId);
    if (byPi.error) throw new Error(`entitlement revoke (pi): ${byPi.error.message}`);
    return;
  }

  if (args.parentId) {
    // Only revoke a Stripe-granted row — never clobber a pep/manual grant.
    const byParent = await supabase
      .from('entitlements')
      .update(patch)
      .eq('parent_id', args.parentId)
      .eq('source', 'stripe');
    if (byParent.error) throw new Error(`entitlement revoke (parent): ${byParent.error.message}`);
    return;
  }

  // No usable reference — ack rather than 500: Stripe retries wouldn't add info.
  console.warn('[stripe] revoke event had no payment_intent or parent_id reference');
}

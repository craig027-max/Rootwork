import { describe, it, expect, vi, beforeEach } from 'vitest';

// The handler takes ({ request, env }) and is stub-testable: we mock the Stripe
// SDK (signature verification) and the Supabase client (a chainable recorder),
// then drive it with real Request objects — the same shape Pages hands it.

const { constructEventAsync, createClientMock } = vi.hoisted(() => ({
  constructEventAsync: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock('stripe', () => {
  class FakeStripe {
    webhooks = { constructEventAsync };
    static createFetchHttpClient = vi.fn(() => ({}));
    static createSubtleCryptoProvider = vi.fn(() => ({}));
  }
  return { default: FakeStripe };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import { onRequestPost } from './webhook';

// --- fake Supabase: a chainable query builder that records every call and is
// awaitable at any point in the chain (matches supabase-js's thenable builders).
type DbCall = { table: string; method: string; args: unknown[] };
type DbResult = { error: { code?: string; message: string } | null };

function makeDb(resultsByTable: Record<string, DbResult> = {}) {
  const calls: DbCall[] = [];
  function builder(table: string) {
    const chain: Record<string, unknown> = {};
    for (const m of ['insert', 'upsert', 'update', 'delete', 'eq', 'is', 'select']) {
      chain[m] = (...args: unknown[]) => {
        calls.push({ table, method: m, args });
        return chain;
      };
    }
    chain.then = (
      resolve: (v: DbResult) => unknown,
      reject: (e: unknown) => unknown,
    ) => Promise.resolve(resultsByTable[table] ?? { error: null }).then(resolve, reject);
    return chain;
  }
  return { client: { from: (table: string) => builder(table) }, calls };
}

const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_1',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function makeRequest(headers: Record<string, string> = { 'stripe-signature': 't=1,v1=sig' }) {
  return new Request('https://words.example/api/stripe/webhook', {
    method: 'POST',
    headers,
    body: '{}',
  });
}

function invoke(env = ENV, request = makeRequest()) {
  return onRequestPost({ request, env } as unknown as Parameters<typeof onRequestPost>[0]);
}

function stripeEvent(type: string, object: Record<string, unknown>, id = 'evt_1') {
  return { id, type, data: { object } };
}

function callsFor(calls: DbCall[], table: string) {
  return calls.filter((c) => c.table === table);
}

let db: ReturnType<typeof makeDb>;

beforeEach(() => {
  vi.clearAllMocks();
  db = makeDb();
  createClientMock.mockImplementation(() => db.client);
});

describe('webhook: request validation', () => {
  it('rejects a request with no stripe-signature header (400)', async () => {
    const res = await invoke(ENV, makeRequest({}));
    expect(res.status).toBe(400);
    expect(constructEventAsync).not.toHaveBeenCalled();
  });

  it('fails CLOSED (500) when the webhook secret is missing', async () => {
    const res = await invoke({ ...ENV, STRIPE_WEBHOOK_SECRET: '' });
    expect(res.status).toBe(500);
    expect(constructEventAsync).not.toHaveBeenCalled();
  });

  it('fails CLOSED (500) when the webhook secret is not a whsec_ value', async () => {
    const res = await invoke({ ...ENV, STRIPE_WEBHOOK_SECRET: 'not-a-secret' });
    expect(res.status).toBe(500);
    expect(constructEventAsync).not.toHaveBeenCalled();
  });

  it('rejects a bad signature (400) and never touches the database', async () => {
    constructEventAsync.mockRejectedValue(new Error('No signatures found'));
    const res = await invoke();
    expect(res.status).toBe(400);
    expect(db.calls).toHaveLength(0);
  });
});

describe('webhook: idempotency', () => {
  it('acks a duplicate event with 200 and does not reprocess', async () => {
    db = makeDb({ stripe_events: { error: { code: '23505', message: 'duplicate key' } } });
    createClientMock.mockImplementation(() => db.client);
    constructEventAsync.mockResolvedValue(
      stripeEvent('checkout.session.completed', { payment_status: 'paid' }),
    );
    const res = await invoke();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('duplicate');
    expect(callsFor(db.calls, 'entitlements')).toHaveLength(0);
  });

  it('releases the event claim and returns 500 when processing fails (so Stripe retries)', async () => {
    db = makeDb({ entitlements: { error: { message: 'db down' } } });
    createClientMock.mockImplementation(() => db.client);
    constructEventAsync.mockResolvedValue(
      stripeEvent('checkout.session.completed', {
        metadata: { parent_id: 'parent_1', tier: 'single' },
        payment_status: 'paid',
        payment_intent: 'pi_1',
        customer: 'cus_1',
      }),
    );
    const res = await invoke();
    expect(res.status).toBe(500);
    const eventCalls = callsFor(db.calls, 'stripe_events');
    expect(eventCalls.some((c) => c.method === 'delete')).toBe(true);
    expect(eventCalls.some((c) => c.method === 'eq' && c.args[1] === 'evt_1')).toBe(true);
  });
});

describe('webhook: checkout.session.completed (grant)', () => {
  it('grants an active entitlement with the right seats for each tier', async () => {
    for (const [tier, seats] of [
      ['single', 1],
      ['multi', 10],
    ] as const) {
      vi.clearAllMocks();
      db = makeDb();
      createClientMock.mockImplementation(() => db.client);
      constructEventAsync.mockResolvedValue(
        stripeEvent('checkout.session.completed', {
          metadata: { parent_id: 'parent_1', tier },
          payment_status: 'paid',
          payment_intent: 'pi_1',
          customer: 'cus_1',
        }),
      );
      const res = await invoke();
      expect(res.status).toBe(200);
      const upsert = callsFor(db.calls, 'entitlements').find((c) => c.method === 'upsert');
      expect(upsert?.args[0]).toMatchObject({
        parent_id: 'parent_1',
        tier,
        seats,
        status: 'active',
        source: 'stripe',
        stripe_payment_intent_id: 'pi_1',
      });
    }
  });

  it('does NOT grant when the session is unpaid', async () => {
    constructEventAsync.mockResolvedValue(
      stripeEvent('checkout.session.completed', {
        metadata: { parent_id: 'parent_1', tier: 'single' },
        payment_status: 'unpaid',
      }),
    );
    const res = await invoke();
    expect(res.status).toBe(200); // acked, but nothing written
    expect(callsFor(db.calls, 'entitlements')).toHaveLength(0);
  });
});

describe('webhook: charge.refunded (revoke)', () => {
  it('flips the entitlement to refunded, matched by payment intent', async () => {
    constructEventAsync.mockResolvedValue(
      stripeEvent('charge.refunded', {
        id: 'ch_1',
        refunded: true,
        payment_intent: 'pi_1',
        metadata: { parent_id: 'parent_1' },
      }),
    );
    const res = await invoke();
    expect(res.status).toBe(200);
    const ent = callsFor(db.calls, 'entitlements');
    expect(ent.find((c) => c.method === 'update')?.args[0]).toMatchObject({
      status: 'refunded',
    });
    expect(
      ent.some((c) => c.method === 'eq' && c.args[0] === 'stripe_payment_intent_id' && c.args[1] === 'pi_1'),
    ).toBe(true);
    // PI match wins — the parent_id fallback must not also fire.
    expect(ent.some((c) => c.method === 'eq' && c.args[0] === 'parent_id')).toBe(false);
  });

  it('falls back to parent_id (stripe-sourced rows only) when the charge has no PI', async () => {
    constructEventAsync.mockResolvedValue(
      stripeEvent('charge.refunded', {
        id: 'ch_1',
        refunded: true,
        payment_intent: null,
        metadata: { parent_id: 'parent_1' },
      }),
    );
    const res = await invoke();
    expect(res.status).toBe(200);
    const ent = callsFor(db.calls, 'entitlements');
    expect(ent.find((c) => c.method === 'update')?.args[0]).toMatchObject({ status: 'refunded' });
    expect(ent.some((c) => c.method === 'eq' && c.args[0] === 'parent_id' && c.args[1] === 'parent_1')).toBe(true);
    expect(ent.some((c) => c.method === 'eq' && c.args[0] === 'source' && c.args[1] === 'stripe')).toBe(true);
  });

  it('keeps access on a PARTIAL refund (charge.refunded=false)', async () => {
    constructEventAsync.mockResolvedValue(
      stripeEvent('charge.refunded', {
        id: 'ch_1',
        refunded: false, // partial — Stripe fires the event but the charge is not fully refunded
        payment_intent: 'pi_1',
        metadata: { parent_id: 'parent_1' },
      }),
    );
    const res = await invoke();
    expect(res.status).toBe(200);
    expect(callsFor(db.calls, 'entitlements')).toHaveLength(0);
  });
});

describe('webhook: charge.dispute.created (revoke)', () => {
  it('flips the entitlement to refunded, matched by payment intent', async () => {
    constructEventAsync.mockResolvedValue(
      stripeEvent('charge.dispute.created', {
        id: 'dp_1',
        charge: 'ch_1',
        payment_intent: 'pi_1',
      }),
    );
    const res = await invoke();
    expect(res.status).toBe(200);
    const ent = callsFor(db.calls, 'entitlements');
    expect(ent.find((c) => c.method === 'update')?.args[0]).toMatchObject({ status: 'refunded' });
    expect(
      ent.some((c) => c.method === 'eq' && c.args[0] === 'stripe_payment_intent_id' && c.args[1] === 'pi_1'),
    ).toBe(true);
  });

  it('acks (200) a dispute with no usable reference instead of erroring forever', async () => {
    constructEventAsync.mockResolvedValue(
      stripeEvent('charge.dispute.created', { id: 'dp_1', charge: null, payment_intent: null }),
    );
    const res = await invoke();
    expect(res.status).toBe(200);
    expect(callsFor(db.calls, 'entitlements')).toHaveLength(0);
  });
});

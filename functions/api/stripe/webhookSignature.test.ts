import { describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

// Real signature verification. Stripe's SDK is not mocked: a forged body must
// fail before any database write, and a valid signature for the same event
// twice is acked the second time without a second write.

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import { onRequestPost } from './webhook';

const SECRET = 'whsec_test_secret_for_signature';

type Row = Record<string, unknown>;

function memory() {
  const events: Row[] = [];
  const calls: string[] = [];
  function from(table: string) {
    const filters: { col: string; val: unknown }[] = [];
    let op: { method: string; payload?: Row } | null = null;
    const chain: Record<string, unknown> = {};
    const run = () => {
      calls.push(`${table}.${op?.method ?? 'read'}`);
      if (table !== 'stripe_events') return { data: null, error: null };
      if (op?.method === 'insert') {
        const payload = op.payload ?? {};
        if (events.some((row) => row.event_id === payload.event_id)) {
          return { data: null, error: { code: '23505', message: 'duplicate key' } };
        }
        events.push({ ...payload });
        return { data: payload, error: null };
      }
      return { data: events, error: null };
    };
    chain.insert = (payload: Row) => {
      op = { method: 'insert', payload };
      return chain;
    };
    chain.update = (payload: Row) => {
      op = { method: 'update', payload };
      return chain;
    };
    chain.delete = () => {
      op = { method: 'delete' };
      return chain;
    };
    chain.eq = (col: string, val: unknown) => {
      filters.push({ col, val });
      return chain;
    };
    chain.is = () => chain;
    chain.select = () => chain;
    chain.maybeSingle = async () => ({ data: null, error: null });
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(run()).then(resolve, reject);
    return chain;
  }
  createClientMock.mockImplementation(() => ({
    from,
    auth: { persistSession: false },
  }));
  return { events, calls };
}

const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_signature_only',
  STRIPE_WEBHOOK_SECRET: SECRET,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

const PAYLOAD = JSON.stringify({
  id: 'evt_sig_1',
  object: 'event',
  type: 'charge.dispute.created',
  data: { object: { id: 'dp_1', object: 'dispute', payment_intent: null, charge: null } },
});

async function signedHeader(payload: string): Promise<string> {
  const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: SECRET,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  });
}

function post(payload: string, signature: string) {
  return onRequestPost({
    request: new Request('https://words.example/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body: payload,
    }),
    env: ENV,
  } as unknown as Parameters<typeof onRequestPost>[0]);
}

describe('webhook signature (real Stripe crypto)', () => {
  it('rejects a body that does not match the signature and writes nothing', async () => {
    const db = memory();
    const header = await signedHeader(PAYLOAD);
    const res = await post(`${PAYLOAD} `, header);
    expect(res.status).toBe(400);
    expect(db.events).toHaveLength(0);
    expect(db.calls).toHaveLength(0);
  });

  it('accepts a valid signature once and acks the retry without a second write', async () => {
    const db = memory();
    const header = await signedHeader(PAYLOAD);
    const first = await post(PAYLOAD, header);
    expect(first.status).toBe(200);
    expect(await first.text()).toBe('ok');
    expect(db.events.map((row) => row.event_id)).toEqual(['evt_sig_1']);

    const second = await post(PAYLOAD, header);
    expect(second.status).toBe(200);
    expect(await second.text()).toBe('duplicate');
    expect(db.events).toHaveLength(1);
  });
});

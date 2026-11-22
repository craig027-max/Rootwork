import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutRecordFromStored } from '../../../src/core/checkoutRecord';
import { buildReceipt } from '../../../src/core/receipt';
import { pdfTextLines, receiptToPdf } from '../../../src/core/receiptPdf';
import { SINGLE_SCHOLAR } from '../../../src/core/singleScholar';

// Test-mode purchase with no Stripe network and no live key. A signed-in parent
// starts Checkout, Stripe later delivers checkout.session.completed, and the
// webhook grants Single Scholar plus one receipt. A second delivery is a no-op.
// A full refund ends access.

const { sessionsCreate, pricesRetrieve, paymentIntentsRetrieve, constructEventAsync, createClientMock } =
  vi.hoisted(() => ({
    sessionsCreate: vi.fn(),
    pricesRetrieve: vi.fn(),
    paymentIntentsRetrieve: vi.fn(),
    constructEventAsync: vi.fn(),
    createClientMock: vi.fn(),
  }));

vi.mock('stripe', () => {
  class FakeStripe {
    checkout = { sessions: { create: sessionsCreate } };
    prices = { retrieve: pricesRetrieve };
    paymentIntents = { retrieve: paymentIntentsRetrieve };
    webhooks = { constructEventAsync };
    static createFetchHttpClient = vi.fn(() => ({}));
    static createSubtleCryptoProvider = vi.fn(() => ({}));
  }
  return { default: FakeStripe };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import { onRequestPost as createSession } from './create-checkout-session';
import { onRequestPost as webhook } from './webhook';

type Row = Record<string, unknown>;
type Filter = { op: 'eq' | 'is'; col: string; val: unknown };

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) => {
    if (filter.op === 'eq') return row[filter.col] === filter.val;
    return filter.val == null ? row[filter.col] == null : row[filter.col] === filter.val;
  });
}

function memoryDb() {
  const tables: Record<string, Row[]> = {
    entitlements: [],
    receipts: [],
    stripe_events: [],
    profiles: [{ id: 'parent_1', role: null, consent_at: null, consent_method: null, vpc_payment_ref: null }],
  };

  function from(table: string) {
    const filters: Filter[] = [];
    let pending: { method: string; payload?: Row; onConflict?: string } | null = null;
    const chain: Record<string, unknown> = {};
    const rows = () => {
      if (!tables[table]) tables[table] = [];
      return tables[table];
    };
    const run = () => {
      const all = rows();
      if (!pending || pending.method === 'select') {
        return { data: all.filter((row) => matches(row, filters)), error: null };
      }
      if (pending.method === 'insert') {
        const payload = pending.payload ?? {};
        const duplicate =
          (table === 'stripe_events' && all.some((row) => row.event_id === payload.event_id)) ||
          (table === 'receipts' &&
            all.some(
              (row) =>
                row.checkout_session_id === payload.checkout_session_id ||
                row.receipt_number === payload.receipt_number,
            ));
        if (duplicate) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        all.push({ ...payload });
        return { data: payload, error: null };
      }
      if (pending.method === 'upsert') {
        const payload = pending.payload ?? {};
        const key = pending.onConflict ?? 'id';
        const idx = all.findIndex((row) => row[key] === payload[key]);
        if (idx >= 0) all[idx] = { ...all[idx], ...payload };
        else all.push({ ...payload });
        return { data: payload, error: null };
      }
      if (pending.method === 'update') {
        for (const row of all.filter((row) => matches(row, filters))) Object.assign(row, pending.payload);
        return { data: null, error: null };
      }
      if (pending.method === 'delete') {
        tables[table] = all.filter((row) => !matches(row, filters));
        return { data: null, error: null };
      }
      return { data: null, error: null };
    };
    chain.select = () => {
      if (!pending) pending = { method: 'select' };
      return chain;
    };
    chain.insert = (payload: Row) => {
      pending = { method: 'insert', payload };
      return chain;
    };
    chain.upsert = (payload: Row, options?: { onConflict?: string }) => {
      pending = { method: 'upsert', payload, onConflict: options?.onConflict };
      return chain;
    };
    chain.update = (payload: Row) => {
      pending = { method: 'update', payload };
      return chain;
    };
    chain.delete = () => {
      pending = { method: 'delete' };
      return chain;
    };
    chain.eq = (col: string, val: unknown) => {
      filters.push({ op: 'eq', col, val });
      return chain;
    };
    chain.is = (col: string, val: unknown) => {
      filters.push({ op: 'is', col, val });
      return chain;
    };
    chain.maybeSingle = async () => {
      const result = run();
      const list = Array.isArray(result.data) ? result.data : [];
      return { data: list[0] ?? null, error: result.error };
    };
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(run()).then(resolve, reject);
    return chain;
  }

  return {
    tables,
    client: {
      from,
      auth: {
        getUser: async () => ({
          data: { user: { id: 'parent_1', email: 'parent@example.com', is_anonymous: false } },
          error: null,
        }),
      },
    },
  };
}

const CHECKOUT_ENV = {
  STRIPE_SECRET_KEY: 'sk_test_purchase_path',
  STRIPE_PRICE_SINGLE: 'price_single_test',
  CHECKOUT_ENABLED: 'true',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

const WEBHOOK_ENV = {
  STRIPE_SECRET_KEY: 'sk_test_purchase_path',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_purchase_path',
  SUPABASE_URL: CHECKOUT_ENV.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: CHECKOUT_ENV.SUPABASE_SERVICE_ROLE_KEY,
};

const CREATED = Math.floor(Date.parse('2026-03-15T00:00:00.000Z') / 1000);

function completedEvent(id = 'evt_purchase_1') {
  return {
    id,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_parent_1',
        created: CREATED,
        currency: 'usd',
        amount_subtotal: SINGLE_SCHOLAR.priceCents,
        amount_total: SINGLE_SCHOLAR.priceCents,
        total_details: { amount_discount: 0, amount_tax: 0, amount_shipping: 0 },
        payment_status: 'paid',
        payment_intent: 'pi_test_1',
        customer: 'cus_test_1',
        client_reference_id: 'parent_1',
        metadata: { parent_id: 'parent_1', tier: 'single' },
      },
    },
  };
}

let db: ReturnType<typeof memoryDb>;

beforeEach(() => {
  vi.clearAllMocks();
  db = memoryDb();
  createClientMock.mockImplementation(() => db.client);
  pricesRetrieve.mockResolvedValue({
    id: 'price_single_test',
    active: true,
    type: 'one_time',
    currency: 'usd',
    unit_amount: SINGLE_SCHOLAR.priceCents,
  });
  sessionsCreate.mockResolvedValue({
    id: 'cs_test_parent_1',
    url: 'https://checkout.stripe.com/c/pay/cs_test_parent_1',
  });
  paymentIntentsRetrieve.mockResolvedValue({
    id: 'pi_test_1',
    latest_charge: { payment_method_details: { card: { brand: 'visa', last4: '4242' } } },
  });
});

describe('test-mode parent purchase', () => {
  it('starts checkout, grants one year, stores a receipt, and ignores a retry', async () => {
    const start = await createSession({
      request: new Request('https://words.example/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { authorization: 'Bearer parent-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ tier: 'single' }),
      }),
      env: CHECKOUT_ENV,
    } as unknown as Parameters<typeof createSession>[0]);
    expect(start.status).toBe(200);
    expect(await start.json()).toEqual({
      url: 'https://checkout.stripe.com/c/pay/cs_test_parent_1',
    });
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [{ price: 'price_single_test', quantity: 1 }],
        metadata: { parent_id: 'parent_1', tier: 'single' },
      }),
    );
    const created = sessionsCreate.mock.calls[0]?.[0] as { payment_intent_data?: object };
    expect(created.payment_intent_data).not.toHaveProperty('statement_descriptor');

    constructEventAsync.mockResolvedValue(completedEvent());
    const delivered = await webhook({
      request: new Request('https://words.example/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=sig' },
        body: '{}',
      }),
      env: WEBHOOK_ENV,
    } as unknown as Parameters<typeof webhook>[0]);
    expect(delivered.status).toBe(200);

    const entitlements = db.tables.entitlements ?? [];
    const profiles = db.tables.profiles ?? [];
    const receipts = db.tables.receipts ?? [];
    const ent = entitlements[0];
    expect(ent).toMatchObject({
      parent_id: 'parent_1',
      tier: 'single',
      seats: 1,
      status: 'active',
      source: 'stripe',
      stripe_payment_intent_id: 'pi_test_1',
    });
    const granted = Date.parse(String(ent?.granted_at));
    const expires = Date.parse(String(ent?.expires_at));
    expect(expires - granted).toBeGreaterThan(360 * 24 * 60 * 60 * 1000);
    expect(expires - granted).toBeLessThan(370 * 24 * 60 * 60 * 1000);

    const profile = profiles[0];
    expect(profile).toMatchObject({
      role: 'parent',
      consent_method: 'stripe',
      vpc_payment_ref: 'pi_test_1',
    });
    expect(profile?.consent_at).toEqual(expect.any(String));

    expect(receipts).toHaveLength(1);
    const storedRow = receipts[0];
    if (!storedRow) throw new Error('missing receipt');
    const stored = storedRow as unknown as Parameters<typeof checkoutRecordFromStored>[0];
    const text = pdfTextLines(receiptToPdf(buildReceipt(checkoutRecordFromStored(stored)))).join('\n');
    expect(text).toContain('Thompson Education Apps LLC');
    expect(text).toContain('Wondral Words');
    expect(text).toContain(SINGLE_SCHOLAR.item);
    expect(text).toContain('Total paid $49.00');
    expect(text).toContain('Payment method Visa ****4242');
    expect(text).toContain('Paid in full');
    expect(text).not.toMatch(/mailing address|EIN/);
    expect(text).not.toMatch(/\d{5,}/);

    constructEventAsync.mockResolvedValue(completedEvent());
    const retry = await webhook({
      request: new Request('https://words.example/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=sig' },
        body: '{}',
      }),
      env: WEBHOOK_ENV,
    } as unknown as Parameters<typeof webhook>[0]);
    expect(retry.status).toBe(200);
    expect(await retry.text()).toBe('duplicate');
    expect(receipts).toHaveLength(1);
    expect(entitlements).toHaveLength(1);

    constructEventAsync.mockResolvedValue({
      id: 'evt_refund_1',
      type: 'charge.refunded',
      data: {
        object: { id: 'ch_1', refunded: true, payment_intent: 'pi_test_1', metadata: { parent_id: 'parent_1' } },
      },
    });
    const refund = await webhook({
      request: new Request('https://words.example/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=sig' },
        body: '{}',
      }),
      env: WEBHOOK_ENV,
    } as unknown as Parameters<typeof webhook>[0]);
    expect(refund.status).toBe(200);
    expect(entitlements[0]?.status).toBe('refunded');
    expect(receipts).toHaveLength(1);
  });
});

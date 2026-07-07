import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub-tests the (request, env) handler: Stripe's sessions.create and the
// Supabase auth/entitlement reads are mocked; requests are real Request objects.

const { sessionsCreate, getUser, createClientMock } = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  getUser: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock('stripe', () => {
  class FakeStripe {
    checkout = { sessions: { create: sessionsCreate } };
    static createFetchHttpClient = vi.fn(() => ({}));
  }
  return { default: FakeStripe };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import { onRequestPost } from './create-checkout-session';

type EntitlementRow = { status: string; expires_at: string | null } | null;

/** Supabase stub: auth.getUser + the entitlements pre-check query chain. */
function stubSupabase(entitlement: EntitlementRow, entitlementError: { message: string } | null = null) {
  createClientMock.mockImplementation(() => ({
    auth: { getUser },
    from: (table: string) => {
      expect(table).toBe('entitlements');
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: entitlement, error: entitlementError }),
          }),
        }),
      };
    },
  }));
}

const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_1',
  STRIPE_PRICE_SINGLE: 'price_single_test',
  STRIPE_PRICE_MULTI: 'price_multi_test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function makeRequest(body: unknown = { tier: 'single' }, token: string | null = 'jwt-token') {
  return new Request('https://words.example/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function invoke(request = makeRequest(), env = ENV) {
  return onRequestPost({ request, env } as unknown as Parameters<typeof onRequestPost>[0]);
}

function signedInUser(overrides: Record<string, unknown> = {}) {
  getUser.mockResolvedValue({
    data: { user: { id: 'parent_1', email: 'p@example.com', is_anonymous: false, ...overrides } },
    error: null,
  });
}

const FUTURE = '2099-01-01T00:00:00.000Z';
const PAST = '2020-01-01T00:00:00.000Z';

beforeEach(() => {
  vi.clearAllMocks();
  sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test' });
  stubSupabase(null);
});

describe('create-checkout-session: auth', () => {
  it('rejects a missing bearer token (401)', async () => {
    const res = await invoke(makeRequest({ tier: 'single' }, null));
    expect(res.status).toBe(401);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('rejects an invalid token (401)', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await invoke();
    expect(res.status).toBe(401);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('rejects an anonymous session (403 account_required) — consent needs a durable account', async () => {
    signedInUser({ is_anonymous: true });
    const res = await invoke();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'account_required' });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('create-checkout-session: double-purchase guard', () => {
  it('returns 409 already_entitled when an active, unexpired entitlement exists', async () => {
    signedInUser();
    stubSupabase({ status: 'active', expires_at: FUTURE });
    const res = await invoke();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'already_entitled' });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('returns 409 for an active entitlement with no expiry', async () => {
    signedInUser();
    stubSupabase({ status: 'active', expires_at: null });
    const res = await invoke();
    expect(res.status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('lets an EXPIRED entitlement buy again', async () => {
    signedInUser();
    stubSupabase({ status: 'active', expires_at: PAST });
    const res = await invoke();
    expect(res.status).toBe(200);
    expect(sessionsCreate).toHaveBeenCalledTimes(1);
  });

  it('lets a REFUNDED entitlement buy again', async () => {
    signedInUser();
    stubSupabase({ status: 'refunded', expires_at: FUTURE });
    const res = await invoke();
    expect(res.status).toBe(200);
    expect(sessionsCreate).toHaveBeenCalledTimes(1);
  });

  it('fails OPEN when the pre-check errors (a flaky read must not block all purchases)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    signedInUser();
    stubSupabase(null, { message: 'db down' });
    const res = await invoke();
    expect(res.status).toBe(200);
    expect(sessionsCreate).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

describe('create-checkout-session: session creation', () => {
  it('creates a session for the requested tier price and returns its url', async () => {
    signedInUser();
    const res = await invoke(makeRequest({ tier: 'multi' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/pay/cs_test' });
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [{ price: 'price_multi_test', quantity: 1 }],
        client_reference_id: 'parent_1',
        metadata: { parent_id: 'parent_1', tier: 'multi' },
      }),
    );
  });

  it('defaults an unknown/missing tier to single', async () => {
    signedInUser();
    const res = await invoke(makeRequest({}));
    expect(res.status).toBe(200);
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_single_test', quantity: 1 }],
        metadata: { parent_id: 'parent_1', tier: 'single' },
      }),
    );
  });

  it('returns 500 price_not_configured when the tier price env is missing', async () => {
    signedInUser();
    const res = await invoke(makeRequest({ tier: 'single' }), { ...ENV, STRIPE_PRICE_SINGLE: '' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'price_not_configured' });
  });

  it('returns a generic 502 stripe_error when Stripe fails (no detail leaked)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    signedInUser();
    sessionsCreate.mockRejectedValue(new Error('No such price: price_single_test'));
    const res = await invoke();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'stripe_error' });
    consoleError.mockRestore();
  });
});

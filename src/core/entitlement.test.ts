import { describe, it, expect } from 'vitest';
import { canAddStudent, gateEntitled, isEntitlementActive, seatLimit } from './entitlement';
import type { Entitlement } from './supabase';

// A fixed "now" so expiry comparisons are deterministic (never Date.now()).
const NOW = Date.parse('2026-06-18T00:00:00.000Z');
const FUTURE = '2027-06-18T00:00:00.000Z';
const PAST = '2026-01-01T00:00:00.000Z';

function makeEnt(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: 'ent_1',
    parent_id: 'parent_1',
    tier: 'single',
    seats: 1,
    status: 'active',
    source: 'stripe',
    stripe_customer_id: null,
    stripe_payment_intent_id: null,
    granted_at: PAST,
    expires_at: null,
    created_at: PAST,
    updated_at: PAST,
    ...overrides,
  };
}

describe('isEntitlementActive', () => {
  it('is false when there is no entitlement', () => {
    expect(isEntitlementActive(null, NOW)).toBe(false);
  });

  it('is true for an active entitlement expiring in the future', () => {
    expect(isEntitlementActive(makeEnt({ expires_at: FUTURE }), NOW)).toBe(true);
  });

  it('is false for an active entitlement that has already expired', () => {
    expect(isEntitlementActive(makeEnt({ expires_at: PAST }), NOW)).toBe(false);
  });

  it('is true for an active entitlement with no expiry (expires_at null)', () => {
    expect(isEntitlementActive(makeEnt({ expires_at: null }), NOW)).toBe(true);
  });

  it('treats an expiry exactly at now as expired (boundary: <= now)', () => {
    const atNow = new Date(NOW).toISOString();
    expect(isEntitlementActive(makeEnt({ expires_at: atNow }), NOW)).toBe(false);
  });

  it('is false when status is expired, even with a future expiry', () => {
    expect(isEntitlementActive(makeEnt({ status: 'expired', expires_at: FUTURE }), NOW)).toBe(false);
  });

  it('is false when status is refunded, even with a future expiry', () => {
    expect(isEntitlementActive(makeEnt({ status: 'refunded', expires_at: FUTURE }), NOW)).toBe(
      false,
    );
  });
});

describe('seatLimit (student-profile cap: single=1, family=10, free=1)', () => {
  it('is 1 with no entitlement (free tier is one learner)', () => {
    expect(seatLimit(null, NOW)).toBe(1);
  });

  it('is the granted seats for an active entitlement', () => {
    expect(seatLimit(makeEnt({ tier: 'single', seats: 1, expires_at: FUTURE }), NOW)).toBe(1);
    expect(seatLimit(makeEnt({ tier: 'multi', seats: 10, expires_at: FUTURE }), NOW)).toBe(10);
  });

  it('drops back to 1 when the entitlement is expired', () => {
    expect(seatLimit(makeEnt({ tier: 'multi', seats: 10, expires_at: PAST }), NOW)).toBe(1);
  });

  it('drops back to 1 when the entitlement is refunded', () => {
    expect(
      seatLimit(makeEnt({ tier: 'multi', seats: 10, status: 'refunded', expires_at: FUTURE }), NOW),
    ).toBe(1);
  });

  it('never returns less than 1, even for a malformed seats value', () => {
    expect(seatLimit(makeEnt({ seats: 0, expires_at: FUTURE }), NOW)).toBe(1);
  });
});

describe('canAddStudent', () => {
  it('allows the first student on the free/single tier, then stops', () => {
    expect(canAddStudent(0, null, NOW)).toBe(true);
    expect(canAddStudent(1, null, NOW)).toBe(false);
  });

  it('allows up to 10 on the family tier, then stops (boundary at seats)', () => {
    const family = makeEnt({ tier: 'multi', seats: 10, expires_at: FUTURE });
    expect(canAddStudent(9, family, NOW)).toBe(true);
    expect(canAddStudent(10, family, NOW)).toBe(false);
  });

  it('treats a lapsed family plan as the free cap again', () => {
    const lapsed = makeEnt({ tier: 'multi', seats: 10, expires_at: PAST });
    expect(canAddStudent(1, lapsed, NOW)).toBe(false);
  });
});

describe('gateEntitled (reload flash-suppression rule)', () => {
  it('is true when the entitlement is genuinely active', () => {
    expect(gateEntitled({ active: true, authStatus: 'authenticated', entitlementLoaded: true })).toBe(
      true,
    );
  });

  it("is true while auth is still 'loading' (no flash on reload)", () => {
    expect(gateEntitled({ active: false, authStatus: 'loading', entitlementLoaded: false })).toBe(
      true,
    );
  });

  it('is true when authenticated but the entitlement has not loaded yet', () => {
    expect(
      gateEntitled({ active: false, authStatus: 'authenticated', entitlementLoaded: false }),
    ).toBe(true);
  });

  it('is false when authenticated, loaded, and not active (real paywall)', () => {
    expect(
      gateEntitled({ active: false, authStatus: 'authenticated', entitlementLoaded: true }),
    ).toBe(false);
  });

  it('is false for an anonymous (free-play) user', () => {
    expect(gateEntitled({ active: false, authStatus: 'anonymous', entitlementLoaded: true })).toBe(
      false,
    );
  });

  it('is false for a signed-out user', () => {
    expect(gateEntitled({ active: false, authStatus: 'signed-out', entitlementLoaded: true })).toBe(
      false,
    );
  });
});

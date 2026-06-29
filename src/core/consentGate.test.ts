import { describe, it, expect } from 'vitest';
import { resolveEntryView, type EntryState, type EntryView } from './consentGate';
import type { AuthStatus } from '../app/store';
import type { ProfileRole } from './supabase';

function state(overrides: Partial<EntryState> = {}): EntryState {
  return {
    authStatus: 'authenticated',
    role: 'parent',
    consentAt: '2026-06-01T00:00:00.000Z',
    entitled: false,
    offline: false,
    intent: 'upgrade',
    ...overrides,
  };
}

describe('resolveEntryView — browsing is always free and reachable', () => {
  it("never gates a 'browse' intent once auth has settled → 'home'", () => {
    const statuses: AuthStatus[] = ['anonymous', 'authenticated', 'signed-out'];
    for (const authStatus of statuses) {
      expect(resolveEntryView(state({ intent: 'browse', authStatus }))).toBe('home');
    }
  });

  it("returns 'loading' before auth settles, regardless of intent", () => {
    expect(resolveEntryView(state({ authStatus: 'loading', intent: 'browse' }))).toBe('loading');
    expect(resolveEntryView(state({ authStatus: 'loading', intent: 'upgrade' }))).toBe('loading');
  });
});

describe('resolveEntryView — upgrade flow never dead-ends', () => {
  it('already entitled → home (nothing to buy)', () => {
    expect(resolveEntryView(state({ entitled: true }))).toBe('home');
  });

  it('offline → graceful paywall (its CTA is disabled), never a broken checkout', () => {
    expect(resolveEntryView(state({ offline: true, authStatus: 'anonymous' }))).toBe('paywall');
    expect(resolveEntryView(state({ offline: true, authStatus: 'authenticated' }))).toBe('paywall');
  });

  it('anonymous (online) → auth: the purchase is the consent, needs a real account', () => {
    expect(resolveEntryView(state({ authStatus: 'anonymous', role: null, consentAt: null }))).toBe(
      'auth',
    );
  });

  it('signed-out (online) → auth', () => {
    expect(resolveEntryView(state({ authStatus: 'signed-out', role: null, consentAt: null }))).toBe(
      'auth',
    );
  });

  it('authenticated but no role yet → consent', () => {
    expect(resolveEntryView(state({ role: null, consentAt: null }))).toBe('consent');
  });

  it('authenticated parent but consent not recorded → consent', () => {
    expect(resolveEntryView(state({ role: 'parent', consentAt: null }))).toBe('consent');
  });

  it('authenticated, consented parent, not entitled → paywall', () => {
    expect(resolveEntryView(state({ role: 'parent', consentAt: '2026-06-01', entitled: false }))).toBe(
      'paywall',
    );
  });
});

describe('resolveEntryView — exhaustive: ALWAYS a valid view, NEVER an error/dead-end', () => {
  const VALID: EntryView[] = ['loading', 'home', 'auth', 'consent', 'paywall'];
  const authStatuses: AuthStatus[] = ['loading', 'anonymous', 'authenticated', 'signed-out'];
  const roles: Array<ProfileRole | null> = ['parent', 'student', null];
  const consents: Array<string | null> = ['2026-06-01T00:00:00.000Z', null];

  it('every combination of inputs resolves to a real, graceful view', () => {
    for (const authStatus of authStatuses) {
      for (const role of roles) {
        for (const consentAt of consents) {
          for (const entitled of [true, false]) {
            for (const offline of [true, false]) {
              for (const intent of ['browse', 'upgrade'] as const) {
                const view = resolveEntryView({
                  authStatus,
                  role,
                  consentAt,
                  entitled,
                  offline,
                  intent,
                });
                // The PianoSurge guard: no gated state may produce anything other
                // than one of the known, renderable views.
                expect(VALID).toContain(view);
              }
            }
          }
        }
      }
    }
  });
});

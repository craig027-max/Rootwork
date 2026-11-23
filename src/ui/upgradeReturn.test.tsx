/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '../core/supabase';

const profiles = vi.hoisted(() => ({
  current: null as Profile | null,
}));

vi.mock('../app/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/hooks')>();
  return {
    ...actual,
    hasSupabaseConfig: true,
    // The real helper reads the Supabase flag closed over at module load.
    useShowUpgrade: () => true,
  };
});

vi.mock('../core/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/auth')>();
  return {
    ...actual,
    signIn: vi.fn(async () => ({
      user: { id: 'parent_1', email: 'parent@example.com', is_anonymous: false },
      session: { access_token: 'token' },
    })),
  };
});

vi.mock('../core/profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/profile')>();
  return {
    ...actual,
    getProfile: vi.fn(async () => profiles.current),
    updateProfile: vi.fn(async (_id: string, updates: Partial<Profile>) => {
      if (!profiles.current) return;
      profiles.current = { ...profiles.current, ...updates };
    }),
  };
});

import { App } from '../app/App';
import { PENDING_UPGRADE_KEY, useWondralStore } from '../app/store';
import { loadAccountAfterSignIn } from '../core/hydrate';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'parent_1',
    display_name: null,
    grade_level: null,
    role: null,
    consent_at: null,
    consent_method: null,
    vpc_payment_ref: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Go Premium returns to the plan', () => {
  let reactRoot: ReactRoot | null = null;
  let host: HTMLDivElement | null = null;
  const snapshot = useWondralStore.getState();

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    sessionStorage.removeItem(PENDING_UPGRADE_KEY);
    profiles.current = profile();
    useWondralStore.setState({
      ...snapshot,
      authStatus: 'signed-out',
      authUser: null,
      profile: null,
      entitlement: null,
      entitlementLoaded: true,
      view: 'grownups',
      parentGateAt: Date.now(),
      pendingUpgrade: false,
      askOpen: false,
      checkoutNotice: null,
      students: [],
      activeStudentId: null,
      passwordRecovery: false,
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      reactRoot?.unmount();
    });
    host?.remove();
    sessionStorage.removeItem(PENDING_UPGRADE_KEY);
    useWondralStore.setState(snapshot, true);
  });

  async function show() {
    await act(async () => {
      reactRoot?.render(<App />);
    });
  }

  async function clickText(label: string) {
    const button = [...document.querySelectorAll('button')].find((el) => el.textContent === label);
    if (!button) throw new Error(`missing button ${label}`);
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function typeInto(selector: string, value: string) {
    const input = document.querySelector(selector);
    if (!(input instanceof HTMLInputElement)) throw new Error(`missing ${selector}`);
    await act(async () => {
      const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      proto?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  async function signIn() {
    await typeInto('input[type="email"]', 'parent@example.com');
    await typeInto('input[type="password"]', 'password1');
    await clickText('Sign in');
  }

  async function loadSignedInAccount() {
    await act(async () => {
      useWondralStore.getState().applyAuthUser({
        id: 'parent_1',
        email: 'parent@example.com',
        is_anonymous: false,
      } as User);
      await loadAccountAfterSignIn();
    });
  }

  it('walks a new parent from Go Premium through consent to the closed plan', async () => {
    await show();
    await clickText('Go Premium');
    expect(useWondralStore.getState().view).toBe('auth');
    expect(useWondralStore.getState().pendingUpgrade).toBe(true);
    expect(sessionStorage.getItem(PENDING_UPGRADE_KEY)).toBe('1');
    expect(document.querySelector('[data-screen="upgrade-return"]')?.textContent).toContain(
      'bring you back to the plan',
    );
    expect(document.body.textContent).not.toContain('$49');

    await signIn();
    expect(useWondralStore.getState().view).toBe('auth');
    expect(useWondralStore.getState().pendingUpgrade).toBe(true);

    await loadSignedInAccount();
    expect(document.body.textContent).toContain('Parental consent');
    expect(document.body.textContent).not.toContain('$49');
    expect(document.querySelector('[data-screen="paywall"]')).toBeNull();

    const box = document.querySelector('input[type="checkbox"]');
    if (!(box instanceof HTMLInputElement)) throw new Error('missing consent checkbox');
    await act(async () => {
      box.click();
    });
    await clickText('I consent — continue');

    const paywall = document.querySelector('[data-screen="paywall"]');
    expect(paywall).toBeTruthy();
    expect(paywall?.textContent).toContain('Single Scholar');
    expect(paywall?.textContent).toContain('$49 / year');
    expect(paywall?.textContent).toContain('Purchases aren’t open yet');
    expect(paywall?.textContent).not.toContain('Choose');
    const buttons = [...(paywall?.querySelectorAll('button') ?? [])];
    expect(buttons.map((button) => button.textContent)).toEqual(['Back to learning']);
    for (const button of buttons) expect(button.className).not.toContain('btn-sm');
    expect(useWondralStore.getState().pendingUpgrade).toBe(false);

    await loadSignedInAccount();
    expect(document.querySelector('[data-screen="paywall"]')).toBeTruthy();
    expect(useWondralStore.getState().view).toBe('paywall');

    await clickText('Back to learning');
    expect(useWondralStore.getState().view).toBe('home');
    expect(useWondralStore.getState().pendingUpgrade).toBe(false);
    expect(sessionStorage.getItem(PENDING_UPGRADE_KEY)).toBeNull();
    expect(document.body.textContent).toContain('For grown-ups');
    expect(document.body.textContent).not.toContain('$49');
    expect(document.body.textContent).not.toContain('Choose');
  });

  it('returns a consented parent straight to the plan, and a plain sign-in does not', async () => {
    profiles.current = profile({
      role: 'parent',
      consent_at: '2026-06-01T00:00:00.000Z',
      consent_method: 'checkbox',
    });
    await show();
    await clickText('Go Premium');
    await signIn();
    await loadSignedInAccount();
    expect(useWondralStore.getState().view).toBe('paywall');
    expect(document.body.textContent).toContain('Purchases aren’t open yet');
    expect(document.body.textContent).not.toContain('Choose');
    expect(document.body.textContent).not.toContain('Parental consent');

    await clickText('Back to learning');
    expect(document.body.textContent).not.toContain('$49');

    await act(async () => {
      useWondralStore.setState({
        authStatus: 'signed-out',
        authUser: null,
        profile: null,
        view: 'grownups',
        parentGateAt: Date.now(),
        pendingUpgrade: false,
      });
    });
    expect(document.querySelector('[data-screen="upgrade-return"]')).toBeNull();
    await clickText('Sign in');
    expect(useWondralStore.getState().pendingUpgrade).toBe(false);
    expect(document.querySelector('[data-screen="upgrade-return"]')).toBeNull();
    await signIn();
    await loadSignedInAccount();
    expect(useWondralStore.getState().view).not.toBe('paywall');
    expect(document.querySelector('[data-screen="paywall"]')).toBeNull();
    expect(document.body.textContent).not.toContain('$49');
    expect(document.querySelector('[data-screen="parent-gate"]')).toBeTruthy();
  });
});

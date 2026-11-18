/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../app/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/hooks')>();
  return { ...actual, hasSupabaseConfig: true };
});
import { App } from '../app/App';
import { useWondralStore } from '../app/store';
import { PARENT_GATE_MS } from '../core/parentGate';
import { EMPTY_STATS } from '../core/stats';
import type { Entitlement } from '../core/supabase';
import { ROOTS, rootId } from '../data/roots';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const paid = ROOTS.find((r) => r.t === 2);
const free = ROOTS.find((r) => r.t === 1);
if (!paid || !free) throw new Error('fixture: missing a free and a paid root');

const starterDone = new Set(ROOTS.filter((r) => r.t === 1).map((r) => rootId(r)));

function entitlement(): Entitlement {
  return {
    id: 'ent',
    parent_id: 'parent',
    tier: 'single',
    seats: 1,
    status: 'active',
    source: 'stripe',
    stripe_customer_id: 'cus_test',
    stripe_payment_intent_id: 'pi_test',
    granted_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2027-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function screen(name: string): HTMLElement {
  const el = document.querySelector(`[data-screen="${name}"]`);
  if (!(el instanceof HTMLElement)) throw new Error(`missing ${name}`);
  return el;
}

/** What a kid must never see on the ask screen or before the gate. */
function expectNoStore(root: ParentNode) {
  const text = root.textContent ?? '';
  expect(text).not.toMatch(/\$/);
  expect(text).not.toMatch(/Choose/);
  expect(text).not.toMatch(/Sign in/);
  expect(text).not.toMatch(/Go Premium/);
  expect(text).not.toMatch(/support@/);
  const hrefs = [...root.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
  expect(hrefs.some((href) => href.startsWith('mailto:'))).toBe(false);
  expect(hrefs.some((href) => /^https?:\/\//i.test(href))).toBe(false);
}

function sumAnswer(root: ParentNode): string {
  const match = (root.textContent ?? '').match(/What is (\d+) \+ (\d+)\?/);
  if (!match) throw new Error('gate did not ask a sum');
  return String(Number(match[1]) + Number(match[2]));
}

describe('hybrid gate: kids ask, grown-ups pass a check', () => {
  let reactRoot: ReactRoot | null = null;
  let host: HTMLDivElement | null = null;
  const snapshot = useWondralStore.getState();

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
    useWondralStore.setState({
      authStatus: 'signed-out',
      authUser: null,
      profile: null,
      entitlement: null,
      entitlementLoaded: true,
      currentRootId: null,
      view: 'home',
      askOpen: false,
      parentGateAt: null,
      completedRoots: new Set(),
      stats: { ...EMPTY_STATS },
      students: [],
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
    reactRoot = null;
    host = null;
    useWondralStore.setState(snapshot, true);
  });

  async function show() {
    await act(async () => {
      reactRoot?.render(<App />);
    });
  }

  async function click(el: Element | null) {
    if (!el) throw new Error('missing click target');
    await act(async () => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function fillGate(value: string) {
    const input = document.querySelector('#ww-gate-answer');
    if (!(input instanceof HTMLInputElement)) throw new Error('missing gate input');
    await act(async () => {
      const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      proto?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('opens Ask a grown-up from a locked tier, with no store and no account', async () => {
    useWondralStore.setState({
      completedRoots: starterDone,
      stats: { ...EMPTY_STATS, runs: 1 },
    });
    await show();
    await click(document.querySelector('summary'));
    const builder = [...document.querySelectorAll('.ww-menu-row')].find((row) =>
      (row.textContent ?? '').includes('Builder'),
    );
    await click(builder ?? null);
    const unlock = [...document.querySelectorAll('button')].find((button) =>
      (button.textContent ?? '').includes('Ask a grown-up'),
    );
    await click(unlock ?? null);

    const ask = screen('ask-grownup');
    expect(ask.textContent).toContain('This one is locked');
    expect(ask.textContent).toContain('Keep playing');
    expectNoStore(ask);
    expect(document.body.textContent).not.toContain('$49');
    expect(document.body.textContent).not.toContain('Choose Single');
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(document.querySelector('a[href^="http"]')).toBeNull();

    await click(ask.querySelector('button'));
    expect(document.querySelector('[data-screen="ask-grownup"]')).toBeNull();
    expect(useWondralStore.getState().view).toBe('home');
  });

  it('opens Ask a grown-up from a dimmed Browse root', async () => {
    useWondralStore.setState({
      completedRoots: starterDone,
      stats: { ...EMPTY_STATS, runs: 1 },
    });
    await show();
    const seeAll = [...document.querySelectorAll('button')].find((button) =>
      (button.textContent ?? '').includes('See all roots'),
    );
    await click(seeAll ?? null);
    const locked = document.querySelector('.ww-ichip.lockchip');
    expect(locked).toBeTruthy();
    await click(locked);

    const ask = screen('ask-grownup');
    expectNoStore(ask);
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(document.querySelector('a[href^="http"]')).toBeNull();
  });

  it('opens Ask a grown-up from a Root Rush level above Starter', async () => {
    useWondralStore.setState({ view: 'quiz' });
    await show();
    const chip = document.querySelector('button.q-chip.locked');
    expect(chip?.textContent).toMatch(/Builder|Scholar|Master|AI/);
    await click(chip);

    const ask = screen('ask-grownup');
    expectNoStore(ask);
    expect(ask.querySelector('a')).toBeNull();
    await click(ask.querySelector('button'));
    expect(document.querySelector('[data-screen="ask-grownup"]')).toBeNull();
    expect(useWondralStore.getState().view).toBe('quiz');
    expect(document.querySelector('.q-rush')).toBeTruthy();
  });

  it('blocks the paywall until the sum is right, and a miss stays blocked', async () => {
    useWondralStore.setState({ view: 'paywall' });
    await show();
    const gate = screen('parent-gate');
    expectNoStore(gate);
    expect(document.body.textContent).not.toContain('$49');
    expect(document.querySelector('input[type="email"]')).toBeNull();

    await fillGate('0');
    await click([...gate.querySelectorAll('button')].find((b) => b.textContent === 'Continue') ?? null);
    expect(document.querySelector('[data-screen="parent-gate"]')).toBeTruthy();
    expect(document.body.textContent).toContain('That isn’t it');
    expect(document.body.textContent).not.toContain('$49');
    expect(document.body.textContent).not.toContain('Choose Single');

    const fresh = screen('parent-gate');
    await fillGate(sumAnswer(fresh));
    await click([...fresh.querySelectorAll('button')].find((b) => b.textContent === 'Continue') ?? null);
    expect(document.querySelector('[data-screen="parent-gate"]')).toBeNull();
    expect(document.body.textContent).toContain('$49');
    expect(document.body.textContent).toContain('Choose Single Scholar');
    expect(document.body.textContent).toContain('$79');
    expect(document.body.textContent).toContain('Choose Family');
  });

  it('blocks sign-in until the gate is passed, then opens the account form', async () => {
    useWondralStore.setState({ view: 'auth' });
    await show();
    expect(document.body.textContent).not.toContain('Forgot password');
    expect(document.querySelector('input[type="email"]')).toBeNull();
    expectNoStore(screen('parent-gate'));

    await fillGate(sumAnswer(screen('parent-gate')));
    await click(
      [...screen('parent-gate').querySelectorAll('button')].find((b) => b.textContent === 'Continue') ??
        null,
    );
    expect(document.body.textContent).toContain('Sign in');
    expect(document.body.textContent).toContain('Forgot password');
    expect(document.body.textContent).toContain('Create an account');
    expect(document.querySelector('input[type="email"]')).toBeTruthy();
  });

  it('resets the gate when leaving the grown-up area, and when the window expires', async () => {
    useWondralStore.setState({ view: 'paywall', parentGateAt: Date.now() });
    await show();
    expect(document.body.textContent).toContain('$49');

    await act(async () => {
      useWondralStore.getState().setView('home');
    });
    await show();
    expect(useWondralStore.getState().parentGateAt).toBeNull();
    expect(document.body.textContent).not.toContain('$49');
    expect(document.body.textContent).toContain('For grown-ups');

    await act(async () => {
      useWondralStore.setState({ view: 'dashboard', parentGateAt: Date.now() - PARENT_GATE_MS });
    });
    await show();
    expect(document.querySelector('[data-screen="parent-gate"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Add a student');
  });

  it('keeps For grown-ups on home only, and puts Sign in behind the gate', async () => {
    await show();
    expect(document.body.textContent).toContain('For grown-ups');
    expect(document.body.textContent).not.toContain('Sign in');
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(document.querySelector('a[href^="http"]')).toBeNull();
    expect(document.querySelector('a[href="/privacy"]')).toBeNull();

    await click([...document.querySelectorAll('button')].find((b) => b.textContent === 'For grown-ups') ?? null);
    expect(screen('parent-gate')).toBeTruthy();
    expect(useWondralStore.getState().view).toBe('grownups');
    expectNoStore(screen('parent-gate'));

    await fillGate(sumAnswer(screen('parent-gate')));
    await click(
      [...screen('parent-gate').querySelectorAll('button')].find((b) => b.textContent === 'Continue') ??
        null,
    );
    const hub = screen('grownups');
    expect(hub.textContent).toContain('Sign in');
    expect(hub.textContent).toContain('Privacy');
    expect(hub.textContent).toContain('Terms');
    expect(hub.querySelector('a[href^="http"]')).toBeNull();
    expect(hub.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('lets a signed-in entitled parent open a paid root', async () => {
    useWondralStore.setState({
      authStatus: 'authenticated',
      authUser: { id: 'parent', email: 'parent@example.com', isAnonymous: false },
      entitlement: entitlement(),
      entitlementLoaded: true,
      currentRootId: rootId(paid),
      view: 'deck',
    });
    await show();
    expect(document.querySelector('[data-screen="ask-grownup"]')).toBeNull();
    expect(document.body.textContent).toContain(paid.root);
    expect(document.body.textContent).not.toContain('This one is locked');

    useWondralStore.getState().openRoot(rootId(paid));
    expect(useWondralStore.getState().view).toBe('deck');
    expect(useWondralStore.getState().askOpen).toBe(false);
    expect(useWondralStore.getState().currentRootId).toBe(rootId(paid));
  });

  it('does not open a locked root into the lesson', () => {
    useWondralStore.getState().openRoot(rootId(paid));
    expect(useWondralStore.getState().askOpen).toBe(true);
    expect(useWondralStore.getState().view).toBe('home');
    expect(useWondralStore.getState().currentRootId).toBeNull();
  });
});

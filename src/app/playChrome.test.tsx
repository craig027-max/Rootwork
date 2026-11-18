/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ROOTS, rootId } from '../data/roots';
import { Deck } from '../ui/Deck';
import { App } from './App';
import { showAccountChrome } from './playChrome';
import { useWondralStore } from './store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const paid = ROOTS.find((r) => r.t === 2);
if (!paid) throw new Error('missing a tier 2 root');

function buttons(): string[] {
  return [...document.querySelectorAll('button')].map((button) =>
    (button.textContent ?? '').replace(/\s+/g, ' ').trim(),
  );
}

describe('a kid cannot open an account or a purchase while playing', () => {
  let reactRoot: ReactRoot | null = null;
  let host: HTMLDivElement | null = null;
  const snapshot = useWondralStore.getState();

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    useWondralStore.setState({
      authStatus: 'signed-out',
      authUser: null,
      entitlement: null,
      entitlementLoaded: true,
      currentRootId: null,
      view: 'home',
      askOpen: false,
      parentGateAt: null,
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
    useWondralStore.setState({
      authStatus: snapshot.authStatus,
      authUser: snapshot.authUser,
      entitlement: snapshot.entitlement,
      entitlementLoaded: snapshot.entitlementLoaded,
      currentRootId: snapshot.currentRootId,
      view: snapshot.view,
    });
  });

  async function show(node: React.ReactNode) {
    await act(async () => {
      reactRoot?.render(node);
    });
  }

  it('keeps account taps off home, a card, Daily, and Root Rush', async () => {
    expect(showAccountChrome('home')).toBe(false);
    expect(showAccountChrome('deck')).toBe(false);
    expect(showAccountChrome('quiz')).toBe(false);
    expect(showAccountChrome('daily')).toBe(false);
    expect(showAccountChrome('paywall')).toBe(true);
    expect(showAccountChrome('grownups')).toBe(true);

    await show(<App />);
    expect(buttons()).toContain('For grown-ups');
    expect(buttons()).not.toContain('Sign in');
    expect(buttons()).not.toContain('Go Premium');

    for (const view of ['deck', 'quiz', 'daily'] as const) {
      await act(async () => {
        useWondralStore.setState({ view, currentRootId: rootId(ROOTS[0]!), askOpen: false });
      });
      await show(<App />);
      const labels = buttons();
      expect(labels.some((label) => label === 'Sign in'), view).toBe(false);
      expect(labels.some((label) => label === 'Go Premium'), view).toBe(false);
      expect(labels.some((label) => label === 'Sign out'), view).toBe(false);
      expect(labels.some((label) => label === 'Dashboard'), view).toBe(false);
      expect(labels.some((label) => label === 'For grown-ups'), view).toBe(false);
      expect(labels.some((label) => /Wondral/.test(label)), view).toBe(true);
    }
  });

  it('hides the parent dashboard while a signed-in kid is on home or a card', async () => {
    useWondralStore.setState({
      authStatus: 'authenticated',
      authUser: { id: 'parent', email: 'parent@example.com', isAnonymous: false },
      view: 'home',
    });
    await show(<App />);
    expect(buttons()).not.toContain('Dashboard');
    expect(buttons()).not.toContain('Sign out');
    expect(buttons()).toContain('For grown-ups');

    await act(async () => {
      useWondralStore.setState({ view: 'deck', currentRootId: rootId(ROOTS[0]!) });
    });
    await show(<App />);
    expect(buttons()).not.toContain('Dashboard');
    expect(buttons()).not.toContain('Sign out');
    expect(buttons()).not.toContain('For grown-ups');
  });

  it('shows Ask a grown-up on a premium root, with no purchase path', async () => {
    useWondralStore.setState({ currentRootId: rootId(paid), view: 'deck' });
    await show(<Deck />);
    const ask = document.querySelector('[data-screen="ask-grownup"]');
    expect(ask).toBeTruthy();
    expect(ask?.textContent).toContain('Ask a grown-up');
    expect(ask?.textContent).toContain('Keep playing');
    expect(ask?.textContent).not.toMatch(/\$|Choose|Sign in|Go Premium|mailto/);
    expect(ask?.querySelector('a')).toBeNull();
  });
});

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

  it('keeps sign-in on home and takes it off a card, Daily, and Root Rush', async () => {
    expect(showAccountChrome('home')).toBe(true);
    expect(showAccountChrome('deck')).toBe(false);
    expect(showAccountChrome('quiz')).toBe(false);
    expect(showAccountChrome('daily')).toBe(false);
    expect(showAccountChrome('paywall')).toBe(true);

    await show(<App />);
    expect(buttons().some((label) => label === 'Sign in')).toBe(true);

    for (const view of ['deck', 'quiz', 'daily'] as const) {
      useWondralStore.setState({ view, currentRootId: rootId(ROOTS[0]!) });
      await show(<App />);
      const labels = buttons();
      expect(labels.some((label) => label === 'Sign in'), view).toBe(false);
      expect(labels.some((label) => label === 'Go Premium'), view).toBe(false);
      expect(labels.some((label) => label === 'Sign out'), view).toBe(false);
      expect(labels.some((label) => /Wondral/.test(label)), view).toBe(true);
    }
  });

  it('hides the parent dashboard while a signed-in kid is on a card', async () => {
    useWondralStore.setState({
      authStatus: 'authenticated',
      authUser: { id: 'parent', email: 'parent@example.com', isAnonymous: false },
      view: 'home',
    });
    await show(<App />);
    expect(buttons()).toContain('Dashboard');
    expect(buttons()).toContain('Sign out');

    useWondralStore.setState({ view: 'deck', currentRootId: rootId(ROOTS[0]!) });
    await show(<App />);
    expect(buttons()).not.toContain('Dashboard');
    expect(buttons()).not.toContain('Sign out');
  });

  it('makes Back the obvious tap on a premium root, and keeps the grown-up unlock', async () => {
    useWondralStore.setState({ currentRootId: rootId(paid), view: 'deck' });
    await show(<Deck />);
    const labels = buttons();
    expect(labels[0]).toBe('Back');
    expect(labels).toContain('Ask a grown-up to unlock');
    expect(labels).not.toContain('Go Premium');
    expect(document.body.textContent).toContain('A grown-up can unlock it.');
  });
});

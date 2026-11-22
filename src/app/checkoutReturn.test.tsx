/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));

vi.mock('../core/checkout', () => ({
  consumeCheckoutReturn: consume,
  pollEntitlementUnlock: vi.fn(async () => false),
}));

import { App } from './App';
import { useWondralStore } from './store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('checkout return converts a parent', () => {
  let reactRoot: ReactRoot | null = null;
  let host: HTMLDivElement | null = null;
  const snapshot = useWondralStore.getState();

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    consume.mockReset();
    useWondralStore.setState({
      ...snapshot,
      view: 'home',
      parentGateAt: null,
      checkoutNotice: null,
      askOpen: false,
      authStatus: 'signed-out',
      authUser: null,
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
    useWondralStore.setState(snapshot, true);
  });

  async function show() {
    await act(async () => {
      reactRoot?.render(<App />);
      await Promise.resolve();
    });
  }

  it('lands a paid parent on the gated dashboard, with no price on the gate', async () => {
    consume.mockReturnValue({ status: 'success', unlocked: Promise.resolve(true) });
    await show();
    expect(useWondralStore.getState().view).toBe('dashboard');
    expect(useWondralStore.getState().checkoutNotice).toBe('unlocked');
    expect(document.querySelector('[data-screen="parent-gate"]')).toBeTruthy();
    expect(document.body.textContent).toContain('Payment received');
    expect(document.body.textContent).not.toContain('$');
    expect(document.body.textContent).not.toContain('Choose');
  });

  it('stays on home when checkout is cancelled, and says there was no charge', async () => {
    consume.mockReturnValue({ status: 'cancel' });
    await show();
    expect(useWondralStore.getState().view).toBe('home');
    expect(useWondralStore.getState().checkoutNotice).toBe('cancelled');
    expect(document.body.textContent).toContain('haven’t been charged');
    expect(document.querySelector('[data-screen="parent-gate"]')).toBeNull();
    expect(document.body.textContent).not.toContain('$');
  });
});

/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SINGLE_SCHOLAR } from '../core/singleScholar';
import type { StoredReceipt } from '../core/receipts';

const row: StoredReceipt = {
  id: 'receipt-1',
  parent_id: 'parent_1',
  checkout_session_id: 'cs_test_1',
  receipt_number: 'WW-ABCD-EFGH',
  stripe_payment_intent_id: 'pi_1',
  purchased_at: '2026-03-15T00:00:00.000Z',
  term_start: '2026-03-15',
  item: SINGLE_SCHOLAR.item,
  base_cents: 4900,
  discount_cents: 0,
  tax_cents: 0,
  fee_cents: 0,
  total_paid_cents: 4900,
  card_brand: 'Visa',
  card_last4: '4242',
  student_name: null,
};

vi.mock('../core/receipts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/receipts')>();
  return {
    ...actual,
    getLatestReceipt: vi.fn(async () => row),
    saveReceiptStudentName: vi.fn(async (_id: string, name: string) => actual.cleanStudentName(name)),
  };
});

import { App } from '../app/App';
import { useWondralStore } from '../app/store';
import { ReceiptPanel } from './ReceiptPanel';
import { saveReceiptStudentName } from '../core/receipts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function textOf(label: string): string {
  const term = [...document.querySelectorAll('dt')].find((el) => el.textContent === label);
  return term?.nextElementSibling?.textContent ?? '';
}

describe('parent receipt on screen', () => {
  let reactRoot: ReactRoot | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = createRoot(host);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:receipt');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      reactRoot?.unmount();
    });
    host?.remove();
    reactRoot = null;
    host = null;
    vi.restoreAllMocks();
  });

  async function renderPanel() {
    await act(async () => {
      reactRoot?.render(<ReceiptPanel row={row} />);
    });
  }

  it('prints the purchase without an address, and keeps tap targets at 44px', async () => {
    await renderPanel();
    const screen = document.querySelector('[data-screen="parent-receipt"]');
    expect(screen).toBeTruthy();
    expect(textOf('Seller')).toBe('Thompson Education Apps LLC');
    expect(textOf('Brand')).toBe('Wondral Words');
    expect(textOf('Receipt')).toBe('WW-ABCD-EFGH');
    expect(textOf('Purchase date')).toBe('03/15/2026');
    expect(textOf('Item')).toBe(SINGLE_SCHOLAR.item);
    expect(textOf('Service term')).toBe('03/15/2026 to 03/15/2027');
    expect(textOf('Base price')).toBe('$49.00');
    expect(textOf('Total paid')).toBe('$49.00');
    expect(textOf('Payment method')).toBe('Visa ****4242');
    expect(textOf('Status')).toBe('Paid in full');
    expect(textOf('Contact')).toBe('support@wondral.app');
    expect(textOf('Student name')).toBe('');
    const text = screen?.textContent ?? '';
    expect(text).not.toMatch(/mailing address|EIN|street/i);
    expect(text).not.toMatch(/\d{5,}/);

    const buttons = [...(screen?.querySelectorAll('button') ?? [])];
    expect(buttons.map((button) => button.textContent)).toEqual(['Save student name', 'Download PDF']);
    for (const button of buttons) expect(button.className).not.toContain('btn-sm');

    const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');
    expect(css).toMatch(/\.ww-receipt \.ww-input\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.ww-receipt-actions \.btn\s*\{[^}]*min-height:\s*44px/);
  });

  it('saves an optional student name and downloads a PDF of the same receipt', async () => {
    await renderPanel();
    const input = document.querySelector('#ww-receipt-student');
    if (!(input instanceof HTMLInputElement)) throw new Error('missing student name');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, 'Ada');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const save = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Save student name');
    await act(async () => {
      save?.click();
    });
    expect(saveReceiptStudentName).toHaveBeenCalledWith('receipt-1', 'Ada');
    expect(textOf('Student name')).toBe('Ada');

    const links: HTMLAnchorElement[] = [];
    const original = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string, options?: ElementCreationOptions) => {
      const el = original(tag, options);
      if (String(tag).toLowerCase() === 'a') links.push(el as HTMLAnchorElement);
      return el;
    }) as typeof document.createElement);
    const download = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Download PDF');
    await act(async () => {
      download?.click();
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(links.at(-1)?.download).toBe('Wondral-Words-WW-ABCD-EFGH.pdf');
  });
});

describe('a kid does not see the receipt', () => {
  let reactRoot: ReactRoot | null = null;
  let host: HTMLDivElement | null = null;
  const snapshot = useWondralStore.getState();

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    window.history.replaceState({}, '', '/');
    useWondralStore.setState({
      ...snapshot,
      authStatus: 'authenticated',
      authUser: { id: 'parent_1', email: 'parent@example.com', isAnonymous: false },
      entitlementLoaded: true,
      view: 'home',
      parentGateAt: null,
      askOpen: false,
      checkoutNotice: null,
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
      await Promise.resolve();
    });
  }

  it('hides the purchase behind the grown-up gate', async () => {
    await show();
    expect(document.body.textContent).not.toContain('Thompson Education');
    expect(document.body.textContent).not.toContain('$49');
    expect(document.querySelector('[data-screen="parent-receipt"]')).toBeNull();

    await act(async () => {
      useWondralStore.setState({ view: 'dashboard' });
    });
    await show();
    expect(document.querySelector('[data-screen="parent-gate"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain('$49');
    expect(document.body.textContent).not.toContain('Visa');
    expect(document.querySelector('[data-screen="parent-receipt"]')).toBeNull();

    await act(async () => {
      useWondralStore.setState({ parentGateAt: Date.now() });
    });
    await show();
    expect(document.querySelector('[data-screen="parent-receipt"]')).toBeTruthy();
    expect(document.body.textContent).toContain('Visa ****4242');
    expect(document.body.textContent).toContain('$49.00');
  });
});

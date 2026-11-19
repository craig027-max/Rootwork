/** @vitest-environment happy-dom */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { act } from 'react';
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RefundPolicy } from './RefundPolicy';
import { REFUND_POLICY } from './refundPolicyCopy';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('refund policy draft', () => {
  let container: HTMLDivElement;
  let root: ReactRoot;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows the review wording', () => {
    act(() => {
      root.render(<RefundPolicy />);
    });
    const text = container.textContent ?? '';
    expect(text).toContain(REFUND_POLICY.title);
    expect(text).toContain(REFUND_POLICY.seller);
    expect(text).toContain(REFUND_POLICY.prepaid);
    expect(text).toContain(REFUND_POLICY.term);
    expect(text.toLowerCase()).not.toContain('cancel');
    expect(text.toLowerCase()).not.toContain('stops the next');
    expect(text).toContain(REFUND_POLICY.contact);
    expect(text).toContain('Draft for review');
    expect(container.querySelector('a[href="mailto:support@wondral.app"]')).not.toBeNull();
  });

  it('is not linked from any other screen', () => {
    const linked = sourceFiles('src').filter((file) => {
      if (file.endsWith(`${join('src', 'app', 'routes.ts')}`)) return false;
      const text = readFileSync(file, 'utf8');
      return (
        text.includes('/refunds') ||
        text.includes("setView('refunds')") ||
        text.includes('setView("refunds")')
      );
    });
    expect(linked).toEqual([]);
  });
});

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) out.push(path);
  }
  return out;
}

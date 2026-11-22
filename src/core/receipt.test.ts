import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PAID_IN_FULL,
  SELLER_BRAND,
  SELLER_LEGAL_NAME,
  SINGLE_STUDENT_ANNUAL_ITEM,
  SUPPORT_EMAIL,
  buildReceipt,
  formatCardLast4,
  termEndOneYearAfter,
  type CheckoutRecord,
} from './receipt';
import { pdfTextLines, receiptToPdf } from './receiptPdf';
import { sampleCheckoutRecord, sampleReceiptPdf } from './receiptSample';

function record(overrides: Partial<CheckoutRecord> = {}): CheckoutRecord {
  return { ...sampleCheckoutRecord(), receiptNumber: 'RW-1001', studentName: 'Ada', ...overrides };
}

function textOf(bytes: Uint8Array): string {
  return pdfTextLines(bytes).join('\n');
}

describe('receipt from a checkout record', () => {
  it('prints every field a parent needs, with the card as brand plus last 4', () => {
    const text = textOf(receiptToPdf(buildReceipt(record())));
    expect(text).toContain(SELLER_LEGAL_NAME);
    expect(text).toContain(SELLER_BRAND);
    expect(text).not.toMatch(/rootwork/i);
    expect(SINGLE_STUDENT_ANNUAL_ITEM).toBe(
      'Wondral Words — 1-year single-student educational software subscription',
    );
    expect(text).toContain('Receipt RW-1001');
    expect(text).toContain(`Item ${SINGLE_STUDENT_ANNUAL_ITEM}`);
    expect(text).toContain('Purchase date 03/15/2026');
    expect(text).toContain('Service term 03/15/2026 to 03/15/2027');
    expect(text).toContain('Base price $49.00');
    expect(text).toContain('Discounts $0.00');
    expect(text).toContain('Tax $0.00');
    expect(text).toContain('Fees $0.00');
    expect(text).toContain('Total paid $49.00');
    expect(text).toContain('Payment method Visa ****4242');
    expect(text).toContain(PAID_IN_FULL);
    expect(text).toContain('Student name Ada');
    expect(text).toContain(`Contact ${SUPPORT_EMAIL}`);
    expect(text).not.toMatch(/mailing address|EIN/);
    expect(text).not.toMatch(/\d{5,}/);
  });

  it('formats the purchase date as MM/DD/YYYY and ends the term one year later', () => {
    const built = buildReceipt(
      record({ purchasedAt: '2026-01-05T18:30:00.000Z', termStart: '2026-01-05' }),
    );
    expect(built.purchaseDate).toBe('01/05/2026');
    expect(built.termStart).toBe('01/05/2026');
    expect(built.termEnd).toBe('01/05/2027');
    expect(termEndOneYearAfter('2026-03-15')).toBe('03/15/2027');
    expect(built.purchaseDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('keeps a leap-day term inside the anniversary month', () => {
    expect(termEndOneYearAfter('2024-02-29')).toBe('02/28/2025');
  });

  it('leaves the student name blank until a parent fills it in', () => {
    const built = buildReceipt(record({ studentName: '   ' }));
    expect(built.studentName).toBeNull();
    expect(textOf(receiptToPdf(built))).toContain('Student name \n');
  });

  it('shows discounts, tax, and fees in the total', () => {
    const built = buildReceipt(
      record({ baseCents: 4900, discountCents: 500, taxCents: 100, feeCents: 50, totalPaidCents: 4550 }),
    );
    expect(built.basePrice).toBe('$49.00');
    expect(built.discounts).toBe('$5.00');
    expect(built.tax).toBe('$1.00');
    expect(built.fees).toBe('$0.50');
    expect(built.totalPaid).toBe('$45.50');
  });

  it('refuses anything other than a brand and the last 4 digits', () => {
    expect(() => formatCardLast4({ brand: 'Visa', last4: '4242424242424242' })).toThrow(/last 4/);
    expect(() => formatCardLast4({ brand: '4242424242424242', last4: '4242' })).toThrow(/last 4/);
    expect(() => formatCardLast4({ brand: 'Visa', last4: '42' })).toThrow(/last 4/);
  });

  it('refuses a total that does not match the lines', () => {
    expect(() => buildReceipt(record({ totalPaidCents: 1 }))).toThrow(/total paid/);
  });
});

describe('sample preview', () => {
  it('is labeled as fake example data and uses the annual single-student item', () => {
    const lines = pdfTextLines(sampleReceiptPdf());
    expect(lines[0]).toContain('SAMPLE');
    expect(lines[0]).toContain('NOT A REAL PURCHASE');
    expect(lines.join('\n')).toContain(SINGLE_STUDENT_ANNUAL_ITEM);
    expect(lines.join('\n')).toContain('SAMPLE-0001');
    expect(lines.join('\n')).not.toMatch(/month/i);
  });

  it('stays off every screen — only a stored receipt is shown', () => {
    const files = sourceFiles('src').filter((file) => !file.endsWith('receiptSample.ts'));
    const linked = files.filter((file) =>
      /from ['"][^'"]*receiptSample['"]|sampleReceiptPdf\(/.test(readFileSync(file, 'utf8')),
    );
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

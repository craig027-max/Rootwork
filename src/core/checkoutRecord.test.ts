import { describe, expect, it } from 'vitest';
import {
  checkoutRecordFromStored,
  receiptInsertFromPaidSession,
  receiptNumberFromSession,
  type PaidSessionAmounts,
} from './checkoutRecord';
import { SINGLE_SCHOLAR, matchesSingleScholarPrice } from './singleScholar';
import { buildReceipt } from './receipt';
import { pdfTextLines, receiptToPdf } from './receiptPdf';

const CREATED = Math.floor(Date.parse('2026-03-15T00:00:00.000Z') / 1000);

function paid(overrides: Partial<PaidSessionAmounts> = {}): PaidSessionAmounts {
  return {
    parentId: 'parent_1',
    sessionId: 'cs_test_parent_1',
    paymentIntentId: 'pi_test_1',
    createdUnix: CREATED,
    currency: 'usd',
    amountSubtotal: 4900,
    amountDiscount: 0,
    amountTax: 0,
    amountShipping: 0,
    amountTotal: 4900,
    cardBrand: 'visa',
    cardLast4: '4242',
    ...overrides,
  };
}

describe('Single Scholar price config', () => {
  it('is one student, $49 once, for one year', () => {
    expect(SINGLE_SCHOLAR).toMatchObject({
      tier: 'single',
      name: 'Single Scholar',
      seats: 1,
      priceCents: 4900,
      currency: 'usd',
      termYears: 1,
      displayPrice: '$49 / year',
    });
    expect(SINGLE_SCHOLAR.item).not.toMatch(/month|family/i);
  });

  it('accepts only an active one-time usd price of 4900 cents', () => {
    expect(
      matchesSingleScholarPrice({
        active: true,
        type: 'one_time',
        currency: 'USD',
        unit_amount: 4900,
      }),
    ).toBe(true);
    expect(
      matchesSingleScholarPrice({ active: true, type: 'recurring', currency: 'usd', unit_amount: 4900 }),
    ).toBe(false);
    expect(
      matchesSingleScholarPrice({ active: true, type: 'one_time', currency: 'usd', unit_amount: 7900 }),
    ).toBe(false);
    expect(
      matchesSingleScholarPrice({ active: false, type: 'one_time', currency: 'usd', unit_amount: 4900 }),
    ).toBe(false);
  });
});

describe('receipt row from a paid session', () => {
  it('stores $49, Visa last 4, and a letter-only receipt number', () => {
    const row = receiptInsertFromPaidSession(paid());
    expect(row.receipt_number).toMatch(/^WW-[A-Z]{4}-[A-Z]{4}$/);
    expect(row).toMatchObject({
      parent_id: 'parent_1',
      base_cents: 4900,
      discount_cents: 0,
      tax_cents: 0,
      fee_cents: 0,
      total_paid_cents: 4900,
      card_brand: 'Visa',
      card_last4: '4242',
      student_name: null,
      term_start: '2026-03-15',
      item: SINGLE_SCHOLAR.item,
    });
    expect(receiptNumberFromSession('cs_test_parent_1')).toBe(row.receipt_number);
    expect(receiptNumberFromSession('cs_test_other')).not.toBe(row.receipt_number);
  });

  it('keeps a discount, tax, and shipping fee in the total', () => {
    const row = receiptInsertFromPaidSession(
      paid({ amountDiscount: 500, amountTax: 100, amountShipping: 50, amountTotal: 4550 }),
    );
    const text = pdfTextLines(
      receiptToPdf(
        buildReceipt(
          checkoutRecordFromStored({
            id: 'r',
            ...row,
            student_name: 'Ada',
          }),
        ),
      ),
    ).join('\n');
    expect(text).toContain('Base price $49.00');
    expect(text).toContain('Discounts $5.00');
    expect(text).toContain('Tax $1.00');
    expect(text).toContain('Fees $0.50');
    expect(text).toContain('Total paid $45.50');
    expect(text).not.toMatch(/mailing address|EIN/);
  });

  it('refuses a charge that is not the $49 price or has no card', () => {
    expect(() => receiptInsertFromPaidSession(paid({ amountSubtotal: 7900, amountTotal: 7900 }))).toThrow(
      /Single Scholar/,
    );
    expect(() => receiptInsertFromPaidSession(paid({ cardLast4: '4242424242424242' }))).toThrow(/last 4/);
    expect(() => receiptInsertFromPaidSession(paid({ currency: 'eur' }))).toThrow(/usd/);
  });
});

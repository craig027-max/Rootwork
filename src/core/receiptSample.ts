/**
 * SAMPLE / PREVIEW ONLY.
 *
 * Obviously fake example data. This module is not imported by the app, the
 * parent area, or any screen a child can reach. There is no checkout record
 * in the database to feed a real receipt yet.
 */
import { SINGLE_STUDENT_ANNUAL_ITEM, buildReceipt, type CheckoutRecord, type Receipt } from './receipt';
import { receiptToPdf } from './receiptPdf';

export const SAMPLE_RECEIPT_NUMBER = 'SAMPLE-0001';

export function sampleCheckoutRecord(): CheckoutRecord {
  return {
    receiptNumber: SAMPLE_RECEIPT_NUMBER,
    purchasedAt: '2026-03-15',
    termStart: '2026-03-15',
    item: SINGLE_STUDENT_ANNUAL_ITEM,
    baseCents: 4900,
    discountCents: 0,
    taxCents: 0,
    feeCents: 0,
    totalPaidCents: 4900,
    card: { brand: 'Visa', last4: '4242' },
    studentName: 'Example Student (fake)',
  };
}

export function sampleReceipt(): Receipt {
  return buildReceipt(sampleCheckoutRecord());
}

export function sampleReceiptPdf(): Uint8Array {
  return receiptToPdf(sampleReceipt(), { sample: true });
}

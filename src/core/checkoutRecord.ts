/**
 * Turn a paid Stripe Checkout session into the row the webhook stores.
 * No Stripe SDK and no network — the webhook passes plain fields in.
 */
import { SINGLE_SCHOLAR } from './singleScholar';
import { buildReceipt, type CheckoutRecord } from './receipt';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const CARD_BRANDS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

/** Stable receipt number. Letters only, so a card number cannot hide in it. */
export function receiptNumberFromSession(sessionId: string): string {
  const id = sessionId.trim();
  if (!id) throw new Error('session id is required');
  const bytes = new TextEncoder().encode(id);
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  let n = hash >>> 0;
  let body = '';
  for (let i = 0; i < 8; i++) {
    body += LETTERS[n % LETTERS.length] ?? 'A';
    const mix = bytes[i % bytes.length] ?? 0;
    n = Math.imul(n ^ mix ^ (i + 0x9e3779b9), 16777619) >>> 0;
  }
  return `WW-${body.slice(0, 4)}-${body.slice(4)}`;
}

export interface PaidSessionAmounts {
  parentId: string;
  sessionId: string;
  paymentIntentId: string | null;
  /** Stripe `session.created`, unix seconds. */
  createdUnix: number;
  currency: string | null;
  amountSubtotal: number | null;
  amountDiscount: number | null;
  amountTax: number | null;
  /** Customer-facing shipping. This product has none; a non-zero value is a fee line. */
  amountShipping: number | null;
  amountTotal: number | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

/** Columns written by the webhook. Parents cannot insert this. */
export interface ReceiptInsert {
  parent_id: string;
  checkout_session_id: string;
  receipt_number: string;
  stripe_payment_intent_id: string | null;
  purchased_at: string;
  term_start: string;
  item: string;
  base_cents: number;
  discount_cents: number;
  tax_cents: number;
  fee_cents: number;
  total_paid_cents: number;
  card_brand: string;
  card_last4: string;
  student_name: null;
}

/** A receipts row the parent is allowed to read. */
export interface StoredReceipt {
  id: string;
  parent_id: string;
  checkout_session_id: string;
  receipt_number: string;
  stripe_payment_intent_id: string | null;
  purchased_at: string;
  term_start: string;
  item: string;
  base_cents: number;
  discount_cents: number;
  tax_cents: number;
  fee_cents: number;
  total_paid_cents: number;
  card_brand: string;
  card_last4: string;
  student_name: string | null;
}

function cents(label: string, value: number | null): number {
  if (value == null || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} is missing`);
  }
  return value;
}

export function displayCardBrand(raw: string): string {
  const key = raw.trim().toLowerCase();
  const known = CARD_BRANDS[key];
  if (known) return known;
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Build the receipt row for a paid Single Scholar checkout.
 * Throws if the money, currency, or card is not something we can print.
 */
export function receiptInsertFromPaidSession(input: PaidSessionAmounts): ReceiptInsert {
  if (!input.parentId.trim()) throw new Error('parent id is required');
  if (!input.sessionId.trim()) throw new Error('session id is required');
  if (!Number.isFinite(input.createdUnix)) throw new Error('paid session has no purchase date');
  if (input.currency?.toLowerCase() !== SINGLE_SCHOLAR.currency) {
    throw new Error('paid session currency is not usd');
  }
  const base = cents('amount_subtotal', input.amountSubtotal);
  if (base !== SINGLE_SCHOLAR.priceCents) {
    throw new Error('paid session is not the Single Scholar price');
  }
  const discount = cents('amount_discount', input.amountDiscount);
  const tax = cents('amount_tax', input.amountTax);
  const fee = cents('amount_shipping', input.amountShipping);
  const total = cents('amount_total', input.amountTotal);
  if (!input.cardBrand?.trim() || !input.cardLast4) {
    throw new Error('paid session has no card');
  }
  const purchasedAt = new Date(input.createdUnix * 1000).toISOString();
  const record: CheckoutRecord = {
    receiptNumber: receiptNumberFromSession(input.sessionId),
    purchasedAt,
    termStart: purchasedAt.slice(0, 10),
    item: SINGLE_SCHOLAR.item,
    baseCents: base,
    discountCents: discount,
    taxCents: tax,
    feeCents: fee,
    totalPaidCents: total,
    card: { brand: displayCardBrand(input.cardBrand), last4: input.cardLast4 },
  };
  // Rejects a total that does not match, and a card that is not brand + last 4.
  buildReceipt(record);
  return {
    parent_id: input.parentId,
    checkout_session_id: input.sessionId,
    receipt_number: record.receiptNumber,
    stripe_payment_intent_id: input.paymentIntentId,
    purchased_at: purchasedAt,
    term_start: record.termStart,
    item: record.item,
    base_cents: base,
    discount_cents: discount,
    tax_cents: tax,
    fee_cents: fee,
    total_paid_cents: total,
    card_brand: record.card.brand,
    card_last4: record.card.last4,
    student_name: null,
  };
}

export function checkoutRecordFromStored(row: StoredReceipt): CheckoutRecord {
  return {
    receiptNumber: row.receipt_number,
    purchasedAt: row.purchased_at,
    termStart: row.term_start.slice(0, 10),
    item: row.item,
    baseCents: row.base_cents,
    discountCents: row.discount_cents,
    taxCents: row.tax_cents,
    feeCents: row.fee_cents,
    totalPaidCents: row.total_paid_cents,
    card: { brand: row.card_brand, last4: row.card_last4 },
    studentName: row.student_name ?? undefined,
  };
}

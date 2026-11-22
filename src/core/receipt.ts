/**
 * Receipt built from a checkout record.
 *
 * The webhook stores one receipts row per paid Checkout session (receipt
 * number, amounts, card brand, last 4). The parent dashboard prints that row.
 * The labeled sample in receiptSample.ts stays off every screen.
 *
 * There is no monthly plan. The item is the annual single-student subscription.
 * Seller lines are the company name and the support address — never a mailing
 * address or an EIN.
 */
import { SINGLE_SCHOLAR } from './singleScholar';

export const SELLER_LEGAL_NAME = 'Thompson Education Apps LLC';
export const SELLER_BRAND = 'Wondral Words';
export const SUPPORT_EMAIL = 'support@wondral.app';

export const SINGLE_STUDENT_ANNUAL_ITEM = SINGLE_SCHOLAR.item;

export const PAID_IN_FULL = 'Paid in full';

export interface CardLast4 {
  /** Network name only, such as Visa. Never a card number. */
  brand: string;
  /** Exactly four digits. */
  last4: string;
}

/** What a future checkout record must supply before a real receipt can print. */
export interface CheckoutRecord {
  receiptNumber: string;
  /** Purchase instant. A leading YYYY-MM-DD is the purchase date. */
  purchasedAt: string;
  /** Service term start, YYYY-MM-DD. The term ends one year later. */
  termStart: string;
  item: string;
  baseCents: number;
  discountCents: number;
  taxCents: number;
  feeCents: number;
  totalPaidCents: number;
  card: CardLast4;
  /** Optional. A parent can set this before the PDF is built. */
  studentName?: string;
}

export interface Receipt {
  seller: typeof SELLER_LEGAL_NAME;
  brand: typeof SELLER_BRAND;
  supportEmail: typeof SUPPORT_EMAIL;
  receiptNumber: string;
  item: string;
  purchaseDate: string;
  termStart: string;
  termEnd: string;
  basePrice: string;
  discounts: string;
  tax: string;
  fees: string;
  totalPaid: string;
  paymentMethod: string;
  paidInFull: typeof PAID_IN_FULL;
  studentName: string | null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function readIsoDate(iso: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) throw new Error('date must start with YYYY-MM-DD');
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new Error('date is not a real calendar day');
  }
  return { y, m, d };
}

/** MM/DD/YYYY, zero-padded, year included. */
export function formatMMDDYYYY(iso: string): string {
  const { y, m, d } = readIsoDate(iso);
  return `${pad2(m)}/${pad2(d)}/${y}`;
}

/** The service term ends on the same month and day, one year after it starts. */
export function termEndOneYearAfter(termStart: string): string {
  const { y, m, d } = readIsoDate(termStart);
  const anniversary = new Date(Date.UTC(y + 1, m - 1, d));
  if (anniversary.getUTCMonth() !== m - 1) {
    const lastDay = new Date(Date.UTC(y + 1, m, 0));
    return formatMMDDYYYY(
      `${lastDay.getUTCFullYear()}-${pad2(lastDay.getUTCMonth() + 1)}-${pad2(lastDay.getUTCDate())}`,
    );
  }
  return formatMMDDYYYY(`${y + 1}-${pad2(m)}-${pad2(d)}`);
}

export function formatUsdFromCents(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error('money must be a non-negative whole number of cents');
  return `$${Math.floor(cents / 100)}.${pad2(cents % 100)}`;
}

/** Brand plus the last four digits. A longer number is refused. */
export function formatCardLast4(card: CardLast4): string {
  const brand = card.brand.trim();
  if (!/^[A-Za-z][A-Za-z .'-]{0,24}$/.test(brand)) {
    throw new Error('payment method is a card brand plus the last 4 digits');
  }
  if (!/^\d{4}$/.test(card.last4)) {
    throw new Error('payment method is a card brand plus the last 4 digits');
  }
  return `${brand} ****${card.last4}`;
}

export function buildReceipt(record: CheckoutRecord): Receipt {
  const number = record.receiptNumber.trim();
  if (!number) throw new Error('receipt number is required');
  const item = record.item.trim();
  if (!item) throw new Error('item is required');
  for (const cents of [
    record.baseCents,
    record.discountCents,
    record.taxCents,
    record.feeCents,
    record.totalPaidCents,
  ]) {
    if (!Number.isInteger(cents) || cents < 0) throw new Error('money must be a non-negative whole number of cents');
  }
  if (record.discountCents > record.baseCents) throw new Error('discount cannot exceed the base price');
  const expected = record.baseCents - record.discountCents + record.taxCents + record.feeCents;
  if (expected !== record.totalPaidCents) {
    throw new Error('total paid must equal base price minus discounts plus tax and fees');
  }
  const student = record.studentName?.trim() ?? '';
  return {
    seller: SELLER_LEGAL_NAME,
    brand: SELLER_BRAND,
    supportEmail: SUPPORT_EMAIL,
    receiptNumber: number,
    item,
    purchaseDate: formatMMDDYYYY(record.purchasedAt),
    termStart: formatMMDDYYYY(record.termStart),
    termEnd: termEndOneYearAfter(record.termStart),
    basePrice: formatUsdFromCents(record.baseCents),
    discounts: formatUsdFromCents(record.discountCents),
    tax: formatUsdFromCents(record.taxCents),
    fees: formatUsdFromCents(record.feeCents),
    totalPaid: formatUsdFromCents(record.totalPaidCents),
    paymentMethod: formatCardLast4(record.card),
    paidInFull: PAID_IN_FULL,
    studentName: student || null,
  };
}

/** Lines a parent would read on the receipt, in order. */
export function receiptLines(receipt: Receipt): string[] {
  return [
    receipt.seller,
    receipt.brand,
    `Receipt ${receipt.receiptNumber}`,
    `Purchase date ${receipt.purchaseDate}`,
    `Item ${receipt.item}`,
    `Service term ${receipt.termStart} to ${receipt.termEnd}`,
    `Base price ${receipt.basePrice}`,
    `Discounts ${receipt.discounts}`,
    `Tax ${receipt.tax}`,
    `Fees ${receipt.fees}`,
    `Total paid ${receipt.totalPaid}`,
    `Payment method ${receipt.paymentMethod}`,
    receipt.paidInFull,
    `Student name ${receipt.studentName ?? ''}`,
    `Contact ${receipt.supportEmail}`,
  ];
}

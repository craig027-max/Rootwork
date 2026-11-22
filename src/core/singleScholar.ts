/**
 * Single Scholar — the only plan. $49 once, one student, one year.
 *
 * The amount Stripe actually charges is the Price behind STRIPE_PRICE_SINGLE.
 * Checkout refuses that Price unless it is this one-time USD amount. This file
 * does not create a Stripe price and must not be pointed at a live key.
 */
export const SINGLE_SCHOLAR = {
  tier: 'single',
  name: 'Single Scholar',
  seats: 1,
  priceCents: 4900,
  currency: 'usd',
  termYears: 1,
  displayPrice: '$49 / year',
  item: 'Wondral Words — 1-year single-student educational software subscription',
} as const;

/** True when a retrieved Stripe Price is the Single Scholar charge. */
export function matchesSingleScholarPrice(price: {
  active: boolean;
  type: string;
  currency: string;
  unit_amount: number | null;
}): boolean {
  return (
    price.active === true &&
    price.type === 'one_time' &&
    price.currency.toLowerCase() === SINGLE_SCHOLAR.currency &&
    price.unit_amount === SINGLE_SCHOLAR.priceCents
  );
}

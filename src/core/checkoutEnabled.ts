/**
 * Purchases stay off until Stripe is actually set up. The build flag is the
 * string "true" only — anything else, including unset, is off. The Pages
 * Function checks its own CHECKOUT_ENABLED the same way.
 */
export function checkoutEnabled(): boolean {
  return import.meta.env.VITE_CHECKOUT_ENABLED === 'true';
}

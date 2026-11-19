/**
 * What a parent should see on a card statement: WONDRAL WORDS.
 *
 * This Checkout session is card-only. Stripe returns an error if
 * payment_intent_data.statement_descriptor is set on a card charge, so the
 * session sends this value as statement_descriptor_suffix instead. The
 * dashboard prefix plus "*" plus this suffix must stay within 22 characters.
 */
export const STATEMENT_DESCRIPTOR = 'WONDRAL WORDS';

const FORBIDDEN = /[<>\\'"*]/;

/** Stripe's statement text: 5–22 characters, one letter, none of < > \ ' " *. */
export function assertStatementDescriptor(value: string): string {
  if (
    value.length < 5 ||
    value.length > 22 ||
    !/[A-Za-z]/.test(value) ||
    FORBIDDEN.test(value)
  ) {
    throw new Error('invalid_statement_descriptor');
  }
  return value;
}

# Go-live checklist — Wondral Words checkout

Stripe is not set up. Checkout is **off** until both flags are the string `true`:

- Browser build: `VITE_CHECKOUT_ENABLED=true`
- Pages Function: `CHECKOUT_ENABLED=true`

With either flag omitted, the parent paywall says “Purchases aren’t open yet” and has no buy button, and `startCheckout` plus `/api/stripe/create-checkout-session` refuse.

The only plan is **Single Scholar, $49 for one year, one student**. Paid plans are nonrefundable. Access ends automatically after that year. There is no renewal and no Family plan.

Do these in order. Do not flip the flags until the test-mode purchase works.

1. **Stripe account.** Craig creates the Stripe account himself, under the legal entity **Thompson Education Apps LLC**, and completes business verification.
2. **One price.** In Stripe test mode, create one product and one one-time price: Single Scholar, **$49**, one year of access for one student. Copy the price id (`price_…`).
3. **Cloudflare Pages secrets** (Production, and Preview if you test there). Mark the secret keys as Secret:
   - `STRIPE_SECRET_KEY` (`sk_test_…` first, then `sk_live_…`)
   - `STRIPE_PRICE_SINGLE` (the price id from step 2)
   - `STRIPE_WEBHOOK_SECRET` (step 4)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (these are baked into the browser build)
4. **Webhook.** In Stripe, add an endpoint `https://words.wondral.app/api/stripe/webhook` for `checkout.session.completed`, `charge.refunded`, and `charge.dispute.created`. Copy the `whsec_…` signing secret into `STRIPE_WEBHOOK_SECRET`. The product is nonrefundable; those last two events only matter if a charge is refunded or disputed in the Stripe dashboard, so access ends with the money.
5. **Supabase.** Apply `supabase/migrations/` to the Wondral Words project, including `entitlements` and `stripe_events`. Confirm a parent can read their own entitlement and cannot write it.
6. **Receipts, still to build.** The PDF generator is not on any screen. A real receipt needs a stored checkout record (receipt number, amount, discount, tax, fees, card brand, last 4) and a parent-area download with an optional student name. Do not put a mailing address or EIN on the receipt.
7. **Flags.** Set `CHECKOUT_ENABLED=true` and `VITE_CHECKOUT_ENABLED=true`, then redeploy so the browser bundle picks up the Vite flag.
8. **Test mode, end to end.** Sign in as a parent, pass the grown-up check, choose Single Scholar, pay with a Stripe test card, and confirm the entitlement row is `tier=single`, `seats=1`, `status=active`, with `expires_at` one year out. Confirm a kid still cannot see a price or a buy button.
9. **Privacy and Terms.** Re-read both pages on `words.wondral.app` against what the app actually stores and charges. The public refund page stays unmerged until Craig accepts its wording.
10. **Kids category.** This is a website, not an app-store listing. Before any store work later, review the kids-category rules. Do not add a store listing, a native wrapper, or in-app purchase as part of turning this flag on.

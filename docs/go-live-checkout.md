# Go-live checklist — Wondral Words checkout

Stripe is not set up. Checkout is **off** until both flags are the string `true`:

- Browser build: `VITE_CHECKOUT_ENABLED=true`
- Pages Function: `CHECKOUT_ENABLED=true`

With either flag omitted, the parent paywall says “Purchases aren’t open yet” and has no buy button, and `startCheckout` plus `/api/stripe/create-checkout-session` refuse.

The only plan is **Single Scholar, $49 for one year, one student**. The code for that amount lives in `src/core/singleScholar.ts`. Checkout loads `STRIPE_PRICE_SINGLE` and refuses it unless the Stripe Price is active, one-time, `usd`, and **4900** cents. Paid plans are nonrefundable. Access ends automatically after that year. There is no renewal and no Family plan.

Do these in order. Do not flip the flags until a real test-mode purchase works. Nothing in this list creates a live price or uses a live key.

1. **Stripe account.** Craig creates the Stripe account himself, under the legal entity **Thompson Education Apps LLC**, and completes business verification. In Business details, set the public statement descriptor to **WONDRAL WORDS**.
   - [ ] Craig: create the account and finish verification. The agent cannot do this.

2. **One price.** In the Stripe Dashboard, turn **Test mode** on. Product catalog → Add product.
   - Name: **Wondral Words**
   - Description: “Wondral Words — 1-year single-student educational software subscription.”
   - Price: **$49.00 USD**, **One time** (not recurring). Do not add a second price.
   - Copy the price id (`price_…`). That id is test-mode only.
   - [x] Code: Single Scholar is the only plan, and checkout refuses any other Price.
   - [ ] Craig: create that test-mode Price and keep the `price_…` id for step 4.

3. **Card statement descriptor.** This Checkout session accepts cards only. Stripe returns an error if `payment_intent_data.statement_descriptor` is set on a card charge, so the code sends `statement_descriptor_suffix` = `WONDRAL WORDS` (12 characters; the checker rejects anything outside 5–22 characters or containing `< > \ ' " *`). On a card statement that suffix is joined to the dashboard prefix with a `*`, and the whole line must be 22 characters or fewer. Set the shortened descriptor (prefix) to `WW`, which shows as `WW*WONDRAL WORDS`.
   - [x] Code: sessions send the suffix and do not send `statement_descriptor`.
   - [ ] Craig: in Stripe test mode, Settings → Public details, set the shortened descriptor to `WW`.

4. **Cloudflare Pages secrets** (Production, and Preview if you test there). Mark the secret keys as Secret. Leave both checkout flags **unset**.
   - `STRIPE_SECRET_KEY` — `sk_test_…` only, until a later decision to go live
   - `STRIPE_PRICE_SINGLE` — the test-mode price id from step 2
   - `STRIPE_WEBHOOK_SECRET` — the `whsec_…` from step 5
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (these are baked into the browser build)
   - [ ] Craig: set those secrets. Do **not** set `CHECKOUT_ENABLED` or `VITE_CHECKOUT_ENABLED`.

5. **Webhook.** In Stripe test mode, Developers → Webhooks → Add endpoint.
   - URL: `https://words.wondral.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`
   - Copy the `whsec_…` signing secret into `STRIPE_WEBHOOK_SECRET`.
   - The handler checks the signature with Web Crypto and refuses a secret that does not start with `whsec_`. It claims `stripe_events.event_id` first, so a retry is an ack and not a second grant. A paid session also writes one `receipts` row. A full refund or a dispute sets the entitlement to `refunded`.
   - [x] Code: signature check, idempotent claim, grant, receipt insert, refund and dispute revoke. Covered with mocks, including one test that uses Stripe’s real signing code.
   - [ ] Craig: add the test-mode endpoint and save the signing secret. The product is nonrefundable; those last two events only matter if a charge is refunded or disputed in the Stripe dashboard, so access ends with the money.

6. **Supabase.** Apply `supabase/migrations/` to the Wondral Words project, including `entitlements`, `stripe_events`, and `receipts` (`20261122000001_receipts.sql`). Confirm a parent can read their own entitlement and their own receipt, can set only `student_name` on a receipt, and cannot insert either table.
   - [x] Code: migrations are in the repo. Receipts have no address and no EIN column.
   - [ ] Craig: `supabase link` to the Wondral Words project, then `supabase db push` (or paste the SQL files in order). This has not been applied from here — there are no project credentials in this environment.

7. **Receipts.** A paid Checkout session stores receipt number, amount, discount, tax, fee, card brand, and last 4. The parent dashboard (behind the grown-up gate) shows that receipt and downloads a one-page PDF. The student name is optional and is the only field a parent can edit. Seller line is Thompson Education Apps LLC. Support is support@wondral.app. No mailing address and no EIN.
   - [x] Code: webhook insert, parent screen, PDF download, tests.
   - [ ] Craig: this shows a real receipt only after step 6 is applied and a test purchase in step 9 writes a row. Purchases made before the migration have no receipt row.

8. **Flags.** Leave them off.
   - [x] `CHECKOUT_ENABLED` and `VITE_CHECKOUT_ENABLED` are still unset in `.env.example` and `.dev.vars.example`.
   - [ ] Craig: set both to the string `true` only after step 9 passes, then redeploy so the browser bundle picks up the Vite flag.

9. **Test mode, end to end.** Sign in as a parent, pass the grown-up check, choose Single Scholar, pay with Stripe’s test card `4242 4242 4242 4242` (any future expiry, any CVC, any postal code), and confirm the entitlement row is `tier=single`, `seats=1`, `status=active`, with `expires_at` one year out. Open the parent dashboard and confirm the receipt shows $49.00, Visa, and last 4 `4242`. Confirm a kid still cannot see a price or a buy button — the receipt sits behind the same grown-up gate as the paywall.
   - [x] Code path, with mocks (no test key is available here): create session → `checkout.session.completed` → entitlement + receipt PDF. A second delivery does not write a second row. A full refund sets `status=refunded`. After a mocked success the app opens the gated parent dashboard.
   - [ ] Craig: run that same path on `words.wondral.app` with the test-mode secrets. The agent did not call Stripe.

10. **Privacy and Terms.** Re-read both pages on `words.wondral.app` against what the app actually stores and charges. The public refund page stays unmerged until Craig accepts its wording.
    - [ ] Craig: re-read Privacy and Terms on the live site.
    - [x] Refund page was not edited and was not merged.

11. **Kids category.** This is a website, not an app-store listing. Before any store work later, review the kids-category rules. Do not add a store listing, a native wrapper, or in-app purchase as part of turning this flag on.
    - [x] No store listing, wrapper, or catalog added.
    - [ ] Craig: revisit only if a store listing is ever proposed. Not part of turning checkout on.

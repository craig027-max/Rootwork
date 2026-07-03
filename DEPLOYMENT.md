# Wondral Words — deployment runbook

Stand up the isolated backend + deploy target for **Wondral Words** (`words.wondral.app`),
mirroring the sibling chemistry app at `chemistry.wondral.app`. These are owner-driven dashboard
actions (Craig) — the app code is already wired to consume them via env vars.

> **ISOLATION IS MANDATORY.** New Supabase project, new Stripe config, new Cloudflare Pages project.
> Never reuse a project, key, or price id from Orbital (Wondral Chemistry) or Piano Surge, and never
> cross data between them.

The app degrades gracefully with **no backend configured** (free Tier 1 works, the "Go Premium" CTA
hides, gated taps land on a calm "accounts coming soon" screen — never an error), so you can deploy
the static app first and wire the backend incrementally.

---

## 1. Supabase (new, isolated project)

1. **Create the project** at <https://app.supabase.com> → New project. Name it `wondral-words`.
   Save the DB password.
2. **Grab the API keys**: Project Settings → API. You need:
   - Project URL (`https://<ref>.supabase.co`)
   - `anon` public key
   - `service_role` secret key (server-only — never ships to the browser)
3. **Run the migrations.** From the repo root, with the Supabase CLI installed (`brew install supabase/tap/supabase`):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   *Why:* applies `supabase/migrations/*.sql` (profiles + auto-create trigger, student_profiles,
   lesson_progress with per-student RLS, entitlements, stripe_events) to the new DB.
   *Alternative (no CLI):* paste each file in `supabase/migrations/` into the SQL Editor in order.
4. **Auth URL config** (Authentication → URL Configuration):
   - **Site URL:** `https://words.wondral.app`
   - **Redirect URLs** (add all):
     ```
     https://words.wondral.app/**
     https://*.pages.dev/**
     http://localhost:3003/**
     ```
   *Why:* Supabase only honours email-link redirects from allowlisted origins; the rest fall back to
   the Site URL.
5. **Local dev:** copy `.env.example` → `.env.local` and fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

## 2. Stripe (new prices + webhook)

1. **Create two products / prices** (test mode while building) in the Stripe Dashboard — one-time
   annual model, matching the two tiers:
   - `Single Scholar` — one learner (recurring **annual** or one-time; the app treats it as a 1-year grant)
   - `Family` — up to 10 students
   Copy each **price id** (`price_…`).
2. **Webhook endpoint:** Developers → Webhooks → Add endpoint:
   - URL: `https://words.wondral.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`
     (the last two revoke the entitlement — without them a refunded or disputed purchase
     stays unlocked for the full year)
   - Copy the **Signing secret** (`whsec_…`).
   *Note:* the paywall copy in `src/ui/Paywall.tsx` hardcodes “$49 / year” and “$79 / year” —
   if the Stripe price amounts ever change, change them together.
3. Put the Stripe values into `.dev.vars` locally (copy from `.dev.vars.example`) and into the
   Cloudflare Pages env (step 3 below).

## 3. Cloudflare Pages (new project + custom domain)

1. **Create the Pages project** (Workers & Pages → Create → Pages → Connect to Git):
   - Repo: `craig027-max/Rootwork`
   - Production branch: `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Root directory: `/` (leave default)
   *Why:* Vite SPA build; `functions/api/stripe/*` auto-deploy as Pages Functions at `/api/stripe/*`;
   `public/_redirects` gives the SPA fallback.
2. **Environment variables / secrets** (Settings → Variables and secrets). Mark the two secrets as
   **Secret**:
   | Name | Scope | Value |
   |---|---|---|
   | `VITE_SUPABASE_URL` | Production + Preview | your Supabase URL |
   | `VITE_SUPABASE_ANON_KEY` | Production + Preview | anon key |
   | `SUPABASE_URL` | Production + Preview | your Supabase URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview · **Secret** | service-role key |
   | `STRIPE_SECRET_KEY` | Production + Preview · **Secret** | `sk_…` |
   | `STRIPE_WEBHOOK_SECRET` | Production + Preview | `whsec_…` |
   | `STRIPE_PRICE_SINGLE` | Production + Preview | `price_…` |
   | `STRIPE_PRICE_MULTI` | Production + Preview | `price_…` |
3. **Custom domain** (the project → Custom domains → Set up a domain):
   - Add **`words.wondral.app`**. Cloudflare auto-creates the CNAME because `wondral.app` DNS is on
     the same account. Subdomain (not a path) — same choice as `chemistry.wondral.app`.
4. **(Optional) old-domain redirect:** if any legacy URL should point here, add a **301 Redirect Rule**
   on that zone (Rules → Redirect Rules) — *not* a repo `_redirects` file (that only handles in-app
   SPA routing).

## 4. Post-deploy smoke test (do this on a real device, every gated state)

The PianoSurge App Store lesson: walk every monetization/consent entry point in each gated state.

- [ ] **Logged-out:** Tier 1 roots open and animate; paid tiers show 🔒.
- [ ] **"Go Premium" (signed-out):** routes to sign-up (the purchase is the consent) — never an error.
- [ ] **Offline:** put the device in airplane mode → free roots still work; the Go Premium CTA is
      hidden / the paywall shows a calm offline notice (no broken checkout).
- [ ] **Pre-consent:** a brand-new account lands on the consent step before any paywall.
- [ ] **Sandbox purchase:** complete a Stripe **test** checkout end-to-end → entitlement grants →
      paid tiers unlock → `profiles.consent_at` + `consent_method='stripe'` recorded.
- [ ] Confirm the build-stamp footer shows the latest commit hash.

## 5. Verify locally before deploy

```bash
npm install
npm run build && npm test
npm run dev          # http://localhost:3003
```
For the Stripe Pages Functions locally, use `wrangler pages dev` with `.dev.vars` filled in.

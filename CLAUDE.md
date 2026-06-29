# Wondral Words — Project Context

> Spinoff of **Orbital Academy** (`~/Projects/Orbital`): an animation-first app teaching word roots
> (Latin/Greek/etc.) by making each root *feel* like its meaning (fire on PYRO, water on HYDRO).
> **Read `KICKOFF.md` first** — it's the one-page brief with the plan, the stack call, and the
> all-important "build the animation spike before any infrastructure" rule.

## Status

Greenfield. Nothing built yet. The next step is a **throwaway animation spike** on 2–3 hero words
to lock the 2D animation engine (GSAP+Canvas / PixiJS / Lottie). Do NOT pre-build
accounts/payments/router — fork those from Orbital only once a real lesson drives the need.

## Reuse vs. new (summary — detail in `KICKOFF.md`)

- **Reuse from Orbital:** accounts + COPPA consent, Stripe entitlement + gating, per-student
  progress, parent dashboard, vitest gate tests, Cloudflare Pages deploy.
- **New here:** a **2D** animation engine (Orbital is 3D/R3F), and a word/root content model.

## Infrastructure (keep ISOLATED from Orbital + Piano Surge)

New repo · new Supabase project · new Cloudflare Pages project. Never cross data between projects.

## Brand & names

Customer-facing brand is **Wondral Words** (the etymology line under the **Wondral** umbrella,
destined for `words.wondral.app`). Internal names stay put: folder `Word-Roots`, repo `Rootwork`,
and the "word root(s)" subject vocabulary throughout the content/code. Once the stack is locked,
split `KICKOFF.md` into a proper `PRODUCT.md` (vision) + flesh out this file (architecture),
mirroring Orbital's doc layout.

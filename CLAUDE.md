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

## Content workflow — hard rules (promoted 2026-09-15 from session history)

- **No AI-generated art in the core per-root scenes.** Two stacked reasons (stated 2026-07-07):
  swapping live code-driven animation for AI stills kills the product thesis and style-drifts
  across 152 roots — and this is a *paid kids' product*, so every asset needs a
  COPPA/content-safety and commercial-license check. AI generation is fine for
  marketing/hero/OG art only.
- **Paywall error paths fail CLOSED.** A fetch error must never leave a visitor entitled — the
  original `hydrate.ts` catch bug granted free access to paid content on any network failure.
  Enforced today in `src/core/hydrate.ts` (`setEntitlement(null)` on both the load-failure and
  signed-out paths; verified 2026-09-15). Keep that invariant through any refactor.
- **Scene motion must depict the root's meaning — that's the ship bar.** (History: Stat once
  played spinning gears, Ten/Tang likewise; PR #8 was closed unmerged but the fixes landed via
  the later stream — Stat→`stand`, Ten→`hold`, Tang→`touch` verified wired in
  `src/data/roots.data.ts` 2026-09-15.)
- **v1 content spine:** Craig's kids' own homeschool word-root workbook ("pull hero roots from
  it when available", 2026-06-27). It exists only on paper — digitize before leaning on it.
  The 152-root design package is safe: archived in `_archive/design_handoff_word_roots/` and
  ported into `src/data/roots.data.ts`.

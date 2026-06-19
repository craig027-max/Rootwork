# Word-Roots — Kickoff Brief

> One-page brief to start the project cold in a fresh Claude Code session.
> Sibling spinoff of **Orbital Academy** (`~/Projects/Orbital`). **Created:** 2026-06-19.
> Working folder name `Word-Roots`; product/brand name still TBD (see Open decisions).

---

## What it is

An animation-first app that teaches **word roots / etymology** — Latin, Greek, and others —
by making each root *feel* like its meaning: flames licking **PYRO**, water flowing through
**HYDRO**, stars swirling around **ASTRO**. Learn the root once, unlock dozens of words.

**Audience:** same DNA as Orbital — homeschool families + curious kids/teens (and honestly,
word-loving adults). Direct-to-consumer first.

## The core bet

**The animation IS the product.** A flashcard etymology app already exists a hundred times over;
nobody has made the root *come alive*. If "fire on PYRO" gives you chills, the app works. So the
look has to be validated **before** any infrastructure is built.

## Recommended stack

- **Reuse Orbital's spine, not its scenes.** Fork the hard, already-built parts: accounts →
  parental consent → Stripe entitlement → per-student progress → gating → lesson/unit data model.
  That's weeks of solved work. (Orbital: React 19 + TS strict + Vite + zustand + Supabase +
  Cloudflare Pages Functions for Stripe.)
- **New animation engine — 2D, not Orbital's 3D.** Atoms needed R3F/three; word effects are a 2D
  motion problem: animated type + particles/shaders/Lottie. Candidates: **GSAP + Canvas**,
  **PixiJS** (2D WebGL particles), or **Lottie** (hand-crafted per word). R3F only if you want
  extruded 3D letters.
- **The engine decision hinges on one question:** *bespoke animation per word* (gorgeous, doesn't
  scale) vs *a parametric effect system keyed to the root's meaning* (scales to hundreds, more
  engineering). Lean parametric, with a few hero words hand-polished.

## First session = the spike (do this before anything else)

1. Throwaway prototype of **2–3 hero words**: pyro/fire, hydro/water, astro/stars. Standalone
   HTML/Canvas page is fine — no framework, no auth, no backend.
2. Try one effect approach (start with GSAP+Canvas particles). Judge the *feel*.
3. Only once a treatment gives you chills: lock the engine, then scaffold the real app.

> Honor Orbital's own rule: **don't pre-build.** No accounts/payments/router until a real lesson
> drives the need. The spike comes first.

## Reuse-from-Orbital checklist (when scaffolding the real app)

- Accounts + COPPA parental-consent flow (parent-rooted model)
- Stripe one-time-annual entitlement + webhook + gating (`isLessonAccessible` pattern)
- Per-student progress (local-first + Supabase sync, per-student namespacing)
- Parent dashboard (roster, rename/remove students, per-student progress)
- Pure-function unit tests locking every gate/routing decision (vitest)
- Cloudflare Pages deploy + build-stamp footer

## Different-from-Orbital

- 2D animation engine (above) · word/root content model instead of elements/molecules ·
  likely a "root → derived words" graph instead of linear unit unlock.

## Infrastructure (keep it ISOLATED)

- **New repo**, **new Supabase project**, **new Cloudflare Pages project** — separate the way
  Piano Surge and Orbital are separate. Never cross data between projects.
- Same deploy posture as Orbital: push to `main` → Cloudflare Pages auto-build.

## Monorepo: when & how (decided 2026-06-19)

Separate repos **now**; a workspaces monorepo is the likely *destination* for the education apps,
but the wrong *starting point*. The deciding factor is the shared spine (accounts / consent /
Stripe entitlement / progress / gating) that this app reuses from Orbital.

- **Now (this app):** stay a separate repo. When you fork Orbital's spine, **quarantine it in a
  clean, self-contained `src/core/`** (no app-specific imports leaking in) so it stays *liftable*
  into a shared package later at near-zero cost.
- **Trigger to switch:** once **two apps are live** sharing the spine *and* you catch yourself
  fixing the same bug in both. That pain — not a hunch — is the signal.
- **How, when triggered:** promote the edu apps into a **pnpm-workspaces + Turborepo** monorepo —
  `apps/orbital`, `apps/word-roots`, `packages/core` (the spine), `packages/ui`. Extract the
  shared package *informed by two real consumers* so the abstraction is right (extracting from one
  app guesses the seams — usually wrong, and a wrong abstraction couples apps through a bad
  interface, which is worse than duplication). Cloudflare Pages supports this via a per-app **root
  directory** + build command.
- **Never** fold in Piano-Surge / Pool-App unless they actually start sharing code. A monorepo is
  for shared code, not "all projects in one place."
- **Caveat:** if you become certain there'll be 3–4 edu spinoffs on this spine, monorepo-*first*
  is defensible (you never create the second copy). Don't make that bet before this app passes the
  animation spike.

Principle: "don't pre-build" applies to platforms too — **monorepo later, on evidence.**

## Open decisions (owner)

- **Brand name** (folder is `Word-Roots` for now — rename before mapping Cowork if desired).
- **Animation engine** (resolve via the spike).
- **Content scope for v1** (how many roots; which "hero" set ships first).
- **Pricing** (mirror Orbital's annual model? bundle with Orbital?).

## Suggested first prompt for the new Code session

> Starting the Word-Roots app (etymology, animation-first; sibling of `~/Projects/Orbital`).
> Read `KICKOFF.md`. Before any scaffolding, build a throwaway spike: a standalone page that
> animates 2–3 hero word-roots (pyro/fire, hydro/water, astro/stars) with GSAP+Canvas particles,
> so we can judge the *feel* and lock the animation engine. Don't set up accounts/payments yet.

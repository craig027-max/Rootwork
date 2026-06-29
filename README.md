# Wondral Words

An animation-first app that teaches **word roots / etymology** by making each root *feel* like its
meaning — `bio` as life, `aqua` as water, `astro` as the stars. Learn one root, unlock dozens of
words. Brand: **Wondral Words** · target: `words.wondral.app`. Sibling of the chemistry app
(Wondral Chemistry / `~/Projects/Orbital`).

## Stack

React 19 + TypeScript (strict) + Vite · Zustand · Supabase (auth + Postgres + RLS) · Stripe
(Cloudflare Pages Functions) · Cloudflare Pages. 2D canvas scenes (no 3D).

## Layout

```
src/
  core/      # the liftable "spine" (auth, profile, entitlement, progress, checkout,
             # hydrate, consentGate) — forked from the chemistry app, no app-specific imports
  data/      # roots.data.ts (152 roots / 5 tiers), roots.ts (ids + gating), avatars
  ui/        # screens (Home, Deck, RootRush, Auth, Consent, Paywall, ParentDashboard),
             # Scene (canvas), and the design-system primitives in ui/components
  app/       # store.ts (Zustand), App.tsx (router), hooks
  styles/    # imported design tokens + styles.css
functions/   # Cloudflare Pages Functions — /api/stripe/{create-checkout-session,webhook}
supabase/    # SQL migrations (parent-rooted COPPA model + entitlements + RLS)
rootwork/    # the source design-system package + the original playable prototype (reference)
spike/       # the throwaway GSAP+Canvas animation spike that locked the visual direction (archive)
```

`src/core/` is deliberately self-contained so it can become a shared package once a second app
reuses it (see `KICKOFF.md`'s monorepo note).

## Develop

```bash
npm install
npm run dev      # http://localhost:3003
npm test         # vitest gate tests
npm run build    # tsc -b && vite build
npm run lint
```

The app runs with **no backend configured** (free Tier 1 works; gated CTAs degrade gracefully).
To wire the isolated backend and deploy, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## The gates (and why they're tested)

Wondral Words is a kids' product with a parent-rooted COPPA model. The pure decision functions that
guard money/consent are unit-tested so they can't silently regress:

- `src/core/entitlement.ts` — `isEntitlementActive`, `gateEntitled` (reload flash-suppression)
- `src/core/parentLanding.ts` — `resolveParentLanding` (active-student routing, ghost-id handling)
- `src/data/roots.ts` — free/paid line + linear unlock (`isRootFree`, `rootLockReason`, …)
- `src/core/consentGate.ts` — `resolveEntryView`: every gated state resolves to a real, graceful
  view, **never** an error dead-end (the PianoSurge App Store lesson, with an exhaustive test).

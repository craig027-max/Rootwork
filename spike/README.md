# Word-Roots — animation spike (THROWAWAY)

A standalone proof that **one parametric particle engine + per-root presets** can make a word
root *feel* like its meaning. Built to answer the KICKOFF question (bespoke-per-word vs. parametric)
before any infrastructure. Not production code.

## Run it

```bash
cd spike
python3 -m http.server 8731
# open http://localhost:8731/
```

Pure static HTML + Canvas 2D. GSAP loads from CDN (with SRI), so you need a network connection the
first time. Switch words with the on-screen pills or keys **1 / 2 / 3**. PYRO auto-plays on load.

## What's inside (`index.html`, one file)

- **`PRESETS`** — fire / water / stars as *data only*. Every difference between the three lives here.
- **`sampleGlyphs()`** — renders the word to an offscreen canvas, samples opaque pixels into
  particle "home" points (gated on `document.fonts.ready` so it matches the real glyphs).
- **`ParticleField`** — one preallocated pool with a single `update(dt)` / `render(ctx)` loop.
  **No per-word branching in the hot loop** — meaning comes entirely from the preset numbers.
- **GSAP** orchestrates only the macro layer: the entrance timeline and easing of field-level
  scalars (`gatherStrength`, `intensity`, `dissolve`). It never touches individual particles.
- Perf: pre-rendered glow **sprites** per colour stop (no per-particle `shadowBlur`), a colour-ramp
  LUT, trail-fade clears, and `prefers-reduced-motion` → a single static formed frame.

The eight knobs that carry the "meaning": signed `gravity` (fire up / water down / stars 0),
`gather`, `turbulence`, `orbit`, `blend` (additive vs. opaque), `trailFade`, `lifetime`, `colorRamp`.

## Verdict

**GSAP + Canvas 2D + a parametric engine earns the job.** Fire, water, and stars are each
unmistakable from the same loop driven only by data — the parametric bet holds, so we don't need
bespoke-per-word animation. Canvas 2D handles ~1.7k–2.2k particles per word smoothly; if particle
budgets or shader-grade effects (real caustics, heat shimmer) become the bar later, revisit PixiJS.
Lottie is out — hand-crafting per word doesn't scale to hundreds of roots.

Next step (separate task): fold this verdict into `KICKOFF.md`, then scaffold the real app and
start forking Orbital's spine. This `spike/` directory can be deleted once the engine is ported.

> `window.__spike` exposes a small debug handle (`snap(word)`, `field`) used to render
> deterministic frames during verification. Harmless; remove when porting.

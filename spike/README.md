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
first time. Switch words with the on-screen pills or keys **1 / 2 / 3 / 4**. PYRO auto-plays on load.
(If the browser cached an old build, hard-reload or append `?v=N`.)

## Words (v2)

The goal is *concept association*, not fancy text — each root teaches its meaning + example
derived words (shown under the word):

- **PYRO → fire** — dense rising flames, elongated tongues, smoke ramp (additive).
- **HYDRO → water** — highlighted 3D droplets that overlap into a body and *drip* below the letters.
- **ASTRO → stars** — constellation/planetarium: sparse bright stars linked by lines over a
  twinkling starfield + nebula clouds.
- **BIO → life** — *hybrid*: the word in bright green particles over a recessed, rotating **DNA
  double-helix** backdrop. Demonstrates supporting concept-imagery behind a particle word.

## What's inside (`index.html`, one file)

- **`PRESETS`** — each root's look/behaviour as data: signed `gravity`, `gather`, `turbulence`,
  `orbit`, `sway`, `grow`, `stretchY` (flame tongues), `drip*` (water), `blend`, `trailFade`,
  `lifetime`, `breathe`, `twinkle`, `colorRamp`, plus `mode`/`backdrop` for the richer treatments.
- **`sampleGlyphs()`** — renders the word offscreen, samples opaque pixels into particle "home"
  points (gated on `document.fonts.ready`).
- **`ParticleField`** — one preallocated pool, single `update`/`render`. Shared physics is
  data-driven; a few element render paths earn their keep now (`renderField` with flame
  elongation, water droplet sprites, `renderConstellation`, and the `drawLife` DNA backdrop).
- **GSAP** orchestrates only macro scalars (`gatherStrength`, `intensity`, `dissolve`) — never
  individual particles.
- Perf: pre-rendered glow/droplet **sprites** per colour stop (no per-particle `shadowBlur`),
  colour-ramp LUT, trail-fade clears, `prefers-reduced-motion` → static frame.

## Verdict

**GSAP + Canvas 2D earns the job.** Fire, water, stars, and life each read unmistakably from one
engine. The model is **hybrid**: a shared particle word + per-root tuning, with optional
supporting concept-imagery behind it (the DNA helix for BIO) where particles alone won't convey an
abstract meaning. Canvas 2D handles ~1.2k–2.4k particles/word smoothly; revisit PixiJS only if
shader-grade effects (real caustics, heat shimmer) become the bar. Lottie is out — hand-crafting
per word doesn't scale to hundreds of roots.

Next step (separate task): fold this verdict into `KICKOFF.md`, then scaffold the real app and
start forking Orbital's spine. This `spike/` directory can be deleted once the engine is ported.

> `window.__spike` exposes a small debug handle (`snap(word)`, `field`) used to render
> deterministic frames during verification. Harmless; remove when porting.

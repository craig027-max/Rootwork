# Wondral Words — animation spike (THROWAWAY)

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

## Words (v3 — text-first)

The word is rendered as **real, readable type** (Archivo Black, a glowing gradient fill); the
effect *supports* the letters instead of replacing them. Below each word an **instructional card**
(on a legible scrim) shows the root's definition + origin and every derived word with its meaning —
this is a teaching tool, so the definitions matter as much as the animation.

- **PYRO → fire** — hot gradient type with **flame-tongue** sprites licking up off the letters.
- **HYDRO → water** — type filled with moving water (undulating waterline + gloss) + **teardrop rain** falling off it.
- **ASTRO → star** — a glowing **sun** (disc + corona + flickering solar flares) behind warm readable type.
- **BIO → life** — letters filled with green life (bubble-cells), **plants sprouting** out of their tops, a DNA helix behind, and drifting cells.

Two techniques carry the realism: (1) **shaped sprites** — `buildFlameSprites`, `buildRainSprites`,
cell sprites — so effects read as the element, not round dots; (2) **filling the letters** with
animated content via a text-mask compose layer (`buildTextMask` + `fillTextWith`, e.g. `drawWater`).
`drawSun` / `drawLife` are backdrop scenes drawn behind the type.

## What's inside (`index.html`, one file)

- **`PRESETS`** — each root as data: `textFill` gradient + `glowColor`/`glowBlur` for the type,
  plus the supporting-effect knobs (`gravity`, `turbulence`, `sway`, `grow`, `stretchY`, `droplet`,
  `twinkle`, `breathe`, `blend`, `trailFade`, `lifetime`, `colorRamp`) and `backdrop` (`sky`/`life`).
- **`sampleGlyphs()`** — samples the glyph pixels into points the effect particles emit from, using
  the *same* scale/centre as the solid type so type and effect align.
- **`renderText()`** — the hero: draws a backdrop (`drawSky`/`drawLife`), the solid glowing word,
  then `drawParticles()` (flames/drips/stars/motes) on top.
- **GSAP** orchestrates only macro scalars (`gatherStrength` = text reveal, `intensity`, `dissolve`).
- Perf: pre-rendered glow/droplet **sprites** (no per-particle `shadowBlur`), colour-ramp LUT,
  trail-fade clears, `prefers-reduced-motion` → static frame.
  (Earlier dot-formed render paths `renderField`/`renderConstellation` remain but are now unused.)

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

## Status & next session (handoff)

Spike is at **v7** (commit history `spike v1…v7`). Four hero words — PYRO, HYDRO, ASTRO, BIO —
each with readable type, an element-appropriate effect, and an instructional card (definition +
origin + derived-word meanings). All verified in a real browser; no console errors.

**Next session:** Craig imported **superior effect packages from "Claude Design"** to work from.
They're in the repo root (untracked as of this handoff):
- `design_handoff_word_roots/` — `Word Roots.html`, `Bio Root Card.html`, `colors_and_type.css`, `README.md`
- `Text particle effects.zip` (~20K) — extract and review

Plan for picking up:
0. **Read `design_handoff_word_roots/README.md` first**, then open the HTML files in a browser.
1. Review the imported packages; treat them as the new source of the *effects*.
2. Keep what this spike locked regardless of how the effects are built:
   - **Text-first**: the root word is real, readable type; the effect supports it (never dot-letters).
   - **Instructional card** under each word (meaning + origin + derived words w/ definitions) — this
     is a teaching tool; definitions matter as much as the visuals.
   - **Concept association > decoration**; effects should read as the *element* (flames, water,
     sun, cells/plants), not generic particles.
3. The bespoke Canvas effects here are likely **superseded** by the imported packages — port the
   structure/learning layer, swap the effect implementation. Engine call (GSAP + Canvas 2D) may be
   revisited if the packages use a different renderer.

Run notes: served via `.claude/launch.json` ("spike") or `python3 -m http.server 8731 --directory spike`.
The static server stops on idle — just restart it. Append `?v=N` to dodge browser caching.

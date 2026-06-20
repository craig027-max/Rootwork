# The Animated Scene — Rootwork's hero motif

Every Rootwork card carries a small **live `<canvas>` panel** beside its text that *animates the concept itself*: a DNA helix for **bio** (life), an orbiting globe for **geo** (earth), radiating rays for **photo** (light), ripples for **aqua** (water), a radar sweep for **tele** (far). The scene is the single most distinctive thing about the brand — it turns a flashcard into a tiny aquarium of the idea.

It is **decorative-but-meaningful**, never chrome. One scene per item, matched to that item's jewel.

## How it works

- A `<canvas>` fills the card's scene panel. A single rAF loop drives a shared clock `t`; only the **active** card draws (off-screen cards are paused) to keep it cheap.
- Each scene is a pure function `SCENES[name](ctx, w, h, t, pal)`:
  - `ctx` — the 2D context, pre-scaled for devicePixelRatio (capped at 2).
  - `w, h` — CSS pixel size of the panel.
  - `t` — seconds since load (frozen when `prefers-reduced-motion: reduce`).
  - `pal` — `[primaryRGB, secondaryRGB]` strings pulled from the item's jewel (`PALETTES[key].pal`), so the scene is always colored in-family.
- The panel sits over a soft radial bloom of the jewel and is captioned with the scene emoji + meaning.

## Rules

1. **Tie the motion to the meaning.** The animation should *be* the concept, not generic particles. If you can't name what it depicts, it doesn't ship.
2. **Color from the jewel.** Read `pal`, never hardcode hues — the scene must re-pigment when the item's jewel changes.
3. **Calm, looping, low-contrast.** Slow drift, gentle pulse. It lives behind text; it must never fight the display word. House easing only — no bounce.
4. **Respect reduced motion.** Freeze `t` so the scene renders a still, legible composition.
5. **Cheap.** Only the visible card animates. Keep particle counts modest; this runs on kids' tablets.

## Adding a scene

```js
// roots-scenes.js
window.SCENES = window.SCENES || {};
window.SCENES.spark = function (ctx, w, h, t, pal) {
  const [c1, c2] = pal;                 // e.g. "52,224,166"
  ctx.save();
  // ...draw the concept, animated by t, colored with rgba(c1/c2, …)…
  ctx.restore();
};
```

Then point an item at it: set `scene:'spark'` in its `ROOTS` entry. See `../ui_kits/rootwork-app/roots-scenes.js` for the full working set (dna, globe, light, waves, water, heat, stars, clock, sound, eye, motion, gear, speak, scale, mind, heart, …).

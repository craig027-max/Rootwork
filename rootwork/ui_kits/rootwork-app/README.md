# Wondral Words App — UI kit

The canonical Wondral Words specimen: the learning app itself, click-through. This is a faithful recreation built on the real app code, re-pigmented to the Wondral Words premium jewel palette.

## Open
`index.html` — link `../../styles.css` is already wired.

## What's here
- **Jewel card deck** — one card per learnable item (root). Each card owns a jewel identity: a gradient display word, pronunciation + origin, a one-line meaning, an animated concept **scene** (live `<canvas>`), and a 3-up grid of real-world example words with mono breakdowns.
- **Index overlay** (`☰`) — every item grouped by tier (Starter → AI Level), each chip tinted with its jewel.
- **Root Rush** (`🎯`) — the timed quiz loop: pick a tier, match root → meaning, build an **8× combo**, get graded **S/A/B/C/D** with **0–5 stars**. Best score persists to `localStorage`.

## Interactions
- `← / →` or the nav arrows move between cards.
- Click the center nav label or `☰` to open the index.
- `🎯` opens Root Rush; `1–4` keys answer; `Esc` closes overlays.

## Files
- `index.html` — shell, nav, index overlay, card builder, canvas engine.
- `roots-data.js` — `PALETTES` (jewel map) · `TIERS` · `ROOTS` (curriculum).
- `roots-scenes.js` — the animated canvas `SCENES` (see `../../guidelines/scenes.md`).
- `roots-quiz.js` — Root Rush (`window.RootRush`).

## Notes
This kit is vanilla JS (canvas + DOM), not React — it's a recreation of the shipping app, so it keeps the app's own engine rather than re-implementing it from the component primitives. New screens built from scratch should compose `components/` (Card, Badge, Button, Chip, QuizTile) instead.

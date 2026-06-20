# Rootwork

> **The arcade for everything worth learning.**
> Falling-knowledge flashcards, animated concept "scenes," daily streaks, and a grade-chasing quiz loop — built so practice never feels like practice.
> **"Learn the root. Own the word."**

Rootwork is a **learning-game brand** + design system. It began as a vocabulary trainer built on word *roots* (`bio → life`, `geo → earth`) and is designed to extend to any drillable subject — math facts, science terms, history, music theory, languages.

This repository contains **both** the design system (tokens, components, guidelines) **and** a working, playable prototype of the game (vanilla HTML/JS, no build step).

---

## Getting started

Everything is static — **no build, no install.** Just open the HTML files in a browser.

```bash
# clone, then open the game directly:
open ui_kits/rootwork-app/home.html      # Home & profile (start here)
open ui_kits/rootwork-app/index.html     # The card deck + index + Root Rush quiz
```

Or serve the folder (so font @imports + relative paths resolve cleanly):

```bash
npx serve .
# then visit http://localhost:3000/ui_kits/rootwork-app/home.html
```

> The three webfonts (Orbitron / Outfit / JetBrains Mono) load from Google Fonts via `@import` in `tokens/typography.css`. An internet connection is needed for type to render correctly.

---

## What's playable today (v1)

| Screen | File | What it does |
|---|---|---|
| **Home & Profile** | `ui_kits/rootwork-app/home.html` | Profile band (level, streak, stars, accuracy) + a **master-detail selectable menu** — keyboard-navigable list of modes & tiers, live jewel-themed detail panel. |
| **Card deck / Index / Root Rush** | `ui_kits/rootwork-app/index.html` | The learning loop: swipe a deck of jewel-lit root cards with animated concept scenes, browse the full index by tier, and play the **Root Rush** timed quiz (combo, S/A/B/C/D grades, 0–5 stars, best score persisted). |

Both are vanilla JS (canvas + DOM). Curriculum lives in `ui_kits/rootwork-app/roots-data.js`.

---

## Repository structure

```
rootwork/
├── README.md                  ← you are here
├── HANDOFF.md                 ← implementation spec for porting into a real app
├── SKILL.md                   ← agent-skill wrapper for the design system
├── styles.css                 ← global entry point — link THIS (imports only)
├── tokens/
│   ├── colors.css             ← canvas, text, the 8-jewel collection, gradients
│   ├── typography.css         ← webfonts + family / size / tracking tokens
│   ├── spacing.css            ← space, radius, shadow, spark-glow
│   ├── motion.css             ← easing, durations, keyframes
│   └── base.css               ← base elements + utility classes (.btn, .card, .badge…)
├── components/                ← React primitives: Card, Badge, Button, Chip, QuizTile
│   └── <Name>/                  each = .jsx + .d.ts + .prompt.md + .card.html demo
├── guidelines/                ← foundation specimen cards (HTML) + scenes.md motif doc
├── ui_kits/rootwork-app/      ← the playable game (home, deck, index, Root Rush)
└── docs/DESIGN_SYSTEM.md      ← the full brand + visual guide (voice, color, type, motion)
```

> Paths referenced inside `docs/DESIGN_SYSTEM.md` are written relative to the repo root.

---

## The system in one minute

- **Canvas:** inky violet-black `#08070f` with two soft jewel radial blooms (`.rw-ambient`).
- **The Jewel Collection:** 8 curated 3-stop gradient identities — Jade, Cyan, Cobalt, Violet, Magenta, Coral, Amber, Lime. **Every learnable item owns one jewel for life**, so color becomes a memory hook. Theme any surface by setting three vars: `--spark`, `--spark-rgb`, `--grad`.
- **Type:** Orbitron (display / scores / the big root word) · Outfit (body / UI) · JetBrains Mono (UPPERCASE labels, breakdowns, counts).
- **Brand gradient:** `--gradient-hero` = jade → cyan → cobalt ("growth → clarity → depth").
- **Motion:** snappy ease-out (`cubic-bezier(0.2,0.8,0.2,1)`). Hover = lift + spark glow. Press = `scale(0.98)`. Selection = cyan ring.
- **Icons = emoji**, one per element, deliberate.

Full detail in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md). Porting into a production app? Start with [`HANDOFF.md`](HANDOFF.md).

---

## Lineage

Rootwork is a **sibling sub-brand of PianoSurge** — it shares the three-font stack, the dark cosmic-arcade canvas, and the grade/star/combo loop, but diverges with an inkier canvas and the premium per-item jewel palette.

## Status

**v1 — first playable.** Design system + Home/Profile + card deck + Root Rush quiz. Not yet wired into a framework or a backend; the prototypes are the source of truth for look & behavior.

## License

© 2026. All rights reserved. (Add a license of your choice before making the repo public.)

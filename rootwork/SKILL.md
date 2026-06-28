---
name: rootwork-design
description: Use this skill to generate well-branded interfaces and assets for Wondral Words, a learning-game brand (vocabulary roots, extensible to any drillable subject), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, the jewel palette system, and UI kit components for prototyping.
user-invocable: true
---

Read `docs/DESIGN_SYSTEM.md` (the full brand guide) first, and explore the other files.

Wondral Words is a dark cosmic-arcade learning game. The signature is the **jewel system**: every learnable item owns one of 8 curated gradient identities for life (set `--spark` / `--spark-rgb` / `--grad` on a card or surface root), plus a small **animated canvas scene** that depicts the concept. Type is Orbitron (display) / Outfit (body) / JetBrains Mono (labels). Canvas is the inky `#08070f`.

Key files:
- `styles.css` — the one global entry point; link it to inherit every token + the three webfonts.
- `tokens/` — colors (the jewel collection), typography, spacing, motion, base utilities.
- `guidelines/` — foundation specimen cards + `scenes.md` (the animated-scene motif).
- `components/` — Card, Badge, Button, Chip, QuizTile (React primitives, each with `.jsx` + `.d.ts` + `.prompt.md`).
- `ui_kits/rootwork-app/` — the playable app: `home.html` (home & profile, selectable master-detail menu) and `index.html` (card deck + index + Root Rush quiz).
- `docs/DESIGN_SYSTEM.md` — full voice + visual guide. `HANDOFF.md` — spec for porting into a real codebase.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and write static HTML files for the user to view. If working on production code, copy assets and read the rules here to design as an expert in this brand.

If invoked with no other guidance, ask what the user wants to build, ask a few focused questions, and act as an expert designer who outputs HTML artifacts or production code as the need dictates. Follow the voice rules in the guide: confident game-announcer, concrete numbers lead, game words not classroom words, declarative + gradient-payoff headlines.

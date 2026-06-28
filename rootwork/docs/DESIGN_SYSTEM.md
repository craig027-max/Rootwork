# Wondral Words — Design System

> **The arcade for everything worth learning.**
> Falling-knowledge flashcards, animated concept "scenes," daily streaks, and a grade-chasing quiz loop — built so practice never feels like practice.
> **"Learn the root. Own the word."**

---

## What is Wondral Words?

Wondral Words is a **learning-game brand**. It started as a vocabulary trainer built on word *roots* (see `Bio → life`, `Geo → earth`), and the system is designed to extend to **any subject** that decomposes into atoms you can drill: math facts, science terms, history dates, music theory, languages.

Every learnable item — a root, a formula, a fact — is presented on a **jewel-lit card**: a big gradient display word, a one-line meaning, a tiny animated concept *scene*, and a grid of real-world examples. Items are organized into **tiers** (Starter → AI Level) and quizzed in **Root Rush**, a timed combo run that grades you **S / A / B / C / D** with **0–5 stars**.

**Audience:** curious kids and lifelong learners who like games. The loop is borrowed from rhythm/arcade games (combo, streak, stars, particles) and pointed at study.

**Relationship to PianoSurge:** Wondral Words is a **sibling sub-brand**. It shares PianoSurge's DNA — the three-font stack (Orbitron / Outfit / JetBrains Mono), the dark cosmic-arcade canvas, the grade/star/combo loop, snappy ease-out motion. It diverges in two deliberate ways:
1. **An inkier, cooler canvas** (`#08070f` violet-black vs PianoSurge's `#0a0a1a`).
2. **A curated jewel palette** — 8 premium 3-stop gradient identities replace PianoSurge's tailwind-default hues, and **each item owns one jewel for life** so color becomes a memory hook.

## Surfaces this design system covers

| Surface | What it is |
|---|---|
| **Learning app** | The card deck + index + Root Rush quiz. The canonical specimen — see `ui_kits/rootwork-app/`. |
| **(extensible)** | New subjects reuse the same card, tier, scene and quiz machinery with a different content set. |

One palette, one type stack, one motion language across all of it.

## Sources

- Derived from the in-project **Word Roots** build (`Word Roots.html`, `roots-data.js`, `roots-scenes.js`, `roots-quiz.js`) — the original cards, animated scenes, and quiz this system is extracted from.
- DNA inherited from the **PianoSurge** design system (`craig027-max/Piano-Surge`).
- No Figma, no logo files. The brand mark is the **Wondral Words** wordmark plus a 🌱 emoji. Emoji are the icon system.

---

## CONTENT FUNDAMENTALS

**Voice: a sharp, encouraging game announcer who happens to know everything.** Confident, concrete, never schoolteacher-y. The player is here to *win*, and learning is how you win.

**Voice rules**

- Address the player directly: **you / your**, never "users" or "students."
- **Short sentences. Fragments welcome when punchy.** Em-dashes are fine.
- **Imperative CTAs:** *Play*, *Start the run*, *Next*, *Unlock*, *See all roots*.
- **Concrete leads:** "19 roots," "8× combo," "Tier 5," "Card 03 / 19."
- **Headline pattern: declarative + gradient-text payoff.**
  *"Learn the root. **Own the word.**"* / *"Every card **sticks.**"* / *"One run. **Five stars.**"*
- **Game words, not classroom words.** Hit, score, combo, streak, run, tier, unlock, level up. Avoid *exercise / drill / homework / lesson* in surface copy. ("Practice mode" is fine as a feature name.)
- **Teach in one breath.** A card's lead is a single sentence with the root and its meaning bolded: *"See **bio** and think **life**."* No paragraphs.
- **Name the moat plainly.** Wondral Words teaches the *building blocks* so one root unlocks dozens of words — say so when it's on screen.

**Casing**

- Body: Sentence case.
- Headlines: Title Case or Sentence case — never SHOUTY ALL CAPS.
- Tiny labels (eyebrows, tiers, card counts, breakdowns): UPPERCASE JetBrains Mono with `0.14–0.16em` tracking — the uppercase *is* the typography.
- Buttons: Title Case.
- Grades, scores, the big root word: Orbitron, weighty — they're game elements.

**Don'ts**

- No "delight," "seamless," "magical," "experience," "users," "students."
- No exclamation marks in body copy — save them for badges, feedback toasts, and the result screen.
- Don't lecture (*"Let's learn about..."*). Announce (*"Hit the meaning."*).
- Don't bury the number. Lead with it.

**Sample copy**

- *Tagline:* "Learn the root. Own the word."
- *Card lead:* "See **bio** and think **life** — something living, or the study of living things."
- *Breakdown (mono):* "bio (life) + -graphy (writing)"
- *Quiz intro:* "Root Rush — match the root to its meaning before the combo drops."
- *Result:* "Grade A · 4 stars · 92% accuracy"

---

## VISUAL FOUNDATIONS

**Aesthetic: jewel-lit cosmic arcade.** A near-black violet canvas with two soft jewel-tinted radial blooms, gradient display type, and a single accent color per card that glows. Think a museum gem case at midnight, not a worksheet. Premium, deep, never pastel and never sterile.

### Color
- **Canvas is dark by default.** `--bg-primary #08070f` (inky violet-black base), `--bg-secondary #0e0c1a` (alternating), `--bg-card #120f24` (cards), `--bg-elevated #1b1740` (popovers). The cooler `--bg-app #090a14` is the in-app variant.
- **Text:** `--text-primary #eeedf6`, `--text-secondary #9b98b6` (body/meta), `--text-muted #66628a` (eyebrows, captions). Text on a bright/gradient fill uses `--text-on-bright #0a0814`.
- **The Jewel Collection — 8 curated item identities.** Each is a bright "spark" accent + a 3-stop signature gradient + an rgb triplet for glows. **Every item owns one jewel and keeps it everywhere** — same root, same jewel, every screen, so color becomes memory.

  | Jewel | Spark | Reads as |
  |---|---|---|
  | **Jade** | `#34e0a6` | life · growth · default brand |
  | **Cyan** | `#34d9f0` | water · clarity · signal |
  | **Cobalt** | `#6aa0ff` | earth · depth · structure |
  | **Violet** | `#b18cff` | mind · abstraction |
  | **Magenta** | `#f57ad0` | language · expression |
  | **Coral** | `#ff8a6b` | heat · energy · motion |
  | **Amber** | `#ffce4d` | light · time · gold-adjacent |
  | **Lime** | `#b6e84a` | nature · scale |

  Tokens: `--jewel-<name>`, `--jewel-<name>-rgb`, `--jewel-<name>-grad`. A card retheme is three vars — set `--spark`, `--spark-rgb`, `--grad` on the card root and the whole card (text glow, border, badge, hover bloom, gradient fill) re-pigments.

- **Gradients are the signature.**
  - **Hero / brand:** `--gradient-hero` `linear-gradient(135deg, #34e0a6, #22c3e6, #5b8def)` — jade → cyan → cobalt ("growth → clarity → depth"). This is the Wondral Words mark; it is **not** PianoSurge's purple→blue→cyan.
  - **Fire** (Perfect / Grade S): `--gradient-fire` `#ffc24d → #ff5c6b`.
  - **Gold** (stars, premium): `--gradient-gold` `#ffd24a → #ffab2e`.
  - **Premium** (unlock): `--gradient-premium` `#9a6df5 → #ec4faf`.
- **System colors:** `--success #2fd99a`, `--warning #ffc24d`, `--danger #ff5c6b`, `--info #5b8def`, `--gold #ffd24a`. Grades S/A/B/C/D and tiers 1–5 map to jewels (Starter=Jade … AI Level=Magenta).

### Type
Three families, distinct jobs (shared with PianoSurge DNA):
- **Orbitron** (`--font-game`) — display, brand wordmark, the big root word, scores, grades, badges. Weights 400–900. The big root word is `--fs-display` `clamp(3.6rem, 10vw, 7rem)`, weight 900, `letter-spacing: -0.03em`, filled with the card's jewel gradient.
- **Outfit** (`--font-display`/`--font-body`) — UI labels, paragraph copy, buttons. Weights 300–800.
- **JetBrains Mono** (`--font-mono`) — eyebrows, breakdowns, tiers, card counts, tabular numbers. Always UPPERCASE + `0.14–0.16em` tracking for labels.

Headlines scale with `clamp()`: `--fs-h1` `clamp(2.6rem, 7vw, 5.6rem)`, `--fs-h2` `clamp(1.7rem, 4vw, 2.9rem)`. Body is `1rem / 1.62`.

### Spacing & layout
- Section padding: `100px 5%` desktop / `72px 5%` mobile. The `5%` gutter (`--gutter`) is a brand constant.
- Cards: jewel-tinted fill + 1px jewel-tinted hairline, **24px corners** (`--radius-xl`), `2rem`-ish interior padding.
- Radius scale: 7 / 11 / 16 / 24 px + `100px` pills.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 / 100.
- Max widths: ~1120px deck, 720px prose, 640px section headers.

### Borders, cards, shadows
- Cards: `bg-card` + a top jewel-tint wash (`linear-gradient(180deg, rgba(spark,0.05), transparent 30%)`) + 1px `rgba(spark,0.16)` border.
- **Two elevation systems coexist:** neutral DROP shadows for physical lift (`--shadow-card 0 4px 24px rgba(0,0,0,0.45)`), and colored OUTER GLOW for emphasis (`--glow-spark`, keyed to `--spark-rgb` via a single rule so it serves every jewel).
- **Hover** = `translateY(-4px)` lift + border tints to `rgba(spark,0.4)` + spark glow bloom.
- Buttons add `inset 0 1px 0 rgba(255,255,255,0.05)` top highlight.

### Backgrounds & ambients
- Solid dark fills + alternating sections. No photography, no full-bleed imagery.
- **`.rw-ambient`** is the signature ground: two soft jewel radial blooms (jade top-left, cyan bottom-right) over `--bg-primary`.
- **Animated canvas "scenes"** are the hero motif — a small live `<canvas>` panel beside each card's text that visualizes the concept (DNA helix for *bio*, orbiting globe for *geo*, light rays for *photo*). See `guidelines/scenes.md`.

### Motion
- **House easing:** `--ease-snap cubic-bezier(0.2, 0.8, 0.2, 1)` — snappy ease-out. No bouncy springs.
- **Durations:** 0.15s hover, 0.25s transforms, 0.4s expand, 0.6s entrance fades.
- **Hover** = lift + spark glow. **Press** = `scale(0.98)` (0.08–0.15s). **Selection / keyboard-nav** = cyan focus ring (`--ring-focus`).
- **Pulse** on live indicators (eyebrow dot, daily badge): `rw-pulse` 2s infinite.
- **Entrance:** `rw-rise` fades content up; gate on `[data-active]` + `prefers-reduced-motion: no-preference` so print/PDF/reduced-motion show the end state.
- **Quiz feedback:** combo color shift to amber, correct/wrong tile flash, grade reveal with star fill on the result screen.

---

## ICONOGRAPHY

Wondral Words has **no proprietary icon font and no logo files**. The brand mark is the wordmark **Wondral Words** in Orbitron 800 paired with the 🌱 sprout emoji in a rounded square filled with `--gradient-hero`.

**Emoji are the icon system** — a deliberate, consistent set, one per element, never strings of three:

| Emoji | Meaning |
|---|---|
| 🌱 | Brand mark · root · growth |
| 🎯 | Quiz · Root Rush · daily challenge |
| 🏆 | Profile · achievements |
| ☰ | Index · all items |
| 🔥 | Streak · combo |
| ⭐ ★ | Stars · score |
| ♾️ | Infinite practice |
| ✅ | Correct · done |
| ❌ | Wrong |
| 🔒 | Locked tier |
| 🔬 🗺️ 📷 💧 📡 | Per-word example icons (subject-dependent) |

Per-card "scene" emoji (🧬 🌍 ☀️ 📡 ✍️ 💧 🔥 ✨ ⏳ …) label the animated concept panel. Used as functional icons in menu items, badges, breakdowns and captions — never as decoration.

---

## Index — files in this system

**Foundations**
- `styles.css` — global entry point (imports only). Link this.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `motion.css` · `base.css` — all `--*` tokens + base elements + utility classes.
- `guidelines/*.html` — foundation specimen cards (Design System tab).
- `guidelines/scenes.md` — the animated-canvas-scene motif, documented.

**Components** (`components/`)
- `core/Card`, `core/Badge`, `core/Button`, `core/Chip`, `core/QuizTile` — each is `<Name>.jsx` + `.d.ts` + `.prompt.md` + a `@dsCard` demo.

**UI kit** (`ui_kits/rootwork-app/`)
- The learning app: card deck + index overlay + Root Rush quiz, click-through, re-pigmented to the premium palette.

**Skill**
- `SKILL.md` — download-ready Agent Skill wrapper.

## How to use this system

1. Start any file by linking `styles.css` — it pulls the three fonts and every token.
2. Reach for tokens, never raw hex: `var(--jewel-violet)`, not `#b18cff`.
3. Theme a card by setting three vars on its root: `--spark`, `--spark-rgb`, `--grad`. One item = one jewel, forever.
4. Match the headline pattern: declarative half + gradient payoff half.
5. Emoji as icons — single, deliberate, from the table.
6. Hover = lift + spark glow. Press = `scale(0.98)`. Selection = cyan ring.
7. When in doubt, open `ui_kits/rootwork-app/index.html` — the canonical specimen.

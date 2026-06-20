# Handoff: Rootwork — design system + learning game (v1)

## Overview

Rootwork is a learning-game brand: jewel-lit flashcards with animated concept "scenes," a
profile/home with a selectable master-detail menu, and a timed quiz loop (**Root Rush**) that
grades the player **S / A / B / C / D** with **0–5 stars**. This bundle is the first playable
version — a design system plus two working screens.

## About the design files

The files in this bundle are **design references created in HTML/CSS/vanilla JS** — prototypes
that show the intended look and behavior. They are **not** production code to ship as-is.

The task is to **recreate these designs in the target codebase's environment** using its
established patterns and libraries. Rootwork is a sibling to PianoSurge, whose app is
**React 19 + Vite (Capacitor for iOS/Android)** — if you're building inside or alongside that
stack, port these screens to React components there. If starting fresh, React + Vite mirrors the
sibling app and is the recommended choice. The CSS token layer (`styles.css` + `tokens/`) is
framework-agnostic and can be adopted directly.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, radii, shadows, and interaction states are
all specified here and in the token files. Recreate the UI pixel-accurately using the codebase's
component patterns; lift exact values from `tokens/*.css` rather than eyeballing.

---

## Screens / Views

### 1. Home & Profile — `ui_kits/rootwork-app/home.html`

**Purpose:** Landing screen. The player sees their profile at a glance and chooses what to play
from a browsable list, previewing each choice before committing.

**Layout:** Centered column, `max-width: 1120px`, page padding `clamp(20px,3vw,38px) clamp(16px,5vw,40px) 60px`.
Three stacked regions:

1. **Top bar** — flex row. Left: brand lockup (`🌱` in a 38×38 hero-gradient tile + "Rootwork"
   wordmark, Orbitron 800, "work" filled with hero gradient). Right: two 42×42 circular icon
   buttons (`📖` how-to-play, `⚙️` settings).
2. **Profile band** — flex row, `bg-card` + a 115° jade→cyan wash + radial bloom top-right,
   `border-radius: 24px`, 1px `rgba(255,255,255,0.08)` border, `box-shadow: var(--shadow-card)`.
   - **Avatar:** `clamp(72–92px)` rounded-22px tile, `--gradient-hero` fill, emoji `🦊`, glow
     `0 0 38px rgba(52,224,166,0.45)`. A **level badge** ("LV 12") pins to bottom-right —
     `bg-elevated`, gold text, 2px `bg-card` ring.
   - **Identity:** mono eyebrow "WELCOME BACK" → name "Maya" (Orbitron 900, `clamp(1.7–2.5rem)`)
     → rank line "Scholar · Tier 3 · 1,240 XP to Master" (mono, cobalt + muted).
   - **Stats** (margin-left auto, 4-col): 🔥 7 Day Streak (coral) · ★ 86 Stars (gold) · 94%
     Accuracy (green) · 63 Roots Owned (cyan). Each = Orbitron value + mono uppercase label.
3. **Main grid** — `grid-template-columns: minmax(0,420px) 1fr`, gap `clamp(16–24px)`,
   `align-items: start`. Left = the selectable **menu**; right = the **detail** panel. Each column
   is topped by a label row (Orbitron name + mono hint).

**The selectable menu (left)** — the signature interaction. A vertical list (`role="listbox"`) of
**7 rows**: 2 game modes (Root Rush, Daily Challenge) then 5 tiers (Starter → AI Level). Each row
(`role="option"`, a real `<button>`):
- `--rc` (jewel rgb) + `--rg` (jewel gradient) set per row.
- Layout: 46×46 jewel-gradient chip (emoji) · body (Orbitron title + muted sub + a 3px progress
  bar for tiers) · right meta (percent in jewel color + ★ rating, or "best" score for modes, or
  "🔒 Locked").
- **States:** hover = `translateX(3px)` + jewel-tint border/bg. **Selected** (`.sel`) = stronger
  jewel border, `linear-gradient(100deg, rgba(rc,0.16), rgba(rc,0.04))` fill, `0 0 30px` jewel
  glow. Keyboard focus = cyan ring (`--ring-focus`).
- Inline tags: amber-ish `NEW` pill (Daily) and a `HERE` pill (current tier).

**The detail panel (right)** — re-renders to the selected row's jewel via `--dc` (rgb) + `--dg`
(gradient):
- `border-radius: 24px`, 1px `rgba(dc,0.22)` border, top jewel wash + radial bloom, `min-height: 440px`.
- Contents: pulsing mono eyebrow → **big title** (Orbitron 900, `clamp(2.6–4.1rem)`, jewel-gradient
  text fill, drop-shadow glow) → lead sentence (max 52ch, root words bolded) → **progress block**
  (76px **conic-gradient ring** showing percent with center label, + "X of Y roots owned" and a
  ★ rating) → **sample chips** (root + mono meaning, jewel-tinted pills, "+ N more") → **CTA row**
  (spark button in the jewel gradient + ghost button).
- **Locked tiers** swap the progress block for a 🔒 state and a disabled "Clear Tier N to unlock"
  button.

### 2. Card deck / Index / Root Rush — `ui_kits/rootwork-app/index.html`

**Purpose:** The core learning loop. (Pre-existing prototype, re-pigmented to the jewel palette.)
- **Deck:** one full card per root — jewel-gradient display word, pronunciation + origin, one-line
  meaning, a **live `<canvas>` scene** animating the concept, and a 3-up grid of example words with
  mono breakdowns. Bottom nav: `‹` / center label (opens index) / `›` / `🎯` (quiz) / `☰` (index).
- **Index overlay:** all roots grouped by tier; each is a jewel-tinted selectable chip → jumps to
  that card.
- **Root Rush quiz:** pick a tier → match root → meaning against the clock; build up to **8× combo**;
  graded S/A/B/C/D with 0–5 stars; best score persisted to `localStorage`.

---

## Interactions & behavior

- **Menu selection (home):** click a row, or **↑ / ↓** to move selection (wraps), **Enter** to
  trigger the detail's primary CTA (visual press feedback). Selecting updates the detail panel and
  re-themes it to the row's jewel. Detail content fades up (`rw-rise`, 0.4s) on change.
- **Deck nav:** `←` / `→` or arrows move cards; center label or `☰` opens the index; `🎯` opens
  Root Rush; `Esc` closes overlays; `1–4` answer quiz questions.
- **Hover:** lift + colored glow (cards/buttons), `translateX` (rows). **Press:** `scale(0.98)`,
  ~0.08–0.12s. **Selection / keyboard nav:** cyan ring (`--ring-focus`).
- **Canvas scenes:** only the active card animates (off-screen paused); a single rAF clock drives
  all scenes; `t` freezes under `prefers-reduced-motion: reduce`.
- **Reduced motion:** all animations collapse to ~0ms (handled globally in `tokens/motion.css`).

## State management

The prototypes are local-only; in a real app you'll need:
- **Profile/session:** name, avatar, level + XP, day-streak, total stars, lifetime accuracy,
  per-tier `{ done, total, stars, pct, locked }`, "current tier" pointer.
- **Home menu:** `selectedIndex` (the only UI state). Modes + tiers are data-driven (see the
  `ITEMS` array in `home.html` for the exact shape).
- **Deck:** `activeCardIndex`; overlay open/closed flags.
- **Root Rush:** current question, combo, score, timer, run grade, best score (persisted).
- **Unlocks:** a tier is locked until the previous tier is cleared.
- **Data fetching:** curriculum (roots, tiers, palettes) — currently static in
  `roots-data.js`; back it with an API/content store in production.

## Design tokens

All tokens live in `tokens/*.css` as CSS custom properties — **use `var(--*)`, never raw hex.**

- **Canvas:** `--bg-primary #08070f` · `--bg-secondary #0e0c1a` · `--bg-card #120f24` ·
  `--bg-tertiary #161330` · `--bg-elevated #1b1740` · `--bg-app #090a14`.
- **Text:** `--text-primary #eeedf6` · `--text-secondary #9b98b6` · `--text-muted #66628a` ·
  `--text-on-bright #0a0814`.
- **Jewels** (`--jewel-<name>` / `-rgb` / `-grad`): Jade `#34e0a6` · Cyan `#34d9f0` ·
  Cobalt `#6aa0ff` · Violet `#b18cff` · Magenta `#f57ad0` · Coral `#ff8a6b` · Amber `#ffce4d` ·
  Lime `#b6e84a`. Per-surface theming hooks: `--spark`, `--spark-rgb`, `--grad`.
- **Gradients:** `--gradient-hero` (jade→cyan→cobalt) · `--gradient-fire` (Perfect/Grade S) ·
  `--gradient-gold` (stars) · `--gradient-premium` (unlock).
- **System:** `--success #2fd99a` · `--warning #ffc24d` · `--danger #ff5c6b` · `--info #5b8def` ·
  `--gold #ffd24a`. Focus ring `--focus-ring #34d9f0`.
- **Type:** `--font-game` Orbitron · `--font-display`/`--font-body` Outfit · `--font-mono`
  JetBrains Mono. Sizes `--fs-xs … --fs-display` (`clamp(3.6rem,10vw,7rem)`). Tracking
  `--track-label 0.16em` for mono labels.
- **Spacing:** `--space-1…9` = 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 / 100. Section gutter `--gutter 5%`.
- **Radius:** `--radius-sm 7` · `md 11` · `lg 16` · `xl 24` · `pill 100`.
- **Shadow / glow:** `--shadow-card 0 4px 24px rgba(0,0,0,0.45)` · `--shadow-card-lg` ·
  `--glow-spark` (keyed to `--spark-rgb`) · `--ring-focus` (cyan double-glow).
- **Motion:** `--ease-snap cubic-bezier(0.2,0.8,0.2,1)` · durations `--dur-fast 0.15s … --dur-enter 0.6s`.

## Assets

- **No image/icon/logo files.** The brand mark is the **Rootwork** wordmark (Orbitron 800) + the
  `🌱` emoji in a hero-gradient tile. **Emoji are the icon system** — see the iconography table in
  `docs/DESIGN_SYSTEM.md`. Use the platform's native emoji.
- **Fonts:** Orbitron, Outfit, JetBrains Mono — loaded from Google Fonts in `tokens/typography.css`.
  Self-host for production/offline.
- **Animated scenes** are drawn at runtime on `<canvas>` (no assets) — see `guidelines/scenes.md`.

## Files

- `styles.css` — global entry point (link this; imports all tokens).
- `tokens/colors.css`, `typography.css`, `spacing.css`, `motion.css`, `base.css` — all tokens + utilities.
- `components/<Name>/` — React primitives (`.jsx` + `.d.ts` + `.prompt.md` + `.card.html` demo) for
  Card, Badge, Button, Chip, QuizTile.
- `guidelines/*.html` — foundation specimens; `guidelines/scenes.md` — the animated-scene motif.
- `ui_kits/rootwork-app/home.html` — **Screen 1** (Home & Profile).
- `ui_kits/rootwork-app/index.html` — **Screen 2** (deck + index + Root Rush).
- `ui_kits/rootwork-app/roots-data.js` / `roots-scenes.js` / `roots-quiz.js` — curriculum, canvas
  scenes, quiz engine.
- `docs/DESIGN_SYSTEM.md` — full brand guide (voice, color, type, spacing, motion, iconography).

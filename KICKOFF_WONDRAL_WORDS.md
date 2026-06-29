# Code Task — Wondral Words: animation spike ("blow it out")

> Handoff for a Claude **Code** session. Open the session in `~/Projects/Word-Roots`.
> Created 2026-06-27. **Read `KICKOFF.md` first** — it's the full brief; this file only adds
> what's new since (the brand name + the real content source) and points you at the spike.

## What's new since KICKOFF.md

- **Brand decided: this is "Wondral Words"** — the word-roots line under the **Wondral** umbrella
  (sibling of Wondral Chemistry, the former Orbital). Folder stays `Word-Roots` for now; don't
  rename the repo yet. See the brand brief:
  `CoWork/Thompson-Education-Apps-LLC/docs/Thompson_Education_Wondral_Brand_Architecture_2026-06-27.docx`.
- **Real content source exists.** Craig's 9- and 10-year-olds have **word-root workbooks** in next
  year's homeschool curriculum. That workbook root list is the content spine for v1 — pull hero
  roots from it when available. (Don't block the spike on it; use the classics below to start.)

## This session = the spike (and ONLY the spike)

Honor KICKOFF.md's rule: **the animation IS the product, and it must be validated before any
infrastructure.** No accounts, payments, router, or backend. Build a throwaway standalone page.

1. Animate **2–3 hero roots** — start with the classics: **PYRO** (fire), **HYDRO** (water),
   **ASTRO** (stars). Swap in roots from the kids' workbook if Craig hands them over.
2. Try **one** effect approach first — **GSAP + Canvas particles** (per KICKOFF's recommendation) —
   and judge the *feel*. The bar: "fire on PYRO gives you chills."
3. Only once a treatment lands do you lock the engine (GSAP+Canvas vs PixiJS vs Lottie) and scaffold
   the real app. Not before.

## Definition of done for the spike

A standalone page Craig can open where PYRO / HYDRO / ASTRO each *feel* like their meaning, good
enough to make the engine call. Capture the verdict (which engine, why) in `KICKOFF.md` open
decisions. Then stop and report — scaffolding is a later session.

## Kickoff line to paste into the Code session

> Starting Wondral Words (etymology, animation-first; sibling of `~/Projects/Orbital`). Read
> `KICKOFF.md` then `KICKOFF_WONDRAL_WORDS.md`. Before any scaffolding, build a throwaway spike: a
> standalone page animating PYRO/HYDRO/ASTRO with GSAP+Canvas particles so we can judge the feel and
> lock the animation engine. No accounts/payments/router yet.

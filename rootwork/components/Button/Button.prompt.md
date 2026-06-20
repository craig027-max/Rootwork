Canonical Rootwork button — use for every clickable action; `spark` is the hero CTA, one per screen.

```jsx
<Button variant="spark" jewel="coral" icon="🎯">Start the run</Button>
<Button variant="secondary">See all roots</Button>
<Button variant="ghost" size="sm">Skip</Button>
```

Variants: `spark` (active-jewel gradient — the primary CTA), `primary` (brand hero gradient), `secondary` (outlined), `ghost` (text only). Sizes: `sm` / `md` / `lg`. Pass `jewel` to retheme a spark button; `block` for full width. Hover lifts + glows, press scales to 0.98 — handled by the `.btn` classes.

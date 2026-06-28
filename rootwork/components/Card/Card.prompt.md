The jewel-lit surface every Wondral Words item lives on. Set `jewel` once and all descendants inherit the identity (`--spark` / `--grad`).

```jsx
<Card jewel="violet" interactive>
  <span className="eyebrow"><span className="dot" /> Greek Root</span>
  <h2 className="text-gradient">Chron</h2>
  <p className="lead">See <b>chron</b> and think <b>time</b>.</p>
  <Badge>Tier 4 · Master</Badge>
</Card>
```

`interactive` adds the hover lift + spark glow. Use `.text-gradient` inside for the jewel-filled display word, and `.eyebrow` for the pulsing mono label. One card = one jewel, for that item's whole life.

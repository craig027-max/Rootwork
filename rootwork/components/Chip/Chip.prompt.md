Selectable pill for tier filters, difficulty toggles, and quick choices.

```jsx
<Chip selected jewel="cyan">Tier 1</Chip>
<Chip>Tier 2</Chip>
<Chip>Mixed</Chip>
```

`selected` fills with the jewel gradient; unselected is an outlined pill that tints to the jewel on hover. Renders a real `<button>` with `aria-pressed`.

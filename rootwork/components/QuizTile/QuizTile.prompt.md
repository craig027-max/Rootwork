An answer option in the Root Rush quiz. Stack four; lock them all once the player picks.

```jsx
<QuizTile keyHint="1" label="life"  state="correct" />
<QuizTile keyHint="2" label="earth" state="wrong" />
<QuizTile keyHint="3" label="light" state="dim" />
<QuizTile keyHint="4" label="water" state="dim" />
```

States: `idle` (selectable), `correct` (green), `wrong` (red, the wrong pick), `dim` (faded non-pick). The locked states disable the button. Hover (while idle) tints to the active jewel.

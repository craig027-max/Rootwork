import React from 'react';

/**
 * A single answer option in the Root Rush quiz. Maps to `.quiz-tile`
 * in styles.css. `state` drives the locked feedback colors:
 *   'idle'    — selectable
 *   'correct' — the right answer (green)
 *   'wrong'   — the picked-but-wrong answer (red)
 *   'dim'     — a non-picked option after lock
 * `keyHint` is the 1–4 keyboard shortcut shown on the left.
 */
export function QuizTile({
  label,
  keyHint,
  state = 'idle',
  jewel,
  className = '',
  style,
  ...rest
}) {
  const locked = state !== 'idle';
  const classes = [
    'quiz-tile',
    locked ? 'is-locked' : '',
    state === 'correct' ? 'is-correct' : '',
    state === 'wrong' ? 'is-wrong' : '',
    state === 'dim' ? 'is-dim' : '',
    className,
  ].filter(Boolean).join(' ');

  const themed = jewel
    ? {
        '--spark': `var(--jewel-${jewel})`,
        '--spark-rgb': `var(--jewel-${jewel}-rgb)`,
        '--grad': `var(--jewel-${jewel}-grad)`,
        ...style,
      }
    : style;

  return (
    <button className={classes} style={themed} disabled={locked} {...rest}>
      {keyHint != null ? <span className="qt-key">{keyHint}</span> : null}
      <span className="qt-label">{label}</span>
    </button>
  );
}

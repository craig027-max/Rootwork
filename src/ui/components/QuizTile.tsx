import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { jewelVars, type CSSVars } from './styleVars';

/**
 * A single answer option in the Root Rush quiz. Maps to `.quiz-tile`. `state`
 * drives the locked feedback colors: 'idle' (selectable), 'correct' (green),
 * 'wrong' (red), 'dim' (a non-picked option after lock). `keyHint` is the 1–4
 * keyboard shortcut shown on the left.
 */
export type QuizTileState = 'idle' | 'correct' | 'wrong' | 'dim';

export interface QuizTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  label: ReactNode;
  keyHint?: number | string;
  state?: QuizTileState;
  jewel?: string;
}

export function QuizTile({
  label,
  keyHint,
  state = 'idle',
  jewel,
  className = '',
  style,
  ...rest
}: QuizTileProps) {
  const locked = state !== 'idle';
  const classes = [
    'quiz-tile',
    locked ? 'is-locked' : '',
    state === 'correct' ? 'is-correct' : '',
    state === 'wrong' ? 'is-wrong' : '',
    state === 'dim' ? 'is-dim' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const themed: CSSVars | undefined = jewel
    ? { ...jewelVars(jewel), ...(style as CSSVars) }
    : (style as CSSVars | undefined);

  return (
    <button className={classes} style={themed} disabled={locked} {...rest}>
      {keyHint != null ? <span className="qt-key">{keyHint}</span> : null}
      <span className="qt-label">{label}</span>
    </button>
  );
}

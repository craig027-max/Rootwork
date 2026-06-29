import type { HTMLAttributes } from 'react';
import { jewelVars, type CSSVars } from './styleVars';

/**
 * The signature Wondral Words surface — a jewel-lit card. Sets the three theming
 * vars (--spark / --spark-rgb / --grad) from `jewel` so descendants (gradient
 * text, badges, glows) pick up the same identity. Maps to `.card` /
 * `.card-interactive`. Theme from a content palette by passing the vars via `style`.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  jewel?: string;
  interactive?: boolean;
}

export function Card({
  children,
  jewel,
  interactive = false,
  className = '',
  style,
  ...rest
}: CardProps) {
  const classes = ['card', interactive ? 'card-interactive' : '', className]
    .filter(Boolean)
    .join(' ');

  const themed: CSSVars | undefined = jewel
    ? { ...jewelVars(jewel), ...(style as CSSVars) }
    : (style as CSSVars | undefined);

  return (
    <div className={classes} style={themed} {...rest}>
      {children}
    </div>
  );
}

import type { HTMLAttributes, ReactNode } from 'react';
import { jewelVars, type CSSVars } from './styleVars';

/**
 * Wondral Words badge / pill label. `outline` (default) is a jewel-tinted
 * hairline; `solid` fills with the jewel gradient; `gold` is the star/premium
 * fill. Maps to the `.badge` utilities in the design system.
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'outline' | 'solid' | 'gold';
  jewel?: string;
  icon?: ReactNode;
}

export function Badge({
  children,
  variant = 'outline',
  jewel,
  icon,
  className = '',
  style,
  ...rest
}: BadgeProps) {
  const classes = [
    'badge',
    variant === 'solid' ? 'badge-solid' : variant === 'gold' ? 'badge-gold' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const themed: CSSVars | undefined = jewel
    ? { ...jewelVars(jewel), ...(style as CSSVars) }
    : (style as CSSVars | undefined);

  return (
    <span className={classes} style={themed} {...rest}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

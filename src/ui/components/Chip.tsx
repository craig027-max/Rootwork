import type { ButtonHTMLAttributes } from 'react';
import { jewelVars, type CSSVars } from './styleVars';

/**
 * Selectable pill — tier filters, answer chips, toggles. `selected` fills with
 * the active jewel gradient. Maps to `.chip` in the design system.
 */
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  jewel?: string;
}

export function Chip({
  children,
  selected = false,
  jewel,
  className = '',
  style,
  ...rest
}: ChipProps) {
  const classes = ['chip', selected ? 'on' : '', className].filter(Boolean).join(' ');

  const themed: CSSVars | undefined = jewel
    ? { ...jewelVars(jewel), ...(style as CSSVars) }
    : (style as CSSVars | undefined);

  return (
    <button className={classes} style={themed} aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { jewelVars, type CSSVars } from './styleVars';

/**
 * Wondral Words canonical button. Maps to the `.btn` utility classes in the
 * design system. Variant `spark` fills with the active jewel gradient; pass
 * `jewel` (a named design-system jewel) to retheme it, or set --spark-rgb/--grad
 * via `style` to theme from a content palette. `primary` uses the hero gradient.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'spark' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  jewel?: string;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  children,
  variant = 'spark',
  size = 'md',
  jewel,
  block = false,
  icon,
  className = '',
  style,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const themed: CSSVars | undefined = jewel
    ? { ...jewelVars(jewel), ...(style as CSSVars) }
    : (style as CSSVars | undefined);

  return (
    <button className={classes} style={themed} {...rest}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}

import React from 'react';

/**
 * Wondral Words badge / pill label. `outline` (default) is a jewel-tinted
 * hairline; `solid` fills with the jewel gradient; `gold` is the
 * star/premium fill. Maps to the `.badge` utilities in styles.css.
 */
export function Badge({
  children,
  variant = 'outline',
  jewel,
  icon,
  className = '',
  style,
  ...rest
}) {
  const classes = [
    'badge',
    variant === 'solid' ? 'badge-solid' : variant === 'gold' ? 'badge-gold' : '',
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
    <span className={classes} style={themed} {...rest}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

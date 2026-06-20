import React from 'react';

/**
 * Selectable pill — tier filters, answer chips, toggles. `selected`
 * fills with the active jewel gradient. Maps to `.chip` in styles.css.
 */
export function Chip({
  children,
  selected = false,
  jewel,
  className = '',
  style,
  ...rest
}) {
  const classes = ['chip', selected ? 'on' : '', className].filter(Boolean).join(' ');

  const themed = jewel
    ? {
        '--spark': `var(--jewel-${jewel})`,
        '--spark-rgb': `var(--jewel-${jewel}-rgb)`,
        '--grad': `var(--jewel-${jewel}-grad)`,
        ...style,
      }
    : style;

  return (
    <button className={classes} style={themed} aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}

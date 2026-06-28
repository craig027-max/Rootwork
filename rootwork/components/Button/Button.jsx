import React from 'react';

/**
 * Wondral Words canonical button. Maps to the `.btn` utility classes in
 * styles.css. Variant `spark` fills with the active jewel gradient;
 * pass `jewel` to retheme it. `primary` uses the brand hero gradient.
 */
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
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    block ? 'btn-block' : '',
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
    <button className={classes} style={themed} {...rest}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}

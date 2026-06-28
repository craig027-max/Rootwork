import React from 'react';

/**
 * The signature Wondral Words surface — a jewel-lit card. Sets the three
 * theming vars (--spark / --spark-rgb / --grad) from `jewel`, so all
 * descendants (gradient text, badges, glows, hover bloom) pick up the
 * same identity. Maps to `.card` / `.card-interactive` in styles.css.
 */
export function Card({
  children,
  jewel = 'jade',
  interactive = false,
  as: Tag = 'div',
  className = '',
  style,
  ...rest
}) {
  const classes = ['card', interactive ? 'card-interactive' : '', className]
    .filter(Boolean).join(' ');

  return (
    <Tag
      className={classes}
      style={{
        '--spark': `var(--jewel-${jewel})`,
        '--spark-rgb': `var(--jewel-${jewel}-rgb)`,
        '--grad': `var(--jewel-${jewel}-grad)`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

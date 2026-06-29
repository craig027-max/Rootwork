import type { CSSProperties } from 'react';

/** CSSProperties that also allows CSS custom properties (--var) — used to theme
 *  the jewel-lit primitives by setting --spark / --spark-rgb / --grad. */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/** Build the three jewel theming vars from a named design-system jewel. */
export function jewelVars(jewel: string): CSSVars {
  return {
    '--spark': `var(--jewel-${jewel})`,
    '--spark-rgb': `var(--jewel-${jewel}-rgb)`,
    '--grad': `var(--jewel-${jewel}-grad)`,
  };
}

/** Build the jewel theming vars directly from a content palette (PALETTES entry),
 *  bypassing the named-jewel lookup. `rgb` is an "r,g,b" string; `grad` a CSS gradient. */
export function paletteVars(rgb: string, grad: string): CSSVars {
  return {
    '--spark': `rgb(${rgb})`,
    '--spark-rgb': rgb,
    '--grad': grad,
  };
}

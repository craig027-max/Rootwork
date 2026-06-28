import * as React from 'react';
import type { Jewel } from '../Button/Button';

/**
 * Jewel-lit surface — the core Wondral Words container. Theming any
 * content inside is automatic: set `jewel` once and gradient text,
 * badges, borders and glows all inherit it.
 *
 * @startingPoint section="Core" subtitle="Jewel-lit card surface" viewport="700x260"
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Jewel identity applied to the whole card. Default `jade`. */
  jewel?: Jewel;
  /** Adds hover lift + spark glow. */
  interactive?: boolean;
  /** Render as a different element (e.g. `'a'`, `'article'`). */
  as?: keyof React.JSX.IntrinsicElements;
}

export function Card(props: CardProps): React.JSX.Element;

import * as React from 'react';
import type { Jewel } from '../Button/Button';

export type BadgeVariant = 'outline' | 'solid' | 'gold';

/**
 * Small uppercase mono label — tiers, counts, "New", star totals.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** `outline` jewel hairline (default), `solid` jewel fill, or `gold` star/premium fill. */
  variant?: BadgeVariant;
  /** Jewel identity for outline/solid variants. */
  jewel?: Jewel;
  /** Optional leading emoji/icon. */
  icon?: React.ReactNode;
}

export function Badge(props: BadgeProps): React.JSX.Element;

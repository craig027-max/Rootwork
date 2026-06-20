import * as React from 'react';
import type { Jewel } from '../Button/Button';

/**
 * Selectable pill for filters and toggles.
 */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (filled) state. */
  selected?: boolean;
  /** Jewel identity for the selected fill + hover tint. */
  jewel?: Jewel;
}

export function Chip(props: ChipProps): React.JSX.Element;

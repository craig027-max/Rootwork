import * as React from 'react';

export type ButtonVariant = 'spark' | 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type Jewel =
  | 'jade' | 'cyan' | 'cobalt' | 'violet'
  | 'magenta' | 'coral' | 'amber' | 'lime';

/**
 * Canonical Wondral Words button.
 *
 * @startingPoint section="Core" subtitle="Spark / primary / secondary / ghost button" viewport="700x160"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `spark` = active-jewel gradient fill (the hero CTA); `primary` = brand hero gradient. Default `spark`. */
  variant?: ButtonVariant;
  /** Size token. Default `md`. */
  size?: ButtonSize;
  /** Retheme a `spark` button to a specific jewel identity. */
  jewel?: Jewel;
  /** Full-width. */
  block?: boolean;
  /** Optional leading emoji/icon. One only — never a string of three. */
  icon?: React.ReactNode;
}

export function Button(props: ButtonProps): React.JSX.Element;

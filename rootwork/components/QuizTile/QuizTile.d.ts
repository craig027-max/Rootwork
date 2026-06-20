import * as React from 'react';
import type { Jewel } from '../Button/Button';

export type QuizTileState = 'idle' | 'correct' | 'wrong' | 'dim';

/**
 * One answer option in the Root Rush quiz loop.
 *
 * @startingPoint section="Core" subtitle="Quiz answer tile with locked feedback states" viewport="700x240"
 */
export interface QuizTileProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The answer text (Orbitron). */
  label: React.ReactNode;
  /** 1–4 keyboard shortcut shown on the left. */
  keyHint?: React.ReactNode;
  /** Feedback state after the answer is locked. Default `idle`. */
  state?: QuizTileState;
  /** Jewel identity for hover tint. */
  jewel?: Jewel;
}

export function QuizTile(props: QuizTileProps): React.JSX.Element;

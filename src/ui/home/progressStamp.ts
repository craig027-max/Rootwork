/**
 * Local progress stamps used by Home Today (learned / Remember).
 * Kept free of the zustand store and of the Today copy model.
 */
import { localDayKey } from '../../core/daily';

export interface ProgressStamp {
  completedAt?: number;
  /** Last successful recall on an already-owned root (Remember). */
  reviewedAt?: number;
}

/**
 * Stamp a successful recall on an already-owned root. Same-day repeat is a
 * no-op (null) so Remember cannot double-bump the streak.
 */
export function stampReviewedAt<T extends ProgressStamp>(
  progress: Record<string, T>,
  id: string,
  at: number,
): Record<string, T> | null {
  const rec = progress[id];
  if (!rec) return null;
  const prev = rec.reviewedAt;
  if (
    typeof prev === 'number' &&
    Number.isFinite(prev) &&
    localDayKey(new Date(prev)) === localDayKey(new Date(at))
  ) {
    return null;
  }
  return { ...progress, [id]: { ...rec, reviewedAt: at } };
}

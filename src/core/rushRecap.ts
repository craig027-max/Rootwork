/**
 * Root Rush recap — last-run roots as Remember taps, not a grade-only dump.
 *
 * Daily already recaps today's five as named Remember chips (#59 / #61).
 * Rush result was letter / stars / combo only, and Home Rush forbade any
 * sample list so Bio / Geo / Photo could not pretend to be the quiz.
 * This keeps that honesty: chips are the real last run (never a Starter
 * teaser). A correct owned hit is today's Remember — same stamp Daily
 * already uses. Mid-run Daily still wins the Home Rush tile so Chron
 * is not buried under a recap dump.
 *
 * Pure and Date-injectable so tests lock the copy without I/O.
 */

import { ROOTS_BY_ID } from '../data/roots';

/** Home Rush tile peeks this many of the last run — the result still lists all. */
export const RUSH_RECAP_PREVIEW_COUNT = 4;

export interface RushRecapLine {
  id: string;
  root: string;
  mean: string;
  ok: boolean;
}

/** Last finished Rush — namespaced per learner, like Daily mid-run. */
export interface RushRecap {
  day: string;
  studentId: string | null;
  roots: RushRecapLine[];
}

/** Coerce a stored blob into a RushRecap, or drop junk. */
export function parseRushRecap(raw: unknown): RushRecap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.day)) return null;
  if (o.studentId != null && typeof o.studentId !== 'string') return null;
  if (!Array.isArray(o.roots) || o.roots.length === 0) return null;
  const roots: RushRecapLine[] = [];
  for (const item of o.roots) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || !r.id) continue;
    if (typeof r.root !== 'string' || !r.root.trim()) continue;
    if (typeof r.mean !== 'string') continue;
    roots.push({
      id: r.id,
      root: r.root.replace(/\s+/g, ' ').trim(),
      mean: r.mean.replace(/\s+/g, ' ').trim(),
      ok: r.ok === true,
    });
  }
  if (roots.length === 0) return null;
  return { day: o.day, studentId: o.studentId ?? null, roots };
}

/**
 * Last-run recap for this kid. Yesterday's run still counts until they
 * rush again — it is not a Daily deal. Another kid / junk drops.
 */
export function liveRushRecap(
  recap: RushRecap | null | undefined,
  studentId: string | null,
): RushRecap | null {
  if (!recap || recap.roots.length === 0) return null;
  if ((recap.studentId ?? null) !== (studentId ?? null)) return null;
  return recap;
}

/** Kid-facing name + meaning lines from a last run (catalog file order is not used). */
export function rushRecapPreview(
  recap: RushRecap | null | undefined,
  count: number = RUSH_RECAP_PREVIEW_COUNT,
): { root: string; mean: string }[] {
  if (!recap || recap.roots.length === 0 || count <= 0) return [];
  return recap.roots.slice(0, Math.min(count, recap.roots.length)).map((r) => ({
    root: r.root,
    mean: r.mean,
  }));
}

/**
 * Home Rush tile recap. A live Daily mid-run keeps the tile empty so Chron
 * is not buried under last-run chips. Fresh / no-run stays empty — never
 * a Bio / Geo / Photo dump.
 */
export function homeRushRecapPreview(
  recap: RushRecap | null | undefined,
  opts: { dailyResume?: boolean; count?: number } = {},
): { root: string; mean: string }[] {
  if (opts.dailyResume) return [];
  return rushRecapPreview(recap, opts.count);
}

/** Build a persistable last-run recap from this round's questions. */
export function rushRecapFromRun(
  lines: readonly { id: string; ok: boolean }[],
  opts: { day: string; studentId: string | null },
): RushRecap | null {
  const roots: RushRecapLine[] = [];
  for (const line of lines) {
    const catalog = ROOTS_BY_ID[line.id];
    if (!catalog) continue;
    roots.push({
      id: line.id,
      root: catalog.root,
      mean: catalog.mean,
      ok: line.ok,
    });
  }
  if (roots.length === 0) return null;
  return { day: opts.day, studentId: opts.studentId, roots };
}

/**
 * After a correct Rush tap — the meaning, then the combo points.
 * Not a points-only dump, and not an auto-open onto the next root's ask.
 */
export function rushHoldLine(
  rootName: string,
  mean: string,
  points: number,
  mult: number,
): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  const spokenMean = mean.replace(/\s+/g, ' ').trim();
  const pts = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;
  const combo = Number.isFinite(mult) && mult > 1 ? ` · ${mult}× combo` : '';
  if (!name || !spokenMean) return `+${pts.toLocaleString('en-US')}${combo}`;
  return `Yes — ${name} means ${spokenMean}. +${pts.toLocaleString('en-US')}${combo}`;
}

/** Kid-facing aria on a Rush result chip. */
export function rushRecapChipLabel(rootName: string, owned: boolean): string {
  const name = rootName.replace(/\s+/g, ' ').trim();
  if (!name) return owned ? 'Remember' : 'Meet this root';
  return owned ? `Remember ${name}` : `Meet ${name}`;
}

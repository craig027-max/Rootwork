/* Shared canvas helpers for the parametric scene engine. */

export type SceneFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  pal: string[],
) => void;

export const TAU = 6.2831853;
export const RUNG = ['239,68,68', '245,158,11', '52,224,122', '6,182,212', '59,130,246'];
export const WHITE = '255,255,255';

export const p0 = (pal: string[]): string => pal[0] ?? WHITE;
export const p1 = (pal: string[]): string => pal[1] ?? WHITE;
export const rung = (i: number): string =>
  RUNG[((i % RUNG.length) + RUNG.length) % RUNG.length] ?? WHITE;

export function rr(
  x: CanvasRenderingContext2D,
  X: number,
  Y: number,
  w: number,
  h: number,
  r: number,
): void {
  x.beginPath();
  x.moveTo(X + r, Y);
  x.arcTo(X + w, Y, X + w, Y + h, r);
  x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r);
  x.arcTo(X, Y, X + w, Y, r);
  x.closePath();
}

export function glow(
  x: CanvasRenderingContext2D,
  px: number,
  py: number,
  r: number,
  col: string,
  a: number,
): void {
  const g = x.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, `rgba(${col},${a})`);
  g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g;
  x.beginPath();
  x.arc(px, py, r, 0, TAU);
  x.fill();
}

export function disc(
  x: CanvasRenderingContext2D,
  px: number,
  py: number,
  r: number,
  fill: string,
): void {
  x.fillStyle = fill;
  x.beginPath();
  x.arc(px, py, r, 0, TAU);
  x.fill();
}

export function line(
  x: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  x.beginPath();
  x.moveTo(x0, y0);
  x.lineTo(x1, y1);
  x.stroke();
}

export function poly(
  x: CanvasRenderingContext2D,
  pts: ReadonlyArray<readonly [number, number]>,
): void {
  x.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (!p) continue;
    if (i === 0) x.moveTo(p[0], p[1]);
    else x.lineTo(p[0], p[1]);
  }
  x.closePath();
}

/** Puff cloud — instantly reads as sky / weather. */
export function cloud(
  x: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  fill: string,
): void {
  disc(x, px, py, s * 0.52, fill);
  disc(x, px - s * 0.48, py + s * 0.1, s * 0.4, fill);
  disc(x, px + s * 0.5, py + s * 0.12, s * 0.42, fill);
  disc(x, px + s * 0.08, py - s * 0.28, s * 0.36, fill);
}

/** Simple leaf silhouette with a midrib. */
export function leaf(
  x: CanvasRenderingContext2D,
  px: number,
  py: number,
  rot: number,
  s: number,
  fill: string,
  vein: string,
): void {
  x.save();
  x.translate(px, py);
  x.rotate(rot);
  x.fillStyle = fill;
  x.beginPath();
  x.moveTo(0, -s);
  x.quadraticCurveTo(s * 0.72, -s * 0.15, 0, s);
  x.quadraticCurveTo(-s * 0.72, -s * 0.15, 0, -s);
  x.fill();
  x.strokeStyle = vein;
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(0, -s * 0.75);
  x.lineTo(0, s * 0.7);
  x.stroke();
  x.restore();
}

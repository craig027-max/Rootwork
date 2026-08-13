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

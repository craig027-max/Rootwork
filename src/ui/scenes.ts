/* ============================================================
   Word Roots — Canvas scene engine
   Each scene: fn(ctx, w, h, t, pal)
     ctx = CanvasRenderingContext2D (already DPR-scaled)
     w,h = CSS pixel size of the scene
     t   = elapsed seconds (frozen if prefers-reduced-motion)
     pal = [ "r,g,b", "r,g,b" ]  the card's two scene colors
   Marquee scenes (dna, light, water, heat, stars) live in sceneMarquee.ts.
   Meaning-true scenes that replace contradicting generics live in
   sceneMeanings.ts. Assignment-audit scenes live in sceneAssign.ts.
   Array indexing into `pal` is guarded for TS strict.
   ============================================================ */

import type { SceneFn } from './sceneUtil';
import { TAU, disc, glow, line, p0, p1, poly, rr } from './sceneUtil';
export type { SceneFn } from './sceneUtil';
import { dna, heat, light, stars, water } from './sceneMarquee';
import {
  air,
  build,
  circle,
  equal,
  fall,
  half,
  hang,
  hold,
  lift,
  loop,
  loosen,
  many,
  morph,
  nature,
  one,
  place,
  pull,
  shut,
  stand,
  step,
  straight,
  three,
  touch,
  twist,
  two,
  wing,
} from './sceneMeanings';
import {
  against,
  apart,
  beauty,
  before,
  between,
  boat,
  body,
  bone,
  book,
  calm,
  city,
  color,
  cut,
  death,
  different,
  end,
  fish,
  fresh,
  good,
  hand,
  hundred,
  join,
  lead,
  name,
  onehalf,
  power,
  rule,
  self,
  sleep,
  stone,
  stranger,
  strong,
  tooth,
  under,
  wrong,
} from './sceneAssign';

const LAND = '72,168,110';
const ICE = '230,240,255';
const TILT = 0.41; // ~23.5° axial tilt

type LonLat = readonly [number, number];

/** Simplified continent outlines [lat°, lon°] — enough to read as Earth. */
const CONTINENTS: LonLat[][] = [
  // Africa
  [
    [37, -6], [32, 32], [12, 48], [5, 46], [-5, 40], [-18, 38], [-34, 26],
    [-34, 18], [-22, 14], [-5, 12], [5, 8], [12, -16], [22, -17], [32, -10], [37, -6],
  ],
  // Eurasia
  [
    [70, 20], [68, 140], [55, 160], [42, 130], [22, 120], [8, 78], [22, 44],
    [30, 34], [38, 26], [45, 12], [52, 4], [60, -8], [70, 20],
  ],
  // North America
  [
    [70, -90], [68, -165], [58, -158], [48, -125], [32, -117], [16, -94],
    [26, -97], [30, -84], [45, -66], [50, -56], [60, -65], [70, -90],
  ],
  // South America
  [
    [10, -62], [10, -78], [-5, -80], [-20, -72], [-50, -76], [-55, -68],
    [-35, -58], [-10, -36], [6, -50], [10, -62],
  ],
  // Australia
  [[-12, 132], [-16, 146], [-32, 152], [-38, 140], [-32, 116], [-20, 114], [-12, 132]],
  // Greenland
  [[82, -40], [76, -20], [62, -44], [72, -58], [82, -40]],
];

function project(
  latDeg: number,
  lonDeg: number,
  spin: number,
  R: number,
  cx: number,
  cy: number,
): { px: number; py: number; z: number } {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180 + spin;
  const cosLat = Math.cos(lat);
  const x3 = cosLat * Math.sin(lon);
  const y3 = Math.sin(lat);
  const z3 = cosLat * Math.cos(lon);
  const ct = Math.cos(TILT),
    st = Math.sin(TILT);
  const y2 = y3 * ct - z3 * st;
  const z2 = y3 * st + z3 * ct;
  return { px: cx + x3 * R, py: cy - y2 * R, z: z2 };
}

// Earth with continents, oceans, day/night, axial tilt (earth).
function globe(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.36;
  const spin = t * 0.28;

  glow(x, cx, cy, R * 1.45, p0(pal), 0.22);
  x.strokeStyle = `rgba(${p0(pal)},0.28)`;
  x.lineWidth = 10;
  x.beginPath();
  x.arc(cx, cy, R * 1.08, 0, TAU);
  x.stroke();

  // Axis of rotation (the tilt cue).
  const pole = project(90, 0, spin, R * 1.18, cx, cy);
  const south = project(-90, 0, spin, R * 1.18, cx, cy);
  x.strokeStyle = `rgba(255,255,255,0.35)`;
  x.lineWidth = 1.2;
  x.setLineDash([3, 4]);
  line(x, pole.px, pole.py, south.px, south.py);
  x.setLineDash([]);
  disc(x, pole.px, pole.py, 2.4, 'rgba(255,255,255,0.7)');
  disc(x, south.px, south.py, 2.4, 'rgba(255,255,255,0.7)');

  x.save();
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.clip();

  const ocean = x.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  ocean.addColorStop(0, `rgba(${p0(pal)},0.85)`);
  ocean.addColorStop(0.55, `rgba(${p1(pal)},0.7)`);
  ocean.addColorStop(1, `rgba(${p1(pal)},0.4)`);
  x.fillStyle = ocean;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.fill();

  // Equator — faint, so you can tell it's a globe not a ball.
  x.strokeStyle = 'rgba(255,255,255,0.18)';
  x.lineWidth = 1;
  x.beginPath();
  const eq: Array<[number, number]> = [];
  for (let d = -90; d <= 90; d += 8) {
    const p = project(0, d, spin, R, cx, cy);
    if (p.z > 0) eq.push([p.px, p.py]);
  }
  eq.forEach((pt, i) => {
    if (i === 0) x.moveTo(pt[0], pt[1]);
    else x.lineTo(pt[0], pt[1]);
  });
  x.stroke();

  for (const outline of CONTINENTS) {
    const pts: Array<[number, number]> = [];
    let zSum = 0;
    for (const ll of outline) {
      const p = project(ll[0], ll[1], spin, R, cx, cy);
      zSum += p.z;
      if (p.z > -0.12) pts.push([p.px, p.py]);
    }
    if (pts.length < 4 || zSum / outline.length < 0.05) continue;
    poly(x, pts);
    x.fillStyle = `rgba(${LAND},0.88)`;
    x.fill();
    x.strokeStyle = `rgba(${LAND},0.95)`;
    x.lineWidth = 0.8;
    x.stroke();
  }

  // Antarctica as an ice cap.
  const ice: Array<[number, number]> = [];
  for (let k = 0; k < 16; k++) {
    const p = project(-78, (k / 16) * 360 - 180, spin, R, cx, cy);
    if (p.z > 0) ice.push([p.px, p.py]);
  }
  if (ice.length > 3) {
    poly(x, ice);
    x.fillStyle = `rgba(${ICE},0.85)`;
    x.fill();
  }

  // Night side.
  const night = x.createLinearGradient(cx - R * 0.2, cy, cx + R, cy);
  night.addColorStop(0, 'rgba(8,12,36,0)');
  night.addColorStop(0.42, 'rgba(8,12,36,0)');
  night.addColorStop(0.62, 'rgba(8,12,36,0.28)');
  night.addColorStop(1, 'rgba(6,10,28,0.62)');
  x.fillStyle = night;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.fill();
  x.restore();

  x.strokeStyle = `rgba(${p0(pal)},0.7)`;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.stroke();

  // Tiny moon so it's a planet in space, not a featureless sphere.
  const ma = t * 0.55;
  glow(x, cx + Math.cos(ma) * R * 1.42, cy + Math.sin(ma) * R * 0.42, 10, '255,255,255', 0.55);
  disc(x, cx + Math.cos(ma) * R * 1.42, cy + Math.sin(ma) * R * 0.42, 4, 'rgba(230,230,240,0.9)');
}

// Two radio towers sending a signal across a gap (far).
function waves(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const ground = H * 0.78;
  const sx = W * 0.2,
    dx = W * 0.8,
    th = H * 0.42;

  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 2;
  line(x, W * 0.06, ground, W * 0.94, ground);

  function tower(tx: number, col: string, lit: number): void {
    x.strokeStyle = `rgba(${col},0.85)`;
    x.lineWidth = 2;
    line(x, tx - 16, ground, tx, ground - th);
    line(x, tx + 16, ground, tx, ground - th);
    for (let k = 1; k <= 3; k++) {
      const y = ground - (th * k) / 4;
      const w = 16 * (1 - k / 4);
      line(x, tx - w, y, tx + w, y);
    }
    x.strokeStyle = `rgba(${col},0.9)`;
    line(x, tx, ground - th, tx, ground - th - 14);
    glow(x, tx, ground - th - 14, 10 + lit * 8, col, 0.45 + lit * 0.4);
    disc(x, tx, ground - th - 14, 3.5, `rgba(${col},0.95)`);
  }

  x.globalCompositeOperation = 'lighter';
  let near = 0;
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.45 + i / 4) % 1;
    const px = sx + (dx - sx) * p;
    const al = Math.sin(p * Math.PI);
    disc(x, px, ground - th - 8, 3.5, `rgba(${p1(pal)},${al})`);
    if (p > 0.88) near = Math.max(near, al);
  }
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.55 + i / 4) % 1;
    x.strokeStyle = `rgba(${p0(pal)},${(1 - p) * 0.5})`;
    x.lineWidth = 2;
    x.beginPath();
    x.arc(sx, ground - th - 8, 10 + p * 36, -1.1, 1.1);
    x.stroke();
  }
  tower(sx, p0(pal), 1);
  tower(dx, p1(pal), near);
  x.globalCompositeOperation = 'source-over';
}

/**
 * Side-view pencil: graphite nib, wood cone, jewel barrel, ferrule, eraser.
 * Local space: writing tip at the origin, barrel along −x. `s` is half the barrel width.
 * Parts are laid out as left-edges so they stay one connected silhouette.
 */
function pencil(x: CanvasRenderingContext2D, pal: string[], s: number): void {
  const hw = s;
  const graphite = s * 0.95;
  const wood = s * 1.55;
  const bodyLen = s * 7.2;
  const ferrule = s * 0.7;
  const eraser = s * 0.95;
  const graphiteL = -graphite;
  const woodL = graphiteL - wood;
  const bodyL = woodL - bodyLen;
  const ferruleL = bodyL - ferrule;
  const eraserL = ferruleL - eraser;
  const lw = Math.max(1.1, s * 0.1);
  const facetR = Math.min(1.6, hw * 0.12);

  x.lineJoin = 'round';
  x.lineCap = 'butt';

  // Eraser (back).
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  rr(x, eraserL, -hw * 0.9, eraser, hw * 1.8, Math.min(hw * 0.42, eraser * 0.4));
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = lw;
  rr(x, eraserL, -hw * 0.9, eraser, hw * 1.8, Math.min(hw * 0.42, eraser * 0.4));
  x.stroke();

  // Metal ferrule with two bands — the pink / silver / barrel sandwich.
  x.fillStyle = 'rgba(220,228,240,0.88)';
  rr(x, ferruleL, -hw * 1.05, ferrule, hw * 2.1, 1);
  x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.7)';
  x.lineWidth = Math.max(1, s * 0.07);
  rr(x, ferruleL, -hw * 1.05, ferrule, hw * 2.1, 1);
  x.stroke();
  x.strokeStyle = 'rgba(40,48,64,0.35)';
  x.lineWidth = Math.max(1, s * 0.06);
  line(x, ferruleL + ferrule * 0.32, -hw * 0.98, ferruleL + ferrule * 0.32, hw * 0.98);
  line(x, ferruleL + ferrule * 0.68, -hw * 0.98, ferruleL + ferrule * 0.68, hw * 0.98);

  // Barrel.
  x.fillStyle = `rgba(${p0(pal)},0.95)`;
  rr(x, bodyL, -hw, bodyLen, hw * 2, Math.min(hw * 0.18, bodyLen * 0.03));
  x.fill();
  x.fillStyle = 'rgba(255,255,255,0.28)';
  rr(x, bodyL + s * 0.2, -hw * 0.62, bodyLen - s * 0.4, hw * 0.38, facetR);
  x.fill();
  x.fillStyle = `rgba(${p0(pal)},0.4)`;
  rr(x, bodyL + s * 0.2, hw * 0.22, bodyLen - s * 0.4, hw * 0.58, facetR);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.98)`;
  x.lineWidth = Math.max(1.3, s * 0.11);
  rr(x, bodyL, -hw, bodyLen, hw * 2, Math.min(hw * 0.18, bodyLen * 0.03));
  x.stroke();

  // Sharpened wood cone + center seam — the cue that this is a pencil.
  x.fillStyle = `rgba(${p1(pal)},0.82)`;
  x.beginPath();
  x.moveTo(graphiteL, -hw * 0.2);
  x.lineTo(woodL, -hw);
  x.lineTo(woodL, hw);
  x.lineTo(graphiteL, hw * 0.2);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = lw;
  x.stroke();
  x.strokeStyle = 'rgba(40,30,24,0.45)';
  x.lineWidth = Math.max(1, s * 0.08);
  line(x, woodL, 0, graphiteL, 0);

  // Graphite nib sitting on the stroke.
  x.fillStyle = 'rgba(28,26,36,0.96)';
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(graphiteL, -hw * 0.2);
  x.lineTo(graphiteL, hw * 0.2);
  x.closePath();
  x.fill();
  x.strokeStyle = 'rgba(12,10,18,0.9)';
  x.lineWidth = Math.max(0.9, s * 0.07);
  x.stroke();
}

// Pencil writing on a page (write / draw).
function draw(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const pageX = W * 0.14,
    pageY = H * 0.16,
    pageW = W * 0.72,
    pageH = H * 0.64;
  x.fillStyle = 'rgba(245,242,230,0.12)';
  rr(x, pageX, pageY, pageW, pageH, 6);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.35)`;
  x.lineWidth = 1.5;
  rr(x, pageX, pageY, pageW, pageH, 6);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.12)`;
  x.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = pageY + 12 + i * (pageH / 7);
    line(x, pageX + 12, y, pageX + pageW - 12, y);
  }

  const x0 = pageX + Math.max(28, pageW * 0.2),
    x1 = pageX + pageW - Math.max(16, pageW * 0.1),
    midY = pageY + pageH * 0.5,
    amp = pageH * 0.16,
    SEG = 160;
  const prog = (t * 0.16) % 1.25,
    tip = Math.min(1, prog);
  const fy = (f: number): number =>
    midY + Math.sin(f * 8) * amp * Math.sin(f * Math.PI) + Math.sin(f * 21) * amp * 0.14;

  x.strokeStyle = `rgba(${p0(pal)},0.92)`;
  x.lineWidth = Math.max(3.2, Math.min(W, H) * 0.018);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  const tipN = Math.floor(SEG * tip);
  for (let n = 0; n <= tipN; n++) {
    const f = n / SEG,
      px = x0 + (x1 - x0) * f;
    if (n) x.lineTo(px, fy(f));
    else x.moveTo(px, fy(f));
  }
  x.stroke();

  // Always park the pencil on the current tip — including t=0 (reduced motion)
  // and the hold after the stroke finishes. Hiding it left only a round line-cap,
  // which read as a dot dragging a line at home-preview size.
  const f = tip;
  const px = x0 + (x1 - x0) * f;
  const py = fy(f);
  const ahead = Math.min(1, f + 0.03);
  const along = Math.atan2(fy(ahead) - py, Math.max(8, (x1 - x0) * 0.03));
  const s = Math.max(7, Math.min(11, Math.min(W, H) * 0.05));
  x.save();
  x.translate(px, py);
  x.rotate(along + 0.72);
  pencil(x, pal, s);
  x.restore();
}

// Analog clock face with 12/3/6/9 (time).
function clock(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.34;
  x.fillStyle = `rgba(${p0(pal)},0.1)`;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.7)`;
  x.lineWidth = 4;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.stroke();
  x.strokeStyle = `rgba(${p0(pal)},0.55)`;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx, cy, R * 0.92, 0, TAU);
  x.stroke();

  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU - Math.PI / 2;
    const inner = k % 3 === 0 ? R * 0.74 : R * 0.82;
    x.strokeStyle = `rgba(${p0(pal)},${k % 3 === 0 ? 0.85 : 0.4})`;
    x.lineWidth = k % 3 === 0 ? 3 : 1.4;
    line(x, cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
  }

  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.font = `600 ${Math.max(11, R * 0.2)}px ui-rounded, system-ui, sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('12', cx, cy - R * 0.62);
  x.fillText('3', cx + R * 0.62, cy);
  x.fillText('6', cx, cy + R * 0.62);
  x.fillText('9', cx - R * 0.62, cy);

  const hands: Array<[number, number, number, string]> = [
    [t * 0.35, R * 0.45, 4, p0(pal)],
    [t * 0.7, R * 0.68, 2.5, p1(pal)],
    [t * 4.2, R * 0.78, 1.2, '255,255,255'],
  ];
  hands.forEach(([ang, len, lw, col]) => {
    const a = ang - Math.PI / 2;
    x.strokeStyle = `rgba(${col},0.92)`;
    x.lineWidth = lw;
    x.lineCap = 'round';
    line(x, cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
  });
  disc(x, cx, cy, 5, 'rgba(255,255,255,0.95)');
}

// Speaker cone pushing sound waves (sound / hear).
function sound(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const cx = W * 0.38,
    cy = H * 0.5;
  x.fillStyle = `rgba(${p0(pal)},0.35)`;
  rr(x, cx - 48, cy - 32, 40, 64, 8);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.85)`;
  x.lineWidth = 2;
  rr(x, cx - 48, cy - 32, 40, 64, 8);
  x.stroke();
  x.fillStyle = `rgba(${p1(pal)},0.25)`;
  x.beginPath();
  x.moveTo(cx - 8, cy - 20);
  x.lineTo(cx + 28, cy - 40);
  x.lineTo(cx + 28, cy + 40);
  x.lineTo(cx - 8, cy + 20);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.85)`;
  x.stroke();
  disc(x, cx + 6, cy, 8, `rgba(${p1(pal)},0.7)`);

  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.7 + i / 4) % 1;
    x.strokeStyle = `rgba(${p1(pal)},${(1 - p) * 0.6})`;
    x.lineWidth = 2.4;
    x.beginPath();
    x.arc(cx + 28, cy, 12 + p * 52, -0.9, 0.9);
    x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
}

// Watching eye with lashes (see / look).
function eye(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const cx = W / 2,
    cy = H / 2,
    ew = Math.min(W * 0.34, 170),
    eh = ew * 0.55;
  function lid(): void {
    x.beginPath();
    x.moveTo(cx - ew, cy);
    x.quadraticCurveTo(cx, cy - eh, cx + ew, cy);
    x.quadraticCurveTo(cx, cy + eh, cx - ew, cy);
  }
  x.fillStyle = 'rgba(245,245,250,0.12)';
  lid();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.7)`;
  x.lineWidth = 2.6;
  lid();
  x.stroke();

  // Lashes + brow so it cannot be a random oval.
  x.strokeStyle = `rgba(${p0(pal)},0.55)`;
  x.lineWidth = 1.4;
  for (let i = -3; i <= 3; i++) {
    const a = (i / 8) * Math.PI;
    const bx = cx + Math.sin(a) * ew * 0.85;
    const by = cy - Math.cos(a) * eh * 0.95;
    line(x, bx, by, bx + Math.sin(a) * 8, by - 10);
  }
  x.lineWidth = 2.2;
  x.beginPath();
  x.moveTo(cx - ew * 0.85, cy - eh * 1.25);
  x.quadraticCurveTo(cx, cy - eh * 1.7, cx + ew * 0.85, cy - eh * 1.25);
  x.stroke();

  const ix = cx + Math.sin(t * 0.8) * ew * 0.32,
    irisR = eh * 0.85;
  x.save();
  lid();
  x.clip();
  x.fillStyle = 'rgba(250,250,255,0.85)';
  lid();
  x.fill();
  const g = x.createRadialGradient(ix, cy, 0, ix, cy, irisR);
  g.addColorStop(0, `rgba(${p0(pal)},0.95)`);
  g.addColorStop(0.55, `rgba(${p0(pal)},0.45)`);
  g.addColorStop(1, `rgba(${p1(pal)},0.2)`);
  x.fillStyle = g;
  x.beginPath();
  x.arc(ix, cy, irisR, 0, TAU);
  x.fill();
  disc(x, ix, cy, irisR * 0.38, 'rgba(8,8,20,0.92)');
  disc(x, ix - irisR * 0.14, cy - irisR * 0.14, irisR * 0.1, 'rgba(255,255,255,0.9)');
  x.restore();
}

// A package carried along with motion arrows (carry / move / throw).
function motion(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const p = (t * 0.35) % 1;
  const px = p * W;
  const py = H * 0.48;
  x.globalCompositeOperation = 'lighter';
  x.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const lane = i % 3;
    const ly = H * 0.28 + lane * H * 0.22;
    const q = (t * 0.55 + i * 0.16) % 1;
    const ax = q * W;
    const a = Math.sin(q * Math.PI);
    const len = 28;
    const col = i % 2 ? p1(pal) : p0(pal);
    x.strokeStyle = `rgba(${col},${a * 0.55})`;
    x.lineWidth = 2.5;
    line(x, ax - len, ly, ax, ly);
    x.fillStyle = `rgba(${col},${a})`;
    x.beginPath();
    x.moveTo(ax, ly);
    x.lineTo(ax - 8, ly - 5);
    x.lineTo(ax - 8, ly + 5);
    x.fill();
  }
  x.globalCompositeOperation = 'source-over';
  // The thing being carried — a box with a handle.
  x.fillStyle = `rgba(${p0(pal)},0.75)`;
  rr(x, px - 18, py - 14, 36, 28, 4);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 2;
  rr(x, px - 18, py - 14, 36, 28, 4);
  x.stroke();
  x.beginPath();
  x.arc(px, py - 14, 8, Math.PI, 0);
  x.stroke();
}

// Interlocking machine gears (build / machine / self).
function gear(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  function g1(gx: number, gy: number, R: number, teeth: number, rot: number, col: string): void {
    x.fillStyle = `rgba(${col},0.82)`;
    x.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * TAU + rot,
        a1 = ((i + 0.45) / teeth) * TAU + rot,
        a2 = ((i + 0.55) / teeth) * TAU + rot,
        a3 = ((i + 1) / teeth) * TAU + rot,
        ro = R,
        ri = R * 0.78;
      x.lineTo(gx + Math.cos(a0) * ri, gy + Math.sin(a0) * ri);
      x.lineTo(gx + Math.cos(a0) * ro, gy + Math.sin(a0) * ro);
      x.lineTo(gx + Math.cos(a1) * ro, gy + Math.sin(a1) * ro);
      x.lineTo(gx + Math.cos(a2) * ri, gy + Math.sin(a2) * ri);
      x.lineTo(gx + Math.cos(a3) * ri, gy + Math.sin(a3) * ri);
    }
    x.closePath();
    x.fill();
    disc(x, gx, gy, R * 0.42, 'rgba(10,10,26,0.92)');
    x.strokeStyle = `rgba(${col},0.9)`;
    x.lineWidth = 2;
    x.beginPath();
    x.arc(gx, gy, R * 0.42, 0, TAU);
    x.stroke();
    disc(x, gx, gy, R * 0.12, `rgba(${col},0.9)`);
  }
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.2;
  g1(cx - R * 0.95, cy - R * 0.35, R, 12, t * 0.6, p0(pal));
  g1(cx + R * 0.95, cy + R * 0.4, R * 0.82, 10, -t * 0.73 + 0.3, p1(pal));
  g1(cx + R * 0.2, cy - R * 1.12, R * 0.55, 8, t * 0.9, p0(pal));
}

// Talking face + speech bubble (speak / say).
function speak(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const hx = W * 0.28,
    hy = H * 0.5;
  disc(x, hx, hy - 16, 16, `rgba(${p0(pal)},0.8)`);
  x.fillStyle = `rgba(${p0(pal)},0.7)`;
  rr(x, hx - 14, hy + 2, 28, 36, 10);
  x.fill();
  // Mouth opening.
  const open = 3 + 4 * Math.abs(Math.sin(t * 6));
  x.fillStyle = 'rgba(20,10,20,0.85)';
  x.beginPath();
  x.ellipse(hx, hy - 8, 6, open, 0, 0, TAU);
  x.fill();

  const cx = W * 0.64,
    cy = H * 0.4,
    bw = Math.min(W * 0.38, 180),
    bh = bw * 0.55;
  x.strokeStyle = `rgba(${p0(pal)},0.65)`;
  x.lineWidth = 2.5;
  rr(x, cx - bw / 2, cy - bh / 2, bw, bh, 16);
  x.stroke();
  x.beginPath();
  x.moveTo(cx - bw * 0.42, cy + bh * 0.1);
  x.lineTo(hx + 22, hy - 6);
  x.lineTo(cx - bw * 0.28, cy + bh * 0.35);
  x.stroke();
  const bars = 8,
    bw2 = (bw * 0.62) / bars;
  for (let i = 0; i < bars; i++) {
    const h = bh * 0.5 * (0.22 + 0.78 * Math.abs(Math.sin(t * 5 + i * 0.55)));
    x.fillStyle = `rgba(${p1(pal)},0.75)`;
    x.fillRect(cx - bw * 0.3 + i * bw2, cy - h / 2, bw2 * 0.55, h);
  }
}

// A plate cracking in two (break).
function breakx(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.28;
  const split = 6 + 10 * (0.5 + 0.5 * Math.sin(t * 1.4));
  function half(dir: number, col: string): void {
    x.save();
    x.translate(cx + dir * split, cy);
    x.rotate(dir * 0.12 * (split / 16));
    x.fillStyle = `rgba(${col},0.35)`;
    x.beginPath();
    x.arc(0, 0, R, dir < 0 ? Math.PI / 2 : -Math.PI / 2, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
    x.lineTo(dir * 4, 0);
    x.closePath();
    x.fill();
    x.strokeStyle = `rgba(${col},0.85)`;
    x.lineWidth = 2.4;
    x.stroke();
    // Jagged inner edge.
    x.beginPath();
    x.moveTo(0, -R);
    for (let i = 1; i <= 7; i++) {
      const y = -R + (i / 7) * 2 * R;
      x.lineTo(dir * (4 + (i % 2) * 8), y);
    }
    x.stroke();
    x.restore();
  }
  half(-1, p0(pal));
  half(1, p1(pal));
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const d = (t * 0.45 + i * 0.17) % 1;
    const a = (i / 10) * TAU;
    disc(x, cx + Math.cos(a) * d * R * 1.5, cy + Math.sin(a) * d * R * 1.5, 2, `rgba(${p1(pal)},${(1 - d) * 0.6})`);
  }
  x.globalCompositeOperation = 'source-over';
}

// Ruler + big vs tiny so "size / measure" is obvious.
function scale(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const y = H * 0.78;
  x.strokeStyle = `rgba(${p0(pal)},0.7)`;
  x.lineWidth = 3;
  line(x, W * 0.08, y, W * 0.92, y);
  for (let i = 0; i <= 10; i++) {
    const tx = W * 0.08 + (W * 0.84 * i) / 10;
    const h = i % 5 === 0 ? 14 : 8;
    line(x, tx, y, tx, y - h);
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.3);
  const big = 36 + pulse * 4;
  const tiny = 7;
  disc(x, W * 0.3, H * 0.42, big, `rgba(${p0(pal)},0.45)`);
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(W * 0.3, H * 0.42, big, 0, TAU);
  x.stroke();
  disc(x, W * 0.72, H * 0.55, tiny, `rgba(${p1(pal)},0.9)`);
  x.strokeStyle = `rgba(${p1(pal)},0.6)`;
  x.lineWidth = 1.4;
  x.setLineDash([4, 4]);
  line(x, W * 0.3 + big + 6, H * 0.42, W * 0.72 - tiny - 6, H * 0.55);
  x.setLineDash([]);
  // Magnifier over the tiny one.
  const mx = W * 0.72,
    my = H * 0.55,
    mR = 22;
  x.strokeStyle = `rgba(${p1(pal)},0.85)`;
  x.lineWidth = 3;
  x.beginPath();
  x.arc(mx, my, mR, 0, TAU);
  x.stroke();
  line(x, mx + mR * 0.7, my + mR * 0.7, mx + mR * 1.5, my + mR * 1.5);
}

// Pulsing heart + ECG pulse (feeling / love / heart).
function heart(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const cx = W / 2,
    cy = H * 0.48,
    beat = 1 + 0.1 * Math.max(0, Math.sin(t * 3)) + 0.05 * Math.max(0, Math.sin(t * 3 - 0.25)),
    sc = Math.min(W, H) * 0.0042 * beat;
  x.strokeStyle = `rgba(${p1(pal)},0.45)`;
  x.lineWidth = 1.8;
  x.beginPath();
  const ekgY = H * 0.82;
  for (let i = 0; i <= W; i += 4) {
    const f = (i / W + t * 0.12) % 1;
    let y = ekgY;
    if (f > 0.42 && f < 0.5) {
      const u = (f - 0.42) / 0.08;
      y = ekgY - Math.sin(u * Math.PI) * 22 * (u < 0.5 ? 1 : -0.4);
    }
    if (i) x.lineTo(i, y);
    else x.moveTo(i, y);
  }
  x.stroke();
  x.save();
  x.translate(cx, cy);
  x.scale(sc, sc);
  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  x.shadowColor = `rgba(${p0(pal)},0.7)`;
  x.shadowBlur = 24;
  x.beginPath();
  x.moveTo(0, 30);
  x.bezierCurveTo(-40, -10, -40, -45, 0, -20);
  x.bezierCurveTo(40, -45, 40, -10, 0, 30);
  x.fill();
  x.shadowBlur = 0;
  x.restore();
}

// Brain silhouette with synapses (mind / wisdom).
function mind(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const cx = W / 2,
    cy = H * 0.5,
    bw = Math.min(W, H) * 0.38,
    bh = bw * 0.78;
  function brain(): void {
    x.beginPath();
    x.ellipse(cx - bw * 0.28, cy, bw * 0.48, bh * 0.72, -0.15, 0, TAU);
    x.ellipse(cx + bw * 0.28, cy, bw * 0.48, bh * 0.72, 0.15, 0, TAU);
  }
  x.fillStyle = `rgba(${p0(pal)},0.18)`;
  brain();
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.85)`;
  x.lineWidth = 2.6;
  brain();
  x.stroke();
  // Folds.
  x.strokeStyle = `rgba(${p1(pal)},0.4)`;
  x.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    x.beginPath();
    const y = cy - bh * 0.45 + i * bh * 0.2;
    x.moveTo(cx - bw * 0.5, y);
    x.quadraticCurveTo(cx - bw * 0.15, y + 8 * (i % 2 ? 1 : -1), cx, y + 2);
    x.quadraticCurveTo(cx + bw * 0.2, y - 6, cx + bw * 0.52, y + 4);
    x.stroke();
  }
  x.save();
  brain();
  x.clip();
  x.globalCompositeOperation = 'lighter';
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + t * 0.2;
    const px = cx + Math.cos(a) * bw * 0.32,
      py = cy + Math.sin(a) * bh * 0.28;
    const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i);
    glow(x, px, py, 8 + tw * 4, p1(pal), 0.35 + tw * 0.35);
    if (i > 0) {
      const a0 = ((i - 1) / N) * TAU + t * 0.2;
      x.strokeStyle = `rgba(${p1(pal)},0.25)`;
      x.lineWidth = 1;
      line(x, cx + Math.cos(a0) * bw * 0.32, cy + Math.sin(a0) * bh * 0.28, px, py);
    }
  }
  x.restore();
  x.globalCompositeOperation = 'source-over';
}

function figure(
  x: CanvasRenderingContext2D,
  px: number,
  footY: number,
  col: string,
  phase: number,
): void {
  const bob = Math.sin(phase) * 3;
  const hy = footY - 52 + bob;
  disc(x, px, hy, 8, `rgba(${col},0.9)`);
  x.strokeStyle = `rgba(${col},0.9)`;
  x.lineWidth = 3;
  x.lineCap = 'round';
  line(x, px, hy + 8, px, footY - 22 + bob);
  const swing = Math.sin(phase) * 10;
  line(x, px, footY - 22 + bob, px - 8 + swing, footY);
  line(x, px, footY - 22 + bob, px + 8 - swing, footY);
  line(x, px, hy + 16, px - 12, hy + 28);
  line(x, px, hy + 16, px + 12, hy + 26);
}

// Stick-people standing together (people / human).
function people(x: CanvasRenderingContext2D, W: number, H: number, t: number, pal: string[]): void {
  const n = 5,
    gap = Math.min(W * 0.15, 88),
    cx = W / 2,
    foot = H * 0.78;
  x.strokeStyle = `rgba(${p0(pal)},0.3)`;
  x.lineWidth = 2;
  line(x, W * 0.1, foot + 4, W * 0.9, foot + 4);
  for (let i = 0; i < n; i++) {
    figure(x, cx + (i - (n - 1) / 2) * gap, foot, i % 2 ? p1(pal) : p0(pal), t * 1.6 + i);
  }
}

export const SCENES: Record<string, SceneFn> = {
  dna,
  globe,
  light,
  waves,
  draw,
  water,
  heat,
  stars,
  clock,
  sound,
  eye,
  motion,
  gear,
  speak,
  breakx,
  scale,
  heart,
  mind,
  people,
  stand,
  hold,
  touch,
  lift,
  air,
  wing,
  shut,
  loop,
  straight,
  build,
  circle,
  half,
  equal,
  one,
  two,
  three,
  many,
  pull,
  hang,
  nature,
  morph,
  step,
  fall,
  place,
  loosen,
  twist,
  under,
  hand,
  cut,
  strong,
  hundred,
  apart,
  wrong,
  against,
  death,
  bone,
  tooth,
  stone,
  fish,
  boat,
  book,
  before,
  end,
  sleep,
  color,
  new: fresh,
  lead,
  power,
  city,
  rule,
  join,
  between,
  good,
  calm,
  self,
  body,
  name,
  beauty,
  stranger,
  onehalf,
  different,
};

/** Emoji used on the deck strip + scene caption, keyed by scene name. */
export const SCENE_EMOJI: Record<string, string> = {
  dna: '🧬',
  globe: '🌍',
  light: '☀️',
  waves: '📡',
  draw: '✍️',
  water: '💧',
  heat: '🔥',
  stars: '✨',
  clock: '⏳',
  sound: '🔊',
  eye: '👁️',
  motion: '➡️',
  gear: '⚙️',
  speak: '💬',
  breakx: '💥',
  scale: '🔎',
  people: '👥',
  mind: '🧠',
  heart: '💗',
  stand: '🏛️',
  hold: '✊',
  touch: '👆',
  lift: '🎈',
  air: '💨',
  wing: '🪽',
  shut: '🚪',
  loop: '🔁',
  straight: '📏',
  build: '🧱',
  circle: '⭕',
  half: '◐',
  equal: '⚖️',
  one: '①',
  two: '②',
  three: '③',
  many: '🔢',
  pull: '🧲',
  hang: '🪝',
  nature: '🌿',
  morph: '🔷',
  step: '👣',
  fall: '⬇️',
  place: '📍',
  loosen: '🔓',
  twist: '🌀',
  under: '🔽',
  hand: '🖐️',
  cut: '✂️',
  strong: '💪',
  hundred: '💯',
  apart: '↔️',
  wrong: '❌',
  against: '⚔️',
  death: '🕯️',
  bone: '🦴',
  tooth: '🦷',
  stone: '🪨',
  fish: '🐟',
  boat: '⛵',
  book: '📖',
  before: '1️⃣',
  end: '🏁',
  sleep: '🌙',
  color: '🎨',
  new: '🆕',
  lead: '👉',
  power: '⚡',
  city: '🏙️',
  rule: '👑',
  join: '🔗',
  between: '💠',
  good: '✅',
  calm: '🌊',
  self: '🪞',
  body: '🧍',
  name: '🏷️',
  beauty: '🌸',
  stranger: '🚶',
  onehalf: '1½',
  different: '🔀',
};

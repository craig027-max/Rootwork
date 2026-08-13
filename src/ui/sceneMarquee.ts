/* Marquee scenes — the ones kids show parents. Layered depth, jewel palettes. */

import { TAU, disc, glow, p0, p1, rung, type SceneFn } from './sceneUtil';

interface Cell {
  x: number;
  y: number;
  r: number;
  sp: number;
  sway: number;
  hue: string;
  a: number;
}
let cells: Cell[] | null = null;
let cellW = 0;
let cellH = 0;
function seedCells(W: number, H: number): void {
  cells = [];
  const n = Math.round(Math.max(14, Math.min(34, (W * H) / 9000)));
  for (let i = 0; i < n; i++)
    cells.push({
      x: Math.random(),
      y: Math.random(),
      r: 2 + Math.random() * 5,
      sp: 0.004 + Math.random() * 0.01,
      sway: Math.random() * 6.28,
      hue: Math.random() < 0.5 ? '52,224,122' : '79,195,247',
      a: 0.1 + Math.random() * 0.22,
    });
  cellW = W;
  cellH = H;
}

interface Node {
  x: number;
  y: number;
  d: number;
  c: string;
}

/** Double helix with membrane-cells and depth-sorted base pairs (life). */
export const dna: SceneFn = (x, W, H, t, pal) => {
  if (!cells || cellW !== W || cellH !== H) seedCells(W, H);
  const cs = cells ?? [];

  const room = x.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.62);
  room.addColorStop(0, `rgba(${p0(pal)},0.16)`);
  room.addColorStop(0.55, `rgba(${p1(pal)},0.05)`);
  room.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = room;
  x.fillRect(0, 0, W, H);

  x.globalCompositeOperation = 'lighter';
  for (const c of cs) {
    c.y -= c.sp;
    c.sway += 0.016;
    if (c.y < -0.05) {
      c.y = 1.05;
      c.x = Math.random();
    }
    const px = (c.x + Math.sin(c.sway) * 0.02) * W,
      py = c.y * H;
    x.strokeStyle = `rgba(${c.hue},${c.a + 0.18})`;
    x.lineWidth = 1;
    x.beginPath();
    x.arc(px, py, c.r * 1.35, 0, TAU);
    x.stroke();
    glow(x, px, py, c.r * 2.6, c.hue, c.a);
    disc(x, px, py, Math.max(1.1, c.r * 0.35), `rgba(255,255,255,${c.a + 0.15})`);
  }

  const cx = W * 0.5,
    amp = Math.min(W * 0.28, 104),
    top = H * 0.08,
    span = H * 0.84,
    N = 52,
    freq = 3.15,
    nodes: Node[] = [];

  for (const phase of [0, Math.PI]) {
    const col = phase === 0 ? p0(pal) : p1(pal);
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const f = i / N,
        y = top + f * span,
        ph = f * freq * TAU + t * 0.85 + phase,
        xx = cx + Math.sin(ph) * amp;
      if (i) x.lineTo(xx, y);
      else x.moveTo(xx, y);
    }
    x.strokeStyle = `rgba(${col},0.22)`;
    x.lineWidth = 5.5;
    x.lineJoin = 'round';
    x.stroke();
    x.strokeStyle = `rgba(${col},0.55)`;
    x.lineWidth = 1.8;
    x.stroke();
  }

  for (let i = 0; i <= N; i++) {
    const f = i / N,
      y = top + f * span,
      ph = f * freq * TAU + t * 0.85;
    const x1 = cx + Math.sin(ph) * amp,
      x2 = cx + Math.sin(ph + Math.PI) * amp;
    const d1 = (Math.cos(ph) + 1) / 2,
      d2 = (Math.cos(ph + Math.PI) + 1) / 2;
    if (i % 2 === 0) {
      const dm = (d1 + d2) / 2,
        col = rung(i / 2);
      x.strokeStyle = `rgba(${col},${0.16 + dm * 0.55})`;
      x.lineWidth = 2.2 + dm * 2.4;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(x1, y);
      x.lineTo(x2, y);
      x.stroke();
      glow(x, (x1 + x2) / 2, y, 6 + dm * 5, col, 0.18 + dm * 0.28);
    }
    nodes.push({ x: x1, y, d: d1, c: p0(pal) });
    nodes.push({ x: x2, y, d: d2, c: p1(pal) });
  }

  nodes.sort((a, b) => a.d - b.d);
  for (const n of nodes) {
    const r = 2.6 + n.d * 5.2,
      a = 0.28 + n.d * 0.72;
    const g = x.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.6);
    g.addColorStop(0, `rgba(255,255,255,${a * 0.95})`);
    g.addColorStop(0.32, `rgba(${n.c},${a})`);
    g.addColorStop(1, `rgba(${n.c},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.arc(n.x, n.y, r * 2.6, 0, TAU);
    x.fill();
  }
  x.globalCompositeOperation = 'source-over';
};

/** Volumetric sun, corona, and streaming photons (light). */
export const light: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    maxR = Math.min(W, H) * 0.5;
  x.globalCompositeOperation = 'lighter';

  const haze = x.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  haze.addColorStop(0, `rgba(${p0(pal)},0.22)`);
  haze.addColorStop(0.45, `rgba(${p1(pal)},0.08)`);
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = haze;
  x.fillRect(0, 0, W, H);

  // Tapered volumetric rays (wedges), not hairline spokes.
  const rays = 18;
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * TAU + t * 0.18,
      fl = 0.45 + 0.55 * Math.abs(Math.sin(k * 1.3 + t * 0.9)),
      len = maxR * (0.55 + 0.45 * fl),
      half = 0.045 + fl * 0.03;
    const g = x.createLinearGradient(
      cx,
      cy,
      cx + Math.cos(a) * len,
      cy + Math.sin(a) * len,
    );
    g.addColorStop(0, `rgba(255,255,255,${0.18 * fl})`);
    g.addColorStop(0.25, `rgba(${p0(pal)},${0.14 * fl})`);
    g.addColorStop(1, `rgba(${p1(pal)},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(cx + Math.cos(a - half) * 18, cy + Math.sin(a - half) * 18);
    x.lineTo(cx + Math.cos(a - half * 0.35) * len, cy + Math.sin(a - half * 0.35) * len);
    x.lineTo(cx + Math.cos(a + half * 0.35) * len, cy + Math.sin(a + half * 0.35) * len);
    x.lineTo(cx + Math.cos(a + half) * 18, cy + Math.sin(a + half) * 18);
    x.closePath();
    x.fill();
  }

  // Photons — four-point sparkles streaming outward.
  for (let i = 0; i < 48; i++) {
    const d = (t * 0.22 + i * 0.137) % 1,
      r = 22 + d * maxR,
      a = i * 2.39996 + t * 0.05,
      px = cx + Math.cos(a) * r,
      py = cy + Math.sin(a) * r,
      al = (1 - d) * 0.85,
      s = 1.2 + (1 - d) * 2.4;
    x.fillStyle = `rgba(${i % 3 === 0 ? p1(pal) : '255,255,255'},${al})`;
    x.beginPath();
    x.moveTo(px, py - s * 1.6);
    x.lineTo(px + s * 0.35, py);
    x.lineTo(px, py + s * 1.6);
    x.lineTo(px - s * 0.35, py);
    x.closePath();
    x.fill();
  }

  // Corona rings.
  for (let i = 0; i < 3; i++) {
    const pr = maxR * (0.2 + i * 0.07) + Math.sin(t * 1.4 + i) * 3;
    x.strokeStyle = `rgba(${p0(pal)},${0.18 - i * 0.04})`;
    x.lineWidth = 2;
    x.beginPath();
    x.arc(cx, cy, pr, 0, TAU);
    x.stroke();
  }

  const core = x.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.38);
  core.addColorStop(0, 'rgba(255,255,255,0.98)');
  core.addColorStop(0.18, `rgba(${p0(pal)},0.9)`);
  core.addColorStop(0.5, `rgba(${p1(pal)},0.28)`);
  core.addColorStop(1, `rgba(${p1(pal)},0)`);
  x.fillStyle = core;
  x.beginPath();
  x.arc(cx, cy, maxR * 0.38, 0, TAU);
  x.fill();

  // Lens flare — horizontal streak + ghost discs.
  const flareA = 0.22 + 0.08 * Math.sin(t * 1.1);
  x.strokeStyle = `rgba(255,255,255,${flareA})`;
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(cx - maxR * 0.7, cy);
  x.lineTo(cx + maxR * 0.7, cy);
  x.stroke();
  glow(x, cx + maxR * 0.42, cy, 10, p1(pal), 0.35);
  glow(x, cx - maxR * 0.38, cy, 7, p0(pal), 0.22);

  x.globalCompositeOperation = 'source-over';
};

/** Layered sea: depth body, caustics, stacked swells, foam, bubbles (water). */
export const water: SceneFn = (x, W, H, t, pal) => {
  const body = x.createLinearGradient(0, 0, 0, H);
  body.addColorStop(0, `rgba(${p0(pal)},0.03)`);
  body.addColorStop(0.32, `rgba(${p0(pal)},0.09)`);
  body.addColorStop(0.68, `rgba(${p1(pal)},0.18)`);
  body.addColorStop(1, `rgba(${p1(pal)},0.32)`);
  x.fillStyle = body;
  x.fillRect(0, 0, W, H);

  x.save();
  x.globalCompositeOperation = 'lighter';

  // Light shaft from the surface.
  const shaft = x.createLinearGradient(W * 0.38, 0, W * 0.52, H);
  shaft.addColorStop(0, 'rgba(255,255,255,0.11)');
  shaft.addColorStop(0.55, `rgba(${p0(pal)},0.04)`);
  shaft.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = shaft;
  x.beginPath();
  x.moveTo(W * 0.24, 0);
  x.lineTo(W * 0.5, 0);
  x.lineTo(W * 0.66, H);
  x.lineTo(W * 0.16, H);
  x.fill();

  // Caustic ribbons on the floor.
  for (let i = 0; i < 20; i++) {
    const sx = ((i * 97.3 + t * 26) % (W + 48)) - 24;
    const sy = H * (0.58 + (i % 6) * 0.065);
    const tw = 0.5 + 0.5 * Math.sin(t * 2.1 + i * 0.7);
    x.fillStyle = `rgba(255,255,255,${0.03 + tw * 0.08})`;
    x.beginPath();
    x.ellipse(sx, sy, 16 + tw * 12, 2.4, 0.18, 0, TAU);
    x.fill();
  }

  for (let r = 0; r < 6; r++) {
    const depth = r / 5;
    const y0 = H * (0.2 + r * 0.112);
    const amp = 5 + depth * 13;
    const col = r % 2 ? p1(pal) : p0(pal);
    const wave = (i: number): number =>
      y0 +
      Math.sin(i * 0.017 + t * (1.05 + depth * 0.35) + r * 0.8) * amp +
      Math.sin(i * 0.05 - t * 1.25 + r * 1.6) * amp * 0.38;

    x.beginPath();
    x.moveTo(0, H);
    for (let i = 0; i <= W; i += 5) x.lineTo(i, wave(i));
    x.lineTo(W, H);
    x.closePath();
    x.fillStyle = `rgba(${col},${0.05 + depth * 0.085})`;
    x.fill();

    x.beginPath();
    for (let i = 0; i <= W; i += 5) {
      if (i) x.lineTo(i, wave(i));
      else x.moveTo(i, wave(i));
    }
    x.strokeStyle = `rgba(${col},${0.14 + depth * 0.3})`;
    x.lineWidth = 1 + depth * 1.7;
    x.stroke();

    if (r >= 4) {
      for (let i = 0; i <= W; i += 16) {
        const crest = Math.sin(i * 0.017 + t * 1.4 + r);
        if (crest > 0.52) {
          x.fillStyle = `rgba(255,255,255,${(crest - 0.52) * 0.4})`;
          x.beginPath();
          x.arc(i, wave(i) - 1.2, 1.7, 0, TAU);
          x.fill();
        }
      }
    }
  }

  for (let i = 0; i < 20; i++) {
    const d = (t * 0.22 + i * 0.11) % 1,
      bx = W * ((i * 0.137) % 1) + Math.sin(t * 0.8 + i) * 8,
      by = H - d * H * 0.92,
      a = (1 - d) * 0.5,
      s = 2 + (i % 4);
    x.strokeStyle = `rgba(${p1(pal)},${a})`;
    x.lineWidth = 1.15;
    x.beginPath();
    x.arc(bx, by, s, 0, TAU);
    x.stroke();
    x.fillStyle = `rgba(255,255,255,${a * 0.55})`;
    x.beginPath();
    x.arc(bx - s * 0.28, by - s * 0.32, Math.max(0.8, s * 0.32), 0, TAU);
    x.fill();
  }

  x.restore();
  x.globalCompositeOperation = 'source-over';
};

/** Coal bed, flame tongues, rising embers (heat / fire). */
export const heat: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const hot = p0(pal);
  const gold = p1(pal);

  // Ember bed — the fire has a source.
  const bed = x.createRadialGradient(cx, H * 0.96, 0, cx, H * 0.96, W * 0.48);
  bed.addColorStop(0, `rgba(${hot},0.5)`);
  bed.addColorStop(0.45, `rgba(${gold},0.18)`);
  bed.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = bed;
  x.fillRect(0, H * 0.5, W, H * 0.5);

  x.globalCompositeOperation = 'lighter';

  // Tongue-shaped flames (bezier teardrops), back to front.
  const tongues = 11;
  for (let i = 0; i < tongues; i++) {
    const seed = i * 1.7;
    const flick = Math.sin(t * 3.2 + seed) * 0.5 + 0.5;
    const lean = Math.sin(t * 2.1 + seed) * 18;
    const baseX = cx + Math.sin(seed * 2.1) * W * 0.28;
    const hgt = H * (0.38 + flick * 0.28 + (i % 3) * 0.04);
    const bw = 10 + (i % 4) * 5;
    const col = i % 2 ? gold : hot;
    x.beginPath();
    x.moveTo(baseX - bw, H * 0.94);
    x.bezierCurveTo(
      baseX - bw * 0.7 + lean * 0.4,
      H * 0.94 - hgt * 0.35,
      baseX + lean,
      H * 0.94 - hgt * 0.72,
      baseX + lean * 0.25,
      H * 0.94 - hgt,
    );
    x.bezierCurveTo(
      baseX + bw * 0.4 + lean,
      H * 0.94 - hgt * 0.55,
      baseX + bw + lean * 0.2,
      H * 0.94 - hgt * 0.18,
      baseX + bw,
      H * 0.94,
    );
    x.closePath();
    const fg = x.createLinearGradient(baseX, H * 0.94, baseX, H * 0.94 - hgt);
    fg.addColorStop(0, `rgba(${hot},0.55)`);
    fg.addColorStop(0.45, `rgba(${col},0.4)`);
    fg.addColorStop(1, 'rgba(255,245,210,0)');
    x.fillStyle = fg;
    x.fill();
  }

  // Hot core blobs.
  for (let i = 0; i < 36; i++) {
    const seed = i * 0.137,
      d = (t * 0.55 + seed) % 1;
    const fx = cx + Math.sin(i * 12.9) * W * 0.3 + Math.sin(d * 6 + i) * 12;
    const fy = H * 0.93 - d * H * 0.62,
      a = (1 - d) * 0.72,
      s = (1 - d) * 14 + 3;
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, s);
    g.addColorStop(0, `rgba(255,250,220,${a})`);
    g.addColorStop(0.35, `rgba(${gold},${a * 0.75})`);
    g.addColorStop(1, `rgba(${hot},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.arc(fx, fy, s, 0, TAU);
    x.fill();
  }

  // Embers that climb past the flames and wink out.
  for (let i = 0; i < 24; i++) {
    const d = (t * 0.38 + i * 0.191) % 1;
    const sx = cx + Math.sin(i * 7.1) * W * 0.3 + Math.sin(d * 9 + i) * 22;
    const sy = H * 0.9 - d * H * 0.98;
    const tw = 0.5 + 0.5 * Math.sin(t * 8 + i * 3);
    const a = (1 - d) * tw * 0.95;
    disc(x, sx, sy, 1.2 + tw * 0.8, `rgba(255,230,180,${a})`);
  }

  x.globalCompositeOperation = 'source-over';
};

/** Parallax starfield, nebula, diffraction spikes, shooting star (star / space). */
export const stars: SceneFn = (x, W, H, t, pal) => {
  x.globalCompositeOperation = 'lighter';

  // Nebula wash — two overlapping clouds.
  glow(x, W * 0.32, H * 0.42, Math.min(W, H) * 0.55, p0(pal), 0.16);
  glow(x, W * 0.72, H * 0.58, Math.min(W, H) * 0.48, p1(pal), 0.14);
  glow(x, W * 0.55, H * 0.28, Math.min(W, H) * 0.3, '255,255,255', 0.05);

  // Milky-way band.
  x.save();
  x.translate(W * 0.5, H * 0.5);
  x.rotate(-0.4);
  const band = x.createLinearGradient(0, -H * 0.08, 0, H * 0.08);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, `rgba(${p1(pal)},0.07)`);
  band.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = band;
  x.fillRect(-W, -H * 0.1, W * 2, H * 0.2);
  x.restore();

  const layers: Array<[number, number, number, number]> = [
    [70, 0.4, 0.7, 0.9],
    [40, 1.0, 1.2, 1.4],
    [18, 1.8, 1.8, 2.4],
  ];
  let n = 0;
  for (const [count, twSpeed, size, drift] of layers) {
    for (let i = 0; i < count; i++) {
      const sx = (n * 0.0137 * W * 7.3 + t * drift * 1.6) % W;
      const sy = (n * 0.0297 * H * 5.1) % H;
      const tw = 0.5 + 0.5 * Math.sin(t * twSpeed + n);
      const a = 0.18 + tw * 0.7;
      const s = 0.5 * size + tw * 0.7 * size;
      const col = n % 6 === 0 ? p0(pal) : n % 5 === 0 ? p1(pal) : '255,255,255';
      disc(x, sx, sy, s, `rgba(${col},${a})`);
      // Hero stars get diffraction spikes.
      if (n % 17 === 0) {
        x.strokeStyle = `rgba(255,255,255,${a * 0.7})`;
        x.lineWidth = 1;
        const sp = 5 + tw * 5;
        x.beginPath();
        x.moveTo(sx - sp, sy);
        x.lineTo(sx + sp, sy);
        x.moveTo(sx, sy - sp);
        x.lineTo(sx, sy + sp);
        x.stroke();
      }
      n += 1;
    }
  }

  // Shooting star with a particle trail.
  const p = (t * 0.18) % 1,
    stx = W * 0.08 + p * W * 0.85,
    sty = H * 0.12 + p * H * 0.32,
    trail = Math.sin(p * Math.PI);
  for (let k = 0; k < 8; k++) {
    const f = k / 8;
    disc(
      x,
      stx - 38 * f,
      sty - 15 * f,
      1.6 * (1 - f),
      `rgba(${p1(pal)},${trail * (1 - f) * 0.7})`,
    );
  }
  x.strokeStyle = `rgba(255,255,255,${trail})`;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(stx, sty);
  x.lineTo(stx - 42, sty - 17);
  x.stroke();
  glow(x, stx, sty, 8, '255,255,255', trail);

  // Distant planet.
  glow(x, W * 0.78, H * 0.62, 52, p0(pal), 0.32);
  disc(x, W * 0.78, H * 0.62, 9, `rgba(${p0(pal)},0.55)`);

  x.globalCompositeOperation = 'source-over';
};

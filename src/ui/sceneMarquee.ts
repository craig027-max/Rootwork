/* Marquee scenes — the ones kids show parents. Readable 2D illustrations. */

import { TAU, cloud, disc, glow, leaf, line, p0, p1, rung, type SceneFn } from './sceneUtil';

const LAND = '72,168,110';
const SAND = '210,170,90';

/** Textbook double helix + a cell and a leaf (life). */
export const dna: SceneFn = (x, W, H, t, pal) => {
  const room = x.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
  room.addColorStop(0, `rgba(${p0(pal)},0.14)`);
  room.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = room;
  x.fillRect(0, 0, W, H);

  // One animal cell — membrane, nucleus — so "life" is not just a twisty ribbon.
  const cellX = W * 0.2,
    cellY = H * 0.42,
    cellR = Math.min(W, H) * 0.22;
  x.strokeStyle = `rgba(${p0(pal)},0.55)`;
  x.lineWidth = 3.2;
  x.beginPath();
  x.arc(cellX, cellY, cellR, 0, TAU);
  x.stroke();
  x.strokeStyle = `rgba(${p0(pal)},0.28)`;
  x.lineWidth = 1.6;
  x.beginPath();
  x.arc(cellX, cellY, cellR * 0.88, 0, TAU);
  x.stroke();
  glow(x, cellX, cellY, cellR * 0.7, p0(pal), 0.18);
  disc(x, cellX + cellR * 0.08, cellY - cellR * 0.05, cellR * 0.34, `rgba(${p1(pal)},0.45)`);
  disc(x, cellX + cellR * 0.08, cellY - cellR * 0.05, cellR * 0.14, `rgba(${p1(pal)},0.8)`);
  x.strokeStyle = `rgba(${p1(pal)},0.4)`;
  x.lineWidth = 1.2;
  x.beginPath();
  x.ellipse(cellX - cellR * 0.42, cellY + cellR * 0.22, cellR * 0.16, cellR * 0.08, 0.4, 0, TAU);
  x.stroke();
  x.beginPath();
  x.ellipse(cellX + cellR * 0.38, cellY + cellR * 0.35, cellR * 0.12, cellR * 0.06, -0.3, 0, TAU);
  x.stroke();
  leaf(x, cellX - cellR * 0.15, cellY + cellR * 1.15, -0.4, cellR * 0.42, `rgba(${LAND},0.7)`, `rgba(${p0(pal)},0.55)`);

  const cx = W * 0.66,
    amp = Math.min(W * 0.18, 56),
    top = H * 0.06,
    span = H * 0.88,
    steps = 20;

  type Sample = { x: number; y: number; z: number };
  const a: Sample[] = [];
  const b: Sample[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps,
      y = top + f * span,
      ph = f * 2.35 * TAU + t * 0.7;
    a.push({ x: cx + Math.sin(ph) * amp, y, z: Math.cos(ph) });
    b.push({ x: cx + Math.sin(ph + Math.PI) * amp, y, z: Math.cos(ph + Math.PI) });
  }

  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.globalCompositeOperation = 'lighter';

  function strokeBackbone(pts: Sample[], col: string, frontOnly: boolean): void {
    x.beginPath();
    let started = false;
    for (const p of pts) {
      if (frontOnly && p.z < 0) {
        started = false;
        continue;
      }
      if (!started) {
        x.moveTo(p.x, p.y);
        started = true;
      } else x.lineTo(p.x, p.y);
    }
    x.strokeStyle = `rgba(${col},${frontOnly ? 0.95 : 0.3})`;
    x.lineWidth = frontOnly ? 5.4 : 3.4;
    x.stroke();
  }
  strokeBackbone(a, p0(pal), false);
  strokeBackbone(b, p1(pal), false);

  for (let i = 0; i <= steps; i++) {
    const pa = a[i],
      pb = b[i];
    if (!pa || !pb || i % 2 !== 0) continue;
    const depth = (pa.z + pb.z) * 0.25 + 0.5;
    const midX = (pa.x + pb.x) / 2;
    const cA = rung(i / 2),
      cB = rung(i / 2 + 2);
    x.lineWidth = 2.6 + depth * 1.4;
    x.strokeStyle = `rgba(${cA},${0.4 + depth * 0.55})`;
    line(x, pa.x, pa.y, midX, pa.y);
    x.strokeStyle = `rgba(${cB},${0.4 + depth * 0.55})`;
    line(x, pb.x, pb.y, midX, pb.y);
    disc(x, pa.x, pa.y, 2.4 + (pa.z + 1) * 1.1, `rgba(${cA},0.9)`);
    disc(x, pb.x, pb.y, 2.4 + (pb.z + 1) * 1.1, `rgba(${cB},0.9)`);
  }

  strokeBackbone(a, p0(pal), true);
  strokeBackbone(b, p1(pal), true);
  x.globalCompositeOperation = 'source-over';
};

/** Sun, rays, and a beam lighting a tree (light). */
export const light: SceneFn = (x, W, H, t, pal) => {
  const sx = W * 0.28,
    sy = H * 0.28,
    sunR = Math.min(W, H) * 0.14;
  const ground = H * 0.82;
  const tx = W * 0.72;

  const sky = x.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `rgba(${p0(pal)},0.16)`);
  sky.addColorStop(0.55, `rgba(${p1(pal)},0.05)`);
  sky.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = sky;
  x.fillRect(0, 0, W, H);

  x.globalCompositeOperation = 'lighter';

  const rays = 16;
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * TAU + t * 0.12,
      fl = 0.45 + 0.55 * Math.abs(Math.sin(k * 1.3 + t * 0.8)),
      len = sunR * (2.4 + fl * 1.6),
      half = 0.05 + fl * 0.025;
    const g = x.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    g.addColorStop(0, `rgba(255,255,255,${0.22 * fl})`);
    g.addColorStop(0.4, `rgba(${p0(pal)},${0.16 * fl})`);
    g.addColorStop(1, `rgba(${p1(pal)},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(sx + Math.cos(a - half) * sunR * 0.7, sy + Math.sin(a - half) * sunR * 0.7);
    x.lineTo(sx + Math.cos(a - half * 0.4) * len, sy + Math.sin(a - half * 0.4) * len);
    x.lineTo(sx + Math.cos(a + half * 0.4) * len, sy + Math.sin(a + half * 0.4) * len);
    x.lineTo(sx + Math.cos(a + half) * sunR * 0.7, sy + Math.sin(a + half) * sunR * 0.7);
    x.closePath();
    x.fill();
  }

  const core = x.createRadialGradient(sx - sunR * 0.2, sy - sunR * 0.2, 0, sx, sy, sunR);
  core.addColorStop(0, 'rgba(255,255,255,0.98)');
  core.addColorStop(0.35, `rgba(${p0(pal)},0.95)`);
  core.addColorStop(1, `rgba(${p1(pal)},0.15)`);
  x.fillStyle = core;
  x.beginPath();
  x.arc(sx, sy, sunR, 0, TAU);
  x.fill();

  // Beam from the sun hitting the tree.
  const hitX = tx,
    hitY = ground - 52;
  const beam = x.createLinearGradient(sx, sy, hitX, hitY);
  beam.addColorStop(0, `rgba(255,255,255,0.12)`);
  beam.addColorStop(0.7, `rgba(${p0(pal)},0.18)`);
  beam.addColorStop(1, `rgba(${p0(pal)},0.08)`);
  x.fillStyle = beam;
  x.beginPath();
  x.moveTo(sx + 8, sy + 8);
  x.lineTo(sx + 18, sy + 4);
  x.lineTo(hitX + 22, hitY);
  x.lineTo(hitX - 18, hitY + 8);
  x.closePath();
  x.fill();
  glow(x, hitX, hitY, 36, p0(pal), 0.45 + 0.12 * Math.sin(t * 2));

  x.globalCompositeOperation = 'source-over';

  // Ground + a simple tree so the beam has something to light.
  x.strokeStyle = `rgba(${p1(pal)},0.35)`;
  x.lineWidth = 2;
  line(x, W * 0.08, ground, W * 0.95, ground);
  x.fillStyle = `rgba(${SAND},0.35)`;
  x.fillRect(W * 0.08, ground, W * 0.87, 6);

  x.fillStyle = `rgba(90,55,40,0.85)`;
  x.fillRect(tx - 4, ground - 38, 8, 38);
  x.fillStyle = `rgba(${LAND},0.85)`;
  x.beginPath();
  x.moveTo(tx, ground - 88);
  x.lineTo(tx + 28, ground - 34);
  x.lineTo(tx - 28, ground - 34);
  x.closePath();
  x.fill();
  x.beginPath();
  x.moveTo(tx, ground - 78);
  x.lineTo(tx + 22, ground - 42);
  x.lineTo(tx - 22, ground - 42);
  x.closePath();
  x.fill();
};

/** Sea, waves, and a shoreline (water). */
export const water: SceneFn = (x, W, H, t, pal) => {
  const horizon = H * 0.38;

  const sky = x.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, `rgba(${p1(pal)},0.18)`);
  sky.addColorStop(1, `rgba(${p0(pal)},0.08)`);
  x.fillStyle = sky;
  x.fillRect(0, 0, W, horizon);
  cloud(x, W * 0.18, H * 0.14, 22, `rgba(255,255,255,0.16)`);
  cloud(x, W * 0.72, H * 0.12, 16, `rgba(255,255,255,0.12)`);

  // Distant land.
  x.fillStyle = `rgba(${LAND},0.35)`;
  x.beginPath();
  x.moveTo(0, horizon);
  x.quadraticCurveTo(W * 0.18, horizon - 18, W * 0.32, horizon);
  x.quadraticCurveTo(W * 0.55, horizon - 28, W * 0.78, horizon);
  x.lineTo(W, horizon);
  x.lineTo(0, horizon);
  x.fill();

  x.strokeStyle = `rgba(255,255,255,0.25)`;
  x.lineWidth = 1;
  line(x, 0, horizon, W, horizon);

  const body = x.createLinearGradient(0, horizon, 0, H);
  body.addColorStop(0, `rgba(${p0(pal)},0.22)`);
  body.addColorStop(0.55, `rgba(${p1(pal)},0.38)`);
  body.addColorStop(1, `rgba(${p1(pal)},0.55)`);
  x.fillStyle = body;
  x.fillRect(0, horizon, W, H - horizon);

  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let r = 0; r < 5; r++) {
    const y0 = horizon + 8 + r * (H - horizon) * 0.16;
    const amp = 4 + r * 3.5;
    const col = r % 2 ? p1(pal) : p0(pal);
    const waveY = (i: number): number =>
      y0 +
      Math.sin(i * 0.028 + t * (1.1 + r * 0.15) + r) * amp +
      Math.sin(i * 0.07 - t * 1.3 + r * 1.4) * amp * 0.35;
    x.beginPath();
    for (let i = 0; i <= W; i += 6) {
      if (i) x.lineTo(i, waveY(i));
      else x.moveTo(i, waveY(i));
    }
    x.strokeStyle = `rgba(${col},${0.25 + r * 0.08})`;
    x.lineWidth = 1.4 + r * 0.25;
    x.stroke();
    if (r >= 3) {
      for (let i = 0; i <= W; i += 18) {
        const crest = Math.sin(i * 0.028 + t * 1.3 + r);
        if (crest > 0.55) {
          disc(x, i, waveY(i) - 1, 1.6, `rgba(255,255,255,${(crest - 0.55) * 0.7})`);
        }
      }
    }
  }
  x.restore();

  // Shoreline — sand in the foreground so this is a beach, not a texture.
  x.fillStyle = `rgba(${SAND},0.55)`;
  x.beginPath();
  x.moveTo(0, H);
  x.lineTo(0, H * 0.72);
  x.quadraticCurveTo(W * 0.22, H * 0.68 + Math.sin(t * 1.2) * 3, W * 0.48, H);
  x.closePath();
  x.fill();
  x.fillStyle = `rgba(255,255,255,0.2)`;
  x.beginPath();
  x.moveTo(0, H * 0.74);
  x.quadraticCurveTo(W * 0.2, H * 0.7 + Math.sin(t * 1.2) * 3, W * 0.4, H * 0.96);
  x.strokeStyle = `rgba(255,255,255,0.35)`;
  x.lineWidth = 2;
  x.stroke();

  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const d = (t * 0.2 + i * 0.17) % 1;
    disc(
      x,
      W * (0.45 + (i % 5) * 0.1) + Math.sin(t + i) * 6,
      H * 0.9 - d * H * 0.45,
      2 + (i % 3),
      `rgba(255,255,255,${(1 - d) * 0.35})`,
    );
  }
  x.globalCompositeOperation = 'source-over';
};

/** Campfire: logs, coals, flame tongues (heat / fire). */
export const heat: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const hot = p0(pal);
  const gold = p1(pal);
  const bedY = H * 0.82;

  const bed = x.createRadialGradient(cx, bedY, 0, cx, bedY, W * 0.42);
  bed.addColorStop(0, `rgba(${hot},0.45)`);
  bed.addColorStop(0.5, `rgba(${gold},0.12)`);
  bed.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = bed;
  x.fillRect(0, H * 0.4, W, H * 0.6);

  // Logs in a campfire star — the fire has a place.
  x.fillStyle = 'rgba(72,42,28,0.92)';
  x.save();
  x.translate(cx, bedY);
  for (let i = 0; i < 3; i++) {
    x.save();
    x.rotate((i / 3) * Math.PI + 0.2);
    x.beginPath();
    x.ellipse(0, 0, 38, 7, 0, 0, TAU);
    x.fill();
    x.restore();
  }
  x.restore();

  x.globalCompositeOperation = 'lighter';
  const tongues = 9;
  for (let i = 0; i < tongues; i++) {
    const seed = i * 1.7;
    const flick = Math.sin(t * 3.2 + seed) * 0.5 + 0.5;
    const lean = Math.sin(t * 2.1 + seed) * 14;
    const baseX = cx + Math.sin(seed * 2.1) * 22;
    const hgt = H * (0.28 + flick * 0.22 + (i % 3) * 0.03);
    const bw = 8 + (i % 4) * 4;
    const col = i % 2 ? gold : hot;
    x.beginPath();
    x.moveTo(baseX - bw, bedY);
    x.bezierCurveTo(baseX - bw * 0.6 + lean * 0.4, bedY - hgt * 0.35, baseX + lean, bedY - hgt * 0.72, baseX + lean * 0.2, bedY - hgt);
    x.bezierCurveTo(baseX + bw * 0.4 + lean, bedY - hgt * 0.55, baseX + bw + lean * 0.2, bedY - hgt * 0.18, baseX + bw, bedY);
    x.closePath();
    const fg = x.createLinearGradient(baseX, bedY, baseX, bedY - hgt);
    fg.addColorStop(0, `rgba(${hot},0.6)`);
    fg.addColorStop(0.45, `rgba(${col},0.45)`);
    fg.addColorStop(1, 'rgba(255,245,210,0)');
    x.fillStyle = fg;
    x.fill();
  }

  for (let i = 0; i < 14; i++) {
    const d = (t * 0.4 + i * 0.191) % 1;
    disc(
      x,
      cx + Math.sin(i * 7.1) * 28 + Math.sin(d * 9 + i) * 16,
      bedY - 10 - d * H * 0.7,
      1.3,
      `rgba(255,230,180,${(1 - d) * 0.9})`,
    );
  }

  // Heat shimmer above the fire.
  x.strokeStyle = `rgba(${gold},0.22)`;
  x.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const sx = cx + (i - 2) * 16;
    x.beginPath();
    for (let y = 0; y < H * 0.35; y += 6) {
      const px = sx + Math.sin(y * 0.12 + t * 4 + i) * 5;
      const py = bedY - 50 - y;
      if (y) x.lineTo(px, py);
      else x.moveTo(px, py);
    }
    x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
};

/** Night sky: crescent moon, Big Dipper, horizon, shooting star (star / space). */
export const stars: SceneFn = (x, W, H, t, pal) => {
  const sky = x.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, 'rgba(8,10,32,0.65)');
  sky.addColorStop(0.7, `rgba(${p1(pal)},0.08)`);
  sky.addColorStop(1, `rgba(${p0(pal)},0.12)`);
  x.fillStyle = sky;
  x.fillRect(0, 0, W, H);

  x.globalCompositeOperation = 'lighter';
  glow(x, W * 0.3, H * 0.35, Math.min(W, H) * 0.4, p0(pal), 0.1);
  glow(x, W * 0.7, H * 0.25, Math.min(W, H) * 0.28, p1(pal), 0.08);

  const nStars = 48;
  for (let i = 0; i < nStars; i++) {
    const sx = ((i * 97.3) % 100) * 0.01 * W;
    const sy = ((i * 53.1) % 100) * 0.01 * H * 0.72;
    const tw = 0.45 + 0.55 * Math.sin(t * (0.8 + (i % 5) * 0.3) + i);
    const s = i % 9 === 0 ? 1.8 : 0.8;
    disc(x, sx, sy, s * tw, `rgba(255,255,255,${0.25 + tw * 0.7})`);
    if (i % 11 === 0) {
      x.strokeStyle = `rgba(255,255,255,${tw * 0.55})`;
      x.lineWidth = 1;
      const sp = 4 + tw * 3;
      line(x, sx - sp, sy, sx + sp, sy);
      line(x, sx, sy - sp, sx, sy + sp);
    }
  }

  // Big Dipper — a constellation a kid can name.
  const dip: Array<[number, number]> = [
    [0.16, 0.3],
    [0.24, 0.26],
    [0.33, 0.28],
    [0.4, 0.34],
    [0.48, 0.42],
    [0.58, 0.44],
    [0.68, 0.38],
  ];
  x.strokeStyle = `rgba(${p1(pal)},0.45)`;
  x.lineWidth = 1.3;
  x.beginPath();
  dip.forEach(([u, v], i) => {
    const px = u * W,
      py = v * H;
    if (i === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  });
  x.stroke();
  line(x, dip[0]![0] * W, dip[0]![1] * H, dip[3]![0] * W, dip[3]![1] * H);
  for (const [u, v] of dip) {
    glow(x, u * W, v * H, 8, '255,255,255', 0.55);
    disc(x, u * W, v * H, 2.2, 'rgba(255,255,255,0.95)');
  }

  x.globalCompositeOperation = 'source-over';

  // Crescent moon.
  const mx = W * 0.82,
    my = H * 0.2,
    mr = Math.min(W, H) * 0.09;
  disc(x, mx, my, mr, 'rgba(255,244,210,0.95)');
  disc(x, mx + mr * 0.38, my - mr * 0.12, mr * 0.88, 'rgba(10,12,36,0.98)');

  // Horizon hills so it's a night landscape, not a particle field.
  x.fillStyle = `rgba(${p0(pal)},0.22)`;
  x.beginPath();
  x.moveTo(0, H);
  x.lineTo(0, H * 0.78);
  x.quadraticCurveTo(W * 0.22, H * 0.62, W * 0.45, H * 0.76);
  x.quadraticCurveTo(W * 0.7, H * 0.88, W, H * 0.7);
  x.lineTo(W, H);
  x.closePath();
  x.fill();

  x.globalCompositeOperation = 'lighter';
  const p = (t * 0.16) % 1,
    stx = W * 0.1 + p * W * 0.7,
    sty = H * 0.12 + p * H * 0.22,
    trail = Math.sin(p * Math.PI);
  x.strokeStyle = `rgba(255,255,255,${trail})`;
  x.lineWidth = 2;
  line(x, stx, sty, stx - 40, sty - 16);
  glow(x, stx, sty, 8, '255,255,255', trail);
  x.globalCompositeOperation = 'source-over';
};

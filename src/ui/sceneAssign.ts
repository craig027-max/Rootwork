/* Meaning-true scenes added so a kid reading the picture gets that root’s idea. */

import { TAU, cloud as puff, disc, glow, leaf, line, p0, p1, person, rr, type SceneFn } from './sceneUtil';

/** A box sliding under a shelf — under, not water. */
export const under: SceneFn = (x, W, H, t, pal) => {
  const shelfY = H * 0.42;
  const shelfH = 14;
  const boxW = Math.min(W * 0.22, 72);
  const boxH = 36;
  const p = (t * 0.28) % 1;
  const travel = p < 0.7 ? p / 0.7 : 1;
  const bx = W * 0.12 + travel * (W * 0.5 - boxW / 2 - W * 0.12);
  const by = shelfY + shelfH + 8;

  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 2;
  line(x, W * 0.08, H * 0.86, W * 0.92, H * 0.86);

  x.fillStyle = `rgba(${p1(pal)},0.55)`;
  rr(x, W * 0.18, shelfY, W * 0.64, shelfH, 3);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 2;
  rr(x, W * 0.18, shelfY, W * 0.64, shelfH, 3);
  x.stroke();
  // Legs so it's a table, not a floating bar.
  x.lineWidth = 4;
  line(x, W * 0.22, shelfY + shelfH, W * 0.22, H * 0.86);
  line(x, W * 0.78, shelfY + shelfH, W * 0.78, H * 0.86);

  x.fillStyle = `rgba(${p0(pal)},0.85)`;
  rr(x, bx, by, boxW, boxH, 5);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 2;
  rr(x, bx, by, boxW, boxH, 5);
  x.stroke();
  glow(x, bx + boxW / 2, by + boxH / 2, 18, p0(pal), 0.25);
};

/** Open palm, five fingers — a hand, not a pencil. */
export const hand: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.58;
  const wave = Math.sin(t * 1.6) * 0.12;
  x.save();
  x.translate(cx, cy);
  x.rotate(wave);

  x.fillStyle = `rgba(${p0(pal)},0.85)`;
  x.beginPath();
  x.ellipse(0, 8, 28, 32, 0, 0, TAU);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 2;
  x.stroke();

  const tips = [-36, -18, 0, 18, 32];
  const lens = [38, 52, 58, 50, 34];
  const angs = [-0.55, -0.22, 0.02, 0.24, 0.72];
  for (let i = 0; i < 5; i++) {
    const a = angs[i] ?? 0;
    const len = lens[i] ?? 40;
    const wiggle = 1 + Math.sin(t * 2 + i) * 0.04;
    x.save();
    x.translate(tips[i] ?? 0, -18);
    x.rotate(a);
    x.fillStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},0.9)`;
    x.beginPath();
    x.ellipse(0, -len * 0.35 * wiggle, 7, (len * 0.55) * wiggle, 0, 0, TAU);
    x.fill();
    x.strokeStyle = `rgba(${p0(pal)},0.85)`;
    x.lineWidth = 1.4;
    x.stroke();
    x.restore();
  }
  x.restore();
  glow(x, cx, cy - 10, 36, p1(pal), 0.12 + 0.08 * Math.sin(t * 1.6));
};

/** Scissors snipping a ribbon — a clean cut, not a ruler. */
export const cut: SceneFn = (x, W, H, t, pal) => {
  const cy = H * 0.5;
  const cycle = 1.8;
  const ph = (t % cycle) / cycle;
  const open = ph < 0.45 ? 0.35 + (1 - ph / 0.45) * 0.45 : 0.35;
  const snip = ph > 0.42 && ph < 0.55;
  const cx = W * 0.42;

  x.strokeStyle = `rgba(${p1(pal)},0.85)`;
  x.lineWidth = 5;
  x.lineCap = 'round';
  line(x, W * 0.08, cy, cx - 4, cy);
  if (ph > 0.5) {
    x.strokeStyle = `rgba(${p1(pal)},0.35)`;
    line(x, cx + 8, cy, W * 0.92, cy);
  } else {
    line(x, cx + 8, cy, W * 0.92, cy);
  }

  function blade(dir: number, col: string): void {
    x.save();
    x.translate(cx, cy);
    x.rotate(dir * open);
    x.fillStyle = `rgba(${col},0.9)`;
    x.beginPath();
    x.moveTo(8, 0);
    x.lineTo(70, dir * 8);
    x.lineTo(72, dir * 2);
    x.lineTo(10, dir * -3);
    x.closePath();
    x.fill();
    x.strokeStyle = `rgba(${col},0.95)`;
    x.lineWidth = 1.4;
    x.stroke();
    x.beginPath();
    x.ellipse(-10, dir * 14, 10, 12, 0, 0, TAU);
    x.stroke();
    x.restore();
  }
  blade(-1, p0(pal));
  blade(1, p1(pal));
  disc(x, cx, cy, 5, `rgba(255,255,255,0.9)`);
  if (snip) glow(x, cx + 8, cy, 22, '255,255,255', 0.45);
};

/** A thick pillar holding a heavy block — strong, not a crane. */
export const strong: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const ground = H * 0.86;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.3);
  const colW = 36 + pulse * 3;
  const top = H * 0.38;

  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  line(x, W * 0.1, ground, W * 0.9, ground);

  const g = x.createLinearGradient(cx - colW / 2, 0, cx + colW / 2, 0);
  g.addColorStop(0, `rgba(${p0(pal)},0.5)`);
  g.addColorStop(0.5, `rgba(${p1(pal)},0.95)`);
  g.addColorStop(1, `rgba(${p0(pal)},0.5)`);
  x.fillStyle = g;
  rr(x, cx - colW / 2, top, colW, ground - top - 6, 4);
  x.fill();

  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  rr(x, cx - 54, top - 38, 108, 36, 4);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 2;
  rr(x, cx - 54, top - 38, 108, 36, 4);
  x.stroke();
  glow(x, cx, (top + ground) / 2, 40, p1(pal), 0.12 + pulse * 0.12);
};

/** A 10×10 grid filling in — one hundred, not a clock. */
export const hundred: SceneFn = (x, W, H, t, pal) => {
  const n = 10;
  const gap = 3;
  const grid = Math.min(W, H) * 0.62;
  const cell = (grid - gap * (n - 1)) / n;
  const x0 = (W - grid) / 2;
  const y0 = (H - grid) / 2 + 8;
  const lit = Math.floor(((t * 18) % 110));
  const count = Math.min(100, lit);

  for (let i = 0; i < 100; i++) {
    const c = i % n;
    const r = Math.floor(i / n);
    const on = i < count;
    x.fillStyle = on ? `rgba(${i % 2 ? p1(pal) : p0(pal)},0.85)` : `rgba(${p0(pal)},0.12)`;
    rr(x, x0 + c * (cell + gap), y0 + r * (cell + gap), cell, cell, 2);
    x.fill();
  }
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.font = '700 18px ui-rounded, system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'top';
  x.fillText(String(count), W / 2, y0 + grid + 6);
};

/** Two blocks sliding apart — apart, not shattered. */
export const apart: SceneFn = (x, W, H, t, pal) => {
  const cy = H * 0.5;
  const bw = Math.min(W * 0.2, 70);
  const bh = 56;
  const p = 0.5 + 0.5 * Math.sin(t * 1.1);
  const gap = 8 + p * Math.min(W * 0.22, 80);
  const cx = W / 2;

  x.fillStyle = `rgba(${p0(pal)},0.85)`;
  rr(x, cx - gap / 2 - bw, cy - bh / 2, bw, bh, 8);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.85)`;
  rr(x, cx + gap / 2, cy - bh / 2, bw, bh, 8);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 2;
  rr(x, cx - gap / 2 - bw, cy - bh / 2, bw, bh, 8);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  rr(x, cx + gap / 2, cy - bh / 2, bw, bh, 8);
  x.stroke();
};

/** A check that becomes an X — wrong / bad / false. */
export const wrong: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2;
  const s = Math.min(W, H) * 0.22;
  const ph = (t * 0.35) % 1;
  const toX = ph > 0.45;
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 6;
  x.beginPath();
  x.arc(cx, cy, s * 1.35, 0, TAU);
  x.stroke();

  x.lineCap = 'round';
  x.lineJoin = 'round';
  if (!toX) {
    x.strokeStyle = `rgba(${p1(pal)},0.95)`;
    x.lineWidth = 8;
    x.beginPath();
    x.moveTo(cx - s * 0.7, cy);
    x.lineTo(cx - s * 0.15, cy + s * 0.55);
    x.lineTo(cx + s * 0.75, cy - s * 0.5);
    x.stroke();
  } else {
    x.strokeStyle = `rgba(${p0(pal)},0.95)`;
    x.lineWidth = 8;
    line(x, cx - s * 0.65, cy - s * 0.65, cx + s * 0.65, cy + s * 0.65);
    line(x, cx + s * 0.65, cy - s * 0.65, cx - s * 0.65, cy + s * 0.65);
    glow(x, cx, cy, 28, p0(pal), 0.25);
  }
};

/** Two arrows colliding — against / opposite / fight. */
export const against: SceneFn = (x, W, H, t, pal) => {
  const cy = H * 0.5;
  const p = 0.5 + 0.5 * Math.sin(t * 1.6);
  const inset = W * 0.12 + (1 - p) * W * 0.16;
  const left = inset;
  const right = W - inset;

  function arrow(from: number, to: number, col: string): void {
    x.strokeStyle = `rgba(${col},0.9)`;
    x.lineWidth = 8;
    x.lineCap = 'round';
    line(x, from, cy, to, cy);
    const dir = to > from ? 1 : -1;
    x.fillStyle = `rgba(${col},0.95)`;
    x.beginPath();
    x.moveTo(to + dir * 4, cy);
    x.lineTo(to - dir * 18, cy - 16);
    x.lineTo(to - dir * 18, cy + 16);
    x.closePath();
    x.fill();
  }
  arrow(W * 0.06, left, p0(pal));
  arrow(W * 0.94, right, p1(pal));
  if (p > 0.85) glow(x, W / 2, cy, 36, '255,255,255', 0.4);
};

/** A candle flame that dims and goes out — death, factual, not spooky. */
export const death: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const base = H * 0.78;
  const cycle = 4.2;
  const ph = (t % cycle) / cycle;
  let flame = 1;
  if (ph > 0.45 && ph < 0.72) flame = 1 - (ph - 0.45) / 0.27;
  else if (ph >= 0.72 && ph < 0.88) flame = 0;
  else if (ph >= 0.88) flame = (ph - 0.88) / 0.12;

  x.fillStyle = `rgba(${p0(pal)},0.55)`;
  rr(x, cx - 22, base, 44, 12, 3);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.75)`;
  rr(x, cx - 7, base - 70, 14, 70, 3);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 1.4;
  rr(x, cx - 7, base - 70, 14, 70, 3);
  x.stroke();
  line(x, cx, base - 70, cx, base - 82);

  if (flame > 0.02) {
    const fh = 28 * flame;
    const fw = 12 * (0.7 + 0.3 * Math.sin(t * 8));
    glow(x, cx, base - 82 - fh * 0.4, 22 * flame, p0(pal), 0.35 * flame);
    x.fillStyle = `rgba(${p0(pal)},${0.85 * flame})`;
    x.beginPath();
    x.moveTo(cx, base - 80);
    x.quadraticCurveTo(cx - fw, base - 80 - fh * 0.45, cx, base - 80 - fh);
    x.quadraticCurveTo(cx + fw, base - 80 - fh * 0.45, cx, base - 80);
    x.fill();
  }
};

/** A long bone — textbook, not a grave. */
export const bone: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2;
  const len = Math.min(W * 0.62, 220);
  const ang = Math.sin(t * 0.7) * 0.08;
  x.save();
  x.translate(cx, cy);
  x.rotate(ang);
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 16;
  x.lineCap = 'round';
  line(x, -len / 2, 0, len / 2, 0);
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.beginPath();
  x.ellipse(-len / 2, -8, 16, 12, 0, 0, TAU);
  x.ellipse(-len / 2, 8, 16, 12, 0, 0, TAU);
  x.ellipse(len / 2, -8, 16, 12, 0, 0, TAU);
  x.ellipse(len / 2, 8, 16, 12, 0, 0, TAU);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 2;
  x.stroke();
  x.restore();
  glow(x, cx, cy, 20, p0(pal), 0.15);
};

/** A molar — tooth, not a ruler. */
export const tooth: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.48;
  const s = Math.min(W, H) * 0.28;
  const pulse = 1 + Math.sin(t * 1.4) * 0.03;
  x.save();
  x.translate(cx, cy);
  x.scale(pulse, pulse);
  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  x.beginPath();
  x.moveTo(-s * 0.55, -s * 0.15);
  x.quadraticCurveTo(-s * 0.6, -s * 0.85, 0, -s * 0.9);
  x.quadraticCurveTo(s * 0.6, -s * 0.85, s * 0.55, -s * 0.15);
  x.lineTo(s * 0.42, s * 0.85);
  x.quadraticCurveTo(s * 0.2, s * 0.55, 0, s * 0.8);
  x.quadraticCurveTo(-s * 0.2, s * 0.55, -s * 0.42, s * 0.85);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.85)`;
  x.lineWidth = 2.4;
  x.stroke();
  disc(x, -s * 0.15, -s * 0.45, 6, 'rgba(255,255,255,0.45)');
  x.restore();
};

/** A rock on the ground — stone, not a planet. */
export const stone: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    ground = H * 0.78;
  const bob = Math.sin(t * 0.8) * 2;
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  line(x, W * 0.1, ground, W * 0.9, ground);
  x.fillStyle = `rgba(${p0(pal)},0.85)`;
  x.beginPath();
  x.moveTo(cx - 58, ground + bob);
  x.quadraticCurveTo(cx - 70, ground - 36 + bob, cx - 20, ground - 52 + bob);
  x.quadraticCurveTo(cx + 20, ground - 64 + bob, cx + 62, ground - 28 + bob);
  x.quadraticCurveTo(cx + 70, ground + bob, cx + 40, ground + bob);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.8)`;
  x.lineWidth = 2;
  x.stroke();
  x.beginPath();
  x.moveTo(cx - 18, ground - 18 + bob);
  x.lineTo(cx + 8, ground - 32 + bob);
  x.stroke();
};

/** A fish swimming — fish, not a water tank. */
export const fish: SceneFn = (x, W, H, t, pal) => {
  const p = (t * 0.22) % 1;
  const fx = W * (0.18 + p * 0.64);
  const fy = H * 0.5 + Math.sin(t * 1.8) * H * 0.1;
  x.save();
  x.translate(fx, fy);
  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  x.beginPath();
  x.ellipse(0, 0, 34, 18, 0, 0, TAU);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.beginPath();
  x.moveTo(-32, 0);
  x.lineTo(-52, -16);
  x.lineTo(-52, 16);
  x.closePath();
  x.fill();
  x.beginPath();
  x.moveTo(6, -16);
  x.quadraticCurveTo(14, -28, 2, -22);
  x.fill();
  disc(x, 18, -4, 3.2, 'rgba(10,10,26,0.9)');
  disc(x, 19, -5, 1.1, 'rgba(255,255,255,0.8)');
  x.strokeStyle = `rgba(${p1(pal)},0.5)`;
  x.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    x.beginPath();
    x.ellipse(-4 + i * 6, 2, 6, 8, 0.2, 0, TAU);
    x.stroke();
  }
  x.restore();
};

/** A sailboat — sailor / ship, not a generic splash. */
export const boat: SceneFn = (x, W, H, t, pal) => {
  const p = (t * 0.18) % 1;
  const bx = W * (0.2 + p * 0.55);
  const by = H * 0.62 + Math.sin(t * 1.4) * 4;
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 2;
  line(x, W * 0.06, by + 18, W * 0.94, by + 18);

  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  x.beginPath();
  x.moveTo(bx - 40, by);
  x.lineTo(bx + 40, by);
  x.lineTo(bx + 28, by + 18);
  x.lineTo(bx - 28, by + 18);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 2.4;
  line(x, bx, by, bx, by - 64);
  x.fillStyle = `rgba(${p1(pal)},0.85)`;
  x.beginPath();
  x.moveTo(bx + 2, by - 62);
  x.lineTo(bx + 38, by - 18);
  x.lineTo(bx + 2, by - 12);
  x.closePath();
  x.fill();
};

/** An open book — book, not handwriting. */
export const book: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.52;
  const w = Math.min(W * 0.36, 130);
  const h = w * 0.72;
  const flip = 0.5 + 0.5 * Math.sin(t * 1.1);
  x.fillStyle = `rgba(${p0(pal)},0.35)`;
  rr(x, cx - w - 6, cy - h / 2, w + 8, h, 4);
  x.fill();
  rr(x, cx - 2, cy - h / 2, w + 8, h, 4);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.2)`;
  rr(x, cx - w, cy - h / 2 + 6, w - 8, h - 12, 3);
  x.fill();
  rr(x, cx + 8, cy - h / 2 + 6, w - 8, h - 12, 3);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 2.4;
  rr(x, cx - w - 6, cy - h / 2, w + 8, h, 4);
  x.stroke();
  rr(x, cx - 2, cy - h / 2, w + 8, h, 4);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.45)`;
  x.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const y = cy - h * 0.28 + i * 14;
    line(x, cx - w + 8, y, cx - 16, y);
    line(x, cx + 16, y + flip * 2, cx + w - 10, y + flip * 2);
  }
};

/** Tokens on a line; the first one glows — before / first. */
export const before: SceneFn = (x, W, H, t, pal) => {
  const y = H * 0.55;
  const xs = [W * 0.22, W * 0.5, W * 0.78];
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 3;
  line(x, W * 0.1, y, W * 0.9, y);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2);
  xs.forEach((px, i) => {
    const r = i === 0 ? 18 + pulse * 3 : 12;
    disc(x, px, y, r, `rgba(${i === 0 ? p1(pal) : p0(pal)},${i === 0 ? 0.95 : 0.45})`);
    x.fillStyle = `rgba(255,255,255,0.9)`;
    x.font = '700 13px ui-rounded, system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(i + 1), px, y);
  });
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.font = '600 12px ui-rounded, system-ui, sans-serif';
  x.fillText('first', xs[0] ?? W * 0.22, y - 36);
};

/** A path that stops at a block — end / limit. */
export const end: SceneFn = (x, W, H, t, pal) => {
  const y = H * 0.5;
  const stop = W * 0.72;
  const p = (t * 0.35) % 1;
  const tip = W * 0.1 + Math.min(1, p / 0.75) * (stop - W * 0.1 - 16);
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 5;
  x.lineCap = 'round';
  line(x, W * 0.08, y, tip, y);
  x.fillStyle = `rgba(${p0(pal)},0.95)`;
  x.beginPath();
  x.moveTo(tip, y);
  x.lineTo(tip - 12, y - 8);
  x.lineTo(tip - 12, y + 8);
  x.closePath();
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.85)`;
  rr(x, stop, y - 40, 16, 80, 3);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 2;
  rr(x, stop, y - 40, 16, 80, 3);
  x.stroke();
  if (tip > stop - 20) glow(x, stop, y, 20, p1(pal), 0.35);
};

/** A crescent moon — sleep, not a starfield. */
export const sleep: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.46;
  const R = Math.min(W, H) * 0.28;
  const drift = Math.sin(t * 0.6) * 6;
  glow(x, cx, cy + drift, R * 1.3, p0(pal), 0.2);
  disc(x, cx, cy + drift, R, `rgba(${p0(pal)},0.92)`);
  disc(x, cx + R * 0.38, cy - R * 0.12 + drift, R * 0.78, 'rgba(10,10,26,0.92)');
  x.fillStyle = `rgba(${p1(pal)},0.7)`;
  x.font = '700 22px ui-rounded, system-ui, sans-serif';
  x.textAlign = 'left';
  const z = 0.5 + 0.5 * Math.sin(t * 1.2);
  x.fillText('z', cx + R * 0.7, cy - R * 0.4 - z * 10);
  x.fillText('z', cx + R * 0.95, cy - R * 0.7 - z * 16);
};

/** Three jewel swatches — color / hue, not sunlight. */
export const color: SceneFn = (x, W, H, t, pal) => {
  const cy = H * 0.5;
  const cols = [p0(pal), p1(pal), p0(pal)];
  const n = 3;
  for (let i = 0; i < n; i++) {
    const px = W * (0.22 + i * 0.28);
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 + i);
    const r = 28 + pulse * 6;
    const col = cols[i] ?? p0(pal);
    glow(x, px, cy, r * 1.4, col, 0.25);
    disc(x, px, cy, r, `rgba(${col},0.9)`);
    disc(x, px - 8, cy - 8, 6, 'rgba(255,255,255,0.45)');
  }
};

/** A spark popping into empty space — new. */
export const fresh: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2;
  const p = (t * 0.45) % 1;
  const appear = p < 0.35 ? p / 0.35 : 1;
  const s = appear * appear * (3 - 2 * appear);
  glow(x, cx, cy, 20 + s * 40, p1(pal), 0.15 + s * 0.35);
  disc(x, cx, cy, 4 + s * 14, `rgba(${p0(pal)},0.95)`);
  x.strokeStyle = `rgba(${p1(pal)},${0.3 + s * 0.6})`;
  x.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + t * 0.4;
    const r0 = 10 + s * 8;
    const r1 = 22 + s * 28;
    line(x, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
};

/** One figure ahead of two others — lead / follow. */
export const lead: SceneFn = (x, W, H, t, pal) => {
  const foot = H * 0.78;
  x.strokeStyle = `rgba(${p0(pal)},0.3)`;
  x.lineWidth = 2;
  line(x, W * 0.08, foot + 4, W * 0.92, foot + 4);
  const march = t * 1.4;
  person(x, W * 0.28, foot, p0(pal), march);
  person(x, W * 0.48, foot, p0(pal), march + 0.8);
  person(x, W * 0.72, foot, p1(pal), march + 1.6);
  x.strokeStyle = `rgba(${p1(pal)},0.85)`;
  x.lineWidth = 2.4;
  x.beginPath();
  x.moveTo(W * 0.78, foot - 64);
  x.lineTo(W * 0.88, foot - 56);
  x.lineTo(W * 0.78, foot - 48);
  x.stroke();
};

/** A lightning bolt — power / force. */
export const power: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.48;
  const flash = 0.55 + 0.45 * Math.max(0, Math.sin(t * 5));
  glow(x, cx, cy, 50, p1(pal), 0.15 * flash);
  x.fillStyle = `rgba(${p0(pal)},${0.75 + flash * 0.2})`;
  x.beginPath();
  x.moveTo(cx + 8, H * 0.14);
  x.lineTo(cx - 22, cy + 4);
  x.lineTo(cx - 2, cy + 4);
  x.lineTo(cx - 16, H * 0.86);
  x.lineTo(cx + 26, cy - 6);
  x.lineTo(cx + 6, cy - 6);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 2;
  x.stroke();
};

/** A tiny skyline — city / town. */
export const city: SceneFn = (x, W, H, t, pal) => {
  const ground = H * 0.82;
  const blocks: Array<[number, number, number]> = [
    [0.12, 0.38, 0.14],
    [0.28, 0.52, 0.12],
    [0.42, 0.64, 0.16],
    [0.6, 0.46, 0.13],
    [0.75, 0.34, 0.12],
  ];
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  line(x, W * 0.06, ground, W * 0.94, ground);
  blocks.forEach(([xf, hf, wf], i) => {
    const bx = W * xf;
    const bw = W * wf;
    const bh = H * hf;
    const top = ground - bh;
    x.fillStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},0.75)`;
    rr(x, bx, top, bw, bh, 2);
    x.fill();
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        const on = Math.sin(t * 1.3 + i + r * 0.7 + c) > 0.15;
        disc(x, bx + bw * (0.3 + c * 0.4), top + 12 + r * 14, 2.2, `rgba(${p1(pal)},${on ? 0.9 : 0.15})`);
      }
    }
  });
};

/** A crown — rule / chief. */
export const rule: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.52;
  const bob = Math.sin(t * 1.2) * 4;
  const y = cy + bob;
  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  x.beginPath();
  x.moveTo(cx - 52, y + 24);
  x.lineTo(cx - 48, y - 8);
  x.lineTo(cx - 24, y + 8);
  x.lineTo(cx, y - 28);
  x.lineTo(cx + 24, y + 8);
  x.lineTo(cx + 48, y - 8);
  x.lineTo(cx + 52, y + 24);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 2.2;
  x.stroke();
  disc(x, cx, y - 30, 6, `rgba(${p1(pal)},0.95)`);
  disc(x, cx - 48, y - 10, 5, `rgba(${p1(pal)},0.9)`);
  disc(x, cx + 48, y - 10, 5, `rgba(${p1(pal)},0.9)`);
  glow(x, cx, y - 8, 28, p1(pal), 0.2);
};

/** Two chain links closing — join / connect. */
export const join: SceneFn = (x, W, H, t, pal) => {
  const cy = H * 0.5;
  const p = 0.5 + 0.5 * Math.sin(t * 1.15);
  const gap = (1 - p) * 28;
  const cx = W / 2;
  function link(px: number, col: string, rot: number): void {
    x.save();
    x.translate(px, cy);
    x.rotate(rot);
    x.strokeStyle = `rgba(${col},0.9)`;
    x.lineWidth = 10;
    x.beginPath();
    x.ellipse(0, 0, 28, 16, 0, 0, TAU);
    x.stroke();
    x.restore();
  }
  link(cx - 22 - gap, p0(pal), 0);
  link(cx + 22 + gap, p1(pal), 0.5);
};

/** A gem between two walls — between / among. */
export const between: SceneFn = (x, W, H, t, pal) => {
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
  x.fillStyle = `rgba(${p0(pal)},0.7)`;
  rr(x, W * 0.06, H * 0.18, W * 0.16, H * 0.64, 4);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.7)`;
  rr(x, W * 0.78, H * 0.18, W * 0.16, H * 0.64, 4);
  x.fill();
  glow(x, W / 2, H / 2, 24 + pulse * 8, p1(pal), 0.35);
  disc(x, W / 2, H / 2, 14 + pulse * 2, `rgba(${p0(pal)},0.95)`);
  disc(x, W / 2 - 4, H / 2 - 4, 3, 'rgba(255,255,255,0.8)');
};

/** A glowing check — good / well. */
export const good: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2;
  const s = Math.min(W, H) * 0.22;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
  glow(x, cx, cy, 40 + pulse * 10, p1(pal), 0.2);
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 6;
  x.beginPath();
  x.arc(cx, cy, s * 1.35, 0, TAU);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 8;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(cx - s * 0.7, cy);
  x.lineTo(cx - s * 0.15, cy + s * 0.55);
  x.lineTo(cx + s * 0.75, cy - s * 0.5);
  x.stroke();
};

/** Ripples flattening to a still line — calm. */
export const calm: SceneFn = (x, W, H, t, pal) => {
  const y = H * 0.5;
  const settle = 0.5 + 0.5 * Math.sin(t * 0.7);
  const amp = H * 0.16 * (1 - settle * 0.85);
  x.lineCap = 'round';
  for (let r = 0; r < 3; r++) {
    x.strokeStyle = `rgba(${r % 2 ? p1(pal) : p0(pal)},${0.35 + r * 0.15})`;
    x.lineWidth = 2.4;
    x.beginPath();
    for (let i = 0; i <= W; i += 8) {
      const yy = y + Math.sin(i * 0.04 + t * 1.2 + r) * amp * (1 - r * 0.2);
      if (i) x.lineTo(i, yy);
      else x.moveTo(i, yy);
    }
    x.stroke();
  }
};

/** A figure pointing at itself — self. */
export const self: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    foot = H * 0.8;
  x.strokeStyle = `rgba(${p0(pal)},0.3)`;
  x.lineWidth = 2;
  line(x, W * 0.2, foot + 4, W * 0.8, foot + 4);
  person(x, cx, foot, p0(pal), t * 1.2);
  const a = t * 1.3;
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 3;
  x.beginPath();
  x.arc(cx, foot - 36, 42, 0.4 + Math.sin(a) * 0.1, TAU - 0.6);
  x.stroke();
  const ax = cx + Math.cos(-0.4) * 42;
  const ay = foot - 36 + Math.sin(-0.4) * 42;
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.moveTo(ax, ay);
  x.lineTo(ax + 10, ay - 14);
  x.lineTo(ax + 16, ay - 2);
  x.fill();
};

/** One body silhouette — body / flesh, not a crowd. */
export const body: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.48;
  const breathe = 1 + Math.sin(t * 1.3) * 0.03;
  x.save();
  x.translate(cx, cy);
  x.scale(breathe, breathe);
  disc(x, 0, -52, 16, `rgba(${p0(pal)},0.92)`);
  x.fillStyle = `rgba(${p0(pal)},0.88)`;
  rr(x, -22, -34, 44, 58, 16);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 10;
  x.lineCap = 'round';
  line(x, -22, -18, -40, 16);
  line(x, 22, -18, 40, 16);
  line(x, -10, 22, -16, 62);
  line(x, 10, 22, 16, 62);
  x.restore();
};

/** A name tag — name, not a talking face. */
export const name: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.5;
  const w = Math.min(W * 0.55, 180);
  const h = 70;
  const bob = Math.sin(t * 1.2) * 3;
  x.strokeStyle = `rgba(${p1(pal)},0.5)`;
  x.lineWidth = 2;
  line(x, cx, H * 0.16, cx, cy - h / 2 + bob);
  disc(x, cx, H * 0.16, 4, `rgba(${p1(pal)},0.9)`);
  x.fillStyle = `rgba(${p0(pal)},0.35)`;
  rr(x, cx - w / 2, cy - h / 2 + bob, w, h, 8);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 2.4;
  rr(x, cx - w / 2, cy - h / 2 + bob, w, h, 8);
  x.stroke();
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.font = '700 22px ui-rounded, system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('NAME', cx, cy + bob);
};

/** A blooming flower — beauty. */
export const beauty: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.48;
  const open = 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.9));
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  line(x, W * 0.15, H * 0.84, W * 0.85, H * 0.84);
  x.strokeStyle = `rgba(${p0(pal)},0.85)`;
  x.lineWidth = 4;
  line(x, cx, H * 0.84, cx, cy + 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + t * 0.15;
    x.fillStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},0.8)`;
    x.beginPath();
    x.ellipse(cx + Math.cos(a) * 16 * open, cy + Math.sin(a) * 16 * open, 18 * open, 10, a, 0, TAU);
    x.fill();
  }
  disc(x, cx, cy, 8, `rgba(${p1(pal)},0.95)`);
};

/** One figure standing apart from a group — stranger / foreign. */
export const stranger: SceneFn = (x, W, H, t, pal) => {
  const foot = H * 0.78;
  x.strokeStyle = `rgba(${p0(pal)},0.3)`;
  x.lineWidth = 2;
  line(x, W * 0.08, foot + 4, W * 0.92, foot + 4);
  person(x, W * 0.22, foot, p0(pal), t * 1.1);
  person(x, W * 0.36, foot, p0(pal), t * 1.1 + 0.5);
  person(x, W * 0.5, foot, p0(pal), t * 1.1 + 1);
  const walk = W * 0.78 + Math.sin(t * 1.2) * 6;
  person(x, walk, foot, p1(pal), t * 1.4);
};

/** One full disc plus a half — one and a half. */
export const onehalf: SceneFn = (x, W, H, t, pal) => {
  const cy = H * 0.5;
  const R = Math.min(W, H) * 0.2;
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.2);
  disc(x, W * 0.32, cy, R, `rgba(${p0(pal)},0.9)`);
  disc(x, W * 0.32 - 8, cy - 8, 6, 'rgba(255,255,255,0.45)');
  const hx = W * 0.7;
  x.fillStyle = 'rgba(214, 228, 255, 0.2)';
  x.beginPath();
  x.arc(hx, cy, R, 0, TAU);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.92)`;
  x.beginPath();
  x.arc(hx, cy, R, Math.PI / 2, -Math.PI / 2, false);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(255,255,255,${0.6 + breathe * 0.2})`;
  x.lineWidth = 2.4;
  line(x, hx, cy - R, hx, cy + R);
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 3;
  x.beginPath();
  x.arc(hx, cy, R, 0, TAU);
  x.stroke();
};

/** A circle beside a square — different / other. */
export const different: SceneFn = (x, W, H, t, pal) => {
  const cy = H * 0.5;
  const s = Math.min(W, H) * 0.22;
  const bob = Math.sin(t * 1.3) * 3;
  disc(x, W * 0.32, cy + bob, s, `rgba(${p0(pal)},0.9)`);
  disc(x, W * 0.32 - 8, cy + bob - 8, 6, 'rgba(255,255,255,0.4)');
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  rr(x, W * 0.68 - s, cy - s - bob, s * 2, s * 2, 6);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 2;
  rr(x, W * 0.68 - s, cy - s - bob, s * 2, s * 2, 6);
  x.stroke();
};

/** A counter that runs up to 1000 — a thousand, not a hundred. */
export const thousand: SceneFn = (x, W, H, t, pal) => {
  const count = Math.min(1000, Math.floor((t * 90) % 1050));
  const cx = W / 2;
  const barW = Math.min(W * 0.72, 280);
  const barX = cx - barW / 2;
  const barY = H * 0.62;
  x.fillStyle = `rgba(${p0(pal)},0.15)`;
  rr(x, barX, barY, barW, 14, 7);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  rr(x, barX, barY, Math.max(8, barW * (count / 1000)), 14, 7);
  x.fill();
  x.fillStyle = `rgba(${p0(pal)},0.95)`;
  x.font = '700 42px ui-rounded, system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(String(count), cx, H * 0.4);
  glow(x, cx, H * 0.4, 36, p1(pal), 0.18);
};

/** Two rays and the wedge between them — an angle, not a full circle. */
export const angle: SceneFn = (x, W, H, t, pal) => {
  const ox = W * 0.28;
  const oy = H * 0.72;
  const len = Math.min(W, H) * 0.48;
  const sweep = 0.35 + (0.5 + 0.5 * Math.sin(t * 1.1)) * 0.9;
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 6;
  x.lineCap = 'round';
  line(x, ox, oy, ox + len, oy);
  line(x, ox, oy, ox + Math.cos(-sweep) * len, oy + Math.sin(-sweep) * len);
  x.fillStyle = `rgba(${p1(pal)},0.35)`;
  x.beginPath();
  x.moveTo(ox, oy);
  x.arc(ox, oy, len * 0.38, -sweep, 0);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 2.5;
  x.beginPath();
  x.arc(ox, oy, len * 0.38, -sweep, 0);
  x.stroke();
};

/** A square whose edges light one at a time — a side, not the whole shape. */
export const side: SceneFn = (x, W, H, t, pal) => {
  const s = Math.min(W, H) * 0.42;
  const x0 = (W - s) / 2;
  const y0 = (H - s) / 2 + 6;
  const edges: Array<[number, number, number, number]> = [
    [x0, y0, x0 + s, y0],
    [x0 + s, y0, x0 + s, y0 + s],
    [x0 + s, y0 + s, x0, y0 + s],
    [x0, y0 + s, x0, y0],
  ];
  const hot = Math.floor(t * 0.8) % 4;
  x.strokeStyle = `rgba(${p0(pal)},0.28)`;
  x.lineWidth = 8;
  x.lineCap = 'round';
  for (const [a, b, c, d] of edges) line(x, a, b, c, d);
  const [a, b, c, d] = edges[hot] ?? edges[0]!;
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 10;
  line(x, a, b, c, d);
  glow(x, (a + c) / 2, (b + d) / 2, 22, p1(pal), 0.28);
};

/** Tokens on a line; the last one glows — after, not first. */
export const after: SceneFn = (x, W, H, t, pal) => {
  const y = H * 0.55;
  const xs = [W * 0.22, W * 0.5, W * 0.78];
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 3;
  line(x, W * 0.1, y, W * 0.9, y);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2);
  xs.forEach((px, i) => {
    const last = i === xs.length - 1;
    const r = last ? 18 + pulse * 3 : 12;
    disc(x, px, y, r, `rgba(${last ? p1(pal) : p0(pal)},${last ? 0.95 : 0.45})`);
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.font = '700 13px ui-rounded, system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(i + 1), px, y);
  });
  const lastX = xs[2] ?? W * 0.78;
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.font = '600 12px ui-rounded, system-ui, sans-serif';
  x.fillText('after', lastX, y - 36);
};

const GREEN = '64,196,72';

/** Petals opening around a center — a flower, not a leaf. */
export const flower: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const cy = H * 0.46;
  const open = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.2));
  x.strokeStyle = `rgba(${p0(pal)},0.8)`;
  x.lineWidth = 4;
  x.lineCap = 'round';
  line(x, cx, cy + 16, cx, H * 0.88);
  leaf(x, cx + 22, H * 0.7, 0.8, 22, `rgba(${p0(pal)},0.75)`, 'rgba(255,255,255,0.45)');
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2;
    const px = cx + Math.cos(a) * 28 * open;
    const py = cy + Math.sin(a) * 28 * open;
    x.fillStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},0.9)`;
    x.beginPath();
    x.ellipse(px, py, 16 * open, 10, a, 0, TAU);
    x.fill();
  }
  disc(x, cx, cy, 10, `rgba(${p1(pal)},0.95)`);
  glow(x, cx, cy, 36, p1(pal), 0.18);
};

/** A sprout rising out of the soil — a plant, not a flower. */
export const plant: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const ground = H * 0.78;
  const grow = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(t * 1.1));
  x.strokeStyle = `rgba(${p0(pal)},0.45)`;
  x.lineWidth = 3;
  line(x, W * 0.12, ground, W * 0.88, ground);
  x.strokeStyle = `rgba(${GREEN},0.95)`;
  x.lineWidth = 4;
  x.lineCap = 'round';
  line(x, cx, ground, cx, ground - 70 * grow);
  leaf(x, cx - 6, ground - 48 * grow, -0.9, 26 * grow, `rgba(${GREEN},0.9)`, 'rgba(255,255,255,0.5)');
  leaf(x, cx + 6, ground - 64 * grow, 0.9, 22 * grow, `rgba(${p1(pal)},0.9)`, 'rgba(255,255,255,0.5)');
  disc(x, cx, ground - 74 * grow, 5, `rgba(${GREEN},0.95)`);
};

/** One vivid green leaf between two dull discs — green, not just a plant. */
export const green: SceneFn = (x, W, H, t, pal) => {
  const pulse = 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.5));
  disc(x, W * 0.22, H * 0.55, 26, `rgba(${p0(pal)},0.28)`);
  disc(x, W * 0.78, H * 0.55, 26, `rgba(${p0(pal)},0.28)`);
  leaf(
    x,
    W / 2,
    H * 0.52,
    -0.35,
    58,
    `rgba(${GREEN},${pulse})`,
    'rgba(255,255,255,0.75)',
  );
  glow(x, W / 2, H * 0.42, 48, GREEN, 0.22);
};

/** Trunk plus a round crown — a tree, not a sprout. */
export const tree: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const ground = H * 0.86;
  const sway = Math.sin(t * 0.8) * 3;
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 2;
  line(x, W * 0.1, ground, W * 0.9, ground);
  x.fillStyle = `rgba(${p0(pal)},0.85)`;
  rr(x, cx - 10 + sway * 0.2, H * 0.48, 20, ground - H * 0.48, 4);
  x.fill();
  disc(x, cx + sway, H * 0.4, 46, `rgba(${GREEN},0.88)`);
  disc(x, cx - 28 + sway, H * 0.46, 28, `rgba(${p1(pal)},0.75)`);
  disc(x, cx + 30 + sway, H * 0.48, 26, `rgba(${GREEN},0.8)`);
  glow(x, cx, H * 0.4, 30, GREEN, 0.12);
};

/** A mouth closing on a bite — eat, not a smile. */
export const eat: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const cy = H * 0.52;
  const bite = 0.5 + 0.5 * Math.sin(t * 2.4);
  const gap = 8 + bite * 22;
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 8;
  x.lineCap = 'round';
  x.beginPath();
  x.arc(cx, cy - gap * 0.15, 48, Math.PI * 0.15, Math.PI * 0.85, true);
  x.stroke();
  x.beginPath();
  x.arc(cx, cy + gap * 0.15, 48, Math.PI * 1.15, Math.PI * 1.85, true);
  x.stroke();
  const food = 8 + (1 - bite) * 8;
  disc(x, cx + 8, cy, food, `rgba(${p1(pal)},0.95)`);
  glow(x, cx, cy, 20, p1(pal), 0.12);
};

/** A bird in flight — a body and flapping wings, not a single feather. */
export const bird: SceneFn = (x, W, H, t, pal) => {
  const cx = W * 0.48;
  const cy = H * 0.5 + Math.sin(t * 1.6) * 6;
  const flap = Math.sin(t * 3) * 0.6;
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 5;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx, cy);
  x.quadraticCurveTo(cx - 50, cy - 40 * flap, cx - 78, cy - 10 * flap);
  x.stroke();
  x.beginPath();
  x.moveTo(cx, cy);
  x.quadraticCurveTo(cx + 46, cy - 36 * flap, cx + 74, cy - 8 * flap);
  x.stroke();
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.ellipse(cx + 8, cy, 28, 14, -0.2, 0, TAU);
  x.fill();
  disc(x, cx + 32, cy - 4, 8, `rgba(${p0(pal)},0.95)`);
  line(x, cx + 38, cy - 2, cx + 52, cy + 2);
  line(x, cx - 8, cy + 10, cx - 16, cy + 28);
};

/** A side-view lizard — four legs and a tail, not a snake. */
export const lizard: SceneFn = (x, W, H, t, pal) => {
  const bob = Math.sin(t * 2) * 3;
  const y = H * 0.55 + bob;
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 5;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(W * 0.42, y);
  x.quadraticCurveTo(W * 0.22, y + 20, W * 0.1, y - 8);
  x.stroke();
  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  x.beginPath();
  x.ellipse(W * 0.55, y, 52, 16, 0, 0, TAU);
  x.fill();
  disc(x, W * 0.78, y - 6, 14, `rgba(${p1(pal)},0.95)`);
  disc(x, W * 0.84, y - 8, 2.5, 'rgba(8,7,15,0.8)');
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 3;
  const step = Math.sin(t * 3) * 6;
  line(x, W * 0.46, y + 10, W * 0.4, y + 28 + step);
  line(x, W * 0.58, y + 12, W * 0.64, y + 30 - step);
  line(x, W * 0.66, y + 8, W * 0.7, y + 26 + step);
  line(x, W * 0.74, y + 6, W * 0.8, y + 24 - step);
};

/** A crescent — the moon, not a whole disc. */
export const moon: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const cy = H * 0.5;
  const R = Math.min(W, H) * 0.28;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.1);
  glow(x, cx, cy, R * 1.6, p1(pal), 0.16 + pulse * 0.08);
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.arc(cx, cy, R, 0.6, -0.6, true);
  x.arc(cx + R * 0.42, cy, R * 0.78, -0.55, 0.55, false);
  x.fill();
};

/** A dark sky, a crescent, and a horizon — night, not a star chart. */
export const night: SceneFn = (x, W, H, t, pal) => {
  x.fillStyle = 'rgba(8,10,28,0.55)';
  rr(x, W * 0.08, H * 0.12, W * 0.84, H * 0.62, 16);
  x.fill();
  const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2));
  const stars: Array<[number, number]> = [
    [0.22, 0.28],
    [0.7, 0.24],
    [0.58, 0.4],
    [0.34, 0.48],
  ];
  for (const [sx, sy] of stars) {
    disc(x, W * sx, H * sy, 2.2, `rgba(255,255,255,${tw})`);
  }
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.arc(W * 0.72, H * 0.34, 16, 0.5, -0.5, true);
  x.arc(W * 0.78, H * 0.34, 13, -0.5, 0.5, false);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.45)`;
  x.lineWidth = 3;
  line(x, W * 0.1, H * 0.78, W * 0.9, H * 0.78);
};

/** A cloud letting rain fall — a cloud, not a puff of smoke. */
export const cloud: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const cy = H * 0.38;
  puff(x, cx, cy, 78, `rgba(${p1(pal)},0.9)`);
  glow(x, cx, cy, 30, p0(pal), 0.12);
  x.strokeStyle = `rgba(${p0(pal)},0.8)`;
  x.lineWidth = 2;
  x.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const drop = (t * 0.45 + i * 0.16) % 1;
    const px = cx - 50 + i * 18;
    const py = cy + 36 + drop * (H * 0.42);
    line(x, px, py, px - 2, py + 12);
  }
};

/** An egg, white around a yolk — white, not a blank page. */
export const white: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const cy = H * 0.52;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.2);
  glow(x, cx, cy, 80, '255,255,255', 0.16 + pulse * 0.08);
  x.fillStyle = 'rgba(255,255,255,0.96)';
  x.beginPath();
  x.ellipse(cx, cy, 74, 50, -0.15, 0, TAU);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 2;
  x.stroke();
  disc(x, cx + 6, cy + 2, 16, `rgba(${p1(pal)},0.95)`);
};

/** A house shaking on a cracked line — a quake, not a still building. */
export const quake: SceneFn = (x, W, H, t, pal) => {
  const j = Math.sin(t * 14) * 4;
  const ground = H * 0.78;
  x.strokeStyle = `rgba(${p0(pal)},0.85)`;
  x.lineWidth = 3;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(W * 0.08, ground);
  x.lineTo(W * 0.32, ground + j);
  x.lineTo(W * 0.48, ground - 8);
  x.lineTo(W * 0.62, ground + 6);
  x.lineTo(W * 0.92, ground + j * 0.4);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 2;
  line(x, W * 0.4, ground - 4, W * 0.36, ground + 18);
  const hx = W * 0.58 + j;
  x.fillStyle = `rgba(${p0(pal)},0.88)`;
  rr(x, hx, ground - 52, 48, 44, 3);
  x.fill();
  x.beginPath();
  x.moveTo(hx - 6, ground - 52);
  x.lineTo(hx + 24, ground - 74);
  x.lineTo(hx + 54, ground - 52);
  x.closePath();
  x.fill();
  glow(x, W * 0.42, ground, 16, p1(pal), 0.2);
};

/** A side-view ear with a sound arc — an ear, not a speaker. */
export const ear: SceneFn = (x, W, H, t, pal) => {
  const cx = W * 0.52;
  const cy = H * 0.5;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 8;
  x.lineCap = 'round';
  x.beginPath();
  x.arc(cx, cy, 52, 0.5, Math.PI * 1.7, false);
  x.stroke();
  x.lineWidth = 5;
  x.beginPath();
  x.arc(cx + 6, cy, 28, 0.7, Math.PI * 1.55, false);
  x.stroke();
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.beginPath();
  x.ellipse(cx + 10, cy + 4, 8, 16, 0.4, 0, TAU);
  x.fill();
  disc(x, cx + 18, cy + 18, 5, `rgba(${p0(pal)},0.95)`);
  x.strokeStyle = `rgba(${p1(pal)},${0.25 + pulse * 0.45})`;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx - 28, cy, 18 + pulse * 16, -0.8, 0.8);
  x.stroke();
  glow(x, cx, cy, 30, p0(pal), 0.12);
};

/** A tongue coming out of a mouth — the tongue, not a bite of food. */
export const tongue: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const cy = H * 0.42;
  const wave = Math.sin(t * 2.4) * 6;
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 7;
  x.lineCap = 'round';
  x.beginPath();
  x.arc(cx, cy, 46, Math.PI * 0.15, Math.PI * 0.85, true);
  x.stroke();
  x.beginPath();
  x.arc(cx, cy + 8, 46, Math.PI * 1.15, Math.PI * 1.85, true);
  x.stroke();
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.moveTo(cx - 22, cy + 10);
  x.quadraticCurveTo(cx - 18, cy + 58 + wave, cx, cy + 70 + wave);
  x.quadraticCurveTo(cx + 18, cy + 58 - wave, cx + 22, cy + 10);
  x.closePath();
  x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.45)';
  x.lineWidth = 2;
  line(x, cx, cy + 18, cx, cy + 58 + wave * 0.4);
  glow(x, cx, cy + 40, 18, p1(pal), 0.16);
};

/** A spoon carrying a drop to a small mouth — taste, not a bite. */
export const taste: SceneFn = (x, W, H, t, pal) => {
  const bob = Math.sin(t * 1.8) * 8;
  const sx = W * 0.34;
  const sy = H * 0.48 + bob;
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 4;
  x.lineCap = 'round';
  line(x, sx - 36, sy + 28, sx + 4, sy + 4);
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.ellipse(sx + 16, sy - 4, 22, 14, -0.4, 0, TAU);
  x.fill();
  disc(x, sx + 16, sy - 4, 5, 'rgba(255,255,255,0.7)');
  const mx = W * 0.72;
  const my = H * 0.52;
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 6;
  x.beginPath();
  x.arc(mx, my, 28, 0.2, Math.PI - 0.2);
  x.stroke();
  const sparks = [0, 1, 2];
  for (const i of sparks) {
    const a = t * 1.4 + i * 2.1;
    const px = mx - 20 + Math.cos(a) * (16 + i * 6);
    const py = my - 36 + Math.sin(a) * 8;
    disc(x, px, py, 4, `rgba(${i % 2 ? p1(pal) : p0(pal)},0.9)`);
  }
  glow(x, sx + 16, sy - 4, 16, p1(pal), 0.18);
};

/** A head with hair, face, and neck — a head, not a brain. */
export const head: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const nod = Math.sin(t * 1.2) * 4;
  const cy = H * 0.42 + nod;
  x.strokeStyle = `rgba(${p0(pal)},0.7)`;
  x.lineWidth = 8;
  x.lineCap = 'round';
  line(x, cx, cy + 48, cx, cy + 86);
  line(x, cx - 36, cy + 78, cx + 36, cy + 78);
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.arc(cx, cy, 46, Math.PI * 1.05, Math.PI * 1.95, false);
  x.fill();
  x.fillStyle = `rgba(${p0(pal)},0.92)`;
  x.beginPath();
  x.arc(cx, cy + 6, 40, 0, TAU);
  x.fill();
  disc(x, cx - 14, cy + 2, 4, 'rgba(20,16,28,0.85)');
  disc(x, cx + 14, cy + 2, 4, 'rgba(20,16,28,0.85)');
  x.strokeStyle = 'rgba(20,16,28,0.55)';
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx, cy + 14, 12, 0.2, Math.PI - 0.2);
  x.stroke();
  glow(x, cx, cy, 24, p1(pal), 0.12);
};

/** An arm bending at the elbow — an arm, not an open hand. */
export const arm: SceneFn = (x, W, H, t, pal) => {
  const bend = 0.4 + 0.35 * Math.sin(t * 1.6);
  const sx = W * 0.28;
  const sy = H * 0.72;
  const ex = W * 0.5;
  const ey = H * 0.38;
  const hx = ex + Math.cos(bend) * 78;
  const hy = ey + Math.sin(bend) * 70;
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 16;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(sx, sy);
  x.lineTo(ex, ey);
  x.lineTo(hx, hy);
  x.stroke();
  disc(x, ex, ey, 10, `rgba(${p1(pal)},0.95)`);
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.beginPath();
  x.ellipse(hx, hy, 14, 10, bend, 0, TAU);
  x.fill();
  glow(x, ex, ey, 18, p1(pal), 0.16);
};

/** One pointing finger — a finger, not a whole hand. */
export const finger: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const lift = Math.sin(t * 1.7) * 6;
  const top = H * 0.22 + lift;
  const base = H * 0.78;
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 3;
  line(x, W * 0.2, base, W * 0.8, base);
  x.fillStyle = `rgba(${p0(pal)},0.92)`;
  rr(x, cx - 14, top + 28, 28, base - top - 36, 14);
  x.fill();
  disc(x, cx, top + 22, 16, `rgba(${p1(pal)},0.95)`);
  x.strokeStyle = 'rgba(255,255,255,0.55)';
  x.lineWidth = 2;
  line(x, cx, top + 40, cx, base - 18);
  glow(x, cx, top + 22, 20, p1(pal), 0.2);
};

/** A torso with a swelling belly — the stomach, not the whole body. */
export const stomach: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const swell = 1 + 0.08 * Math.sin(t * 1.5);
  x.strokeStyle = `rgba(${p0(pal)},0.55)`;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(cx - 46, H * 0.22);
  x.quadraticCurveTo(cx - 70, H * 0.55, cx - 36, H * 0.84);
  x.lineTo(cx + 36, H * 0.84);
  x.quadraticCurveTo(cx + 70, H * 0.55, cx + 46, H * 0.22);
  x.stroke();
  x.fillStyle = `rgba(${p1(pal)},${0.35 + 0.15 * Math.sin(t * 1.5)})`;
  x.beginPath();
  x.ellipse(cx, H * 0.58, 28 * swell, 22 * swell, 0, 0, TAU);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 3;
  x.stroke();
  glow(x, cx, H * 0.58, 26, p1(pal), 0.2);
};

/** Two lungs breathing — lungs, not a gust of wind. */
export const lung: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const breath = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.6));
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 6;
  x.lineCap = 'round';
  line(x, cx, H * 0.16, cx, H * 0.42);
  x.fillStyle = `rgba(${p0(pal)},0.88)`;
  x.beginPath();
  x.ellipse(cx - 36 * breath, H * 0.58, 28 * breath, 48 * breath, -0.15, 0, TAU);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.beginPath();
  x.ellipse(cx + 36 * breath, H * 0.58, 28 * breath, 48 * breath, 0.15, 0, TAU);
  x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.35)';
  x.lineWidth = 2;
  line(x, cx, H * 0.4, cx - 20 * breath, H * 0.5);
  line(x, cx, H * 0.4, cx + 20 * breath, H * 0.5);
  glow(x, cx, H * 0.58, 36, p1(pal), 0.12);
};

/** One foot tapping — a foot, not a trail of steps. */
export const foot: SceneFn = (x, W, H, t, pal) => {
  const tap = Math.max(0, Math.sin(t * 3));
  const cx = W / 2;
  const gy = H * 0.72 - tap * 14;
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 3;
  line(x, W * 0.12, H * 0.78, W * 0.88, H * 0.78);
  x.save();
  x.translate(cx, gy);
  x.rotate(-0.15 - tap * 0.2);
  x.fillStyle = `rgba(${p0(pal)},0.92)`;
  x.beginPath();
  x.ellipse(8, 8, 46, 18, 0, 0, TAU);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.ellipse(-28, -2, 16, 20, -0.4, 0, TAU);
  x.fill();
  x.restore();
  glow(x, cx, H * 0.78, 16, p1(pal), 0.08 + tap * 0.12);
};

function groundLine(x: CanvasRenderingContext2D, W: number, H: number, pal: string[]): number {
  const ground = H * 0.82;
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 2;
  line(x, W * 0.08, ground, W * 0.92, ground);
  return ground;
}

/** A still house with a puff of chimney smoke — a house, not a quake. */
export const house: SceneFn = (x, W, H, t, pal) => {
  const ground = groundLine(x, W, H, pal);
  const hx = W * 0.3;
  const hy = ground - 78;
  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  rr(x, hx, hy, 92, 78, 4);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.moveTo(hx - 10, hy);
  x.lineTo(hx + 46, hy - 40);
  x.lineTo(hx + 102, hy);
  x.closePath();
  x.fill();
  x.fillStyle = `rgba(255,220,120,0.9)`;
  rr(x, hx + 16, hy + 18, 22, 18, 2);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.85)`;
  rr(x, hx + 54, hy + 36, 20, 42, 2);
  x.fill();
  const puffY = ((t * 18) % 50);
  puff(x, hx + 78, hy - 16 - puffY, 16, `rgba(${p1(pal)},${0.35 + (1 - puffY / 50) * 0.4})`);
  glow(x, hx + 27, hy + 27, 12, '255,220,120', 0.25);
};

/** Three figures, tall and small, holding hands — a family, not a crowd. */
export const family: SceneFn = (x, W, H, t, pal) => {
  const ground = groundLine(x, W, H, pal);
  const bob = Math.sin(t * 1.4) * 2;
  const spots = [W * 0.32, W * 0.5, W * 0.68];
  const scales = [1.05, 0.62, 0.95];
  x.strokeStyle = `rgba(${p1(pal)},0.85)`;
  x.lineWidth = 3;
  x.lineCap = 'round';
  line(x, spots[0]! + 8, ground - 36, spots[1]! - 6, ground - 22 + bob);
  line(x, spots[1]! + 6, ground - 22 + bob, spots[2]! - 8, ground - 34);
  spots.forEach((px, i) => {
    x.save();
    x.translate(px, ground);
    x.scale(scales[i] ?? 1, scales[i] ?? 1);
    person(x, 0, bob, i === 1 ? p1(pal) : p0(pal), t * 1.2 + i);
    x.restore();
  });
};

/** Two matching figures, one arm across — brothers, not a class. */
export const brother: SceneFn = (x, W, H, t, pal) => {
  const ground = groundLine(x, W, H, pal);
  const lean = Math.sin(t * 1.1) * 3;
  person(x, W * 0.4, ground, p0(pal), t);
  person(x, W * 0.6, ground, p1(pal), t + 0.4);
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 4;
  x.lineCap = 'round';
  line(x, W * 0.4 + 10, ground - 34, W * 0.6 - 8, ground - 40 + lean);
  glow(x, W * 0.5, ground - 36, 16, p1(pal), 0.15);
};

/** A stooped figure with a cane — old, not a standing column. */
export const old: SceneFn = (x, W, H, t, pal) => {
  const ground = groundLine(x, W, H, pal);
  const cx = W * 0.48;
  const sway = Math.sin(t * 0.7) * 2;
  x.save();
  x.translate(cx, ground - 20);
  x.rotate(0.35);
  person(x, sway, 20, p0(pal), t * 0.6);
  x.restore();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 3;
  x.lineCap = 'round';
  line(x, cx + 28, ground - 46, cx + 40, ground);
  disc(x, cx + 40, ground - 2, 3, `rgba(${p1(pal)},0.9)`);
};

/** A small figure with a high hop — young, not a stooped walk. */
export const young: SceneFn = (x, W, H, t, pal) => {
  const ground = groundLine(x, W, H, pal);
  const hop = Math.abs(Math.sin(t * 2.4)) * 28;
  x.save();
  x.translate(W * 0.5, ground);
  x.scale(0.72, 0.72);
  person(x, 0, -hop, p1(pal), t * 2);
  x.restore();
  if (hop < 4) glow(x, W * 0.5, ground, 18, p1(pal), 0.25);
};

/** Two figures facing, hands meeting — friends, not a gem in a fist. */
export const friend: SceneFn = (x, W, H, t, pal) => {
  const ground = groundLine(x, W, H, pal);
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
  person(x, W * 0.36, ground, p0(pal), t);
  person(x, W * 0.64, ground, p1(pal), t + 1);
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 3;
  line(x, W * 0.36 + 12, ground - 32, W * 0.5 - 6, ground - 36);
  line(x, W * 0.64 - 12, ground - 32, W * 0.5 + 6, ground - 36);
  disc(x, W * 0.5, ground - 36, 5 + pulse * 2, `rgba(${p1(pal)},0.95)`);
  glow(x, W * 0.5, ground - 36, 20, p1(pal), 0.12 + pulse * 0.12);
};

/** A small dove with an olive twig — peace, not a flapping bird. */
export const peace: SceneFn = (x, W, H, t, pal) => {
  const cx = W * 0.48;
  const cy = H * 0.48 + Math.sin(t * 0.8) * 4;
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.ellipse(cx, cy, 26, 12, -0.1, 0, TAU);
  x.fill();
  disc(x, cx + 24, cy - 2, 7, `rgba(${p0(pal)},0.95)`);
  line(x, cx + 30, cy - 1, cx + 42, cy + 1);
  x.strokeStyle = `rgba(${p0(pal)},0.85)`;
  x.lineWidth = 3;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx - 4, cy);
  x.quadraticCurveTo(cx - 28, cy - 10, cx - 46, cy - 4);
  x.stroke();
  x.beginPath();
  x.moveTo(cx - 4, cy);
  x.quadraticCurveTo(cx + 10, cy - 16, cx + 8, cy - 28);
  x.stroke();
  x.strokeStyle = `rgba(80,170,70,0.95)`;
  x.lineWidth = 2;
  line(x, cx - 8, cy + 8, cx - 22, cy + 22);
  disc(x, cx - 22, cy + 24, 3, 'rgba(80,170,70,0.95)');
  disc(x, cx - 16, cy + 16, 2.5, 'rgba(80,170,70,0.9)');
  glow(x, cx, cy, 22, p1(pal), 0.12);
};

/** A board and a moving pointer — teach, not a blank wall. */
export const teach: SceneFn = (x, W, H, t, pal) => {
  const bx = W * 0.22;
  const by = H * 0.22;
  const bw = W * 0.56;
  const bh = H * 0.46;
  x.fillStyle = `rgba(${p0(pal)},0.25)`;
  rr(x, bx, by, bw, bh, 6);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 3;
  rr(x, bx, by, bw, bh, 6);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.85)`;
  x.lineWidth = 2;
  for (let i = 0; i < 3; i++) line(x, bx + 16, by + 22 + i * 22, bx + bw - 28, by + 22 + i * 22);
  const slide = (t * 0.35) % 1;
  const px = bx + 20 + slide * (bw - 50);
  const py = by + bh - 8;
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 4;
  x.lineCap = 'round';
  line(x, px, py + 36, px + 8, py);
  disc(x, px + 8, py, 4, `rgba(${p1(pal)},0.95)`);
  glow(x, px + 8, py, 12, p1(pal), 0.2);
};

/** A house with a swinging bell — a school, not a plain home. */
export const school: SceneFn = (x, W, H, t, pal) => {
  const ground = groundLine(x, W, H, pal);
  const hx = W * 0.28;
  const hy = ground - 70;
  x.fillStyle = `rgba(${p0(pal)},0.88)`;
  rr(x, hx, hy, 100, 70, 3);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.moveTo(hx - 8, hy);
  x.lineTo(hx + 50, hy - 34);
  x.lineTo(hx + 108, hy);
  x.closePath();
  x.fill();
  rr(x, hx + 58, hy - 62, 22, 30, 2);
  x.fill();
  const swing = Math.sin(t * 2.2) * 0.45;
  x.save();
  x.translate(hx + 69, hy - 58);
  x.rotate(swing);
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 2;
  line(x, 0, 0, 0, 16);
  disc(x, 0, 22, 7, `rgba(${p1(pal)},0.95)`);
  x.restore();
  x.fillStyle = `rgba(${p1(pal)},0.8)`;
  rr(x, hx + 40, hy + 32, 18, 38, 2);
  x.fill();
  glow(x, hx + 69, hy - 30, 14, p1(pal), 0.15);
};

/** A road narrowing to the horizon, dashes moving — a road, not an arrow. */
export const road: SceneFn = (x, W, H, t, pal) => {
  const y0 = H * 0.9;
  const y1 = H * 0.28;
  x.fillStyle = `rgba(${p0(pal)},0.35)`;
  x.beginPath();
  x.moveTo(W * 0.08, y0);
  x.lineTo(W * 0.46, y1);
  x.lineTo(W * 0.54, y1);
  x.lineTo(W * 0.92, y0);
  x.closePath();
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 3;
  x.lineCap = 'round';
  const shift = (t * 0.4) % 1;
  for (let i = 0; i < 5; i++) {
    const p = (i / 5 + shift) % 1;
    const y = y0 - p * (y0 - y1);
    const half = 6 * (1 - p);
    line(x, W * 0.5 - half, y, W * 0.5 + half, y - 10 * (1 - p));
  }
  glow(x, W * 0.5, y1, 16, p1(pal), 0.2);
};

/** A span with a marker that settles in the center — middle, not two ends. */
export const middle: SceneFn = (x, W, H, t, pal) => {
  const y = H * 0.55;
  const x0 = W * 0.16;
  const x1 = W * 0.84;
  x.strokeStyle = `rgba(${p0(pal)},0.8)`;
  x.lineWidth = 4;
  x.lineCap = 'round';
  line(x, x0, y, x1, y);
  disc(x, x0, y, 7, `rgba(${p0(pal)},0.9)`);
  disc(x, x1, y, 7, `rgba(${p0(pal)},0.9)`);
  const cycle = (t * 0.25) % 1;
  const travel = cycle < 0.7 ? cycle / 0.7 : 1;
  const mx = x0 + (x1 - x0) * (0.15 + travel * 0.35);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2);
  glow(x, (x0 + x1) / 2, y, 22, p1(pal), 0.12);
  disc(x, mx, y, 9 + pulse * 2, `rgba(${p1(pal)},0.95)`);
  x.fillStyle = `rgba(${p1(pal)},0.9)`;
  x.font = '700 13px ui-rounded, system-ui, sans-serif';
  x.textAlign = 'center';
  x.fillText('mid', (x0 + x1) / 2, y - 28);
};

/** An upright figure and a steady pulse — healthy, not a still column. */
export const healthy: SceneFn = (x, W, H, t, pal) => {
  const ground = groundLine(x, W, H, pal);
  person(x, W * 0.42, ground, p0(pal), t * 1.3);
  const pulse = (t * 0.7) % 1;
  x.strokeStyle = `rgba(${p1(pal)},${1 - pulse})`;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(W * 0.42, ground - 36, 16 + pulse * 28, 0, TAU);
  x.stroke();
  const ax = W * 0.68;
  const ay = H * 0.48;
  x.fillStyle = 'rgba(220,60,50,0.92)';
  x.beginPath();
  x.arc(ax, ay + 6, 14, 0, TAU);
  x.fill();
  x.beginPath();
  x.arc(ax - 8, ay - 2, 8, 0, TAU);
  x.arc(ax + 8, ay - 2, 8, 0, TAU);
  x.fill();
  x.strokeStyle = 'rgba(90,140,40,0.95)';
  x.lineWidth = 3;
  line(x, ax, ay - 8, ax, ay - 22);
  glow(x, ax, ay, 16, '220,60,50', 0.15);
};

/* Meaning-true scenes — used where a generic motion/scale/gear/breakx fought the root. */

import { TAU, cloud, disc, glow, leaf, line, p0, p1, rr, type SceneFn } from './sceneUtil';

const LAND = '72,168,110';

/** Classical column on a plinth — it stands, it does not spin. */
export const stand: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const groundY = H * 0.84;
  const colW = Math.min(W * 0.14, 52);
  const colTop = H * 0.28;
  const breathe = 0.5 + 0.5 * Math.sin(t * 0.7);

  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  line(x, W * 0.08, groundY, W * 0.92, groundY);

  glow(x, cx, (colTop + groundY) / 2, colW * 2.2, p0(pal), 0.08 + breathe * 0.06);

  const g = x.createLinearGradient(cx - colW / 2, 0, cx + colW / 2, 0);
  g.addColorStop(0, `rgba(${p0(pal)},0.45)`);
  g.addColorStop(0.45, `rgba(${p1(pal)},0.95)`);
  g.addColorStop(1, `rgba(${p0(pal)},0.45)`);
  x.fillStyle = g;
  rr(x, cx - colW / 2, colTop, colW, groundY - colTop - 8, 4);
  x.fill();
  // Fluting.
  x.strokeStyle = `rgba(10,10,26,0.35)`;
  x.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    line(x, cx + i * colW * 0.16, colTop + 8, cx + i * colW * 0.16, groundY - 16);
  }
  x.fillStyle = `rgba(${p1(pal)},0.92)`;
  rr(x, cx - colW * 0.95, colTop - 16, colW * 1.9, 16, 3);
  x.fill();
  rr(x, cx - colW * 1.05, groundY - 12, colW * 2.1, 14, 3);
  x.fill();
  rr(x, cx - colW * 1.2, groundY + 2, colW * 2.4, 10, 3);
  x.fill();
};

/** A hand gripping a gem — hold, not scatter. */
export const hold: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
  const grip = 0.92 + pulse * 0.06;

  // Palm.
  x.fillStyle = `rgba(${p0(pal)},0.55)`;
  x.beginPath();
  x.ellipse(cx, cy + 18, 36 * grip, 28, 0, 0, TAU);
  x.fill();
  // Fingers wrapping the gem.
  for (let i = 0; i < 4; i++) {
    const fx = cx - 24 + i * 16;
    x.fillStyle = `rgba(${p0(pal)},0.7)`;
    x.beginPath();
    x.ellipse(fx, cy - 6 * grip, 7, 22 * grip, 0.1 * (i - 1.5), 0, TAU);
    x.fill();
    x.strokeStyle = `rgba(${p0(pal)},0.9)`;
    x.lineWidth = 1.2;
    x.stroke();
  }
  // Thumb.
  x.fillStyle = `rgba(${p0(pal)},0.75)`;
  x.beginPath();
  x.ellipse(cx - 38, cy + 8, 9, 18, -0.7, 0, TAU);
  x.fill();

  glow(x, cx, cy, 28, p1(pal), 0.3 + pulse * 0.15);
  disc(x, cx, cy, 12 + pulse * 2, `rgba(${p1(pal)},0.95)`);
  disc(x, cx - 3, cy - 3, 3, 'rgba(255,255,255,0.8)');
};

/** Fingertip meets a surface; ripples spread from the contact (touch). */
export const touch: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const surfaceY = H * 0.64;
  const cycle = 2.6;
  const ph = (t % cycle) / cycle;
  const down = ph < 0.42 ? ph / 0.42 : 1 - (ph - 0.42) / 0.58;
  const pressed = Math.max(0, Math.min(1, down));
  const tipY = surfaceY - 50 * (1 - pressed) - 7;
  const contact = ph >= 0.38 && ph < 0.5;
  const dent = contact ? 5 : pressed > 0.9 ? 3 : 0;

  x.strokeStyle = `rgba(${p0(pal)},0.45)`;
  x.lineWidth = 2.4;
  x.beginPath();
  x.moveTo(W * 0.08, surfaceY);
  x.quadraticCurveTo(cx, surfaceY + dent, W * 0.92, surfaceY);
  x.stroke();

  x.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const age = ph - 0.4 - k * 0.07;
    if (age > 0 && age < 0.55) {
      const rad = age * Math.min(W, H) * 1.05;
      x.strokeStyle = `rgba(${p1(pal)},${(1 - age / 0.55) * 0.55})`;
      x.lineWidth = 2.4;
      x.beginPath();
      x.ellipse(cx, surfaceY, rad, rad * 0.32, 0, 0, TAU);
      x.stroke();
    }
  }
  if (contact) glow(x, cx, surfaceY, 44, p1(pal), 0.55);

  // Finger with a knuckle so it's a fingertip, not a blob.
  x.globalCompositeOperation = 'source-over';
  const fg = x.createLinearGradient(cx, tipY - 48, cx, tipY);
  fg.addColorStop(0, `rgba(${p0(pal)},0)`);
  fg.addColorStop(1, `rgba(${p0(pal)},0.9)`);
  x.fillStyle = fg;
  x.beginPath();
  x.ellipse(cx, tipY - 18, 9, 26, 0, 0, TAU);
  x.fill();
  disc(x, cx, tipY, 8, `rgba(${p0(pal)},0.95)`);
  x.strokeStyle = `rgba(${p1(pal)},0.35)`;
  x.lineWidth = 1;
  x.beginPath();
  x.arc(cx, tipY + 1, 4, 0.2, Math.PI - 0.2);
  x.stroke();
};

/** Hot-air balloon rising (lift) — motion is UP. */
export const lift: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const p = (t * 0.22) % 1;
  const ease = p < 0.75 ? Math.pow(p / 0.75, 0.7) : 1 - (p - 0.75) / 0.25;
  const y = H * 0.7 - ease * H * 0.42;

  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const lx = cx + (i - 2) * 14;
    const lp = (t * 0.6 + i * 0.16) % 1;
    x.strokeStyle = `rgba(${p1(pal)},${Math.sin(lp * Math.PI) * 0.45})`;
    x.lineWidth = 2;
    line(x, lx, y + 58 + lp * 28, lx, y + 48 + lp * 28);
  }
  x.globalCompositeOperation = 'source-over';

  glow(x, cx, y, 40, p0(pal), 0.3);
  x.fillStyle = `rgba(${p0(pal)},0.85)`;
  x.beginPath();
  x.ellipse(cx, y, 26, 32, 0, 0, TAU);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.7)`;
  x.lineWidth = 1.3;
  line(x, cx, y - 32, cx, y + 32);
  line(x, cx - 18, y - 10, cx + 18, y - 10);
  x.strokeStyle = `rgba(${p1(pal)},0.8)`;
  line(x, cx - 12, y + 28, cx - 10, y + 44);
  line(x, cx + 12, y + 28, cx + 10, y + 44);
  x.fillStyle = `rgba(${p1(pal)},0.8)`;
  rr(x, cx - 12, y + 44, 24, 12, 3);
  x.fill();
};

/** Wind, clouds, and a tumbling leaf (air). */
export const air: SceneFn = (x, W, H, t, pal) => {
  cloud(x, W * 0.22, H * 0.22, 28, `rgba(${p1(pal)},0.28)`);
  cloud(x, W * 0.7, H * 0.18, 22, `rgba(${p0(pal)},0.22)`);
  x.lineCap = 'round';
  for (let r = 0; r < 4; r++) {
    const y = H * (0.4 + r * 0.12);
    const col = r % 2 ? p1(pal) : p0(pal);
    x.strokeStyle = `rgba(${col},${0.28 + r * 0.06})`;
    x.lineWidth = 2;
    x.beginPath();
    for (let i = 0; i <= W; i += 8) {
      const yy = y + Math.sin(i * 0.02 + t * 1.5 + r) * 8 + Math.sin(i * 0.05 - t * 0.9) * 4;
      if (i) x.lineTo(i, yy);
      else x.moveTo(i, yy);
    }
    x.stroke();
  }
  const lp = (t * 0.22) % 1;
  leaf(
    x,
    lp * W,
    H * 0.48 + Math.sin(t * 1.6) * H * 0.16,
    t * 1.8,
    14,
    `rgba(${LAND},0.85)`,
    `rgba(${p0(pal)},0.7)`,
  );
};

/** A bird with beating wings (wing). */
export const wing: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.48;
  const beat = Math.sin(t * 3.2);
  const flap = beat * 0.55;
  glow(x, cx, cy, 24, p1(pal), 0.2);

  function oneWing(dir: number, col: string): void {
    x.save();
    x.translate(cx, cy);
    x.rotate(dir * (0.12 + flap));
    x.fillStyle = `rgba(${col},0.35)`;
    x.beginPath();
    x.moveTo(0, 0);
    x.quadraticCurveTo(dir * 90, -48, dir * 138, -6);
    x.quadraticCurveTo(dir * 90, 26, 0, 8);
    x.closePath();
    x.fill();
    x.strokeStyle = `rgba(${col},0.8)`;
    x.lineWidth = 1.6;
    x.stroke();
    for (let i = 0; i < 5; i++) {
      const f = (i + 1) / 6;
      x.beginPath();
      x.moveTo(dir * 10, 2);
      x.quadraticCurveTo(dir * (40 + f * 50), -18 + i * 8, dir * (80 + f * 48), -2 + i * 5);
      x.stroke();
    }
    x.restore();
  }
  oneWing(-1, p0(pal));
  oneWing(1, p1(pal));
  // Body + beak so it's a bird, not two kites.
  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  x.beginPath();
  x.ellipse(cx, cy + 4, 10, 14, 0, 0, TAU);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.moveTo(cx + 8, cy);
  x.lineTo(cx + 22, cy + 4);
  x.lineTo(cx + 8, cy + 8);
  x.closePath();
  x.fill();
  disc(x, cx - 2, cy - 2, 2, 'rgba(20,20,30,0.9)');
};

/** A door in a frame that closes, flashes, reopens (shut). */
export const shut: SceneFn = (x, W, H, t, pal) => {
  const cy = H / 2,
    doorH = Math.min(H * 0.7, 230),
    doorW = Math.min(W * 0.26, 110);
  const cycle = 3.2;
  const ph = (t % cycle) / cycle;
  let gap: number;
  if (ph < 0.45) gap = 1 - ph / 0.45;
  else if (ph < 0.55) gap = 0;
  else gap = (ph - 0.55) / 0.45;
  const inset = gap * doorW * 0.85;
  const leftX = W / 2 - doorW - inset / 2;
  const rightX = W / 2 + inset / 2;
  const top = cy - doorH / 2;

  x.strokeStyle = `rgba(${p1(pal)},0.4)`;
  x.lineWidth = 6;
  rr(x, leftX - 8, top - 8, doorW * 2 + inset + 16, doorH + 16, 6);
  x.stroke();

  x.fillStyle = `rgba(${p0(pal)},0.32)`;
  rr(x, leftX, top, doorW, doorH, 4);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.32)`;
  rr(x, rightX, top, doorW, doorH, 4);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.75)`;
  x.lineWidth = 2;
  rr(x, leftX, top, doorW, doorH, 4);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.75)`;
  rr(x, rightX, top, doorW, doorH, 4);
  x.stroke();
  disc(x, leftX + doorW - 12, cy, 4, `rgba(${p0(pal)},0.95)`);
  disc(x, rightX + 12, cy, 4, `rgba(${p1(pal)},0.95)`);
  if (gap < 0.08) glow(x, W / 2, cy, 36, '255,255,255', 0.45 - gap * 4);
};

/** A chunky circular arrow that keeps going around (again). */
export const loop: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.3;
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 10;
  x.lineCap = 'round';
  x.beginPath();
  x.arc(cx, cy, R, 0.4, TAU - 0.4);
  x.stroke();
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 6;
  x.beginPath();
  x.arc(cx, cy, R, 0.4, TAU - 0.4);
  x.stroke();
  const ah = t * 1.4;
  const ax = cx + Math.cos(ah) * R,
    ay = cy + Math.sin(ah) * R;
  const tx = -Math.sin(ah),
    ty = Math.cos(ah);
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.moveTo(ax + tx * 16, ay + ty * 16);
  x.lineTo(ax - tx * 10 + Math.cos(ah) * 12, ay - ty * 10 + Math.sin(ah) * 12);
  x.lineTo(ax - tx * 10 - Math.cos(ah) * 12, ay - ty * 10 - Math.sin(ah) * 12);
  x.fill();
  glow(x, ax, ay, 14, p1(pal), 0.55);
};

/** A wavy path that snaps onto a ruler (straight / correct). */
export const straight: SceneFn = (x, W, H, t, pal) => {
  const y = H * 0.5,
    x0 = W * 0.08,
    x1 = W * 0.92;
  const cycle = 2.4;
  const ph = (t % cycle) / cycle;
  const corr = ph < 0.55 ? ph / 0.55 : 1;
  x.strokeStyle = `rgba(${p1(pal)},0.35)`;
  x.lineWidth = 8;
  line(x, x0, y, x1, y);
  x.strokeStyle = `rgba(${p1(pal)},0.7)`;
  x.lineWidth = 1.4;
  for (let i = 0; i <= 12; i++) {
    const tx = x0 + ((x1 - x0) * i) / 12;
    line(x, tx, y - (i % 3 === 0 ? 10 : 6), tx, y + (i % 3 === 0 ? 10 : 6));
  }
  x.lineCap = 'round';
  x.beginPath();
  for (let i = 0; i <= 80; i++) {
    const f = i / 80;
    const px = x0 + (x1 - x0) * f;
    const wave = Math.sin(f * 10) * H * 0.16 * (1 - corr);
    if (i) x.lineTo(px, y + wave);
    else x.moveTo(px, y + wave);
  }
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 3.2;
  x.stroke();
  glow(x, x0 + (x1 - x0) * corr, y, 14, p1(pal), 0.5);
};

/** Crane stacking bricks into a wall (build). */
export const build: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const ground = H * 0.84;
  const bw = Math.min(W * 0.16, 48);
  const bh = Math.min(H * 0.09, 22);
  const n = 5;
  const p = (t * 0.32) % (n + 1.4);

  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  line(x, W * 0.12, ground, W * 0.88, ground);

  // Crane mast + arm.
  const mastX = W * 0.18;
  x.strokeStyle = `rgba(${p1(pal)},0.75)`;
  x.lineWidth = 3;
  line(x, mastX, ground, mastX, H * 0.16);
  line(x, mastX, H * 0.16, W * 0.78, H * 0.16);
  const lifting = Math.min(n - 0.01, p);
  const hookX = cx;
  const hookY = ground - Math.min(lifting, n) * bh - 18;
  x.lineWidth = 1.4;
  line(x, hookX, H * 0.16, hookX, hookY);
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.beginPath();
  x.arc(hookX, hookY, 6, 0.2, Math.PI - 0.2);
  x.stroke();

  for (let i = 0; i < n; i++) {
    const appear = Math.max(0, Math.min(1, p - i));
    if (appear <= 0) continue;
    const row = i;
    const w = bw * (1.15 - (row % 2) * 0.08);
    const bx = cx - w / 2 + (row % 2 === 0 ? -6 : 6);
    const by = ground - (row + 1) * bh * appear;
    x.fillStyle = `rgba(${row % 2 ? p1(pal) : p0(pal)},${0.4 + appear * 0.45})`;
    rr(x, bx, by, w, bh - 2, 3);
    x.fill();
    x.strokeStyle = `rgba(${row % 2 ? p1(pal) : p0(pal)},0.9)`;
    x.lineWidth = 1.4;
    x.stroke();
  }
};

/** A wheel with a tire and hub (circle). */
export const circle: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.32;
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 12;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.5)`;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx, cy, R * 0.78, 0, TAU);
  x.stroke();
  x.save();
  x.translate(cx, cy);
  x.rotate(t * 0.9);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    x.strokeStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},0.7)`;
    x.lineWidth = 3;
    line(x, Math.cos(a) * 8, Math.sin(a) * 8, Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78);
  }
  x.restore();
  disc(x, cx, cy, 12, `rgba(${p1(pal)},0.95)`);
  disc(x, cx, cy, 5, 'rgba(10,10,26,0.9)');
};

/** A whole circle with exactly the left half filled — unmistakably 50%. */
export const half: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.36;
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.15);
  // Wipe 0→1 then hold at half. Offset so t=0 (reduced motion) is already 50%.
  const u = (t * 0.32 + 0.72) % 1;
  const s = u < 0.28 ? u / 0.28 : 1;
  const cover = s * s * (3 - 2 * s);

  x.save();
  x.lineCap = 'round';
  glow(x, cx, cy, R * 1.45, p0(pal), 0.12 + breathe * 0.06);

  // Full disc — pale so the empty half is a surface, not a hole.
  x.fillStyle = 'rgba(214, 228, 255, 0.22)';
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.fill();

  // Hatch the empty right half (worksheet "unshaded" cue).
  x.save();
  x.beginPath();
  x.arc(cx, cy, R - 1, -Math.PI / 2, Math.PI / 2, false);
  x.closePath();
  x.clip();
  x.strokeStyle = `rgba(${p1(pal)},0.42)`;
  x.lineWidth = 1.6;
  for (let i = -R * 2; i <= R * 2; i += 9) {
    line(x, cx, cy - R + i, cx + R, cy - R + i + R);
  }
  x.restore();

  // Solid fill wipes from the left rim and STOPS at the midline.
  x.save();
  x.beginPath();
  x.arc(cx, cy, R - 1, Math.PI / 2, -Math.PI / 2, false);
  x.closePath();
  x.clip();
  const fill = x.createLinearGradient(cx - R, cy, cx, cy);
  fill.addColorStop(0, `rgba(${p0(pal)},0.98)`);
  fill.addColorStop(1, `rgba(${p1(pal)},0.92)`);
  x.fillStyle = fill;
  x.fillRect(cx - R, cy - R, Math.max(0, cover) * R, R * 2);
  x.restore();

  // Diameter cut.
  x.strokeStyle = `rgba(255,255,255,${0.7 + breathe * 0.2})`;
  x.lineWidth = 3;
  line(x, cx, cy - R + 1, cx, cy + R - 1);

  // Rim of the whole.
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 4;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.stroke();
  x.restore();
};

/** A balance scale with matching weights (equal). */
export const equal: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.36,
    arm = Math.min(W * 0.32, 120);
  const wobble = Math.sin(t * 1.4) * 0.04;
  x.save();
  x.translate(cx, cy);
  x.rotate(wobble);
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 3.5;
  line(x, -arm, 0, arm, 0);
  function pan(px: number, col: string): void {
    x.strokeStyle = `rgba(${col},0.75)`;
    x.lineWidth = 1.6;
    line(x, px, 0, px, 26);
    x.beginPath();
    x.moveTo(px - 22, 26);
    x.lineTo(px + 22, 26);
    x.lineTo(px + 14, 42);
    x.lineTo(px - 14, 42);
    x.closePath();
    x.fillStyle = `rgba(${col},0.35)`;
    x.fill();
    x.stroke();
    disc(x, px, 34, 7, `rgba(${col},0.95)`);
  }
  pan(-arm, p0(pal));
  pan(arm, p1(pal));
  x.restore();
  x.fillStyle = `rgba(${p1(pal)},0.85)`;
  x.beginPath();
  x.moveTo(cx, cy);
  x.lineTo(cx - 16, cy + 48);
  x.lineTo(cx + 16, cy + 48);
  x.closePath();
  x.fill();
};

function tokens(n: number, scatter = false): SceneFn {
  return (x, W, H, t, pal) => {
    const cx = W / 2,
      cy = H / 2 + Math.sin(t * 1.3) * 3;
    if (n === 1) {
      glow(x, cx, cy, 50, p0(pal), 0.25);
      disc(x, cx, cy, 28, `rgba(${p0(pal)},0.9)`);
      disc(x, cx - 8, cy - 8, 6, 'rgba(255,255,255,0.75)');
      return;
    }
    const items = scatter ? 12 : n;
    const R = Math.min(W, H) * (n === 2 ? 0.22 : 0.28);
    for (let i = 0; i < items; i++) {
      let px: number, py: number;
      if (n === 2) {
        px = cx + (i === 0 ? -R : R);
        py = cy;
      } else if (n === 3) {
        const a = -Math.PI / 2 + (i / 3) * TAU;
        px = cx + Math.cos(a) * R;
        py = cy + Math.sin(a) * R * 0.9;
      } else {
        px = cx + Math.cos(i * 2.4 + t * 0.1) * R * (0.4 + (i % 5) * 0.12);
        py = cy + Math.sin(i * 1.7 + t * 0.1) * R * (0.4 + (i % 4) * 0.12);
      }
      const col = i % 2 ? p1(pal) : p0(pal);
      const s = scatter ? 8 : 16;
      disc(x, px, py, s, `rgba(${col},0.9)`);
      disc(x, px - s * 0.3, py - s * 0.3, s * 0.25, 'rgba(255,255,255,0.55)');
    }
  };
}

export const one = tokens(1);
export const two = tokens(2);
export const three = tokens(3);
export const many = tokens(12, true);

/** Horseshoe magnet pulling nails (pull). */
export const pull: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.42;
  x.lineCap = 'round';
  x.strokeStyle = `rgba(${p0(pal)},0.95)`;
  x.lineWidth = 18;
  x.beginPath();
  x.arc(cx, cy, 42, 0.35, Math.PI - 0.35);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.95)`;
  x.lineWidth = 18;
  x.beginPath();
  x.arc(cx, cy, 42, Math.PI + 0.35, TAU - 0.35);
  x.stroke();
  x.fillStyle = `rgba(${p0(pal)},0.95)`;
  x.fillRect(cx - 50, cy + 28, 18, 22);
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.fillRect(cx + 32, cy + 28, 18, 22);
  x.fillStyle = 'rgba(245,245,250,0.85)';
  x.font = '700 11px ui-rounded, system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('N', cx - 41, cy + 40);
  x.fillText('S', cx + 41, cy + 40);

  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const d = 1 - ((t * 0.4 + i * 0.17) % 1);
    const a = 0.5 + (i / 10) * 2.2;
    const r = 30 + d * Math.min(W, H) * 0.38;
    const px = cx + Math.cos(a) * r,
      py = cy + 36 + Math.sin(a) * r * 0.45;
    x.fillStyle = `rgba(${p1(pal)},${0.4 + (1 - d) * 0.5})`;
    x.save();
    x.translate(px, py);
    x.rotate(a);
    x.fillRect(-2, -8, 4, 16);
    x.restore();
  }
  x.globalCompositeOperation = 'source-over';
};

/** A hook, a rope, a hanging weight (hang). */
export const hang: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    top = H * 0.14,
    len = Math.min(H * 0.5, 180);
  const ang = Math.sin(t * 1.35) * 0.5;
  const bx = cx + Math.sin(ang) * len;
  const by = top + Math.cos(ang) * len;
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 3;
  line(x, W * 0.2, top, W * 0.8, top);
  // Ceiling hook.
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 3;
  x.beginPath();
  x.arc(cx, top + 8, 8, Math.PI, 0);
  x.stroke();
  line(x, cx, top + 16, bx, by - 12);
  x.beginPath();
  x.arc(bx, by - 4, 8, 0.3, Math.PI - 0.2);
  x.stroke();
  glow(x, bx, by + 10, 24, p0(pal), 0.4);
  disc(x, bx, by + 12, 16, `rgba(${p0(pal)},0.92)`);
};

/** A sapling with veined leaves (nature). */
export const nature: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    ground = H * 0.86;
  const grow = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.6));
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  line(x, W * 0.16, ground, W * 0.84, ground);
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 4;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx, ground);
  x.quadraticCurveTo(cx + 8, ground - 80 * grow, cx, ground - 150 * grow);
  x.stroke();
  for (let i = 0; i < 6; i++) {
    const f = (i + 1) / 7;
    const ly = ground - f * 140 * grow;
    const dir = i % 2 === 0 ? -1 : 1;
    const open = 0.55 + 0.45 * Math.sin(t * 1.1 + i);
    leaf(
      x,
      cx + dir * 8,
      ly,
      dir * (0.9 - open * 0.3),
      16 + open * 6,
      `rgba(${i % 2 ? p1(pal) : LAND},0.8)`,
      `rgba(${p0(pal)},0.6)`,
    );
  }
  glow(x, cx, ground - 150 * grow, 12, p1(pal), 0.45);
};

/** Circle → square → triangle, holding each shape long enough to read (shape). */
export const morph: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.28;
  const phase = (t * 0.28) % 3;
  const i0 = Math.floor(phase);
  const frac = phase - i0;
  const blend = frac < 0.72 ? 0 : (frac - 0.72) / 0.28;

  function rad(kind: number, a: number): number {
    if (kind === 0) return R;
    if (kind === 1) return R / Math.max(0.42, Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)));
    const spikes = 3;
    const k = (a + Math.PI / 2) / (TAU / spikes);
    const f = Math.abs(k - Math.round(k));
    return R * (0.52 + 0.48 * (1 - Math.min(1, f * 2.4)));
  }

  x.beginPath();
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU - Math.PI / 2;
    const r = rad(i0, a) * (1 - blend) + rad((i0 + 1) % 3, a) * blend;
    const px = cx + Math.cos(a) * r,
      py = cy + Math.sin(a) * r;
    if (i) x.lineTo(px, py);
    else x.moveTo(px, py);
  }
  x.closePath();
  x.fillStyle = `rgba(${p0(pal)},0.22)`;
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 3;
  x.stroke();
};

/** Shoe-prints walking a path (foot / step). */
export const step: SceneFn = (x, W, H, t, pal) => {
  x.strokeStyle = `rgba(${p0(pal)},0.25)`;
  x.lineWidth = 18;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(W * 0.05, H * 0.55);
  x.quadraticCurveTo(W * 0.5, H * 0.42, W * 0.95, H * 0.58);
  x.stroke();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const p = (t * 0.22 + i / n) % 1;
    const px = p * W;
    const py = H * 0.52 + Math.sin(p * Math.PI) * -8 + (i % 2 === 0 ? -14 : 14);
    const a = Math.sin(p * Math.PI);
    x.save();
    x.translate(px, py);
    x.rotate(-0.35 + (i % 2) * 0.7);
    x.fillStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},${a * 0.8})`;
    x.beginPath();
    x.ellipse(0, 4, 7, 13, 0, 0, TAU);
    x.fill();
    x.beginPath();
    x.ellipse(0, -12, 6, 6, 0, 0, TAU);
    x.fill();
    x.restore();
  }
};

/** Rain falling from a cloud onto the ground (down). */
export const fall: SceneFn = (x, W, H, t, pal) => {
  cloud(x, W * 0.5, H * 0.2, 36, `rgba(${p1(pal)},0.4)`);
  cloud(x, W * 0.36, H * 0.22, 22, `rgba(${p0(pal)},0.35)`);
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  line(x, W * 0.1, H * 0.86, W * 0.9, H * 0.86);
  for (let i = 0; i < 22; i++) {
    const d = (t * 0.45 + i * 0.137) % 1;
    const px = W * (0.18 + (i * 0.13) % 0.64);
    const py = H * 0.32 + d * H * 0.52;
    const col = i % 2 ? p1(pal) : p0(pal);
    x.strokeStyle = `rgba(${col},0.75)`;
    x.lineWidth = 1.8;
    x.lineCap = 'round';
    line(x, px, py, px + 2, py + 12);
  }
};

/** A map pin dropping onto a marked spot (place). */
export const place: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    sockY = H * 0.72,
    p = (t * 0.32) % 1;
  const drop = p < 0.7 ? Math.pow(p / 0.7, 1.4) : 1;
  const y = H * 0.16 + drop * (sockY - H * 0.16 - 28);
  const seated = p > 0.7;

  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 1.5;
  x.setLineDash([4, 6]);
  line(x, W * 0.12, sockY, W * 0.88, sockY);
  line(x, cx, H * 0.2, cx, H * 0.88);
  x.setLineDash([]);
  x.strokeStyle = `rgba(${p1(pal)},0.7)`;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx, sockY, 16, 0, TAU);
  x.stroke();
  disc(x, cx, sockY, 4, `rgba(${p1(pal)},0.9)`);

  // Teardrop pin.
  x.fillStyle = `rgba(${p0(pal)},0.9)`;
  x.beginPath();
  x.arc(cx, y, 14, Math.PI * 0.85, Math.PI * 2.15);
  x.lineTo(cx, y + 28);
  x.closePath();
  x.fill();
  disc(x, cx, y, 6, 'rgba(255,255,255,0.9)');
  if (seated) glow(x, cx, sockY, 28, p1(pal), 0.4);
};

/** A padlock whose shackle lifts open (loosen / free). */
export const loosen: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.58;
  const open = 0.5 + 0.5 * Math.sin(t * 1.1);
  const liftY = open * 22;
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 7;
  x.lineCap = 'round';
  x.beginPath();
  x.arc(cx, cy - 28 - liftY, 22, Math.PI, 0);
  x.stroke();
  line(x, cx - 22, cy - 28 - liftY, cx - 22, cy - 8);
  line(x, cx + 22, cy - 28 - liftY, cx + 22, cy - 8 - (1 - open) * 10);
  x.fillStyle = `rgba(${p1(pal)},0.4)`;
  rr(x, cx - 36, cy - 8, 72, 58, 10);
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.9)`;
  x.lineWidth = 2.4;
  rr(x, cx - 36, cy - 8, 72, 58, 10);
  x.stroke();
  disc(x, cx, cy + 14, 6, `rgba(${p0(pal)},0.95)`);
  line(x, cx, cy + 18, cx, cy + 32);
};

/** Two rope strands wringing around an axis (twist). */
export const twist: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    top = H * 0.1,
    span = H * 0.8,
    N = 40,
    amp = Math.min(W * 0.18, 64);
  disc(x, cx, top, 8, `rgba(${p1(pal)},0.9)`);
  disc(x, cx, top + span, 8, `rgba(${p1(pal)},0.9)`);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  for (const phase of [0, Math.PI]) {
    const col = phase === 0 ? p0(pal) : p1(pal);
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const y = top + f * span;
      const ph = f * 5 * TAU + t * 1.5 + phase;
      const xx = cx + Math.sin(ph) * amp * (0.45 + 0.55 * Math.sin(f * Math.PI));
      if (i) x.lineTo(xx, y);
      else x.moveTo(xx, y);
    }
    x.strokeStyle = `rgba(${col},0.85)`;
    x.lineWidth = 5;
    x.stroke();
  }
};

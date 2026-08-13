/* Meaning-true scenes — used where a generic motion/scale/gear/breakx fought the root. */

import { TAU, disc, glow, p0, p1, rr, type SceneFn } from './sceneUtil';

/** Firm standing column; motes settle. Opposite of spinning gears. */
export const stand: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const groundY = H * 0.82;
  const colW = Math.min(W * 0.15, 64);
  const colTop = H * 0.22;
  const colH = groundY - colTop;
  const breathe = 0.5 + 0.5 * Math.sin(t * 0.7);

  x.globalCompositeOperation = 'lighter';
  glow(x, cx, (colTop + groundY) / 2, colW * 2.4, p0(pal), 0.1 + breathe * 0.07);

  // Plumb line — perfectly vertical, never sways.
  x.strokeStyle = `rgba(${p1(pal)},0.28)`;
  x.lineWidth = 1;
  x.setLineDash([3, 6]);
  x.beginPath();
  x.moveTo(cx, H * 0.08);
  x.lineTo(cx, colTop - 16);
  x.stroke();
  x.setLineDash([]);
  disc(x, cx, H * 0.08, 3, `rgba(${p1(pal)},0.85)`);

  for (let i = 0; i < 16; i++) {
    const d = (t * 0.18 + i * 0.137) % 1;
    const rest = d > 0.84 ? (1 - d) / 0.16 : 1;
    const mx = cx + Math.sin(i * 31.7) * colW * 2.8;
    const my = colTop + d * (groundY - colTop + 8);
    disc(x, mx, my, 1.6 + (i % 3) * 0.5, `rgba(${p1(pal)},${0.45 * rest})`);
  }
  x.globalCompositeOperation = 'source-over';

  const g = x.createLinearGradient(cx - colW / 2, 0, cx + colW / 2, 0);
  g.addColorStop(0, `rgba(${p0(pal)},0.55)`);
  g.addColorStop(0.45, `rgba(${p1(pal)},0.95)`);
  g.addColorStop(1, `rgba(${p0(pal)},0.55)`);
  x.fillStyle = g;
  rr(x, cx - colW / 2, colTop, colW, colH, 7);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.92)`;
  rr(x, cx - colW * 0.92, colTop - 14, colW * 1.84, 15, 4);
  x.fill();
  rr(x, cx - colW * 0.98, groundY - 3, colW * 1.96, 15, 4);
  x.fill();

  x.strokeStyle = `rgba(${p0(pal)},0.45)`;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(W * 0.1, groundY + 12);
  x.lineTo(W * 0.9, groundY + 12);
  x.stroke();
};

/** A core that keeps its captives — they strain out and are pulled back (hold). */
export const hold: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.34;
  x.globalCompositeOperation = 'lighter';
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
  glow(x, cx, cy, R * 0.75, p1(pal), 0.2 + pulse * 0.12);

  // Closing grip — two crescents like a fist around the core.
  x.strokeStyle = `rgba(${p0(pal)},${0.45 + pulse * 0.2})`;
  x.lineWidth = 5;
  x.lineCap = 'round';
  const grip = 0.85 + pulse * 0.08;
  x.beginPath();
  x.arc(cx, cy, R * 0.42 * grip, 0.55, Math.PI - 0.55);
  x.stroke();
  x.beginPath();
  x.arc(cx, cy, R * 0.42 * grip, Math.PI + 0.55, TAU - 0.55);
  x.stroke();

  disc(x, cx, cy, 8 + pulse * 2, `rgba(${p1(pal)},0.95)`);

  const N = 8;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * TAU + t * 0.32;
    const strain = Math.pow(0.5 + 0.5 * Math.sin(t * 1.25 + i * 1.7), 4);
    const rad = R * (0.7 + strain * 0.4);
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    const g = x.createLinearGradient(cx, cy, px, py);
    g.addColorStop(0, `rgba(${p1(pal)},${0.18 + strain * 0.35})`);
    g.addColorStop(1, `rgba(${p0(pal)},${0.12 + strain * 0.25})`);
    x.strokeStyle = g;
    x.lineWidth = 1.6 + strain * 1.4;
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(px, py);
    x.stroke();
    disc(x, px, py, 4 - strain * 1.4, `rgba(${p0(pal)},${0.75 - strain * 0.25})`);
  }
  x.globalCompositeOperation = 'source-over';
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

  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2.2;
  x.beginPath();
  x.moveTo(W * 0.08, surfaceY);
  x.quadraticCurveTo(cx, surfaceY + dent, W * 0.92, surfaceY);
  x.stroke();

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
  // Finger body.
  const fg = x.createLinearGradient(cx, tipY - 36, cx, tipY);
  fg.addColorStop(0, `rgba(${p0(pal)},0)`);
  fg.addColorStop(1, `rgba(${p0(pal)},0.85)`);
  x.fillStyle = fg;
  x.beginPath();
  x.ellipse(cx, tipY - 14, 8, 22, 0, 0, TAU);
  x.fill();
  glow(x, cx, tipY, 16, p0(pal), 0.55);
  disc(x, cx, tipY, 7, `rgba(${p0(pal)},0.95)`);
  x.globalCompositeOperation = 'source-over';
};

/** A weight rises against gravity (lift) — motion is UP, not sideways. */
export const lift: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const p = (t * 0.28) % 1;
  const ease = p < 0.75 ? Math.pow(p / 0.75, 0.7) : 1 - (p - 0.75) / 0.25;
  const y = H * 0.82 - ease * H * 0.55;
  x.globalCompositeOperation = 'lighter';

  // Up-arrows / lift lines under the orb.
  for (let i = 0; i < 7; i++) {
    const lx = cx + (i - 3) * 16;
    const lp = (t * 0.7 + i * 0.14) % 1;
    const ly = y + 28 + lp * (H * 0.82 - y);
    const a = Math.sin(lp * Math.PI) * 0.5;
    x.strokeStyle = `rgba(${p1(pal)},${a})`;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(lx, ly + 10);
    x.lineTo(lx, ly);
    x.stroke();
  }

  glow(x, cx, y, 36, p0(pal), 0.35 + ease * 0.25);
  disc(x, cx, y, 14, `rgba(${p0(pal)},0.9)`);
  disc(x, cx - 4, y - 4, 4, 'rgba(255,255,255,0.7)');
  x.globalCompositeOperation = 'source-over';
};

/** Wind ribbons and a tumbling leaf (air). */
export const air: SceneFn = (x, W, H, t, pal) => {
  x.globalCompositeOperation = 'lighter';
  x.lineCap = 'round';
  for (let r = 0; r < 5; r++) {
    const y = H * (0.22 + r * 0.14);
    const col = r % 2 ? p1(pal) : p0(pal);
    x.strokeStyle = `rgba(${col},${0.18 + r * 0.04})`;
    x.lineWidth = 1.6 + r * 0.3;
    x.beginPath();
    for (let i = 0; i <= W; i += 6) {
      const yy =
        y +
        Math.sin(i * 0.02 + t * 1.4 + r) * 10 +
        Math.sin(i * 0.045 - t * 0.8) * 5;
      if (i) x.lineTo(i, yy);
      else x.moveTo(i, yy);
    }
    x.stroke();
  }
  // Tumbling leaf.
  const lp = (t * 0.22) % 1;
  const lx = lp * W;
  const ly = H * 0.35 + Math.sin(t * 1.6) * H * 0.18;
  x.save();
  x.translate(lx, ly);
  x.rotate(t * 1.8);
  x.fillStyle = `rgba(${p0(pal)},0.8)`;
  x.beginPath();
  x.ellipse(0, 0, 9, 5, 0, 0, TAU);
  x.fill();
  x.restore();
  x.globalCompositeOperation = 'source-over';
};

/** A pair of beating wings (wing). */
export const wing: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.5;
  const beat = Math.sin(t * 3.2);
  const flap = beat * 0.55;
  x.globalCompositeOperation = 'lighter';
  glow(x, cx, cy, 28, p1(pal), 0.25);

  function oneWing(dir: number, col: string): void {
    x.save();
    x.translate(cx, cy);
    x.rotate(dir * (0.15 + flap));
    x.fillStyle = `rgba(${col},0.28)`;
    x.beginPath();
    x.moveTo(0, 0);
    x.quadraticCurveTo(dir * 90, -50, dir * 140, -8);
    x.quadraticCurveTo(dir * 90, 28, 0, 8);
    x.closePath();
    x.fill();
    x.strokeStyle = `rgba(${col},0.7)`;
    x.lineWidth = 1.6;
    x.stroke();
    for (let i = 0; i < 5; i++) {
      const f = (i + 1) / 6;
      x.beginPath();
      x.moveTo(dir * 12, 2);
      x.quadraticCurveTo(dir * (40 + f * 50), -20 + i * 8, dir * (80 + f * 50), -4 + i * 5);
      x.stroke();
    }
    x.restore();
  }
  oneWing(-1, p0(pal));
  oneWing(1, p1(pal));
  disc(x, cx, cy, 7, `rgba(255,255,255,0.85)`);

  // Downwash motes.
  for (let i = 0; i < 10; i++) {
    const d = (t * 0.5 + i * 0.1) % 1;
    disc(
      x,
      cx + Math.sin(i * 2.1) * 50,
      cy + 16 + d * 40,
      1.4,
      `rgba(${p1(pal)},${(1 - d) * 0.4})`,
    );
  }
  x.globalCompositeOperation = 'source-over';
};

/** Two doors close to a seam, flash, then reopen (shut). */
export const shut: SceneFn = (x, W, H, t, pal) => {
  const cy = H / 2,
    doorH = Math.min(H * 0.62, 220),
    doorW = Math.min(W * 0.28, 120);
  const cycle = 3.2;
  const ph = (t % cycle) / cycle;
  // 0–0.45 close, 0.45–0.55 held shut, 0.55–1 open.
  let gap: number;
  if (ph < 0.45) gap = 1 - ph / 0.45;
  else if (ph < 0.55) gap = 0;
  else gap = (ph - 0.55) / 0.45;
  const inset = gap * doorW * 0.92;
  const leftX = W / 2 - doorW - inset / 2;
  const rightX = W / 2 + inset / 2;
  x.globalCompositeOperation = 'lighter';
  x.fillStyle = `rgba(${p0(pal)},0.28)`;
  rr(x, leftX, cy - doorH / 2, doorW, doorH, 8);
  x.fill();
  x.fillStyle = `rgba(${p1(pal)},0.28)`;
  rr(x, rightX, cy - doorH / 2, doorW, doorH, 8);
  x.fill();
  x.strokeStyle = `rgba(${p0(pal)},0.7)`;
  x.lineWidth = 2;
  rr(x, leftX, cy - doorH / 2, doorW, doorH, 8);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.7)`;
  rr(x, rightX, cy - doorH / 2, doorW, doorH, 8);
  x.stroke();
  if (gap < 0.08) glow(x, W / 2, cy, 36, '255,255,255', 0.45 - gap * 4);
  x.globalCompositeOperation = 'source-over';
};

/** A pulse that laps the same orbit again and again (again). */
export const loop: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.3;
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(${p0(pal)},0.28)`;
  x.lineWidth = 3;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.stroke();
  // Arrowhead on the ring.
  const ah = t * 1.4;
  const ax = cx + Math.cos(ah) * R,
    ay = cy + Math.sin(ah) * R;
  const tx = -Math.sin(ah),
    ty = Math.cos(ah);
  x.fillStyle = `rgba(${p1(pal)},0.95)`;
  x.beginPath();
  x.moveTo(ax + tx * 10, ay + ty * 10);
  x.lineTo(ax - tx * 6 + Math.cos(ah) * 8, ay - ty * 6 + Math.sin(ah) * 8);
  x.lineTo(ax - tx * 6 - Math.cos(ah) * 8, ay - ty * 6 - Math.sin(ah) * 8);
  x.fill();
  // Ghost of the previous lap.
  for (let k = 1; k <= 3; k++) {
    const g = ah - k * 0.55;
    glow(x, cx + Math.cos(g) * R, cy + Math.sin(g) * R, 10, p1(pal), 0.28 / k);
  }
  glow(x, ax, ay, 14, p1(pal), 0.7);
  x.globalCompositeOperation = 'source-over';
};

/** A wavy path that snaps straight — ortho = correct / straight. */
export const straight: SceneFn = (x, W, H, t, pal) => {
  const y = H * 0.5,
    x0 = W * 0.08,
    x1 = W * 0.92;
  const cycle = 2.4;
  const ph = (t % cycle) / cycle;
  const corr = ph < 0.55 ? ph / 0.55 : 1;
  x.globalCompositeOperation = 'lighter';
  x.lineCap = 'round';
  x.beginPath();
  for (let i = 0; i <= 80; i++) {
    const f = i / 80;
    const px = x0 + (x1 - x0) * f;
    const wave = Math.sin(f * 10) * H * 0.16 * (1 - corr);
    if (i) x.lineTo(px, y + wave);
    else x.moveTo(px, y + wave);
  }
  x.strokeStyle = `rgba(${p0(pal)},0.9)`;
  x.lineWidth = 3.2;
  x.shadowColor = `rgba(${p0(pal)},0.6)`;
  x.shadowBlur = 12;
  x.stroke();
  x.shadowBlur = 0;
  // Correction sweep.
  const sx = x0 + (x1 - x0) * corr;
  glow(x, sx, y, 16, p1(pal), 0.55);
  x.globalCompositeOperation = 'source-over';
};

/** Blocks stacking into a tower, then reset (build). */
export const build: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2;
  const ground = H * 0.82;
  const bw = Math.min(W * 0.18, 56);
  const bh = Math.min(H * 0.1, 28);
  const n = 5;
  const p = (t * 0.35) % (n + 1.2);
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(W * 0.18, ground);
  x.lineTo(W * 0.82, ground);
  x.stroke();
  for (let i = 0; i < n; i++) {
    const appear = Math.max(0, Math.min(1, p - i));
    if (appear <= 0) continue;
    const w = bw * (1 - i * 0.08);
    const bx = cx - w / 2 + Math.sin(i * 2) * 3;
    const by = ground - (i + 1) * bh * appear;
    x.fillStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},${0.35 + appear * 0.4})`;
    rr(x, bx, by, w, bh - 3, 5);
    x.fill();
    x.strokeStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},0.8)`;
    x.lineWidth = 1.5;
    x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
};

/** A spoked wheel turning (circle). */
export const circle: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.32;
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(${p0(pal)},0.75)`;
  x.lineWidth = 5;
  x.beginPath();
  x.arc(cx, cy, R, 0, TAU);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.45)`;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx, cy, R * 0.72, 0, TAU);
  x.stroke();
  x.save();
  x.translate(cx, cy);
  x.rotate(t * 0.9);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    x.strokeStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},0.55)`;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    x.stroke();
  }
  x.restore();
  glow(x, cx, cy, 16, '255,255,255', 0.7);
  x.globalCompositeOperation = 'source-over';
};

/** A balance scale held level (equal). */
export const equal: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H * 0.38,
    arm = Math.min(W * 0.32, 120);
  const wobble = Math.sin(t * 1.4) * 0.045;
  x.globalCompositeOperation = 'lighter';
  x.save();
  x.translate(cx, cy);
  x.rotate(wobble);
  x.strokeStyle = `rgba(${p0(pal)},0.85)`;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(-arm, 0);
  x.lineTo(arm, 0);
  x.stroke();
  function pan(px: number, col: string): void {
    x.strokeStyle = `rgba(${col},0.7)`;
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(px, 0);
    x.lineTo(px, 28);
    x.stroke();
    x.beginPath();
    x.moveTo(px - 22, 28);
    x.lineTo(px + 22, 28);
    x.lineTo(px + 14, 42);
    x.lineTo(px - 14, 42);
    x.closePath();
    x.fillStyle = `rgba(${col},0.35)`;
    x.fill();
    x.stroke();
    disc(x, px, 36, 6, `rgba(${col},0.9)`);
  }
  pan(-arm, p0(pal));
  pan(arm, p1(pal));
  x.restore();
  // Fulcrum.
  x.fillStyle = `rgba(${p1(pal)},0.8)`;
  x.beginPath();
  x.moveTo(cx, cy);
  x.lineTo(cx - 16, cy + 48);
  x.lineTo(cx + 16, cy + 48);
  x.closePath();
  x.fill();
  x.globalCompositeOperation = 'source-over';
};

function beads(n: number, scatter = false): SceneFn {
  return (x, W, H, t, pal) => {
    const cx = W / 2,
      cy = H / 2,
      R = Math.min(W, H) * (n === 1 ? 0.08 : 0.26);
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = `rgba(${p0(pal)},0.18)`;
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(cx, cy, R + 18, 0, TAU);
    x.stroke();

    if (n === 1) {
      const b = 0.5 + 0.5 * Math.sin(t * 1.4);
      glow(x, cx, cy, 56, p0(pal), 0.28 + b * 0.12);
      glow(x, cx, cy, 22, p1(pal), 0.55);
      disc(x, cx, cy, 16, `rgba(${p0(pal)},0.95)`);
      disc(x, cx - 5, cy - 5, 4, 'rgba(255,255,255,0.8)');
    } else if (n === 2) {
      for (let i = 0; i < 2; i++) {
        const px = cx + (i === 0 ? -R * 0.85 : R * 0.85);
        const py = cy;
        const col = i === 0 ? p0(pal) : p1(pal);
        const tw = 0.5 + 0.5 * Math.sin(t * 1.6 + i);
        glow(x, px, py, 22, col, 0.3 + tw * 0.12);
        disc(x, px, py, 14, `rgba(${col},0.92)`);
      }
    } else {
      const count = scatter ? 12 : n;
      for (let i = 0; i < count; i++) {
        const a = scatter ? i * 2.39996 + t * 0.15 : (i / count) * TAU - Math.PI / 2;
        const rad = scatter ? R * (0.45 + (i % 5) * 0.14) : R;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        const col = i % 2 ? p1(pal) : p0(pal);
        const tw = 0.5 + 0.5 * Math.sin(t * 1.6 + i);
        glow(x, px, py, scatter ? 12 : 18, col, 0.28 + tw * 0.12);
        disc(x, px, py, scatter ? 5 : 11, `rgba(${col},0.9)`);
      }
    }
    x.globalCompositeOperation = 'source-over';
  };
}

export const one = beads(1);
export const two = beads(2);
export const three = beads(3);
export const many = beads(12, true);

/** Things drawn inward toward a core (pull) — opposite of flying arrows. */
export const pull: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2;
  x.globalCompositeOperation = 'lighter';
  glow(x, cx, cy, 40, p1(pal), 0.4);
  disc(x, cx, cy, 8, `rgba(${p1(pal)},0.95)`);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + 0.2;
    const d = 1 - ((t * 0.45 + i * 0.137) % 1); // 1 at edge → 0 at core
    const r = 20 + d * Math.min(W, H) * 0.42;
    const px = cx + Math.cos(a) * r,
      py = cy + Math.sin(a) * r;
    const al = Math.sin(d * Math.PI);
    const len = 16 + (i % 3) * 6;
    const g = x.createLinearGradient(
      px + Math.cos(a) * len,
      py + Math.sin(a) * len,
      px,
      py,
    );
    const col = i % 2 ? p0(pal) : p1(pal);
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(1, `rgba(${col},${al * 0.85})`);
    x.strokeStyle = g;
    x.lineWidth = 2.4;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.lineTo(px, py);
    x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
};

/** A hanging weight on a pendulum (hang). */
export const hang: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    top = H * 0.12,
    len = Math.min(H * 0.55, 200);
  const ang = Math.sin(t * 1.35) * 0.55;
  const bx = cx + Math.sin(ang) * len;
  const by = top + Math.cos(ang) * len;
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(${p0(pal)},0.35)`;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(W * 0.22, top);
  x.lineTo(W * 0.78, top);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.8)`;
  x.lineWidth = 2.2;
  x.beginPath();
  x.moveTo(cx, top);
  x.lineTo(bx, by);
  x.stroke();
  glow(x, bx, by, 28, p0(pal), 0.45);
  disc(x, bx, by, 14, `rgba(${p0(pal)},0.92)`);
  disc(x, cx, top, 4, `rgba(${p1(pal)},0.9)`);
  x.globalCompositeOperation = 'source-over';
};

/** A stem unfurling leaves (nature). */
export const nature: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    ground = H * 0.86;
  const grow = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.6));
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(${p0(pal)},0.4)`;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(W * 0.2, ground);
  x.lineTo(W * 0.8, ground);
  x.stroke();
  x.strokeStyle = `rgba(${p0(pal)},0.85)`;
  x.lineWidth = 3;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx, ground);
  x.quadraticCurveTo(cx + 8, ground - 80 * grow, cx, ground - 160 * grow);
  x.stroke();
  for (let i = 0; i < 6; i++) {
    const f = (i + 1) / 7;
    const ly = ground - f * 150 * grow;
    const dir = i % 2 === 0 ? -1 : 1;
    const open = 0.5 + 0.5 * Math.sin(t * 1.2 + i);
    x.fillStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},0.55)`;
    x.beginPath();
    x.moveTo(cx, ly);
    x.quadraticCurveTo(cx + dir * 28 * open, ly - 12, cx + dir * 46 * open, ly + 4);
    x.quadraticCurveTo(cx + dir * 20, ly + 14, cx, ly);
    x.fill();
  }
  glow(x, cx, ground - 160 * grow, 14, p1(pal), 0.5);
  x.globalCompositeOperation = 'source-over';
};

/** A silhouette that morphs between circle, square-ish, and star (shape). */
export const morph: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2,
    R = Math.min(W, H) * 0.28;
  const mode = (Math.sin(t * 0.7) + 1) / 2;
  x.globalCompositeOperation = 'lighter';
  x.beginPath();
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU - Math.PI / 2;
    const star = 0.65 + 0.35 * Math.cos(a * 3);
    const sq = 1 / Math.max(0.42, Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)));
    const rad = R * ((1 - mode) * 1 + mode * (0.45 * star + 0.55 * sq));
    const px = cx + Math.cos(a) * rad,
      py = cy + Math.sin(a) * rad;
    if (i) x.lineTo(px, py);
    else x.moveTo(px, py);
  }
  x.closePath();
  x.fillStyle = `rgba(${p0(pal)},0.22)`;
  x.fill();
  x.strokeStyle = `rgba(${p1(pal)},0.85)`;
  x.lineWidth = 2.4;
  x.stroke();
  glow(x, cx, cy, 18, p0(pal), 0.45);
  x.globalCompositeOperation = 'source-over';
};

/** Footprints stepping across (foot / step). */
export const step: SceneFn = (x, W, H, t, pal) => {
  x.globalCompositeOperation = 'lighter';
  const n = 8;
  for (let i = 0; i < n; i++) {
    const p = (t * 0.28 + i / n) % 1;
    const px = p * W;
    const py = H * 0.5 + (i % 2 === 0 ? -16 : 16);
    const a = Math.sin(p * Math.PI);
    x.save();
    x.translate(px, py);
    x.rotate(-0.4 + (i % 2) * 0.8);
    x.fillStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},${a * 0.7})`;
    x.beginPath();
    x.ellipse(0, 0, 8, 14, 0, 0, TAU);
    x.fill();
    x.beginPath();
    x.ellipse(0, -16, 5, 5, 0, 0, TAU);
    x.fill();
    x.restore();
  }
  x.globalCompositeOperation = 'source-over';
};

/** Matter falling down (down) — gravity, not an explosion. */
export const fall: SceneFn = (x, W, H, t, pal) => {
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 28; i++) {
    const d = (t * 0.35 + i * 0.137) % 1;
    const px = W * ((i * 0.173) % 1);
    const py = d * d * H; // accelerate
    const a = 0.25 + (1 - d) * 0.55;
    const col = i % 2 ? p1(pal) : p0(pal);
    disc(x, px, py, 2 + (i % 3), `rgba(${col},${a})`);
    x.strokeStyle = `rgba(${col},${a * 0.4})`;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(px, py - 10 - d * 8);
    x.lineTo(px, py);
    x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
};

/** An object descends and clicks into a socket (place). */
export const place: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    sockY = H * 0.7,
    p = (t * 0.35) % 1;
  const drop = p < 0.7 ? Math.pow(p / 0.7, 1.4) : 1;
  const y = H * 0.18 + drop * (sockY - H * 0.18 - 16);
  const seated = p > 0.7;
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(${p0(pal)},0.5)`;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(W * 0.2, sockY + 18);
  x.lineTo(W * 0.8, sockY + 18);
  x.stroke();
  x.strokeStyle = `rgba(${p1(pal)},0.7)`;
  rr(x, cx - 22, sockY - 4, 44, 22, 6);
  x.stroke();
  glow(x, cx, y, 20, p0(pal), seated ? 0.55 : 0.3);
  disc(x, cx, y, 12, `rgba(${p0(pal)},0.92)`);
  if (seated) glow(x, cx, sockY + 6, 28, p1(pal), 0.35);
  x.globalCompositeOperation = 'source-over';
};

/** Rings unwind and drift apart (loosen / free). */
export const loosen: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    cy = H / 2;
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const open = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 0.7);
    const r = Math.min(W, H) * (0.1 + i * 0.06) * (0.85 + open * 0.35);
    const gap = 0.4 + open * 0.9;
    x.strokeStyle = `rgba(${i % 2 ? p1(pal) : p0(pal)},${0.55 - i * 0.06})`;
    x.lineWidth = 2.4;
    x.beginPath();
    x.arc(cx, cy, r, t + i, t + i + TAU - gap);
    x.stroke();
  }
  glow(x, cx, cy, 12, p1(pal), 0.4);
  x.globalCompositeOperation = 'source-over';
};

/** A rope wringing around its axis (twist). */
export const twist: SceneFn = (x, W, H, t, pal) => {
  const cx = W / 2,
    top = H * 0.1,
    span = H * 0.8,
    N = 40,
    amp = Math.min(W * 0.2, 70);
  x.globalCompositeOperation = 'lighter';
  for (const phase of [0, Math.PI]) {
    const col = phase === 0 ? p0(pal) : p1(pal);
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const y = top + f * span;
      const ph = f * 6 * TAU + t * 1.6 + phase;
      const xx = cx + Math.sin(ph) * amp * (0.4 + 0.6 * Math.sin(f * Math.PI));
      if (i) x.lineTo(xx, y);
      else x.moveTo(xx, y);
    }
    x.strokeStyle = `rgba(${col},0.75)`;
    x.lineWidth = 3;
    x.lineJoin = 'round';
    x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
};

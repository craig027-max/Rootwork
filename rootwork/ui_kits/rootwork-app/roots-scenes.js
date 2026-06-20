/* ============================================================
   Word Roots — Canvas scene engine
   Each scene: fn(x, W, H, t, pal)
     x   = CanvasRenderingContext2D (already DPR-scaled)
     W,H = CSS pixel size of the scene
     t   = elapsed seconds (frozen if prefers-reduced-motion)
     pal = [ "r,g,b", "r,g,b" ]  the card's two scene colors
   ============================================================ */
(function () {
  "use strict";
  const TAU = 6.2831853;
  const RUNG = ['239,68,68', '245,158,11', '52,224,122', '6,182,212', '59,130,246'];

  function rr(x, X, Y, w, h, r) {
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + w, Y, X + w, Y + h, r);
    x.arcTo(X + w, Y + h, X, Y + h, r);
    x.arcTo(X, Y + h, X, Y, r);
    x.arcTo(X, Y, X + w, Y, r);
    x.closePath();
  }
  function glow(x, px, py, r, col, a) {
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${col},${a})`);
    g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
  }

  // DNA helix + drifting cells (life) ──────────────────────
  let cells = null, cellW = 0, cellH = 0;
  function seedCells(W, H) {
    cells = [];
    const n = Math.round(Math.max(14, Math.min(34, (W * H) / 9000)));
    for (let i = 0; i < n; i++) cells.push({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 5, sp: 0.004 + Math.random() * 0.01, sway: Math.random() * 6.28, hue: Math.random() < 0.5 ? '52,224,122' : '79,195,247', a: 0.1 + Math.random() * 0.22 });
    cellW = W; cellH = H;
  }
  function dna(x, W, H, t, pal) {
    if (!cells || cellW !== W || cellH !== H) seedCells(W, H);
    x.globalCompositeOperation = 'lighter';
    for (const c of cells) {
      c.y -= c.sp; c.sway += 0.016;
      if (c.y < -0.05) { c.y = 1.05; c.x = Math.random(); }
      const px = (c.x + Math.sin(c.sway) * 0.02) * W, py = c.y * H;
      glow(x, px, py, c.r * 3, c.hue, c.a);
    }
    const cx = W * 0.5, amp = Math.min(W * 0.26, 96), top = H * 0.1, span = H * 0.8, N = 46, freq = 3.1, nodes = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N, y = top + f * span, ph = f * freq * TAU + t * 0.9;
      const x1 = cx + Math.sin(ph) * amp, x2 = cx + Math.sin(ph + Math.PI) * amp;
      const d1 = (Math.cos(ph) + 1) / 2, d2 = (Math.cos(ph + Math.PI) + 1) / 2;
      if (i % 2 === 0) { const dm = (d1 + d2) / 2, col = RUNG[(i / 2) % RUNG.length]; x.strokeStyle = `rgba(${col},${0.12 + dm * 0.5})`; x.lineWidth = 1.4 + dm * 2.2; x.beginPath(); x.moveTo(x1, y); x.lineTo(x2, y); x.stroke(); }
      nodes.push({ x: x1, y, d: d1, c: pal[0] }); nodes.push({ x: x2, y, d: d2, c: pal[1] });
    }
    for (const phase of [0, Math.PI]) {
      x.beginPath();
      for (let i = 0; i <= N; i++) { const f = i / N, y = top + f * span, ph = f * freq * TAU + t * 0.9 + phase, xx = cx + Math.sin(ph) * amp; i ? x.lineTo(xx, y) : x.moveTo(xx, y); }
      x.strokeStyle = `rgba(${phase === 0 ? pal[0] : pal[1]},0.18)`; x.lineWidth = 2; x.stroke();
    }
    nodes.sort((a, b) => a.d - b.d);
    for (const n of nodes) { const r = 2.4 + n.d * 4.6, a = 0.25 + n.d * 0.7; const g = x.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.4); g.addColorStop(0, `rgba(255,255,255,${a * 0.9})`); g.addColorStop(0.35, `rgba(${n.c},${a})`); g.addColorStop(1, `rgba(${n.c},0)`); x.fillStyle = g; x.beginPath(); x.arc(n.x, n.y, r * 2.4, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }

  // Rotating wireframe globe (earth) ───────────────────────
  function globe(x, W, H, t, pal) {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34;
    let g = x.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    g.addColorStop(0, `rgba(${pal[0]},0.28)`); g.addColorStop(1, `rgba(${pal[1]},0.04)`);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.clip();
    x.globalCompositeOperation = 'lighter';
    for (let lat = -4; lat <= 4; lat++) { const a = lat / 5 * Math.PI / 2, y = Math.sin(a) * R, rx = Math.cos(a) * R; x.strokeStyle = `rgba(${pal[0]},0.16)`; x.lineWidth = 1; x.beginPath(); x.ellipse(cx, cy + y, Math.max(0.1, rx), Math.max(0.1, rx * 0.18), 0, 0, TAU); x.stroke(); }
    const M = 9;
    for (let k = 0; k < M; k++) { const ph = t * 0.5 + k * Math.PI / M, rx = Math.abs(Math.cos(ph)) * R, front = Math.cos(ph) > 0; x.strokeStyle = `rgba(${pal[1]},${front ? 0.34 : 0.1})`; x.lineWidth = front ? 1.4 : 1; x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), R, 0, 0, TAU); x.stroke(); }
    x.restore();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = `rgba(${pal[1]},0.6)`; x.lineWidth = 2; x.shadowColor = `rgba(${pal[1]},0.85)`; x.shadowBlur = 24; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke(); x.shadowBlur = 0;
    const oa = t * 0.8, ox = cx + Math.cos(oa) * R * 1.55, oy = cy + Math.sin(oa) * R * 0.5;
    glow(x, ox, oy, 9, '255,255,255', 0.9);
    x.globalCompositeOperation = 'source-over';
  }

  // Radiating sun + photons (light) ────────────────────────
  function light(x, W, H, t, pal) {
    const cx = W / 2, cy = H / 2, maxR = Math.min(W, H) * 0.46;
    x.globalCompositeOperation = 'lighter';
    const rays = 26;
    for (let k = 0; k < rays; k++) { const a = k / rays * TAU + t * 0.3, fl = Math.abs(Math.sin(k * 1.7 + t)), len = maxR * (0.5 + 0.5 * fl); x.strokeStyle = `rgba(${pal[0]},${0.04 + 0.12 * fl})`; x.lineWidth = 2; x.beginPath(); x.moveTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28); x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); x.stroke(); }
    for (let i = 0; i < 64; i++) { const d = (t * 0.25 + i * 0.137) % 1, r = d * maxR, a = i * 2.39996, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r, al = (1 - d) * 0.8, s = 1.4 + (1 - d) * 2.2; x.fillStyle = `rgba(${pal[0]},${al})`; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill(); }
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.42); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.22, `rgba(${pal[0]},0.85)`); g.addColorStop(0.55, `rgba(${pal[1]},0.22)`); g.addColorStop(1, `rgba(${pal[1]},0)`); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, maxR * 0.42, 0, TAU); x.fill();
    x.globalCompositeOperation = 'source-over';
  }

  // Signal pulses across distance (far) ────────────────────
  function waves(x, W, H, t, pal) {
    const sx = W * 0.16, sy = H * 0.5, dx = W * 0.84;
    x.strokeStyle = `rgba(${pal[1]},0.14)`; x.setLineDash([3, 9]); x.lineWidth = 1.5; x.beginPath(); x.moveTo(sx, sy); x.lineTo(dx, sy); x.stroke(); x.setLineDash([]);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const p = (t * 0.6 + i / 4) % 1, r = p * Math.min(W, H) * 0.24; x.strokeStyle = `rgba(${pal[0]},${(1 - p) * 0.5})`; x.lineWidth = 2; x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.stroke(); }
    let near = 0;
    for (let i = 0; i < 4; i++) { const p = (t * 0.5 + i / 4) % 1, px = sx + (dx - sx) * p, al = Math.sin(p * Math.PI); x.fillStyle = `rgba(${pal[1]},${al})`; x.shadowColor = `rgba(${pal[1]},0.9)`; x.shadowBlur = 12; x.beginPath(); x.arc(px, sy, 4, 0, TAU); x.fill(); if (p > 0.9) near = Math.max(near, al); }
    x.shadowBlur = 0;
    [[sx, sy, pal[0], 1], [dx, sy, pal[1], near]].forEach(([nx, ny, col, b]) => glow(x, nx, ny, 16 + b * 6, col, 0.6 + 0.35 * b));
    x.globalCompositeOperation = 'source-over';
  }

  // Pen tracing a line (write / draw) ──────────────────────
  function draw(x, W, H, t, pal) {
    const x0 = W * 0.12, x1 = W * 0.88, midY = H * 0.5, amp = H * 0.17, SEG = 240;
    const prog = (t * 0.16) % 1.25, tip = Math.min(1, prog);
    const fy = f => midY + Math.sin(f * 9) * amp * Math.sin(f * Math.PI) + Math.sin(f * 23) * amp * 0.16;
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = `rgba(${pal[1]},0.10)`; x.lineWidth = 1.5; x.beginPath();
    for (let n = 0; n <= SEG; n++) { const f = n / SEG, px = x0 + (x1 - x0) * f; n ? x.lineTo(px, fy(f)) : x.moveTo(px, fy(f)); }
    x.stroke();
    const tipN = Math.floor(SEG * tip);
    x.strokeStyle = `rgba(${pal[0]},0.95)`; x.lineWidth = 3.2; x.lineCap = 'round'; x.shadowColor = `rgba(${pal[0]},0.8)`; x.shadowBlur = 14; x.beginPath();
    for (let n = 0; n <= tipN; n++) { const f = n / SEG, px = x0 + (x1 - x0) * f; n ? x.lineTo(px, fy(f)) : x.moveTo(px, fy(f)); }
    x.stroke(); x.shadowBlur = 0;
    if (tipN > 0 && tip < 1) { const f = tipN / SEG, px = x0 + (x1 - x0) * f, py = fy(f); const g = x.createRadialGradient(px, py, 0, px, py, 14); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, `rgba(${pal[1]},0.7)`); g.addColorStop(1, `rgba(${pal[1]},0)`); x.fillStyle = g; x.beginPath(); x.arc(px, py, 14, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }

  // Flowing waves + bubbles (water) ────────────────────────
  function water(x, W, H, t, pal) {
    x.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 4; r++) {
      const y = H * (0.3 + r * 0.14);
      x.strokeStyle = `rgba(${pal[r % 2]},${0.2 - r * 0.03})`; x.lineWidth = 2; x.beginPath();
      for (let i = 0; i <= W; i += 6) { const yy = y + Math.sin(i * 0.025 + t * 1.5 + r) * 8 + Math.sin(i * 0.06 - t) * 4; i ? x.lineTo(i, yy) : x.moveTo(i, yy); }
      x.stroke();
    }
    for (let i = 0; i < 20; i++) { const d = (t * 0.3 + i * 0.11) % 1, bx = W * ((i * 0.137) % 1), by = H - d * H, a = (1 - d) * 0.4, s = 2 + (i % 3); x.fillStyle = `rgba(${pal[1]},${a})`; x.beginPath(); x.arc(bx, by, s, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }

  // Rising flames (heat) ───────────────────────────────────
  function heat(x, W, H, t) {
    const cx = W / 2;
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 72; i++) {
      const seed = i * 0.137, d = (t * 0.6 + seed) % 1;
      const fx = cx + Math.sin(i * 12.9) * W * 0.34 + Math.sin(d * 6 + i) * 14;
      const fy = H * 0.92 - d * H * 0.72, a = (1 - d) * 0.7, s = (1 - d) * 16 + 4, gg = Math.round(200 * (1 - d));
      const g = x.createRadialGradient(fx, fy, 0, fx, fy, s);
      g.addColorStop(0, `rgba(255,245,200,${a})`); g.addColorStop(0.4, `rgba(255,${gg},40,${a * 0.8})`); g.addColorStop(1, 'rgba(255,60,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(fx, fy, s, 0, TAU); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
  }

  // Twinkling starfield (star / space) ─────────────────────
  function stars(x, W, H, t, pal) {
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const sx = (i * 0.0137 * W * 7.3) % W, sy = (i * 0.0297 * H * 5.1) % H;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i), a = 0.2 + tw * 0.6, s = 0.6 + tw * 1.6;
      x.fillStyle = `rgba(${i % 5 === 0 ? pal[0] : '255,255,255'},${a})`; x.beginPath(); x.arc(sx, sy, s, 0, TAU); x.fill();
    }
    const p = (t * 0.22) % 1, stx = W * 0.12 + p * W * 0.7, sty = H * 0.18 + p * H * 0.28;
    x.strokeStyle = `rgba(${pal[1]},${Math.sin(p * Math.PI)})`; x.lineWidth = 2; x.beginPath(); x.moveTo(stx, sty); x.lineTo(stx - 32, sty - 13); x.stroke();
    glow(x, W * 0.7, H * 0.56, 46, pal[0], 0.45);
    x.globalCompositeOperation = 'source-over';
  }

  // Clock with rotating hands (time) ───────────────────────
  function clock(x, W, H, t, pal) {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.32;
    x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; x.strokeStyle = `rgba(${pal[0]},0.4)`; x.lineWidth = k % 3 === 0 ? 3 : 1.5; x.beginPath(); x.moveTo(cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.stroke(); }
    x.strokeStyle = `rgba(${pal[1]},0.4)`; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke();
    [[t * 0.5, R * 0.5, 3, pal[0]], [t * 2.0, R * 0.78, 2, pal[1]]].forEach(([ang, len, lw, col]) => { const a = ang - Math.PI / 2; x.strokeStyle = `rgba(${col},0.9)`; x.lineWidth = lw; x.shadowColor = `rgba(${col},0.8)`; x.shadowBlur = 10; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); x.stroke(); });
    x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(cx, cy, 4, 0, TAU); x.fill();
    x.globalCompositeOperation = 'source-over';
  }

  // Sound rings + EQ bars (sound / hear) ───────────────────
  function sound(x, W, H, t, pal) {
    const cx = W * 0.5, cy = H * 0.46;
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const p = (t * 0.7 + i / 5) % 1, r = p * Math.min(W, H) * 0.4; x.strokeStyle = `rgba(${pal[i % 2]},${(1 - p) * 0.55})`; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.stroke(); }
    const bars = 13, bw = W * 0.5 / bars;
    for (let i = 0; i < bars; i++) { const h = H * 0.13 * (0.3 + 0.7 * Math.abs(Math.sin(t * 3 + i * 0.6))), bx = cx - W * 0.25 + i * bw; x.fillStyle = `rgba(${pal[1]},0.55)`; x.fillRect(bx, cy + H * 0.3 - h, bw * 0.6, h); }
    glow(x, cx, cy, 20, '255,255,255', 0.85);
    x.globalCompositeOperation = 'source-over';
  }

  // Watching eye (see / look) ──────────────────────────────
  function eye(x, W, H, t, pal) {
    const cx = W / 2, cy = H / 2, ew = Math.min(W * 0.34, 170), eh = ew * 0.55;
    function lid() { x.beginPath(); x.moveTo(cx - ew, cy); x.quadraticCurveTo(cx, cy - eh, cx + ew, cy); x.quadraticCurveTo(cx, cy + eh, cx - ew, cy); }
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = `rgba(${pal[1]},0.55)`; x.lineWidth = 2.5; lid(); x.stroke();
    const ix = cx + Math.sin(t * 0.8) * ew * 0.35, irisR = eh * 0.95;
    x.save(); lid(); x.clip();
    const g = x.createRadialGradient(ix, cy, 0, ix, cy, irisR); g.addColorStop(0, `rgba(${pal[0]},0.85)`); g.addColorStop(0.6, `rgba(${pal[0]},0.3)`); g.addColorStop(1, `rgba(${pal[0]},0)`); x.fillStyle = g; x.beginPath(); x.arc(ix, cy, irisR, 0, TAU); x.fill();
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; x.strokeStyle = `rgba(${pal[1]},0.4)`; x.lineWidth = 1; x.beginPath(); x.moveTo(ix + Math.cos(a) * irisR * 0.3, cy + Math.sin(a) * irisR * 0.3); x.lineTo(ix + Math.cos(a) * irisR * 0.9, cy + Math.sin(a) * irisR * 0.9); x.stroke(); }
    x.fillStyle = 'rgba(8,8,20,0.92)'; x.beginPath(); x.arc(ix, cy, irisR * 0.4, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(ix - irisR * 0.13, cy - irisR * 0.13, irisR * 0.1, 0, TAU); x.fill();
    x.restore();
    x.globalCompositeOperation = 'source-over';
  }

  // Streaking arrows (carry / move / throw) ────────────────
  function motion(x, W, H, t, pal) {
    x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const lane = i % 5, ly = H * 0.22 + lane * H * 0.14, p = (t * 0.6 + i * 0.137) % 1, px = p * W, a = Math.sin(p * Math.PI), len = 24 + (i % 3) * 12, col = pal[i % 2];
      const g = x.createLinearGradient(px - len, ly, px, ly); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a * 0.85})`);
      x.strokeStyle = g; x.lineWidth = 3; x.beginPath(); x.moveTo(px - len, ly); x.lineTo(px, ly); x.stroke();
      x.fillStyle = `rgba(${col},${a})`; x.beginPath(); x.moveTo(px, ly); x.lineTo(px - 7, ly - 4.5); x.lineTo(px - 7, ly + 4.5); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
  }

  // Interlocking gears (build / machine / self) ────────────
  function gear(x, W, H, t, pal) {
    function g1(gx, gy, R, teeth, rot, col) {
      x.fillStyle = `rgba(${col},0.85)`; x.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = i / teeth * TAU + rot, a1 = (i + 0.5) / teeth * TAU + rot, ro = R, ri = R * 0.82;
        x.lineTo(gx + Math.cos(a0) * ri, gy + Math.sin(a0) * ri);
        x.lineTo(gx + Math.cos(a0) * ro, gy + Math.sin(a0) * ro);
        x.lineTo(gx + Math.cos(a1) * ro, gy + Math.sin(a1) * ro);
        x.lineTo(gx + Math.cos(a1) * ri, gy + Math.sin(a1) * ri);
      }
      x.closePath(); x.fill();
      x.fillStyle = 'rgba(10,10,26,0.92)'; x.beginPath(); x.arc(gx, gy, R * 0.45, 0, TAU); x.fill();
      x.strokeStyle = `rgba(${col},0.9)`; x.lineWidth = 2; x.beginPath(); x.arc(gx, gy, R * 0.45, 0, TAU); x.stroke();
    }
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.2;
    x.globalCompositeOperation = 'lighter';
    g1(cx - R * 0.95, cy - R * 0.5, R, 12, t * 0.6, pal[0]);
    g1(cx + R * 0.95, cy + R * 0.45, R * 0.82, 10, -t * 0.73 + 0.3, pal[1]);
    g1(cx + R * 0.25, cy - R * 1.15, R * 0.62, 8, t * 0.9, pal[0]);
    x.globalCompositeOperation = 'source-over';
  }

  // Speech bubble + waveform (speak / say) ─────────────────
  function speak(x, W, H, t, pal) {
    const cx = W / 2, cy = H * 0.48, bw = Math.min(W * 0.5, 260), bh = bw * 0.55;
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = `rgba(${pal[0]},0.5)`; x.lineWidth = 2.5; rr(x, cx - bw / 2, cy - bh / 2, bw, bh, 18); x.stroke();
    x.beginPath(); x.moveTo(cx - bw * 0.18, cy + bh / 2 - 2); x.lineTo(cx - bw * 0.26, cy + bh / 2 + 22); x.lineTo(cx - bw * 0.03, cy + bh / 2 - 2); x.stroke();
    const bars = 15, bw2 = bw * 0.72 / bars;
    for (let i = 0; i < bars; i++) { const h = bh * 0.55 * (0.22 + 0.78 * Math.abs(Math.sin(t * 4 + i * 0.5))), bx = cx - bw * 0.36 + i * bw2; x.fillStyle = `rgba(${pal[1]},0.7)`; x.fillRect(bx, cy - h / 2, bw2 * 0.55, h); }
    x.globalCompositeOperation = 'source-over';
  }

  // Cracks + shards (break) ────────────────────────────────
  function breakx(x, W, H, t, pal) {
    const cx = W / 2, cy = H / 2;
    x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) { let r = 0, ang = k / 7 * TAU + 0.3; x.strokeStyle = `rgba(${pal[0]},0.5)`; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); for (let s = 0; s < 5; s++) { r += Math.min(W, H) * 0.07; ang += Math.sin(k * 9 + s) * 0.4; x.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); } x.stroke(); }
    for (let i = 0; i < 24; i++) { const d = (t * 0.5 + i * 0.137) % 1, a = i / 24 * TAU, r = d * Math.min(W, H) * 0.5, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r, al = (1 - d) * 0.8, s = 2 + (1 - d) * 4; x.fillStyle = `rgba(${pal[1]},${al})`; x.save(); x.translate(px, py); x.rotate(a + t); x.fillRect(-s, -s * 0.4, s * 2, s * 0.8); x.restore(); }
    glow(x, cx, cy, 30, pal[0], 0.3 + 0.3 * Math.abs(Math.sin(t * 3)));
    x.globalCompositeOperation = 'source-over';
  }

  // Nested pulsing rings (size / measure) ──────────────────
  function scale(x, W, H, t, pal) {
    const cx = W / 2, cy = H / 2;
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const base = Math.min(W, H) * 0.07 * (i + 1), pulse = base + Math.sin(t * 1.5 - i * 0.5) * 6; x.strokeStyle = `rgba(${pal[i % 2]},${0.5 - i * 0.06})`; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, pulse, 0, TAU); x.stroke(); }
    glow(x, cx, cy, 8 + 2 * Math.sin(t * 2), pal[0], 0.9);
    x.globalCompositeOperation = 'source-over';
  }

  // Pulsing heart + sparks (feeling / love) ────────────────
  function heart(x, W, H, t, pal) {
    const cx = W / 2, cy = H * 0.5, beat = 1 + 0.08 * Math.max(0, Math.sin(t * 3)) + 0.05 * Math.max(0, Math.sin(t * 3 - 0.25)), sc = Math.min(W, H) * 0.004 * beat;
    x.save(); x.translate(cx, cy); x.scale(sc, sc);
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(${pal[0]},0.85)`; x.shadowColor = `rgba(${pal[0]},0.8)`; x.shadowBlur = 30;
    x.beginPath(); x.moveTo(0, 30); x.bezierCurveTo(-40, -10, -40, -45, 0, -20); x.bezierCurveTo(40, -45, 40, -10, 0, 30); x.fill();
    x.shadowBlur = 0; x.restore();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) { const d = (t * 0.4 + i * 0.137) % 1, a = i / 16 * TAU, r = d * Math.min(W, H) * 0.4, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r - d * 20; x.fillStyle = `rgba(${pal[1]},${(1 - d) * 0.5})`; x.beginPath(); x.arc(px, py, 2, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }

  // Neural network (mind / wisdom) ─────────────────────────
  function mind(x, W, H, t, pal) {
    const cx = W / 2, cy = H / 2, N = 12, nodes = [];
    for (let i = 0; i < N; i++) { const a = i / N * TAU, rr2 = Math.min(W, H) * (0.18 + 0.12 * Math.sin(i * 3.3)); nodes.push([cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * 0.92]); }
    nodes.push([cx, cy]);
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = `rgba(${pal[1]},0.18)`; x.lineWidth = 1;
    const lim = (Math.min(W, H) * 0.3) ** 2;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const dx = nodes[i][0] - nodes[j][0], dy = nodes[i][1] - nodes[j][1]; if (dx * dx + dy * dy < lim) { x.beginPath(); x.moveTo(nodes[i][0], nodes[i][1]); x.lineTo(nodes[j][0], nodes[j][1]); x.stroke(); } }
    for (let i = 0; i < nodes.length; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 2 + i), s = 2 + tw * 3; glow(x, nodes[i][0], nodes[i][1], s * 2, pal[0], 0.4 + tw * 0.5); }
    x.globalCompositeOperation = 'source-over';
  }

  // Row of figures (people / human) ────────────────────────
  function people(x, W, H, t, pal) {
    const cx = W / 2, cy = H * 0.58, n = 5, gap = Math.min(W * 0.16, 92);
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = `rgba(${pal[1]},0.22)`; x.lineWidth = 1.5; x.beginPath();
    for (let i = 0; i < n; i++) { const px = cx + (i - (n - 1) / 2) * gap, hy = cy - 34 + Math.sin(t * 1.5 + i * 0.6) * 6; i ? x.lineTo(px, hy + 6) : x.moveTo(px, hy + 6); }
    x.stroke();
    for (let i = 0; i < n; i++) { const px = cx + (i - (n - 1) / 2) * gap, bob = Math.sin(t * 1.5 + i * 0.6) * 6, hy = cy - 34 + bob, col = i % 2 ? pal[1] : pal[0]; x.fillStyle = `rgba(${col},0.72)`; x.beginPath(); x.arc(px, hy, 11, 0, TAU); x.fill(); rr(x, px - 15, hy + 14, 30, 40, 12); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }

  window.SCENES = { dna, globe, light, waves, draw, water, heat, stars, clock, sound, eye, motion, gear, speak, breakx, scale, heart, mind, people };
})();

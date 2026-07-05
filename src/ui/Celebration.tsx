import { useEffect, useRef } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { ROOTS, ROOTS_BY_ID, PALETTES, rootId, isRootOpenable } from '../data/roots';
import { XP_PER_ROOT } from '../core/stats';
import { paletteVars } from './components/styleVars';
import { Button } from './components/Button';

/** Next openable root after `fromId` in curriculum order, or null. */
function nextOpenable(fromId: string, entitled: boolean): string | null {
  const i = ROOTS.findIndex((r) => rootId(r) === fromId);
  for (let j = i + 1; j < ROOTS.length; j++) {
    const id = rootId(ROOTS[j]!);
    if (isRootOpenable(id, entitled)) return id;
  }
  return null;
}

/** One confetti burst on a full-screen canvas, in the root's jewel colors + gold. */
function Confetti({ rgb }: { rgb: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = [`rgb(${rgb})`, '#ffd24a', '#ffffff', `rgba(${rgb},0.7)`];
    const parts = Array.from({ length: 90 }, (_, i) => {
      const angle = Math.PI * (1.15 + 0.7 * Math.random()); // upward fan
      const speed = 260 + Math.random() * 420;
      return {
        x: w / 2,
        y: h * 0.42,
        vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1),
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 7,
        color: colors[i % colors.length]!,
        spin: (Math.random() - 0.5) * 12,
        rot: Math.random() * Math.PI,
      };
    });

    let raf = 0;
    const start = performance.now();
    const DURATION = 1600;

    function frame(now: number) {
      const t = now - start;
      const dt = 1 / 60;
      ctx!.clearRect(0, 0, w, h);
      if (t > DURATION) return;
      const fade = 1 - t / DURATION;
      for (const p of parts) {
        p.vy += 900 * dt; // gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        ctx!.save();
        ctx!.globalAlpha = Math.max(0, fade);
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx!.restore();
      }
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rgb]);

  return <canvas ref={ref} className="ww-confetti" aria-hidden="true" />;
}

/**
 * The payoff moment when a kid marks a root learned. Renders from App.tsx
 * whenever the store's `celebration` is set (completeRoot() sets it; nothing
 * consumed it before this component). Jewel-themed to the learned root, with a
 * confetti burst, the banked +XP, and a straight path to the next root.
 */
export function Celebration() {
  const celebration = useWondralStore((s) => s.celebration);
  const dismiss = useWondralStore((s) => s.dismissCelebration);
  const openRoot = useWondralStore((s) => s.openRoot);
  const entitled = useEntitledForDisplay();

  const root = celebration ? ROOTS_BY_ID[celebration.rootId] : undefined;

  useEffect(() => {
    if (!celebration) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [celebration, dismiss]);

  if (!celebration || !root) return null;

  const p = PALETTES[root.pal] ?? PALETTES.green!;
  const next = nextOpenable(celebration.rootId, entitled);

  return (
    <div
      className="ww-celebrate"
      style={paletteVars(p.c1rgb, p.grad)}
      role="dialog"
      aria-label={`${root.root} learned`}
    >
      <Confetti rgb={p.c1rgb} />
      <div className="ww-celebrate-card">
        <div className="ww-celebrate-star" aria-hidden="true">
          ★
        </div>
        <div className="ww-celebrate-eyebrow">Root learned</div>
        <div className="ww-celebrate-root">{root.root}</div>
        <div className="ww-celebrate-mean">
          → {root.mean} <span className="alt">{root.alt}</span>
        </div>
        <div className="ww-celebrate-xp">+{XP_PER_ROOT} XP</div>
        <div className="ww-celebrate-actions">
          {next ? (
            <Button
              onClick={() => {
                dismiss();
                openRoot(next);
              }}
            >
              Next root →
            </Button>
          ) : null}
          <Button variant="ghost" onClick={dismiss}>
            Keep exploring
          </Button>
        </div>
      </div>
    </div>
  );
}

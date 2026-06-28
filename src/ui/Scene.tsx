import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { SCENES } from './scenes';

/**
 * Renders an animated canvas scene from the SCENES registry.
 *
 * - Sizes the canvas to its container with devicePixelRatio scaling
 *   (capped at 2, matching the prototype) via a ResizeObserver.
 * - Runs a single requestAnimationFrame loop while `active` is true,
 *   calling the scene fn with CSS-pixel dimensions and elapsed seconds.
 * - Clears the canvas each frame; stops the loop on unmount or when
 *   `active` becomes false (so off-screen cards don't burn CPU).
 * - Unknown `scene` keys clear the canvas and draw nothing.
 */
export function Scene({
  scene,
  pal,
  active = true,
  className,
}: {
  scene: string;
  pal: [string, string];
  active?: boolean;
  className?: string;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep the latest scene/pal in refs so the rAF loop reads current
  // values without needing to restart on every prop change. Updated in an
  // effect (not during render) so React's rules-of-refs stay satisfied.
  const sceneRef = useRef(scene);
  const palRef = useRef(pal);
  useEffect(() => {
    sceneRef.current = scene;
    palRef.current = pal;
  });

  // Sizing: track CSS pixel size; ResizeObserver drives DPR-scaled canvas.
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function size(): void {
      const c = canvasRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const context = c.getContext('2d');
      if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
    }

    size();
    const ro = new ResizeObserver(() => size());
    ro.observe(canvas);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context: CanvasRenderingContext2D = ctx;

    let raf = 0;
    const start = performance.now();

    function frame(now: number): void {
      const { w, h } = sizeRef.current;
      const t = (now - start) / 1000;
      context.clearRect(0, 0, w, h);
      SCENES[sceneRef.current]?.(context, w, h, t, palRef.current);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return <canvas ref={canvasRef} className={className} />;
}
